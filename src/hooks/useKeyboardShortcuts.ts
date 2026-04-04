"use client";

import { useEffect } from "react";
import { useStoryGraphStore, type StoryFlowNode } from "@/hooks/useStoryGraphStore";
import type { StoryNode } from "@/lib/types/editor";

type CreateNodeOptions = Partial<Pick<StoryNode, "title" | "type" | "color" | "position" | "content">>;
type CreateNode = (options?: CreateNodeOptions) => Promise<void>;
type DeleteNode = (id: string) => Promise<void>;
type DeleteEdges = (ids: string[]) => Promise<void>;

interface UseKeyboardShortcutsOptions {
  canEdit: boolean;
  createNode: CreateNode;
  deleteNode: DeleteNode;
  deleteEdges: DeleteEdges;
}

export function useKeyboardShortcuts({
  canEdit,
  createNode,
  deleteNode,
  deleteEdges,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canEdit) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }

      const state = useStoryGraphStore.getState();
      const nodeIdsSnapshot = state.selectedNodeIds;
      const edgeIdsSnapshot = state.selectedEdgeIds;
      const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));

      const hasNodes = nodeIdsSnapshot.length > 0;
      const hasEdges = edgeIdsSnapshot.length > 0;

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (hasNodes || hasEdges)
      ) {
        event.preventDefault();
        void (async () => {
          await Promise.all(nodeIdsSnapshot.map((id) => deleteNode(id)));
          if (edgeIdsSnapshot.length) {
            await deleteEdges(edgeIdsSnapshot);
          }
        })();
        return;
      }

      const isDuplicateShortcut =
        (event.key === "d" || event.key === "D") &&
        (event.metaKey || event.ctrlKey);
      if (isDuplicateShortcut && hasNodes) {
        event.preventDefault();
        const nodesToDuplicate = nodeIdsSnapshot
          .map((id) => nodeMap.get(id))
          .filter((node): node is StoryFlowNode => Boolean(node));
        void (async () => {
          for (const node of nodesToDuplicate) {
            await createNode({
              title: node.data.title ? `${node.data.title} Copy` : "Untitled Copy",
              type: node.type as StoryNode["type"],
              color: node.data.color,
              position: {
                x: node.position.x + 40,
                y: node.position.y + 40,
              },
              content: {
                text: node.data.content?.text ?? "",
                summary: node.data.content?.summary,
                media: node.data.content?.media ?? [],
                generatedBy: "user",
              },
            });
          }
        })();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, createNode, deleteEdges, deleteNode]);
}
