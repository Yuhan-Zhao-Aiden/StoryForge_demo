import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";
import { flagContentSchema } from "@/lib/types/moderation";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

// POST - Flag content (nodes or comments)
export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "FLAG_CONTENT")) {
    return jsonError(403, "Insufficient permissions to flag content");
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = flagContentSchema.parse(body);
  } catch (e: any) {
    return jsonError(400, e?.errors?.[0]?.message ?? "Invalid flag payload");
  }

  const contentId = new ObjectId(parsed.contentId);

  // Verify the content exists
  const collectionName = parsed.contentType === "node" ? "nodes" : "comments";
  const content = await db.collection(collectionName).findOne({
    _id: contentId,
    roomId: roomObjectId,
  });

  if (!content) {
    return jsonError(404, "Content not found");
  }

  // Check if user has already flagged this content
  const existingFlag = await db.collection("flaggedContent").findOne({
    roomId: roomObjectId,
    contentType: parsed.contentType,
    contentId: contentId,
    flaggedBy: userId,
    status: "pending",
  });

  if (existingFlag) {
    return jsonError(400, "You have already flagged this content");
  }

  // Create flag
  const flag = {
    _id: new ObjectId(),
    roomId: roomObjectId,
    contentType: parsed.contentType,
    contentId: contentId,
    reason: parsed.reason,
    description: parsed.description || null,
    flaggedBy: userId,
    flaggedAt: new Date(),
    status: "pending" as const,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  };

  await db.collection("flaggedContent").insertOne(flag);

  return jsonSuccess(
    {
      flag: {
        _id: flag._id.toString(),
        contentType: flag.contentType,
        contentId: flag.contentId.toString(),
        reason: flag.reason,
        flaggedAt: flag.flaggedAt,
      },
    },
    201,
  );
}

