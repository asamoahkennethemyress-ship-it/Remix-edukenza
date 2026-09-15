import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { db, auth, browserPopupRedirectResolver } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export interface GoogleMeetClass {
  id?: string;
  schoolId: string;
  title: string;
  subject: string;
  className: string;
  teacherId: string;
  teacherName: string;
  meetLink: string;
  meetingId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  description?: string;
  timeZone?: string;
  googleEventId?: string;
  isApproved?: boolean;
  isRecordingEnabled?: boolean;
  recordingUrl?: string;
  recordingDate?: string;
  allowEarlyJoin?: boolean;
  lmsMaterialIds?: string[];
  lmsAssignmentIds?: string[];
  cancellationReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OnlineClassAttendance {
  id?: string;
  schoolId: string;
  meetingId: string;
  classId?: string;
  className: string;
  subject: string;
  studentId: string;
  studentName: string;
  joinTime: string; // ISO or formatted HH:mm:ss
  leaveTime?: string;
  durationMinutes?: number;
  status: 'Present' | 'Late' | 'Early Exit' | 'Absent';
  createdAt?: any;
}

export interface VleMaterial {
  id?: string;
  schoolId?: string;
  meetingId: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'ppt' | 'image' | 'video' | 'audio' | 'link';
  fileUrl: string;
  uploadedBy: string;
  createdAt?: any;
}

export interface VleChatMessage {
  id?: string;
  schoolId?: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student' | 'admin';
  text: string;
  reaction?: string;
  isPinned?: boolean;
  createdAt?: any;
}

export interface VleLiveQuiz {
  id?: string;
  schoolId?: string;
  meetingId: string;
  question: string;
  type: 'mcq' | 'true_false' | 'poll' | 'short_answer';
  options?: string[];
  correctOptionIndex?: number;
  status: 'active' | 'closed';
  createdAt?: any;
}

export interface VleQuizResponse {
  id?: string;
  quizId: string;
  meetingId: string;
  studentId: string;
  studentName: string;
  selectedOptionIndex?: number;
  shortAnswerText?: string;
  isCorrect?: boolean;
  createdAt?: any;
}

export interface VleBreakoutGroup {
  id?: string;
  meetingId: string;
  groupName: string;
  assignedStudentNames: string[];
  taskDescription?: string;
  meetLink?: string;
}

export interface VleAiNote {
  id?: string;
  meetingId: string;
  subject: string;
  summary: string;
  keyConcepts: string[];
  flashcards: { question: string; answer: string }[];
  practiceQuestions: string[];
  learningObjectives: string[];
  createdAt?: any;
}

// ----------------------------------------------------
// WHITEBOARD VECTOR OBJECT & REAL-TIME INTERFACES
// ----------------------------------------------------

export type WhiteboardTool = 
  | 'select' 
  | 'pen' 
  | 'pencil' 
  | 'highlighter' 
  | 'eraser' 
  | 'line' 
  | 'arrow' 
  | 'rect' 
  | 'circle' 
  | 'triangle' 
  | 'text' 
  | 'sticky' 
  | 'image' 
  | 'math';

export interface WhiteboardObject {
  id: string;
  type: WhiteboardTool;
  userId: string;
  userName: string;
  userRole: 'teacher' | 'student' | 'admin';
  points?: { x: number; y: number }[]; // for freehand pen / pencil / highlighter strokes
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
  color: string;
  strokeWidth: number;
  opacity?: number;
  fillColor?: string; // transparent or hex
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  stickyColor?: string; // hex
  imageUrl?: string;
  mathFormula?: string;
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
  zIndex: number;
}

export interface WhiteboardSessionDoc {
  meetingId: string;
  schoolId: string;
  title?: string;
  objects: WhiteboardObject[];
  allowStudentDrawing: boolean;
  background: 'white' | 'grid' | 'dots' | 'lined' | 'blackboard' | 'greenboard';
  lastUpdatedByUid?: string;
  lastUpdatedByName?: string;
  updatedAt?: any;
}

export interface WhiteboardSnapshotDoc {
  id?: string;
  schoolId: string;
  meetingId: string;
  title: string;
  imageData: string; // PNG base64
  objectsJson?: string;
  savedBy: string;
  createdAt?: any;
}

// ----------------------------------------------------
// GOOGLE MEET OAUTH & CALENDAR API INTEGRATION
// ----------------------------------------------------

let inMemoryMeetToken: string | null = null;
let inMemoryMeetEmail: string | null = null;

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

/**
 * Obtain an OAuth access token for Google Calendar & Meet
 */
export async function getGoogleMeetAccessToken(forcePrompt = false): Promise<{ accessToken: string; email?: string }> {
  if (!forcePrompt && inMemoryMeetToken) {
    return { accessToken: inMemoryMeetToken, email: inMemoryMeetEmail || undefined };
  }

  const savedToken = sessionStorage.getItem('edukenza_gmeet_token');
  const savedEmail = sessionStorage.getItem('edukenza_gmeet_email');
  const tokenTimestamp = sessionStorage.getItem('edukenza_gmeet_token_time');

  if (!forcePrompt && savedToken && tokenTimestamp) {
    const elapsedMinutes = (Date.now() - parseInt(tokenTimestamp, 10)) / (1000 * 60);
    if (elapsedMinutes < 50) {
      inMemoryMeetToken = savedToken;
      inMemoryMeetEmail = savedEmail;
      return { accessToken: savedToken, email: savedEmail || undefined };
    }
  }

  const provider = new GoogleAuthProvider();
  GOOGLE_MEET_SCOPES.forEach((scope) => provider.addScope(scope));

  if (forcePrompt) {
    provider.setCustomParameters({ prompt: 'select_account' });
  }

  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an OAuth access token for Google Meet.');
    }

    const email = result.user?.email || undefined;
    inMemoryMeetToken = credential.accessToken;
    inMemoryMeetEmail = email || null;

    sessionStorage.setItem('edukenza_gmeet_token', credential.accessToken);
    if (email) sessionStorage.setItem('edukenza_gmeet_email', email);
    sessionStorage.setItem('edukenza_gmeet_token_time', Date.now().toString());

    return { accessToken: credential.accessToken, email };
  } catch (error: any) {
    console.error('Error authenticating with Google for Meet:', error);
    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
      throw new Error('Google authorization popup was closed before completing. Please try again.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in window was opened. Please complete the authorization.');
    }
    throw new Error(error.message || 'Failed to authenticate with Google Account for Meet & Calendar.');
  }
}

