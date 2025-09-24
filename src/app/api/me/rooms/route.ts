// app/api/me/rooms/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";           // your Mongo helper
import { getCurrentUser } from "@/lib/auth";     // teammate's auth
import { ObjectId } from "mongodb";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(me.id as string); // auth.id should be the Mongo ObjectId string

  // Owned rooms
  const owned = await db.collection("rooms")
    .find({ ownerId: userId })
    .project({ title: 1, visibility: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .toArray();

  // Collaborating (exclude owner to avoid dup)
  const memberships = await db.collection("roomMembers")
    .find({ userId, role: { $ne: "owner" } })
    .project({ roomId: 1, role: 1 })
    .toArray();

  const roomIds = memberships.map(m => m.roomId);
  let collaborating: Array<{ room: Record<string, unknown>; role: string }> = [];

  if (roomIds.length) {
    const rooms = await db.collection("rooms")
      .find({ _id: { $in: roomIds } })
      .project({ title: 1, visibility: 1, updatedAt: 1 })
      .toArray();

    const map = new Map<string, Record<string, unknown>>();
    rooms.forEach(r => map.set(String(r._id), r));
    collaborating = memberships
      .map(m => ({ room: map.get(String(m.roomId)), role: m.role }))
      .filter((x): x is { room: Record<string, unknown>; role: string } => !!x.room);
  }

  return NextResponse.json({ owned, collaborating });
}
