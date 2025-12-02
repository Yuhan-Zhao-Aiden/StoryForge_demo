import { NextResponse, NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const db = await getDb();
    const roomObjectId = new ObjectId(roomId);
    const userObjectId = new ObjectId(user.id);

    // Check if user has access to the parent room
    const membership = await db.collection("roomMembers").findOne({
      roomId: roomObjectId,
      userId: userObjectId,
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all branches for this room
    const branches = await db.collection("branches")
      .find({
        parentRoomId: roomObjectId,
        isActive: true,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Get room details for each branch
    const branchDetails = await Promise.all(
      branches.map(async (branch) => {
        const room = await db.collection("rooms").findOne({
          _id: branch.roomId,
        });

        // Check if user has access to this branch room
        const branchAccess = await db.collection("roomMembers").findOne({
          roomId: branch.roomId,
          userId: userObjectId,
        });

        const creator = await db.collection("users").findOne({
          _id: branch.createdBy,
        }, { projection: { username: 1, email: 1 } });

        return {
          id: branch._id.toString(),
          roomId: branch.roomId.toString(),
          name: branch.name,
          description: branch.description,
          createdAt: branch.createdAt,
          createdBy: creator ? {
            username: creator.username,
            email: creator.email,
          } : null,
          roomTitle: room?.title,
          isOwner: branch.createdBy.equals(userObjectId),
          hasAccess: !!branchAccess,
        };
      })
    );

    // Filter branches to only show ones the user has access to
    const accessibleBranches = branchDetails.filter(branch => branch.hasAccess);

    return NextResponse.json({
      success: true,
      branches: accessibleBranches,
    });

  } catch (error) {
    console.error("Get branches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const url = new URL(req.url);
    const branchId = url.searchParams.get("branchId");
    
    if (!branchId || !ObjectId.isValid(branchId)) {
      return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
    }

    const db = await getDb();
    const branchObjectId = new ObjectId(branchId);
    const userObjectId = new ObjectId(user.id);

    // Check if user is the owner of the branch
    const branch = await db.collection("branches").findOne({
      _id: branchObjectId,
      createdBy: userObjectId,
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found or access denied" }, { status: 404 });
    }

    // Soft delete: mark branch as inactive
    await db.collection("branches").updateOne(
      { _id: branchObjectId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Also mark the room as deleted
    await db.collection("rooms").updateOne(
      { _id: branch.roomId },
      { $set: { isDeleted: true, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: "Branch deleted successfully",
    });

  } catch (error) {
    console.error("Delete branch error:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    );
  }
}