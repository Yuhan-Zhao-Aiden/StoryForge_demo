"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EditorShellProps = {
  room: {
    id: string;
    title: string;
    subtitle?: string | null;
    role: "owner" | "editor" | "viewer";
  };
};

export function EditorShell({ room }: EditorShellProps) {
  const defaultNodes = useMemo<Node[]>(() => {
    return [
      {
        id: "intro",
        position: { x: 80, y: 80 },
        data: { label: "Opening" },
        type: "default",
      },
      {
        id: "branch-1",
        position: { x: 320, y: 200 },
        data: { label: "Branch 1" },
        type: "default",
      },
    ];
  }, []);

  const defaultEdges = useMemo<Edge[]>(() => {
    return [
      {
        id: "intro-branch-1",
        source: "intro",
        target: "branch-1",
        type: "smoothstep",
      },
    ];
  }, []);

  const [nodes, , onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => addEdge(connection, currentEdges));
    },
    [setEdges],
  );

  return (
    <ReactFlowProvider>
      <div className="flex h-screen max-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{room.title}</h1>
            {room.subtitle ? (
              <p className="text-sm text-muted-foreground">{room.subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="uppercase">
              {room.role}
            </Badge>
            <Button type="button" size="sm" className="uppercase">
              Save draft
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <section className="flex flex-1 flex-col">
            <div className="flex min-h-14 items-center justify-between border-b border-border bg-background/80 px-4">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm">
                  Add Node
                </Button>
                <Button type="button" variant="outline" size="sm">
                  Add Choice
                </Button>
                <Button type="button" variant="outline" size="sm">
                  Connect
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm">
                  Zoom -
                </Button>
                <Button type="button" variant="outline" size="sm">
                  Zoom +
                </Button>
                <Button type="button" variant="outline" size="sm">
                  Fit View
                </Button>
              </div>
            </div>

            <div className="relative flex-1 bg-muted/10">
              <ReactFlow
                fitView
                nodes={nodes}
                edges={edges}
                colorMode="dark"
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                className="bg-background"
              >
                <MiniMap />
                <Controls position="top-right" />
                <Background gap={24} />
              </ReactFlow>
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-dashed border-border bg-background/90 p-4 text-center text-sm text-muted-foreground">
                Canvas placeholder — the story graph will appear here.
              </div>
            </div>
          </section>

          <aside className="hidden w-80 border-l border-border bg-background/95 px-4 py-6 text-sm text-muted-foreground lg:block">
            <h2 className="mb-2 text-base font-semibold text-foreground">Details</h2>
            <p className="mb-4">Select a node to view and edit its content.</p>
            <div className="space-y-3 text-xs">
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold">
                    Inline Editor
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Placeholder controls for node content editing.
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold">
                    Story Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Placeholder for story playback and flow preview.
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>

        <footer className="border-t border-border bg-muted/30 px-6 py-3">
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="flex items-center justify-between px-0 py-0 text-xs text-muted-foreground">
              <span>Status: Ready</span>
              <div className="flex items-center gap-3">
                <span>Nodes: {nodes.length}</span>
                <span>Edges: {edges.length}</span>
                <span>Zoom: 100%</span>
              </div>
            </CardContent>
          </Card>
        </footer>
      </div>
    </ReactFlowProvider>
  );
}

export default EditorShell;
