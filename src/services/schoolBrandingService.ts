import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface SchoolBranding {
  schoolId: string;
  schoolName: string;
  motto?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string; // hex
  secondaryColor?: string; // hex
  theme?: string; // 'classic' | 'modern' | 'vibrant' | 'navy' | 'emerald' | 'burgundy'
  academicTerm?: string;
  country?: string;
  adminName?: string;
  adminEmail?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING: Omit<SchoolBranding, 'schoolId'> = {
  schoolName: 'EDUkenZA Academy',
  motto: 'Knowledge, Integrity, and Excellence',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  primaryColor: '#002147', // Oxford Navy
  secondaryColor: '#D4AF37', // Imperial Gold
  theme: 'classic',
  academicTerm: 'Term 1'
};

export interface BrandColorPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  theme: string;
}

export const BRAND_COLOR_PRESETS: BrandColorPreset[] = [
  { id: 'oxford-gold', name: 'Oxford Navy & Imperial Gold', primary: '#002147', secondary: '#D4AF37', theme: 'classic' },
  { id: 'royal-amber', name: 'Royal Blue & Sunlit Amber', primary: '#1E3A8A', secondary: '#F59E0B', theme: 'modern' },
  { id: 'emerald-gold', name: 'Emerald Crest & Academy Gold', primary: '#064E3B', secondary: '#EAB308', theme: 'emerald' },
  { id: 'burgundy-champagne', name: 'Burgundy Heritage & Champagne', primary: '#831843', secondary: '#FDE047', theme: 'burgundy' },
  { id: 'slate-cyan', name: 'Graphite Tech & Vivid Cyan', primary: '#0F172A', secondary: '#06B6D4', theme: 'vibrant' },
  { id: 'crimson-bronze', name: 'Deep Crimson & Bronze', primary: '#991B1B', secondary: '#F97316', theme: 'classic' }
];

/**
 * Calculates accessible text color based on background hex
 */
export const getAccessibleTextColor = (hexColor: string): '#FFFFFF' | '#0F172A' => {
  if (!hexColor) return '#FFFFFF';
  let cleanHex = hexColor.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Relative luminance calculation according to WCAG 2.1
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0F172A' : '#FFFFFF';
};

/**
 * Subscribes to the authoritative school document in real-time
 */
export const subscribeToSchoolBranding = (
  schoolId: string,
  onUpdate: (branding: SchoolBranding | null) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!schoolId) {
    onUpdate(null);
    return () => {};
  }

  const schoolRef = doc(db, 'schools', schoolId);
  return onSnapshot(
    schoolRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const branding: SchoolBranding = {
          schoolId: docSnap.id,
          schoolName: data.schoolName || data.name || DEFAULT_BRANDING.schoolName,
          motto: data.motto || data.schoolMotto || DEFAULT_BRANDING.motto,
          logoUrl: data.logoUrl || data.logo || '',
          address: data.address || data.schoolAddress || '',
          phone: data.phone || data.phoneNumber || '',
          email: data.email || data.schoolEmail || '',
          website: data.website || data.schoolWebsite || '',
          primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          theme: data.theme || DEFAULT_BRANDING.theme,
          academicTerm: data.academicTerm || DEFAULT_BRANDING.academicTerm,
          country: data.country || '',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          updatedAt: data.updatedAt || '',
          updatedBy: data.updatedBy || ''
        };
        onUpdate(branding);
      } else {
        // Fallback with schoolId
        onUpdate({
          schoolId,
          ...DEFAULT_BRANDING
        });
      }
    },
    (error) => {
      console.error(`[BRANDING ERROR] Real-time listener for school ${schoolId} failed:`, error);
      if (onError) onError(error);
    }
  );
};

/**
 * Updates school branding in Firestore (only authorized school admin)
 */
export const saveSchoolBranding = async (
  schoolId: string,
  brandingUpdates: Partial<SchoolBranding>,
  authorEmail: string,
  authorName?: string
): Promise<void> => {
  if (!schoolId) {
    throw new Error('Authoritative school ID is required to update school branding.');
  }

  const schoolRef = doc(db, 'schools', schoolId);
  const existingSnap = await getDoc(schoolRef);

  const payload: any = {
    ...brandingUpdates,
    schoolId,
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || 'admin'
  };

  if (authorName) {
    payload.lastUpdatedByName = authorName;
  }

  if (existingSnap.exists()) {
    await updateDoc(schoolRef, payload);
  } else {
    await setDoc(schoolRef, {
      ...DEFAULT_BRANDING,
      ...payload,
      createdAt: new Date().toISOString()
    }, { merge: true });
  }

  // Also sync schoolName into users matching this school for instant display consistency
  if (brandingUpdates.schoolName) {
    try {
      const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
      const userSnaps = await getDocs(usersQuery);
      userSnaps.forEach(async (uDoc) => {
        try {
          await updateDoc(doc(db, 'users', uDoc.id), {
            schoolName: brandingUpdates.schoolName
          });
        } catch (_) {}
      });
    } catch (e) {
      console.warn('Could not propagate schoolName to all user records:', e);
    }
  }
};

