import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/database";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";

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
    const db = await connectDB();

    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "VIEW_ROOM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await db
      .collection("activityLogs")
      .aggregate([
        { $match: { roomId: roomIdObj } },
        { $sort: { timestamp: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "actorId",
            foreignField: "_id",
            as: "actor",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: 1,
            details: 1,
            timestamp: 1,
            actorUsername: "$actor.username",
            username: "$user.username",
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a._id.toString(),
        type: a.type,
        details: a.details,
        timestamp: a.timestamp,
        actorUsername: a.actorUsername,
        username: a.username,
      })),
    });
  } catch (err) {
    console.error("GET /api/rooms/[roomId]/activity error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}




