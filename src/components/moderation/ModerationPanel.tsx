"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, X, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { flagReasonLabels, FlaggedContent } from "@/lib/types/moderation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaCrown, FaEdit, FaEye, FaTrash } from "react-icons/fa";

type Props = {
  roomId: string;
  trigger?: React.ReactNode;
  onContentRemoved?: () => void;
  currentUserRole?: "owner" | "editor" | "viewer";
};

type FlaggedItem = FlaggedContent & {
  content: any;
  flaggedBy: { _id: string; username: string; email: string } | null;
  reviewedBy: { _id: string; username: string; email: string } | null;
};

type RoomRole = "owner" | "editor" | "viewer";

type Member = {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: RoomRole;
  joinedAt: Date;
};

const roleIcons = {
  owner: <FaCrown className="h-3 w-3 text-yellow-500" />,
  editor: <FaEdit className="h-3 w-3 text-blue-500" />,
  viewer: <FaEye className="h-3 w-3 text-gray-500" />,
};

const roleColors = {
  owner: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
  editor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
  viewer: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400",
};

export function ModerationPanel({ roomId, trigger, onContentRemoved, currentUserRole = "viewer" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [flaggedItems, setFlaggedItems] = React.useState<FlaggedItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<FlaggedItem | null>(null);
  const [action, setAction] = React.useState<"remove" | "dismiss" | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"moderation" | "collaborators">("moderation");
  
  // Collaborators state
  const [members, setMembers] = React.useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [membersError, setMembersError] = React.useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  
  const isOwner = currentUserRole === "owner";

  const loadFlaggedContent = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/moderation/flagged`);
      if (!res.ok) throw new Error("Failed to load flagged content");
      const data = await res.json();
      setFlaggedItems(data.flagged || []);
    } catch (e) {
      console.error("Failed to load flagged content:", e);
    }
  }, [roomId]);

  const fetchMembers = React.useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const response = await fetch(`/api/rooms/${roomId}/members`);

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await response.json();
      setMembers(data.members);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    if (open) {
      loadFlaggedContent();
      if (isOwner) {
        fetchMembers();
      }
    }
  }, [open, loadFlaggedContent, fetchMembers, isOwner]);

  async function handleRemove(item: FlaggedItem) {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/moderation/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: item._id,
          contentType: item.contentType,
          contentId: item.contentId,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to remove content");

      await loadFlaggedContent();
      setSelectedItem(null);
      setAction(null);
      setReviewNotes("");
      
      // Notify parent to refresh the editor
      if (onContentRemoved) {
        onContentRemoved();
      } else {
        // Fallback: dispatch custom event to refresh editor
        window.dispatchEvent(new CustomEvent("refreshEditor"));
      }
    } catch (e) {
      console.error("Failed to remove content:", e);
      alert("Failed to remove content. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(item: FlaggedItem) {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/moderation/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: item._id,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to dismiss flag");

      await loadFlaggedContent();
      setSelectedItem(null);
      setAction(null);
      setReviewNotes("");
    } catch (e) {
      console.error("Failed to dismiss flag:", e);
      alert("Failed to dismiss flag. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (memberId: string, newRole: RoomRole) => {
    try {
      setUpdatingMemberId(memberId);
      const response = await fetch(
        `/api/rooms/${roomId}/members/${memberId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      const data = await response.json();
      
      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role: data.member.role } : m
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this room?`)) {
      return;
    }

    try {
      setUpdatingMemberId(memberId);
      const response = await fetch(`/api/rooms/${roomId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleTransferOwnership = async (userId: string, username: string) => {
    if (!confirm(
      `Are you sure you want to transfer ownership to ${username}?\n\nYou will become an Editor and ${username} will become the Owner. This action cannot be undone.`
    )) {
      return;
    }

    try {
      setUpdatingMemberId(userId);
      const response = await fetch(`/api/rooms/${roomId}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to transfer ownership");
      }

      alert("Ownership transferred successfully! The page will reload.");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  function formatDate(date: Date | string | null | undefined) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "destructive",
      reviewed: "secondary",
      dismissed: "outline",
      removed: "default",
    };

    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status}
      </Badge>
    );
  }

  const pendingItems = flaggedItems.filter((item) => item.status === "pending");
  const reviewedItems = flaggedItems.filter((item) => item.status !== "pending");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Moderation
            {pendingItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingItems.length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isOwner ? "Moderation & Collaborators" : "Content Moderation"}
          </DialogTitle>
          <DialogDescription>
            {isOwner 
              ? "Review flagged content and manage room collaborators." 
              : "Review and manage flagged content in this story room."}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        {isOwner && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("moderation")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "moderation"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              Moderation
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                  {pendingItems.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("collaborators")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "collaborators"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Collaborators
              <Badge variant="outline" className="ml-1 px-1.5 py-0 text-xs">
                {members.length}
              </Badge>
            </button>
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === "moderation" && (
        <div className="space-y-4">
          {pendingItems.length === 0 && reviewedItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No flagged content</p>
              <p className="text-sm mt-2">All content is clean!</p>
            </div>
          )}

          {pendingItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Pending Review ({pendingItems.length})
              </h3>
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <div
                    key={item._id}
                    className="border rounded-lg p-4 space-y-3 bg-destructive/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {item.contentType}
                          </Badge>
                          <Badge variant="destructive">
                            {flagReasonLabels[item.reason]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Flagged by: {item.flaggedBy?.username || item.flaggedBy?.email || "Unknown"} on {formatDate(item.flaggedAt)}
                        </p>
                        {item.description && (
                          <p className="text-sm mt-2 italic">&ldquo;{item.description}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    {item.content && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Content:</p>
                        {item.contentType === "node" ? (
                          <div>
                            <p className="font-medium">{item.content.title || "Untitled Node"}</p>
                            {item.content.content?.text && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                {item.content.content.text}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">{item.content.content || "No content"}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setAction("remove");
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Content
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setAction("dismiss");
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss Flag
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewedItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Reviewed ({reviewedItems.length})</h3>
              <div className="space-y-2">
                {reviewedItems.map((item) => (
                  <div key={item._id} className="border rounded-lg p-3 space-y-2 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.contentType}
                        </Badge>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reviewed {formatDate(item.reviewedAt)}
                      </p>
                    </div>
                    {item.reviewNotes && (
                      <p className="text-xs text-muted-foreground italic">
                        Notes: {item.reviewNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Collaborators Tab */}
        {activeTab === "collaborators" && isOwner && (
          <div className="space-y-4">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading members...</div>
              </div>
            ) : membersError ? (
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {membersError}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-muted/60 bg-background p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {member.username}
                        </p>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            roleColors[member.role]
                          }`}
                        >
                          {roleIcons[member.role]}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined{" "}
                        {new Date(member.joinedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {member.role !== "owner" ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.id, value as RoomRole)
                          }
                          disabled={updatingMemberId === member.id}
                        >
                          <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <FaEdit className="h-3 w-3 text-blue-500" />
                                <span>Editor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <FaEye className="h-3 w-3 text-gray-500" />
                                <span>Viewer</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                          onClick={() =>
                            handleTransferOwnership(member.userId, member.username)
                          }
                          disabled={updatingMemberId === member.id}
                          title={`Transfer ownership to ${member.username}`}
                        >
                          <FaCrown className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleRemoveMember(member.id, member.username)
                          }
                          disabled={updatingMemberId === member.id}
                          aria-label={`Remove ${member.username}`}
                        >
                          <FaTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="ml-2">
                        Room Owner
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Confirmation Dialog */}
        {selectedItem && action && (
          <Dialog open={!!selectedItem} onOpenChange={() => {
            setSelectedItem(null);
            setAction(null);
            setReviewNotes("");
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {action === "remove" ? "Remove Content" : "Dismiss Flag"}
                </DialogTitle>
                <DialogDescription>
                  {action === "remove"
                    ? "This will permanently delete the flagged content. This action cannot be undone."
                    : "This will dismiss the flag and mark it as reviewed. The content will remain."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                  <Textarea
                    id="review-notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedItem(null);
                    setAction(null);
                    setReviewNotes("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant={action === "remove" ? "destructive" : "default"}
                  onClick={() => {
                    if (action === "remove") {
                      handleRemove(selectedItem);
                    } else {
                      handleDismiss(selectedItem);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? "Processing..." : action === "remove" ? "Remove Content" : "Dismiss Flag"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

