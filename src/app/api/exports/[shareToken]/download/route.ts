import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";
import { jsonError } from "@/lib/api/editor";
import { StoryNode, StoryEdge } from "@/lib/types/editor";

type RouteContext = {
  params: { shareToken: string } | Promise<{ shareToken: string }>;
};

async function getShareTokenFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.shareToken;
}

// Helper function to format story as Markdown
function formatAsMarkdown(room: any, nodes: StoryNode[], edges: StoryEdge[]): string {
  let markdown = `# ${room.title}\n\n`;
  if (room.subtitle) {
    markdown += `${room.subtitle}\n\n`;
  }
  markdown += `---\n\n`;

  // Group nodes by type
  const scenes = nodes.filter((n) => n.type === "scene");
  const choices = nodes.filter((n) => n.type === "choice");
  const endings = nodes.filter((n) => n.type === "ending");
  const notes = nodes.filter((n) => n.type === "note");

  // Write scenes
  if (scenes.length > 0) {
    markdown += `## Scenes\n\n`;
    scenes.forEach((node) => {
      markdown += `### ${node.title}\n\n`;
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
      if (node.content.summary) {
        markdown += `*Summary: ${node.content.summary}*\n\n`;
      }
    });
  }

  // Write choices
  if (choices.length > 0) {
    markdown += `## Choices\n\n`;
    choices.forEach((node) => {
      markdown += `### ${node.title}\n\n`;
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
    });
  }

  // Write endings
  if (endings.length > 0) {
    markdown += `## Endings\n\n`;
    endings.forEach((node) => {
      markdown += `### ${node.title}\n\n`;
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
    });
  }

  // Write notes
  if (notes.length > 0) {
    markdown += `## Notes\n\n`;
    notes.forEach((node) => {
      markdown += `### ${node.title}\n\n`;
      if (node.content.text) {
        markdown += `${node.content.text}\n\n`;
      }
    });
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

// Helper function to format story as HTML
function formatAsHTML(room: any, nodes: StoryNode[], edges: StoryEdge[]): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(room.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #777; }
    .summary { font-style: italic; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(room.title)}</h1>`;

  if (room.subtitle) {
    html += `\n  <p class="summary">${escapeHtml(room.subtitle)}</p>`;
  }

  html += `\n  <hr>`;

  // Group nodes by type
  const scenes = nodes.filter((n) => n.type === "scene");
  const choices = nodes.filter((n) => n.type === "choice");
  const endings = nodes.filter((n) => n.type === "ending");
  const notes = nodes.filter((n) => n.type === "note");

  // Write scenes
  if (scenes.length > 0) {
    html += `\n  <h2>Scenes</h2>`;
    scenes.forEach((node) => {
      html += `\n  <h3>${escapeHtml(node.title)}</h3>`;
      if (node.content.text) {
        html += `\n  <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
      if (node.content.summary) {
        html += `\n  <p class="summary">Summary: ${escapeHtml(node.content.summary)}</p>`;
      }
    });
  }

  // Write choices
  if (choices.length > 0) {
    html += `\n  <h2>Choices</h2>`;
    choices.forEach((node) => {
      html += `\n  <h3>${escapeHtml(node.title)}</h3>`;
      if (node.content.text) {
        html += `\n  <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
    });
  }

  // Write endings
  if (endings.length > 0) {
    html += `\n  <h2>Endings</h2>`;
    endings.forEach((node) => {
      html += `\n  <h3>${escapeHtml(node.title)}</h3>`;
      if (node.content.text) {
        html += `\n  <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
    });
  }

  // Write notes
  if (notes.length > 0) {
    html += `\n  <h2>Notes</h2>`;
    notes.forEach((node) => {
      html += `\n  <h3>${escapeHtml(node.title)}</h3>`;
      if (node.content.text) {
        html += `\n  <p>${escapeHtml(node.content.text).replace(/\n/g, "<br>")}</p>`;
      }
    });
  }

  html += `\n</body>\n</html>`;
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
    const jsonData = {
      room: roomData,
      nodes: mappedNodes,
      edges: mappedEdges,
      exportedAt: new Date().toISOString(),
    };
    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } else if (format === "markdown") {
    const markdown = formatAsMarkdown(roomData, mappedNodes, mappedEdges);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  } else if (format === "html") {
    const html = formatAsHTML(roomData, mappedNodes, mappedEdges);
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

