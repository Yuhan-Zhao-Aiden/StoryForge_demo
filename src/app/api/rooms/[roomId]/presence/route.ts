import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/database";
import { getCurrentUser } from "@/lib/auth";
import { getUserRoomRole } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const roomObjectId = new ObjectId(roomId);
    const userObjectId = new ObjectId(user.id);
    const db = await connectDB();

    const role = await getUserRoomRole(db, roomObjectId, userObjectId);
    if (!role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const cutoff = new Date(Date.now() - 30000);
    const activePresence = await db.collection("roomPresence")
      .find({ roomId: roomObjectId, lastSeen: { $gte: cutoff } })
      .toArray();

    const userIds = activePresence.map((p) => p.userId);
    const users = await db.collection("users")
      .find({ _id: { $in: userIds } }, { projection: { username: 1, email: 1 } })
      .toArray();

    const usersMap = new Map(users.map((u) => [u._id.toString(), u]));
    const activeUsers = activePresence.map((p) => ({
      userId: p.userId.toString(),
      username: usersMap.get(p.userId.toString())?.username || "Unknown",
      email: usersMap.get(p.userId.toString())?.email,
      lastSeen: p.lastSeen,
      cursor: p.cursor,
    }));

    return NextResponse.json({ activeUsers });
  } catch (err) {
    console.error("Error fetching presence:", err);
    return NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const db = await connectDB();
    const role = await getUserRoomRole(db, new ObjectId(roomId), new ObjectId(user.id));
    if (!role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    await db.collection("roomPresence").updateOne(
      { roomId: new ObjectId(roomId), userId: new ObjectId(user.id) },
      { $set: { lastSeen: new Date(), cursor: body.cursor || null } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating presence:", err);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const db = await connectDB();
    await db.collection("roomPresence").deleteOne({
      roomId: new ObjectId(roomId),
      userId: new ObjectId(user.id),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error removing presence:", err);
    return NextResponse.json({ error: "Failed to remove presence" }, { status: 500 });
  }
}