export function getCachedGoogleMeetAuthStatus(): { isConnected: boolean; email?: string } {
  const token = inMemoryMeetToken || sessionStorage.getItem('edukenza_gmeet_token');
  const email = inMemoryMeetEmail || sessionStorage.getItem('edukenza_gmeet_email') || undefined;
  const tokenTime = sessionStorage.getItem('edukenza_gmeet_token_time');

  if (token && tokenTime) {
    const elapsedMinutes = (Date.now() - parseInt(tokenTime, 10)) / (1000 * 60);
    if (elapsedMinutes < 50) {
      return { isConnected: true, email };
    }
  }
  return { isConnected: false };
}

export function clearGoogleMeetAccessToken(): void {
  inMemoryMeetToken = null;
  inMemoryMeetEmail = null;
  sessionStorage.removeItem('edukenza_gmeet_token');
  sessionStorage.removeItem('edukenza_gmeet_email');
  sessionStorage.removeItem('edukenza_gmeet_token_time');
}

/**
 * Creates a real Google Calendar Event with Google Meet conference data via Google Calendar API
 */
export async function createGoogleCalendarMeetEvent(params: {
  title: string;
  subject: string;
  className: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timeZone?: string;
  description?: string;
  accessToken: string;
}): Promise<{ meetLink: string; meetingId: string; eventId?: string }> {
  const timeZone = params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  const startDateTime = `${params.date}T${params.startTime}:00`;
  const endDateTime = `${params.date}T${params.endTime}:00`;
  const requestId = 'edukenza_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  const eventPayload = {
    summary: `${params.subject}: ${params.title} (${params.className})`,
    description: `${params.description || 'EDUkenZA Live Virtual Class'}\n\nSubject: ${params.subject}\nClass: ${params.className}\nTeacher: ${params.teacherName}`,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: timeZone
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone: timeZone
    },
    conferenceData: {
      createRequest: {
        requestId: requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody?.error?.message || `Google Calendar API error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const result = await response.json();
  const conferenceData = result.conferenceData;
  const entryPoints = conferenceData?.entryPoints || [];
  const videoEntry = entryPoints.find((ep: any) => ep.entryPointType === 'video');

  let meetLink = videoEntry?.uri || result.hangoutLink;
  let meetingId = conferenceData?.conferenceId;

  if (!meetLink) {
    // If conferenceData is still provisioning, construct from conferenceId or fallback
    if (meetingId) {
      meetLink = `https://meet.google.com/${meetingId}`;
    } else {
      const generated = generateGoogleMeetLink();
      meetLink = generated.meetLink;
      meetingId = generated.meetingId;
    }
  } else if (!meetingId) {
    const parts = meetLink.split('/');
    meetingId = parts[parts.length - 1];
  }

  return {
    meetLink,
    meetingId,
    eventId: result.id
  };
}

