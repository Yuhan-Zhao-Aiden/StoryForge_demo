"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ActiveUser {
  userId: string;
  username: string;
  email?: string;
  lastSeen: string;
  cursor?: { x: number; y: number } | null;
}

interface PresenceIndicatorProps {
  roomId: string;
  currentUserId: string;
}

const COLORS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-yellow-500 to-amber-500",
  "from-indigo-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-teal-500 to-green-500",
];

const getUserColor = (userId: string) => {
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
};

const getInitials = (username: string) => {
  return username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function PresenceIndicator({
  roomId,
  currentUserId,
}: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/presence`);
      if (res.ok) {
        const data = await res.json();
        const others = data.activeUsers.filter(
          (u: ActiveUser) => u.userId !== currentUserId
        );
        setActiveUsers(others);
      }
    } catch (err) {
      console.error("Error fetching presence:", err);
    }
  }, [roomId, currentUserId]);

  const updatePresence = useCallback(async () => {
    try {
      await fetch(`/api/rooms/${roomId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("Error updating presence:", err);
    }
  }, [roomId]);

  const leavePresence = useCallback(async () => {
    try {
      await fetch(`/api/rooms/${roomId}/presence`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error leaving presence:", err);
    }
  }, [roomId]);

  useEffect(() => {
    updatePresence();
    fetchPresence();

    const presenceInterval = setInterval(updatePresence, 10000);
    const fetchInterval = setInterval(fetchPresence, 3000);

    const handleBeforeUnload = () => {
      leavePresence();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(fetchInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      leavePresence();
    };
  }, [updatePresence, fetchPresence, leavePresence]);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex -space-x-2">
          <AnimatePresence mode="popLayout">
            {activeUsers.slice(0, 5).map((user, index) => (
              <motion.div
                key={user.userId}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: 20 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: index * 0.05,
                }}
                className="relative group"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getUserColor(
                    user.userId
                  )} flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer transition-transform hover:scale-110 hover:z-10`}
                >
                  {getInitials(user.username)}
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {user.username}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {activeUsers.length > 5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            +{activeUsers.length - 5}
          </motion.div>
        )}

        <div className="flex items-center gap-1.5 pl-1 border-l border-gray-200 dark:border-gray-700">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {activeUsers.length} {activeUsers.length === 1 ? "viewer" : "viewers"}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isHovering && activeUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[280px]"
          >
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Active Now
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {activeUsers.length} {activeUsers.length === 1 ? "person is" : "people are"}{" "}
                viewing this story
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {activeUsers.map((user, index) => (
                <motion.div
                  key={user.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getUserColor(
                        user.userId
                      )} flex items-center justify-center text-white text-sm font-bold shadow-sm relative`}
                    >
                      {getInitials(user.username)}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Active now
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
