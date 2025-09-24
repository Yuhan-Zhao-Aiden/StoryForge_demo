import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode, hashInviteCode } from "@/lib/invites";

const bodySchema = z.object({
  role: z.enum(["editor", "viewer"]).default("viewer"),
  maxUses: z.number().int().positive().nullable().optional(), // null = unlimited
  expiresAt: z.string().datetime().nullable().optional(),      // ISO string or null
});

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { roomId } = await params;
  const roomObjId = new ObjectId(roomId);

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.errors ?? "Invalid body" }, { status: 400 });
  }

  // Permission: only owner (adjust if editors can create invites)
  const room = await db.collection("rooms").findOne(
    { _id: roomObjId },
    { projection: { ownerId: 1 } }
  );
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.ownerId?.toString() !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const code = generateInviteCode(10);
  const codeHash = hashInviteCode(code);
  const now = new Date();
  const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
  console.log(parsed);
  try {
    await db.collection("roomInvites").insertOne({
      roomId: roomObjId,
      codeHash,
      role: parsed.role,
      maxUses: parsed.maxUses ?? null,
      uses: 0,
      expiresAt,
      createdBy: new ObjectId(user.id),
      createdAt: now,
      disabled: false,
    });

    // Return plaintext code ONCE for the UI
    return NextResponse.json(
      { code, role: parsed.role, expiresAt, maxUses: parsed.maxUses ?? null },
      { status: 201 }
    );
  } catch (err) {
    // If unique(codeHash) collides (rare), caller can retry
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
