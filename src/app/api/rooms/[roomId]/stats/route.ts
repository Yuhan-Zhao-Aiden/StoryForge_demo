import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
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
    const db = await getDb();

    const userRole = await getUserRoomRole(db, roomIdObj, userIdObj);
    if (!userRole || !hasPermission(userRole, "VIEW_ROOM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [memberStats, activityStats, nodeCount, edgeCount] = await Promise.all([
      db.collection("roomMembers").aggregate([
        { $match: { roomId: roomIdObj } },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]).toArray(),
      
      db.collection("activityLogs").aggregate([
        { 
          $match: { 
            roomId: roomIdObj,
            timestamp: { $gte: oneWeekAgo }
          } 
        },
        { 
          $lookup: {
            from: "roomMembers",
            localField: "actorId",
            foreignField: "userId",
            as: "member"
          }
        },
        { $unwind: { path: "$member", preserveNullAndEmptyArrays: true } },
        { 
          $group: { 
            _id: "$member.role", 
            count: { $sum: 1 } 
          } 
        }
      ]).toArray(),

      db.collection("nodes").countDocuments({ roomId: roomIdObj }),
      db.collection("edges").countDocuments({ roomId: roomIdObj })
    ]);

    const membersByRole = {
      owner: 0,
      editor: 0,
      viewer: 0
    };

    memberStats.forEach(stat => {
      if (stat._id === "owner" || stat._id === "editor" || stat._id === "viewer") {
        membersByRole[stat._id] = stat.count;
      }
    });

    const activityByRole = {
      owner: 0,
      editor: 0,
      viewer: 0
    };

    activityStats.forEach(stat => {
      if (stat._id === "owner" || stat._id === "editor" || stat._id === "viewer") {
        activityByRole[stat._id] = stat.count;
      }
    });

    const totalActivity = Object.values(activityByRole).reduce((a, b) => a + b, 0);
    const totalMembers = Object.values(membersByRole).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      membersByRole,
      activityByRole,
      totalActivity,
      totalMembers,
      nodeCount,
      edgeCount,
      weekRange: {
        start: oneWeekAgo.toISOString(),
        end: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("GET /api/rooms/[roomId]/stats error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

