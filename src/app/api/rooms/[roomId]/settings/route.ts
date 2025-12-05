import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

// GET: return current visibility
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }   
): Promise<Response> {
  const { roomId } = await context.params;          

  const db = await getDb();
  const room = await db.collection("rooms").findOne(
    { _id: new ObjectId(roomId) },
    { projection: { visibility: 1 } }
  );

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ visibility: room.visibility });
}

// PATCH: update visibility
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }   
): Promise<Response> {
  const { roomId } = await context.params;           
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const body = await req.json();
  const { visibility } = body;

  if (!["public", "private", "unlisted"].includes(visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  const roomObjectId = new ObjectId(roomId);

  const room = await db.collection("rooms").findOne({ _id: roomObjectId });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let userObjectId: ObjectId | null = null;
  try {
    userObjectId = new ObjectId(user.id);
  } catch {
    // not a valid ObjectId string
  }

  const isOwner =
    (userObjectId && room.ownerId.equals(userObjectId)) ||
    room.ownerId.toString() === user.id;

  if (!isOwner) {
    return NextResponse.json(
      { error: "Only owners can update settings" },
      { status: 403 }
    );
  }

  await db.collection("rooms").updateOne(
    { _id: roomObjectId },
    { $set: { visibility, updatedAt: new Date() } }
  );

  return NextResponse.json({ visibility });
}
