import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";
import { objectIdSchema } from "@/lib/types/editor";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

const dismissFlagSchema = z.object({
  flagId: objectIdSchema,
  reviewNotes: z.string().max(500).optional(),
});

// POST - Dismiss a flag (mark as reviewed but don't remove content)
export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission - only owners can dismiss flags
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "MODERATE_CONTENT")) {
    return jsonError(403, "Insufficient permissions to dismiss flags");
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = dismissFlagSchema.parse(body);
  } catch (e: any) {
    return jsonError(400, e?.errors?.[0]?.message ?? "Invalid dismiss payload");
  }

  const flagId = new ObjectId(parsed.flagId);

  // Verify flag exists
  const flag = await db.collection("flaggedContent").findOne({
    _id: flagId,
    roomId: roomObjectId,
  });

  if (!flag) {
    return jsonError(404, "Flag not found");
  }

  // Update flag status
  await db.collection("flaggedContent").updateOne(
    { _id: flagId },
    {
      $set: {
        status: "dismissed",
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: parsed.reviewNotes || null,
      },
    },
  );

  return jsonSuccess({ success: true, dismissed: true });
}

