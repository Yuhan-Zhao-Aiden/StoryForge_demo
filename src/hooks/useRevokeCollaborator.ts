"use client";

import { useState } from "react";

export function useRevokeCollaborator() {
  const [loading, setLoading] = useState(false);

  const handleRevoke = async (roomId: string, userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/rooms/${roomId}/collaborators/${userId}/revoke`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to revoke collaborator");
      }

      setLoading(false);
      return true;
    } catch (err) {
      console.error(err);
      setLoading(false);
      return false;
    }
  };

  return { handleRevoke, loading };
}
