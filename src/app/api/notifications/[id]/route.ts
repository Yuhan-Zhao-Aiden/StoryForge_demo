import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; 

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { read } = await request.json();
    const db = await getDb();

    const result = await db.collection("notifications").updateOne(
      {
        _id: new ObjectId(id), // ✅ use extracted id
        userId: currentUser.id,
      },
      {
        $set: {
          read,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const totalUnread = await db
      .collection("notifications")
      .countDocuments({ userId: currentUser.id, read: false }); // ✅ also fixed logical bug — unread = false

    return NextResponse.json({
      success: true,
      totalUnread,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
