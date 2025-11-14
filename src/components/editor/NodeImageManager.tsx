"use client";

import { useState, useCallback } from "react";
import { Loader2, Link as LinkIcon, Upload as UploadIcon } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MediaItem } from "@/lib/types/editor";

interface NodeImageManagerProps {
  roomId: string;
  nodeId: string;
  currentMedia?: MediaItem | null;
  onMediaUpdate: (media: MediaItem | null) => void;
  disabled?: boolean;
}

export function NodeImageManager({
  roomId,
  nodeId,
  currentMedia,
  onMediaUpdate,
  disabled = false,
}: NodeImageManagerProps) {
  const [mode, setMode] = useState<"upload" | "url">(
    currentMedia?.source === "url" ? "url" : "upload"
  );
  const [urlInput, setUrlInput] = useState(
    currentMedia?.source === "url" ? currentMedia.url : ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Get preview URL
  const getPreviewUrl = useCallback(() => {
    if (!currentMedia) return null;
    
    if (currentMedia.source === "url") {
      return currentMedia.url;
    } else if (currentMedia.source === "uploaded") {
      return `/api/rooms/${roomId}/nodes/${nodeId}/images/${currentMedia.fileId}`;
    }
    
    return null;
  }, [currentMedia, roomId, nodeId]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress (Next.js doesn't provide upload progress easily)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const response = await fetch(
          `/api/rooms/${roomId}/nodes/${nodeId}/images/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();

        // Create uploaded media item
        const uploadedMedia: MediaItem = {
          id: crypto.randomUUID(),
          type: "image",
          source: "uploaded",
          fileId: data.fileId,
          filename: data.filename,
          contentType: data.contentType,
          size: data.size,
          uploadedAt: new Date(data.uploadedAt),
        };

        onMediaUpdate(uploadedMedia);
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Failed to upload image");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [roomId, nodeId, onMediaUpdate]
  );

  const handleUrlSave = useCallback(() => {
    setError(null);

    if (!urlInput.trim()) {
      onMediaUpdate(null);
      return;
    }

    try {
      new URL(urlInput); // Validate URL
      
      const urlMedia: MediaItem = {
        id: crypto.randomUUID(),
        type: "image",
        source: "url",
        url: urlInput.trim(),
      };

      onMediaUpdate(urlMedia);
    } catch {
      setError("Please enter a valid URL");
    }
  }, [urlInput, onMediaUpdate]);

  const handleClearImage = useCallback(async () => {
    setError(null);

    // If it's an uploaded image, delete it from the server
    if (currentMedia?.source === "uploaded") {
      try {
        const response = await fetch(
          `/api/rooms/${roomId}/nodes/${nodeId}/images/${currentMedia.fileId}`,
          {
            method: "DELETE",
          }
        );

        // 404 means image already deleted, which is fine
        // 200 means successful deletion
        // Other errors should be logged but not block the UI update
        if (!response.ok && response.status !== 404) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to delete image (${response.status})`;
          console.warn("Failed to delete image from server:", errorMessage);
          // Don't set error state - still clear the image from UI
          // The image might be deleted anyway, or the user can try again
        }
      } catch (err) {
        // Network errors or other issues - log but don't block UI update
        console.warn("Error deleting image:", err);
        // Still proceed to clear the image from UI
      }
    }

    // Always clear the image from UI regardless of deletion result
    onMediaUpdate(null);
    setUrlInput("");
  }, [currentMedia, roomId, nodeId, onMediaUpdate]);

  const previewUrl = getPreviewUrl();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
          disabled={disabled || uploading}
          className="flex-1"
        >
          <UploadIcon className="mr-1 h-3 w-3" />
          Upload
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
          disabled={disabled || uploading}
          className="flex-1"
        >
          <LinkIcon className="mr-1 h-3 w-3" />
          URL
        </Button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <ImageUpload
            onFileSelect={handleFileSelect}
            disabled={disabled || uploading}
            preview={previewUrl}
            onClearPreview={handleClearImage}
          />
          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Uploading... {uploadProgress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label htmlFor="image-url" className="text-xs">
              Image URL
            </Label>
            <Input
              id="image-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrlSave();
                }
              }}
              placeholder="https://example.com/image.jpg"
              disabled={disabled}
              className="mt-1 text-sm"
            />
          </div>
          {previewUrl && currentMedia?.source === "url" && (
            <ImageUpload
              onFileSelect={() => {}} // Not used in URL mode
              disabled={true}
              preview={previewUrl}
              onClearPreview={handleClearImage}
            />
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
