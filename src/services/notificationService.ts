import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { 
  NotificationItem, 
  NotificationType, 
  NotificationPriority, 
  UserNotificationSettings, 
  EmailNotificationTemplate, 
  UserRole 
} from '../types/notifications';
import { showDesktopNotification, playNotificationChime } from '../utils/fcm';

/**
 * Creates and delivers a new notification to Firestore
 */
export async function sendNotification(data: {
  recipientId: string; // Specific User UID, 'ALL', or 'ROLE:role_name', 'SCHOOL:schoolId'
  recipientRole?: UserRole | 'all';
  schoolId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  createdBy?: string;
}): Promise<string> {
  const path = 'notifications';
  try {
    const notificationRef = doc(collection(db, path));
    const newNotification: NotificationItem = {
      notificationId: notificationRef.id,
      recipientId: data.recipientId,
      recipientRole: data.recipientRole || 'all',
      schoolId: data.schoolId || '',
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority || 'Normal',
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: data.actionUrl || '',
      createdBy: data.createdBy || 'EDUkenZA System'
    };

    await setDoc(notificationRef, newNotification);

    // Also trigger desktop/audio notification if browser permits
    showDesktopNotification(data.title, { body: data.message });
    playNotificationChime();

    return notificationRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Alias for sendNotification
 */
export const createNotification = sendNotification;
export const subscribeUserNotifications = subscribeToUserNotifications;

/**
 * Real-time Listener for user notifications
 */
export function subscribeToUserNotifications(
  userId: string,
  userRole: UserRole | string,
  schoolId: string | undefined,
  onNotificationsChange: (notifications: NotificationItem[]) => void,
  userClass?: string
): Unsubscribe {
  const path = 'notifications';
  
  // Create queries for exact recipient match, broadcast to all, or broadcast to user role/school
  const q = query(
    collection(db, path),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: NotificationItem[] = [];
      snapshot.forEach((d) => {
        const rawItem = { id: d.id, ...d.data() } as any;
        const item = rawItem as NotificationItem;
        
        // Filter logic for recipient matching
        const matchesUser = item.recipientId === userId;
        const matchesAll = item.recipientId === 'ALL' || (item.recipientRole as string) === 'all';
        const isStudentTarget = userRole === 'student' && (item.recipientId === 'ALL_STUDENTS' || (item.recipientRole as string) === 'student' || (item.recipientRole as string) === 'students');
        const isParentTarget = userRole === 'parent' && (item.recipientId === 'ALL_PARENTS' || (item.recipientRole as string) === 'parent' || (item.recipientRole as string) === 'parents');
        const isTeacherTarget = userRole === 'teacher' && (item.recipientId === 'ALL_TEACHERS' || (item.recipientRole as string) === 'teacher' || (item.recipientRole as string) === 'teachers');
        
        const matchesRole = item.recipientRole === userRole || item.recipientId === `ROLE:${userRole}` || isStudentTarget || isParentTarget || isTeacherTarget;
        const matchesSchoolRole = schoolId && item.schoolId === schoolId && (item.recipientRole === userRole || matchesAll || isStudentTarget || isParentTarget || isTeacherTarget);
        const matchesClass = userClass && (item.recipientId === `CLASS:${userClass}` || rawItem.targetClass === userClass);
        const isPlatformOwnerRecipient = userRole === 'platform_owner' || (userRole as string) === 'owner';

        if (matchesUser || matchesAll || matchesRole || matchesSchoolRole || matchesClass || isPlatformOwnerRecipient) {
          items.push(item);
        }
      });

      onNotificationsChange(items);
    },
    (error) => {
      console.warn('[NOTIFICATIONS] Real-time subscription warning:', error);
      onNotificationsChange([]);
    }
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Mark all notifications as read for a recipient
 */
export async function markAllNotificationsAsRead(notifications: NotificationItem[]): Promise<void> {
  const unreadItems = notifications.filter(n => !n.isRead && n.notificationId);
  for (const item of unreadItems) {
    await markNotificationAsRead(item.notificationId);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch or initialize User Notification Preferences
 */
export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
  const path = `notificationSettings/${userId}`;
  const defaultSettings: UserNotificationSettings = {
    userId,
    pushEnabled: true,
    emailEnabled: true,
    announcementEnabled: true,
    reminderEnabled: true,
    updatedAt: new Date().toISOString()
  };

  try {
    const snap = await getDoc(doc(db, 'notificationSettings', userId));
    if (snap.exists()) {
      return snap.data() as UserNotificationSettings;
    } else {
      await setDoc(doc(db, 'notificationSettings', userId), defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.warn("Falling back to default notification settings due to read error:", error);
    return defaultSettings;
  }
}

/**
 * Save User Notification Settings
 */
export async function saveUserNotificationSettings(settings: UserNotificationSettings): Promise<void> {
  const path = `notificationSettings/${settings.userId}`;
  try {
    await setDoc(doc(db, 'notificationSettings', settings.userId), {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch Email Settings & Templates for a School
 */
export async function getEmailSettings(schoolId: string) {
  const path = `emailSettings/${schoolId}`;
  try {
    const snap = await getDoc(doc(db, 'emailSettings', schoolId));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn("Could not fetch email settings:", error);
    return null;
  }
}

/**
 * Save Email Settings & Templates
 */
export async function saveEmailSettings(schoolId: string, settingsData: any): Promise<void> {
  const path = `emailSettings/${schoolId}`;
  try {
    await setDoc(doc(db, 'emailSettings', schoolId), {
      schoolId,
      ...settingsData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =========================================================================
// AUTOMATIC NOTIFICATION TRIGGERS
// =========================================================================

/**
 * Trigger 1: New Student Created -> Notify School Admin
 */
export async function triggerNewStudentCreated(studentName: string, schoolId: string, adminUid?: string) {
  await sendNotification({
    recipientId: adminUid || `ROLE:school_admin`,
    recipientRole: 'school_admin',
    schoolId,
    title: 'New Student Registration',
    message: `Student '${studentName}' has been newly enrolled in the system.`,
    type: 'System Alert',
    priority: 'Normal',
    createdBy: 'System Trigger'
  });
}

export async function triggerNewStudentNotification(data: {
  schoolId: string;
  studentName: string;
  studentId?: string;
  className?: string;
  createdBy?: string;
}) {
  await sendNotification({
    recipientId: `ROLE:school_admin`,
    recipientRole: 'school_admin',
    schoolId: data.schoolId,
    title: 'New Student Enrolled',
    message: `Student '${data.studentName}' (ID: ${data.studentId || 'N/A'}) has been enrolled.`,
    type: 'System Alert',
    priority: 'Normal',
    createdBy: data.createdBy || 'School Admin'
  });
}

/**
 * Trigger 2: Assignment Created & Published -> Notify Students & Linked Parents
 */
export async function triggerAssignmentCreated(title: string, className: string, schoolId: string) {
  await sendNotification({
    recipientId: `CLASS:${className}`,
    recipientRole: 'student',
    schoolId,
    title: 'New Academic Assignment',
    message: `A new assignment '${title}' has been published for ${className}.`,
    type: 'Assignment',
    priority: 'Normal',
    createdBy: 'Teacher System'
  });
}

export async function triggerAssignmentPublishedNotification(params: {
  assignmentId: string;
  title: string;
  subjectName: string;
  className: string;
  dueDate: string;
  schoolId: string;
  createdByTeacherName?: string;
  recipientsMode?: 'Class' | 'Individual' | 'Specific Students' | string;
  recipientStudentIds?: string[];
}) {
  const {
    assignmentId,
    title,
    subjectName,
    className,
    dueDate,
    schoolId,
    createdByTeacherName = 'Teacher',
    recipientsMode = 'Class',
    recipientStudentIds = []
  } = params;

  // 1. Send Class Broadcast Notification
  await sendNotification({
    recipientId: `CLASS:${className}`,
    recipientRole: 'student',
    schoolId,
    title: `New Assignment: ${title}`,
    message: `${createdByTeacherName} published a new ${subjectName} assignment '${title}' for ${className}, due on ${dueDate}.`,
    type: 'Assignment',
    priority: 'High',
    actionUrl: '/student/assignments',
    createdBy: createdByTeacherName
  });

  // 2. Fetch Targeted Student UIDs
  let targetStudentUids: string[] = [];
  if (recipientsMode === 'Individual' && recipientStudentIds.length > 0) {
    targetStudentUids = recipientStudentIds;
  } else if (className) {
    try {
      const qSt = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('className', '==', className)
      );
      const snapSt = await getDocs(qSt);
      snapSt.forEach(d => {
        const uid = d.data().uid || d.data().studentId || d.id;
        if (uid) targetStudentUids.push(uid);
      });
    } catch (e) {
      console.warn("Querying students for notification error:", e);
    }
  }

  // Direct notifications for targeted students
  for (const studentUid of Array.from(new Set(targetStudentUids))) {
    await sendNotification({
      recipientId: studentUid,
      recipientRole: 'student',
      schoolId,
      title: `New Assignment: ${title}`,
      message: `${createdByTeacherName} assigned a new ${subjectName} homework '${title}' due on ${dueDate}.`,
      type: 'Assignment',
      priority: 'High',
      actionUrl: '/student/assignments',
      createdBy: createdByTeacherName
    });
  }

  // 3. Find and Notify Linked Parents
  try {
    const parentUids = new Set<string>();
    const qRel = query(
      collection(db, 'parentStudentRelations'),
      where('schoolId', '==', schoolId)
    );
    const snapRel = await getDocs(qRel);
    snapRel.forEach(d => {
      const data = d.data();
      if (targetStudentUids.length === 0 || targetStudentUids.includes(data.studentId)) {
        if (data.parentId) parentUids.add(data.parentId);
        if (data.parentUid) parentUids.add(data.parentUid);
      }
    });

    for (const parentUid of Array.from(parentUids)) {
      await sendNotification({
        recipientId: parentUid,
        recipientRole: 'parent',
        schoolId,
        title: `Child Assignment Published: ${title}`,
        message: `A new ${subjectName} assignment '${title}' was published for ${className}, due on ${dueDate}.`,
        type: 'Assignment',
        priority: 'Normal',
        actionUrl: '/parent/assignments',
        createdBy: createdByTeacherName
      });
    }

    // Broadcast notification for parents of the school
    await sendNotification({
      recipientId: `ROLE:parent`,
      recipientRole: 'parent',
      schoolId,
      title: `New Class Homework: ${title}`,
      message: `New ${subjectName} assignment '${title}' published for ${className}, due on ${dueDate}.`,
      type: 'Assignment',
      priority: 'Normal',
      actionUrl: '/parent/assignments',
      createdBy: createdByTeacherName
    });
  } catch (err) {
    console.warn("Parent notification error:", err);
  }
}

/**
 * Trigger: Submission Graded -> Notify Student & Linked Parent
 */
export async function triggerSubmissionGradedNotification(params: {
  submissionId?: string;
  assignmentId?: string;
  assignmentTitle: string;
  subjectName: string;
  studentId: string;
  studentName?: string;
  score: number;
  totalMarks: number;
  letterGrade?: string;
  feedback?: string;
  schoolId: string;
  teacherName?: string;
}) {
  const {
    assignmentTitle,
    subjectName,
    studentId,
    studentName = 'Student',
    score,
    totalMarks,
    letterGrade,
    feedback,
    schoolId,
    teacherName = 'Teacher'
  } = params;

  const scoreText = `${score}/${totalMarks}${letterGrade ? ` (${letterGrade})` : ''}`;

  // 1. Direct Student Notification
  if (studentId) {
    await sendNotification({
      recipientId: studentId,
      recipientRole: 'student',
      schoolId,
      title: `Grade Published: ${assignmentTitle}`,
      message: `Your teacher graded your ${subjectName} submission: ${scoreText}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
      type: 'Assignment',
      priority: 'High',
      actionUrl: '/student/assignments',
      createdBy: teacherName
    });
  }

  // 2. Direct Linked Parent Notification
  try {
    const parentUids = new Set<string>();
    if (studentId) {
      const qRel = query(
        collection(db, 'parentStudentRelations'),
        where('studentId', '==', studentId)
      );
      const snapRel = await getDocs(qRel);
      snapRel.forEach(d => {
        const data = d.data();
        if (data.parentId) parentUids.add(data.parentId);
        if (data.parentUid) parentUids.add(data.parentUid);
      });
    }

    for (const parentUid of Array.from(parentUids)) {
      await sendNotification({
        recipientId: parentUid,
        recipientRole: 'parent',
        schoolId,
        title: `Child Grade Released: ${studentName} - ${assignmentTitle}`,
        message: `${studentName}'s ${subjectName} assignment '${assignmentTitle}' was graded: ${scoreText}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
        type: 'Assignment',
        priority: 'High',
        actionUrl: '/parent/assignments',
        createdBy: teacherName
      });
    }

    if (parentUids.size === 0) {
      await sendNotification({
        recipientId: `ROLE:parent`,
        recipientRole: 'parent',
        schoolId,
        title: `Grade Released: ${studentName} - ${assignmentTitle}`,
        message: `${studentName}'s ${subjectName} assignment '${assignmentTitle}' was graded: ${scoreText}.`,
        type: 'Assignment',
        priority: 'Normal',
        actionUrl: '/parent/assignments',
        createdBy: teacherName
      });
    }
  } catch (err) {
    console.warn("Parent graded notification error:", err);
  }
}

/**
 * Trigger 3: Assignment Submitted -> Notify Teacher
 */
export async function triggerAssignmentSubmitted(title: string, studentName: string, teacherUid: string, schoolId: string) {
  await sendNotification({
    recipientId: teacherUid,
    recipientRole: 'teacher',
    schoolId,
    title: 'Assignment Submitted',
    message: `${studentName} has submitted '${title}'.`,
    type: 'Assignment',
    priority: 'Normal',
    createdBy: 'Student Portal'
  });
}

/**
 * Trigger 4: Attendance Marked Absent -> Notify Parent
 */
export async function triggerAttendanceMarkedAbsent(studentName: string, parentUid: string, schoolId: string, date: string) {
  await sendNotification({
    recipientId: parentUid,
    recipientRole: 'parent',
    schoolId,
    title: 'Attendance Alert: Absenteeism Recorded',
    message: `${studentName} was marked ABSENT for morning registration on ${date}.`,
    type: 'Attendance',
    priority: 'High',
    createdBy: 'Attendance System'
  });
}

/**
 * Trigger 5: Result Approved -> Notify Teacher
 */
export async function triggerResultApproved(examName: string, teacherUid: string, schoolId: string) {
  await sendNotification({
    recipientId: teacherUid,
    recipientRole: 'teacher',
    schoolId,
    title: 'Result Approval Confirmed',
    message: `Assessment results for '${examName}' have been approved by School Administration.`,
    type: 'Results',
    priority: 'Normal',
    createdBy: 'School Admin'
  });
}

/**
 * Trigger 6: Result Published -> Notify Students and Parents
 */
export async function triggerResultPublished(examName: string, schoolId: string) {
  // Notify Students
  await sendNotification({
    recipientId: 'ALL_STUDENTS',
    recipientRole: 'student',
    schoolId,
    title: 'Official Academic Results Published',
    message: `Results for '${examName}' are now published and available on your portal.`,
    type: 'Results',
    priority: 'High',
    createdBy: 'Academic Board'
  });

  // Notify Parents
  await sendNotification({
    recipientId: 'ALL_PARENTS',
    recipientRole: 'parent',
    schoolId,
    title: 'Student Term Results Published',
    message: `Official performance results for '${examName}' have been released for viewing.`,
    type: 'Results',
    priority: 'High',
    createdBy: 'Academic Board'
  });
}

/**
 * Trigger 7: Payment Recorded -> Notify Parent
 */
export async function triggerPaymentRecorded(amountFormatted: string, receiptNo: string, parentUid: string, schoolId: string) {
  await sendNotification({
    recipientId: parentUid,
    recipientRole: 'parent',
    schoolId,
    title: 'School Fee Payment Confirmed',
    message: `Payment of ${amountFormatted} (Receipt #${receiptNo}) was received and verified.`,
    type: 'Payment',
    priority: 'Normal',
    createdBy: 'Finance Dept'
  });
}

/**
 * Trigger 8: Timetable Updated -> Notify Affected Users
 */
export async function triggerTimetableUpdated(className: string, schoolId: string) {
  await sendNotification({
    recipientId: `CLASS:${className}`,
    recipientRole: 'all',
    schoolId,
    title: 'Academic Timetable Updated',
    message: `The official class timetable for ${className} has been updated. Please review schedule changes.`,
    type: 'Timetable',
    priority: 'Normal',
    createdBy: 'Administration'
  });
}

/**
 * Trigger: Assignment Due Soon -> Notify Students & Linked Parents
 */
export async function triggerAssignmentDueSoonNotification(params: {
  title: string;
  subjectName: string;
  className: string;
  dueDate: string;
  schoolId: string;
}) {
  const { title, subjectName, className, dueDate, schoolId } = params;

  await sendNotification({
    recipientId: `CLASS:${className}`,
    recipientRole: 'student',
    schoolId,
    title: `Assignment Due Soon: ${title}`,
    message: `Reminder: Your ${subjectName} assignment '${title}' is due soon on ${dueDate}. Please submit before the deadline.`,
    type: 'Assignment',
    priority: 'High',
    actionUrl: '/student/assignments',
    createdBy: 'Academic Deadline Monitor'
  });

  await sendNotification({
    recipientId: `ROLE:parent`,
    recipientRole: 'parent',
    schoolId,
    title: `Child Assignment Due Soon: ${title}`,
    message: `Reminder: Homework '${title}' for ${className} is due on ${dueDate}.`,
    type: 'Assignment',
    priority: 'Normal',
    actionUrl: '/parent/assignments',
    createdBy: 'Academic Deadline Monitor'
  });
}

/**
 * Trigger: Attendance Recorded -> Notify Parent / Student
 */
export async function triggerAttendanceRecordedNotification(params: {
  studentName: string;
  studentId: string;
  status: string;
  date: string;
  schoolId: string;
  parentUid?: string;
}) {
  const { studentName, studentId, status, date, schoolId, parentUid } = params;

  if (parentUid) {
    await sendNotification({
      recipientId: parentUid,
      recipientRole: 'parent',
      schoolId,
      title: `Daily Attendance Update: ${studentName}`,
      message: `${studentName} was recorded as '${status.toUpperCase()}' on ${date}.`,
      type: 'Attendance',
      priority: status === 'Absent' ? 'High' : 'Normal',
      createdBy: 'Attendance Register'
    });
  } else {
    await sendNotification({
      recipientId: `ROLE:parent`,
      recipientRole: 'parent',
      schoolId,
      title: `Attendance Record Updated`,
      message: `Daily attendance for ${studentName} on ${date} recorded as '${status}'.`,
      type: 'Attendance',
      priority: 'Normal',
      createdBy: 'Attendance Register'
    });
  }
}

/**
 * Trigger: Report Card / Academic Report Published
 */
export async function triggerReportCardPublishedNotification(params: {
  studentName: string;
  studentId?: string;
  term: string;
  academicYear: string;
  schoolId: string;
  studentUid?: string;
  parentUid?: string;
}) {
  const { studentName, studentId, term, academicYear, schoolId, studentUid, parentUid } = params;

  if (studentUid) {
    await sendNotification({
      recipientId: studentUid,
      recipientRole: 'student',
      schoolId,
      title: `Term Report Card Released: ${term}`,
      message: `Your official academic report card for ${term} (${academicYear}) has been published. Check your reports portal.`,
      type: 'Results',
      priority: 'High',
      actionUrl: '/student/reports',
      createdBy: 'Academic Registrar'
    });
  }

  if (parentUid) {
    await sendNotification({
      recipientId: parentUid,
      recipientRole: 'parent',
      schoolId,
      title: `Child Report Card Published: ${studentName}`,
      message: `Official term report card for ${studentName} (${term} - ${academicYear}) is now published for viewing.`,
      type: 'Results',
      priority: 'High',
      actionUrl: '/parent/reports',
      createdBy: 'Academic Registrar'
    });
  }

  // Broadcast backup
  await sendNotification({
    recipientId: 'ALL_PARENTS',
    recipientRole: 'parent',
    schoolId,
    title: `Academic Report Cards Released (${term})`,
    message: `Term report cards for ${term} have been finalized and published.`,
    type: 'Results',
    priority: 'High',
    actionUrl: '/parent/reports',
    createdBy: 'Academic Registrar'
  });
}

/**
 * Trigger: Invoice Created -> Notify Parent & Student
 */
export async function triggerInvoiceCreatedNotification(params: {
  invoiceNumber: string;
  feeType: string;
  amount: number;
  dueDate: string;
  schoolId: string;
  parentUid?: string;
  studentUid?: string;
}) {
  const { invoiceNumber, feeType, amount, dueDate, schoolId, parentUid, studentUid } = params;

  const msg = `New invoice #${invoiceNumber} for ${feeType} (GHS ${amount.toLocaleString()}) issued, due on ${dueDate}.`;

  if (parentUid) {
    await sendNotification({
      recipientId: parentUid,
      recipientRole: 'parent',
      schoolId,
      title: `Fee Invoice Issued: #${invoiceNumber}`,
      message: msg,
      type: 'Payment',
      priority: 'High',
      actionUrl: '/parent/payments',
      createdBy: 'Finance Dept'
    });
  }

  if (studentUid) {
    await sendNotification({
      recipientId: studentUid,
      recipientRole: 'student',
      schoolId,
      title: `Fee Invoice Issued: #${invoiceNumber}`,
      message: msg,
      type: 'Payment',
      priority: 'Normal',
      actionUrl: '/student/payments',
      createdBy: 'Finance Dept'
    });
  }

  await sendNotification({
    recipientId: 'ALL_PARENTS',
    recipientRole: 'parent',
    schoolId,
    title: `Fee Invoice Update: #${invoiceNumber}`,
    message: msg,
    type: 'Payment',
    priority: 'Normal',
    actionUrl: '/parent/payments',
    createdBy: 'Finance Dept'
  });
}

/**
 * Trigger: Receipt Generated -> Notify Parent & Student
 */
export async function triggerReceiptGeneratedNotification(params: {
  receiptNumber: string;
  amountPaid: number;
  feeType: string;
  schoolId: string;
  parentUid?: string;
  studentUid?: string;
}) {
  const { receiptNumber, amountPaid, feeType, schoolId, parentUid, studentUid } = params;
  const msg = `Official receipt #${receiptNumber} generated for GHS ${amountPaid.toLocaleString()} (${feeType}).`;

  if (parentUid) {
    await sendNotification({
      recipientId: parentUid,
      recipientRole: 'parent',
      schoolId,
      title: `Official Fee Receipt #${receiptNumber}`,
      message: msg,
      type: 'Payment',
      priority: 'Normal',
      actionUrl: '/parent/receipts',
      createdBy: 'Finance Office'
    });
  }

  if (studentUid) {
    await sendNotification({
      recipientId: studentUid,
      recipientRole: 'student',
      schoolId,
      title: `Official Fee Receipt #${receiptNumber}`,
      message: msg,
      type: 'Payment',
      priority: 'Normal',
      actionUrl: '/student/receipts',
      createdBy: 'Finance Office'
    });
  }
}

/**
 * Trigger: School Announcement Published
 */
export async function triggerSchoolAnnouncementNotification(params: {
  title: string;
  audience: string; // 'All Users' | 'Teachers' | 'Parents' | 'Students' | 'Specific Class'
  schoolId: string;
  authorName?: string;
  targetClass?: string;
  targetUid?: string;
}) {
  const { title, audience, schoolId, authorName = 'School Administration', targetClass, targetUid } = params;

  let recipientRole: UserRole | 'all' = 'all';
  let recipientId = 'ALL';

  if (audience === 'Teachers' || audience === 'Teachers only') {
    recipientRole = 'teacher';
    recipientId = 'ALL_TEACHERS';
  } else if (audience === 'Parents' || audience === 'Parents only') {
    recipientRole = 'parent';
    recipientId = 'ALL_PARENTS';
  } else if (audience === 'Students' || audience === 'Students only') {
    recipientRole = 'student';
    recipientId = 'ALL_STUDENTS';
  } else if (targetClass || audience === 'Specific Class' || audience === 'Class') {
    recipientId = `CLASS:${targetClass || 'Grade 10A'}`;
  } else if (targetUid) {
    recipientId = targetUid;
  }

  await sendNotification({
    recipientId,
    recipientRole,
    schoolId,
    title: `School Announcement: ${title}`,
    message: `New official announcement '${title}' published for ${audience}.`,
    type: 'Announcement',
    priority: 'High',
    createdBy: authorName
  });
}

/**
 * Trigger: School Event / Calendar Notice
 */
export async function triggerSchoolEventNotification(params: {
  title: string;
  date: string;
  venue?: string;
  audience: string;
  schoolId: string;
}) {
  const { title, date, venue, audience, schoolId } = params;

  await sendNotification({
    recipientId: 'ALL',
    recipientRole: 'all',
    schoolId,
    title: `Upcoming School Event: ${title}`,
    message: `Event '${title}' scheduled for ${date}${venue ? ` at ${venue}` : ''}. Audience: ${audience}.`,
    type: 'Announcement',
    priority: 'Normal',
    createdBy: 'Events Coordinator'
  });
}

/**
 * Trigger: Holiday Announcement
 */
export async function triggerHolidayAnnouncementNotification(params: {
  title: string;
  startDate: string;
  endDate: string;
  schoolId: string;
}) {
  const { title, startDate, endDate, schoolId } = params;

  await sendNotification({
    recipientId: 'ALL',
    recipientRole: 'all',
    schoolId,
    title: `Official School Holiday: ${title}`,
    message: `School holiday '${title}' declared from ${startDate} to ${endDate}. Classes resume after ${endDate}.`,
    type: 'Announcement',
    priority: 'High',
    createdBy: 'School Executive'
  });
}

/**
 * Trigger: Exam Timetable Published
 */
export async function triggerExamTimetablePublishedNotification(params: {
  examTitle: string;
  className?: string;
  schoolId: string;
}) {
  const { examTitle, className, schoolId } = params;

  await sendNotification({
    recipientId: className ? `CLASS:${className}` : 'ALL_STUDENTS',
    recipientRole: 'student',
    schoolId,
    title: `Examination Schedule Released: ${examTitle}`,
    message: `Official exam timetable for '${examTitle}' ${className ? `(${className})` : ''} has been published.`,
    type: 'Examination',
    priority: 'High',
    actionUrl: '/student/examinations',
    createdBy: 'Examinations Board'
  });

  await sendNotification({
    recipientId: 'ALL_PARENTS',
    recipientRole: 'parent',
    schoolId,
    title: `Exam Timetable Published: ${examTitle}`,
    message: `Exam timetable for '${examTitle}' is available. Please ensure student preparation.`,
    type: 'Examination',
    priority: 'High',
    actionUrl: '/parent/examinations',
    createdBy: 'Examinations Board'
  });
}

/**
 * Trigger: Message Received -> Direct Notification
 */
export async function triggerMessageReceivedNotification(params: {
  senderName: string;
  recipientUid: string;
  recipientRole: UserRole;
  subject: string;
  schoolId: string;
}) {
  const { senderName, recipientUid, recipientRole, subject, schoolId } = params;

  await sendNotification({
    recipientId: recipientUid,
    recipientRole,
    schoolId,
    title: `New Direct Message from ${senderName}`,
    message: `Subject: "${subject}". Tap to open messages and respond.`,
    type: 'Announcement',
    priority: 'Normal',
    createdBy: senderName
  });
}

/**
 * Platform Owner Alerts: School Registration / Subscription / System Security
 */
export async function triggerPlatformOwnerAlert(title: string, message: string, type: NotificationType = 'System Alert') {
  await sendNotification({
    recipientId: 'ROLE:platform_owner',
    recipientRole: 'platform_owner',
    title,
    message,
    type,
    priority: 'Urgent',
    createdBy: 'SaaS Platform Core'
  });
}

/**
 * Trigger Email Dispatch (Simulated/Log)
 */
export async function sendAutomaticEmail(params: {
  toEmail: string;
  subject: string;
  body: string;
  templateType: string;
  schoolId: string;
}) {
  console.log(`[AUTOMATIC EMAIL SYSTEM] Sending ${params.templateType} to ${params.toEmail}: "${params.subject}"`);
  return true;
}

/**
 * Trigger Push Notification Dispatch (Web / Android / iOS)
 */
export async function sendPushNotification(params: {
  recipientId: string;
  title: string;
  message: string;
  category: string;
  schoolId: string;
}) {
  console.log(`[PUSH NOTIFICATION SYSTEM] Push alert to ${params.recipientId} [Category: ${params.category}]: "${params.title}"`);
  showDesktopNotification(params.title, { body: params.message });
  playNotificationChime();
  return true;
}


/**
 * Get Email Notification Templates for a School or Global
 */
export async function getEmailNotificationTemplates(schoolId: string): Promise<EmailNotificationTemplate[]> {
  const defaultTemplates: EmailNotificationTemplate[] = [
    {
      templateId: 'tmpl_student_welcome',
      schoolId: schoolId || 'global',
      name: 'Welcome New Student',
      type: 'Announcement',
      subject: 'Welcome to {{schoolName}}!',
      body: 'Dear {{studentName}},\n\nWelcome to {{schoolName}}. Your student ID is {{studentId}}.\n\nBest regards,\nAdministration',
      enabled: true,
      variables: ['{{studentName}}', '{{studentId}}', '{{schoolName}}'],
      updatedAt: new Date().toISOString()
    },
    {
      templateId: 'tmpl_result_published',
      schoolId: schoolId || 'global',
      name: 'Results Publication Alert',
      type: 'Results',
      subject: 'Academic Results Published for {{examName}}',
      body: 'Dear Student/Parent,\n\nThe results for {{examName}} have been officially published. Please log in to your portal to inspect the report card.\n\nThank you.',
      enabled: true,
      variables: ['{{examName}}', '{{studentName}}'],
      updatedAt: new Date().toISOString()
    },
    {
      templateId: 'tmpl_payment_receipt',
      schoolId: schoolId || 'global',
      name: 'Fee Payment Confirmation',
      type: 'Payment',
      subject: 'Receipt #{{receiptNo}} - School Fee Payment Confirmed',
      body: 'Dear Parent,\n\nWe have successfully received payment of {{amount}} for {{studentName}}.\nReceipt Number: {{receiptNo}}.\n\nRegards,\nFinance Office',
      enabled: true,
      variables: ['{{amount}}', '{{receiptNo}}', '{{studentName}}'],
      updatedAt: new Date().toISOString()
    }
  ];

  try {
    const q = query(
      collection(db, 'emailTemplates'),
      where('schoolId', 'in', [schoolId, 'global'])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const loaded = snap.docs.map(docSnap => docSnap.data() as EmailNotificationTemplate);
      const loadedIds = new Set(loaded.map(t => t.templateId));
      const missingDefaults = defaultTemplates.filter(t => !loadedIds.has(t.templateId));
      return [...loaded, ...missingDefaults];
    }
  } catch (error) {
    console.warn("Could not fetch email templates, returning defaults:", error);
  }

  return defaultTemplates;
}

/**
 * Save Email Notification Template
 */
export async function saveEmailNotificationTemplate(template: EmailNotificationTemplate): Promise<void> {
  const templateId = template.templateId || `tmpl_${Date.now()}`;
  const path = `emailTemplates/${templateId}`;
  try {
    await setDoc(doc(db, 'emailTemplates', templateId), {
      ...template,
      templateId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
