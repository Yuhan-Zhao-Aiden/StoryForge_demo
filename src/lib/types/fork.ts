import { z } from "zod";
import { objectIdSchema } from "@/lib/types/editor";

export const branchSchema = z.object({
  _id: objectIdSchema,
  roomId: objectIdSchema,
  parentRoomId: objectIdSchema,
  name: z.string().min(1, "Branch name is required"),
  description: z.string().optional().nullable(),
  createdBy: objectIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

export type StoryBranch = z.infer<typeof branchSchema>;

export const createBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  description: z.string().optional().nullable(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;