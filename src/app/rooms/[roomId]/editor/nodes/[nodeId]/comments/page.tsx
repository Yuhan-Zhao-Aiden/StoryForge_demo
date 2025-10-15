import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import CommentsSection from "@/components/comments/CommentsSection";

type PageParams = {
  params: {
    roomId: string;
    nodeId: string;
  };
};

async function loadNodeData(roomId: string, nodeId: string, userId: string) {
  if (!ObjectId.isValid(roomId) || !ObjectId.isValid(nodeId)) {
    notFound();
  }

  const db = await getDb();
  const roomObjectId = new ObjectId(roomId);
  const nodeObjectId = new ObjectId(nodeId);
  const userObjectId = new ObjectId(userId);

  // Check room access
  const room = await db
    .collection("rooms")
    .findOne({ _id: roomObjectId }, { projection: { title: 1, ownerId: 1 } });

  if (!room) notFound();

  let role: "owner" | "editor" | "viewer" = "viewer";
  if (room.ownerId.equals(userObjectId)) {
    role = "owner";
  } else {
    const membership = await db
      .collection("roomMembers")
      .findOne({ roomId: roomObjectId, userId: userObjectId });

    if (!membership) notFound();
    role = membership.role ?? "viewer";
  }

  // Get node data
  const node = await db
    .collection("nodes")
    .findOne(
      { _id: nodeObjectId, roomId: roomObjectId },
      { projection: { title: 1, type: 1 } }
    );

  if (!node) notFound();

  return {
    room: { id: roomId, title: room.title },
    node: { id: nodeId, title: node.title, type: node.type },
    userRole: role,
  };
}

export default async function CommentsPage({ params }: PageParams) {
  const user = await getCurrentUser();
  const { roomId, nodeId } = await params;

  if (!user?.id) {
    redirect(
      `/login?redirect=/rooms/${roomId}/editor/nodes/${nodeId}/comments`
    );
  }

  if (!ObjectId.isValid(user.id)) {
    redirect("/login");
  }

  const data = await loadNodeData(roomId, nodeId, user.id);

  return <CommentsSection {...data} currentUserId={user.id} />;
}
