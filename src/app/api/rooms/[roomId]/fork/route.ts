import { NextResponse, NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { createBranchSchema } from "@/lib/types/fork";

export async function POST(
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

    // Check if user has access to the room (owner, editor, or collaborator)
    const membership = await db.collection("roomMembers").findOne({
      roomId: roomObjectId,
      userId: userObjectId,
      role: { $in: ["owner", "editor", "collaborator"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const parsed = createBranchSchema.parse(body);

    // Get the original room
    const originalRoom = await db.collection("rooms").findOne({
      _id: roomObjectId,
    });

    if (!originalRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const now = new Date();

    // Create a new room for the branch (copy of original)
    const newRoom = {
      ownerId: userObjectId,
      title: originalRoom.title + ` (${parsed.name})`,
      subtitle: originalRoom.subtitle,
      collaborators: 0,
      slug: originalRoom.slug + "-" + Date.now().toString(36),
      visibility: originalRoom.visibility,
      isFork: true,
      forkedFrom: roomObjectId,
      branchName: parsed.name,
      branchDescription: parsed.description,
      createdAt: now,
      updatedAt: now,
    };

    const roomRes = await db.collection("rooms").insertOne(newRoom);
    const newRoomId = roomRes.insertedId;

    // Copy all nodes from original room
    const nodes = await db.collection("nodes").find({ roomId: roomObjectId }).toArray();
    const nodeMap = new Map();
    
    if (nodes.length > 0) {
      const newNodeDocs = nodes.map(node => ({
        ...node,
        _id: new ObjectId(),
        roomId: newRoomId,
        createdBy: userObjectId,
        createdAt: now,
        updatedAt: now,
        originalNodeId: node._id,
      }));
      
      // Create node mapping before inserting
      nodes.forEach((node, index) => {
        nodeMap.set(node._id.toString(), newNodeDocs[index]._id);
      });
      
      await db.collection("nodes").insertMany(newNodeDocs);
    }

    // Copy all edges from original room
    const edges = await db.collection("edges").find({ roomId: roomObjectId }).toArray();
    if (edges.length > 0) {
      const newEdgeDocs = edges.map(edge => ({
        ...edge,
        _id: new ObjectId(),
        roomId: newRoomId,
        fromNodeId: nodeMap.get(edge.fromNodeId.toString()) || edge.fromNodeId,
        toNodeId: nodeMap.get(edge.toNodeId.toString()) || edge.toNodeId,
        createdAt: now,
        updatedAt: now,
        originalEdgeId: edge._id,
      }));
      await db.collection("edges").insertMany(newEdgeDocs);
    }

    // Create room membership for the forker
    await db.collection("roomMembers").insertOne({
      roomId: newRoomId,
      userId: userObjectId,
      role: "owner",
      joinedAt: now,
    });

    // Create branch record
    await db.collection("branches").insertOne({
      roomId: newRoomId,
      parentRoomId: roomObjectId,
      name: parsed.name,
      description: parsed.description,
      createdBy: userObjectId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      branchId: newRoomId.toString(),
      branchName: parsed.name,
      roomId: newRoomId.toString(),
    }, { status: 201 });

  } catch (error: any) {
    console.error("Fork error:", error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fork story" },
      { status: 500 }
    );
  }
}