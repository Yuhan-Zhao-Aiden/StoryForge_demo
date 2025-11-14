import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";
import { jsonError } from "@/lib/api/editor";
import { StoryNode, StoryEdge } from "@/lib/types/editor";
import { getImageStream } from "@/lib/gridfs";

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

// Helper function to escape HTML
function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// Helper function to format story as HTML
async function formatAsHTML(
  room: any,
  nodes: StoryNode[],
  edges: StoryEdge[],
  includeImages: boolean = true
): Promise<string> {
  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(room.title)} - Story Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 40px 20px; 
      line-height: 1.7; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 50px;
      margin: 20px 0;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }
    h1 { 
      color: #1a1a1a; 
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: #666;
      font-size: 1.2em;
      font-style: italic;
      margin-top: 10px;
    }
    .metadata {
      color: #888;
      font-size: 0.9em;
      margin-top: 15px;
    }
    h2 { 
      color: #333; 
      margin-top: 50px; 
      margin-bottom: 25px;
      font-size: 1.8em;
      padding-left: 15px;
      border-left: 4px solid #667eea;
    }
    h3 { 
      color: #444; 
      margin-top: 30px; 
      margin-bottom: 15px;
      font-size: 1.4em;
      font-weight: 600;
    }
    .summary { 
      font-style: italic; 
      color: #666; 
      background: #f8f9fa;
      padding: 12px 15px;
      border-left: 3px solid #667eea;
      border-radius: 4px;
      margin: 15px 0;
    }
    img { 
      max-width: 100%; 
      height: auto; 
      margin: 20px 0; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: block;
      transition: transform 0.3s ease;
    }
    img:hover {
      transform: scale(1.02);
    }
    p {
      margin: 15px 0;
      color: #333;
      text-align: justify;
    }
    hr { 
      border: none; 
      border-top: 2px solid #e0e0e0; 
      margin: 40px 0; 
    }
    .node-section {
      margin: 30px 0;
      padding: 25px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e8e8e8;
      transition: box-shadow 0.3s ease;
    }
    .node-section:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 1.2em;
      margin-right: 8px;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(room.title)}</h1>`;

  if (room.subtitle) {
    html += `\n      <p class="subtitle">${escapeHtml(room.subtitle)}</p>`;
  }
  html += `\n      <p class="metadata">Exported on ${exportDate}</p>`;
  html += `\n    </header>`;

  // Group nodes by type
  const scenes = nodes.filter((n) => n.type === "scene");
  const choices = nodes.filter((n) => n.type === "choice");
  const endings = nodes.filter((n) => n.type === "ending");
  const notes = nodes.filter((n) => n.type === "note");

  // Write scenes
  if (scenes.length > 0) {
    html += `\n    <h2><span class="icon">📖</span>Scenes</h2>`;
    for (const node of scenes) {
      html += `\n    <div class="node-section">`;
      html += `\n      <h3>${escapeHtml(node.title)}</h3>`;
      
      // Include images if enabled
      if (includeImages && node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          if (imageMedia.source === "url" && imageMedia.url) {
            html += `\n      <img src="${escapeHtml(imageMedia.url)}" alt="${escapeHtml(node.title)}" />`;
          } else if (imageMedia.source === "uploaded" && imageMedia.fileId) {
            // For uploaded images, we'll embed them as base64
            // This will be handled in the main function
            html += `\n      <img data-file-id="${escapeHtml(imageMedia.fileId)}" alt="${escapeHtml(node.title)}" />`;
          }
        }
      }
      
      if (node.content.text) {
        html += `\n      <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
      if (node.content.summary) {
        html += `\n      <p class="summary">💡 Summary: ${escapeHtml(node.content.summary)}</p>`;
      }
      html += `\n    </div>`;
    }
  }

  // Write choices
  if (choices.length > 0) {
    html += `\n    <h2><span class="icon">🔀</span>Choices</h2>`;
    for (const node of choices) {
      html += `\n    <div class="node-section">`;
      html += `\n      <h3>${escapeHtml(node.title)}</h3>`;
      
      // Include images if enabled
      if (includeImages && node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          if (imageMedia.source === "url" && imageMedia.url) {
            html += `\n      <img src="${escapeHtml(imageMedia.url)}" alt="${escapeHtml(node.title)}" />`;
          } else if (imageMedia.source === "uploaded" && imageMedia.fileId) {
            html += `\n      <img data-file-id="${escapeHtml(imageMedia.fileId)}" alt="${escapeHtml(node.title)}" />`;
          }
        }
      }
      
      if (node.content.text) {
        html += `\n      <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
      html += `\n    </div>`;
    }
  }

  // Write endings
  if (endings.length > 0) {
    html += `\n    <h2><span class="icon">🏁</span>Endings</h2>`;
    for (const node of endings) {
      html += `\n    <div class="node-section">`;
      html += `\n      <h3>${escapeHtml(node.title)}</h3>`;
      
      // Include images if enabled
      if (includeImages && node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          if (imageMedia.source === "url" && imageMedia.url) {
            html += `\n      <img src="${escapeHtml(imageMedia.url)}" alt="${escapeHtml(node.title)}" />`;
          } else if (imageMedia.source === "uploaded" && imageMedia.fileId) {
            html += `\n      <img data-file-id="${escapeHtml(imageMedia.fileId)}" alt="${escapeHtml(node.title)}" />`;
          }
        }
      }
      
      if (node.content.text) {
        html += `\n      <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
      html += `\n    </div>`;
    }
  }

  // Write notes
  if (notes.length > 0) {
    html += `\n    <h2><span class="icon">📝</span>Notes</h2>`;
    for (const node of notes) {
      html += `\n    <div class="node-section">`;
      html += `\n      <h3>${escapeHtml(node.title)}</h3>`;
      
      // Include images if enabled
      if (includeImages && node.content.media) {
        const imageMedia = node.content.media.find((m) => m.type === "image");
        if (imageMedia) {
          if (imageMedia.source === "url" && imageMedia.url) {
            html += `\n      <img src="${escapeHtml(imageMedia.url)}" alt="${escapeHtml(node.title)}" />`;
          } else if (imageMedia.source === "uploaded" && imageMedia.fileId) {
            html += `\n      <img data-file-id="${escapeHtml(imageMedia.fileId)}" alt="${escapeHtml(node.title)}" />`;
          }
        }
      }
      
      if (node.content.text) {
        html += `\n      <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
      html += `\n    </div>`;
    }
  }

  // Add story graph information
  if (edges.length > 0) {
    html += `\n    <hr>`;
    html += `\n    <div class="node-section" style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">`;
    html += `\n      <h3 style="color: white; border: none; padding: 0;">🔗 Story Connections</h3>`;
    html += `\n      <p style="color: rgba(255,255,255,0.9);">This story contains <strong>${edges.length}</strong> connection${edges.length !== 1 ? "s" : ""} between nodes.</p>`;
    html += `\n    </div>`;
  }

  html += `\n  </div>\n</body>\n</html>`;
  return html;
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
    let html = await formatAsHTML(roomData, mappedNodes, mappedEdges, includeImages);
    
    // Replace uploaded image placeholders with base64 data URIs
    if (includeImages) {
      const imagePlaceholders = html.match(/data-file-id="([^"]+)"/g);
      if (imagePlaceholders) {
        for (const placeholder of imagePlaceholders) {
          const fileIdMatch = placeholder.match(/data-file-id="([^"]+)"/);
          if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            try {
              const stream = await getImageStream(new ObjectId(fileId));
              const base64 = await streamToBase64(stream);
              const metadata = await db.collection("node_images.files").findOne({ _id: new ObjectId(fileId) });
              const contentType = metadata?.metadata?.contentType || "image/jpeg";
              const dataUri = `data:${contentType};base64,${base64}`;
              html = html.replace(
                `<img data-file-id="${fileId}"`,
                `<img src="${dataUri}"`
              );
            } catch (error) {
              console.error(`Failed to embed image ${fileId}:`, error);
              // Remove the placeholder if we can't load the image
              html = html.replace(
                new RegExp(`<img data-file-id="${fileId}"[^>]*>`, "g"),
                `<p style="color: #999; font-style: italic;">[Image could not be loaded]</p>`
              );
            }
          }
        }
      }
    }
    
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

