"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  PinIcon,
  MessageSquare,
  Reply,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  node: { id: string; title: string; type: string };
  userRole: "owner" | "editor" | "viewer";
  currentUserId: string;
};

export default function CommentsSection({
  room,
  node,
  userRole,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const canEdit = userRole === "owner" || userRole === "editor";

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments`
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [room.id, node.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (parentId: string | null = null) => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newComment,
            parentId,
            mentions: [], // You can implement mention parsing here
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to post comment");

      setNewComment("");
      setReplyingTo(null);
      fetchComments(); // Refresh comments
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );

      if (!response.ok) throw new Error("Failed to update comment");

      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete comment");
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handlePinComment = async (commentId: string, pin: boolean) => {
    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: pin }),
        }
      );

      if (!response.ok) throw new Error("Failed to pin comment");
      fetchComments();
    } catch (error) {
      console.error("Error pinning comment:", error);
    }
  };

  const handleResolveComment = async (commentId: string, resolve: boolean) => {
    try {
      const response = await fetch(
        `/api/rooms/${room.id}/nodes/${node.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isResolved: resolve }),
        }
      );

      if (!response.ok) throw new Error("Failed to resolve comment");
      fetchComments();
    } catch (error) {
      console.error("Error resolving comment:", error);
    }
  };

  const getReplies = (commentId: string) => {
    return comments.filter((comment) => comment.parentId === commentId);
  };

  const topLevelComments = comments.filter((comment) => !comment.parentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse">Loading comments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-muted-foreground">
            Discussing: <strong>{node.title}</strong> in{" "}
            <strong>{room.title}</strong>
          </p>
        </div>

        {/* New Comment Form */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Textarea
              placeholder="Add a comment... Use @ to mention someone"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-24 mb-3"
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {canEdit
                  ? "You can comment and reply"
                  : "You can view comments"}
              </div>
              <Button
                onClick={() => handleSubmitComment()}
                disabled={!newComment.trim() || submitting || !canEdit}
              >
                <Send className="w-4 h-4 mr-2" />
                Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="space-y-4">
          {topLevelComments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No comments yet. Start the discussion!</p>
              </CardContent>
            </Card>
          ) : (
            topLevelComments.map((comment) => (
              <CommentThread
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
                newComment={newComment}
                setNewComment={setNewComment}
                onSubmitReply={handleSubmitComment}
                canEdit={canEdit}
                submitting={submitting}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Comment Component
function CommentThread({
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
  newComment,
  setNewComment,
  onSubmitReply,
  canEdit,
  submitting,
}: any) {
  const isAuthor = comment.author._id === currentUserId;
  const canModerate = userRole === "owner" || userRole === "editor";

  return (
    <Card className={`${comment.isPinned ? "border-yellow-400 border-2" : ""}`}>
      <CardContent className="p-4">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {comment.author.username?.[0]?.toUpperCase() ||
                  comment.author.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {comment.author.username || comment.author.email}
                </span>
                {comment.isPinned && (
                  <PinIcon className="w-4 h-4 text-yellow-500" />
                )}
                {comment.isResolved && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolved
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                {new Date(comment.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canModerate && (
                <DropdownMenuItem
                  onClick={() => onPin(comment._id, !comment.isPinned)}
                >
                  <PinIcon className="w-4 h-4 mr-2" />
                  {comment.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
              )}
              {(isAuthor || canModerate) && (
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
              {isAuthor && (
                <DropdownMenuItem onClick={() => onEdit(comment)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isAuthor && (
                <DropdownMenuItem
                  onClick={() => onDelete(comment._id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Comment Content */}
        {editingComment === comment._id ? (
          <div className="mb-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-20 mb-2"
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => onUpdate(comment._id)}
                disabled={!editContent.trim() || submitting}
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editingComment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap mb-3">{comment.content}</p>
        )}

        {/* Comment Actions */}
        <div className="flex items-center space-x-4 text-xs">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReply}
              disabled={submitting}
            >
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {replyingTo === comment._id && (
          <div className="mt-4 ml-8">
            <Textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-20 mb-2"
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment._id)}
                disabled={!newComment.trim() || submitting}
              >
                <Send className="w-4 h-4 mr-1" />
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => replyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-4 ml-8 space-y-3 border-l-2 border-border pl-4">
            {replies.map((reply: Comment) => (
              <CommentThread
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
                newComment={newComment}
                setNewComment={setNewComment}
                onSubmitReply={onSubmitReply}
                canEdit={canEdit}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
