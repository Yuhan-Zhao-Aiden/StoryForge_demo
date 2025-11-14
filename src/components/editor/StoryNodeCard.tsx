"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StoryFlowNode } from "@/hooks/useStoryGraphStore";
import { useStoryGraphStore } from "@/hooks/useStoryGraphStore";
import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

export function StoryNodeCard({ data, selected }: NodeProps<StoryFlowNode>) {
  const { title, content } = data;
  const imageMedia = content?.media?.find((media) => media.type === "image");
  const text = content?.text ?? "";
  const color = data.color ?? "#2563eb";
  const roomId = useStoryGraphStore((state) => state.roomId);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Get media identifier for effect dependency
  const mediaIdentifier = imageMedia?.source === "uploaded" 
    ? imageMedia.fileId 
    : imageMedia?.source === "url" 
    ? imageMedia.url 
    : null;
  
  // Reset image state when imageUrl changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
  }, [mediaIdentifier, roomId, data.id]);

  // Get the image URL based on the media source
  const getImageUrl = () => {
    if (!imageMedia) return null;
    
    if (imageMedia.source === "url") {
      return imageMedia.url;
    } else if (imageMedia.source === "uploaded") {
      // Construct the API URL from the node data
      // Use roomId from store, fallback to data.roomId
      const roomIdToUse = roomId || data.roomId;
      const nodeId = data.id;
      
      if (!roomIdToUse || !nodeId || !imageMedia.fileId) {
        console.warn("Missing image URL parameters:", {
          roomId: roomIdToUse,
          nodeId,
          fileId: imageMedia.fileId,
          hasRoomIdInStore: !!roomId,
          hasRoomIdInData: !!data.roomId,
        });
        return null;
      }
      
      const imageUrl = `/api/rooms/${roomIdToUse}/nodes/${nodeId}/images/${imageMedia.fileId}`;
      return imageUrl;
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
                key={`${imageUrl}-${retryCount}`}
                src={imageUrl}
                alt={title ?? "Node image"}
                className={`h-full w-full object-cover transition-opacity ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                  setRetryCount(0);
                }}
                onError={async (e) => {
                  // Log initial error details
                  console.error("Image load error - initial:", {
                    imageUrl,
                    nodeId: data.id,
                    roomId: roomId || data.roomId,
                    fileId: imageMedia?.source === "uploaded" ? imageMedia.fileId : undefined,
                    retryCount,
                    imageMedia,
                  });
                  
                  // Try to fetch the image directly to see the actual error
                  try {
                    const response = await fetch(imageUrl, {
                      method: "GET",
                      cache: "no-cache",
                    });
                    
                    console.error("Image fetch response:", {
                      status: response.status,
                      statusText: response.statusText,
                      ok: response.ok,
                      url: response.url,
                      headers: {
                        contentType: response.headers.get("content-type"),
                        contentLength: response.headers.get("content-length"),
                      },
                    });
                    
                    if (!response.ok) {
                      const errorText = await response.text().catch(() => "Could not read error text");
                      console.error(`HTTP ${response.status} error details:`, errorText);
                    }
                  } catch (fetchError: any) {
                    console.error("Fetch error (network/CORS):", {
                      message: fetchError?.message,
                      name: fetchError?.name,
                      stack: fetchError?.stack,
                      imageUrl,
                    });
                  }
                  
                  // Retry once after a short delay if we haven't retried yet
                  if (retryCount < 1) {
                    setTimeout(() => {
                      setRetryCount((prev) => prev + 1);
                      setImageError(false);
                      setImageLoaded(false);
                    }, 1000);
                  } else {
                    setImageError(true);
                    setImageLoaded(false);
                  }
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
