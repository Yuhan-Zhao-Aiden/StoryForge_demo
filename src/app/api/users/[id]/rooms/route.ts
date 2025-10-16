import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const BYPASS = process.env.BYPASS_AUTH === "true";
const BYPASS_SECRET = process.env.BYPASS_SECRET;

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function checkAuth(req: NextRequest) {
  if (BYPASS) {
    const headerSecret = req.headers.get("x-bypass-secret");
    if (headerSecret === BYPASS_SECRET) {
      return { ok: true, user: {id: "dev", role: "admin"} };
    }
    return { ok: false, code: 401, message: "Missing bypass secret" };
  }
  return { ok: false, code: 401, message: "Auth not ready" };
}

async function getUserIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const auth = await checkAuth(req);
  if (!auth.ok) 
    return NextResponse.json({ error: auth.message }, { status: auth.code });

  const id = await getUserIdFromContext(context);
  if (!ObjectId.isValid(id)) 
    return NextResponse.json({ error: "Invalid id" }, { status: 404 });

  const userId = new ObjectId(id);
  const db = await getDb();

  type Room = {
    _id: ObjectId,
    title: string,
    visibility: string,
    updatedAt: Date
  }

  const owned = await db.collection("rooms")
    .find({ ownerId: userId })
    .project({ title: 1, visibility: 1, updatedAt: 1})
    .sort({ updatedAt: -1 })
    .toArray();

  const memberships = await db.collection("roomMembers")
    .find({ userId, role: { $ne: "owner" } })
    .project({ roomId: 1, role: 1})
    .toArray();

  const roomIds = memberships.map(m => m.roomId);
  const roomsById = new Map<string, Record<string, Room>>();
  if (roomIds.length) {
    const collabRooms = await db.collection("rooms")
    .find({ _id: { $in: roomIds } })
    .project({ title: 1, visibility: 1, updateAt: 1 })
    .toArray();

    collabRooms.forEach(r => roomsById.set(String(r._id), r));
  }

  const collaborating = memberships.map(m => ({
    room: roomsById.get(String(m.roomId)),
    role: m.role
  })).filter(x => !!x.room);

  return NextResponse.json({ owned, collaborating });
}
