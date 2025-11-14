import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";

type RouteContext = {
  params: { roomId: string; exportId: string } | Promise<{ roomId: string; exportId: string }>;
};

async function getParamsFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return { roomId: params.roomId, exportId: params.exportId };
}

// DELETE - Delete an export link
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { roomId, exportId } = await getParamsFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "MANAGE_EXPORTS")) {
    return jsonError(403, "Insufficient permissions to delete exports");
  }

  if (!ObjectId.isValid(exportId)) {
    return jsonError(400, "Invalid export ID");
  }

  const exportObjectId = new ObjectId(exportId);

  // Verify the export belongs to this room
  const exportDoc = await db.collection("storyExports").findOne({
    _id: exportObjectId,
    roomId: roomObjectId,
  });

  if (!exportDoc) {
    return jsonError(404, "Export not found");
  }

  // Soft delete by setting disabled flag
  await db.collection("storyExports").updateOne(
    { _id: exportObjectId },
    { $set: { disabled: true } },
  );

  return jsonSuccess({ ok: true, exportId });
}

