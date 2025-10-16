import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import EditorShell from "@/components/editor/EditorShell";

type PageParams = {
  params: {
    roomId: string;
  };
};

type RoomMetadata = {
  id: string;
  title: string;
  subtitle?: string | null;
  role: "owner" | "editor" | "viewer";
};

async function loadRoomMetadata(roomId: string, userId: string): Promise<RoomMetadata> {
  if (!ObjectId.isValid(roomId)) {
    notFound();
  }

  const db = await getDb();
  const roomObjectId = new ObjectId(roomId);
  const userObjectId = new ObjectId(userId);

  const room = await db.collection("rooms").findOne<{
    _id: ObjectId;
    ownerId: ObjectId;
    title: string;
    subtitle?: string | null;
  }>(
    { _id: roomObjectId },
    { projection: { title: 1, subtitle: 1, ownerId: 1 } },
  );

  if (!room) {
    notFound();
  }

  let role: "owner" | "editor" | "viewer" = "viewer";

  if (room.ownerId.equals(userObjectId)) {
    role = "owner";
  } else {
    const membership = await db
      .collection("roomMembers")
      .findOne<{ role: "owner" | "editor" | "viewer" }>({ roomId: roomObjectId, userId: userObjectId }, { projection: { role: 1 } });

    if (!membership) {
      // Hide existence of the room if the user is not a collaborator or owner.
      notFound();
    }

    role = membership.role ?? "viewer";
  }

  return {
    id: roomId,
    title: room.title,
    subtitle: room.subtitle ?? null,
    role,
  };
}

export default async function RoomEditorPage({ params }: PageParams) {
  const user = await getCurrentUser();
  const { roomId } = await params;

  if (!user?.id) {
    redirect(`/login?redirect=/rooms/${roomId}/editor`);
  }

  if (!ObjectId.isValid(user.id)) {
    redirect("/login");
  }

  const room = await loadRoomMetadata(roomId, user.id);

  return <EditorShell room={room} currentUserId={user.id} />;
}
