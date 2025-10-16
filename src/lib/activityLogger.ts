import { Db, ObjectId } from "mongodb";

export type ActivityType = 
  | "role_changed"
  | "member_removed"
  | "member_joined"
  | "room_created"
  | "room_deleted"
  | "room_updated";

export interface ActivityLog {
  _id?: ObjectId;
  roomId: ObjectId;
  userId: ObjectId;
  actorId: ObjectId;
  type: ActivityType;
  details: Record<string, any>;
  timestamp: Date;
}

export async function logActivity(
  db: Db,
  roomId: ObjectId,
  actorId: ObjectId,
  userId: ObjectId,
  type: ActivityType,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await db.collection("activityLogs").insertOne({
      roomId,
      userId,
      actorId,
      type,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}