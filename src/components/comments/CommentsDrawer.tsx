"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageSquare } from "lucide-react";
import CommentsSection from "./CommentsSection";

type CommentsDrawerProps = {
  room: { id: string; title: string };
  node: {
    id: string;
    data: {
      title?: string;
      content?: { text?: string };
    };
    type?: string;
  };
  userRole: "owner" | "editor" | "viewer";
  currentUserId: string;
};

export default function CommentsDrawer({
  room,
  node,
  userRole,
  currentUserId,
}: CommentsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <MessageSquare className="w-4 h-4" />
          <span>Comments</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[480px] p-0 bg-background overflow-y-auto"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <div className="p-4">
          <CommentsSection
            room={room}
            node={node}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
