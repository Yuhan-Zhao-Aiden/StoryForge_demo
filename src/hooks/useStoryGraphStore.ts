"use client";

import { create } from "zustand";
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Viewport,
  addEdge as addEdgeRF,
  applyNodeChanges as applyNodeChangesRF,
  applyEdgeChanges as applyEdgeChangesRF,
} from "@xyflow/react";

import type { StoryNode, StoryEdge, GraphViewport } from "@/lib/types/editor";

type StoryEdgeData = { type?: StoryEdge["type"]; story?: StoryEdge };
type StoryFlowNodeData = StoryNode & { label: string };
type StoryFlowNode = Node<StoryFlowNodeData>;
type StoryFlowEdge = Edge<StoryEdgeData>;
type StoryNodeChange = NodeChange<StoryFlowNode>;
type StoryEdgeChange = EdgeChange<StoryFlowEdge>;

type GraphSnapshot = {
  nodes: StoryFlowNode[];
  edges: StoryFlowEdge[];
  viewport?: Viewport;
};

type StoryGraphState = {
  roomId: string | null;
  nodes: StoryFlowNode[];
  edges: StoryFlowEdge[];
  viewport?: Viewport;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  dirty: boolean;
  lastSavedAt?: number;
  undoStack: GraphSnapshot[];
  redoStack: GraphSnapshot[];
  initializeGraph: (payload: {
    roomId: string;
    nodes: StoryNode[];
    edges: StoryEdge[];
    viewport?: GraphViewport;
  }) => void;
  setFromServer: (payload: {
    nodes: StoryNode[];
    edges: StoryEdge[];
    viewport?: GraphViewport;
  }) => void;
  applyNodeChanges: (changes: StoryNodeChange[]) => void;
  applyEdgeChanges: (changes: StoryEdgeChange[]) => void;
  connect: (connection: Connection) => void;
  addNode: (node: StoryNode) => void;
  patchNode: (id: string, patch: Partial<StoryNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: StoryEdge) => void;
  patchEdge: (id: string, patch: Partial<StoryEdge>) => void;
  removeEdge: (id: string) => void;
  replaceNode: (tempId: string, node: StoryNode) => void;
  replaceEdge: (tempId: string, edge: StoryEdge) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  clearSelection: () => void;
  setViewport: (viewport: Viewport, opts?: { recordHistory?: boolean; markDirty?: boolean }) => void;
  markSaved: (timestamp?: number) => void;
  setDirty: (dirty: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

const HISTORY_LIMIT = 50;

const cloneValue = <T>(value: T): T => {
  const structuredCloneFn = globalThis.structuredClone as
    | (<U>(val: U) => U)
    | undefined;
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

function toFlowNode(node: StoryNode): StoryFlowNode {
  const color = node.color ?? "#2563eb";
  const data = cloneValue(node) as StoryFlowNodeData;
  data.label = node.title;
  if (!data.color) {
    data.color = color;
  }
  return {
    id: node.id,
    position: { ...node.position },
    type: node.type,
    data,
    style: {
      border: "none",
      background: "transparent",
      padding: 0,
      width: 224,
    },
  };
}

function toFlowEdge(edge: StoryEdge): StoryFlowEdge {
  const mappedType: StoryFlowEdge["type"] =
    edge.type === "choice"
      ? "step"
      : edge.type === "alt"
        ? "smoothstep"
        : "default";

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: mappedType,
    label: edge.label,
    data: {
      type: edge.type,
      story: cloneValue(edge),
    },
  };
}

function flowNodeToStoryNode(node: StoryFlowNode): StoryNode {
  const data = node.data;
  return {
    id: node.id,
    roomId: data.roomId ?? "",
    title: data.title,
    type: (data.type as StoryNode["type"]) ?? (node.type as StoryNode["type"]) ?? "scene",
    color: data.color ?? "#2563eb",
    position: { ...node.position },
    labels: data.labels ? [...data.labels] : [],
    content: data.content
      ? {
          text: data.content.text ?? undefined,
          summary: data.content.summary ?? undefined,
          media: data.content.media ? [...data.content.media] : [],
        }
      : { text: undefined, summary: undefined, media: [] },
    collapsed: data.collapsed ?? false,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function flowEdgeToStoryEdge(edge: StoryFlowEdge): StoryEdge {
  if (edge.data?.story) {
    return cloneValue(edge.data.story);
  }
  return {
    id: edge.id,
    roomId: edge.data?.story?.roomId ?? "",
    source: edge.source,
    target: edge.target,
    type: (edge.data?.type as StoryEdge["type"]) ?? "normal",
    label: typeof edge.label === "string" ? edge.label : undefined,
    createdAt: undefined,
  };
}

function toFlowViewport(viewport?: GraphViewport): Viewport | undefined {
  if (!viewport) return undefined;
  return {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  };
}

function cloneNodes(nodes: StoryFlowNode[]): StoryFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    data: node.data ? cloneValue(node.data) : node.data,
    position: { ...node.position },
    style: node.style ? { ...node.style } : undefined,
  }));
}

