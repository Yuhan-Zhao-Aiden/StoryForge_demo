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
import { EditStoryDialog } from "@/app/dashboard/_components/StoryForm";
import { useDeleteRoom } from "@/hooks/useDeleteRoom";
type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  lastEdited: string;
  collaborators: number;
};
    
export function StoryMenu({ room }: { room: Story })  {
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
          roomId={room._id}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Generate Invite
            </DropdownMenuItem>
          }  
        />
        <EditStoryDialog
          roomId={room._id}
          initialTitle={room.title}
          initialSubtitle={room.subtitle}
          trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Rename</DropdownMenuItem>}
        />
        <DropdownMenuItem>Export</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="bg-red-500 focus:bg-red-700"
          onClick={() => handleDeleteStory(room._id)}
          disabled={loading}
        >
          {loading ? "Deleting..." : "Delete Room"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}