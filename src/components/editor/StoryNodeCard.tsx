"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StoryFlowNode } from "@/hooks/useStoryGraphStore";

export function StoryNodeCard({ data, selected }: NodeProps<StoryFlowNode>) {
  const { title, content } = data;
  const imageUrl = content?.media?.find((media) => media.type === "image")?.url;
  const text = content?.text ?? "";
  const color = data.color ?? "#2563eb";

  return (
    <div className="relative w-56">
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: -10, background: color, border: "2px solid #fff" }}
      />
      <div
        className={`overflow-hidden rounded-lg border bg-background shadow-sm transition ${
          selected ? "ring-2 ring-primary/40" : ""
        }`}
        style={{ borderColor: color }}
      >
        {imageUrl ? (
          <div className="h-32 w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title ?? "Node image"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="space-y-2 px-3 py-2">
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            {title ?? "Untitled"}
          </h3>
          {text ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">{text}</p>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: -10, background: color, border: "2px solid #fff" }}
      />
    </div>
  );
}

export default StoryNodeCard;
