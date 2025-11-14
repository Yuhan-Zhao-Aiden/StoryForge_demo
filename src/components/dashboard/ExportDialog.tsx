"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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
import { ExportLink } from "@/lib/types/exports";
import { ExportLinkManager } from "./ExportLinkManager";

type Props = {
  roomId: string;
  trigger?: React.ReactNode;
};

export function ExportDialog({ roomId, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [exportLinks, setExportLinks] = React.useState<ExportLink[]>([]);
  const [showCreateForm, setShowCreateForm] = React.useState(true);

  // Form state
  const [name, setName] = React.useState("");
  const [format, setFormat] = React.useState<"json" | "markdown" | "html">("json");
  const [includeImages, setIncludeImages] = React.useState(true);
  const [includeMetadata, setIncludeMetadata] = React.useState(true);
  const [includeComments, setIncludeComments] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [maxDownloads, setMaxDownloads] = React.useState("");

  // Load existing exports
  const loadExports = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/exports`);
      if (!res.ok) throw new Error("Failed to load exports");
      const data = await res.json();
      setExportLinks(data.exports || []);
    } catch (e) {
      console.error("Failed to load exports:", e);
    }
  }, [roomId]);

  React.useEffect(() => {
    if (open) {
      loadExports();
    }
  }, [open, loadExports]);

  const handleCreateExport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        name: name || undefined,
        options: {
          format,
          includeImages,
          includeMetadata,
          includeComments,
        },
      };

      if (password) {
        payload.password = password;
      }

      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (!isNaN(expiryDate.getTime())) {
          payload.expiresAt = expiryDate.toISOString();
        }
      }

      if (maxDownloads) {
        const max = parseInt(maxDownloads, 10);
        if (!isNaN(max) && max > 0) {
          payload.maxDownloads = max;
        }
      }

      const res = await fetch(`/api/rooms/${roomId}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to create export" }));
        throw new Error(errorData.error || "Failed to create export");
      }

      const data = await res.json();
      setSuccess("Export link created successfully!");
      
      // Reset form
      setName("");
      setPassword("");
      setExpiresAt("");
      setMaxDownloads("");
      setShowCreateForm(false);
      
      // Reload exports
      await loadExports();
    } catch (e: any) {
      setError(e.message || "Failed to create export. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, format, includeImages, includeMetadata, includeComments, password, expiresAt, maxDownloads, roomId, loadExports]);

  const handleDeleteExport = React.useCallback(async (exportId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/exports/${exportId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete export");

      await loadExports();
    } catch (e) {
      setError("Failed to delete export. Please try again.");
    }
  }, [roomId, loadExports]);

  const createFormContent = React.useMemo(() => (
    <div className="grid items-start gap-4">
      <div className="grid gap-3">
        <Label htmlFor="export-name">Export Name (Optional)</Label>
        <Input
          id="export-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Story Export"
          maxLength={100}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="export-format">Format</Label>
        <Select value={format} onValueChange={(value: any) => setFormat(value)}>
          <SelectTrigger id="export-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        <Label>Options</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Include Images</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Include Metadata</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeComments}
              onChange={(e) => setIncludeComments(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Include Comments</span>
          </label>
        </div>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="export-password">Password Protection (Optional)</Label>
        <Input
          id="export-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave empty for no password"
          minLength={4}
          maxLength={50}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="export-expires">Expires At (Optional)</Label>
        <Input
          id="export-expires"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="export-max-downloads">Max Downloads (Optional)</Label>
        <Input
          id="export-max-downloads"
          type="number"
          value={maxDownloads}
          onChange={(e) => setMaxDownloads(e.target.value)}
          placeholder="Leave empty for unlimited"
          min="1"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex gap-2 flex-wrap">
        <Button type="button" onClick={handleCreateExport} disabled={loading}>
          {loading ? "Creating…" : "Create Export Link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowCreateForm(false);
            setError(null);
            setSuccess(null);
          }}
        >
          View Existing Links
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        💡 After creating a link, you&apos;ll see download buttons for JSON, Markdown, and HTML formats.
      </p>
    </div>
  ), [name, format, includeImages, includeMetadata, includeComments, password, expiresAt, maxDownloads, error, success, loading, handleCreateExport]);

  const bodyContent = React.useMemo(() => {
    if (showCreateForm) {
      return createFormContent;
    }

    return (
      <div className="grid items-start gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Export Links</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCreateForm(true);
              setError(null);
              setSuccess(null);
            }}
          >
            Create New
          </Button>
        </div>

        <ExportLinkManager
          exportLinks={exportLinks}
          onDelete={handleDeleteExport}
          onRefresh={loadExports}
        />
      </div>
    );
  }, [showCreateForm, createFormContent, exportLinks, handleDeleteExport, loadExports]);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline">Export Story</Button>}
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Prevent dialog from closing when interacting with portaled content (like Select dropdowns)
            const target = e.target as HTMLElement;
            if (target.closest('[data-radix-popper-content-wrapper]') || 
                target.closest('[role="listbox"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Export Story</DialogTitle>
            <DialogDescription>
              Create shareable links to export your story in various formats.
            </DialogDescription>
          </DialogHeader>
          {bodyContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger ?? <Button variant="outline">Export Story</Button>}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Export Story</DrawerTitle>
          <DrawerDescription>
            Create shareable links to export your story in various formats.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          {bodyContent}
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

