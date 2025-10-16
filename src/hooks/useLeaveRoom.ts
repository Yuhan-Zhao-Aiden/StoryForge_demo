"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useLeaveRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeaveRoom = async (roomId: string) => {
    if (!roomId) return;

    // Custom confirmation instead of window.confirm
    const confirmed = window.confirm("Are you sure you want to leave this room?");
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to leave room (HTTP ${res.status})`);
      }

      alert("You have successfully left the room.");
      router.refresh(); // Refresh dashboard to remove room
    } catch (e: any) {
      setError(e.message || "Failed to leave room");
      alert(error || "Failed to leave room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { handleLeaveRoom, loading, error };
}
