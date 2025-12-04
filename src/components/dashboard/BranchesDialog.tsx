"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitBranch, User, Calendar, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Branch {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: {
    username: string;
    email: string;
  } | null;
  roomTitle: string;
  isOwner: boolean;
}

interface BranchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export function BranchesDialog({ open, onOpenChange, roomId }: BranchesDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchBranches();
    }
  }, [open, roomId]);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}/branches`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch branches");
      }

      setBranches(data.branches || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) {
      return;
    }

    setDeletingId(branchId);

    try {
      const response = await fetch(`/api/rooms/${roomId}/branches?branchId=${branchId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete branch");
      }

      // Remove the branch from the list
      setBranches(branches.filter(branch => branch.id !== branchId));
    } catch (err: any) {
      alert(err.message || "Failed to delete branch");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Story Branches</DialogTitle>
          <DialogDescription>
            All alternate versions and forks of this story.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchBranches}
            >
              Try Again
            </Button>
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No branches yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first branch to explore alternate story paths.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">{branch.name}</h4>
                      {branch.isOwner && (
                        <Badge variant="outline" className="text-xs">
                          Your Branch
                        </Badge>
                      )}
                    </div>
                    
                    {branch.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {branch.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{branch.createdBy?.username || "Unknown user"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(branch.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8"
                    >
                      <Link href={`/rooms/${branch.roomId}/editor`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Link>
                    </Button>
                    
                    {branch.isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBranch(branch.id)}
                        disabled={deletingId === branch.id}
                      >
                        {deletingId === branch.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}