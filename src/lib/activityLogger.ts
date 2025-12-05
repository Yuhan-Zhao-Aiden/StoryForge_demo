import { Db, ObjectId } from "mongodb";

export type ActivityType = 
  // Member actions
  | "role_changed"
  | "member_removed"
  | "member_joined"
  | "member_invited"
  // Room actions
  | "room_created"
  | "room_deleted"
  | "room_updated"
  | "room_settings_changed"
  // Node actions
  | "node_created"
  | "node_updated"
  | "node_deleted"
  | "node_duplicated"
  // Edge actions
  | "edge_created"
  | "edge_deleted"
  // Content moderation
  | "content_flagged"
  | "content_unflagged"
  | "content_removed"
  // Export actions
  | "export_created"
  | "export_downloaded";

export interface ActivityLog {
  _id?: ObjectId;
  roomId: ObjectId;
  actorId: ObjectId;
  userId?: ObjectId; // Optional - only for user-related actions
  type: ActivityType;
  details: Record<string, any>;
  timestamp: Date;
}

export interface LogActivityParams {
  db: Db;
  roomId: ObjectId;
  actorId: ObjectId;
  type: ActivityType;
  details?: Record<string, any>;
  userId?: ObjectId; // Optional - for user-targeted actions
}

export async function logActivity({
  db,
  roomId,
  actorId,
  type,
  details = {},
  userId,
}: LogActivityParams): Promise<void> {
  try {
    const logEntry: Omit<ActivityLog, '_id'> = {
      roomId,
      actorId,
      type,
      details,
      timestamp: new Date(),
    };

    if (userId) {
      logEntry.userId = userId;
    }

    await db.collection("activityLogs").insertOne(logEntry);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

// Helper function for backwards compatibility
export async function logActivityLegacy(
  db: Db,
  roomId: ObjectId,
  actorId: ObjectId,
  userId: ObjectId,
  type: ActivityType,
  details: Record<string, any> = {}
): Promise<void> {
  return logActivity({
    db,
    roomId,
    actorId,
    userId,
    type,
    details,
  });
}