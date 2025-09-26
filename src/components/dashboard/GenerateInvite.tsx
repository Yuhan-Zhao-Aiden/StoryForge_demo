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

type Props = {
  roomId: string; // Mongo ObjectId string of the room the user owns
  trigger?: React.ReactNode; // optional custom trigger (defaults to a Button)
};

export function GenerateInvite({ roomId, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCode(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "viewer",     // or "editor"
          maxUses: null,      // or a number
          expiresAt: null,    // or new Date().toISOString()
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCode(data.code as string);
    } catch (e: any) {
      setError("Failed to generate invite. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function Body() {
    return (
      <div className="grid items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Generate a shareable invite code. Share this code with collaborators so they can join.
        </p>

        <div className="grid gap-3">
          <Label>Invite Code</Label>
          <div className="flex gap-2">
            <Input readOnly value={code ?? ""} placeholder="Click Generate to get a code" />
            <Button variant="secondary" type="button" onClick={() => code && navigator.clipboard.writeText(code)} disabled={!code}>
              Copy
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
