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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string; nodeId: string }> }
) {
  const { roomId, nodeId } = await context.params;

  const access = await requireRoomAccess(roomId, { requireWrite: false });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;
  const nodeObjectId = new ObjectId(nodeId);

  try {
    const comments = await db
      .collection("comments")
      .aggregate([
        { $match: { roomId: roomObjectId, nodeId: nodeObjectId } },
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
        { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
        {
          $unwind: {
            path: "$resolvedByUser",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { createdAt: 1 } },
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
            author: { _id: 1, username: 1, email: 1 },
            resolvedByUser: { _id: 1, username: 1, email: 1 },
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
  context: { params: Promise<{ roomId: string; nodeId: string }> }
) {
  const { roomId, nodeId } = await context.params;

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

    // ========== NOTIFICATION CREATION WITH ERROR HANDLING ==========
    console.log("=== NOTIFICATION DEBUGGING ===");
    console.log("Received mentions array:", parsed.mentions);
    console.log("Current user ID:", userId.toString());
    console.log("Comment content:", parsed.content);

    try {
      if (parsed.mentions && parsed.mentions.length > 0) {
        const mentionedUserIds = parsed.mentions.filter(
          (mentionId) => mentionId !== userId.toString()
        );

        console.log("After filtering self-mentions:", mentionedUserIds);

        if (mentionedUserIds.length > 0) {
          // Get room and node details for the notification
          const room = await db
            .collection("rooms")
            .findOne({ _id: roomObjectId });
          const node = await db
            .collection("nodes")
            .findOne({ _id: nodeObjectId });

          console.log("Room found:", !!room);
          console.log("Node found:", !!node);

          // Get comment author details
          const commentAuthor = await db
            .collection("users")
            .findOne({ _id: userId });

          console.log("Comment author found:", !!commentAuthor);
          console.log(`Creating ${mentionedUserIds.length} notifications`);

          let notificationCount = 0;
          for (const mentionedUserId of mentionedUserIds) {
            try {
              console.log("Creating notification for user:", mentionedUserId);

              // Verify the mentioned user exists
              const mentionedUser = await db
                .collection("users")
                .findOne({ _id: new ObjectId(mentionedUserId) });

              if (!mentionedUser) {
                console.log("❌ Mentioned user not found:", mentionedUserId);
                continue;
              }

              console.log(
                "Mentioned user exists:",
                mentionedUser.username || mentionedUser.email
              );

              const notification = {
                userId: new ObjectId(mentionedUserId),
                type: "mention",
                title: "You were mentioned in a comment",
                message: `${
                  commentAuthor?.username || commentAuthor?.email || "Someone"
                } mentioned you in a comment in "${
                  room?.title || "Unknown Room"
                }"`,
                relatedEntity: {
                  type: "comment",
                  id: comment._id.toString(),
                  roomId: roomId,
                  nodeId: nodeId,
                  commentId: comment._id.toString(),
                },
                read: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                triggeredBy: {
                  userId: userId.toString(),
                  username: commentAuthor?.username || "",
                  email: commentAuthor?.email || "",
                },
              };

              const result = await db
                .collection("notifications")
                .insertOne(notification);
              console.log(
                "✅ Notification created with ID:",
                result.insertedId
              );
              notificationCount++;
            } catch (userError) {
              console.error(
                "❌ Error creating notification for user:",
                mentionedUserId,
                userError
              );
            }
          }

          console.log(
            `🎉 Successfully created ${notificationCount} out of ${mentionedUserIds.length} notifications`
          );
        } else {
          console.log("💡 No users to notify (only self-mentions)");
        }
      } else {
        console.log("💡 No mentions in the comment");
      }
    } catch (notificationError) {
      console.error(
        "❌ Error in notification creation process:",
        notificationError
      );
    }

    console.log("=== END NOTIFICATION DEBUGGING ===");
    // ========== END NOTIFICATION CREATION ==========

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
