"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Collaborator = {
  username: string;
  role: "owner" | "editor" | "viewer";
  userId?: string;
};

type ViewCollaboratorsDialogProps = {
  roomId: string;
  trigger: React.ReactNode;
};

export function ViewCollaboratorsDialog({ roomId, trigger }: ViewCollaboratorsDialogProps) {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [currentUserRole, setCurrentUserRole] = useState<"owner" | "editor" | "viewer">();

  // Fetch collaborators when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchCollaborators = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/collaborators`);
        if (!res.ok) throw new Error("Failed to fetch collaborators");
        const data = await res.json();
        setCollaborators(data.collaborators || []);
        setCurrentUserId(data.currentUserId);
        setCurrentUserRole(data.currentUserRole);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborators();
  }, [open, roomId]);

  // Handle removing a collaborator (owner only)
  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this collaborator?")) return;

    try {
      const res = await fetch(
        `/api/rooms/${roomId}/collaborators/${userId}/revoke`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to remove collaborator");

      // Update collaborators list
      setCollaborators(prev => prev.filter(c => String(c.userId) !== String(userId)));

      alert("Collaborator removed successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to remove collaborator.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collaborators</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading...</p>
        ) : collaborators.length === 0 ? (
          <p>No collaborators found.</p>
        ) : (
          <ul className="divide-y">
            {collaborators.map((c, i) => (
              <li key={i} className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">
                    {c.username}
                    {String(c.userId) === String(currentUserId) && (
                      <span className="text-gray-500 ml-1">(You)</span>
                    )}
                  </span>
                  <span className="text-sm text-gray-500 capitalize ml-2">
                    ({c.role})
                  </span>
                </div>

                {currentUserRole === "owner" &&
                  c.role !== "owner" &&
                  String(c.userId) !== String(currentUserId) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(c.userId!)}
                    >
                      Remove
                    </Button>
                  )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
