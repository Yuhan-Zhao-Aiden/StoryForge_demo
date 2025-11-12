import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { requireRoomAccess, jsonError, jsonSuccess } from "@/lib/api/editor";
import {
  uploadImage,
  validateImageUpload,
  IMAGE_UPLOAD_LIMITS,
} from "@/lib/gridfs";

type RouteContext = {
  params: { roomId: string; nodeId: string } | Promise<{ roomId: string; nodeId: string }>;
};

async function getParamsFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params;
}

/**
 * POST /api/rooms/[roomId]/nodes/[nodeId]/images/upload
 * Upload an image file to a specific node
 * 
 * Requirements:
 * - User must have write access (owner or editor)
 * - Node must exist and belong to the room
 * - File must be a valid image type
 * - File size must not exceed limits
 * 
 * Request: multipart/form-data with "file" field
 * Response: { fileId, filename, contentType, size, uploadedAt }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { roomId, nodeId } = await getParamsFromContext(context);

  // Check room access and permissions
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, userId, roomId: roomObjectId } = access.context;

  // Validate nodeId format
  if (!ObjectId.isValid(nodeId)) {
    return jsonError(400, "Invalid node ID");
  }

  const nodeObjectId = new ObjectId(nodeId);

  // Verify node exists and belongs to this room
  const node = await db.collection("nodes").findOne({
    _id: nodeObjectId,
    roomId: roomObjectId,
  });

  if (!node) {
    return jsonError(404, "Node not found");
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, "Invalid form data");
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return jsonError(400, "No file provided or invalid file");
  }

  // Validate file type and size
  try {
    validateImageUpload(file.type, file.size);
  } catch (error: any) {
    return jsonError(400, error.message || "Invalid file");
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to GridFS
  let fileId: ObjectId;
  try {
    fileId = await uploadImage(buffer, {
      filename: file.name,
      contentType: file.type,
      roomId: roomObjectId.toString(),
      nodeId: nodeObjectId.toString(),
      uploadedBy: userId.toString(),
    });
  } catch (error: any) {
    console.error("Failed to upload image to GridFS:", error);
    return jsonError(500, "Failed to upload image");
  }

  // Return success with file metadata
  return jsonSuccess(
    {
      fileId: fileId.toString(),
      filename: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: `/api/rooms/${roomId}/nodes/${nodeId}/images/${fileId.toString()}`,
    },
    201
  );
}

/**
 * GET /api/rooms/[roomId]/nodes/[nodeId]/images/upload
 * Returns upload limits and allowed file types
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { roomId } = await getParamsFromContext(context);

  // Check room access (read-only is fine)
  const access = await requireRoomAccess(roomId);
  if (!access.ok) return access.response;

  return jsonSuccess({
    maxFileSize: IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE,
    maxFileSizeMB: IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024),
    allowedTypes: IMAGE_UPLOAD_LIMITS.ALLOWED_TYPES,
    maxDimension: IMAGE_UPLOAD_LIMITS.MAX_DIMENSION,
  });
}
