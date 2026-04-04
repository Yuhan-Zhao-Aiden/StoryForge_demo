"use client";

import { Card, CardContent } from "@/components/ui/card";

type EditorFooterProps = {
  dirty: boolean;
  nodeCount: number;
  edgeCount: number;
  savingLayout: boolean;
};

export function EditorFooter({ dirty, nodeCount, edgeCount, savingLayout }: EditorFooterProps) {
  return (
    <footer className="border-t border-border bg-muted/30 px-3 py-2 lg:px-6 lg:py-3">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="flex items-center justify-between px-0 py-0 text-xs text-muted-foreground">
          <span className="hidden lg:inline">
            Status: {dirty ? "Unsaved changes" : "Up to date"}
          </span>
          <span className="lg:hidden">{dirty ? "Unsaved" : "Saved"}</span>
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="hidden sm:inline">Nodes: {nodeCount}</span>
            <span className="sm:hidden">N: {nodeCount}</span>
            <span className="hidden sm:inline">Edges: {edgeCount}</span>
            <span className="sm:hidden">E: {edgeCount}</span>
            <span className="hidden lg:inline">
              {savingLayout ? "Saving layout…" : "Layout saved"}
            </span>
          </div>
        </CardContent>
      </Card>
    </footer>
  );
}
