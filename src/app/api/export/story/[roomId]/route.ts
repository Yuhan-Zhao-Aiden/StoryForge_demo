import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const format = req.nextUrl.searchParams.get("format") || "json";

  // New export options
  let fontSize = req.nextUrl.searchParams.get("fontSize") || "16px";
  const colorScheme = req.nextUrl.searchParams.get("colorScheme") || "light";
  const watermark = req.nextUrl.searchParams.get("watermark") || "";
  const toc = req.nextUrl.searchParams.get("toc") !== "false"; // default true

  // Normalize fontSize: if only number, append 'px'
  fontSize = fontSize.trim();
  if (/^\d+$/.test(fontSize)) {
    fontSize = `${fontSize}px`;
  }

  if (!roomId) {
    return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
  }

  try {
    const db = await getDb();

    // Fetch Room
    const room = await db.collection("rooms").findOne({ _id: new ObjectId(roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Fetch Nodes
    const nodes = await db
      .collection("nodes")
      .find({ roomId: new ObjectId(roomId) })
      .toArray();

    // Fetch Edges
    const edges = await db
      .collection("edges")
      .find({ roomId: new ObjectId(roomId) })
      .toArray();

    // Fetch Room Members (metadata only)
    const roomMembers = await db
      .collection("roomMembers")
      .find({ roomId: new ObjectId(roomId) })
      .project({ _id: 1, userId: 1, role: 1, joinedAt: 1 })
      .toArray();

    if (format === "html") {
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${room.title} - Story Export</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            font-size: ${fontSize};
            background-color: ${colorScheme === "dark" ? "#1f1f1f" : "#fff"};
            color: ${colorScheme === "dark" ? "#f0f0f0" : "#000"};
          }
          h1, h2, h3 { margin-top: 1em; }
          .node { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
          .node img { max-width: 100%; margin-top: 5px; }
          table { border-collapse: collapse; margin-top: 10px; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
          ${watermark ? `
            body::after {
              content: "${watermark}";
              position: fixed;
              bottom: 20px;
              right: 20px;
              opacity: 0.1;
              font-size: 2em;
              pointer-events: none;
            }` : ""}
        </style>
      </head>
      <body>
        <h1>${room.title}</h1>
        <h3>${room.subtitle || ""}</h3>
        <p><strong>Visibility:</strong> ${room.visibility}</p>
        <p><strong>Collaborators:</strong> ${room.collaborators}</p>

        ${toc ? `
        <h2>Table of Contents</h2>
        <ul>
          ${nodes.map((n) => `<li>${n.title}</li>`).join("\n")}
        </ul>` : ""}

        <h2>Nodes</h2>
        ${nodes
          .map(
            (node) => `
          <div class="node">
            <h3>${node.title} (${node.type})</h3>
            <p><strong>Position:</strong> x: ${node.position?.x}, y: ${node.position?.y}</p>
            <p><strong>Labels:</strong> ${node.labels?.join(", ") || "None"}</p>
            <p>${node.content?.text || ""}</p>
            ${node.content?.media
              ?.map((m) => {
                if (m.type === "image") {
                  return `<img src="/api/nodes/media/${m.fileId}" alt="${m.caption || ""}" />`;
                }
                return `<p>${m.type}: ${m.url || m.filename}</p>`;
              })
              .join("") || ""}
          </div>`
          )
          .join("")}

        <h2>Edges</h2>
        <table>
          <thead>
            <tr>
              <th>From Node</th>
              <th>To Node</th>
              <th>Type</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            ${edges
              .map(
                (e) =>
                  `<tr><td>${e.fromNodeId}</td><td>${e.toNodeId}</td><td>${e.type}</td><td>${e.label || ""}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>

        <h2>Room Members</h2>
        <ul>
          ${roomMembers
            .map(
              (m) =>
                `<li>User: ${m.userId} | Role: ${m.role} | Joined: ${new Date(
                  m.joinedAt
                ).toLocaleString()}</li>`
            )
            .join("")}
        </ul>
      </body>
      </html>
      `;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${room.title}.html"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json({ room, nodes, edges, roomMembers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to export story" }, { status: 500 });
  }
}
