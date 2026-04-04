"use client";

import { Button } from "@/components/ui/button";

type EditorToolbarProps = {
  canEdit: boolean;
  createNode: () => void;
  createChoiceNode: () => void;
};

export function EditorToolbar({ canEdit, createNode, createChoiceNode }: EditorToolbarProps) {
  return (
    <>
      {/* Desktop toolbar */}
      <div className="hidden min-h-14 items-center justify-between border-b border-border bg-background/80 px-4 lg:flex">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={createNode}
            disabled={!canEdit}
          >
            Add Node
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={createChoiceNode}
            disabled={!canEdit}
          >
            Add Choice
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            Connect
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm">
            Zoom -
          </Button>
          <Button type="button" variant="outline" size="sm">
            Zoom +
          </Button>
          <Button type="button" variant="outline" size="sm">
            Fit View
          </Button>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="flex min-h-12 items-center justify-center gap-2 border-b border-border bg-background/80 px-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={createNode}
          disabled={!canEdit}
          className="text-xs"
        >
          Add Node
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={createChoiceNode}
          disabled={!canEdit}
          className="text-xs"
        >
          Add Choice
        </Button>
      </div>
    </>
  );
}
