"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStoryGraphStore, flowNodeToStoryNode, flowEdgeToStoryEdge } from "@/hooks/useStoryGraphStore";
import type { StoryNode, StoryEdge } from "@/lib/types/editor";
import type { Connection } from "@xyflow/react";

type CreateNodeOptions = Partial<
  Pick<StoryNode, "title" | "type" | "color" | "position" | "content">
>;

type UseStoryGraphActionsResult = {
  createNode: (options?: CreateNodeOptions) => Promise<void>;
  createChoiceNode: () => Promise<void>;
  updateNode: (id: string, patch: Partial<StoryNode>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  connectNodes: (connection: Connection) => Promise<void>;
  deleteEdges: (ids: string[]) => Promise<void>;
  savingLayout: boolean;
  error: string | null;
  clearError: () => void;
};

const TEMP_ID_PREFIX = "temp-";
const POSITION_SAVE_DELAY = 800;

function buildNewNode(roomId: string, options?: CreateNodeOptions, offset = 0): StoryNode {
  const baseColor = options?.color ?? "#2563eb";
  const title = options?.title ?? "New Node";
  const type = options?.type ?? "scene";
  const position =
    options?.position ?? {
      x: 120 + offset,
      y: 120 + offset,
    };

  return {
    id: `${TEMP_ID_PREFIX}${crypto.randomUUID()}`,
    roomId,
    title,
    type,
    color: baseColor,
    position,
    labels: [],
    content: options?.content ?? { text: "", summary: undefined, media: [] },
    collapsed: false,
    createdBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

function isPersistedId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function useStoryGraphActions(roomId: string, canEdit: boolean): UseStoryGraphActionsResult {
  const nodes = useStoryGraphStore((state) => state.nodes);
  const addNode = useStoryGraphStore((state) => state.addNode);
  const patchNode = useStoryGraphStore((state) => state.patchNode);
  const removeNodeFromStore = useStoryGraphStore((state) => state.removeNode);
  const replaceNode = useStoryGraphStore((state) => state.replaceNode);
  const addEdgeToStore = useStoryGraphStore((state) => state.addEdge);
  const removeEdgeFromStore = useStoryGraphStore((state) => state.removeEdge);
  const replaceEdge = useStoryGraphStore((state) => state.replaceEdge);
  const markSaved = useStoryGraphStore((state) => state.markSaved);
  const setDirty = useStoryGraphStore((state) => state.setDirty);

  const [error, setError] = useState<string | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const pendingPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastSavedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedPositions = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const flushPendingPositions = useCallback(async () => {
    if (!canEdit) {
      pendingPositionsRef.current.clear();
      return;
    }
    if (pendingPositionsRef.current.size === 0) return;

    const payload = Array.from(pendingPositionsRef.current.entries())
      .filter(([id]) => isPersistedId(id))
      .map(([id, position]) => ({ id, position }));

    if (!payload.length) {
      pendingPositionsRef.current.clear();
      return;
    }

    setSavingLayout(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/nodes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: payload,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? "Failed to save node positions");
      }

      payload.forEach(({ id, position }) => {
        lastSavedPositionsRef.current.set(id, position);
      });
      pendingPositionsRef.current.clear();
      markSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save layout";
      setError(message);
    } finally {
      setSavingLayout(false);
    }
  }, [canEdit, roomId, markSaved]);

  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    if (!initializedPositions.current) {
      nodes.forEach((node) => {
        lastSavedPositionsRef.current.set(node.id, { ...node.position });
      });
      initializedPositions.current = true;
      return;
    }

    const changedNodes = nodes.filter((node) => {
      if (!isPersistedId(node.id)) return false;
      const prev = lastSavedPositionsRef.current.get(node.id);
      return !prev || prev.x !== node.position.x || prev.y !== node.position.y;
    });
    if (!changedNodes.length) return;

    changedNodes.forEach((node) => {
      pendingPositionsRef.current.set(node.id, { ...node.position });
    });

    if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
    layoutTimeoutRef.current = setTimeout(flushPendingPositions, POSITION_SAVE_DELAY);
  }, [nodes, canEdit, flushPendingPositions]);

  const createNode = useCallback(
    async (options?: CreateNodeOptions) => {
      if (!canEdit) return;
      const offset = nodes.length * 40;
      const newNode = buildNewNode(roomId, options, offset);
      addNode(newNode);
      setDirty(true);

      try {
        const res = await fetch(`/api/rooms/${roomId}/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: [
              {
                title: newNode.title,
                type: newNode.type,
                color: newNode.color,
                position: newNode.position,
                labels: newNode.labels,
                collapsed: newNode.collapsed,
                content: newNode.content,
              },
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to create node");
        }

        const json = (await res.json()) as { nodes?: StoryNode[] };
        const saved = json.nodes?.[0];
        if (saved) {
          replaceNode(newNode.id, saved);
          lastSavedPositionsRef.current.set(saved.id, { ...saved.position });
        }
        markSaved();
      } catch (err: unknown) {
        removeNodeFromStore(newNode.id);
        const message = err instanceof Error ? err.message : "Unable to create node";
        setError(message);
      }
    },
    [addNode, canEdit, nodes.length, markSaved, removeNodeFromStore, replaceNode, roomId, setDirty],
  );

  const createChoiceNode = useCallback(() => createNode({ type: "choice", title: "New Choice" }), [createNode]);

  const updateNode = useCallback(
    async (id: string, patch: Partial<StoryNode>) => {
      if (!canEdit) return;
      const currentState = useStoryGraphStore.getState();
      const target = currentState.nodes.find((node) => node.id === id);
      if (!target) return;
      const snapshot = flowNodeToStoryNode(target);

      patchNode(id, patch);
      setDirty(true);

      try {
        const payload: Record<string, unknown> = { id };
        if (patch.title !== undefined) payload.title = patch.title;
        if (patch.type !== undefined) payload.type = patch.type;
        if (patch.color !== undefined) payload.color = patch.color;
        if (patch.position !== undefined) payload.position = patch.position;
        if (patch.labels !== undefined) payload.labels = patch.labels;
        if (patch.collapsed !== undefined) payload.collapsed = patch.collapsed;
        if (patch.content !== undefined) payload.content = patch.content;

        const res = await fetch(`/api/rooms/${roomId}/nodes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [payload] }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to update node");
        }
        markSaved();
      } catch (err: unknown) {
        replaceNode(id, snapshot);
        const message = err instanceof Error ? err.message : "Unable to update node";
        setError(message);
      }
    },
    [canEdit, patchNode, markSaved, replaceNode, roomId, setDirty],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      const currentState = useStoryGraphStore.getState();
      const target = currentState.nodes.find((node) => node.id === id);
      if (!target) return;
      const snapshot = flowNodeToStoryNode(target);
      const relatedEdges = currentState.edges
        .filter((edge) => edge.source === id || edge.target === id)
        .map(flowEdgeToStoryEdge);

      removeNodeFromStore(id);
      relatedEdges.forEach((edge) => removeEdgeFromStore(edge.id));
      setDirty(true);

      try {
        const res = await fetch(`/api/rooms/${roomId}/nodes`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to delete node");
        }
        lastSavedPositionsRef.current.delete(id);
        markSaved();
      } catch (err: unknown) {
        addNode(snapshot);
        relatedEdges.forEach((edge) => addEdgeToStore(edge));
        const message = err instanceof Error ? err.message : "Unable to delete node";
        setError(message);
      }
    },
    [addNode, addEdgeToStore, canEdit, markSaved, removeEdgeFromStore, removeNodeFromStore, roomId, setDirty],
  );

  const deleteEdges = useCallback(
    async (ids: string[]) => {
      if (!canEdit || !ids.length) return;
      const currentState = useStoryGraphStore.getState();
      const edgesToDelete = currentState.edges
        .filter((edge) => ids.includes(edge.id))
        .map(flowEdgeToStoryEdge);

      if (!edgesToDelete.length) return;

      edgesToDelete.forEach((edge) => removeEdgeFromStore(edge.id));
      setDirty(true);

      try {
        const res = await fetch(`/api/rooms/${roomId}/edges`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to delete edge");
        }
        markSaved();
      } catch (err: unknown) {
        edgesToDelete.forEach((edge) => addEdgeToStore(edge));
        const message = err instanceof Error ? err.message : "Unable to delete edge";
        setError(message);
      }
    },
    [addEdgeToStore, canEdit, markSaved, removeEdgeFromStore, roomId, setDirty],
  );

  const connectNodes = useCallback(
    async (connection: Connection) => {
      if (!canEdit) return;
      if (!connection.source || !connection.target) return;

      const tempEdge: StoryEdge = {
        id: `${TEMP_ID_PREFIX}${crypto.randomUUID()}`,
        roomId,
        source: connection.source,
        target: connection.target,
        type: "normal",
        label: undefined,
        createdAt: undefined,
      };

      addEdgeToStore(tempEdge);

      if (!isPersistedId(connection.source) || !isPersistedId(connection.target)) {
        removeEdgeFromStore(tempEdge.id);
        setError("Please save both nodes before connecting them.");
        return;
      }

      setDirty(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            edges: [
              {
                source: connection.source,
                target: connection.target,
                type: "normal",
              },
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error ?? "Failed to create edge");
        }

        const json = (await res.json()) as { edges?: StoryEdge[] };
        const saved = json.edges?.[0];
        if (saved) {
          replaceEdge(tempEdge.id, saved);
        }
        markSaved();
      } catch (err: unknown) {
        removeEdgeFromStore(tempEdge.id);
        const message = err instanceof Error ? err.message : "Unable to create edge";
        setError(message);
      }
    },
    [addEdgeToStore, canEdit, markSaved, removeEdgeFromStore, replaceEdge, roomId, setDirty],
  );

  return useMemo(
    () => ({
      createNode,
      createChoiceNode,
      updateNode,
      deleteNode,
      connectNodes,
      deleteEdges,
      savingLayout,
      error,
      clearError,
    }),
    [createNode, createChoiceNode, updateNode, deleteNode, connectNodes, deleteEdges, savingLayout, error, clearError],
  );
}
