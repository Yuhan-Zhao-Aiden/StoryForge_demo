import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/database";
import { 
  getUserRoomRole, 
  hasPermission, 
  canManageRole, 
  isValidRoleTransition,
  type RoomRole 
} from "@/lib/permissions";
import { logActivity } from "@/lib/activityLogger";

type Params = { roomId: string; memberId: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, memberId } = await ctx.params;
    
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
    }
    
    if (!ObjectId.isValid(memberId)) {
      return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
    }

    const bodySchema = z.object({
      role: z.enum(["editor", "viewer"]),
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
    const memberIdObj = new ObjectId(memberId);
    const db = await connectDB();
    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "MANAGE_ROLES")) {
      return NextResponse.json(
        { error: "Forbidden - Only owners can manage roles" },
        { status: 403 }
      );
    }
    const member = await db.collection("roomMembers").findOne({
      _id: memberIdObj,
      roomId: roomIdObj,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const currentRole = member.role as RoomRole;
    const newRole = body.role as RoomRole;
    if (!canManageRole(userRole, currentRole)) {
      return NextResponse.json(
        { error: "Cannot manage this member's role" },
        { status: 403 }
      );
    }
    if (!isValidRoleTransition(currentRole, newRole)) {
      return NextResponse.json(
        { error: "Invalid role transition" },
        { status: 400 }
      );
    }
    if (member.userId.equals(userIdObj)) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }
    const result = await db.collection("roomMembers").updateOne(
      { _id: memberIdObj, roomId: roomIdObj },
      { $set: { role: newRole, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    await logActivity(db, roomIdObj, userIdObj, member.userId, "role_changed", {
      from: currentRole,
      to: newRole,
    });

    const updatedMember = await db
      .collection("roomMembers")
      .aggregate([
        { $match: { _id: memberIdObj } },
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
      ])
      .toArray();

    if (updatedMember.length === 0) {
      return NextResponse.json({ error: "Member not found after update" }, { status: 500 });
    }

    const m = updatedMember[0];
    
    return NextResponse.json({
      ok: true,
      member: {
        id: m._id.toString(),
        userId: m.userId.toString(),
        username: m.username,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
      },
      message: `Role updated to ${newRole}`,
    });
  } catch (err) {
    console.error("PATCH /api/rooms/[roomId]/members/[memberId]/role error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


