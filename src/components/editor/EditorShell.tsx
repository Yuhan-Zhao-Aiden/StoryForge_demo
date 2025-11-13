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
import CommentsDrawer from "@/components/comments/CommentsDrawer";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useStoryGraphStore,
  type StoryFlowNode,
  type StoryFlowEdge,
} from "@/hooks/useStoryGraphStore";
import type { StoryEdge, StoryNode, MediaItem } from "@/lib/types/editor";
import { Input } from "@/components/ui/input";
import { useStoryGraphActions } from "@/hooks/useStoryGraphActions";
import StoryNodeCard from "@/components/editor/StoryNodeCard";
import { NodeImageManager } from "@/components/editor/NodeImageManager";
import { AIContentEditor } from "@/components/editor/AIContentEditor";
import { ModerationPanel } from "@/components/moderation/ModerationPanel";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import { Flag } from "lucide-react";

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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.user?.id))
      .catch(() => setCurrentUserId(null));
  }, []);

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
  const [refreshKey, setRefreshKey] = useState(0);

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

  const loadGraph = useCallback(async () => {
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

      initializeGraph({
        roomId: room.id,
        nodes: nodePayload,
        edges: edgePayload,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load story graph";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [initializeGraph, room.id]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph, refreshKey]);

  // Listen for refresh events from moderation panel
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("refreshEditor", handleRefresh);
    return () => {
      window.removeEventListener("refreshEditor", handleRefresh);
    };
  }, []);

  const handleContentRemoved = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

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

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (hasNodes || hasEdges)
      ) {
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
        (event.key === "d" || event.key === "D") &&
        (event.metaKey || event.ctrlKey);
      if (isDuplicateShortcut && hasNodes) {
        event.preventDefault();
        const nodesToDuplicate = nodeIdsSnapshot
          .map((id) => nodeMap.get(id))
          .filter((node): node is StoryFlowNode => Boolean(node));
        void (async () => {
          for (const node of nodesToDuplicate) {
            await createNode({
              title: node.data.title
                ? `${node.data.title} Copy`
                : "Untitled Copy",
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
                generatedBy: "user",
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
  const [nodeMedia, setNodeMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!selectedNode) {
      setNodeTitle("");
      setNodeContent("");
      setNodeColor("#2563eb");
      setNodeMedia(null);
      return;
    }
    setNodeTitle(selectedNode.data.title ?? "");
    setNodeContent(selectedNode.data.content?.text ?? "");
    setNodeColor(selectedNode.data.color ?? "#2563eb");
    const existingImage = selectedNode.data.content?.media?.find(
      (media) => media.type === "image"
    );
    setNodeMedia(existingImage ?? null);
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
            (media) => media.type !== "image"
          ) ?? []),
          ...(nodeMedia ? [nodeMedia] : []),
        ],
        generatedBy: selectedNode.data.content?.generatedBy ?? "user",
      },
    });
  }, [
    selectedNode,
    canEdit,
    nodeTitle,
    nodeColor,
    nodeContent,
    nodeMedia,
    updateNode,
  ]);

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
            <Badge
              variant="outline"
              className={`uppercase ${
                room.role === "owner"
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : room.role === "editor"
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "border-gray-500 bg-gray-500/10 text-gray-600 dark:text-gray-400"
              }`}
            >
              {room.role === "owner" && "👑 "}
              {room.role === "editor" && "✏️ "}
              {room.role === "viewer" && "👁️ "}
              {room.role}
            </Badge>
            {!canEdit && (
              <Badge variant="secondary" className="text-xs">
                Read-only
              </Badge>
            )}
            {room.role === "owner" && (
              <ModerationPanel roomId={room.id} onContentRemoved={handleContentRemoved} />
            )}
            <Button
              type="button"
              size="sm"
              className="uppercase"
              disabled={!canEdit}
            >
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
                  nodeColor={(node) =>
                    (node.data?.color as string) ?? "#2563eb"
                  }
                  nodeStrokeColor={(node) =>
                    (node.data?.color as string) ?? "#2563eb"
                  }
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
                  {canEdit
                    ? "No nodes yet — use the toolbar to start building your story."
                    : "This story has no content yet. You have view-only access."}
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
                  <AIContentEditor
                    roomId={room.id}
                    nodeId={selectedNode.id}
                    nodeType={selectedNode.type as "scene" | "choice" | "ending" | "note"}
                    value={nodeContent}
                    onChange={setNodeContent}
                    onGenerate={(generatedContent, prompt) => {
                      // Update the node with AI-generated content
                      updateNode(selectedNode.id, {
                        title: nodeTitle || "Untitled Node",
                        color: nodeColor,
                        content: {
                          text: generatedContent,
                          summary: selectedNode.data.content?.summary,
                          media: [
                            ...(selectedNode.data.content?.media?.filter(
                              (media) => media.type !== "image"
                            ) ?? []),
                            ...(nodeMedia ? [nodeMedia] : []),
                          ],
                          generatedBy: "ai",
                          generatedAt: new Date(),
                          generationPrompt: prompt,
                        },
                      });
                    }}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Image
                  </label>
                  <NodeImageManager
                    roomId={room.id}
                    nodeId={selectedNode.id}
                    currentMedia={nodeMedia}
                    onMediaUpdate={(media) => setNodeMedia(media)}
                    disabled={!canEdit}
                  />
                </div>
                {selectedNode && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Button size="sm" onClick={handleSaveNodeDetails}>
                        Save Changes
                      </Button>
                      <div className="flex gap-2">
                        <CommentsDrawer
                          room={room}
                          node={selectedNode}
                          userRole={room.role}
                          currentUserId={currentUserId}
                        />
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
                    <div className="pt-2 border-t">
                      <FlagContentButton
                        roomId={room.id}
                        contentType="node"
                        contentId={selectedNode.id}
                        trigger={
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="destructive"
                            className="w-full"
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Flag Content
                          </Button>
                        }
                      />
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
