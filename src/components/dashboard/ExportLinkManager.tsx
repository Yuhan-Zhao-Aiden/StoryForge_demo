"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportLink } from "@/lib/types/exports";
import { Copy, Trash2, ExternalLink, Download } from "lucide-react";

type Props = {
  exportLinks: ExportLink[];
  onDelete: (exportId: string) => void;
  onRefresh: () => void;
};

export function ExportLinkManager({ exportLinks, onDelete }: Props) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  function handleCopy(link: ExportLink) {
    navigator.clipboard.writeText(link.shareUrl);
    setCopiedId(link._id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDate(date: Date | null) {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(link: ExportLink) {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt) < new Date();
  }

  function isMaxDownloadsReached(link: ExportLink) {
    if (!link.maxDownloads) return false;
    return link.downloadCount >= link.maxDownloads;
  }

  function getDownloadUrl(shareToken: string, format: string = "json") {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/exports/${shareToken}/download?format=${format}`;
  }

  if (exportLinks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No export links created yet.</p>
        <p className="text-sm mt-2">Create a new export link to share your story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exportLinks.map((link) => {
        const expired = isExpired(link);
        const maxReached = isMaxDownloadsReached(link);
        const disabled = expired || maxReached || link.disabled;

        return (
          <div
            key={link._id}
            className={`border rounded-lg p-4 space-y-3 ${
              disabled ? "opacity-60 bg-muted/50" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{link.name || "Untitled Export"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {formatDate(link.createdAt)}
                </p>
              </div>
              <div className="flex gap-2 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(link)}
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(link._id)}
                  title="Delete export"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={link.shareUrl}
                readOnly
                className="flex-1 text-sm font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(link.shareUrl, "_blank")}
                disabled={disabled}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Downloads: {link.downloadCount}</span>
              {link.maxDownloads && (
                <span>Max: {link.maxDownloads}</span>
              )}
              {link.expiresAt && (
                <span>Expires: {formatDate(link.expiresAt)}</span>
              )}
            </div>

            {disabled && (
              <p className="text-sm text-destructive">
                {expired && "This link has expired."}
                {maxReached && "Maximum downloads reached."}
                {link.disabled && "This link has been disabled."}
              </p>
            )}

            {!disabled && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getDownloadUrl(link.shareToken, "json"), "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getDownloadUrl(link.shareToken, "markdown"), "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getDownloadUrl(link.shareToken, "html"), "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download HTML
                </Button>
              </div>
            )}

            {copiedId === link._id && (
              <p className="text-sm text-green-600">Link copied to clipboard!</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

