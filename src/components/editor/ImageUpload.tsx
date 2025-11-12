"use client";

import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  allowedTypes?: string[];
  preview?: string | null;
  onClearPreview?: () => void;
}

export function ImageUpload({
  onFileSelect,
  disabled = false,
  maxSizeMB = 10,
  allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  preview,
  onClearPreview,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        const allowedExtensions = allowedTypes
          .map((type) => type.replace("image/", "."))
          .join(", ");
        return `Invalid file type. Allowed: ${allowedExtensions}`;
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File too large. Max size: ${maxSizeMB}MB`;
      }

      return null;
    },
    [allowedTypes, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;

      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="h-40 w-full object-cover"
          />
          {onClearPreview && !disabled && (
            <button
              type="button"
              onClick={onClearPreview}
              className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-lg transition hover:bg-destructive/90"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={allowedTypes.join(",")}
          onChange={handleChange}
          disabled={disabled}
        />
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <div className="mb-3 rounded-full bg-muted p-3">
            {dragActive ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            {dragActive ? "Drop image here" : "Upload an image"}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to browse
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Max {maxSizeMB}MB • JPEG, PNG, GIF, WebP, SVG
          </p>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
