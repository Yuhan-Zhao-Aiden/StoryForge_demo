"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  trigger?: React.ReactNode; // optional custom trigger
  onSuccessNavigateToRoom?: boolean; // default true
};

export function RedeemInvite({ trigger, onSuccessNavigateToRoom = true }: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = String(formData.get("code") || "").trim();
    if (!code) return;

    try {
      const res = await fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to redeem invite");
      }
      setOpen(false);
      // Refresh dashboard or navigate to the room
      if (onSuccessNavigateToRoom && data?.roomId) {
        // If you have a slug, you can return it from the API instead and push(`/rooms/${slug}`)
        router.push(`/rooms/${data.roomId}`); // adjust to your actual route pattern
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message || "Failed to redeem invite");
    } finally {
      setLoading(false);
    }
  }

  function Body() {
    return (
      <form className="grid items-start gap-6" onSubmit={onSubmit}>
        <div className="grid gap-3">
          <Label htmlFor="invite-code">Invite Code</Label>
          <Input
            id="invite-code"
            name="code"
            placeholder="Enter invite code"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Joining…" : "Join Room"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? <Button>Join by Code</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join a Room</DialogTitle>
            <DialogDescription>Enter an invite code to join a room.</DialogDescription>
          </DialogHeader>
          <Body />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger ?? <Button>Join by Code</Button>}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Join a Room</DrawerTitle>
          <DrawerDescription>Enter an invite code to join a room.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <Body />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
