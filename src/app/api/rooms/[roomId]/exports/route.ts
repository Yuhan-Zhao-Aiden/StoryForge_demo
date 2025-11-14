import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";
import { createExportSchema, ExportLink } from "@/lib/types/exports";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

function generateShareToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// POST - Create a new export link
export async function POST(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "EXPORT_ROOM")) {
    return jsonError(403, "Insufficient permissions to export room");
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "Invalid JSON body");

  let parsed;
  try {
    parsed = createExportSchema.parse(body);
  } catch (e: any) {
    return jsonError(400, e?.errors?.[0]?.message ?? "Invalid export payload");
  }

  const shareToken = generateShareToken();
  const now = new Date();
  const expiresAt = parsed.expiresAt || null;

  // Hash password if provided
  const passwordHash = parsed.password ? await bcrypt.hash(parsed.password, 10) : null;

  const exportDoc = {
    _id: new ObjectId(),
    roomId: roomObjectId,
    shareToken,
    name: parsed.name || null,
    options: parsed.options || {
      includeImages: true,
      includeMetadata: true,
      includeComments: false,
      format: "json",
    },
    createdBy: userId,
    createdAt: now,
    expiresAt,
    maxDownloads: parsed.maxDownloads || null,
    downloadCount: 0,
    password: passwordHash,
    disabled: false,
  };

  await db.collection("storyExports").insertOne(exportDoc);

  // Get base URL from request headers or environment variables
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || (host ? `${protocol}://${host}` : "http://localhost:3000");
  const shareUrl = `${baseUrl}/exports/${shareToken}`;

  return jsonSuccess(
    {
      export: {
        _id: exportDoc._id.toString(),
        shareToken,
        name: exportDoc.name,
        shareUrl,
        createdAt: exportDoc.createdAt,
        expiresAt: exportDoc.expiresAt,
        maxDownloads: exportDoc.maxDownloads,
        downloadCount: exportDoc.downloadCount,
        disabled: exportDoc.disabled,
      },
    },
    201,
  );
}

// GET - List all export links for a room
export async function GET(req: NextRequest, context: RouteContext) {
  const roomId = await getRoomIdFromContext(context);
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId, userId } = access.context;

  // Check permission - only owners and editors can manage exports
  const role = await getUserRoomRole(db, roomObjectId, userId);
  if (!role || !hasPermission(role, "MANAGE_EXPORTS")) {
    return jsonError(403, "Insufficient permissions to view exports");
  }

  const exports = await db
    .collection("storyExports")
    .find({
      roomId: roomObjectId,
      disabled: false,
    })
    .sort({ createdAt: -1 })
    .toArray();

  // Get base URL from request headers or environment variables
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || (host ? `${protocol}://${host}` : "http://localhost:3000");

  const exportLinks: ExportLink[] = exports.map((exp) => ({
    _id: exp._id.toString(),
    shareToken: exp.shareToken,
    name: exp.name,
    createdAt: exp.createdAt,
    expiresAt: exp.expiresAt,
    downloadCount: exp.downloadCount,
    maxDownloads: exp.maxDownloads,
    disabled: exp.disabled,
    shareUrl: `${baseUrl}/exports/${exp.shareToken}`,
  }));

  return jsonSuccess({ exports: exportLinks });
}

