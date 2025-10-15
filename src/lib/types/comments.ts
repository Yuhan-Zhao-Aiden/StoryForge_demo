import { z } from "zod";
import { objectIdSchema } from "./editor";

export const commentSchema = z.object({
  _id: objectIdSchema,
  roomId: objectIdSchema,
  nodeId: objectIdSchema,
  parentId: objectIdSchema.optional().nullable(),
  authorId: objectIdSchema,
  content: z.string().min(1, "Comment content is required"),
  mentions: z.array(objectIdSchema).default([]),
  isPinned: z.boolean().default(false),
  isResolved: z.boolean().default(false),
  resolvedBy: objectIdSchema.optional().nullable(),
  resolvedAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createCommentSchema = z.object({
  roomId: objectIdSchema,
  nodeId: objectIdSchema,
  parentId: objectIdSchema.optional().nullable(),
  content: z.string().min(1, "Comment content is required"),
  mentions: z.array(objectIdSchema).default([]),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").optional(),
  mentions: z.array(objectIdSchema).optional(),
  isPinned: z.boolean().optional(),
  isResolved: z.boolean().optional(),
});

export type Comment = z.infer<typeof commentSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;
    