import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserContentItem, evaluateContentPermissions, UserContentType, UserShareScope } from '../types/userContent';

export const USER_CONTENT_COLLECTION = 'userCreatedContent';

/**
 * Creates and persists a user-owned content item in Firestore
 * Enforces ownership: ownerUid & createdBy MUST match currentUser.uid
 */
export async function createUserContent(
  data: {
    title: string;
    content: string;
    type: UserContentType;
    category?: string;
    tags?: string[];
    targetClass?: string;
    className?: string;
    subjectName?: string;
    studentId?: string;
    studentName?: string;
    isShared?: boolean;
    shareScope?: UserShareScope;
    sharedWithClasses?: string[];
    sharedWithRoles?: string[];
    metadata?: Record<string, any>;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: string;
  },
  currentUser: any
): Promise<string> {
  if (!currentUser?.uid && !currentUser?.id) {
    throw new Error('Authentication required to create content.');
  }

  const currentUid = currentUser.uid || currentUser.id;
  const currentRole = currentUser.role || 'user';
  const schoolId = currentUser.schoolId || '';

  const payload = {
    ownerUid: currentUid,
    createdBy: currentUid,
    creatorName: currentUser.fullName || currentUser.name || currentUser.email || 'User',
    creatorEmail: currentUser.email || '',
    ownerRole: currentRole,
    schoolId,

    title: data.title.trim() || 'Untitled Content',
    content: data.content,
    type: data.type,
    category: data.category || 'General',
    tags: data.tags || [],

    targetClass: data.targetClass || data.className || '',
    className: data.className || data.targetClass || '',
    subjectName: data.subjectName || '',
    studentId: data.studentId || '',
    studentName: data.studentName || '',

    isShared: Boolean(data.isShared),
    shareScope: data.shareScope || (data.isShared ? 'class' : 'private'),
    sharedWithClasses: data.sharedWithClasses || (data.targetClass ? [data.targetClass] : []),
    sharedWithRoles: data.sharedWithRoles || [],
    sharedAt: data.isShared ? serverTimestamp() : null,

    metadata: data.metadata || {},
    fileUrl: data.fileUrl || '',
    fileName: data.fileName || '',
    fileType: data.fileType || '',
    fileSize: data.fileSize || '',

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dateFormatted: new Date().toLocaleString()
  };

  const docRef = await addDoc(collection(db, USER_CONTENT_COLLECTION), payload);
  return docRef.id;
}

/**
 * Updates an existing content item after strict ownership and permission evaluation
 */
export async function updateUserContent(
  contentId: string,
  updates: Partial<UserContentItem>,
  currentUser: any
): Promise<void> {
  if (!currentUser?.uid && !currentUser?.id) {
    throw new Error('Authentication required.');
  }

  const docRef = doc(db, USER_CONTENT_COLLECTION, contentId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('Content not found.');
  }

  const existingData = { id: snap.id, ...snap.data() } as UserContentItem;
  const permissions = evaluateContentPermissions(existingData, currentUser);

  if (!permissions.canEdit) {
    throw new Error('Permission denied: You do not have authorization to edit this content.');
  }

  // Prevent transferring ownership unless explicitly platform owner
  const cleanUpdates: any = {
    ...updates,
    updatedAt: serverTimestamp(),
    dateFormatted: new Date().toLocaleString()
  };

  delete cleanUpdates.id;
  delete cleanUpdates.ownerUid;
  delete cleanUpdates.createdBy;
  delete cleanUpdates.createdAt;

  await updateDoc(docRef, cleanUpdates);
}

/**
 * Deletes an existing content item after strict ownership verification
 */
export async function deleteUserContent(
  contentId: string,
  currentUser: any
): Promise<void> {
  if (!currentUser?.uid && !currentUser?.id) {
    throw new Error('Authentication required.');
  }

  const docRef = doc(db, USER_CONTENT_COLLECTION, contentId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    // Already deleted
    return;
  }

  const existingData = { id: snap.id, ...snap.data() } as UserContentItem;
  const permissions = evaluateContentPermissions(existingData, currentUser);

  if (!permissions.canDelete) {
    throw new Error('Permission denied: You cannot delete content belonging to another user.');
  }

  await deleteDoc(docRef);
}

/**
 * Duplicates / copies any accessible content item into the current user's personal repository
 */
