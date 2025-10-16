"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  OnSelectionChangeFunc,
  OnMoveEnd,
  OnConnect,
  type NodeTypes,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStoryGraphStore, type StoryFlowNode, type StoryFlowEdge } from "@/hooks/useStoryGraphStore";
import type { StoryEdge, StoryNode } from "@/lib/types/editor";
import { Input } from "@/components/ui/input";
import { useStoryGraphActions } from "@/hooks/useStoryGraphActions";
import { useRouter } from "next/navigation";
import StoryNodeCard from "@/components/editor/StoryNodeCard";

const storyNodeTypes: NodeTypes = {
  scene: StoryNodeCard,
  choice: StoryNodeCard,
  ending: StoryNodeCard,
  note: StoryNodeCard,
  default: StoryNodeCard,
};

type EditorShellProps = {
  room: {
    id: string;
    title: string;
    subtitle?: string | null;
    role: "owner" | "editor" | "viewer";
  };
};

export function EditorShell({ room }: EditorShellProps) {
  const canEdit = room.role === "owner" || room.role === "editor";
  const nodes = useStoryGraphStore((state) => state.nodes);
  const edges = useStoryGraphStore((state) => state.edges);
  const router = useRouter();
  const applyNodeChanges = useStoryGraphStore(
    (state) => state.applyNodeChanges
  );
  const applyEdgeChanges = useStoryGraphStore(
    (state) => state.applyEdgeChanges
  );
  const initializeGraph = useStoryGraphStore((state) => state.initializeGraph);
  const setSelection = useStoryGraphStore((state) => state.setSelection);
  const setViewportState = useStoryGraphStore((state) => state.setViewport);
  const viewport = useStoryGraphStore((state) => state.viewport);
  const dirty = useStoryGraphStore((state) => state.dirty);
  const selectedNodeIds = useStoryGraphStore((state) => state.selectedNodeIds);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    createNode,
    createChoiceNode,
    updateNode,
    deleteNode,
    connectNodes,
    deleteEdges,
    savingLayout,
    error: actionError,
    clearError,
  } = useStoryGraphActions(room.id, canEdit);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      setLoading(true);
      setError(null);
      try {
        const [nodesRes, edgesRes] = await Promise.all([
          fetch(`/api/rooms/${room.id}/nodes`, { cache: "no-store" }),
          fetch(`/api/rooms/${room.id}/edges`, { cache: "no-store" }),
        ]);

        if (!nodesRes.ok) {
          const detail = await nodesRes.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to load nodes");
        }
        if (!edgesRes.ok) {
          const detail = await edgesRes.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to load edges");
        }

        const nodePayload: StoryNode[] =
          nodesRes.status === 204
            ? []
            : ((await nodesRes.json()) as { nodes?: StoryNode[] }).nodes ?? [];
        const edgePayload: StoryEdge[] =
          edgesRes.status === 204
            ? []
            : ((await edgesRes.json()) as { edges?: StoryEdge[] }).edges ?? [];

        if (!cancelled) {
          initializeGraph({
            roomId: room.id,
            nodes: nodePayload,
            edges: edgePayload,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Unable to load story graph";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGraph();
    return () => {
      cancelled = true;
    };
  }, [initializeGraph, room.id]);

  const handleSelectionChange = useCallback<OnSelectionChangeFunc>(
    (selection) => {
      setSelection(
        selection.nodes.map((node) => node.id),
        selection.edges.map((edge) => edge.id)
      );
    },
    [setSelection]
  );

  const handleMoveEnd = useCallback<OnMoveEnd>(
    (_event, nextViewport) => {
      setViewportState(nextViewport, { recordHistory: false });
    },
    [setViewportState]
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (!canEdit) return;
      void connectNodes(connection);
    },
    [canEdit, connectNodes]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canEdit) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }

      const state = useStoryGraphStore.getState();
      const nodeIdsSnapshot = state.selectedNodeIds;
      const edgeIdsSnapshot = state.selectedEdgeIds;
      const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));

      const hasNodes = nodeIdsSnapshot.length > 0;
      const hasEdges = edgeIdsSnapshot.length > 0;

      if ((event.key === "Delete" || event.key === "Backspace") && (hasNodes || hasEdges)) {
        event.preventDefault();
        void (async () => {
          await Promise.all(nodeIdsSnapshot.map((id) => deleteNode(id)));
          if (edgeIdsSnapshot.length) {
            await deleteEdges(edgeIdsSnapshot);
          }
        })();
        return;
      }

      const isDuplicateShortcut =
        (event.key === "d" || event.key === "D") && (event.metaKey || event.ctrlKey);
      if (isDuplicateShortcut && hasNodes) {
        event.preventDefault();
        const nodesToDuplicate = nodeIdsSnapshot
          .map((id) => nodeMap.get(id))
          .filter((node): node is StoryFlowNode => Boolean(node));
        void (async () => {
          for (const node of nodesToDuplicate) {
            await createNode({
              title: node.data.title ? `${node.data.title} Copy` : "Untitled Copy",
              type: node.type as StoryNode["type"],
              color: node.data.color,
              position: {
                x: node.position.x + 40,
                y: node.position.y + 40,
              },
              content: {
                text: node.data.content?.text ?? "",
                summary: node.data.content?.summary,
                media: node.data.content?.media ?? [],
              },
            });
          }
        })();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, createNode, deleteEdges, deleteNode]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeIds.length) return null;
    return nodes.find((node) => node.id === selectedNodeIds[0]) ?? null;
  }, [nodes, selectedNodeIds]);

  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeContent, setNodeContent] = useState("");
  const [nodeColor, setNodeColor] = useState("#2563eb");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!selectedNode) {
      setNodeTitle("");
      setNodeContent("");
      setNodeColor("#2563eb");
      setImageUrl("");
      return;
    }
    setNodeTitle(selectedNode.data.title ?? "");
    setNodeContent(selectedNode.data.content?.text ?? "");
    setNodeColor(selectedNode.data.color ?? "#2563eb");
    const existingImage = selectedNode.data.content?.media?.find(
      (media) => media.type === "image",
    );
    setImageUrl(existingImage?.url ?? "");
  }, [selectedNode]);

  useEffect(() => {
    if (!actionError) return;
    const timeout = setTimeout(() => {
      clearError();
    }, 4000);
    return () => clearTimeout(timeout);
  }, [actionError, clearError]);

  const handleSaveNodeDetails = useCallback(() => {
    if (!selectedNode || !canEdit) return;
    updateNode(selectedNode.id, {
      title: nodeTitle || "Untitled Node",
      color: nodeColor,
      content: {
        ...(selectedNode.data.content ?? {}),
        text: nodeContent,
        media: [
          ...(selectedNode.data.content?.media?.filter(
            (media) => media.type !== "image",
          ) ?? []),
          ...(imageUrl
            ? [
                {
                  id: crypto.randomUUID(),
                  type: "image" as const,
                  url: imageUrl,
                },
              ]
            : []),
        ],
      },
    });
  }, [selectedNode, canEdit, nodeTitle, nodeColor, nodeContent, imageUrl, updateNode]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode || !canEdit) return;
    deleteNode(selectedNode.id);
  }, [selectedNode, canEdit, deleteNode]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen max-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {room.title}
            </h1>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => createNode()}
                  disabled={!canEdit}
                >
                  Add Node
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => createChoiceNode()}
                  disabled={!canEdit}
                >
                  Add Choice
                </Button>
                <Button type="button" variant="outline" size="sm" disabled>
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
              <ReactFlow<StoryFlowNode, StoryFlowEdge>
                colorMode="dark"
                key={room.id}
                fitView
                defaultViewport={viewport}
                nodes={nodes}
                edges={edges}
                onNodesChange={canEdit ? applyNodeChanges : undefined}
                onEdgesChange={canEdit ? applyEdgeChanges : undefined}
                onConnect={handleConnect}
                onSelectionChange={handleSelectionChange}
                onMoveEnd={handleMoveEnd}
                nodesDraggable={canEdit}
                nodesConnectable={canEdit}
                elementsSelectable
                nodeTypes={storyNodeTypes}
                className="bg-background"
              >
                <MiniMap
                  nodeColor={(node) => node.data?.color as string ?? "#2563eb"}
                  nodeStrokeColor={(node) => node.data?.color as string ?? "#2563eb"}
                  nodeBorderRadius={6}
                />
                <Controls position="top-right" />
                <Background gap={24} />
              </ReactFlow>
              {loading ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/80 text-sm text-muted-foreground">
                  Loading story graph…
                </div>
              ) : null}
              {error ? (
                <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              {actionError ? (
                <div className="pointer-events-none absolute inset-x-4 top-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {actionError}
                </div>
              ) : null}
              {!loading && !error && nodes.length === 0 ? (
                <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-dashed border-border bg-background/90 p-4 text-center text-sm text-muted-foreground">
                  No nodes yet — use the toolbar to start building your story.
                </div>
              ) : null}
            </div>
          </section>

          <aside className="hidden w-80 border-l border-border bg-background/95 px-4 py-6 text-sm text-muted-foreground lg:block">
            <h2 className="mb-2 text-base font-semibold text-foreground">
              Details
            </h2>
            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Title
                  </label>
                  <Input
                    value={nodeTitle}
                    onChange={(e) => setNodeTitle(e.target.value)}
                    disabled={!canEdit}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Color
                  </label>
                  <input
                    type="color"
                    value={nodeColor}
                    onChange={(e) => setNodeColor(e.target.value)}
                    disabled={!canEdit}
                    className="h-9 w-16 cursor-pointer rounded border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Content
                  </label>
                  <textarea
                    value={nodeContent}
                    onChange={(e) => setNodeContent(e.target.value)}
                    disabled={!canEdit}
                    className="min-h-24 w-full rounded border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Image URL
                  </label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://example.com/image.jpg"
                    className="text-sm"
                  />
                </div>
                {selectedNode && (
                  <div className="flex items-center justify-between">
                    <Button size="sm" onClick={handleSaveNodeDetails}>
                      Save Changes
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          router.push(
                            `/rooms/${room.id}/editor/nodes/${selectedNode.id}/comments`
                          );
                        }}
                      >
                        Comments
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteNode}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a node to view and edit its content.
              </p>
            )}
          </aside>
        </div>

        <footer className="border-t border-border bg-muted/30 px-6 py-3">
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="flex items-center justify-between px-0 py-0 text-xs text-muted-foreground">
              <span>Status: {dirty ? "Unsaved changes" : "Up to date"}</span>
              <div className="flex items-center gap-3">
                <span>Nodes: {nodes.length}</span>
                <span>Edges: {edges.length}</span>
                <span>{savingLayout ? "Saving layout…" : "Layout saved"}</span>
              </div>
            </CardContent>
          </Card>
        </footer>
      </div>
    </ReactFlowProvider>
  );
}

export default EditorShell;
