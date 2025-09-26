"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UpdatePayload = { title?: string; subtitle?: string };

export function useUpdateRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const updateRoom = async (roomId: string, updates: UpdatePayload) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to update (HTTP ${res.status})`);
      }

      router.refresh();
      return data?.room as { _id: string; title?: string; subtitle?: string } | undefined;
    } catch (e: any) {
      setError(e.message || "Failed to update room");
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { updateRoom, loading, error };
}
