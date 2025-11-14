import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

type PageProps = {
  params: { shareToken: string } | Promise<{ shareToken: string }>;
  searchParams: { password?: string } | Promise<{ password?: string }>;
};

async function getExportData(shareToken: string, password?: string) {
  const db = await getDb();

  const exportDoc = await db.collection("storyExports").findOne({
    shareToken,
    disabled: false,
  });

  if (!exportDoc) {
    return { error: "Export not found or has been disabled" };
  }

  // Check expiration
  if (exportDoc.expiresAt && new Date(exportDoc.expiresAt) < new Date()) {
    return { error: "Export link has expired" };
  }

  // Check max downloads
  if (exportDoc.maxDownloads && exportDoc.downloadCount >= exportDoc.maxDownloads) {
    return { error: "Export link has reached maximum downloads" };
  }

  // Check password if required
  if (exportDoc.password) {
    if (!password) {
      return { requiresPassword: true };
    }

    const passwordMatch = await bcrypt.compare(password, exportDoc.password);
    if (!passwordMatch) {
      return { error: "Invalid password", requiresPassword: true };
    }
  }

  // Fetch room data
  const room = await db.collection("rooms").findOne(
    { _id: exportDoc.roomId },
    { projection: { title: 1, subtitle: 1, createdAt: 1, updatedAt: 1 } },
  );

  if (!room) {
    return { error: "Room not found" };
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

  // Increment download count
  await db.collection("storyExports").updateOne(
    { _id: exportDoc._id },
    { $inc: { downloadCount: 1 } },
  );

  return {
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
    nodes: nodes.map((node) => ({
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
    })),
    edges: edges.map((edge) => ({
      id: edge._id.toString(),
      roomId: edge.roomId.toString(),
      source: edge.fromNodeId.toString(),
      target: edge.toNodeId.toString(),
      type: edge.type || "normal",
      label: edge.label || undefined,
      createdAt: edge.createdAt,
    })),
  };
}

export default async function ExportPage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams);
  const { shareToken } = params;
  const { password } = searchParams;

  const data = await getExportData(shareToken, password);

  if ("error" in data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Export Not Available</h1>
          <p className="text-muted-foreground">{data.error}</p>
        </div>
      </div>
    );
  }

  if ("requiresPassword" in data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Password Required</h1>
          <p className="text-muted-foreground mb-4">
            This export is password protected. Please enter the password to continue.
          </p>
          <form action={`/exports/${shareToken}`} method="get" className="space-y-4">
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Access Export
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { room, nodes, edges } = data;

  // Group nodes by type
  const scenes = nodes.filter((n) => n.type === "scene");
  const choices = nodes.filter((n) => n.type === "choice");
  const endings = nodes.filter((n) => n.type === "ending");
  const notes = nodes.filter((n) => n.type === "note");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{room.title}</h1>
          {room.subtitle && <p className="text-muted-foreground text-lg mb-4">{room.subtitle}</p>}
          
          <div className="flex gap-2 mt-4">
            <a
              href={`${baseUrl}/api/exports/${shareToken}/download?format=json`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
            >
              Download JSON
            </a>
            <a
              href={`${baseUrl}/api/exports/${shareToken}/download?format=markdown`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
            >
              Download Markdown
            </a>
            <a
              href={`${baseUrl}/api/exports/${shareToken}/download?format=html`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
            >
              Download HTML
            </a>
          </div>
        </div>

        {scenes.length > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Scenes</h2>
            <div className="space-y-6">
              {scenes.map((node) => (
                <div key={node.id} className="border-l-4 pl-4" style={{ borderColor: node.color }}>
                  <h3 className="text-xl font-medium mb-2">{node.title}</h3>
                  {node.content.text && (
                    <p className="text-muted-foreground whitespace-pre-wrap mb-2">{node.content.text}</p>
                  )}
                  {node.content.summary && (
                    <p className="text-sm italic text-muted-foreground">Summary: {node.content.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {choices.length > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Choices</h2>
            <div className="space-y-4">
              {choices.map((node) => (
                <div key={node.id} className="border-l-4 pl-4" style={{ borderColor: node.color }}>
                  <h3 className="text-lg font-medium mb-2">{node.title}</h3>
                  {node.content.text && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{node.content.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {endings.length > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Endings</h2>
            <div className="space-y-4">
              {endings.map((node) => (
                <div key={node.id} className="border-l-4 pl-4" style={{ borderColor: node.color }}>
                  <h3 className="text-lg font-medium mb-2">{node.title}</h3>
                  {node.content.text && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{node.content.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {notes.length > 0 && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Notes</h2>
            <div className="space-y-4">
              {notes.map((node) => (
                <div key={node.id} className="border-l-4 pl-4" style={{ borderColor: node.color }}>
                  <h3 className="text-lg font-medium mb-2">{node.title}</h3>
                  {node.content.text && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{node.content.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

