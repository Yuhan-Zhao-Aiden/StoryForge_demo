export type NotificationType = "mention" | "reply" | "reaction" | "system";

export type Notification = {
  _id: string;
  userId: string; 
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity: {
    type: "comment" | "room" | "node";
    id: string;
    roomId?: string;
    nodeId?: string;
    commentId?: string;
  };
  read: boolean;
  createdAt: string;
  updatedAt: string;
  triggeredBy: {
    userId: string;
    username: string;
    email: string;
  };
};
