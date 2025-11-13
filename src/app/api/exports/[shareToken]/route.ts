import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";
import { jsonError, jsonSuccess } from "@/lib/api/editor";
import { StoryNode, StoryEdge } from "@/lib/types/editor";

type RouteContext = {
  params: { shareToken: string } | Promise<{ shareToken: string }>;
};

async function getShareTokenFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.shareToken;
}

// GET - Get export data via shareable link (public, but may require password)
export async function GET(req: NextRequest, context: RouteContext) {
  const shareToken = await getShareTokenFromContext(context);
  const db = await getDb();

  const exportDoc = await db.collection("storyExports").findOne({
    shareToken,
    disabled: false,
  });

  if (!exportDoc) {
    return jsonError(404, "Export not found or has been disabled");
  }

  // Check expiration
  if (exportDoc.expiresAt && new Date(exportDoc.expiresAt) < new Date()) {
    return jsonError(410, "Export link has expired");
  }

  // Check max downloads
  if (exportDoc.maxDownloads && exportDoc.downloadCount >= exportDoc.maxDownloads) {
    return jsonError(410, "Export link has reached maximum downloads");
  }

  // Check password if required
  const url = new URL(req.url);
  const providedPassword = url.searchParams.get("password");

  if (exportDoc.password) {
    if (!providedPassword) {
      return NextResponse.json({ error: "Password required", requiresPassword: true }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(providedPassword, exportDoc.password);
    if (!passwordMatch) {
      return jsonError(401, "Invalid password");
    }
  }

  // Fetch room data
  const room = await db.collection("rooms").findOne(
    { _id: exportDoc.roomId },
    { projection: { title: 1, subtitle: 1, createdAt: 1, updatedAt: 1 } },
  );

  if (!room) {
    return jsonError(404, "Room not found");
  }

  // Fetch nodes and edges
  const [nodes, edges] = await Promise.all([
    db
      .collection("nodes")
      .find({ roomId: exportDoc.roomId })
      .sort({ createdAt: 1 })
      .toArray(),
    db
      .collection("edges")
      .find({ roomId: exportDoc.roomId })
      .sort({ createdAt: 1 })
      .toArray(),
  ]);

  // Map nodes
  const mappedNodes: StoryNode[] = nodes.map((node) => ({
    id: node._id.toString(),
    roomId: node.roomId.toString(),
    title: node.title,
    type: node.type,
    color: node.color || "#2563eb",
    position: node.position,
    labels: node.labels || [],
    collapsed: node.collapsed || false,
    content: {
      text: node.content?.text || undefined,
      summary: node.content?.summary || undefined,
      media: node.content?.media || [],
    },
    createdBy: node.createdBy?.toString(),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  }));

  // Map edges
  const mappedEdges: StoryEdge[] = edges.map((edge) => ({
    id: edge._id.toString(),
    roomId: edge.roomId.toString(),
    source: edge.fromNodeId.toString(),
    target: edge.toNodeId.toString(),
    type: edge.type || "normal",
    label: edge.label || undefined,
    createdAt: edge.createdAt,
  }));

  // Increment download count
  await db.collection("storyExports").updateOne(
    { _id: exportDoc._id },
    { $inc: { downloadCount: 1 } },
  );

  return jsonSuccess({
    export: {
      name: exportDoc.name,
      options: exportDoc.options,
      createdAt: exportDoc.createdAt,
    },
    room: {
      _id: room._id.toString(),
      title: room.title,
      subtitle: room.subtitle,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    },
    nodes: mappedNodes,
    edges: mappedEdges,
  });
}


