"use client";

import { useState, useEffect } from "react";
import { FaCrown, FaEdit, FaEye, FaChartLine, FaProjectDiagram } from "react-icons/fa";

type RoomStatsProps = {
  roomId: string;
};

type Stats = {
  membersByRole: {
    owner: number;
    editor: number;
    viewer: number;
  };
  activityByRole: {
    owner: number;
    editor: number;
    viewer: number;
  };
  totalActivity: number;
  totalMembers: number;
  nodeCount: number;
  edgeCount: number;
};

export function RoomStats({ roomId }: RoomStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [roomId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
        <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  const hasActivity = stats.totalActivity > 0;

  return (
    <div className="mt-3 space-y-2">
      {/* Team Composition */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <FaCrown className="h-3 w-3" />
          <span>{stats.membersByRole.owner}</span>
        </div>
        
        {stats.membersByRole.editor > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <FaEdit className="h-3 w-3" />
            <span>{stats.membersByRole.editor}</span>
          </div>
        )}
        
        {stats.membersByRole.viewer > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            <FaEye className="h-3 w-3" />
            <span>{stats.membersByRole.viewer}</span>
          </div>
        )}

        {stats.nodeCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
            <FaProjectDiagram className="h-3 w-3" />
            <span>{stats.nodeCount} nodes</span>
          </div>
        )}
      </div>

      {/* Activity This Week */}
      {hasActivity && (
        <div className="rounded-md border border-muted/40 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FaChartLine className="h-3 w-3 text-emerald-500" />
            <span>Activity This Week</span>
          </div>
          
          <div className="space-y-1.5">
            {stats.activityByRole.owner > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FaCrown className="h-2.5 w-2.5 text-yellow-500" />
                  Owner
                </span>
                <span className="font-medium text-foreground">{stats.activityByRole.owner} actions</span>
              </div>
            )}
            
            {stats.activityByRole.editor > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FaEdit className="h-2.5 w-2.5 text-blue-500" />
                  Editors
                </span>
                <span className="font-medium text-foreground">{stats.activityByRole.editor} actions</span>
              </div>
            )}
            
            {stats.activityByRole.viewer > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FaEye className="h-2.5 w-2.5 text-gray-500" />
                  Viewers
                </span>
                <span className="font-medium text-foreground">{stats.activityByRole.viewer} actions</span>
              </div>
            )}

            <div className="mt-1.5 border-t border-muted/40 pt-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">{stats.totalActivity} actions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
