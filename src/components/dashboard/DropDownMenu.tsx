"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GenerateInvite } from "./GenerateInvite";
import { EditStoryDialog } from "@/app/dashboard/_components/StoryForm";
import { ViewCollaboratorsDialog } from "./ViewCollaboratorsDialog"; 
import { useDeleteRoom } from "@/hooks/useDeleteRoom";
import { useLeaveRoom } from "@/hooks/useLeaveRoom"; 

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

export function StoryMenu({ room, invitable = true }: StoryMenuProps) {
  const { handleDeleteStory, loading: deleteLoading } = useDeleteRoom();
  const { handleLeaveRoom, loading: leaveLoading } = useLeaveRoom();


  const isOwner = room.role === "owner";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>•••</DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px]">
        <DropdownMenuLabel>My Story</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Generate Invite only when allowed */}
        {invitable && (
          <GenerateInvite
            roomId={room._id}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Generate Invite
              </DropdownMenuItem>
            }
          />
        )}

        {/* View Collaborators available for all */}
        <ViewCollaboratorsDialog
          roomId={room._id}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              View Collaborators
            </DropdownMenuItem>
          }
        />

        {/* Owner-specific options */}
        {isOwner && (
          <>
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
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="bg-red-500 focus:bg-red-700"
              onClick={() => handleDeleteStory(room._id)}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete Room"}
            </DropdownMenuItem>
          </>
        )}

        {/* Collaborator-specific option */}
        {!isOwner && (
          <DropdownMenuItem
            className="bg-red-500 focus:bg-red-700"
            onClick={() => handleLeaveRoom(room._id)}
            disabled={leaveLoading}
          >
            {leaveLoading ? "Leaving..." : "Leave Room"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
