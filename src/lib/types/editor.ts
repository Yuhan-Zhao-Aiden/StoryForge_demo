import { z } from "zod";

// ------------------------------------------------------------
// Shared enums & basic schemas
// ------------------------------------------------------------

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Expected a 24 character hex ObjectId");

export const nodeTypeSchema = z.enum(["scene", "choice", "ending", "note"], {
  errorMap: () => ({ message: "Unsupported story node type." }),
});

export const edgeTypeSchema = z.enum(["normal", "choice", "alt"], {
  errorMap: () => ({ message: "Unsupported edge type." }),
});

export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex value");

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.05).max(4).default(1),
});

// ------------------------------------------------------------
// Node content schema
// ------------------------------------------------------------

export const mediaItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["image", "audio", "video", "link", "other"]).default("other"),
  url: z.string().url("Media item must include a valid URL"),
  caption: z.string().optional(),
});

export const nodeContentSchema = z.object({
  text: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  summary: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  media: z.array(mediaItemSchema).default([]),
});

// ------------------------------------------------------------
// Node schema
// ------------------------------------------------------------

const timestampSchema = z
  .union([z.date(), z.string(), z.number()])
  .transform((value) => {
    if (value instanceof Date) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value");
    }
    return date;
  });

export const storyNodeSchema = z.object({
  id: z.string().min(1),
  roomId: objectIdSchema,
  title: z.string().min(1, "Node title is required"),
  type: nodeTypeSchema,
  color: hexColorSchema.default("#2563eb"),
  position: nodePositionSchema,
  labels: z.array(z.string().min(1)).default([]),
  content: nodeContentSchema.default({}),
  collapsed: z.boolean().default(false),
  createdBy: objectIdSchema.optional(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});

export const newStoryNodeSchema = storyNodeSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // allow temporary IDs generated client-side before persistence
    clientId: z.string().uuid().optional(),
  });

export type StoryNode = z.infer<typeof storyNodeSchema>;
export type NewStoryNode = z.infer<typeof newStoryNodeSchema>;

export const nodeUpdateSchema = z.object({
  id: objectIdSchema,
  title: z.string().min(1).optional(),
  type: nodeTypeSchema.optional(),
  color: hexColorSchema.optional(),
  position: nodePositionSchema.optional(),
  labels: z.array(z.string().min(1)).optional(),
  content: nodeContentSchema.optional(),
  collapsed: z.boolean().optional(),
});

export type NodeUpdate = z.infer<typeof nodeUpdateSchema>;

// ------------------------------------------------------------
// Edge schema
// ------------------------------------------------------------

export const storyEdgeSchema = z.object({
  id: z.string().min(1),
  roomId: objectIdSchema,
  source: z.string().min(1),
  target: z.string().min(1),
  type: edgeTypeSchema.default("normal"),
  label: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  createdAt: timestampSchema.optional(),
});

export const newStoryEdgeSchema = storyEdgeSchema.omit({
  id: true,
  createdAt: true,
});

export type StoryEdge = z.infer<typeof storyEdgeSchema>;
export type NewStoryEdge = z.infer<typeof newStoryEdgeSchema>;

export const edgeUpdateSchema = z.object({
  id: objectIdSchema,
  source: objectIdSchema.optional(),
  target: objectIdSchema.optional(),
  type: edgeTypeSchema.optional(),
  label: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type EdgeUpdate = z.infer<typeof edgeUpdateSchema>;

// ------------------------------------------------------------
// Batch payloads & editor state
// ------------------------------------------------------------

export const graphViewportSchema = viewportSchema;

export const storyGraphSchema = z.object({
  nodes: z.array(storyNodeSchema),
  edges: z.array(storyEdgeSchema),
  viewport: graphViewportSchema.optional(),
});

export const nodePositionUpdateSchema = z.object({
  id: z.string().min(1),
  position: nodePositionSchema,
});

export const nodeBatchUpdateSchema = z.object({
  roomId: objectIdSchema,
  positions: z.array(nodePositionUpdateSchema).default([]),
  collapsed: z.array(z.object({ id: z.string().min(1), value: z.boolean() })).default([]),
  viewport: graphViewportSchema.optional(),
});

export const graphSyncPayloadSchema = z.object({
  nodes: z.array(newStoryNodeSchema).optional(),
  edges: z.array(newStoryEdgeSchema).optional(),
  updates: nodeBatchUpdateSchema.optional(),
  removedNodeIds: z.array(z.string()).default([]),
  removedEdgeIds: z.array(z.string()).default([]),
});

export type GraphViewport = z.infer<typeof graphViewportSchema>;
export type StoryGraph = z.infer<typeof storyGraphSchema>;
export type GraphSyncPayload = z.infer<typeof graphSyncPayloadSchema>;