// Generate RFC-compliant Google Meet code: xxx-yyyy-zzz
export function generateGoogleMeetLink(prefix?: string): { meetLink: string; meetingId: string } {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  const meetingId = `${part1}-${part2}-${part3}`;
  const meetLink = `https://meet.google.com/${meetingId}`;
  return { meetLink, meetingId };
}

// Calculate meeting time status & countdown with starting-soon state
export function getMeetingTimeStatus(dateStr: string, startTimeStr: string, endTimeStr: string) {
  try {
    const now = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, startHour, startMinute);
    const endDate = new Date(year, month - 1, day, endHour, endMinute);

    const diffMs = startDate.getTime() - now.getTime();
    const endDiffMs = endDate.getTime() - now.getTime();

    // Starting soon: within 15 minutes before start time
    const isStartingSoon = diffMs > 0 && diffMs <= 15 * 60 * 1000;

    if (now >= startDate && now <= endDate) {
      return { isLive: true, isStartingSoon: false, isUpcoming: false, isPassed: false, diffSeconds: 0 };
    } else if (isStartingSoon) {
      return { isLive: false, isStartingSoon: true, isUpcoming: true, isPassed: false, diffSeconds: Math.floor(diffMs / 1000) };
    } else if (diffMs > 0) {
      return { isLive: false, isStartingSoon: false, isUpcoming: true, isPassed: false, diffSeconds: Math.floor(diffMs / 1000) };
    } else {
      return { isLive: false, isStartingSoon: false, isUpcoming: false, isPassed: true, diffSeconds: 0 };
    }
  } catch (err) {
    return { isLive: false, isStartingSoon: false, isUpcoming: false, isPassed: false, diffSeconds: 0 };
  }
}

// Format seconds into readable countdown HH:MM:SS
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ----------------------------------------------------
// FIRESTORE VLE SESSIONS & VIRTUAL CLASS MANAGEMENT
// ----------------------------------------------------

export async function createOnlineClassSession(data: Omit<GoogleMeetClass, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'googleMeetClasses'), {
      ...data,
      status: data.status || 'scheduled',
      isApproved: data.isApproved !== undefined ? data.isApproved : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Initialize the real-time whiteboard session for this meeting
    await initializeWhiteboardSession(docRef.id, data.schoolId, data.title);

    // Notify Students & Parents
    await broadcastClassNotification({
      schoolId: data.schoolId,
      className: data.className,
      title: `🗓️ New Online Class: ${data.subject}`,
      message: `Google Meet scheduled for ${data.date} at ${data.startTime}. Join link: ${data.meetLink}`,
      type: 'meet_created',
      meetingId: docRef.id
    });

    return docRef.id;
  } catch (err: any) {
    console.error('Error creating Google Meet session:', err);
    throw err;
  }
}

