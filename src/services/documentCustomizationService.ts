import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SchoolDocumentSettings, DEFAULT_DOCUMENT_SETTINGS } from '../types/documentCustomization';
import { SchoolProfileData } from '../components/SchoolAdminDashboard';

/**
 * Fetch document customization settings for a school
 */
export async function getSchoolDocumentSettings(
  schoolId: string, 
  fallbackProfile?: Partial<SchoolProfileData>
): Promise<SchoolDocumentSettings> {
  if (!schoolId) {
    return { ...DEFAULT_DOCUMENT_SETTINGS, schoolId };
  }

  try {
    const docRef = doc(db, 'schoolDocumentSettings', schoolId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<SchoolDocumentSettings>;
      return {
        ...DEFAULT_DOCUMENT_SETTINGS,
        schoolId,
        ...data,
        schoolName: data.schoolName || fallbackProfile?.schoolName || DEFAULT_DOCUMENT_SETTINGS.schoolName,
        logoUrl: data.logoUrl || fallbackProfile?.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl,
        phone: data.phone || fallbackProfile?.phone || DEFAULT_DOCUMENT_SETTINGS.phone,
        email: data.email || fallbackProfile?.email || DEFAULT_DOCUMENT_SETTINGS.email,
        address: data.address || fallbackProfile?.address || DEFAULT_DOCUMENT_SETTINGS.address,
        academicYear: data.academicYear || fallbackProfile?.academicYear || DEFAULT_DOCUMENT_SETTINGS.academicYear,
        academicTerm: data.academicTerm || fallbackProfile?.academicTerm || DEFAULT_DOCUMENT_SETTINGS.academicTerm
      };
    }
  } catch (err) {
    console.warn('Could not fetch schoolDocumentSettings, using profile defaults:', err);
  }

  return {
    ...DEFAULT_DOCUMENT_SETTINGS,
    schoolId,
    schoolName: fallbackProfile?.schoolName || DEFAULT_DOCUMENT_SETTINGS.schoolName,
    logoUrl: fallbackProfile?.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl,
    phone: fallbackProfile?.phone || DEFAULT_DOCUMENT_SETTINGS.phone,
    email: fallbackProfile?.email || DEFAULT_DOCUMENT_SETTINGS.email,
    address: fallbackProfile?.address || DEFAULT_DOCUMENT_SETTINGS.address,
    academicYear: fallbackProfile?.academicYear || DEFAULT_DOCUMENT_SETTINGS.academicYear,
    academicTerm: fallbackProfile?.academicTerm || DEFAULT_DOCUMENT_SETTINGS.academicTerm
  };
}

/**
 * Save / update document customization settings in Firestore
 */
export async function saveSchoolDocumentSettings(
  schoolId: string,
  settings: Partial<SchoolDocumentSettings>
): Promise<void> {
  if (!schoolId) throw new Error('schoolId is required to save document settings');

  const docRef = doc(db, 'schoolDocumentSettings', schoolId);
  const payload = {
    ...settings,
    schoolId,
    updatedAt: new Date().toISOString(),
    serverTime: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Real-time listener for document customization settings
 */
export function subscribeSchoolDocumentSettings(
  schoolId: string,
  onUpdate: (settings: SchoolDocumentSettings) => void,
  fallbackProfile?: Partial<SchoolProfileData>
): () => void {
  if (!schoolId) {
    onUpdate({ ...DEFAULT_DOCUMENT_SETTINGS, schoolId });
    return () => {};
  }

  const docRef = doc(db, 'schoolDocumentSettings', schoolId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as Partial<SchoolDocumentSettings>;
      onUpdate({
        ...DEFAULT_DOCUMENT_SETTINGS,
        schoolId,
        ...data,
        schoolName: data.schoolName || fallbackProfile?.schoolName || DEFAULT_DOCUMENT_SETTINGS.schoolName,
        logoUrl: data.logoUrl || fallbackProfile?.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl,
        phone: data.phone || fallbackProfile?.phone || DEFAULT_DOCUMENT_SETTINGS.phone,
        email: data.email || fallbackProfile?.email || DEFAULT_DOCUMENT_SETTINGS.email,
        address: data.address || fallbackProfile?.address || DEFAULT_DOCUMENT_SETTINGS.address
      });
    } else {
      onUpdate({
        ...DEFAULT_DOCUMENT_SETTINGS,
        schoolId,
        schoolName: fallbackProfile?.schoolName || DEFAULT_DOCUMENT_SETTINGS.schoolName,
        logoUrl: fallbackProfile?.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl,
        phone: fallbackProfile?.phone || DEFAULT_DOCUMENT_SETTINGS.phone,
        email: fallbackProfile?.email || DEFAULT_DOCUMENT_SETTINGS.email,
        address: fallbackProfile?.address || DEFAULT_DOCUMENT_SETTINGS.address
      });
    }
  }, (err) => {
    console.error('Error listening to schoolDocumentSettings:', err);
  });
}
