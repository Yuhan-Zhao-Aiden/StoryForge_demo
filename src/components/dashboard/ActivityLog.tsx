"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FaHistory, FaUserPlus, FaUserMinus, FaUserEdit } from "react-icons/fa";

type Activity = {
  id: string;
  type: string;
  details: Record<string, any>;
  timestamp: Date;
  actorUsername?: string;
  username?: string;
};

type ActivityLogProps = {
  roomId: string;
};

const activityIcons = {
  role_changed: <FaUserEdit className="h-4 w-4 text-blue-500" />,
  member_removed: <FaUserMinus className="h-4 w-4 text-red-500" />,
  member_joined: <FaUserPlus className="h-4 w-4 text-green-500" />,
};

function formatActivity(activity: Activity): string {
  const actor = activity.actorUsername || "Someone";
  const user = activity.username || "a user";

  switch (activity.type) {
    case "role_changed":
      return `${actor} changed ${user}'s role from ${activity.details.from} to ${activity.details.to}`;
    case "member_removed":
      return `${actor} removed ${user} from the room`;
    case "member_joined":
      return `${user} joined the room`;
    default:
      return `${actor} performed an action`;
  }
}

function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function ActivityLog({ roomId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchActivities();
    }
  }, [open, roomId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rooms/${roomId}/activity`);

      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }

      const data = await response.json();
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FaHistory className="h-4 w-4" />
          Activity Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Log</DialogTitle>
          <DialogDescription>
            Recent activity and changes in this room (last 50 events)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading activities...</div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities yet
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg border border-muted/60 bg-background p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="mt-0.5">
                  {activityIcons[activity.type as keyof typeof activityIcons] || (
                    <FaHistory className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {formatActivity(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
