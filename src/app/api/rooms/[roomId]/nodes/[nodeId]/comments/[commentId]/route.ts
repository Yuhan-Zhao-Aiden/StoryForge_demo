import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getDb } from "@/lib/mongodb";
import { updateCommentSchema } from "@/lib/types/comments";

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

type PatchContext = {
  params: Promise<{ roomId: string; nodeId: string; commentId: string }>;
};

// PATCH update comment
export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ roomId: string; nodeId: string; commentId: string }>;
  }
) {
  const { roomId, nodeId, commentId } = await context.params;

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

  // Track if mentions are being updated to create notifications
  let newMentions: string[] = [];
  let oldMentions: string[] = [];

  // Only author can update content and mentions
  if (existingComment.authorId.toString() === userId.toString()) {
    if (parsed.content !== undefined) updateData.content = parsed.content;
    if (parsed.mentions !== undefined) {
      // Get old mentions for comparison
      oldMentions =
        existingComment.mentions?.map((id: ObjectId) => id.toString()) || [];
      newMentions = parsed.mentions;

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

  // NEW: Create notifications for NEW mentions when comment is edited
  if (newMentions.length > 0 && parsed.mentions !== undefined) {
    // Find mentions that are new (not in old mentions)
    const newMentionedUserIds = newMentions.filter(
      (mentionId) =>
        !oldMentions.includes(mentionId) && mentionId !== userId.toString()
    );

    if (newMentionedUserIds.length > 0) {
      // Get room and node details for the notification
      const room = await db.collection("rooms").findOne({ _id: roomObjectId });
      const node = await db.collection("nodes").findOne({ _id: nodeObjectId });

      // Get comment author details
      const commentAuthor = await db
        .collection("users")
        .findOne({ _id: userId });

      for (const mentionedUserId of newMentionedUserIds) {
        await db.collection("notifications").insertOne({
          userId: new ObjectId(mentionedUserId),
          type: "mention",
          title: "You were mentioned in a comment",
          message: `${
            commentAuthor?.username || commentAuthor?.email || "Someone"
          } mentioned you in a comment in "${room?.title || "Unknown Room"}"`,
          relatedEntity: {
            type: "comment",
            id: commentObjectId.toString(),
            roomId: roomId,
            nodeId: nodeId,
            commentId: commentObjectId.toString(),
          },
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          triggeredBy: {
            userId: userId.toString(),
            username: commentAuthor?.username || "",
            email: commentAuthor?.email || "",
          },
        });
      }
    }
  }

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
