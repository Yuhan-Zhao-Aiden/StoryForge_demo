"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag, AlertTriangle } from "lucide-react";
import { FlagReason, flagReasonLabels, ContentType } from "@/lib/types/moderation";

type Props = {
  roomId: string;
  contentType: ContentType;
  contentId: string;
  trigger?: React.ReactNode;
  onFlagged?: () => void;
};

export function FlagContentButton({
  roomId,
  contentType,
  contentId,
  trigger,
  onFlagged,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [reason, setReason] = React.useState<FlagReason | "">("");
  const [description, setDescription] = React.useState("");

  async function handleFlag() {
    if (!reason) {
      setError("Please select a reason");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/rooms/${roomId}/moderation/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to flag content" }));
        throw new Error(errorData.error || "Failed to flag content");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setReason("");
        setDescription("");
        setSuccess(false);
        onFlagged?.();
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to flag content. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4 mr-1" />
            Flag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Flag Inappropriate Content
          </DialogTitle>
          <DialogDescription>
            Report content that violates community guidelines. Your report will be reviewed by room administrators.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="flag-reason">Reason for Flagging *</Label>
            <Select value={reason} onValueChange={(value: FlagReason) => setReason(value)}>
              <SelectTrigger id="flag-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(flagReasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="flag-description">Additional Details (Optional)</Label>
            <Textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context about why this content should be reviewed..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">
              Content flagged successfully. Thank you for helping keep the community safe.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setReason("");
              setDescription("");
              setError(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleFlag} disabled={loading || !reason || success}>
            {loading ? "Flagging..." : success ? "Flagged" : "Submit Flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

