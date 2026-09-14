import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  SchoolBranding, 
  DEFAULT_BRANDING, 
  subscribeToSchoolBranding, 
  saveSchoolBranding,
  getAccessibleTextColor 
} from '../services/schoolBrandingService';
import { uploadSchoolLogo, deleteStorageImage } from '../services/imageStorageService';

interface SchoolBrandingContextType {
  branding: SchoolBranding | null;
  schoolName: string;
  motto: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  theme: string;
  academicTerm: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  loading: boolean;
  error: string | null;
  saveBranding: (updates: Partial<SchoolBranding>) => Promise<void>;
  uploadLogo: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
  removeLogo: () => Promise<void>;
  isSchoolAdmin: boolean;
  schoolId: string;
}

const SchoolBrandingContext = createContext<SchoolBrandingContextType | undefined>(undefined);

export const SchoolBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, showToast } = useAuth();
  
  // Authoritative schoolId directly derived from verified Auth state
  const schoolId = useMemo(() => {
    return currentUser?.schoolId || (currentUser as any)?.school_id || '';
  }, [currentUser]);

  const [branding, setBranding] = useState<SchoolBranding | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isSchoolAdmin = useMemo(() => {
    const role = currentUser?.role as string | undefined;
    return role === 'school_admin' || role === 'platform_owner' || role === 'owner';
  }, [currentUser?.role]);

  // Real-time Firestore subscription to schools/{schoolId}
  useEffect(() => {
    if (!schoolId) {
      setBranding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToSchoolBranding(
      schoolId,
      (liveBranding) => {
        setBranding(liveBranding);
        setLoading(false);

        // Inject dynamic CSS custom properties for uniform, contrast-safe styling
        const primary = liveBranding?.primaryColor || DEFAULT_BRANDING.primaryColor || '#002147';
        const secondary = liveBranding?.secondaryColor || DEFAULT_BRANDING.secondaryColor || '#D4AF37';

        const root = document.documentElement;
        root.style.setProperty('--school-primary', primary);
        root.style.setProperty('--school-secondary', secondary);
        root.style.setProperty('--school-text-on-primary', getAccessibleTextColor(primary));
        root.style.setProperty('--school-text-on-secondary', getAccessibleTextColor(secondary));
      },
      (err) => {
        console.error('[BRANDING CONTEXT] Real-time listener failure:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [schoolId]);

  // Save branding changes to Firestore
  const saveBranding = async (updates: Partial<SchoolBranding>) => {
    if (!schoolId) {
      throw new Error('No authenticated school context found.');
    }
    if (!isSchoolAdmin) {
      throw new Error('Unauthorized: Only school administrators may update school identity and branding.');
    }

    try {
      await saveSchoolBranding(
        schoolId,
        updates,
        currentUser?.email || '',
        currentUser?.fullName || currentUser?.name || 'Administrator'
      );
      showToast('School identity and branding updated successfully!', 'success');
    } catch (err: any) {
      console.error('[BRANDING UPDATE ERROR]', err);
      showToast(`Failed to update school branding: ${err.message}`, 'error');
      throw err;
    }
  };

  // Upload logo to Firebase Storage & update Firestore document
  const uploadLogo = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
    if (!schoolId) {
      throw new Error('No authenticated school context found.');
    }
    if (!isSchoolAdmin) {
      throw new Error('Unauthorized: Only school administrators may upload school logos.');
    }

    const previousLogoUrl = branding?.logoUrl;

    try {
      // 1. Upload to Firebase Storage
      const newLogoUrl = await uploadSchoolLogo(schoolId, file, onProgress);

      // 2. Persist in authoritative Firestore school document
      await saveSchoolBranding(
        schoolId,
        { logoUrl: newLogoUrl },
        currentUser?.email || '',
        currentUser?.fullName || currentUser?.name
      );

      // 3. Clean up previous storage file if it exists and differs
      if (previousLogoUrl && previousLogoUrl !== newLogoUrl) {
        deleteStorageImage(previousLogoUrl).catch(() => {});
      }

      showToast('School logo uploaded and saved in real-time!', 'success');
      return newLogoUrl;
    } catch (err: any) {
      console.error('[LOGO UPLOAD ERROR]', err);
      showToast(`Failed to upload school logo: ${err.message}`, 'error');
      throw err;
    }
  };

  // Remove logo from Firestore & Storage
  const removeLogo = async () => {
    if (!schoolId) throw new Error('No authenticated school context found.');
    if (!isSchoolAdmin) throw new Error('Unauthorized action.');

    const oldLogo = branding?.logoUrl;
    try {
      await saveSchoolBranding(
        schoolId,
        { logoUrl: '' },
        currentUser?.email || '',
        currentUser?.fullName || currentUser?.name
      );

      if (oldLogo) {
        deleteStorageImage(oldLogo).catch(() => {});
      }

      showToast('School logo removed.', 'info');
    } catch (err: any) {
      console.error('[LOGO REMOVAL ERROR]', err);
      showToast(`Failed to remove school logo: ${err.message}`, 'error');
      throw err;
    }
  };

  const contextValue: SchoolBrandingContextType = {
    branding,
    schoolName: branding?.schoolName || currentUser?.schoolName || DEFAULT_BRANDING.schoolName,
    motto: branding?.motto || DEFAULT_BRANDING.motto || '',
    logoUrl: branding?.logoUrl || '',
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor || '#002147',
    secondaryColor: branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor || '#D4AF37',
    theme: branding?.theme || DEFAULT_BRANDING.theme || 'classic',
    academicTerm: branding?.academicTerm || DEFAULT_BRANDING.academicTerm || 'Term 1',
    address: branding?.address || '',
    phone: branding?.phone || '',
    email: branding?.email || '',
    website: branding?.website || '',
    loading,
    error,
    saveBranding,
    uploadLogo,
    removeLogo,
    isSchoolAdmin,
    schoolId
  };

  return (
    <SchoolBrandingContext.Provider value={contextValue}>
      {children}
    </SchoolBrandingContext.Provider>
  );
};

export const useSchoolBranding = () => {
  const context = useContext(SchoolBrandingContext);
  if (!context) {
    throw new Error('useSchoolBranding must be used within a SchoolBrandingProvider');
  }
  return context;
};
