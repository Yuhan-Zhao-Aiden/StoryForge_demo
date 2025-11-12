// app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const roomId = searchParams.get("roomId")?.trim();
    const limit = parseInt(searchParams.get("limit") || "10");

    // Basic validations
    if (!query || query.length < 2) return NextResponse.json({ users: [] });
    if (!roomId || !ObjectId.isValid(roomId))
      return NextResponse.json({ users: [] });

    const db = await getDb();
    const roomObjectId = new ObjectId(roomId);

    // Find users in the room
    const roomMembers = await db
      .collection("roomMembers")
      .find({ roomId: roomObjectId })
      .project({ userId: 1 })
      .toArray();

    const userIds = roomMembers.map((m) => m.userId);

    if (userIds.length === 0) return NextResponse.json({ users: [] });

    // Search users in the room matching query
    const users = await db
      .collection("users")
      .find({
        _id: { $in: userIds },
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      })
      .project({ _id: 1, username: 1, email: 1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      users: users.map((u) => ({
        _id: u._id.toString(),
        username: u.username,
        email: u.email,
      })),
    });
  } catch (err) {
    console.error("Error searching users:", err);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
