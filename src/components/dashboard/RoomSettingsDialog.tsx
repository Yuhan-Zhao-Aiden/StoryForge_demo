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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  roomId: string;
  trigger?: React.ReactNode;
};

// Keep lowercase for backend, but display capitalized
type Visibility = "public" | "private";

export function RoomSettingsDialog({ roomId, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [visibility, setVisibility] = React.useState<Visibility>("public");
  const [initialVisibility, setInitialVisibility] = React.useState<Visibility>("public");
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Load current settings when dialog opens
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setSaved(false);
      try {
        const res = await fetch(`/api/rooms/${roomId}/settings`, { method: "GET" });
        if (!res.ok) throw new Error("Failed to load room settings");
        const data = await res.json();
        if (!cancelled) {
          const v = (data.visibility as Visibility) ?? "public";
          setVisibility(v);
          setInitialVisibility(v);
          setInviteCode(data.inviteCode ?? null); // include invite code if backend returns it
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Unable to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, roomId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/rooms/${roomId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setInitialVisibility(visibility);
      setSaved(true);
    } catch (e: any) {
      setError(e.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invites/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate invite");
      const data = await res.json();
      setInviteCode(data.code);
    } catch (e: any) {
      setError(e.message || "Unable to regenerate invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/invites`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disable invite");
      setInviteCode(null);
    } catch (e: any) {
      setError(e.message || "Unable to disable invite");
    } finally {
      setLoading(false);
    }
  }

  function capitalize(v: Visibility) {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  function Body() {
    return (
      <div className="grid items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Configure room visibility and manage invite codes.
        </p>

        {/* Visibility */}
        <div className="grid gap-3">
          <Label htmlFor="visibility-select">Visibility</Label>
          <Select
            value={visibility}
            onValueChange={(val) => setVisibility(val as Visibility)}
            disabled={loading || saving}
          >
            <SelectTrigger id="visibility-select" className="w-full">
              <SelectValue placeholder={loading ? "Loading…" : "Select visibility"}>
                {capitalize(visibility)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Current: <span className="font-medium">{capitalize(initialVisibility)}</span>
          </p>
        </div>

        {/* Invite code management */}
        <div className="grid gap-3">
          <Label>Invite Code</Label>
          <div className="flex gap-2">
            <Input readOnly value={inviteCode ?? ""} placeholder="No code available" />
            <Button
              variant="secondary"
              type="button"
              onClick={() => inviteCode && navigator.clipboard.writeText(inviteCode)}
              disabled={!inviteCode}
            >
              Copy
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="button" onClick={handleRegenerate} disabled={loading}>
              {loading ? "Working…" : "Regenerate Code"}
            </Button>
            <Button type="button" variant="outline" onClick={handleDisable} disabled={loading}>
              Disable Code
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-600">Settings saved.</p>}

        <div className="flex gap-2 mt-4">
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save Settings"}
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
          {trigger ?? <Button variant="outline">Room Settings</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
            <DialogDescription>Manage visibility and invite codes for this room.</DialogDescription>
          </DialogHeader>
          <Body />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Room Settings</DrawerTitle>
          <DrawerDescription>Manage visibility and invite codes for this room.</DrawerDescription>
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
