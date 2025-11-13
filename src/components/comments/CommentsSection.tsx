"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import {
  MoreHorizontal,
  MessageSquare,
  Pencil,
  Trash2,
  Pin,
  CheckCircle,
  XCircle,
  Send,
  Reply,
  Flag,
} from "lucide-react";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

type User = {
  _id: string;
  username: string;
  email: string;
};

type Comment = {
  _id: string;
  roomId: string;
  nodeId: string;
  parentId: string | null;
  content: string;
  mentions: string[];
  isPinned: boolean;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: User;
  resolvedByUser?: User;
};

type CommentsSectionProps = {
  room: { id: string; title: string };
  node: { id: string; title?: string; type: string };
  userRole: "owner" | "editor" | "viewer";
  currentUserId: string;
};

type MentionState = {
  show: boolean;
  position: { top: number; left: number };
  users: User[];
  selectedIndex: number;
  query: string;
  startIndex: number;
  textareaId?: string;
};

export default function CommentsSection({
  room,
  node,
  userRole,
  currentUserId,
}: CommentsSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>(
    {}
  );
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<"newest" | "oldest">("newest");
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const commentId = searchParams.get("commentId");

  const highlightedCommentsRef = useRef<Set<string>>(new Set());
  const hasProcessedInitialHighlightRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [mentionState, setMentionState] = useState<MentionState>({
    show: false,
    position: { top: 0, left: 0 },
    users: [],
    selectedIndex: 0,
    query: "",
    startIndex: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const canComment = true;
  const isRoomOwner = userRole === "owner";

  const fetchComments = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [room.id, node.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  useEffect(() => {
    if (
      commentId &&
      comments.length > 0 &&
      !hasProcessedInitialHighlightRef.current
    ) {
      hasProcessedInitialHighlightRef.current = true;

      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement && !highlightedCommentsRef.current.has(commentId)) {
          // Mark this comment as highlighted
          highlightedCommentsRef.current.add(commentId);

          // Scroll to the comment
          commentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Add highlight styles
          commentElement.classList.add(
            "border-l-[3px]",
            "border-amber-400",
            "bg-amber-50",
            "dark:bg-amber-950/20",
            "transition-all",
            "duration-500"
          );

          // Remove highlight after 5 seconds
          setTimeout(() => {
            commentElement.classList.remove(
              "border-l-[3px]",
              "border-amber-400",
              "bg-amber-50",
              "dark:bg-amber-950/20"
            );
          }, 5000);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [commentId, comments]);

  useEffect(() => {
    return () => {
      hasProcessedInitialHighlightRef.current = false;
    };
  }, [commentId]);

  const searchUsers = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setMentionState((prev) => ({ ...prev, users: [], show: false }));
        return;
      }

      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&roomId=${room.id}`
        );
        if (!response.ok) return;
        const data = await response.json();
        setMentionState((prev) => ({
          ...prev,
          users: data.users || [],
          show: data.users && data.users.length > 0,
          selectedIndex: 0,
        }));
      } catch (error) {
        console.error("Error searching users:", error);
        setMentionState((prev) => ({ ...prev, users: [], show: false }));
      }
    },
    [room.id]
  );

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    isEdit: boolean = false,
    textareaId?: string
  ) => {
    const value = e.target.value;

    if (isEdit) {
      setEditContent(value);
    } else if (textareaId === "main") {
      setNewComment(value);
    } else if (textareaId) {
      setReplyContents((prev) => ({
        ...prev,
        [textareaId]: value,
      }));
    }

    // Check for @ mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    // FIXED: Check if there's a space after the @ symbol
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // NEW: Check if there's a space in the text after @
      const spaceIndex = textAfterAt.indexOf(" ");

      // If space is found, hide the mention dropdown
      if (spaceIndex !== -1) {
        setMentionState((prev) => ({ ...prev, show: false }));
        return;
      }

      // Only proceed if there's no space after @
      const query = textAfterAt;

      const textarea = e.target;
      const rect = textarea.getBoundingClientRect();

      const top = rect.bottom + window.scrollY;
      const left = rect.left + window.scrollX;

      setMentionState((prev) => ({
        ...prev,
        show: true,
        position: { top, left },
        query,
        startIndex: lastAtIndex,
        textareaId: textareaId || (isEdit ? "edit" : "main"),
      }));

      searchUsers(query);
      return;
    }

    setMentionState((prev) => ({ ...prev, show: false }));
  };

  const insertMention = (
    user: User,
    isEdit: boolean = false,
    textareaId?: string
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let currentText = "";
    if (isEdit) {
      currentText = editContent;
    } else if (textareaId === "main") {
      currentText = newComment;
    } else if (textareaId) {
      currentText = replyContents[textareaId] || "";
    }

    const textBeforeMention = currentText.substring(0, mentionState.startIndex);
    const textAfterMention = currentText.substring(textarea.selectionStart);
    const newText = `${textBeforeMention}@${user.username} ${textAfterMention}`;

    if (isEdit) {
      setEditContent(newText);
    } else if (textareaId === "main") {
      setNewComment(newText);
    } else if (textareaId) {
      setReplyContents((prev) => ({
        ...prev,
        [textareaId]: newText,
      }));
    }

    setMentionState((prev) => ({ ...prev, show: false }));

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = mentionState.startIndex + user.username.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    isEdit: boolean = false,
    textareaId?: string
  ) => {
    if (mentionState.show) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: Math.min(
              prev.selectedIndex + 1,
              prev.users.length - 1
            ),
          }));
          break;

        case "ArrowUp":
          e.preventDefault();
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          }));
          break;

        case "Enter":
          e.preventDefault();
          if (mentionState.users[mentionState.selectedIndex]) {
            insertMention(
              mentionState.users[mentionState.selectedIndex],
              isEdit,
              textareaId
            );
          }
          break;

        case "Escape":
          e.preventDefault();
          setMentionState((prev) => ({ ...prev, show: false }));
          break;

        case "Tab":
          e.preventDefault();
          if (mentionState.users[mentionState.selectedIndex]) {
            insertMention(
              mentionState.users[mentionState.selectedIndex],
              isEdit,
              textareaId
            );
          }
          break;

        case " ":
          e.preventDefault();
          setMentionState((prev) => ({ ...prev, show: false }));

          const textarea = e.currentTarget;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const value = textarea.value;
          const newValue =
            value.substring(0, start) + " " + value.substring(end);

          if (isEdit) {
            setEditContent(newValue);
          } else if (textareaId === "main") {
            setNewComment(newValue);
          } else if (textareaId) {
            setReplyContents((prev) => ({
              ...prev,
              [textareaId]: newValue,
            }));
          }

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
          }, 0);
          break;
      }
    }
  };

  const parseMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      const user = mentionState.users.find((u) => u.username === username);
      if (user) {
        mentions.push(user._id);
      }
    }

    return mentions;
  };

  const handleSubmitComment = async (parentId: string | null = null) => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const mentions = parseMentions(newComment);

      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newComment,
            parentId,
            mentions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      setNewComment("");
      setReplyingTo(null);
      setMentionState((prev) => ({ ...prev, show: false }));
      await fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      setError("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const replyContent = replyContents[parentId];
    if (!replyContent?.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const mentions = parseMentions(replyContent);

      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: replyContent,
            parentId,
            mentions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to post reply");
      }

      setReplyContents((prev) => {
        const newContents = { ...prev };
        delete newContents[parentId];
        return newContents;
      });
      setReplyingTo(null);
      setMentionState((prev) => ({ ...prev, show: false }));
      await fetchComments();
    } catch (error) {
      console.error("Error posting reply:", error);
      setError("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const mentions = parseMentions(editContent);

      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editContent,
            mentions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      setEditingComment(null);
      setEditContent("");
      setMentionState((prev) => ({ ...prev, show: false }));
      await fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      setError("Failed to update comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      setError(null);
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      await fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      setError("Failed to delete comment");
    }
  };

  //handelling pin comment
  const handlePinComment = async (commentId: string, pin: boolean) => {
    try {
      setError(null);
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: pin }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to pin comment");
      }

      await fetchComments();
    } catch (error) {
      console.error("Error pinning comment:", error);
      setError("Failed to pin comment");
    }
  };

  const handleResolveComment = async (commentId: string, resolve: boolean) => {
    try {
      setError(null);
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isResolved: resolve }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to resolve comment");
      }

      await fetchComments();
    } catch (error) {
      console.error("Error resolving comment:", error);
      setError("Failed to resolve comment");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionListRef.current &&
        !mentionListRef.current.contains(event.target as Node)
      ) {
        setMentionState((prev) => ({ ...prev, show: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getReplies = (commentId: string) => {
    return comments.filter((comment) => comment.parentId === commentId);
  };

  const filteredComments = comments.filter((comment) => {
    const contentMatch = comment.content
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const authorMatch = comment.author.username
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return contentMatch || authorMatch;
  });

  const topLevelComments = filteredComments
    .filter((comment) => !comment.parentId)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortOption === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    });

  if (loading) {
    return (
      <div className="p-4 flex flex-col gap-6 w-full bg-background">
        <div className="animate-pulse">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-6 w-full bg-background">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar: Comment count above, Search and Sort side by side below */}
      <div className="mt-4">
        {/* Comment count */}
        <h2 className="text-lg font-semibold mb-3">
          {comments.length} Comments
        </h2>

        {/* Search and Sort container */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search field */}
          <input
            type="text"
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 text-sm border border-gray-600 rounded-md px-3 py-2 bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-auto"
          />

          {/* Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) =>
              setSortOption(e.target.value as "newest" | "oldest")
            }
            className="text-sm border border-gray-600 rounded-md px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-40"
          >
            <option value="newest" className="bg-gray-800 text-white">
              Newest first
            </option>
            <option value="oldest" className="bg-gray-800 text-white">
              Oldest first
            </option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <Avatar className="w-10 h-10">
          <AvatarFallback>
            {currentUserId?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleTextChange(e, false, "main")}
            onKeyDown={(e) => handleKeyDown(e, false, "main")}
            placeholder="Add a comment... Use @ to mention someone"
            className="resize-none min-h-[80px] text-sm"
          />

          {mentionState.show && mentionState.textareaId === "main" && (
            <div
              ref={mentionListRef}
              className="fixed z-50 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg"
              style={{
                top: `${mentionState.position.top}px`,
                left: `${mentionState.position.left}px`,
              }}
            >
              {mentionState.users.map((user, index) => (
                <div
                  key={user._id}
                  className={`p-2 cursor-pointer hover:bg-accent ${
                    index === mentionState.selectedIndex ? "bg-accent" : ""
                  }`}
                  onClick={() => insertMention(user, false, "main")}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {user.username?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {user.username || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {mentionState.users.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewComment("");
                setReplyingTo(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitComment()}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="w-4 h-4 mr-1" />
              {submitting ? "Posting..." : "Comment"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        {topLevelComments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Start the discussion!</p>
          </div>
        ) : (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              replies={getReplies(comment._id)}
              currentUserId={currentUserId}
              userRole={userRole}
              onReply={() => setReplyingTo(comment._id)}
              onEdit={(comment) => {
                setEditingComment(comment._id);
                setEditContent(comment.content);
              }}
              onDelete={handleDeleteComment}
              onPin={handlePinComment}
              onResolve={handleResolveComment}
              onUpdate={handleUpdateComment}
              editingComment={editingComment}
              editContent={editContent}
              setEditContent={setEditContent}
              replyingTo={replyingTo}
              replyContents={replyContents}
              setReplyContents={setReplyContents}
              onSubmitReply={handleSubmitReply}
              canComment={canComment}
              isRoomOwner={isRoomOwner}
              submitting={submitting}
              setReplyingTo={setReplyingTo}
              setEditingComment={setEditingComment}
              handleTextChange={handleTextChange}
              handleKeyDown={handleKeyDown}
              insertMention={insertMention}
              mentionState={mentionState}
              searchUsers={searchUsers}
              renderContentWithMentions={renderContentWithMentions}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  currentUserId: string;
  userRole: "owner" | "editor" | "viewer";
  onReply: (commentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onPin: (commentId: string, pin: boolean) => void;
  onResolve: (commentId: string, resolve: boolean) => void;
  onUpdate: (commentId: string) => void;
  editingComment: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  replyingTo: string | null;
  replyContents: Record<string, string>;
  setReplyContents: (contents: Record<string, string>) => void;
  onSubmitReply: (parentId: string) => void;
  canComment: boolean;
  isRoomOwner: boolean;
  submitting: boolean;
  setReplyingTo: (commentId: string | null) => void;
  setEditingComment: (commentId: string | null) => void;
  handleTextChange: (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    isEdit: boolean,
    textareaId?: string
  ) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    isEdit: boolean,
    textareaId?: string
  ) => void;
  insertMention: (user: User, isEdit: boolean, textareaId?: string) => void;
  mentionState: MentionState;
  searchUsers: (query: string) => void;
  renderContentWithMentions: (content: string) => React.ReactNode;
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  userRole,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onResolve,
  onUpdate,
  editingComment,
  editContent,
  setEditContent,
  replyingTo,
  replyContents,
  setReplyContents,
  onSubmitReply,
  canComment,
  isRoomOwner,
  submitting,
  setReplyingTo,
  setEditingComment,
  handleTextChange,
  handleKeyDown,
  insertMention,
  mentionState,
  searchUsers,
  renderContentWithMentions,
}: CommentItemProps) {
  const isCommentAuthor = String(comment.author._id) === String(currentUserId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const showDropdown = isCommentAuthor || isRoomOwner;
  const replyContent = replyContents[comment._id] || "";

  return (
    <div
      id={`comment-${comment._id}`}
      className={`flex gap-3 ${
        comment.isPinned ? "border-l-4 border-yellow-400 pl-3" : ""
      }`}
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback>
          {comment.author.username?.[0]?.toUpperCase() ||
            comment.author.email?.[0]?.toUpperCase() ||
            "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">
              {comment.author.username ||
                comment.author.email ||
                "Unknown User"}
            </p>
            {comment.isPinned && <Pin className="h-3 w-3 text-yellow-500" />}
            {comment.isResolved && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600 text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Resolved
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          {showDropdown && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isRoomOwner && (
                  <DropdownMenuItem
                    onClick={() => onPin(comment._id, !comment.isPinned)}
                  >
                    <Pin className="w-4 h-4 mr-2" />
                    {comment.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}

                {isRoomOwner && (
                  <DropdownMenuItem
                    onClick={() => onResolve(comment._id, !comment.isResolved)}
                  >
                    {comment.isResolved ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Unresolve
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Resolved
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {(isCommentAuthor || isRoomOwner) && (
                  <DropdownMenuItem onClick={() => onEdit(comment)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}

                {(isCommentAuthor || isRoomOwner) && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment._id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Flag button will be handled by FlagContentButton component
                  }}
                  className="text-muted-foreground"
                  onSelect={(e) => e.preventDefault()}
                >
                  <FlagContentButton
                    roomId={room.id}
                    contentType="comment"
                    contentId={comment._id}
                    trigger={
                      <div className="flex items-center w-full">
                        <Flag className="w-4 h-4 mr-2" />
                        Flag Content
                      </div>
                    }
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {editingComment === comment._id ? (
          <div className="mt-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => handleTextChange(e, true, "edit")}
                onKeyDown={(e) => handleKeyDown(e, true, "edit")}
                className="min-h-[60px] text-sm mb-2"
              />

              {mentionState.show && mentionState.textareaId === "edit" && (
                <div
                  ref={mentionListRef}
                  className="fixed z-50 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg"
                  style={{
                    top: `${mentionState.position.top}px`,
                    left: `${mentionState.position.left}px`,
                  }}
                >
                  {mentionState.users.map((user, index) => (
                    <div
                      key={user._id}
                      className={`p-2 cursor-pointer hover:bg-accent ${
                        index === mentionState.selectedIndex ? "bg-accent" : ""
                      }`}
                      onClick={() => insertMention(user, true, "edit")}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.username?.[0]?.toUpperCase() ||
                              user.email?.[0]?.toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {user.username || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {mentionState.users.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => onUpdate(comment._id)}
                disabled={!editContent.trim() || submitting}
              >
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingComment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-line">
            {renderContentWithMentions(comment.content)}
          </p>
        )}

        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <button
            onClick={() => onReply(comment._id)}
            disabled={submitting}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
        </div>

        {replyingTo === comment._id && (
          <div className="mt-3 ml-8">
            <div className="relative">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => handleTextChange(e, false, comment._id)}
                onKeyDown={(e) => handleKeyDown(e, false, comment._id)}
                className="min-h-[60px] text-sm mb-2"
              />

              {mentionState.show && mentionState.textareaId === comment._id && (
                <div
                  ref={mentionListRef}
                  className="fixed z-50 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg"
                  style={{
                    top: `${mentionState.position.top}px`,
                    left: `${mentionState.position.left}px`,
                  }}
                >
                  {mentionState.users.map((user, index) => (
                    <div
                      key={user._id}
                      className={`p-2 cursor-pointer hover:bg-accent ${
                        index === mentionState.selectedIndex ? "bg-accent" : ""
                      }`}
                      onClick={() => insertMention(user, false, comment._id)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.username?.[0]?.toUpperCase() ||
                              user.email?.[0]?.toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {user.username || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {mentionState.users.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment._id)}
                disabled={!replyContent.trim() || submitting}
              >
                <Send className="w-4 h-4 mr-1" />
                {submitting ? "Posting..." : "Reply"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  const newContents = { ...replyContents };
                  delete newContents[comment._id];
                  setReplyContents(newContents);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="ml-8 mt-3 flex flex-col gap-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              userRole={userRole}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onResolve={onResolve}
              onUpdate={onUpdate}
              editingComment={editingComment}
              editContent={editContent}
              setEditContent={setEditContent}
              replyingTo={replyingTo}
              replyContents={replyContents}
              setReplyContents={setReplyContents}
              onSubmitReply={onSubmitReply}
              canComment={canComment}
              isRoomOwner={isRoomOwner}
              submitting={submitting}
              setReplyingTo={setReplyingTo}
              setEditingComment={setEditingComment}
              handleTextChange={handleTextChange}
              handleKeyDown={handleKeyDown}
              insertMention={insertMention}
              mentionState={mentionState}
              searchUsers={searchUsers}
              renderContentWithMentions={renderContentWithMentions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
