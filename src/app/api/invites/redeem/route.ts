import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { hashInviteCode } from "@/lib/invites";

const bodySchema = z.object({
  code: z.string().min(4),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.errors ?? "Invalid body" }, { status: 400 });
  }

  const codeHash = hashInviteCode(parsed.code);
  const now = new Date();

  // Find a valid invite
  const invite = await db.collection("roomInvites").findOne({
    codeHash,
    disabled: { $ne: true },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }

  // Check usage limit (no $expr so it works without agg features)
  if (invite.maxUses != null && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "Invite has reached its usage limit" }, { status: 400 });
  }

  const roomId = invite.roomId as ObjectId;
  const userId = new ObjectId(user.id);

  // Idempotent: if already member, succeed
  const existing = await db.collection("roomMembers").findOne({ roomId, userId });
  if (existing) {
    return NextResponse.json(
      { roomId: roomId.toString(), role: existing.role, alreadyMember: true },
      { status: 200 }
    );
  }

  // Insert membership, then increment uses (no transaction)
  try {
    await db.collection("roomMembers").insertOne({
      roomId,
      userId,
      role: invite.role, // from invite default
      joinedAt: now,
    });

    const update: any = { $inc: { uses: 1 } };
    if (invite.maxUses != null && invite.uses + 1 >= invite.maxUses) {
      update.$set = { disabled: true };
    }
    await db.collection("roomInvites").updateOne({ _id: invite._id }, update);

    return NextResponse.json(
      { roomId: roomId.toString(), role: invite.role },
      { status: 200 }
    );
  } catch (err) {
    // If insertOne fails due to unique(roomId,userId) (if you set it), return idempotent success
    const again = await db.collection("roomMembers").findOne({ roomId, userId });
    if (again) {
      return NextResponse.json(
        { roomId: roomId.toString(), role: again.role, alreadyMember: true },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: "Failed to redeem invite" }, { status: 500 });
  }
}
