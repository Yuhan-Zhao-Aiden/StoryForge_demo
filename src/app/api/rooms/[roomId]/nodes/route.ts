import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import {
  newStoryNodeSchema,
  storyNodeSchema,
  nodeUpdateSchema,
  StoryNode,
  NodeUpdate,
  objectIdSchema,
} from "@/lib/types/editor";
import { deleteNodeImages } from "@/lib/gridfs";
import { logActivity } from "@/lib/activityLogger";

type NodeDocument = {
  _id: ObjectId;
  roomId: ObjectId;
  title: string;
  type: StoryNode["type"];
  color?: string;
  position: StoryNode["position"];
  labels?: string[];
  collapsed?: boolean;
  content?: {
    text?: string | null;
    summary?: string | null;
    media?: StoryNode["content"]["media"];
  };
  createdBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  clientId?: string;
};

const createNodeInputSchema = newStoryNodeSchema.omit({
  roomId: true,
  createdBy: true,
});

const createNodesSchema = z.object({
  nodes: z.array(createNodeInputSchema).min(1),
});

const updateNodesSchema = z.object({
  updates: z.array(nodeUpdateSchema).min(1),
});

const deleteNodesSchema = z.object({
  ids: z.array(objectIdSchema).min(1),
});

function mapNodeDocument(doc: NodeDocument): StoryNode {
  const serialized = storyNodeSchema.parse({
    id: doc._id.toString(),
    roomId: doc.roomId.toString(),
    title: doc.title,
    type: doc.type,
    color: doc.color ?? "#2563eb",
    position: doc.position,
    labels: doc.labels ?? [],
    collapsed: doc.collapsed ?? false,
    content: {
      text: doc.content?.text ?? undefined,
      summary: doc.content?.summary ?? undefined,
      media: doc.content?.media ?? [],
    },
    createdBy: doc.createdBy ? doc.createdBy.toString() : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

  return serialized;
}

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;

  // Support incremental sync with 'since' parameter
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  
  const query: any = { roomId: roomObjectId };
  let deletedNodeIds: string[] = [];
  
  // If 'since' provided, only get nodes updated after that timestamp
  if (sinceParam) {
    try {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        query.updatedAt = { $gt: sinceDate };
        
        // Also fetch deleted node IDs since this timestamp
        const deletions = await db
          .collection("deletions")
          .find({
            roomId: roomObjectId,
            type: "node",
            deletedAt: { $gt: sinceDate },
          })
          .project({ entityId: 1 })
          .toArray();
        
        deletedNodeIds = deletions.map((d: any) => d.entityId);
      }
    } catch (e) {
      // Invalid date, ignore and return all
    }
  }

  const nodes = await db
    .collection<NodeDocument>("nodes")
    .find(query)
    .sort({ createdAt: 1 })
    .toArray();

  return jsonSuccess({
    nodes: nodes.map(mapNodeDocument),
    serverTime: new Date().toISOString(),
    deletedNodeIds,
  });
}

function buildInsertDocument(
  node: z.infer<typeof createNodeInputSchema>,
  roomId: ObjectId,
  userId: ObjectId,
  now: Date,
): NodeDocument {
  return {
    _id: new ObjectId(),
    roomId,
    title: node.title,
    type: node.type,
    color: node.color ?? "#2563eb",
    position: node.position,
    labels: node.labels ?? [],
    collapsed: node.collapsed ?? false,
    content: {
      text: node.content?.text ?? null,
      summary: node.content?.summary ?? null,
      media: node.content?.media ?? [],
    },
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    clientId: node.clientId,
  };
}

