"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryFlowNode } from "@/hooks/useStoryGraphStore";
import type { MediaItem, StoryNode } from "@/lib/types/editor";

type UpdateNode = (id: string, patch: Partial<StoryNode>) => Promise<void>;
type DeleteNode = (id: string) => Promise<void>;

interface UseNodeFormOptions {
  selectedNode: StoryFlowNode | null;
  canEdit: boolean;
  updateNode: UpdateNode;
  deleteNode: DeleteNode;
  isMobile: boolean;
  setMobileNodeDialogOpen: (open: boolean) => void;
}

export function useNodeForm({
  selectedNode,
  canEdit,
  updateNode,
  deleteNode,
  isMobile,
  setMobileNodeDialogOpen,
}: UseNodeFormOptions) {
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeContent, setNodeContent] = useState("");
  const [nodeColor, setNodeColor] = useState("#2563eb");
  const [nodeMedia, setNodeMedia] = useState<MediaItem | null>(null);

  const formNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const incomingId = selectedNode?.id ?? null;

    if (incomingId !== formNodeIdRef.current) {
      formNodeIdRef.current = incomingId;

      if (!selectedNode) {
        setNodeTitle("");
        setNodeContent("");
        setNodeColor("#2563eb");
        setNodeMedia(null);
        return;
      }

      setNodeTitle(selectedNode.data.title ?? "");
      setNodeContent(selectedNode.data.content?.text ?? "");
      setNodeColor(selectedNode.data.color ?? "#2563eb");
      const existingImage = selectedNode.data.content?.media?.find(
        (media) => media.type === "image"
      );
      setNodeMedia(existingImage ?? null);

      if (isMobile) {
        setMobileNodeDialogOpen(true);
      }
    }
  }, [selectedNode, isMobile, setMobileNodeDialogOpen]);

  const handleSaveNodeDetails = useCallback(() => {
    if (!selectedNode || !canEdit) return;
    void updateNode(selectedNode.id, {
      title: nodeTitle || "Untitled Node",
      color: nodeColor,
      content: {
        ...(selectedNode.data.content ?? {}),
        text: nodeContent,
        media: [
          ...(selectedNode.data.content?.media?.filter(
            (media) => media.type !== "image"
          ) ?? []),
          ...(nodeMedia ? [nodeMedia] : []),
        ],
        generatedBy: selectedNode.data.content?.generatedBy ?? "user",
      },
    });
  }, [selectedNode, canEdit, nodeTitle, nodeColor, nodeContent, nodeMedia, updateNode]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode || !canEdit) return;
    void deleteNode(selectedNode.id);
  }, [selectedNode, canEdit, deleteNode]);

  const handleAIGenerate = useCallback(
    (generatedContent: string, prompt: string) => {
      if (!selectedNode) return;
      void updateNode(selectedNode.id, {
        title: nodeTitle || "Untitled Node",
        color: nodeColor,
        content: {
          text: generatedContent,
          summary: selectedNode.data.content?.summary,
          media: [
            ...(selectedNode.data.content?.media?.filter(
              (media) => media.type !== "image"
            ) ?? []),
            ...(nodeMedia ? [nodeMedia] : []),
          ],
          generatedBy: "ai",
          generatedAt: new Date(),
          generationPrompt: prompt,
        },
      });
    },
    [selectedNode, nodeTitle, nodeColor, nodeMedia, updateNode]
  );

  return {
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
  };
}
