// lib/invites.ts
import { createHash, randomBytes } from "crypto";

export function generateInviteCode(length = 10): string {
  return randomBytes(16).toString("base64url").slice(0, length);
}

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("base64");
}
