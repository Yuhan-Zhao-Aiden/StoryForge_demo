"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, Copy, Check } from "lucide-react";

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  content: string;
  generatedAt: Date;
  tokens?: number;
}

interface GenerationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: GenerationHistoryItem[];
  onSelect: (item: GenerationHistoryItem) => void;
}

export function GenerationHistoryDialog({
  open,
  onOpenChange,
  history,
  onSelect,
}: GenerationHistoryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (item: GenerationHistoryItem) => {
    await navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelect = (item: GenerationHistoryItem) => {
    setSelectedId(item.id);
    onSelect(item);
    onOpenChange(false);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const sortedHistory = [...history].sort(
    (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generation History
          </DialogTitle>
          <DialogDescription>
            View and restore previous AI-generated content for this node.
          </DialogDescription>
        </DialogHeader>

        {sortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              No generation history yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated content will appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-4 max-h-[calc(80vh-12rem)]">
            <div className="space-y-3">{sortedHistory.map((item, index) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedId === item.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            #{sortedHistory.length - index}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(item.generatedAt)}
                          </span>
                          {item.tokens && (
                            <span className="text-xs text-muted-foreground">
                              {item.tokens} tokens
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Prompt: {item.prompt}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-sm whitespace-pre-wrap line-clamp-4">
                        {item.content}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 pb-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                    >
                      Use This Version
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
