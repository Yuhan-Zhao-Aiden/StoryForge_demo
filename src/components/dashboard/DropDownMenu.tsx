"use client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { GenerateInvite } from "./GenerateInvite";
import { useDeleteRoom } from "@/hooks/useDeleteRoom";

export function StoryMenu({ roomId }: { roomId: string })  {
  const { handleDeleteStory, loading, error } = useDeleteRoom();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        •••
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200]">
        <DropdownMenuLabel>My Story</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <GenerateInvite 
          roomId={roomId}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Generate Invite
            </DropdownMenuItem>
          }  
        />
        <DropdownMenuItem>Status</DropdownMenuItem>
        <DropdownMenuItem>Export</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="bg-red-500 focus:bg-red-700"
          onClick={() => handleDeleteStory(roomId)}
          disabled={loading}
        >
          {loading ? "Deleting..." : "Delete Room"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}