export async function broadcastClassNotification(params: {
  schoolId: string;
  className: string;
  title: string;
  message: string;
  type: string;
  meetingId?: string;
}) {
  try {
    await addDoc(collection(db, 'notifications'), {
      schoolId: params.schoolId,
      targetRole: 'all',
      targetClass: params.className,
      title: params.title,
      message: params.message,
      type: params.type || 'google_meet',
      category: 'online_class',
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Notification broadcast warning:', err);
  }
}

export async function updateOnlineClassSession(id: string, updates: Partial<GoogleMeetClass>): Promise<void> {
  try {
    const classRef = doc(db, 'googleMeetClasses', id);
    await updateDoc(classRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    if (updates.date || updates.startTime || updates.meetLink) {
      if (updates.schoolId && updates.className) {
        await broadcastClassNotification({
          schoolId: updates.schoolId,
          className: updates.className,
          title: `✏️ Online Class Updated: ${updates.subject || 'Google Meet'}`,
          message: `Meeting details updated for ${updates.className}. New Time: ${updates.date || ''} at ${updates.startTime || ''}`,
          type: 'meet_updated',
          meetingId: id
        });
      }
    }
  } catch (err: any) {
    console.error('Error updating Google Meet session:', err);
    throw err;
  }
}

export async function cancelOnlineClassSession(id: string, schoolId: string, className: string, subject: string, reason?: string): Promise<void> {
  try {
    const classRef = doc(db, 'googleMeetClasses', id);
    await updateDoc(classRef, {
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by teacher',
      updatedAt: serverTimestamp()
    });

    await broadcastClassNotification({
      schoolId,
      className,
      title: `❌ Online Class Cancelled: ${subject}`,
      message: `The Google Meet class for ${subject} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      type: 'meet_cancelled',
      meetingId: id
    });
  } catch (err: any) {
    console.error('Error cancelling Google Meet session:', err);
    throw err;
  }
}

export async function startOnlineClassSession(id: string): Promise<void> {
  try {
    const classRef = doc(db, 'googleMeetClasses', id);
    await updateDoc(classRef, {
      status: 'active',
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    console.error('Error starting Google Meet session:', err);
    throw err;
  }
}

export async function recordStudentMeetAttendance(attendance: Omit<OnlineClassAttendance, 'id' | 'createdAt'>): Promise<void> {
  try {
    const q = query(
      collection(db, 'onlineClassAttendance'),
      where('meetingId', '==', attendance.meetingId),
      where('studentId', '==', attendance.studentId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(collection(db, 'onlineClassAttendance'), {
        ...attendance,
        createdAt: serverTimestamp()
      });
    } else {
      const existingDoc = snap.docs[0];
      await updateDoc(doc(db, 'onlineClassAttendance', existingDoc.id), {
        leaveTime: attendance.leaveTime || new Date().toLocaleTimeString(),
        durationMinutes: attendance.durationMinutes || 45,
        status: attendance.status
      });
    }

    await addDoc(collection(db, 'attendanceLogs'), {
      schoolId: attendance.schoolId,
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      className: attendance.className,
      date: new Date().toISOString().split('T')[0],
      status: attendance.status === 'Present' || attendance.status === 'Late' ? 'Present' : 'Absent',
      mode: 'Google Meet Online',
      notes: `Joined Google Meet at ${attendance.joinTime} (${attendance.status})`,
      timestamp: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('Error recording online attendance:', err);
  }
}

export async function saveGoogleMeetRecording(meetingId: string, recordingUrl: string, teacherName?: string, subject?: string): Promise<void> {
  try {
    const classRef = doc(db, 'googleMeetClasses', meetingId);
    await updateDoc(classRef, {
      isRecordingEnabled: true,
      recordingUrl,
      recordingDate: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, 'googleMeetRecordings'), {
      meetingId,
      recordingUrl,
      teacherName: teacherName || 'Teacher',
      subject: subject || 'Class Session',
      createdAt: serverTimestamp()
    });
  } catch (err: any) {
    console.error('Error saving Google Meet recording:', err);
    throw err;
  }
}

// ----------------------------------------------------
// COLLABORATIVE WHITEBOARD SERVICE
// ----------------------------------------------------

export async function initializeWhiteboardSession(meetingId: string, schoolId: string, title?: string): Promise<void> {
  try {
    const sessionRef = doc(db, 'virtualClassroomWhiteboardSessions', meetingId);
    const existing = await getDoc(sessionRef);
    if (!existing.exists()) {
      await setDoc(sessionRef, {
        meetingId,
        schoolId,
        title: title || 'Live VLE Collaborative Board',
        objects: [],
        allowStudentDrawing: true,
        background: 'white',
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Could not initialize whiteboard session doc:', err);
  }
}

export async function syncWhiteboardSession(
  meetingId: string,
  schoolId: string,
  objects: WhiteboardObject[],
  allowStudentDrawing: boolean,
  background: 'white' | 'grid' | 'dots' | 'lined' | 'blackboard' | 'greenboard',
  userUid: string,
  userName: string
): Promise<void> {
  try {
    const sessionRef = doc(db, 'virtualClassroomWhiteboardSessions', meetingId);
    await setDoc(sessionRef, {
      meetingId,
      schoolId,
      objects,
      allowStudentDrawing,
      background,
      lastUpdatedByUid: userUid,
      lastUpdatedByName: userName,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Error syncing whiteboard session:', err);
    throw err;
  }
}

export async function saveWhiteboardSnapshot(params: {
  schoolId: string;
  meetingId: string;
  title: string;
  imageData: string;
  objectsJson?: string;
  savedBy: string;
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'virtualClassroomWhiteboards'), {
      schoolId: params.schoolId,
      meetingId: params.meetingId,
      title: params.title || `Snapshot ${new Date().toLocaleDateString()}`,
      imageData: params.imageData,
      objectsJson: params.objectsJson || '',
      savedBy: params.savedBy,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error('Error saving whiteboard snapshot:', err);
    throw err;
  }
}

export async function renameWhiteboardSnapshot(snapshotId: string, newTitle: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'virtualClassroomWhiteboards', snapshotId), {
      title: newTitle,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Error renaming whiteboard snapshot:', err);
    throw err;
  }
}

export async function deleteWhiteboardSnapshot(snapshotId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'virtualClassroomWhiteboards', snapshotId));
  } catch (err) {
    console.error('Error deleting whiteboard snapshot:', err);
    throw err;
  }
}
