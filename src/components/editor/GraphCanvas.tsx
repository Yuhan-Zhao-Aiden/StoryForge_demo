"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnSelectionChangeFunc,
  type OnMoveEnd,
  type OnConnect,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type { StoryFlowNode, StoryFlowEdge } from "@/hooks/useStoryGraphStore";

type GraphCanvasProps = {
  roomId: string;
  nodes: StoryFlowNode[];
  edges: StoryFlowEdge[];
  nodeTypes: NodeTypes;
  canEdit: boolean;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  viewport?: { x: number; y: number; zoom: number };
  isPolling: boolean;
  lastSync: string | null;
  syncStopped: boolean;
  syncError: string | null;
  nodesEmpty: boolean;
  onNodesChange: (changes: NodeChange<StoryFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StoryFlowEdge>[]) => void;
  onConnect: OnConnect;
  onSelectionChange: OnSelectionChangeFunc;
  onMoveEnd: OnMoveEnd;
};

export function GraphCanvas({
  roomId,
  nodes,
  edges,
  nodeTypes,
  canEdit,
  loading,
  error,
  actionError,
  viewport,
  isPolling,
  lastSync,
  syncStopped,
  syncError,
  nodesEmpty,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onMoveEnd,
}: GraphCanvasProps) {
  return (
    <div className="relative flex-1 bg-muted/10" style={{ touchAction: "none" }}>
      <ReactFlow<StoryFlowNode, StoryFlowEdge>
        colorMode="dark"
        key={roomId}
        fitView
        defaultViewport={viewport}
        nodes={nodes}
        edges={edges}
        onNodesChange={canEdit ? onNodesChange : undefined}
        onEdgesChange={canEdit ? onEdgesChange : undefined}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable
        nodeTypes={nodeTypes}
        className="bg-background"
        style={{ touchAction: "none" }}
      >
        <MiniMap
          nodeColor={(node) => (node.data?.color as string) ?? "#2563eb"}
          nodeStrokeColor={(node) => (node.data?.color as string) ?? "#2563eb"}
          nodeBorderRadius={6}
        />
        <Controls position="top-right" />
        <Background gap={24} />

        {/* Sync status indicator */}
        {canEdit && lastSync && !loading && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
            {syncStopped ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Sync stopped</span>
              </>
            ) : syncError ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-muted-foreground">Sync error</span>
              </>
            ) : isPolling ? (
              <>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-muted-foreground">Syncing...</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Synced</span>
              </>
            )}
          </div>
        )}
      </ReactFlow>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/80 text-sm text-muted-foreground">
          Loading story graph…
        </div>
      )}
      {error && (
        <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {actionError && (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}
      {!loading && !error && nodesEmpty && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-dashed border-border bg-background/90 p-4 text-center text-sm text-muted-foreground">
          {canEdit
            ? "No nodes yet — use the toolbar to start building your story."
            : "This story has no content yet. You have view-only access."}
        </div>
      )}
    </div>
  );
}
