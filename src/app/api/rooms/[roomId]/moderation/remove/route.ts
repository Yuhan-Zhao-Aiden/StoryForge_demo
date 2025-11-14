import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";
import { objectIdSchema } from "@/lib/types/editor";
import { deleteNodeImages } from "@/lib/gridfs";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

const removeContentSchema = z.object({
  flagId: objectIdSchema,
  contentType: z.enum(["node", "comment"]),
  contentId: objectIdSchema,
  reviewNotes: z.string().max(500).optional(),
});

// POST - Remove flagged content
export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission - only owners can remove content
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "REMOVE_FLAGGED_CONTENT")) {
    return jsonError(403, "Insufficient permissions to remove content");
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = removeContentSchema.parse(body);
  } catch (e: any) {
    return jsonError(400, e?.errors?.[0]?.message ?? "Invalid remove payload");
  }

  const flagId = new ObjectId(parsed.flagId);
  const contentId = new ObjectId(parsed.contentId);

  // Verify flag exists
  const flag = await db.collection("flaggedContent").findOne({
    _id: flagId,
    roomId: roomObjectId,
  });

  if (!flag) {
    return jsonError(404, "Flag not found");
  }

  // Remove the content
  const collectionName = parsed.contentType === "node" ? "nodes" : "comments";
  
  if (parsed.contentType === "node") {
    // Delete node and associated edges and images
    await Promise.all([
      db.collection("nodes").deleteOne({ _id: contentId, roomId: roomObjectId }),
      db.collection("edges").deleteMany({
        roomId: roomObjectId,
        $or: [{ fromNodeId: contentId }, { toNodeId: contentId }],
      }),
      db.collection("comments").deleteMany({ roomId: roomObjectId, nodeId: contentId }),
      deleteNodeImages(contentId.toString()).catch((error) => {
        console.error(`Failed to delete images for node ${contentId}:`, error);
        return 0;
      }),
    ]);
  } else {
    // Delete comment and all replies
    await db.collection("comments").deleteMany({
      roomId: roomObjectId,
      $or: [{ _id: contentId }, { parentId: contentId }],
    });
  }

  // Update flag status
  await db.collection("flaggedContent").updateOne(
    { _id: flagId },
    {
      $set: {
        status: "removed",
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: parsed.reviewNotes || null,
      },
    },
  );

  return jsonSuccess({ success: true, removed: true });
}

