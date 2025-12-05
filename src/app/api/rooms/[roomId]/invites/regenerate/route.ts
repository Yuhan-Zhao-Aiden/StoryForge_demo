import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode, hashInviteCode } from "@/lib/invites";
import { getUserRoomRole, hasPermission } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }  
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  const { roomId } = await context.params;
  const roomObjId = new ObjectId(roomId);

  const userIdObj = new ObjectId(user.id);
  const userRole = await getUserRoomRole(db, roomObjId, userIdObj);
  if (!userRole || !hasPermission(userRole, "INVITE_COLLABORATORS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.collection("roomInvites").updateMany(
    { roomId: roomObjId, disabled: false },
    { $set: { disabled: true } }
  );

  const code = generateInviteCode(10);
  const codeHash = hashInviteCode(code);
  const now = new Date();

  await db.collection("roomInvites").insertOne({
    roomId: roomObjId,
    codeHash,
    role: "viewer",
    maxUses: null,
    uses: 0,
    expiresAt: null,
    createdBy: userIdObj,
    createdAt: now,
    disabled: false,
  });

  return NextResponse.json({ code }, { status: 201 });
}
