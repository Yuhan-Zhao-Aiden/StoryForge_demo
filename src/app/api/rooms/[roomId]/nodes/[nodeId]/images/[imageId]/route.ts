import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import { requireRoomAccess, jsonError } from "@/lib/api/editor";
import {
  getImageStream,
  getImageMetadata,
  deleteImage,
} from "@/lib/gridfs";

type RouteContext = {
  params: { roomId: string; nodeId: string; imageId: string } | Promise<{ roomId: string; nodeId: string; imageId: string }>;
};

async function getParamsFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params;
}

/**
 * GET /api/rooms/[roomId]/nodes/[nodeId]/images/[imageId]
 * Retrieve and stream an image file from GridFS
 * 
 * Requirements:
 * - User must have room access (read permission)
 * - Image must belong to the specified node
 * 
 * Response: Binary image data with appropriate content-type header
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { roomId, nodeId, imageId } = await getParamsFromContext(context);

  console.log("Image GET request:", { roomId, nodeId, imageId });

  // Check room access (read permission is sufficient)
  const access = await requireRoomAccess(roomId);
  if (!access.ok) {
    console.error("Room access denied:", { roomId, error: access.response });
    return access.response;
  }

  const { roomId: roomObjectId } = access.context;

  // Validate IDs
  if (!ObjectId.isValid(nodeId)) {
    return jsonError(400, "Invalid node ID");
  }

  if (!ObjectId.isValid(imageId)) {
    return jsonError(400, "Invalid image ID");
  }

  const imageObjectId = new ObjectId(imageId);

  // Get image metadata to verify it belongs to this room/node
  let metadata;
  try {
    metadata = await getImageMetadata(imageObjectId);
    console.log("Image metadata retrieved:", {
      hasMetadata: !!metadata,
      metadataRoomId: metadata?.metadata?.roomId,
      metadataNodeId: metadata?.metadata?.nodeId,
    });
  } catch (error: any) {
    console.error("Failed to get image metadata:", error);
    return jsonError(500, "Failed to retrieve image");
  }

  if (!metadata) {
    console.error("Image metadata not found for imageId:", imageId);
    return jsonError(404, "Image not found");
  }

  // Verify the image belongs to the specified room and node
  // Normalize roomId comparison (handle both string and ObjectId formats)
  const storedRoomId = metadata.metadata?.roomId;
  const storedNodeId = metadata.metadata?.nodeId;
  const expectedRoomId = roomObjectId.toString();
  
  // Compare roomId - handle both string formats
  const roomIdMatches = storedRoomId === expectedRoomId || 
                        (storedRoomId && new ObjectId(storedRoomId).equals(roomObjectId));
  
  // Compare nodeId - should be exact string match
  const nodeIdMatches = storedNodeId === nodeId;
  
  if (!roomIdMatches || !nodeIdMatches) {
    console.error("Image metadata mismatch in GET:", {
      storedRoomId,
      expectedRoomId,
      storedNodeId,
      expectedNodeId: nodeId,
      imageId: imageId,
    });
    return jsonError(404, "Image not found");
  }

  // Stream the image from GridFS
  let stream;
  try {
    stream = await getImageStream(imageObjectId);
  } catch (error: any) {
    console.error("Failed to stream image:", error);
    return jsonError(500, "Failed to retrieve image");
  }

  // Convert the readable stream to a web stream
  const webStream = new ReadableStream({
    async start(controller) {
      stream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      stream.on("end", () => {
        controller.close();
      });

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        controller.error(err);
      });
    },
  });

  // Return the image with appropriate headers
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": metadata.metadata?.contentType || "application/octet-stream",
      "Content-Length": metadata.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
      "Content-Disposition": `inline; filename="${metadata.filename}"`,
    },
  });
}

/**
 * DELETE /api/rooms/[roomId]/nodes/[nodeId]/images/[imageId]
 * Delete an image from GridFS
 * 
 * Requirements:
 * - User must have write access (owner or editor)
 * - Image must belong to the specified node
 * 
 * Response: { success: true }
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { roomId, nodeId, imageId } = await getParamsFromContext(context);

  // Check room access and permissions
  const access = await requireRoomAccess(roomId, { requireWrite: true });
  if (!access.ok) return access.response;

  const { db, roomId: roomObjectId } = access.context;

  // Validate IDs
  if (!ObjectId.isValid(nodeId)) {
    return jsonError(400, "Invalid node ID");
  }

  if (!ObjectId.isValid(imageId)) {
    return jsonError(400, "Invalid image ID");
  }

  const nodeObjectId = new ObjectId(nodeId);
  const imageObjectId = new ObjectId(imageId);

  // Verify node exists and belongs to this room
  const node = await db.collection("nodes").findOne({
    _id: nodeObjectId,
    roomId: roomObjectId,
  });

  if (!node) {
    return jsonError(404, "Node not found");
  }

  // Get image metadata to verify it belongs to this room/node
  let metadata;
  try {
    metadata = await getImageMetadata(imageObjectId);
  } catch (error: any) {
    console.error("Failed to get image metadata:", error);
    return jsonError(500, "Failed to delete image");
  }

  if (!metadata) {
    return jsonError(404, "Image not found");
  }

  // Verify the image belongs to the specified room and node
  // Normalize roomId comparison (handle both string and ObjectId formats)
  const storedRoomId = metadata.metadata?.roomId;
  const storedNodeId = metadata.metadata?.nodeId;
  const expectedRoomId = roomObjectId.toString();
  
  // Compare roomId - handle both string formats
  const roomIdMatches = storedRoomId === expectedRoomId || 
                        (storedRoomId && new ObjectId(storedRoomId).equals(roomObjectId));
  
  // Compare nodeId - should be exact string match
  const nodeIdMatches = storedNodeId === nodeId;
  
  if (!roomIdMatches || !nodeIdMatches) {
    console.error("Image metadata mismatch in DELETE:", {
      storedRoomId,
      expectedRoomId,
      storedNodeId,
      expectedNodeId: nodeId,
      imageId: imageId,
    });
    return jsonError(404, "Image not found");
  }

  // Delete the image from GridFS
  try {
    await deleteImage(imageObjectId);
  } catch (error: any) {
    console.error("Failed to delete image from GridFS:", error);
    return jsonError(500, "Failed to delete image");
  }

  // Also remove the reference from the node's media array
  try {
    await db.collection("nodes").updateOne(
      { _id: nodeObjectId },
      {
        $pull: {
          "content.media": { fileId: imageId } as any,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to update node media array:", error);
    // Image is already deleted from GridFS, so we'll continue
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
