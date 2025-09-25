// app/api/rooms/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";           // <-- your helper (path may differ)
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional().nullable(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// (optional) ensure unique-ish slug by appending a counter if needed
async function ensureUniqueSlug(db: any, base: string) {
  let slug = base;
  let i = 2;
  // Try up to a reasonable limit
  while (await db.collection("rooms").findOne({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function POST(req: Request) {
  const user = await getCurrentUser(); // -> { id, username, email }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.errors ?? "Invalid request" }, { status: 400 });
  }

  const db = await getDb();

  const ownerId = new ObjectId(user.id);
  const now = new Date();
  const baseSlug = slugify(parsed.title);
  const slug = await ensureUniqueSlug(db, baseSlug);

  const roomDoc = {
    ownerId,
    title: parsed.title,
    subtitle: parsed.subtitle ?? null,
    collaborators: 0, // non-owner members count
    slug,
    visibility: parsed.visibility,
    createdAt: now,
    updatedAt: now,
  };

  let insertedRoomId: ObjectId | null = null;

  try {
    // 1) Insert room
    const roomRes = await db.collection("rooms").insertOne(roomDoc);
    insertedRoomId = roomRes.insertedId;

    // 2) Insert owner membership
    await db.collection("roomMembers").insertOne({
      roomId: insertedRoomId,
      userId: ownerId,
      role: "owner",
      joinedAt: now,
    });

    return NextResponse.json({ roomId: insertedRoomId.toString(), slug }, { status: 201 });
  } catch (err: any) {
    // Compensating rollback if membership insert failed after room insert
    if (insertedRoomId) {
      try {
        await db.collection("rooms").deleteOne({ _id: insertedRoomId });
      } catch {
        // swallow cleanup errors
      }
    }
    console.error("Create story failed:", err);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