function cloneEdges(edges: StoryFlowEdge[]): StoryFlowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    data: edge.data ? cloneValue(edge.data) : edge.data,
  }));
}

function makeSnapshot(state: StoryGraphState): GraphSnapshot {
  return {
    nodes: cloneNodes(state.nodes),
    edges: cloneEdges(state.edges),
    viewport: state.viewport ? { ...state.viewport } : undefined,
  };
}

function pushHistory(state: StoryGraphState): GraphSnapshot[] {
  const snapshot = makeSnapshot(state);
  return [snapshot, ...state.undoStack].slice(0, HISTORY_LIMIT);
}

export const useStoryGraphStore = create<StoryGraphState>()((set, get) => ({
  roomId: null,
  nodes: [],
  edges: [],
  viewport: undefined,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  dirty: false,
  lastSavedAt: undefined,
  undoStack: [],
  redoStack: [],

  initializeGraph: ({ roomId, nodes, edges, viewport }) => {
    set({
      roomId,
      nodes: nodes.map((node) => toFlowNode(node)),
      edges: edges.map((edge) => toFlowEdge(edge)),
      viewport: toFlowViewport(viewport),
      selectedNodeIds: [],
      selectedEdgeIds: [],
      dirty: false,
      undoStack: [],
      redoStack: [],
    });
  },

  setFromServer: ({ nodes, edges, viewport }) => {
    set({
      nodes: nodes.map((node) => toFlowNode(node)),
      edges: edges.map((edge) => toFlowEdge(edge)),
      viewport: toFlowViewport(viewport),
      dirty: false,
    });
  },

  applyNodeChanges: (changes) => {
    if (!changes.length) return;
    set((state) => {
      const undoStack = pushHistory(state);
      const nextNodes = applyNodeChangesRF<StoryFlowNode>(changes, state.nodes);
      return {
        ...state,
        nodes: nextNodes,
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  applyEdgeChanges: (changes) => {
    if (!changes.length) return;
    set((state) => {
      const undoStack = pushHistory(state);
      const nextEdges = applyEdgeChangesRF<StoryFlowEdge>(changes, state.edges);
      return {
        ...state,
        edges: nextEdges,
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  connect: (connection) => {
    set((state) => {
      const undoStack = pushHistory(state);
      const nextEdges = addEdgeRF<StoryFlowEdge>(connection, state.edges).map((edge) => {
        if (edge.data && "type" in edge.data) return edge;
        return {
          ...edge,
          data: {
            ...(edge.data ?? {}),
            type: "normal" as StoryEdge["type"],
          },
        };
      });
      return {
        ...state,
        edges: nextEdges,
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  addNode: (node) => {
    set((state) => {
      const undoStack = pushHistory(state);
      return {
        ...state,
        nodes: [...state.nodes, toFlowNode(node)],
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  patchNode: (id, patch) => {
    const fallbackRoomId = get().roomId ?? undefined;
    set((state) => {
      const target = state.nodes.find((node) => node.id === id);
      if (!target) return state;
      const undoStack = pushHistory(state);
      const nextNodes = state.nodes.map((node) => {
        if (node.id !== id) return node;
        const nextData: StoryFlowNodeData = {
          ...node.data,
          id: node.data?.id ?? id,
          roomId: patch.roomId ?? node.data?.roomId ?? fallbackRoomId ?? "",
          ...patch,
          position: patch.position ? { ...patch.position } : node.data?.position,
          color: patch.color ?? node.data?.color,
          labels: patch.labels ?? node.data?.labels,
          content: patch.content ? cloneValue(patch.content) : node.data?.content,
          label: patch.title ?? node.data?.title ?? node.data.label,
        };
        const color = nextData.color ?? "#2563eb";
        const background = color.length === 7 ? `${color}20` : color;
        return {
          ...node,
          data: nextData,
          position: patch.position ? { ...patch.position } : node.position,
          type: patch.type ?? node.type,
          style: {
            ...(node.style ?? {}),
            borderColor: color,
            backgroundColor: background,
          },
        };
      });
      return {
        ...state,
        nodes: nextNodes,
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  removeNode: (id) => {
    set((state) => {
      const exists = state.nodes.some((node) => node.id === id);
      if (!exists) return state;
      const undoStack = pushHistory(state);
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        ),
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  addEdge: (edge) => {
    set((state) => {
      const undoStack = pushHistory(state);
      return {
        ...state,
        edges: [...state.edges, toFlowEdge(edge)],
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  patchEdge: (id, patch) => {
    const roomId = get().roomId ?? patch.roomId ?? "";
    set((state) => {
      const target = state.edges.find((edge) => edge.id === id);
      if (!target) return state;
      const undoStack = pushHistory(state);
      const nextEdges = state.edges.map((edge) => {
        if (edge.id !== id) return edge;
        const baseStory: StoryEdge | undefined =
          edge.data && "story" in edge.data ? edge.data.story : undefined;
        const merged: StoryEdge = {
          ...(baseStory ?? {
            id,
            roomId,
            source: edge.source,
            target: edge.target,
            type: ((edge.data?.type as StoryEdge["type"]) ?? "normal"),
            label: typeof edge.label === "string" ? edge.label : undefined,
          }),
          ...patch,
          roomId: patch.roomId ?? (baseStory?.roomId ?? roomId),
          source: patch.source ?? (baseStory?.source ?? edge.source),
          target: patch.target ?? (baseStory?.target ?? edge.target),
          type: patch.type ?? (baseStory?.type ?? ((edge.data?.type as StoryEdge["type"]) ?? "normal")),
          label:
            patch.label ??
            (baseStory?.label ??
              (typeof edge.label === "string" ? edge.label : undefined)),
        };
        const flowEdge = toFlowEdge(merged);
        flowEdge.selected = edge.selected;
        return flowEdge;
      });
      return {
        ...state,
        edges: nextEdges,
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  removeEdge: (id) => {
    set((state) => {
      const exists = state.edges.some((edge) => edge.id === id);
      if (!exists) return state;
      const undoStack = pushHistory(state);
      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== id),
        undoStack,
        redoStack: [],
        dirty: true,
      };
    });
  },

  replaceNode: (tempId, node) => {
    set((state) => {
      const nodeIndex = state.nodes.findIndex((n) => n.id === tempId);
      if (nodeIndex === -1) return state;
      const replacement = toFlowNode(node);
      const wasSelected = state.selectedNodeIds.includes(tempId);
      const nodes = state.nodes.map((current) => {
        if (current.id !== tempId) return current;
        return {
          ...replacement,
          selected: wasSelected,
        };
      });
      const edges = state.edges.map((edge) => {
        if (edge.source !== tempId && edge.target !== tempId) return edge;
        const updated = { ...edge };
        if (edge.source === tempId) updated.source = node.id;
        if (edge.target === tempId) updated.target = node.id;
        if (updated.data?.story) {
          updated.data = {
            ...updated.data,
            story: {
              ...updated.data.story,
              source: updated.source,
              target: updated.target,
            },
          };
        }
        return updated;
      });
      const selectedNodeIds = state.selectedNodeIds.map((id) =>
        id === tempId ? node.id : id,
      );
      return {
        ...state,
        nodes,
        edges,
        selectedNodeIds,
      };
    });
  },

  replaceEdge: (tempId, edge) => {
    set((state) => {
      const edgeIndex = state.edges.findIndex((e) => e.id === tempId);
      if (edgeIndex === -1) return state;
      const replacement = toFlowEdge(edge);
      const wasSelected = state.selectedEdgeIds.includes(tempId);
      const edges = state.edges.map((current) => {
        if (current.id !== tempId) return current;
        return {
          ...replacement,
          selected: wasSelected,
        };
      });
      const selectedEdgeIds = wasSelected
        ? state.selectedEdgeIds.map((id) => (id === tempId ? edge.id : id))
        : state.selectedEdgeIds;
      return {
        ...state,
        edges,
        selectedEdgeIds,
      };
    });
  },

  setSelection: (nodeIds, edgeIds) => {
    set({
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
    });
  },

  clearSelection: () => {
    set({
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  setViewport: (viewport, opts) => {
    const recordHistory = opts?.recordHistory ?? false;
    const markDirty = opts?.markDirty ?? false;
    set((state) => {
      const base = {
        ...state,
        viewport,
      };
      if (!recordHistory) {
        return {
          ...base,
          dirty: markDirty ? true : state.dirty,
        };
      }
      const undoStack = pushHistory(state);
      return {
        ...base,
        undoStack,
        redoStack: [],
        dirty: markDirty ? true : state.dirty,
      };
    });
  },

  markSaved: (timestamp) => {
    set((state) => ({
      ...state,
      dirty: false,
      lastSavedAt: timestamp ?? Date.now(),
    }));
  },

  setDirty: (dirty) => {
    set((state) => ({
      ...state,
      dirty,
    }));
  },

  undo: () => {
    set((state) => {
      const [latest, ...rest] = state.undoStack;
      if (!latest) return state;
      const redoEntry = makeSnapshot(state);
      return {
        ...state,
        nodes: cloneNodes(latest.nodes),
        edges: cloneEdges(latest.edges),
        viewport: latest.viewport ? { ...latest.viewport } : state.viewport,
        undoStack: rest,
        redoStack: [redoEntry, ...state.redoStack].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    });
  },

  redo: () => {
    set((state) => {
      const [latest, ...rest] = state.redoStack;
      if (!latest) return state;
      const undoEntry = makeSnapshot(state);
      return {
        ...state,
        nodes: cloneNodes(latest.nodes),
        edges: cloneEdges(latest.edges),
        viewport: latest.viewport ? { ...latest.viewport } : state.viewport,
        redoStack: rest,
        undoStack: [undoEntry, ...state.undoStack].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    });
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      viewport: undefined,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      dirty: false,
      undoStack: [],
      redoStack: [],
    });
  },
}));

export type { StoryFlowNode, StoryFlowEdge, StoryFlowNodeData };
export { flowNodeToStoryNode, flowEdgeToStoryEdge };
