"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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
import { FaUsers, FaTrash, FaCrown, FaEdit, FaEye } from "react-icons/fa";

type RoomRole = "owner" | "editor" | "viewer";

type Member = {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: RoomRole;
  joinedAt: Date;
};

type ManageCollaboratorsProps = {
  roomId: string;
  currentUserRole: RoomRole;
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

export function ManageCollaborators({
  roomId,
  currentUserRole,
}: ManageCollaboratorsProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isOwner = currentUserRole === "owner";

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, roomId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rooms/${roomId}/members`);

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await response.json();
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FaUsers className="h-4 w-4" />
          Manage Collaborators
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room Collaborators</DialogTitle>
          <DialogDescription>
            Manage who has access to this room and their permissions.
            {!isOwner && " (View only - Owner permissions required to manage)"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading members...</div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {error}
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

                {isOwner && member.role !== "owner" ? (
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
                ) : member.role === "owner" ? (
                  <Badge variant="outline" className="ml-2">
                    Room Owner
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
