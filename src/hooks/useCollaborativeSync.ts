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
}

/**
 * Hook to enable collaborative real-time syncing via polling.
 * Polls the server for updates and merges changes from other users.
 */
export function useCollaborativeSync({ 
  roomId, 
  enabled = true,
  pollInterval = 5000, // 5 seconds default
}: UseSyncOptions) {
  const mergeRemoteUpdates = useStoryGraphStore((state) => state.mergeRemoteUpdates);
  const selectedNodeIds = useStoryGraphStore((state) => state.selectedNodeIds);
  
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

      const currentLastSync = lastSyncRef.current;

      // Build URL with 'since' parameter for incremental sync
      const url = currentLastSync
        ? `/api/rooms/${roomId}/nodes?since=${encodeURIComponent(currentLastSync)}`
        : `/api/rooms/${roomId}/nodes`;

      const [nodesRes, edgesRes] = await Promise.all([
        fetch(url, { signal: abortControllerRef.current.signal }),
        fetch(
          currentLastSync 
            ? `/api/rooms/${roomId}/edges?since=${encodeURIComponent(currentLastSync)}`
            : `/api/rooms/${roomId}/edges`,
          { signal: abortControllerRef.current.signal }
        ),
      ]);

      if (!nodesRes.ok || !edgesRes.ok) {
        throw new Error("Failed to fetch updates");
      }

      const nodesData: SyncResponse = await nodesRes.json();
      const edgesData: SyncResponse = await edgesRes.json();

      const hasChanges = nodesData.nodes.length > 0 || edgesData.edges.length > 0;

      // Merge remote updates, excluding nodes currently being edited
      if (hasChanges) {
        mergeRemoteUpdatesRef.current({
          nodes: nodesData.nodes,
          edges: edgesData.edges,
          excludeNodeIds: selectedNodeIdsRef.current, // Don't update nodes user is editing
        });
      }

      // Update last sync timestamp and reset failed attempts on success
      setLastSync(nodesData.serverTime || edgesData.serverTime);
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
