import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode, hashInviteCode } from "@/lib/invites";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";

type RouteContext = {
  params: { roomId: string } | Promise<{ roomId: string }>;
};

const bodySchema = z.object({
  role: z.enum(["editor", "viewer"]).default("viewer"),
  maxUses: z.number().int().positive().nullable().optional(), // null = unlimited
  expiresAt: z.string().datetime().nullable().optional(),      // ISO string or null
});

async function getRoomIdFromContext(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.roomId;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const roomId = await getRoomIdFromContext(context);
  const roomObjId = new ObjectId(roomId);

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.errors ?? "Invalid body" }, { status: 400 });
  }
  const userIdObj = new ObjectId(user.id);
  const userRole = await getUserRoomRole(db, roomObjId, userIdObj);
  
  if (!userRole || !hasPermission(userRole, "INVITE_COLLABORATORS")) {
    return NextResponse.json({ error: "Forbidden - Only room owners can create invites" }, { status: 403 });
  }
  
  const room = await db.collection("rooms").findOne(
    { _id: roomObjId },
    { projection: { ownerId: 1 } }
  );
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

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

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const roomId = await getRoomIdFromContext(context);
  const roomObjId = new ObjectId(roomId);

  const userIdObj = new ObjectId(user.id);
  const userRole = await getUserRoomRole(db, roomObjId, userIdObj);
  if (!userRole || !hasPermission(userRole, "INVITE_COLLABORATORS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Disable all active invites for this room
  await db.collection("roomInvites").updateMany(
    { roomId: roomObjId, disabled: false },
    { $set: { disabled: true } }
  );

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const roomId = await getRoomIdFromContext(context);
  const roomObjId = new ObjectId(roomId);

  const userIdObj = new ObjectId(user.id);
  const userRole = await getUserRoomRole(db, roomObjId, userIdObj);
  if (!userRole || !hasPermission(userRole, "INVITE_COLLABORATORS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only return active invites with a non-empty code
  const docs = await db.collection("roomInvites")
    .find({ roomId: roomObjId, disabled: false, codePlain: { $exists: true, $ne: "" } })
    .sort({ createdAt: -1 })
    .toArray();

  const invites = docs.map(d => ({
    code: d.codePlain,
    role: d.role,
    disabled: !!d.disabled,
    expiresAt: d.expiresAt ?? null,
    createdAt: d.createdAt,
    uses: d.uses ?? 0,
    maxUses: d.maxUses ?? null,
  }));

  return NextResponse.json({ invites });
}
