"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StoryFlowNode } from "@/hooks/useStoryGraphStore";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function StoryNodeCard({ data, selected }: NodeProps<StoryFlowNode>) {
  const { title, content } = data;
  const imageMedia = content?.media?.find((media) => media.type === "image");
  const text = content?.text ?? "";
  const color = data.color ?? "#2563eb";
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get the image URL based on the media source
  const getImageUrl = () => {
    if (!imageMedia) return null;
    
    if (imageMedia.source === "url") {
      return imageMedia.url;
    } else if (imageMedia.source === "uploaded") {
      // Construct the API URL from the node data
      const roomId = data.roomId;
      const nodeId = data.id;
      return `/api/rooms/${roomId}/nodes/${nodeId}/images/${imageMedia.fileId}`;
    }
    
    return null;
  };

  const imageUrl = getImageUrl();

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
          <div className="relative h-32 w-full overflow-hidden bg-muted">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">Failed to load</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title ?? "Node image"}
                className={`h-full w-full object-cover transition-opacity ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
            )}
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
