import { z } from "zod";
import { objectIdSchema } from "./editor";

export const exportFormatSchema = z.enum(["json", "markdown", "pdf", "html"]);

export const exportOptionsSchema = z.object({
  includeImages: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  includeComments: z.boolean().default(false),
  format: exportFormatSchema.default("json"),
});

export const createExportSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: exportOptionsSchema.optional(),
  expiresAt: z
    .union([z.date(), z.string(), z.number()])
    .transform((value) => {
      if (value instanceof Date) return value;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    })
    .nullable()
    .optional(),
  maxDownloads: z.number().int().positive().nullable().optional(),
  password: z.string().min(4).max(50).optional().nullable(),
});

export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
export type CreateExport = z.infer<typeof createExportSchema>;

export type StoryExport = {
  _id: string;
  roomId: string;
  shareToken: string;
  name: string | null;
  options: ExportOptions;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxDownloads: number | null;
  downloadCount: number;
  password: string | null;
  disabled: boolean;
};

export type ExportLink = {
  _id: string;
  shareToken: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  downloadCount: number;
  maxDownloads: number | null;
  disabled: boolean;
  shareUrl: string;
};

