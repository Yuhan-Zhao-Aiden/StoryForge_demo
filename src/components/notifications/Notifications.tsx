"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedEntity: {
    type: string;
    id: string;
    roomId?: string;
    nodeId?: string;
    commentId?: string;
  };
  read: boolean;
  createdAt: string;
  triggeredBy: {
    username: string;
    email: string;
  };
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const processedNotificationsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/notifications?limit=10&unreadOnly=false"
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.totalUnread || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    if (processedNotificationsRef.current.has(notificationId)) {
      return true;
    }

    processedNotificationsRef.current.add(notificationId);

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      } else {
        console.error("Failed to mark notification as read:", response.status);
        processedNotificationsRef.current.delete(notificationId);
        return false;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      processedNotificationsRef.current.delete(notificationId);
      return false;
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    const unreadIds = unreadNotifications.map((n) => n._id);

    if (unreadIds.length === 0) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationIds: unreadIds,
          read: true,
        }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      const success = await markAsRead(notification._id);
      if (!success) {
        console.warn("Failed to mark notification as read, but continuing...");
      }
    }

    if (
      notification.relatedEntity.roomId &&
      notification.relatedEntity.nodeId
    ) {
      const urlParams = new URLSearchParams({
        nodeId: notification.relatedEntity.nodeId,
      });

      if (notification.relatedEntity.commentId) {
        urlParams.set("commentId", notification.relatedEntity.commentId);
      }

      const url = `/rooms/${
        notification.relatedEntity.roomId
      }/editor?${urlParams.toString()}`;
      router.push(url);
    }

    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-indigo-500 hover:bg-indigo-600 text-white border-0 shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Notifications
          </h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mr-2"></div>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p>No notifications yet</p>
              <p className="text-xs">
                You&apos;ll see notifications here when someone mentions you.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification._id}
              className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                !notification.read
                  ? "bg-indigo-50/70 dark:bg-indigo-900/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex flex-col gap-2 w-full">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100 block truncate">
                        {notification.title}
                      </span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  {!notification.read ? (
                    <EyeOff className="h-3 w-3 text-indigo-500 flex-shrink-0 mt-1" />
                  ) : (
                    <Eye className="h-3 w-3 text-slate-400 flex-shrink-0 mt-1" />
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[120px]">
                    by{" "}
                    {notification.triggeredBy.username ||
                      notification.triggeredBy.email}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
