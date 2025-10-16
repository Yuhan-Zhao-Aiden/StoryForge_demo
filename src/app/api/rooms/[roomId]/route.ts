import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/database";     
import { getCurrentUser } from "@/lib/auth";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";   

type Params = { roomId: string };

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    // 1) Auth
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Get and validate roomId 
    const { roomId } = await ctx.params; 
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }
    const roomIdObj = new ObjectId(roomId);
    const userIdObj = new ObjectId(user.id);

    // 3) DB
    const db = await connectDB();

    const rooms = db.collection("rooms");
    const nodes = db.collection("nodes");
    const edges = db.collection("edges");
    const roomMembers = db.collection("roomMembers");
    const roomInvites = db.collection("roomInvites");
    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "DELETE_ROOM")) {
      return NextResponse.json({ error: "Forbidden - Only room owners can delete rooms" }, { status: 403 });
    }
    
    const room = await rooms.findOne(
      { _id: roomIdObj },
      { projection: { _id: 1, ownerId: 1 } }
    );
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
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


export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await ctx.params; 
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    let { title, subtitle } = payload as { title?: string; subtitle?: string };

    // Nothing to update
    if (title == null && subtitle == null) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Light validation/normalization
    if (typeof title === "string") title = title.trim();
    if (typeof subtitle === "string") subtitle = subtitle.trim();
    if (title !== undefined && title.length === 0) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (title && title.length > 120) {
      return NextResponse.json({ error: "Title too long (max 120)" }, { status: 400 });
    }
    if (subtitle && subtitle.length > 200) {
      return NextResponse.json({ error: "Subtitle too long (max 200)" }, { status: 400 });
    }

    const db = await connectDB();
    const rooms = db.collection("rooms"); 

    const roomIdObj = new ObjectId(roomId);
    const userIdObj = new ObjectId(user.id);
    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "UPDATE_ROOM")) {
      return NextResponse.json({ error: "Forbidden - Insufficient permissions to update room" }, { status: 403 });
    }

    const room = await rooms.findOne(
      { _id: roomIdObj },
      { projection: { _id: 1, ownerId: 1 } }
    );
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const $set: Record<string, unknown> = {};
    if (title !== undefined) $set.title = title;
    if (subtitle !== undefined) $set.subtitle = subtitle;

    const result = await rooms.findOneAndUpdate(
      { _id: roomIdObj },
      { $set, $currentDate: { updatedAt: true } },
      { returnDocument: "after", projection: { _id: 1, title: 1, subtitle: 1 } }
    );

    if (!result) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, room: result });
  } catch (err) {
    console.error("PATCH /api/rooms/[roomId] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}