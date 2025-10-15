import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getDb } from "@/lib/mongodb";
import { createCommentSchema } from "@/lib/types/comments";

type CommentDocument = {
  _id: ObjectId;
  roomId: ObjectId;
  nodeId: ObjectId;
  parentId: ObjectId | null;
  authorId: ObjectId;
  content: string;
  mentions: ObjectId[];
  isPinned: boolean;
  isResolved: boolean;
  resolvedBy: ObjectId | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type RouteContext = {
  params:
    | {
        roomId: string;
        nodeId: string;
      }
    | Promise<{
        roomId: string;
        nodeId: string;
      }>;
};

async function getParamsFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params;
}

// GET all comments for a node
export async function GET(_req: NextRequest, context: RouteContext) {
  const { roomId, nodeId } = await getParamsFromContext(context);

  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);

  // Get comments with author information
  const comments = await db
    .collection<CommentDocument>("comments")
    .aggregate([
      {
        $match: {
          roomId: roomObjectId,
          nodeId: nodeObjectId,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "resolvedBy",
          foreignField: "_id",
          as: "resolvedByUser",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$resolvedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          roomId: 1,
          nodeId: 1,
          parentId: 1,
          content: 1,
          mentions: 1,
          isPinned: 1,
          isResolved: 1,
          resolvedBy: 1,
          resolvedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          author: {
            _id: 1,
            username: 1,
            email: 1,
          },
          resolvedByUser: {
            _id: 1,
            username: 1,
            email: 1,
          },
        },
      },
      {
        $sort: {
          isPinned: -1,
          createdAt: 1,
        },
      },
    ])
    .toArray();

  return jsonSuccess({ comments });
}

// POST new comment
export async function POST(req: NextRequest, context: RouteContext) {
  const { roomId, nodeId } = await getParamsFromContext(context);

  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = createCommentSchema.parse({
      ...body,
      roomId: roomObjectId.toString(),
      nodeId: nodeObjectId.toString(),
    });
  } catch {
    return jsonError(400, "Invalid comment payload");
  }

  const now = new Date();
  const commentDoc: CommentDocument = {
    _id: new ObjectId(),
    roomId: roomObjectId,
    nodeId: nodeObjectId,
    parentId: parsed.parentId ? new ObjectId(parsed.parentId) : null,
    authorId: userId,
    content: parsed.content,
    mentions: parsed.mentions.map((id) => new ObjectId(id)),
    isPinned: false,
    isResolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("comments").insertOne(commentDoc);

  // Fetch the created comment with author info
  const createdComment = await db
    .collection<CommentDocument>("comments")
    .aggregate([
      {
        $match: { _id: commentDoc._id },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          roomId: 1,
          nodeId: 1,
          parentId: 1,
          content: 1,
          mentions: 1,
          isPinned: 1,
          isResolved: 1,
          resolvedBy: 1,
          resolvedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          author: {
            _id: 1,
            username: 1,
            email: 1,
          },
        },
      },
    ])
    .next();

  return jsonSuccess({ comment: createdComment }, 201);
}
