import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { hasPermission, getUserRoomRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLogger";

type Params = { roomId: string };

export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await ctx.params;
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }

    const roomIdObj = new ObjectId(roomId);
    const userIdObj = new ObjectId(user.id);
    const db = await getDb();

    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "VIEW_ROOM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const members = await db
      .collection("roomMembers")
      .aggregate([
        { $match: { roomId: roomIdObj } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $project: {
            _id: 1,
            userId: 1,
            role: 1,
            joinedAt: 1,
            username: "$userInfo.username",
            email: "$userInfo.email",
          },
        },
        { $sort: { joinedAt: 1 } },
      ])
      .toArray();

    return NextResponse.json({
      members: members.map((m) => ({
        id: m._id.toString(),
        userId: m.userId.toString(),
        username: m.username,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/rooms/[roomId]/members error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
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
      memberId: z.string().refine((id) => ObjectId.isValid(id), "Invalid member ID"),
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
    const memberIdObj = new ObjectId(body.memberId);
    const db = await getDb();

    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "REMOVE_COLLABORATORS")) {
      return NextResponse.json({ error: "Forbidden - Only owners can remove members" }, { status: 403 });
    }
    const memberToRemove = await db.collection("roomMembers").findOne({
      _id: memberIdObj,
      roomId: roomIdObj,
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (memberToRemove.role === "owner") {
      return NextResponse.json({ error: "Cannot remove room owner" }, { status: 400 });
    }
    const result = await db.collection("roomMembers").deleteOne({
      _id: memberIdObj,
      roomId: roomIdObj,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    await logActivity({
      db,
      roomId: roomIdObj,
      actorId: userIdObj,
      userId: memberToRemove.userId,
      type: "member_removed",
      details: {
        removedRole: memberToRemove.role,
      },
    });

    const nonOwnerCount = await db
      .collection("roomMembers")
      .countDocuments({ roomId: roomIdObj, role: { $ne: "owner" } });

    await db
      .collection("rooms")
      .updateOne({ _id: roomIdObj }, { $set: { collaborators: nonOwnerCount } });

    return NextResponse.json({
      ok: true,
      message: "Member removed successfully",
    });
  } catch (err) {
    console.error("DELETE /api/rooms/[roomId]/members error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


