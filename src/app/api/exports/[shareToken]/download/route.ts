import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";
import { jsonError } from "@/lib/api/editor";
import { StoryNode, StoryEdge } from "@/lib/types/editor";
import { getImageStream } from "@/lib/gridfs";
import { generateStoryGraphHTML } from "@/lib/exports/htmlGraphExport";

type RouteContext = {
  params: { shareToken: string } | Promise<{ shareToken: string }>;
};

async function getShareTokenFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.shareToken;
}

// Helper function to format story as Markdown
async function formatAsMarkdown(
  room: any,
  nodes: StoryNode[],
  edges: StoryEdge[],
  includeImages: boolean = true,
  baseUrl?: string
): Promise<string> {
  let markdown = `# ${room.title}\n\n`;
  if (room.subtitle) {
    markdown += `> ${room.subtitle}\n\n`;
  }
  
  // Add metadata
  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  markdown += `*Exported on ${exportDate}*\n\n`;
  markdown += `---\n\n`;

  // Helper function to add images to markdown
  const addImageToMarkdown = (imageMedia: any, nodeTitle: string, nodeId: string): string => {
    if (!includeImages) return "";
    
    if (imageMedia.source === "url" && imageMedia.url) {
      return `![${nodeTitle}](${imageMedia.url})\n\n`;
    } else if (imageMedia.source === "uploaded" && imageMedia.fileId) {
      // For uploaded images, provide a reference note
      if (baseUrl) {
        const imageUrl = `${baseUrl}/api/rooms/${room._id}/nodes/${nodeId}/images/${imageMedia.fileId}`;
        return `![${nodeTitle}](${imageUrl})\n\n`;
      } else {
        return `*[Image: ${imageMedia.filename || "uploaded image"} - File ID: ${imageMedia.fileId}]*\n\n`;
      }
    }
    return "";
  };

  // Group nodes by type
  const scenes = nodes.filter((n) => n.type === "scene");
  const choices = nodes.filter((n) => n.type === "choice");
  const endings = nodes.filter((n) => n.type === "ending");
  const notes = nodes.filter((n) => n.type === "note");

  // Write scenes
  if (scenes.length > 0) {
    markdown += `## 📖 Scenes\n\n`;
    for (const node of scenes) {
      markdown += `### ${node.title}\n\n`;
      
      // Add images
      if (node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          markdown += addImageToMarkdown(imageMedia, node.title, node.id);
        }
      }
      
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
      if (node.content.summary) {
        markdown += `*💡 Summary: ${node.content.summary}*\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Write choices
  if (choices.length > 0) {
    markdown += `## 🔀 Choices\n\n`;
    for (const node of choices) {
      markdown += `### ${node.title}\n\n`;
      
      // Add images
      if (node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          markdown += addImageToMarkdown(imageMedia, node.title, node.id);
        }
      }
      
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Write endings
  if (endings.length > 0) {
    markdown += `## 🏁 Endings\n\n`;
    for (const node of endings) {
      markdown += `### ${node.title}\n\n`;
      
      // Add images
      if (node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          markdown += addImageToMarkdown(imageMedia, node.title, node.id);
        }
      }
      
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Write notes
  if (notes.length > 0) {
    markdown += `## 📝 Notes\n\n`;
    for (const node of notes) {
      markdown += `### ${node.title}\n\n`;
      
      // Add images
      if (node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          markdown += addImageToMarkdown(imageMedia, node.title, node.id);
        }
      }
      
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Add story graph information
  if (edges.length > 0) {
    markdown += `## 🔗 Story Connections\n\n`;
    markdown += `*This story contains ${edges.length} connection${edges.length !== 1 ? "s" : ""} between nodes.*\n\n`;
  }

  return markdown;
}

// Helper function to convert stream to base64
async function streamToBase64(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    stream.on("error", reject);
  });
}

// GET - Download export in different formats
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const shareToken = await getShareTokenFromContext(context);
    const db = await getDb();

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const providedPassword = url.searchParams.get("password");

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
  if (exportDoc.password) {
    if (!providedPassword) {
      return jsonError(401, "Password required");
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
    title: node.title || "Untitled",
    type: node.type || "scene",
    color: node.color || "#2563eb",
    position: node.position || { x: 0, y: 0 },
    labels: node.labels || [],
    collapsed: node.collapsed || false,
    content: {
      text: node.content?.text || undefined,
      summary: node.content?.summary || undefined,
      media: node.content?.media || [],
      generatedBy: node.content?.generatedBy || "user",
      generatedAt: node.content?.generatedAt || undefined,
      generationPrompt: node.content?.generationPrompt || undefined,
    },
    createdBy: node.createdBy?.toString(),
    createdAt: node.createdAt || new Date(),
    updatedAt: node.updatedAt || new Date(),
  }));

  // Map edges
  const mappedEdges: StoryEdge[] = edges.map((edge) => ({
    id: edge._id.toString(),
    roomId: edge.roomId.toString(),
    source: edge.fromNodeId?.toString() || "",
    target: edge.toNodeId?.toString() || "",
    type: edge.type || "normal",
    label: edge.label || undefined,
    createdAt: edge.createdAt || new Date(),
  }));

  // Increment download count
  await db.collection("storyExports").updateOne(
    { _id: exportDoc._id },
    { $inc: { downloadCount: 1 } },
  );

  // Format response based on requested format
  const roomData = {
    _id: room._id.toString(),
    title: room.title || "Untitled Story",
    subtitle: room.subtitle || null,
    createdAt: room.createdAt || new Date(),
    updatedAt: room.updatedAt || new Date(),
  };

  const safeTitle = (room.title || "story").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `${safeTitle}_${new Date().toISOString().split("T")[0]}`;

  if (format === "json") {
    const includeImages = exportDoc.options?.includeImages !== false;
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Enhance nodes with image URLs for uploaded images
    const enhancedNodes = mappedNodes.map((node) => {
      if (!includeImages || !node.content.media) {
        return node;
      }
      
      const enhancedMedia = node.content.media.map((media) => {
        if (media.source === "uploaded" && media.fileId) {
          return {
            ...media,
            imageUrl: `${baseUrl}/api/rooms/${roomData._id}/nodes/${node.id}/images/${media.fileId}`,
          };
        }
        return media;
      });
      
      return {
        ...node,
        content: {
          ...node.content,
          media: enhancedMedia,
        },
      };
    });
    
    const jsonData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "json",
        version: "1.0",
        includeImages,
        nodeCount: mappedNodes.length,
        edgeCount: mappedEdges.length,
      },
      story: {
        room: roomData,
        nodes: enhancedNodes,
        edges: mappedEdges,
      },
    };
    
    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } else if (format === "markdown") {
    const includeImages = exportDoc.options?.includeImages !== false;
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const markdown = await formatAsMarkdown(roomData, mappedNodes, mappedEdges, includeImages, baseUrl);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  } else if (format === "html") {
    const includeImages = exportDoc.options?.includeImages !== false;
    const exportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    // Prepare nodes with embedded images
    const nodesWithImages = await Promise.all(
      mappedNodes.map(async (node) => {
        if (!includeImages || !node.content.media || node.content.media.length === 0) {
          return node;
        }

        // Process media items to embed images as base64
        const processedMedia = await Promise.all(
          node.content.media.map(async (media) => {
            if (media.type !== "image") return media;

            // Handle URL-based images (return as-is)
            if (media.source === "url" && media.url) {
              return media;
            }

            // Handle GridFS uploaded images (convert to base64)
            if (media.source === "uploaded" && media.fileId) {
              try {
                const stream = await getImageStream(new ObjectId(media.fileId));
                const base64 = await streamToBase64(stream);
                const metadata = await db.collection("node_images.files").findOne({ _id: new ObjectId(media.fileId) });
                const contentType = metadata?.metadata?.contentType || "image/jpeg";
                const dataUri = `data:${contentType};base64,${base64}`;
                
                // Return media with embedded data URI
                return {
                  ...media,
                  embeddedDataUri: dataUri,
                };
              } catch (error) {
                console.error(`Failed to embed image ${media.fileId}:`, error);
                // Return original media item if embedding fails
                return media;
              }
            }

            return media;
          })
        );

        return {
          ...node,
          content: {
            ...node.content,
            media: processedMedia,
          },
        };
      })
    );
    
    const html = generateStoryGraphHTML(nodesWithImages, mappedEdges, {
      includeImages,
      roomTitle: roomData.title,
      roomSubtitle: roomData.subtitle || undefined,
      exportDate,
    });
    
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });
  } else {
    return jsonError(400, "Unsupported format. Supported formats: json, markdown, html");
  }
  } catch (error: any) {
    console.error("Error in download route:", error);
    return jsonError(500, error?.message || "Failed to generate download");
  }
}

