"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ModerationPanel } from "@/components/moderation/ModerationPanel";
import { Menu, Shield } from "lucide-react";
import { useState } from "react";

type EditorHeaderProps = {
  room: {
    id: string;
    title: string;
    subtitle?: string | null;
    role: "owner" | "editor" | "viewer";
  };
  canEdit: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
  onContentRemoved: () => void;
};

function RoleBadge({ role }: { role: "owner" | "editor" | "viewer" }) {
  const className =
    role === "owner"
      ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      : role === "editor"
      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : "border-gray-500 bg-gray-500/10 text-gray-600 dark:text-gray-400";
  return (
    <Badge variant="outline" className={`uppercase ${className}`}>
      {role === "owner" && "👑 "}
      {role === "editor" && "✏️ "}
      {role === "viewer" && "👁️ "}
      {role}
    </Badge>
  );
}

export function EditorHeader({
  room,
  canEdit,
  savingDraft,
  onSaveDraft,
  onContentRemoved,
}: EditorHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold leading-tight truncate lg:text-lg">
          {room.title}
        </h1>
        {room.subtitle ? (
          <p className="text-xs text-muted-foreground truncate lg:text-sm">
            {room.subtitle}
          </p>
        ) : null}
      </div>

      {/* Desktop actions */}
      <div className="hidden lg:flex items-center gap-3">
        <RoleBadge role={room.role} />
        {!canEdit && (
          <Badge variant="secondary" className="text-xs">
            Read-only
          </Badge>
        )}
        {room.role === "owner" && (
          <ModerationPanel
            roomId={room.id}
            onContentRemoved={onContentRemoved}
            currentUserRole={room.role}
          />
        )}
        <Button
          type="button"
          size="sm"
          className="uppercase"
          disabled={!canEdit || savingDraft}
          onClick={onSaveDraft}
        >
          {savingDraft ? "Saving..." : "Save draft"}
        </Button>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:w-[340px] p-0">
          <div className="p-6">
            <SheetHeader className="p-0">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
          </div>
          <div className="px-6 pb-6 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                  Your Role
                </label>
                <RoleBadge role={room.role} />
                {!canEdit && (
                  <Badge variant="secondary" className="text-xs">
                    Read-only
                  </Badge>
                )}
              </div>
            </div>
            {room.role === "owner" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
                  Moderation
                </label>
                <ModerationPanel
                  roomId={room.id}
                  onContentRemoved={onContentRemoved}
                  currentUserRole={room.role}
                  trigger={
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      Open Moderation Panel
                    </button>
                  }
                />
              </div>
            )}
            <div className="pt-4 border-t border-border">
              <Button
                type="button"
                className="w-full uppercase"
                disabled={!canEdit || savingDraft}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSaveDraft();
                }}
              >
                {savingDraft ? "Saving..." : "Save Draft & Exit"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
