import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { Readable } from "stream";

// Constants for image upload limits
export const IMAGE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  MAX_DIMENSION: 4096, // pixels
} as const;

// Bucket name constant
const BUCKET_NAME = "node_images";

// GridFS bucket instance (cached)
let gridFSBucket: GridFSBucket | null = null;

/**
 * Get or create the GridFS bucket for node images
 */
export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (!gridFSBucket) {
    const db = await getDb();
    gridFSBucket = new GridFSBucket(db, {
      bucketName: BUCKET_NAME,
    });
  }
  return gridFSBucket;
}

/**
 * Metadata stored with each uploaded image in GridFS
 */
export interface ImageMetadata {
  roomId: string;
  nodeId: string;
  uploadedBy: string;
  uploadedAt: Date;
  contentType: string;
  originalFilename: string;
  size: number;
}

/**
 * Upload an image file to GridFS
 * @param file - Buffer containing the image data
 * @param metadata - Metadata about the image and upload context
 * @returns The ObjectId of the uploaded file
 */
export async function uploadImage(
  file: Buffer,
  metadata: {
    filename: string;
    contentType: string;
    roomId: string;
    nodeId: string;
    uploadedBy: string;
  }
): Promise<ObjectId> {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(metadata.filename, {
      metadata: {
        roomId: metadata.roomId,
        nodeId: metadata.nodeId,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: new Date(),
        contentType: metadata.contentType,
        originalFilename: metadata.filename,
        size: file.length,
      } as ImageMetadata,
    });

    uploadStream.on("finish", () => {
      resolve(uploadStream.id as ObjectId);
    });

    uploadStream.on("error", (error) => {
      reject(error);
    });

    // Write the buffer to the stream
    const readableStream = Readable.from(file);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Get a download stream for an image from GridFS
 * @param fileId - The ObjectId of the file to retrieve
 * @returns A readable stream of the file data
 */
export async function getImageStream(fileId: ObjectId | string) {
  const bucket = await getGridFSBucket();
  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId;
  return bucket.openDownloadStream(objectId);
}

/**
 * Get metadata for an image without downloading the full file
 * @param fileId - The ObjectId of the file
 * @returns File metadata including custom fields
 */
export async function getImageMetadata(
  fileId: ObjectId | string
): Promise<{
  _id: ObjectId;
  filename: string;
  length: number;
  uploadDate: Date;
  metadata?: ImageMetadata;
} | null> {
  const db = await getDb();
  const filesCollection = db.collection(`${BUCKET_NAME}.files`);

  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId;
  const file = await filesCollection.findOne({ _id: objectId });
  return file as any;
}

/**
 * Delete an image from GridFS
 * @param fileId - The ObjectId of the file to delete
 */
export async function deleteImage(fileId: ObjectId | string): Promise<void> {
  const bucket = await getGridFSBucket();
  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId;

  try {
    await bucket.delete(objectId);
  } catch (error: any) {
    // If file doesn't exist, consider it already deleted
    if (error.message?.includes("FileNotFound")) {
      return;
    }
    throw error;
  }
}

/**
 * Delete all images associated with a specific node
 * @param nodeId - The node ID to find and delete images for
 */
export async function deleteNodeImages(nodeId: string): Promise<number> {
  const bucket = await getGridFSBucket();
  const db = await getDb();
  const filesCollection = db.collection(`${BUCKET_NAME}.files`);

  // Find all files with this nodeId in metadata
  const files = await filesCollection
    .find({ "metadata.nodeId": nodeId })
    .toArray();

  let deletedCount = 0;
  for (const file of files) {
    try {
      await bucket.delete(file._id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete image ${file._id}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Delete all images associated with a specific room
 * @param roomId - The room ID to find and delete images for
 */
export async function deleteRoomImages(roomId: string): Promise<number> {
  const bucket = await getGridFSBucket();
  const db = await getDb();
  const filesCollection = db.collection(`${BUCKET_NAME}.files`);

  // Find all files with this roomId in metadata
  const files = await filesCollection
    .find({ "metadata.roomId": roomId })
    .toArray();

  let deletedCount = 0;
  for (const file of files) {
    try {
      await bucket.delete(file._id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete image ${file._id}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Find orphaned images (images not referenced by any node)
 * Useful for cleanup jobs
 * @param roomId - Optional room ID to scope the search
 */
export async function findOrphanedImages(
  roomId?: string
): Promise<Array<{ _id: ObjectId; filename: string; size: number }>> {
  const db = await getDb();
  const filesCollection = db.collection(`${BUCKET_NAME}.files`);
  const nodesCollection = db.collection("nodes");

  // Build query
  const query: any = {};
  if (roomId) {
    query["metadata.roomId"] = roomId;
  }

  // Get all image files
  const files = await filesCollection.find(query).toArray();

  const orphaned: Array<{ _id: ObjectId; filename: string; size: number }> =
    [];

  for (const file of files) {
    const nodeId = file.metadata?.nodeId;
    if (!nodeId) {
      orphaned.push({
        _id: file._id,
        filename: file.filename,
        size: file.length,
      });
      continue;
    }

    // Check if the node exists and actually references this image
    const node = await nodesCollection.findOne({ _id: new ObjectId(nodeId) });

    if (!node) {
      // Node doesn't exist
      orphaned.push({
        _id: file._id,
        filename: file.filename,
        size: file.length,
      });
      continue;
    }

    // Check if the node's media array contains this fileId
    const mediaArray = node.content?.media || [];
    const isReferenced = mediaArray.some(
      (media: any) =>
        media.source === "uploaded" && media.fileId === file._id.toString()
    );

    if (!isReferenced) {
      orphaned.push({
        _id: file._id,
        filename: file.filename,
        size: file.length,
      });
    }
  }

  return orphaned;
}

/**
 * Get total storage used by a room's images
 * @param roomId - The room ID to calculate storage for
 * @returns Total bytes used
 */
export async function getRoomImageStorageSize(roomId: string): Promise<number> {
  const db = await getDb();
  const filesCollection = db.collection(`${BUCKET_NAME}.files`);

  const result = await filesCollection
    .aggregate([
      { $match: { "metadata.roomId": roomId } },
      { $group: { _id: null, totalSize: { $sum: "$length" } } },
    ])
    .toArray();

  return result.length > 0 ? result[0].totalSize : 0;
}

/**
 * Validate file type and size before upload
 * @param contentType - MIME type of the file
 * @param size - File size in bytes
 * @throws Error if validation fails
 */
export function validateImageUpload(contentType: string, size: number): void {
  if (!(IMAGE_UPLOAD_LIMITS.ALLOWED_TYPES as readonly string[]).includes(contentType)) {
    throw new Error(
      `Unsupported file type: ${contentType}. Allowed types: ${IMAGE_UPLOAD_LIMITS.ALLOWED_TYPES.join(", ")}`
    );
  }

  if (size > IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    const maxSizeMB = IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
    throw new Error(
      `File size ${(size / (1024 * 1024)).toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`
    );
  }

  if (size === 0) {
    throw new Error("File is empty");
  }
}
