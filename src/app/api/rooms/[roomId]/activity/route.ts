import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getUserRoomRole } from "@/lib/permissions";

type Params = { roomId: string };

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
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

    // Only owners can view the activity log
    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (userRole !== "owner") {
      return NextResponse.json(
        { error: "Only room owners can view the activity log" },
        { status: 403 }
      );
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * limit;
    const typeFilter = searchParams.get("type"); // Optional filter by activity type

    // Build match query
    const matchQuery: any = { roomId: roomIdObj };
    if (typeFilter) {
      matchQuery.type = typeFilter;
    }

    // Get total count for pagination
    const totalCount = await db
      .collection("activityLogs")
      .countDocuments(matchQuery);

    const activities = await db
      .collection("activityLogs")
      .aggregate([
        { $match: matchQuery },
        { $sort: { timestamp: -1 } },
        { $skip: skip },
        { $limit: limit },
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
        {
          $lookup: {
            from: "nodes",
            localField: "details.nodeId",
            foreignField: "_id",
            as: "node",
          },
        },
        { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$node", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: 1,
            details: 1,
            timestamp: 1,
            actorUsername: "$actor.username",
            actorEmail: "$actor.email",
            username: "$user.username",
            userEmail: "$user.email",
            nodeTitle: "$node.title",
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
        actorEmail: a.actorEmail,
        username: a.username,
        userEmail: a.userEmail,
        nodeTitle: a.nodeTitle,
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/rooms/[roomId]/activity error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}




