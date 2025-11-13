"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaEdit, FaEye } from "react-icons/fa";

type Props = {
  roomId: string; // Mongo ObjectId string of the room the user owns
  trigger?: React.ReactNode; // optional custom trigger (defaults to a Button)
};

type Role = "editor" | "viewer";

export function GenerateInvite({ roomId, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<Role>("viewer");

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCode(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          maxUses: null,      // or a number
          expiresAt: null,    // or new Date().toISOString()
        }),
      });
      if (!res.ok) {
        let errorMessage = "Failed to generate invite";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          try {
            errorMessage = await res.text() || errorMessage;
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setCode(data.code as string);
    } catch (e: any) {
      setError(e.message || "Failed to generate invite. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function Body() {
    return (
      <div className="grid items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Generate a shareable invite code. Share this code with collaborators so they can join with the selected access level.
        </p>

        <div className="grid gap-3">
          <Label htmlFor="role-select">Access Level</Label>
          <p className="text-xs text-muted-foreground">
            Select the role for new collaborators: <strong>Editor</strong> can create and edit content, <strong>Viewer</strong> has read-only access.
          </p>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
            <SelectTrigger id="role-select" className="w-full">
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
        </div>

        <div className="grid gap-3">
          <Label>Invite Code</Label>
          <div className="flex gap-2">
            <Input readOnly value={code ?? ""} placeholder="Click Generate to get a code" />
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => {
                if (code) {
                  navigator.clipboard.writeText(code);
                  // Optional: show a toast notification
                }
              }} 
              disabled={!code}
            >
              Copy
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {code && (
            <p className="text-xs text-muted-foreground">
              Share this code with collaborators. They will join as <span className="font-medium capitalize">{selectedRole}s</span>.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate Invite"}
          </Button>
          <Button type="button" variant="outline" onClick={() => {
            setOpen(false);
            setCode(null);
            setError(null);
          }}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline">Generate Invite</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Generate Invite</DialogTitle>
            <DialogDescription>Creates a new one-time display code for this room.</DialogDescription>
          </DialogHeader>
          <Body />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {/* {trigger ?? <Button variant="outline">Generate Invite</Button>} */}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Generate Invite</DrawerTitle>
          <DrawerDescription>Creates a new one-time display code for this room.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <Body />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
