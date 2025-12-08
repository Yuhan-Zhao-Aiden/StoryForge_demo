"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStoryGraphStore } from "@/hooks/useStoryGraphStore";

interface UseSyncOptions {
  roomId: string;
  enabled?: boolean;
  pollInterval?: number;
}

interface SyncResponse {
  nodes: any[];
  edges: any[];
  serverTime: string;
  deletedNodeIds?: string[];
  deletedEdgeIds?: string[];
}

/**
 * Hook to enable collaborative real-time syncing via polling.
 * Polls the server for updates and merges changes from other users.
 */
export function useCollaborativeSync({ 
  roomId, 
  enabled = true,
  pollInterval = 2000, // 2 seconds default for better real-time feel
}: UseSyncOptions) {
  const mergeRemoteUpdates = useStoryGraphStore((state) => state.mergeRemoteUpdates);
  const selectedNodeIds = useStoryGraphStore((state) => state.selectedNodeIds);
  const nodes = useStoryGraphStore((state) => state.nodes);
  
  const [isPolling, setIsPolling] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [syncStopped, setSyncStopped] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(true);
  
  // Store latest values in refs to avoid recreating fetchUpdates
  const lastSyncRef = useRef<string | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const nodesRef = useRef(nodes);
  const mergeRemoteUpdatesRef = useRef(mergeRemoteUpdates);
  
  const MAX_FAILED_ATTEMPTS = 3;
  
  // Keep refs in sync with state
  useEffect(() => {
    lastSyncRef.current = lastSync;
  }, [lastSync]);
  
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);
  
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    mergeRemoteUpdatesRef.current = mergeRemoteUpdates;
  }, [mergeRemoteUpdates]);

  // Track document visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Fetch updates from server - stable function using refs
  const fetchUpdates = useCallback(async () => {
    // Don't poll if tab is hidden or not enabled
    if (!isActiveRef.current || !enabled) {
      return;
    }

    try {
      setIsPolling(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Use incremental sync with deletion tracking
      const currentLastSync = lastSyncRef.current;
      const sinceParam = currentLastSync ? `?since=${encodeURIComponent(currentLastSync)}` : '';
      
      const [nodesRes, edgesRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}/nodes${sinceParam}`, { 
          signal: abortControllerRef.current.signal,
          cache: 'no-store'
        }),
        fetch(`/api/rooms/${roomId}/edges${sinceParam}`, { 
          signal: abortControllerRef.current.signal,
          cache: 'no-store'
        }),
      ]);

      if (!nodesRes.ok || !edgesRes.ok) {
        throw new Error("Failed to fetch updates");
      }

      const nodesData: SyncResponse = await nodesRes.json();
      const edgesData: SyncResponse = await edgesRes.json();

      // Check if there are any changes
      const hasChanges = 
        nodesData.nodes.length > 0 || 
        edgesData.edges.length > 0 ||
        (nodesData.deletedNodeIds && nodesData.deletedNodeIds.length > 0) ||
        (edgesData.deletedEdgeIds && edgesData.deletedEdgeIds.length > 0);

      if (hasChanges) {
        // Only exclude nodes that are actively being dragged, not just selected
        // This allows updates from other users even if we have the node selected
        const draggingIds = nodesRef.current.filter(n => n.dragging).map(n => n.id);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sync] Merging updates:', {
            nodes: nodesData.nodes.length,
            edges: edgesData.edges.length,
            deletedNodes: nodesData.deletedNodeIds?.length || 0,
            deletedEdges: edgesData.deletedEdgeIds?.length || 0,
            excludingDragging: draggingIds,
            since: currentLastSync,
            serverTime: nodesData.serverTime
          });
        }
        
        mergeRemoteUpdatesRef.current({
          nodes: nodesData.nodes,
          edges: edgesData.edges,
          excludeNodeIds: draggingIds,
          deletedNodeIds: nodesData.deletedNodeIds || [],
          deletedEdgeIds: edgesData.deletedEdgeIds || [],
        });
      } else if (process.env.NODE_ENV === 'development' && currentLastSync) {
        console.log('[Sync] No changes since', currentLastSync, '- serverTime:', nodesData.serverTime);
      }

      // Always update last sync timestamp to server time (even with no changes)
      // This prevents repeatedly querying the same time range
      setLastSync(nodesData.serverTime || new Date().toISOString());
      setFailedAttempts(0);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }
      console.error("Sync error:", err);
      setError(err.message || "Failed to sync");
      
      // Increment failed attempts and stop sync if threshold reached
      setFailedAttempts((prev) => {
        const newCount = prev + 1;
        if (newCount >= MAX_FAILED_ATTEMPTS) {
          setSyncStopped(true);
          console.error(`Sync stopped after ${MAX_FAILED_ATTEMPTS} failed attempts`);
        }
        return newCount;
      });
    } finally {
      setIsPolling(false);
    }
  }, [roomId, enabled, MAX_FAILED_ATTEMPTS]); // Only depend on roomId and enabled - stable!

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !roomId || syncStopped) {
      return;
    }

    fetchUpdates();

    // Set up polling with the current interval
    const intervalId = setInterval(() => {
      fetchUpdates();
    }, pollInterval); // Use the prop directly, not the ref

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [roomId, enabled, pollInterval, fetchUpdates, syncStopped]); // Dependencies

  return {
    isPolling,
    lastSync,
    error,
    failedAttempts,
    syncStopped,
    manualSync: fetchUpdates,
  };
}