function buildNodeUpdate(update: NodeUpdate) {
  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (update.title !== undefined) set.title = update.title;
  if (update.type !== undefined) set.type = update.type;
  if (update.color !== undefined) set.color = update.color;
  if (update.position !== undefined) set.position = update.position;
  if (update.labels !== undefined) set.labels = update.labels;
  if (update.collapsed !== undefined) set.collapsed = update.collapsed;
  if (update.content !== undefined) {
    set.content = {
      text: update.content.text ?? null,
      summary: update.content.summary ?? null,
      media: update.content.media ?? [],
    };
  }

  return set;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  const parsed = (() => {
    try {
      return createNodesSchema.parse(body);
    } catch {
      return null;
    }
  })();
  if (!parsed) return jsonError(400, "Invalid node payload");

  const now = new Date();

  const docs = parsed.nodes.map((node) => buildInsertDocument(node, roomObjectId, userId, now));

  await db.collection("nodes").insertMany(docs);

  // Log activity for each created node
  for (const doc of docs) {
    await logActivity({
      db,
      roomId: roomObjectId,
      actorId: userId,
      type: "node_created",
      details: {
        nodeId: doc._id.toString(),
        nodeTitle: doc.title,
        nodeType: doc.type,
      },
    });
  }

  const insertedNodes = docs.map((doc) => mapNodeDocument({ ...doc, _id: doc._id }));

  return jsonSuccess(
    {
      nodes: insertedNodes,
      clientMapping: docs.map((doc) => ({
        clientId: doc.clientId,
        nodeId: doc._id.toString(),
      })),
    },
    201,
  );
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  const parsed = (() => {
    try {
      return updateNodesSchema.parse(body);
    } catch {
      return null;
    }
  })();
  if (!parsed) return jsonError(400, "Invalid update payload");

  const nodesCollection = db.collection("nodes");

  const operations = parsed.updates.map((update) => {
    const nodeId = new ObjectId(update.id);
    return {
      updateOne: {
        filter: { _id: nodeId, roomId: roomObjectId },
        update: { $set: buildNodeUpdate(update) },
      },
    };
  });

  if (!operations.length) {
    return jsonSuccess({ nodes: [] });
  }

  await nodesCollection.bulkWrite(operations, { ordered: false });

  const ids = parsed.updates.map((update) => new ObjectId(update.id));
  const updatedNodes = await nodesCollection
    .find<NodeDocument>({ _id: { $in: ids }, roomId: roomObjectId })
    .toArray();

  // Log activity for each updated node
  for (const update of parsed.updates) {
    const updatedNode = updatedNodes.find(n => n._id.toString() === update.id);
    await logActivity({
      db,
      roomId: roomObjectId,
      actorId: userId,
      type: "node_updated",
      details: {
        nodeId: update.id,
        nodeTitle: updatedNode?.title || update.title,
        changes: Object.keys(update).filter(k => k !== 'id'),
      },
    });
  }

  return jsonSuccess({
    nodes: updatedNodes.map(mapNodeDocument),
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  const parsed = (() => {
    try {
      return deleteNodesSchema.parse(body);
    } catch {
      return null;
    }
  })();
  if (!parsed) return jsonError(400, "Invalid delete payload");

  const ids = parsed.ids.map((id) => new ObjectId(id));

  const nodesCollection = db.collection("nodes");
  const edgesCollection = db.collection("edges");

  // Get node titles before deletion for logging
  const nodesToDelete = await nodesCollection
    .find<NodeDocument>({ _id: { $in: ids }, roomId: roomObjectId })
    .project({ _id: 1, title: 1, type: 1 })
    .toArray();

  // Delete associated GridFS images for each node
  const imageCleanupPromises = parsed.ids.map((nodeId) => 
    deleteNodeImages(nodeId).catch((error) => {
      console.error(`Failed to delete images for node ${nodeId}:`, error);
      return 0; // Continue even if image deletion fails
    })
  );

  const deletedAt = new Date();
  
  const [nodesResult, edgesResult, imageCounts] = await Promise.all([
    nodesCollection.deleteMany({ _id: { $in: ids }, roomId: roomObjectId }),
    edgesCollection.deleteMany({
      roomId: roomObjectId,
      $or: [{ fromNodeId: { $in: ids } }, { toNodeId: { $in: ids } }],
    }),
    Promise.all(imageCleanupPromises),
  ]);

  // Record deletion events for sync tracking
  const deletionsCollection = db.collection("deletions");
  const deletionDocs = parsed.ids.map((nodeId) => ({
    roomId: roomObjectId,
    type: "node",
    entityId: nodeId,
    deletedAt,
    deletedBy: userId,
  }));
  
  if (deletionDocs.length > 0) {
    await deletionsCollection.insertMany(deletionDocs);
  }

  // Log activity for each deleted node
  for (const node of nodesToDelete) {
    await logActivity({
      db,
      roomId: roomObjectId,
      actorId: userId,
      type: "node_deleted",
      details: {
        nodeId: node._id.toString(),
        nodeTitle: node.title,
        nodeType: node.type,
      },
    });
  }

  const totalImagesDeleted = imageCounts.reduce((sum, count) => sum + count, 0);

  return jsonSuccess({
    deletedNodes: nodesResult.deletedCount ?? 0,
    deletedEdges: edgesResult.deletedCount ?? 0,
    deletedImages: totalImagesDeleted,
  });
}
