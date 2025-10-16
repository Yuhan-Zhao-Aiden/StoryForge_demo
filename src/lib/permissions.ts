import { ObjectId, Db } from "mongodb";

export type RoomRole = "owner" | "editor" | "viewer";

export const PERMISSIONS = {
  DELETE_ROOM: ["owner"],
  UPDATE_ROOM: ["owner", "editor"],
  INVITE_COLLABORATORS: ["owner"],
  MANAGE_ROLES: ["owner"],
  REMOVE_COLLABORATORS: ["owner"],
  CREATE_NODES: ["owner", "editor"],
  UPDATE_NODES: ["owner", "editor"],
  DELETE_NODES: ["owner", "editor"],
  CREATE_EDGES: ["owner", "editor"],
  UPDATE_EDGES: ["owner", "editor"],
  DELETE_EDGES: ["owner", "editor"],
  VIEW_ROOM: ["owner", "editor", "viewer"],
  VIEW_NODES: ["owner", "editor", "viewer"],
  VIEW_EDGES: ["owner", "editor", "viewer"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: RoomRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export async function getUserRoomRole(
  db: Db,
  roomId: ObjectId,
  userId: ObjectId
): Promise<RoomRole | null> {
  const room = await db.collection("rooms").findOne(
    { _id: roomId },
    { projection: { ownerId: 1 } }
  );

  if (!room) return null;
  if (room.ownerId?.equals(userId)) return "owner";

  const membership = await db.collection("roomMembers").findOne(
    { roomId, userId },
    { projection: { role: 1 } }
  );

  return membership?.role ?? null;
}

export async function verifyRoomPermission(
  db: Db,
  roomId: ObjectId,
  userId: ObjectId,
  permission: Permission
): Promise<{ authorized: boolean; role: RoomRole | null }> {
  const role = await getUserRoomRole(db, roomId, userId);
  if (!role) return { authorized: false, role: null };
  
  return { authorized: hasPermission(role, permission), role };
}

export function canManageRole(managerRole: RoomRole, targetRole: RoomRole): boolean {
  if (managerRole !== "owner") return false;
  return targetRole !== "owner";
}

export function isValidRoleTransition(fromRole: RoomRole, toRole: RoomRole): boolean {
  if (fromRole === "owner" || toRole === "owner") return false;
  return (fromRole === "editor" && toRole === "viewer") || 
         (fromRole === "viewer" && toRole === "editor");
}
