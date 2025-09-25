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

function StoryForm({
  className,
  close,
}: React.ComponentProps<"form"> & { close: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState<FormState>({
    title: "",
    subtitle: "",
    visibility: "private",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error(await res.text());
      const { slug } = await res.json();
      close();
      // Refresh dashboard list or navigate to the room
      router.refresh();
      // router.push(`/rooms/${slug}`);
    } catch (err) {
      console.error(err);
      // You could show a toast here
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

      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create Story"}
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
          <StoryForm close={close} />
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
        <StoryForm className="px-4" close={close} />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
