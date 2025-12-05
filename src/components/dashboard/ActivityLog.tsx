"use client";

import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FaHistory, 
  FaUserPlus, 
  FaUserMinus, 
  FaUserEdit,
  FaPlus,
  FaEdit,
  FaTrash,
  FaLink,
  FaUnlink,
  FaFlag,
  FaCheck,
  FaBan,
  FaFileExport,
  FaDownload,
  FaCog,
  FaHome
} from "react-icons/fa";

type Activity = {
  id: string;
  type: string;
  details: Record<string, any>;
  timestamp: Date;
  actorUsername?: string;
  actorEmail?: string;
  username?: string;
  userEmail?: string;
  nodeTitle?: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ActivityLogProps = {
  roomId: string;
  trigger?: ReactNode;
};

const activityConfig: Record<string, { icon: ReactNode; color: string; category: string }> = {
  // Member actions
  role_changed: { 
    icon: <FaUserEdit className="h-4 w-4" />, 
    color: "text-blue-500 bg-blue-50",
    category: "Members"
  },
  member_removed: { 
    icon: <FaUserMinus className="h-4 w-4" />, 
    color: "text-red-500 bg-red-50",
    category: "Members"
  },
  member_joined: { 
    icon: <FaUserPlus className="h-4 w-4" />, 
    color: "text-green-500 bg-green-50",
    category: "Members"
  },
  member_invited: { 
    icon: <FaUserPlus className="h-4 w-4" />, 
    color: "text-purple-500 bg-purple-50",
    category: "Members"
  },
  // Room actions
  room_created: { 
    icon: <FaHome className="h-4 w-4" />, 
    color: "text-emerald-500 bg-emerald-50",
    category: "Room"
  },
  room_updated: { 
    icon: <FaCog className="h-4 w-4" />, 
    color: "text-gray-500 bg-gray-50",
    category: "Room"
  },
  room_settings_changed: { 
    icon: <FaCog className="h-4 w-4" />, 
    color: "text-gray-500 bg-gray-50",
    category: "Room"
  },
  // Node actions
  node_created: { 
    icon: <FaPlus className="h-4 w-4" />, 
    color: "text-green-500 bg-green-50",
    category: "Nodes"
  },
  node_updated: { 
    icon: <FaEdit className="h-4 w-4" />, 
    color: "text-blue-500 bg-blue-50",
    category: "Nodes"
  },
  node_deleted: { 
    icon: <FaTrash className="h-4 w-4" />, 
    color: "text-red-500 bg-red-50",
    category: "Nodes"
  },
  node_duplicated: { 
    icon: <FaPlus className="h-4 w-4" />, 
    color: "text-purple-500 bg-purple-50",
    category: "Nodes"
  },
  // Edge actions
  edge_created: { 
    icon: <FaLink className="h-4 w-4" />, 
    color: "text-indigo-500 bg-indigo-50",
    category: "Connections"
  },
  edge_deleted: { 
    icon: <FaUnlink className="h-4 w-4" />, 
    color: "text-orange-500 bg-orange-50",
    category: "Connections"
  },
  // Moderation
  content_flagged: { 
    icon: <FaFlag className="h-4 w-4" />, 
    color: "text-yellow-500 bg-yellow-50",
    category: "Moderation"
  },
  content_unflagged: { 
    icon: <FaCheck className="h-4 w-4" />, 
    color: "text-green-500 bg-green-50",
    category: "Moderation"
  },
  content_removed: { 
    icon: <FaBan className="h-4 w-4" />, 
    color: "text-red-500 bg-red-50",
    category: "Moderation"
  },
  // Export
  export_created: { 
    icon: <FaFileExport className="h-4 w-4" />, 
    color: "text-cyan-500 bg-cyan-50",
    category: "Exports"
  },
  export_downloaded: { 
    icon: <FaDownload className="h-4 w-4" />, 
    color: "text-cyan-500 bg-cyan-50",
    category: "Exports"
  },
};

function formatActivity(activity: Activity): string {
  const actor = activity.actorUsername || activity.actorEmail || "Someone";
  const user = activity.username || activity.userEmail || "a user";
  const nodeTitle = activity.details?.nodeTitle || activity.nodeTitle || "a node";

  switch (activity.type) {
    // Member actions
    case "role_changed":
      return `${actor} changed ${user}'s role from "${activity.details.from}" to "${activity.details.to}"`;
    case "member_removed":
      return `${actor} removed ${user} from the room`;
    case "member_joined":
      return `${user} joined the room`;
    case "member_invited":
      return `${actor} invited ${user} to the room`;
    
    // Room actions
    case "room_created":
      return `${actor} created this room`;
    case "room_updated":
      return `${actor} updated room settings`;
    case "room_settings_changed":
      return `${actor} changed room settings`;
    
    // Node actions
    case "node_created":
      return `${actor} created node "${nodeTitle}"`;
    case "node_updated":
      const changes = activity.details?.changes?.join(", ") || "content";
      return `${actor} updated "${nodeTitle}" (${changes})`;
    case "node_deleted":
      return `${actor} deleted node "${nodeTitle}"`;
    case "node_duplicated":
      return `${actor} duplicated node "${nodeTitle}"`;
    
    // Edge actions
    case "edge_created":
      return `${actor} connected two nodes`;
    case "edge_deleted":
      return `${actor} removed a connection`;
    
    // Moderation
    case "content_flagged":
      return `${actor} flagged content for review`;
    case "content_unflagged":
      return `${actor} dismissed flagged content`;
    case "content_removed":
      return `${actor} removed flagged content`;
    
    // Export
    case "export_created":
      return `${actor} created an export`;
    case "export_downloaded":
      return `Export was downloaded`;
    
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityConfig(type: string) {
  return activityConfig[type] || { 
    icon: <FaHistory className="h-4 w-4" />, 
    color: "text-gray-500 bg-gray-50",
    category: "Other"
  };
}

export function ActivityLog({ roomId, trigger }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      fetchActivities();
    }
  }, [open, roomId, filter, page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (filter !== "all") {
        params.set("type", filter);
      }
      
      const response = await fetch(`/api/rooms/${roomId}/activity?${params}`);

      if (response.status === 403) {
        throw new Error("Only room owners can view the activity log");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }

      const data = await response.json();
      setActivities(data.activities);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    { value: "all", label: "All Activities" },
    { value: "node_created", label: "Nodes Created" },
    { value: "node_updated", label: "Nodes Updated" },
    { value: "node_deleted", label: "Nodes Deleted" },
    { value: "edge_created", label: "Connections Created" },
    { value: "edge_deleted", label: "Connections Deleted" },
    { value: "member_joined", label: "Members Joined" },
    { value: "member_removed", label: "Members Removed" },
    { value: "role_changed", label: "Role Changes" },
    { value: "content_flagged", label: "Content Flagged" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FaHistory className="h-4 w-4" />
            Activity Log
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaHistory className="h-5 w-5" />
            Activity Log
          </DialogTitle>
          <DialogDescription>
            Track all changes and actions in this room. Only visible to room owners.
          </DialogDescription>
        </DialogHeader>

        {/* Filter */}
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter activities" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {pagination && (
            <span className="text-sm text-muted-foreground">
              {pagination.total} total events
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading activities...</div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FaHistory className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No activities recorded yet</p>
              <p className="text-xs mt-1">Actions will appear here as they happen</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {activities.map((activity) => {
                const config = getActivityConfig(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border border-muted/60 bg-background p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`mt-0.5 p-2 rounded-full ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {formatActivity(activity)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {config.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
