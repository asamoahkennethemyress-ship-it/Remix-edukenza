export type NotificationType = 
  | 'Announcement'
  | 'Assignment'
  | 'Attendance'
  | 'Payment'
  | 'Results'
  | 'Timetable'
  | 'Examination'
  | 'System Alert'
  | 'Security Alert';

export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Urgent' | 'Important';

export type UserRole = 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface NotificationItem {
  id?: string;
  notificationId: string;
  recipientId: string; // User UID, 'ALL', 'ROLE:role_name', or 'SCHOOL:schoolId:ROLE:role'
  recipientRole?: UserRole | 'all';
  schoolId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string; // ISO string timestamp
  actionUrl?: string; // Optional URL or dashboard tab navigation target
  createdBy: string; // Name/email or system trigger source
}

export interface UserNotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  announcementEnabled: boolean;
  reminderEnabled: boolean;
  updatedAt?: string;
}

export interface EmailNotificationTemplate {
  templateId: string;
  schoolId: string; // 'global' or schoolId
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
  updatedAt: string;
}

export interface FCMTokenRecord {
  tokenId: string;
  userId: string;
  schoolId?: string;
  token: string;
  deviceInfo?: string;
  createdAt: string;
}
