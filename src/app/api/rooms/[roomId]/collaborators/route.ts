import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const params = await context.params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();

  try {
    const roomId = new ObjectId(params.roomId);
    const currentUserId = new ObjectId(user.id);

    // Check if user belongs to the room
    const membership = await db
      .collection("roomMembers")
      .findOne({ roomId, userId: currentUserId });

    if (!membership)
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );

    // Fetch all room members with usernames
    const members = await db
      .collection("roomMembers")
      .aggregate([
        { $match: { roomId } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            userId: "$user._id",
            username: "$user.username",
            role: 1,
          },
        },
      ])
      .toArray();

    const currentUserRole = membership.role;

    return NextResponse.json({
      collaborators: members,
      currentUserId: user.id,
      currentUserRole,
    });
  } catch (err) {
    console.error("Error fetching collaborators:", err);
    return NextResponse.json(
      { error: "Failed to fetch collaborators" },
      { status: 500 }
    );
  }
}
