import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLogger";

type Params = { roomId: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await ctx.params;
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }

    const bodySchema = z.object({
      newOwnerId: z.string().refine((id) => ObjectId.isValid(id), "Invalid user ID"),
    });

    let body;
    try {
      body = bodySchema.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.errors?.[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const roomIdObj = new ObjectId(roomId);
    const userIdObj = new ObjectId(user.id);
    const newOwnerIdObj = new ObjectId(body.newOwnerId);
    const db = await getDb();

    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden - Only the current owner can transfer ownership" },
        { status: 403 }
      );
    }

    const newOwnerMembership = await db.collection("roomMembers").findOne({
      roomId: roomIdObj,
      userId: newOwnerIdObj,
    });

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: "New owner must be a member of the room" },
        { status: 400 }
      );
    }

    if (newOwnerIdObj.equals(userIdObj)) {
      return NextResponse.json(
        { error: "You are already the owner" },
        { status: 400 }
      );
    }

    await db.collection("rooms").updateOne(
      { _id: roomIdObj },
      { $set: { ownerId: newOwnerIdObj, updatedAt: new Date() } }
    );

    await db.collection("roomMembers").updateOne(
      { roomId: roomIdObj, userId: newOwnerIdObj },
      { $set: { role: "owner", updatedAt: new Date() } }
    );

    await db.collection("roomMembers").updateOne(
      { roomId: roomIdObj, userId: userIdObj },
      { $set: { role: "editor", updatedAt: new Date() } }
    );

    await logActivity({
      db,
      roomId: roomIdObj,
      actorId: userIdObj,
      userId: newOwnerIdObj,
      type: "role_changed",
      details: {
        from: newOwnerMembership.role,
        to: "owner",
        ownershipTransfer: true,
      },
    });

    await logActivity({
      db,
      roomId: roomIdObj,
      actorId: userIdObj,
      userId: userIdObj,
      type: "role_changed",
      details: {
        from: "owner",
        to: "editor",
        ownershipTransfer: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Ownership transferred successfully",
    });
  } catch (err) {
    console.error("POST /api/rooms/[roomId]/transfer-ownership error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}




