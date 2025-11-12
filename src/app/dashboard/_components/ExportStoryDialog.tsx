"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function ExportStoryDialog({
  roomId,
  trigger,
}: {
  roomId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("full");
  const [format, setFormat] = useState("json");
  const [branch, setBranch] = useState("");

  const handleExport = async () => {
    try {
      const query = new URLSearchParams({
        format,
        type: scope,
        ...(scope === "branch" && branch ? { id: branch } : {}),
      }).toString();

      const res = await fetch(`/api/export?${query}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `story-${roomId}.${format}`;
      link.click();
      setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Scope</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="full"
                    checked={scope === "full"}
                    onChange={() => setScope("full")}
                  />
                  Entire Story
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="branch"
                    checked={scope === "branch"}
                    onChange={() => setScope("branch")}
                  />
                  Specific Branch
                </label>
              </div>
            </div>

            {scope === "branch" && (
              <div>
                <Label>Select Branch</Label>
                <Select onValueChange={setBranch}>
                  <option value="">-- Choose Branch --</option>
                  <option value="branch1">Branch 1</option>
                  <option value="branch2">Branch 2</option>
                  {/* later this will come from story graph data */}
                </Select>
              </div>
            )}

            <div>
              <Label>Format</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === "json"}
                    onChange={() => setFormat("json")}
                  />
                  JSON
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="html"
                    checked={format === "html"}
                    onChange={() => setFormat("html")}
                  />
                  HTML
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleExport} disabled={scope === "branch" && !branch}>
              Download
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
