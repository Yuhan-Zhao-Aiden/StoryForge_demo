"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface DashboardPresenceProps {
  roomId: string;
}

export default function DashboardPresence({ roomId }: DashboardPresenceProps) {
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPresence = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/presence`);
      if (response.ok) {
        const data = await response.json();
        setViewerCount(data.activeUsers.length);
      } else if (response.status === 403) {
        setViewerCount(0);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching presence:", error);
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchPresence();
    const interval = setInterval(fetchPresence, 15000); // Changed from 5s to 15s
    return () => clearInterval(interval);
  }, [fetchPresence]);

  if (isLoading || viewerCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <motion.div
        className="w-2 h-2 bg-green-500 rounded-full"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="font-medium">
        {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"} online
      </span>
    </motion.div>
  );
}

