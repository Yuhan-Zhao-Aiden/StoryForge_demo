import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, context: { params: { roomId: string } }) {
  const { roomId } = context.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = await getDb();

  const result = await db.collection("roomMembers").deleteOne({
    roomId: new ObjectId(roomId),
    userId: new ObjectId(user.id),
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Could not leave room" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