/**
 * Updates a Student's Profile Photo across both students and users collections
 */
export const updateStudentProfilePhoto = async (
  schoolId: string,
  studentDocId: string,
  studentIdNumber: string,
  photoUrl: string,
  authorInfo?: { email?: string; name?: string }
): Promise<void> => {
  if (!schoolId) throw new Error('Authoritative school ID is required.');
  if (!studentDocId) throw new Error('Student document ID is required.');

  const timestamp = new Date().toISOString();

  // 1. Update students collection
  const studentRef = doc(db, 'students', studentDocId);
  await updateDoc(studentRef, {
    photoUrl,
    avatarUrl: photoUrl,
    updatedAt: timestamp,
    photoUpdatedAt: timestamp,
    updatedBy: authorInfo?.email || 'admin'
  });

  // 2. Cross-update matching user document in users collection
  try {
    let userQuery = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('studentId', '==', studentIdNumber)
    );
    let userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      // Try searching by document id if studentDocId equals UID
      const directUserDoc = await getDoc(doc(db, 'users', studentDocId));
      if (directUserDoc.exists()) {
        await updateDoc(doc(db, 'users', studentDocId), {
          photoUrl,
          avatarUrl: photoUrl,
          updatedAt: timestamp
        });
      }
    } else {
      userSnap.forEach(async (u) => {
        await updateDoc(doc(db, 'users', u.id), {
          photoUrl,
          avatarUrl: photoUrl,
          updatedAt: timestamp
        });
      });
    }
  } catch (err) {
    console.warn('[PHOTO UPDATE] Notice: Could not sync student photo to user record:', err);
  }
};

/**
 * Updates a Teacher's Profile Photo across teachers and users collections
 */
export const updateTeacherProfilePhoto = async (
  schoolId: string,
  teacherDocId: string,
  teacherCodeOrEmail: string,
  photoUrl: string,
  authorInfo?: { email?: string; name?: string }
): Promise<void> => {
  if (!schoolId) throw new Error('Authoritative school ID is required.');
  if (!teacherDocId) throw new Error('Teacher document ID is required.');

  const timestamp = new Date().toISOString();

  // 1. Update teachers collection
  const teacherRef = doc(db, 'teachers', teacherDocId);
  await updateDoc(teacherRef, {
    photoUrl,
    avatarUrl: photoUrl,
    updatedAt: timestamp,
    photoUpdatedAt: timestamp,
    updatedBy: authorInfo?.email || 'admin'
  });

  // 2. Cross-update user document in users collection
  try {
    let userQuery = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('email', '==', teacherCodeOrEmail.toLowerCase())
    );
    let userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      const directUserDoc = await getDoc(doc(db, 'users', teacherDocId));
      if (directUserDoc.exists()) {
        await updateDoc(doc(db, 'users', teacherDocId), {
          photoUrl,
          avatarUrl: photoUrl,
          updatedAt: timestamp
        });
      }
    } else {
      userSnap.forEach(async (u) => {
        await updateDoc(doc(db, 'users', u.id), {
          photoUrl,
          avatarUrl: photoUrl,
          updatedAt: timestamp
        });
      });
    }
  } catch (err) {
    console.warn('[PHOTO UPDATE] Notice: Could not sync teacher photo to user record:', err);
  }
};

/**
 * Updates a Parent's Profile Photo across parents and users collections
 */
export const updateParentProfilePhoto = async (
  schoolId: string,
  parentDocId: string,
  parentEmail: string,
  photoUrl: string,
  authorInfo?: { email?: string; name?: string }
): Promise<void> => {
  if (!schoolId) throw new Error('Authoritative school ID is required.');
  if (!parentDocId) throw new Error('Parent document ID is required.');

  const timestamp = new Date().toISOString();

  // 1. Update parents collection
  const parentRef = doc(db, 'parents', parentDocId);
  await updateDoc(parentRef, {
    photoUrl,
    avatarUrl: photoUrl,
    updatedAt: timestamp,
    photoUpdatedAt: timestamp,
    updatedBy: authorInfo?.email || 'admin'
  });

  // 2. Cross-update user document in users collection
  if (parentEmail) {
    try {
      const userQuery = query(
        collection(db, 'users'),
        where('schoolId', '==', schoolId),
        where('email', '==', parentEmail.toLowerCase())
      );
      const userSnap = await getDocs(userQuery);
      userSnap.forEach(async (u) => {
        await updateDoc(doc(db, 'users', u.id), {
          photoUrl,
          avatarUrl: photoUrl,
          updatedAt: timestamp
        });
      });
    } catch (err) {
      console.warn('[PHOTO UPDATE] Notice: Could not sync parent photo to user record:', err);
    }
  }
};
