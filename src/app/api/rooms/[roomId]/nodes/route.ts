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

export async function GET(_req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;

  const nodes = await db
    .collection<NodeDocument>("nodes")
    .find({ roomId: roomObjectId })
    .sort({ createdAt: 1 })
    .toArray();

  return jsonSuccess({
    nodes: nodes.map(mapNodeDocument),
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

  const { db, roomId: roomObjectId } = access.context;
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

  return jsonSuccess({
    nodes: updatedNodes.map(mapNodeDocument),
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
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

  const [nodesResult, edgesResult] = await Promise.all([
    nodesCollection.deleteMany({ _id: { $in: ids }, roomId: roomObjectId }),
    edgesCollection.deleteMany({
      roomId: roomObjectId,
      $or: [{ fromNodeId: { $in: ids } }, { toNodeId: { $in: ids } }],
    }),
  ]);

  return jsonSuccess({
    deletedNodes: nodesResult.deletedCount ?? 0,
    deletedEdges: edgesResult.deletedCount ?? 0,
  });
}
