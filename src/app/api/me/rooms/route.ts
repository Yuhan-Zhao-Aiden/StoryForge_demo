// app/api/me/rooms/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

type RoomDoc = {
  _id: ObjectId;
  title: string;
  subtitle?: string | null;
  visibility?: "private" | "unlisted" | "public";
  collaborators?: number; // optional; fallback compute if missing
  updatedAt?: Date;
};

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(me.id as string);

  // Owned rooms (return subtitle + collaborators)
  const owned = (await db
    .collection<RoomDoc>("rooms")
    .find({ ownerId: userId })
    .project({ title: 1, subtitle: 1, collaborators: 1, visibility: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .toArray()) as (RoomDoc & { _id: ObjectId })[];

  // Collaborating (exclude owner)
  const memberships = await db
    .collection("roomMembers")
    .find({ userId, role: { $ne: "owner" } })
    .project({ roomId: 1, role: 1 })
    .toArray();

  const roomIds = memberships.map((m: any) => m.roomId as ObjectId);
  let collaborating: Array<{ room: RoomDoc; role: string }> = [];

  if (roomIds.length) {
    const rooms = (await db
      .collection<RoomDoc>("rooms")
      .find({ _id: { $in: roomIds } })
      .project({ title: 1, subtitle: 1, collaborators: 1, visibility: 1, updatedAt: 1 })
      .toArray()) as (RoomDoc & { _id: ObjectId })[];

    const map = new Map<string, RoomDoc>();
    rooms.forEach((r) => map.set(String(r._id), r));

    collaborating = memberships
      .map((m: any) => {
        const r = map.get(String(m.roomId));
        return r ? { room: r, role: m.role as string } : null;
      })
      .filter((x): x is { room: RoomDoc; role: string } => !!x);
  }

  // Fallback: compute collaborators if missing (counts members except owner)
  const missingOwned = owned.filter((r) => r.collaborators == null).map((r) => r._id);
  const missingCollab = collaborating
    .filter(({ room }) => room.collaborators == null)
    .map(({ room }) => (room as any)._id as ObjectId);

  const toCompute = [...new Set([...missingOwned, ...missingCollab])];
  if (toCompute.length) {
    const counts = await db
      .collection("roomMembers")
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { roomId: { $in: toCompute } } },
        {
          $group: {
            _id: "$roomId",
            count: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const byId = new Map<string, number>();
    counts.forEach((c) => byId.set(String(c._id), c.count));

    // apply (minus owner)
    owned.forEach((r: any) => {
      if (r.collaborators == null) r.collaborators = Math.max(0, (byId.get(String(r._id)) || 1) - 1);
    });
    collaborating.forEach(({ room }: any) => {
      if (room.collaborators == null) room.collaborators = Math.max(0, (byId.get(String(room._id)) || 1) - 1);
    });
  }

  // Serialize ObjectId to string for the client
  const serialize = (r: any) => ({
    _id: String(r._id),
    title: r.title,
    subtitle: r.subtitle ?? null,
    collaborators: r.collaborators ?? 0,
    visibility: r.visibility ?? "private",
    updatedAt: r.updatedAt?.toISOString?.() ?? null
  });

  return NextResponse.json({
    owned: owned.map(serialize),
    collaborating: collaborating.map(({ room, role }) => ({ room: serialize(room), role }))
  });
}
