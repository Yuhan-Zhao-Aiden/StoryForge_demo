// app/api/rooms/[roomId]/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/database";     
import { getCurrentUser } from "@/lib/auth";   

type Params = { roomId: string };

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    // 1) Auth (do not modify their getCurrentUser)
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Get and validate roomId from dynamic params
    const { roomId } = await ctx.params; 
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }
    const roomIdObj = new ObjectId(roomId);
    const userIdObj = new ObjectId(user.id);

    // 3) DB
    const db = await connectDB();

    const rooms        = db.collection("rooms");
    const nodes        = db.collection("nodes");
    const edges        = db.collection("edges");
    const roomMembers  = db.collection("roomMembers");
    const roomInvites  = db.collection("roomInvites");

    // 4) Ownership check (expects rooms.ownerId to be an ObjectId)
    const room = await rooms.findOne(
      { _id: roomIdObj },
      { projection: { _id: 1, ownerId: 1 } }
    );
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!room.ownerId || room.ownerId.toString() !== userIdObj.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const [nodesDel, edgesDel, membersDel, invitesDel] = await Promise.all([
      nodes.deleteMany({ roomId: roomIdObj }),
      edges.deleteMany({ roomId: roomIdObj }),
      roomMembers.deleteMany({ roomId: roomIdObj }),
      roomInvites.deleteMany({ roomId: roomIdObj }),
    ]);

    const roomDel = await rooms.deleteOne({ _id: roomIdObj });
    if (roomDel.deletedCount !== 1) {
      return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      roomId,
      deleted: {
        nodes: nodesDel.deletedCount ?? 0,
        edges: edgesDel.deletedCount ?? 0,
        members: membersDel.deletedCount ?? 0,
        invites: invitesDel.deletedCount ?? 0,
        rooms: roomDel.deletedCount ?? 0,
      },
    });
  } catch (err) {
    console.error("DELETE /api/rooms/[roomId] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
