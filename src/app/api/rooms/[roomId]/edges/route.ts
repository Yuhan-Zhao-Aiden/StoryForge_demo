import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import {
  newStoryEdgeSchema,
  storyEdgeSchema,
  edgeUpdateSchema,
  StoryEdge,
  objectIdSchema,
} from "@/lib/types/editor";

type EdgeDocument = {
  _id: ObjectId;
  roomId: ObjectId;
  fromNodeId: ObjectId;
  toNodeId: ObjectId;
  type: StoryEdge["type"];
  label?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  clientId?: string;
};

const createEdgeInputSchema = newStoryEdgeSchema
  .omit({ roomId: true })
  .extend({
    source: objectIdSchema,
    target: objectIdSchema,
    clientId: z.string().uuid().optional(),
  });

const createEdgesSchema = z.object({
  edges: z.array(createEdgeInputSchema).min(1),
});

const updateEdgesSchema = z.object({
  updates: z.array(edgeUpdateSchema).min(1),
});

const deleteEdgesSchema = z.object({
  ids: z.array(objectIdSchema).min(1),
});

function mapEdgeDocument(doc: EdgeDocument): StoryEdge {
  return storyEdgeSchema.parse({
    id: doc._id.toString(),
    roomId: doc.roomId.toString(),
    source: doc.fromNodeId.toString(),
    target: doc.toNodeId.toString(),
    type: doc.type ?? "normal",
    label: doc.label ?? undefined,
    createdAt: doc.createdAt,
  });
}

function buildInsertDocument(edge: z.infer<typeof createEdgeInputSchema>, roomId: ObjectId, now: Date): EdgeDocument {
  return {
    _id: new ObjectId(),
    roomId,
    fromNodeId: new ObjectId(edge.source),
    toNodeId: new ObjectId(edge.target),
    type: edge.type ?? "normal",
    label: edge.label ?? null,
    createdAt: now,
    updatedAt: now,
    clientId: edge.clientId,
  };
}

function buildEdgeUpdate(update: z.infer<typeof edgeUpdateSchema>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (update.source !== undefined) {
    set.fromNodeId = new ObjectId(update.source);
  }
  if (update.target !== undefined) {
    set.toNodeId = new ObjectId(update.target);
  }
  if (update.type !== undefined) {
    set.type = update.type;
  }
  if (update.label !== undefined) {
    set.label = update.label ?? null;
  }

  return set;
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

  const edges = await db
    .collection<EdgeDocument>("edges")
    .find({ roomId: roomObjectId })
    .sort({ createdAt: 1 })
    .toArray();

  return jsonSuccess({
    edges: edges.map(mapEdgeDocument),
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = createEdgesSchema.parse(body);
  } catch {
    return jsonError(400, "Invalid edge payload");
  }

  if (parsed.edges.some((edge) => edge.source === edge.target)) {
    return jsonError(400, "Edges cannot connect a node to itself");
  }

  const now = new Date();
  const docs = parsed.edges.map((edge) => buildInsertDocument(edge, roomObjectId, now));

  await db.collection("edges").insertMany(docs);

  return jsonSuccess(
    {
      edges: docs.map(mapEdgeDocument),
      clientMapping: docs.map((doc) => ({
        clientId: doc.clientId,
        edgeId: doc._id.toString(),
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

  let parsed;
  try {
    parsed = updateEdgesSchema.parse(body);
  } catch {
    return jsonError(400, "Invalid update payload");
  }

  const edgesCollection = db.collection("edges");

  const operations = parsed.updates.map((update) => ({
    updateOne: {
      filter: { _id: new ObjectId(update.id), roomId: roomObjectId },
      update: { $set: buildEdgeUpdate(update) },
    },
  }));

  if (!operations.length) {
    return jsonSuccess({ edges: [] });
  }

  await edgesCollection.bulkWrite(operations, { ordered: false });

  const ids = parsed.updates.map((update) => new ObjectId(update.id));
  const updatedEdges = await edgesCollection
    .find<EdgeDocument>({ _id: { $in: ids }, roomId: roomObjectId })
    .toArray();

  return jsonSuccess({
    edges: updatedEdges.map(mapEdgeDocument),
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = deleteEdgesSchema.parse(body);
  } catch {
    return jsonError(400, "Invalid delete payload");
  }

  const ids = parsed.ids.map((id) => new ObjectId(id));

  const result = await db.collection("edges").deleteMany({
    _id: { $in: ids },
    roomId: roomObjectId,
  });

  return jsonSuccess({
    deletedEdges: result.deletedCount ?? 0,
  });
}
