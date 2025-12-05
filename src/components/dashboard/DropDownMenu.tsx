"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch } from "lucide-react";

import { GenerateInvite } from "./GenerateInvite";
import { EditStoryDialog } from "@/app/dashboard/_components/StoryForm";
import { ViewCollaboratorsDialog } from "./ViewCollaboratorsDialog"; 
import { ManageCollaborators } from "./ManageCollaborators";
import { ActivityLog } from "./ActivityLog";
import { ExportDialog } from "./ExportDialog";
import { useDeleteRoom } from "@/hooks/useDeleteRoom";
import { useLeaveRoom } from "@/hooks/useLeaveRoom"; 
import { ForkDialog } from "./ForkDialog";
import { BranchesDialog } from "./BranchesDialog";
import { RoomSettingsDialog } from "./RoomSettingsDialog"; 

type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  collaborators: number;
  role?: "owner" | "editor" | "viewer";
};

type StoryMenuProps = {
  room: Story;
  invitable?: boolean;
};

// Create a wrapper component to handle client-side only rendering
function ForkMenuItems({ roomId }: { roomId: string }) {
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [showBranchesDialog, setShowBranchesDialog] = useState(false);
  
  return (
    <>
      <DropdownMenuItem 
        onClick={() => setShowForkDialog(true)}
        onSelect={(e) => e.preventDefault()}
      >
        <GitBranch className="mr-2 h-4 w-4" />
        Fork Story
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => setShowBranchesDialog(true)}
        onSelect={(e) => e.preventDefault()}
      >
        <GitBranch className="mr-2 h-4 w-4" />
        View Branches
      </DropdownMenuItem>
      
      {/* These dialogs will be imported dynamically on client-side */}
      {showForkDialog && (
        <ForkDialog
          open={showForkDialog}
          onOpenChange={setShowForkDialog}
          roomId={roomId}
        />
      )}
      
      {showBranchesDialog && (
        <BranchesDialog
          open={showBranchesDialog}
          onOpenChange={setShowBranchesDialog}
          roomId={roomId}
        />
      )}
    </>
  );
}

export function StoryMenu({ room, invitable = true }: StoryMenuProps) {
  const { handleDeleteStory, loading: deleteLoading } = useDeleteRoom();
  const { handleLeaveRoom, loading: leaveLoading } = useLeaveRoom();
  
  const [mounted, setMounted] = useState(false);
  const [ForkDialog, setForkDialog] = useState<any>(null);
  const [BranchesDialog, setBranchesDialog] = useState<any>(null);

  const isOwner = !room.role || room.role === "owner";
  const canFork = room.role === "owner" || room.role === "editor";

  // Dynamically import dialogs only on client-side
  useEffect(() => {
    setMounted(true);
    import("./ForkDialog").then((mod) => setForkDialog(() => mod.ForkDialog));
    import("./BranchesDialog").then((mod) => setBranchesDialog(() => mod.BranchesDialog));
  }, []);

  // Don't render dropdown until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="inline-flex h-8 w-8 items-center justify-center">•••</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
          •••
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px]" align="end">
        <DropdownMenuLabel>{isOwner ? "My Story" : "Story Actions"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isOwner && (
          <>
            <RoomSettingsDialog
              roomId={room._id}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Room Settings
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
          </>
        )}

        {invitable && isOwner && (
          <GenerateInvite
            roomId={room._id}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Generate Invite
              </DropdownMenuItem>
            }
          />
        )}

        <ViewCollaboratorsDialog
          roomId={room._id}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              View Collaborators
            </DropdownMenuItem>
          }
        />

        {/* Activity Log - Only for room owners */}
        {isOwner && (
          <ActivityLog
            roomId={room._id}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                📋 Activity Log
              </DropdownMenuItem>
            }
          />
        )}

        {isOwner && (
          <>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <ManageCollaborators 
                roomId={room._id} 
                currentUserRole={room.role || "owner"} 
              />
            </DropdownMenuItem>
            <EditStoryDialog
              roomId={room._id}
              initialTitle={room.title}
              initialSubtitle={room.subtitle}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Rename
                </DropdownMenuItem>
              }
            />
          </>
        )}

        {room.role === "editor" && (
          <EditStoryDialog
            roomId={room._id}
            initialTitle={room.title}
            initialSubtitle={room.subtitle}
            trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit Details</DropdownMenuItem>}
          />
        )}
        
        <ExportDialog
          roomId={room._id}
          trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Export</DropdownMenuItem>}
        />

        {/* Add fork options */}
        {canFork && (
          <>
            <DropdownMenuSeparator />
            <ForkMenuItems roomId={room._id} />
          </>
        )}

        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => handleDeleteStory(room._id)}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete Room"}
            </DropdownMenuItem>
          </>
        )}

        {!isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => handleLeaveRoom(room._id)}
              disabled={leaveLoading}
            >
              {leaveLoading ? "Leaving..." : "Leave Room"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}