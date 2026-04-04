"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoryNode, StoryEdge } from "@/lib/types/editor";

type InitializeGraph = (payload: {
  roomId: string;
  nodes: StoryNode[];
  edges: StoryEdge[];
}) => void;

export function useGraphLoader(roomId: string, initializeGraph: InitializeGraph) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}/nodes`, { cache: "no-store" }),
        fetch(`/api/rooms/${roomId}/edges`, { cache: "no-store" }),
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

      initializeGraph({ roomId, nodes: nodePayload, edges: edgePayload });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load story graph";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [initializeGraph, roomId]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph, refreshKey]);

  useEffect(() => {
    const handleRefresh = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("refreshEditor", handleRefresh);
    return () => window.removeEventListener("refreshEditor", handleRefresh);
  }, []);

  const handleContentRemoved = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { loading, error, handleContentRemoved };
}
