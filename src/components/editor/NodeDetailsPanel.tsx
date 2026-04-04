"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIContentEditor } from "@/components/editor/AIContentEditor";
import { NodeImageManager } from "@/components/editor/NodeImageManager";
import CommentsDrawer from "@/components/comments/CommentsDrawer";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import { Flag } from "lucide-react";
import type { StoryFlowNode } from "@/hooks/useStoryGraphStore";
import type { MediaItem } from "@/lib/types/editor";

type NodeDetailsPanelProps = {
  selectedNode: StoryFlowNode;
  canEdit: boolean;
  roomId: string;
  room: {
    id: string;
    title: string;
    subtitle?: string | null;
    role: "owner" | "editor" | "viewer";
  };
  currentUserId: string | null;
  nodeTitle: string;
  nodeContent: string;
  nodeColor: string;
  nodeMedia: MediaItem | null;
  setNodeTitle: (value: string) => void;
  setNodeContent: (value: string) => void;
  setNodeColor: (value: string) => void;
  setNodeMedia: (media: MediaItem | null) => void;
  handleSaveNodeDetails: () => void;
  handleDeleteNode: () => void;
  handleAIGenerate: (generatedContent: string, prompt: string) => void;
};

export function NodeDetailsPanel({
  selectedNode,
  canEdit,
  roomId,
  room,
  currentUserId,
  nodeTitle,
  nodeContent,
  nodeColor,
  nodeMedia,
  setNodeTitle,
  setNodeContent,
  setNodeColor,
  setNodeMedia,
  handleSaveNodeDetails,
  handleDeleteNode,
  handleAIGenerate,
}: NodeDetailsPanelProps) {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Title
        </label>
        <Input
          value={nodeTitle}
          onChange={(e) => setNodeTitle(e.target.value)}
          disabled={!canEdit}
          className="text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Color
        </label>
        <input
          type="color"
          value={nodeColor}
          onChange={(e) => setNodeColor(e.target.value)}
          disabled={!canEdit}
          className="h-9 w-16 cursor-pointer rounded border border-border bg-background"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Content
        </label>
        <AIContentEditor
          roomId={roomId}
          nodeId={selectedNode.id}
          nodeType={selectedNode.type as "scene" | "choice" | "ending" | "note"}
          value={nodeContent}
          onChange={setNodeContent}
          onGenerate={handleAIGenerate}
          disabled={!canEdit}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Image
        </label>
        <NodeImageManager
          roomId={roomId}
          nodeId={selectedNode.id}
          currentMedia={nodeMedia}
          onMediaUpdate={async (media) => {
            setNodeMedia(media);
          }}
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" onClick={handleSaveNodeDetails}>
            Save Changes
          </Button>
          <div className="flex gap-2">
            <CommentsDrawer
              room={room}
              node={selectedNode}
              userRole={room.role}
              currentUserId={currentUserId}
            />
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteNode}
            >
              Delete
            </Button>
          </div>
        </div>
        <div className="pt-2 border-t">
          <FlagContentButton
            roomId={roomId}
            contentType="node"
            contentId={selectedNode.id}
            trigger={
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="w-full"
              >
                <Flag className="h-4 w-4 mr-2" />
                Flag Content
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
