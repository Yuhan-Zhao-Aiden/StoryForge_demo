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
import { Shield, Trash2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { flagReasonLabels, FlaggedContent } from "@/lib/types/moderation";

type Props = {
  roomId: string;
  trigger?: React.ReactNode;
  onContentRemoved?: () => void;
};

type FlaggedItem = FlaggedContent & {
  content: any;
  flaggedBy: { _id: string; username: string; email: string } | null;
  reviewedBy: { _id: string; username: string; email: string } | null;
};

export function ModerationPanel({ roomId, trigger, onContentRemoved }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [flaggedItems, setFlaggedItems] = React.useState<FlaggedItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<FlaggedItem | null>(null);
  const [action, setAction] = React.useState<"remove" | "dismiss" | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState("");

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

  React.useEffect(() => {
    if (open) {
      loadFlaggedContent();
    }
  }, [open, loadFlaggedContent]);

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
            Content Moderation
          </DialogTitle>
          <DialogDescription>
            Review and manage flagged content in this story room.
          </DialogDescription>
        </DialogHeader>

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

