"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useDeleteRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteStory = async (roomId: string) => {
    if (!roomId) return;
    if (!confirm("Delete this room and all its content? This cannot be undone.")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to delete (HTTP ${res.status})`);
      }

      // Ensure the dashboard reflects the deletion
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to delete room");
    } finally {
      setLoading(false);
    }
  };

  return { handleDeleteStory, loading, error };
}
