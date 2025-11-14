import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

// GET - Get all flagged content for a room
export async function GET(_req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission - only owners can view flagged content
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "MODERATE_CONTENT")) {
    return jsonError(403, "Insufficient permissions to view flagged content");
  }

  const flaggedItems = await db
    .collection("flaggedContent")
    .aggregate([
      { $match: { roomId: roomObjectId } },
      {
        $lookup: {
          from: "users",
          localField: "flaggedBy",
          foreignField: "_id",
          as: "flaggedByUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedByUser",
        },
      },
      { $unwind: { path: "$flaggedByUser", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$reviewedByUser", preserveNullAndEmptyArrays: true } },
      { $sort: { flaggedAt: -1 } },
      {
        $project: {
          _id: 1,
          roomId: 1,
          contentType: 1,
          contentId: 1,
          reason: 1,
          description: 1,
          flaggedAt: 1,
          status: 1,
          reviewedAt: 1,
          reviewNotes: 1,
          flaggedBy: {
            _id: "$flaggedByUser._id",
            username: "$flaggedByUser.username",
            email: "$flaggedByUser.email",
          },
          reviewedBy: {
            _id: "$reviewedByUser._id",
            username: "$reviewedByUser.username",
            email: "$reviewedByUser.email",
          },
        },
      },
    ])
    .toArray();

  // Fetch the actual content for each flagged item
  const flaggedWithContent = await Promise.all(
    flaggedItems.map(async (flag) => {
      const collectionName = flag.contentType === "node" ? "nodes" : "comments";
      const content = await db.collection(collectionName).findOne(
        { _id: flag.contentId },
        {
          projection:
            flag.contentType === "node"
              ? { title: 1, content: 1, type: 1, createdAt: 1, createdBy: 1 }
              : { content: 1, createdAt: 1, authorId: 1 },
        },
      );

      return {
        ...flag,
        _id: flag._id.toString(),
        roomId: flag.roomId.toString(),
        contentId: flag.contentId.toString(),
        flaggedBy: flag.flaggedBy?._id
          ? {
              _id: flag.flaggedBy._id.toString(),
              username: flag.flaggedBy.username,
              email: flag.flaggedBy.email,
            }
          : null,
        reviewedBy: flag.reviewedBy?._id
          ? {
              _id: flag.reviewedBy._id.toString(),
              username: flag.reviewedBy.username,
              email: flag.reviewedBy.email,
            }
          : null,
        content: content
          ? {
              ...content,
              _id: content._id.toString(),
            }
          : null,
      };
    }),
  );

  return jsonSuccess({ flagged: flaggedWithContent });
}

