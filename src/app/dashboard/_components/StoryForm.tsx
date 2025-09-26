// app/(dashboard)/_components/NewStoryDialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type FormState = {
  title: string;
  subtitle: string;
  visibility: "private" | "unlisted" | "public";
};

type Mode = "create" | "edit";

function StoryForm({
  className,
  close,
  mode,
  roomId,
  initial,
  afterSave,
}: React.ComponentProps<"form"> & {
  close: () => void;
  mode: Mode;
  roomId?: string; // required for edit
  initial?: Partial<FormState>;
  afterSave?: (data?: unknown) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [state, setState] = React.useState<FormState>({
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    visibility: initial?.visibility ?? "private",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json(); // { slug?, roomId?, ... }
        close();
        router.refresh();
        afterSave?.(data);
      } else {
        if (!roomId) throw new Error("Missing roomId for edit");
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // PATCH only allows title/subtitle (visibility unchanged here)
          body: JSON.stringify({ title: state.title, subtitle: state.subtitle }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Update failed (HTTP ${res.status})`);
        close();
        router.refresh();
        afterSave?.(data);
      }
    } catch (err) {
      console.error(err); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={cn("grid items-start gap-6", className)} onSubmit={onSubmit}>
      <div className="grid gap-3">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          placeholder="My awesome story"
          required
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="subtitle">Subtitle (optional)</Label>
        <Input
          id="subtitle"
          value={state.subtitle}
          onChange={(e) => setState((s) => ({ ...s, subtitle: e.target.value }))}
          placeholder="A quick tagline…"
        />
      </div>

      {mode === "create" ? (
        <div className="grid gap-3">
          <Label>Visibility</Label>
          <Select
            value={state.visibility}
            onValueChange={(v: FormState["visibility"]) =>
              setState((s) => ({ ...s, visibility: v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="unlisted">Unlisted</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Visibility not editable here. (Title/subtitle only)
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create Story" : "Save Changes"}
      </Button>
    </form>
  );
}


export function NewStoryDialog() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const close = () => setOpen(false);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>+ Create New Story</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create a new story</DialogTitle>
            <DialogDescription>
              Set the title, subtitle, and visibility. You can change these later.
            </DialogDescription>
          </DialogHeader>
          <StoryForm close={close} mode="create" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button>New Story</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create a new story</DrawerTitle>
          <DrawerDescription>Set the basic details to get started.</DrawerDescription>
        </DrawerHeader>
        <StoryForm className="px-4" close={close} mode="create" />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** EDIT wrapper (reuses the same form & responsive shell) */
export function EditStoryDialog({
  roomId,
  initialTitle,
  initialSubtitle,
  trigger = <Button variant="outline">Edit</Button>,
}: {
  roomId: string;
  initialTitle?: string;
  initialSubtitle?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const close = () => setOpen(false);

  const initial: Partial<FormState> = {
    title: initialTitle ?? "",
    subtitle: initialSubtitle ?? "",
    // visibility stays whatever it currently is in DB; not editable here
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit story details</DialogTitle>
            <DialogDescription>Update the title and subtitle.</DialogDescription>
          </DialogHeader>
          <StoryForm close={close} mode="edit" roomId={roomId} initial={initial} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit story</DrawerTitle>
          <DrawerDescription>Change the title and subtitle.</DrawerDescription>
        </DrawerHeader>
        <StoryForm className="px-4" close={close} mode="edit" roomId={roomId} initial={initial} />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}