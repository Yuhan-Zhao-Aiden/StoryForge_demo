import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const query: any = { userId: new ObjectId(currentUser.id) }; 
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    
    const totalUnread = await db
      .collection("notifications")
      .countDocuments({ userId: new ObjectId(currentUser.id), read: false }); 

    return NextResponse.json({
      notifications: notifications.map((notif) => ({
        ...notif,
        _id: notif._id.toString(),
        userId: notif.userId.toString(), 
      })),
      totalUnread,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationIds, read } = await request.json();

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const objectIds = notificationIds.map((id) => new ObjectId(id));

    await db.collection("notifications").updateMany(
      {
        _id: { $in: objectIds },
        userId: new ObjectId(currentUser.id), 
      },
      {
        $set: {
          read,
          updatedAt: new Date().toISOString(),
        },
      }
    );


    const totalUnread = await db
      .collection("notifications")
      .countDocuments({ userId: new ObjectId(currentUser.id), read: false }); 

    return NextResponse.json({
      success: true,
      totalUnread,
    });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
