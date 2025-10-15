import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string; userId: string }> }
) {
  const params = await context.params;
  const { roomId, userId } = params;

  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();

  try {
    const roomObjectId = new ObjectId(roomId);
    const targetUserId = userId; // store as string
    const currentUserId = new ObjectId(user.id);

    // Check if current user is owner
    const owner = await db.collection("roomMembers").findOne({
      roomId: roomObjectId,
      userId: currentUserId,
      role: "owner",
    });

    if (!owner)
      return NextResponse.json(
        { error: "Only owners can revoke collaborators" },
        { status: 403 }
      );

    // Delete collaborator
    const result = await db
      .collection("roomMembers")
      .deleteOne({ roomId: roomObjectId, userId: new ObjectId(targetUserId) });

    if (result.deletedCount === 0)
      return NextResponse.json({ error: "User not found in room" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to revoke collaborator:", err);
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}
