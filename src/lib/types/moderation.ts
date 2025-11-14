import { z } from "zod";
import { objectIdSchema } from "./editor";

export const flagReasonSchema = z.enum([
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate_content",
  "copyright",
  "other",
]);

export const contentTypeSchema = z.enum(["node", "comment"]);

export const flagContentSchema = z.object({
  contentType: contentTypeSchema,
  contentId: objectIdSchema,
  reason: flagReasonSchema,
  description: z.string().max(500).optional(),
});

export const flaggedContentSchema = z.object({
  _id: objectIdSchema,
  roomId: objectIdSchema,
  contentType: contentTypeSchema,
  contentId: objectIdSchema,
  reason: flagReasonSchema,
  description: z.string().optional().nullable(),
  flaggedBy: objectIdSchema,
  flaggedAt: z.date(),
  status: z.enum(["pending", "reviewed", "dismissed", "removed"]).default("pending"),
  reviewedBy: objectIdSchema.optional().nullable(),
  reviewedAt: z.date().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
});

export type FlagReason = z.infer<typeof flagReasonSchema>;
export type ContentType = z.infer<typeof contentTypeSchema>;
export type FlagContent = z.infer<typeof flagContentSchema>;
export type FlaggedContent = z.infer<typeof flaggedContentSchema>;

export const flagReasonLabels: Record<FlagReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate Speech",
  inappropriate_content: "Inappropriate Content",
  copyright: "Copyright Violation",
  other: "Other",
};

