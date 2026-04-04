"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type NodeTypes, type OnSelectionChangeFunc, type OnMoveEnd, type OnConnect } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useStoryGraphStore,
  type StoryFlowNode,
  type StoryFlowEdge,
} from "@/hooks/useStoryGraphStore";
import { useStoryGraphActions } from "@/hooks/useStoryGraphActions";
import { useCollaborativeSync } from "@/hooks/useCollaborativeSync";
import { useGraphLoader } from "@/hooks/useGraphLoader";
import { useNodeForm } from "@/hooks/useNodeForm";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import StoryNodeCard from "@/components/editor/StoryNodeCard";
import { NodeDetailsPanel } from "@/components/editor/NodeDetailsPanel";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import { EditorFooter } from "@/components/editor/EditorFooter";

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
  const router = useRouter();
  const canEdit = room.role === "owner" || room.role === "editor";

  const nodes = useStoryGraphStore((state) => state.nodes);
  const edges = useStoryGraphStore((state) => state.edges);
  const applyNodeChanges = useStoryGraphStore((state) => state.applyNodeChanges);
  const applyEdgeChanges = useStoryGraphStore((state) => state.applyEdgeChanges);
  const initializeGraph = useStoryGraphStore((state) => state.initializeGraph);
  const setSelection = useStoryGraphStore((state) => state.setSelection);
  const setViewportState = useStoryGraphStore((state) => state.setViewport);
  const viewport = useStoryGraphStore((state) => state.viewport);
  const dirty = useStoryGraphStore((state) => state.dirty);
  const selectedNodeIds = useStoryGraphStore((state) => state.selectedNodeIds);

  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [mobileNodeDialogOpen, setMobileNodeDialogOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.user?.id))
      .catch(() => setCurrentUserId(null));
  }, []);

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

  const { loading, error, handleContentRemoved } = useGraphLoader(
    room.id,
    initializeGraph
  );

  const { isPolling, lastSync, error: syncError, syncStopped } = useCollaborativeSync({
    roomId: room.id,
    enabled: !loading && canEdit,
  });

  const selectedNode = useMemo(() => {
    if (!selectedNodeIds.length) return null;
    return nodes.find((node) => node.id === selectedNodeIds[0]) ?? null;
  }, [nodes, selectedNodeIds]);

  const {
    nodeTitle,
    nodeContent,
    nodeColor,
    nodeMedia,
    setNodeTitle,
    setNodeContent,
    setNodeColor,
    setNodeMedia,
    handleSaveNodeDetails,
    handleDeleteNode,
    handleAIGenerate,
  } = useNodeForm({
    selectedNode,
    canEdit,
    updateNode,
    deleteNode,
    isMobile,
    setMobileNodeDialogOpen,
  });

  useKeyboardShortcuts({ canEdit, createNode, deleteNode, deleteEdges });

  useEffect(() => {
    if (!actionError) return;
    const timeout = setTimeout(clearError, 4000);
    return () => clearTimeout(timeout);
  }, [actionError, clearError]);

  const handleSelectionChange = useCallback<OnSelectionChangeFunc>(
    (selection) => {
      setSelection(
        selection.nodes.map((n) => n.id),
        selection.edges.map((e) => e.id)
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

  const handleSaveDraft = useCallback(async () => {
    if (!canEdit) return;
    setSavingDraft(true);
    try {
      if (selectedNode) {
        await updateNode(selectedNode.id, {
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
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
    } catch {
      setSavingDraft(false);
    }
  }, [canEdit, selectedNode, nodeTitle, nodeColor, nodeContent, nodeMedia, updateNode, router]);

  const nodePanelProps = selectedNode
    ? {
        selectedNode,
        canEdit,
        roomId: room.id,
        room,
        currentUserId,
        nodeTitle,
        nodeContent,
        nodeColor,
        nodeMedia,
        setNodeTitle,
        setNodeContent,
        setNodeColor,
        setNodeMedia,
        handleSaveNodeDetails,
        handleDeleteNode,
        handleAIGenerate,
      }
    : null;

  return (
    <ReactFlowProvider>
      <div className="flex h-screen max-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
        <EditorHeader
          room={room}
          canEdit={canEdit}
          savingDraft={savingDraft}
          onSaveDraft={handleSaveDraft}
          onContentRemoved={handleContentRemoved}
        />

        <div className="flex flex-1 overflow-hidden">
          <section className="flex flex-1 flex-col">
            <EditorToolbar
              canEdit={canEdit}
              createNode={() => void createNode()}
              createChoiceNode={() => void createChoiceNode()}
            />
            <GraphCanvas
              roomId={room.id}
              nodes={nodes}
              edges={edges}
              nodeTypes={storyNodeTypes}
              canEdit={canEdit}
              loading={loading}
              error={error}
              actionError={actionError}
              viewport={viewport}
              isPolling={isPolling}
              lastSync={lastSync}
              syncStopped={syncStopped}
              syncError={syncError ?? null}
              nodesEmpty={nodes.length === 0}
              onNodesChange={applyNodeChanges}
              onEdgesChange={applyEdgeChanges}
              onConnect={handleConnect}
              onSelectionChange={handleSelectionChange}
              onMoveEnd={handleMoveEnd}
            />
          </section>

          <aside className="hidden w-80 border-l border-border bg-background/95 px-4 py-6 text-sm text-muted-foreground lg:block overflow-y-auto">
            <h2 className="mb-2 text-base font-semibold text-foreground">Details</h2>
            {nodePanelProps ? (
              <NodeDetailsPanel {...nodePanelProps} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a node to view and edit its content.
              </p>
            )}
          </aside>
        </div>

        {isMobile && nodePanelProps && (
          <Dialog open={mobileNodeDialogOpen} onOpenChange={setMobileNodeDialogOpen}>
            <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Node Details</DialogTitle>
              </DialogHeader>
              <NodeDetailsPanel {...nodePanelProps} />
            </DialogContent>
          </Dialog>
        )}

        <EditorFooter
          dirty={dirty}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          savingLayout={savingLayout}
        />
      </div>
    </ReactFlowProvider>
  );
}

export default EditorShell;
