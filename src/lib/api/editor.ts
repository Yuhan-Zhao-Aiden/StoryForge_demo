import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { Db } from "mongodb";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

type RoomRole = "owner" | "editor" | "viewer";

type AccessContext = {
  db: Db;
  userId: ObjectId;
  roomId: ObjectId;
  role: RoomRole;
};

type AccessResult =
  | { ok: true; context: AccessContext }
  | { ok: false; response: NextResponse };

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function canEditRoom(role: RoomRole) {
  return role === "owner" || role === "editor";
}

async function resolveRoomRole(db: Db, roomId: ObjectId, userId: ObjectId): Promise<RoomRole | null> {
  const room = await db.collection("rooms").findOne<{ ownerId: ObjectId }>(
    { _id: roomId },
    { projection: { ownerId: 1 } },
  );

  if (!room) {
    return null;
  }

  if (room.ownerId.equals(userId)) {
    return "owner";
  }

  const membership = await db
    .collection("roomMembers")
    .findOne<{ role?: RoomRole }>({ roomId, userId }, { projection: { role: 1 } });

  if (!membership) {
    return null;
  }

  return membership.role ?? "viewer";
}

export async function requireRoomAccess(roomId: string, { requireWrite }: { requireWrite?: boolean } = {}): Promise<AccessResult> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { ok: false, response: jsonError(401, "Unauthorized") };
  }

  if (!ObjectId.isValid(roomId) || !ObjectId.isValid(user.id)) {
    return { ok: false, response: jsonError(404, "Room not found") };
  }

  const db = await getDb();
  const roomObjectId = new ObjectId(roomId);
  const userObjectId = new ObjectId(user.id);

  const role = await resolveRoomRole(db, roomObjectId, userObjectId);
  if (!role) {
    return { ok: false, response: jsonError(404, "Room not found") };
  }

  if (requireWrite && !canEditRoom(role)) {
    return { ok: false, response: jsonError(403, "Insufficient permissions") };
  }

  return {
    ok: true,
    context: {
      db,
      roomId: roomObjectId,
      userId: userObjectId,
      role,
    },
  };
}
