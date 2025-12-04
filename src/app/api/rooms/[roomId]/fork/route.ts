import { NextResponse, NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { GridFSBucket } from "mongodb"; // Import GridFSBucket

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
    const newNodeDocs: any[] = [];
    
    if (nodes.length > 0) {
      newNodeDocs.push(...nodes.map(node => {
        // Create new node with new ID
        const newNode : any = {
          ...node,
          _id: new ObjectId(),
          roomId: newRoomId,
          createdBy: userObjectId,
          createdAt: now,
          updatedAt: now,
          originalNodeId: node._id,
        };
        

        if (newNode.content?.media && Array.isArray(newNode.content.media)) {
          newNode.content.media = newNode.content.media.map((media: any) => {
            return media;
          });
        }
        
        return newNode;
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

    // Copy GridFS images for the room**
    console.log("Starting GridFS image copy process...");
    
    // First, let's find all image references in the original nodes
    const allImageIds = new Set<string>();
    nodes.forEach(node => {
      if (node.content?.media && Array.isArray(node.content.media)) {
        node.content.media.forEach((media: any) => {
          if (media.fileId && ObjectId.isValid(media.fileId)) {
            allImageIds.add(media.fileId);
          }
        });
      }
    });
    
    console.log(`Found ${allImageIds.size} unique image IDs to copy`);
    
    if (allImageIds.size > 0) {
      const imageIdArray = Array.from(allImageIds).map(id => new ObjectId(id));
      const imageIdMap = new Map<string, string>(); // old image ID -> new image ID
      
      // Check if GridFS collections exist
      const fsFilesExists = (await db.listCollections({ name: "fs.files" }).toArray()).length > 0;
      
      if (fsFilesExists) {
        console.log("GridFS fs.files collection exists, copying images...");
        
        // Get all image files from GridFS
        const imageFiles = await db.collection("fs.files").find({
          _id: { $in: imageIdArray }
        }).toArray();
        
        console.log(`Found ${imageFiles.length} image files in GridFS`);
        
        if (imageFiles.length > 0) {
          const bucket = new GridFSBucket(db);
          
          for (const oldImage of imageFiles) {
            const oldImageId = oldImage._id;
            const newImageId = new ObjectId();
            
            console.log(`Copying image ${oldImageId} to ${newImageId}`);
            
            // Get the corresponding old node ID from metadata
            const oldNodeId = oldImage.metadata?.nodeId;
            const newNodeId = oldNodeId ? nodeMap.get(oldNodeId.toString()) : null;
            
            // Create new metadata for the copied image
            const newMetadata = {
              ...oldImage.metadata,
              roomId: newRoomId.toString(), // Update to new room ID
              nodeId: newNodeId ? newNodeId.toString() : oldNodeId, // Update node ID if mapped
              originalImageId: oldImageId.toString(),
              forkedFromRoomId: roomObjectId.toString(),
              forkedAt: now,
            };
            
            try {
              // Create download stream from old image
              const downloadStream = bucket.openDownloadStream(oldImageId);
              
              // Create upload stream for new image
              const uploadStream = bucket.openUploadStreamWithId(
                newImageId,
                oldImage.filename,
                {
                  contentType: oldImage.contentType || "image/jpeg",
                  metadata: newMetadata,
                }
              );
              
              // Copy the file data
              await new Promise<void>((resolve, reject) => {
                downloadStream.pipe(uploadStream)
                  .on('error', reject)
                  .on('finish', () => {
                    console.log(`Successfully copied image ${oldImageId} -> ${newImageId}`);
                    resolve();
                  });
              });
              
              // Store the mapping
              imageIdMap.set(oldImageId.toString(), newImageId.toString());
              
            } catch (imageError) {
              console.error(`Failed to copy image ${oldImageId}:`, imageError);
              // Continue with other images even if one fails
            }
          }
          
          // **UPDATE NODES WITH NEW IMAGE IDs**
          console.log(`Updating nodes with ${imageIdMap.size} new image IDs`);
          
          if (imageIdMap.size > 0) {
            // Update each node's media references
            for (const newNode of newNodeDocs) {
              if (newNode.content?.media && Array.isArray(newNode.content.media)) {
                let hasUpdates = false;
                const updatedMedia = newNode.content.media.map((media: any) => {
                  if (media.fileId && imageIdMap.has(media.fileId)) {
                    hasUpdates = true;
                    return {
                      ...media,
                      fileId: imageIdMap.get(media.fileId),
                    };
                  }
                  return media;
                });
                
                if (hasUpdates) {
                  await db.collection("nodes").updateOne(
                    { _id: newNode._id },
                    { 
                      $set: { 
                        "content.media": updatedMedia,
                        updatedAt: now 
                      } 
                    }
                  );
                  console.log(`Updated node ${newNode._id} with new image references`);
                }
              }
            }
          }
        }
      } else {
        console.log("GridFS fs.files collection not found, skipping image copy");
      }
    } else {
      console.log("No image IDs found in nodes, skipping image copy");
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

    console.log(`Successfully forked room ${roomId} to ${newRoomId}`);
    
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