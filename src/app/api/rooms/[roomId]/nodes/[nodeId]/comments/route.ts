import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getDb } from "@/lib/mongodb";
import { updateCommentSchema } from "@/lib/types/comments";

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().nullable().optional(),
  mentions: z.array(z.string()).optional().default([]),
});

type RouteContext = {
  params:
    | {
        roomId: string;
        nodeId: string;
        commentId: string;
      }
    | Promise<{
        roomId: string;
        nodeId: string;
        commentId: string;
      }>;
};

async function getParamsFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params;
}

// PATCH update comment
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { roomId, nodeId, commentId } = await getParamsFromContext(context);

  const access = await requireRoomAccess(roomId, { requireWrite: false });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);
  const commentObjectId = new ObjectId(commentId);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = updateCommentSchema.parse(body);
  } catch {
    return jsonError(400, "Invalid update payload");
  }

  // Check if comment exists and user is author (for content updates)
  const existingComment = await db.collection("comments").findOne({
    _id: commentObjectId,
    roomId: roomObjectId,
    nodeId: nodeObjectId,
  });

  if (!existingComment) {
    return jsonError(404, "Comment not found");
  }

  const updateData: any = { updatedAt: new Date() };

  // Only author can update content and mentions
  if (existingComment.authorId.toString() === userId.toString()) {
    if (parsed.content !== undefined) updateData.content = parsed.content;
    if (parsed.mentions !== undefined) {
      updateData.mentions = parsed.mentions.map((id) => new ObjectId(id));
    }
  }

  // Anyone with write access can pin/unpin
  if (parsed.isPinned !== undefined) {
    updateData.isPinned = parsed.isPinned;
  }

  // Handle resolve/unresolve
  if (parsed.isResolved !== undefined) {
    updateData.isResolved = parsed.isResolved;
    if (parsed.isResolved) {
      updateData.resolvedBy = userId;
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedBy = null;
      updateData.resolvedAt = null;
    }
  }

  await db.collection("comments").updateOne(
    {
      _id: commentObjectId,
      roomId: roomObjectId,
      nodeId: nodeObjectId,
    },
    { $set: updateData }
  );

  // Fetch updated comment with author info
  const updatedComment = await db
    .collection("comments")
    .aggregate([
      {
        $match: { _id: commentObjectId },
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
    ])
    .next();

  return jsonSuccess({ comment: updatedComment });
}

// DELETE comment
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { roomId, nodeId, commentId } = await getParamsFromContext(context);

  const access = await requireRoomAccess(roomId, { requireWrite: false });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);
  const commentObjectId = new ObjectId(commentId);

  // Check if comment exists and user is author
  const existingComment = await db.collection("comments").findOne({
    _id: commentObjectId,
    roomId: roomObjectId,
    nodeId: nodeObjectId,
  });

  if (!existingComment) {
    return jsonError(404, "Comment not found");
  }
  // Only author can delete their comment
  if (existingComment.authorId.toString() !== userId.toString()) {
    return jsonError(403, "You can only delete your own comments");
  }

  // Also delete all replies to this comment
  await db.collection("comments").deleteMany({
    roomId: roomObjectId,
    nodeId: nodeObjectId,
    $or: [{ _id: commentObjectId }, { parentId: commentObjectId }],
  });

  return jsonSuccess({ success: true });
}

// GET comments for a node
export async function GET(
  req: NextRequest,
  context: { params: { roomId: string; nodeId: string } }
) {
  const params = await Promise.resolve(context.params);
  const { roomId, nodeId } = params;

  const access = await requireRoomAccess(roomId, { requireWrite: false });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);

  try {
    const comments = await db
      .collection("comments")
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
          $sort: { createdAt: 1 },
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
      ])
      .toArray();

    return jsonSuccess({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return jsonError(500, "Failed to fetch comments");
  }
}

export async function POST(
  req: NextRequest,
  context: { params: { roomId: string; nodeId: string } }
) {
  const params = await Promise.resolve(context.params);
  const { roomId, nodeId } = params;

  const access = await requireRoomAccess(roomId, { requireWrite: false }); 
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = createCommentSchema.parse(body);
  } catch (error) {
    console.error("Validation error:", error);
    return jsonError(400, "Invalid comment data");
  }

  try {
    const comment = {
      _id: new ObjectId(),
      roomId: roomObjectId,
      nodeId: nodeObjectId,
      parentId: parsed.parentId ? new ObjectId(parsed.parentId) : null,
      content: parsed.content,
      mentions: parsed.mentions.map((id: string) => new ObjectId(id)),
      isPinned: false,
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("comments").insertOne(comment);

    // Fetch the created comment with author info
    const createdComment = await db
      .collection("comments")
      .aggregate([
        {
          $match: { _id: comment._id },
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

    return jsonSuccess({ comment: createdComment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return jsonError(500, "Failed to create comment");
  }
}