export async function duplicateUserContent(
  item: UserContentItem,
  currentUser: any
): Promise<string> {
  if (!currentUser?.uid && !currentUser?.id) {
    throw new Error('Authentication required.');
  }

  const currentUid = currentUser.uid || currentUser.id;
  const currentRole = currentUser.role || 'user';
  const schoolId = currentUser.schoolId || item.schoolId || '';

  const newDoc = {
    ownerUid: currentUid,
    createdBy: currentUid,
    creatorName: currentUser.fullName || currentUser.name || currentUser.email || 'User',
    creatorEmail: currentUser.email || '',
    ownerRole: currentRole,
    schoolId,

    title: `${item.title} (Copy)`,
    content: item.content,
    type: item.type,
    category: item.category || 'Draft',
    tags: item.tags || [],

    targetClass: item.targetClass || '',
    className: item.className || '',
    subjectName: item.subjectName || '',

    isShared: false,
    shareScope: 'private' as UserShareScope,
    sharedWithClasses: [],
    sharedWithRoles: [],

    metadata: {
      ...(item.metadata || {}),
      duplicatedFromId: item.id,
      duplicatedFromCreator: item.creatorName
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dateFormatted: new Date().toLocaleString()
  };

  const docRef = await addDoc(collection(db, USER_CONTENT_COLLECTION), newDoc);
  return docRef.id;
}

/**
 * Updates sharing configuration for an owned content item
 */
export async function setContentSharing(
  contentId: string,
  sharing: {
    isShared: boolean;
    shareScope: UserShareScope;
    targetClass?: string;
    sharedWithClasses?: string[];
    sharedWithRoles?: string[];
  },
  currentUser: any
): Promise<void> {
  const docRef = doc(db, USER_CONTENT_COLLECTION, contentId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('Content not found.');
  }

  const existingData = { id: snap.id, ...snap.data() } as UserContentItem;
  const permissions = evaluateContentPermissions(existingData, currentUser);

  if (!permissions.canShare) {
    throw new Error('Permission denied: You cannot modify sharing permissions for this content.');
  }

  await updateDoc(docRef, {
    isShared: sharing.isShared,
    shareScope: sharing.shareScope,
    targetClass: sharing.targetClass || existingData.targetClass || '',
    sharedWithClasses: sharing.sharedWithClasses || (sharing.targetClass ? [sharing.targetClass] : []),
    sharedWithRoles: sharing.sharedWithRoles || [],
    sharedAt: sharing.isShared ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
}

/**
 * Real-time listener for content owned by the current user
 */
export function subscribeUserOwnedContent(
  currentUid: string,
  onUpdate: (items: UserContentItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!currentUid) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, USER_CONTENT_COLLECTION),
    where('ownerUid', '==', currentUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserContentItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as UserContentItem);
      });
      // Sort in-memory by createdAt descending
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('subscribeUserOwnedContent listener warning:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for content shared with a student's class or school
 */
export function subscribeSharedContentForClass(
  schoolId: string,
  className: string,
  onUpdate: (items: UserContentItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!schoolId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, USER_CONTENT_COLLECTION),
    where('schoolId', '==', schoolId),
    where('isShared', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserContentItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserContentItem;
        const isSchoolWide = data.shareScope === 'school' || data.shareScope === 'public';
        const isClassMatch = 
          data.targetClass === className || 
          (data.sharedWithClasses && data.sharedWithClasses.includes(className)) ||
          !data.targetClass;

        if (isSchoolWide || isClassMatch) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('subscribeSharedContentForClass listener warning:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Client-side file downloader for text, markdown, or json
 */
export function downloadContentFile(
  title: string,
  content: string,
  format: 'txt' | 'md' | 'json' = 'txt'
): void {
  const sanitizedTitle = (title || 'document').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const filename = `${sanitizedTitle}.${format}`;
  
  let mimeType = 'text/plain;charset=utf-8';
  let exportData = content;

  if (format === 'md') {
    mimeType = 'text/markdown;charset=utf-8';
    exportData = `# ${title}\n\n${content}\n\n---\n*Exported from EDUkenZA Platform on ${new Date().toLocaleString()}*`;
  } else if (format === 'json') {
    mimeType = 'application/json;charset=utf-8';
    exportData = JSON.stringify({ title, content, exportedAt: new Date().toISOString() }, null, 2);
  }

  const blob = new Blob([exportData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard safely with browser fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
