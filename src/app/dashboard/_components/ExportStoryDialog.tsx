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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function ExportStoryDialog({
  roomId,
  trigger,
}: {
  roomId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [scope, setScope] = useState("full");
  const [format, setFormat] = useState("json");
  const [branch, setBranch] = useState("");

  // Export options
  const [fontSize, setFontSize] = useState("16"); // store as number/string without px
  const [colorScheme, setColorScheme] = useState("light");
  const [watermark, setWatermark] = useState("");
  const [includeTOC, setIncludeTOC] = useState(true);

  const fetchExport = async (): Promise<string> => {
    // Add px if only number when sending to backend
    const fontSizeValue = /^\d+$/.test(fontSize) ? `${fontSize}px` : fontSize;

    const query = new URLSearchParams({
      format,
      type: scope,
      fontSize: fontSizeValue,
      colorScheme,
      watermark,
      toc: includeTOC.toString(),
      ...(scope === "branch" && branch ? { id: branch } : {}),
    }).toString();

    const res = await fetch(`/api/export/story/${roomId}?${query}`);
    if (!res.ok) throw new Error("Failed to fetch export");
    return await res.text();
  };

  const handleExport = async () => {
    try {
      const data = await fetchExport();
      const blob = new Blob([data], {
        type: format === "html" ? "text/html" : "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `story-${roomId}.${format === "html" ? "html" : "json"}`;
      link.click();
      setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    }
  };

  const handlePreview = async () => {
    try {
      const data = await fetchExport();
      setPreviewContent(data);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Preview failed:", err);
      alert("Preview failed. Check console for details.");
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
            {/* Scope */}
            <div>
              <Label className="text-sm font-medium">Scope</Label>
              <RadioGroup value={scope} onValueChange={setScope} className="mt-2 flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full">Entire Story</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="branch" id="branch" />
                  <Label htmlFor="branch">Specific Branch</Label>
                </div>
              </RadioGroup>
            </div>

            {scope === "branch" && (
              <div>
                <Label className="text-sm font-medium">Select Branch</Label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="mt-2 w-full rounded-md border p-2 text-sm
                             bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                >
                  <option value="">-- Choose Branch --</option>
                  <option value="branch1">Branch 1</option>
                  <option value="branch2">Branch 2</option>
                </select>
              </div>
            )}

            {/* Format */}
            <div>
              <Label className="text-sm font-medium">Format</Label>
              <RadioGroup value={format} onValueChange={setFormat} className="mt-2 flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json">JSON</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="html" id="html" />
                  <Label htmlFor="html">HTML</Label>
                </div>
              </RadioGroup>
            </div>

            {/* HTML Export Options */}
            {format === "html" && (
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Font Size</Label>
                  <input
                    type="text"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="mt-1 w-full rounded-md border p-1 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Color Scheme</Label>
                  <select
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value)}
                    className="mt-1 w-full rounded-md border p-1 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Watermark</Label>
                  <input
                    type="text"
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    className="mt-1 w-full rounded-md border p-1 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeTOC}
                    onChange={(e) => setIncludeTOC(e.target.checked)}
                    id="toc"
                    className="rounded bg-white dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Label htmlFor="toc">Include Table of Contents</Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 flex space-x-2">
            <Button onClick={handleExport} disabled={scope === "branch" && !branch}>
              Download
            </Button>
            <Button onClick={handlePreview} variant="outline" disabled={scope === "branch" && !branch}>
              Preview
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Export</DialogTitle>
          </DialogHeader>

          {format === "json" ? (
            <pre className="whitespace-pre-wrap break-words p-4 rounded-md bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 overflow-auto">
              {previewContent}
            </pre>
          ) : (
            <iframe className="w-full h-[70vh] border rounded-md" srcDoc={previewContent} sandbox="allow-same-origin" />
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
