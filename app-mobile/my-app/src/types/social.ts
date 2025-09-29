export interface SocialNotification {
  id: string;
  type: "follow" | "like" | "comment";
  fromUser: {
    id: string;
    name: string;
    profilePhoto?: string;
  };
  postId?: string | null;
  commentId?: string | null;
  message: string;
  date: string; // ISO string
  status: string;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: SocialNotification[];
}
