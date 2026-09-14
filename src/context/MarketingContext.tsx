import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { MarketingSiteData } from '../types/marketing';
import { DEFAULT_MARKETING_CONTENT } from '../data/defaultMarketingContent';
import { useAuth } from './AuthContext';
import { isPlatformOwner } from '../utils/permissions';

export interface MarketingContextType {
  marketingContent: MarketingSiteData;
  publishedContent: MarketingSiteData;
  draftContent: MarketingSiteData;
  isPreviewMode: boolean;
  isLiveSyncing: boolean;
  isSaving: boolean;
  hasUnpublishedChanges: boolean;
  togglePreviewMode: (enabled?: boolean) => void;
  saveDraft: (newContent: MarketingSiteData) => Promise<boolean>;
  publishLive: (newContent: MarketingSiteData) => Promise<boolean>;
  unpublishSection: (sectionKey: keyof MarketingSiteData) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string>;
  removeLogo: () => Promise<boolean>;
  uploadImage: (file: File, folder?: string) => Promise<string>;
  resetToDefaults: () => Promise<boolean>;
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined);

// Defensive merger ensuring complete schema integrity
export function sanitizeMarketingData(data?: any): MarketingSiteData {
  if (!data) return DEFAULT_MARKETING_CONTENT;

  return {
    websiteName: typeof data.websiteName === 'string' && data.websiteName.trim()
      ? data.websiteName
      : DEFAULT_MARKETING_CONTENT.websiteName,
    
    branding: {
      ...DEFAULT_MARKETING_CONTENT.branding,
      ...(data.branding || {}),
      logoUrl: typeof data.branding?.logoUrl === 'string' ? data.branding.logoUrl : '',
      logoAlt: data.branding?.logoAlt || DEFAULT_MARKETING_CONTENT.branding.logoAlt,
      faviconUrl: data.branding?.faviconUrl || '',
      primaryColor: data.branding?.primaryColor || DEFAULT_MARKETING_CONTENT.branding.primaryColor,
      secondaryColor: data.branding?.secondaryColor || DEFAULT_MARKETING_CONTENT.branding.secondaryColor,
    },

    hero: {
      ...DEFAULT_MARKETING_CONTENT.hero,
      ...(data.hero || {}),
      headline: data.hero?.headline || DEFAULT_MARKETING_CONTENT.hero.headline,
      subtitle: data.hero?.subtitle || DEFAULT_MARKETING_CONTENT.hero.subtitle,
      heroImageUrl: data.hero?.heroImageUrl || DEFAULT_MARKETING_CONTENT.hero.heroImageUrl,
      primaryCtaText: data.hero?.primaryCtaText || DEFAULT_MARKETING_CONTENT.hero.primaryCtaText,
      secondaryCtaText: data.hero?.secondaryCtaText || DEFAULT_MARKETING_CONTENT.hero.secondaryCtaText,
      badgeText: data.hero?.badgeText || DEFAULT_MARKETING_CONTENT.hero.badgeText,
      enabled: data.hero?.enabled !== false,
    },

    about: {
      ...DEFAULT_MARKETING_CONTENT.about,
      ...(data.about || {}),
      title: data.about?.title || DEFAULT_MARKETING_CONTENT.about.title,
      subtitle: data.about?.subtitle || DEFAULT_MARKETING_CONTENT.about.subtitle,
      description: data.about?.description || DEFAULT_MARKETING_CONTENT.about.description,
      imageUrl: data.about?.imageUrl || DEFAULT_MARKETING_CONTENT.about.imageUrl,
      highlights: Array.isArray(data.about?.highlights) && data.about.highlights.length > 0
        ? data.about.highlights
        : DEFAULT_MARKETING_CONTENT.about.highlights,
      badgeText: data.about?.badgeText || DEFAULT_MARKETING_CONTENT.about.badgeText,
      enabled: data.about?.enabled !== false,
    },

    features: {
      ...DEFAULT_MARKETING_CONTENT.features,
      ...(data.features || {}),
      title: data.features?.title || DEFAULT_MARKETING_CONTENT.features.title,
      subtitle: data.features?.subtitle || DEFAULT_MARKETING_CONTENT.features.subtitle,
      badgeText: data.features?.badgeText || DEFAULT_MARKETING_CONTENT.features.badgeText,
      items: Array.isArray(data.features?.items) && data.features.items.length > 0
        ? data.features.items
        : DEFAULT_MARKETING_CONTENT.features.items,
      enabled: data.features?.enabled !== false,
    },

    benefits: {
      ...DEFAULT_MARKETING_CONTENT.benefits,
      ...(data.benefits || {}),
      title: data.benefits?.title || DEFAULT_MARKETING_CONTENT.benefits.title,
      subtitle: data.benefits?.subtitle || DEFAULT_MARKETING_CONTENT.benefits.subtitle,
      badgeText: data.benefits?.badgeText || DEFAULT_MARKETING_CONTENT.benefits.badgeText,
      items: Array.isArray(data.benefits?.items) && data.benefits.items.length > 0
        ? data.benefits.items
        : DEFAULT_MARKETING_CONTENT.benefits.items,
      enabled: data.benefits?.enabled !== false,
    },

    teacherSection: {
      ...DEFAULT_MARKETING_CONTENT.teacherSection,
      ...(data.teacherSection || {}),
      title: data.teacherSection?.title || DEFAULT_MARKETING_CONTENT.teacherSection.title,
      subtitle: data.teacherSection?.subtitle || DEFAULT_MARKETING_CONTENT.teacherSection.subtitle,
      description: data.teacherSection?.description || DEFAULT_MARKETING_CONTENT.teacherSection.description,
      imageUrl: data.teacherSection?.imageUrl || DEFAULT_MARKETING_CONTENT.teacherSection.imageUrl,
      highlights: Array.isArray(data.teacherSection?.highlights) && data.teacherSection.highlights.length > 0
        ? data.teacherSection.highlights
        : DEFAULT_MARKETING_CONTENT.teacherSection.highlights,
      badgeText: data.teacherSection?.badgeText || DEFAULT_MARKETING_CONTENT.teacherSection.badgeText,
      enabled: data.teacherSection?.enabled !== false,
    },

    studentSection: {
      ...DEFAULT_MARKETING_CONTENT.studentSection,
      ...(data.studentSection || {}),
      title: data.studentSection?.title || DEFAULT_MARKETING_CONTENT.studentSection.title,
      subtitle: data.studentSection?.subtitle || DEFAULT_MARKETING_CONTENT.studentSection.subtitle,
      description: data.studentSection?.description || DEFAULT_MARKETING_CONTENT.studentSection.description,
      imageUrl: data.studentSection?.imageUrl || DEFAULT_MARKETING_CONTENT.studentSection.imageUrl,
      highlights: Array.isArray(data.studentSection?.highlights) && data.studentSection.highlights.length > 0
        ? data.studentSection.highlights
        : DEFAULT_MARKETING_CONTENT.studentSection.highlights,
      badgeText: data.studentSection?.badgeText || DEFAULT_MARKETING_CONTENT.studentSection.badgeText,
      enabled: data.studentSection?.enabled !== false,
    },

    parentSection: {
      ...DEFAULT_MARKETING_CONTENT.parentSection,
      ...(data.parentSection || {}),
      title: data.parentSection?.title || DEFAULT_MARKETING_CONTENT.parentSection.title,
      subtitle: data.parentSection?.subtitle || DEFAULT_MARKETING_CONTENT.parentSection.subtitle,
      description: data.parentSection?.description || DEFAULT_MARKETING_CONTENT.parentSection.description,
      imageUrl: data.parentSection?.imageUrl || DEFAULT_MARKETING_CONTENT.parentSection.imageUrl,
      highlights: Array.isArray(data.parentSection?.highlights) && data.parentSection.highlights.length > 0
        ? data.parentSection.highlights
        : DEFAULT_MARKETING_CONTENT.parentSection.highlights,
      badgeText: data.parentSection?.badgeText || DEFAULT_MARKETING_CONTENT.parentSection.badgeText,
      enabled: data.parentSection?.enabled !== false,
    },

    aiSection: {
      ...DEFAULT_MARKETING_CONTENT.aiSection,
      ...(data.aiSection || {}),
      title: data.aiSection?.title || DEFAULT_MARKETING_CONTENT.aiSection.title,
      subtitle: data.aiSection?.subtitle || DEFAULT_MARKETING_CONTENT.aiSection.subtitle,
      description: data.aiSection?.description || DEFAULT_MARKETING_CONTENT.aiSection.description,
      imageUrl: data.aiSection?.imageUrl || DEFAULT_MARKETING_CONTENT.aiSection.imageUrl,
      capabilities: Array.isArray(data.aiSection?.capabilities) && data.aiSection.capabilities.length > 0
        ? data.aiSection.capabilities
        : DEFAULT_MARKETING_CONTENT.aiSection.capabilities,
      badgeText: data.aiSection?.badgeText || DEFAULT_MARKETING_CONTENT.aiSection.badgeText,
      enabled: data.aiSection?.enabled !== false,
    },

    realtimeSection: {
      ...DEFAULT_MARKETING_CONTENT.realtimeSection,
      ...(data.realtimeSection || {}),
      title: data.realtimeSection?.title || DEFAULT_MARKETING_CONTENT.realtimeSection.title,
      subtitle: data.realtimeSection?.subtitle || DEFAULT_MARKETING_CONTENT.realtimeSection.subtitle,
      description: data.realtimeSection?.description || DEFAULT_MARKETING_CONTENT.realtimeSection.description,
      metrics: Array.isArray(data.realtimeSection?.metrics) && data.realtimeSection.metrics.length > 0
        ? data.realtimeSection.metrics
        : DEFAULT_MARKETING_CONTENT.realtimeSection.metrics,
      badgeText: data.realtimeSection?.badgeText || DEFAULT_MARKETING_CONTENT.realtimeSection.badgeText,
      enabled: data.realtimeSection?.enabled !== false,
    },

    securitySection: {
      ...DEFAULT_MARKETING_CONTENT.securitySection,
      ...(data.securitySection || {}),
      title: data.securitySection?.title || DEFAULT_MARKETING_CONTENT.securitySection.title,
      subtitle: data.securitySection?.subtitle || DEFAULT_MARKETING_CONTENT.securitySection.subtitle,
      description: data.securitySection?.description || DEFAULT_MARKETING_CONTENT.securitySection.description,
      badges: Array.isArray(data.securitySection?.badges) && data.securitySection.badges.length > 0
        ? data.securitySection.badges
        : DEFAULT_MARKETING_CONTENT.securitySection.badges,
      badgeText: data.securitySection?.badgeText || DEFAULT_MARKETING_CONTENT.securitySection.badgeText,
      enabled: data.securitySection?.enabled !== false,
    },

    pricing: {
      ...DEFAULT_MARKETING_CONTENT.pricing,
      ...(data.pricing || {}),
      title: data.pricing?.title || DEFAULT_MARKETING_CONTENT.pricing.title,
      subtitle: data.pricing?.subtitle || DEFAULT_MARKETING_CONTENT.pricing.subtitle,
      badgeText: data.pricing?.badgeText || DEFAULT_MARKETING_CONTENT.pricing.badgeText,
      plans: Array.isArray(data.pricing?.plans) && data.pricing.plans.length > 0
        ? data.pricing.plans
        : DEFAULT_MARKETING_CONTENT.pricing.plans,
      enabled: data.pricing?.enabled !== false,
    },

    testimonials: {
      ...DEFAULT_MARKETING_CONTENT.testimonials,
      ...(data.testimonials || {}),
      title: data.testimonials?.title || DEFAULT_MARKETING_CONTENT.testimonials.title,
      subtitle: data.testimonials?.subtitle || DEFAULT_MARKETING_CONTENT.testimonials.subtitle,
      badgeText: data.testimonials?.badgeText || DEFAULT_MARKETING_CONTENT.testimonials.badgeText,
      items: Array.isArray(data.testimonials?.items) && data.testimonials.items.length > 0
        ? data.testimonials.items
        : DEFAULT_MARKETING_CONTENT.testimonials.items,
      enabled: data.testimonials?.enabled !== false,
    },

    faq: {
      ...DEFAULT_MARKETING_CONTENT.faq,
      ...(data.faq || {}),
      title: data.faq?.title || DEFAULT_MARKETING_CONTENT.faq.title,
      subtitle: data.faq?.subtitle || DEFAULT_MARKETING_CONTENT.faq.subtitle,
      badgeText: data.faq?.badgeText || DEFAULT_MARKETING_CONTENT.faq.badgeText,
      items: Array.isArray(data.faq?.items) && data.faq.items.length > 0
        ? data.faq.items
        : DEFAULT_MARKETING_CONTENT.faq.items,
      enabled: data.faq?.enabled !== false,
    },

    contactInfo: {
      ...DEFAULT_MARKETING_CONTENT.contactInfo,
      ...(data.contactInfo || {}),
      email: data.contactInfo?.email || DEFAULT_MARKETING_CONTENT.contactInfo.email,
      phone: data.contactInfo?.phone || DEFAULT_MARKETING_CONTENT.contactInfo.phone,
      address: data.contactInfo?.address || DEFAULT_MARKETING_CONTENT.contactInfo.address,
      supportHours: data.contactInfo?.supportHours || DEFAULT_MARKETING_CONTENT.contactInfo.supportHours,
      emergencyHotline: data.contactInfo?.emergencyHotline || DEFAULT_MARKETING_CONTENT.contactInfo.emergencyHotline,
      socialMedia: {
        ...DEFAULT_MARKETING_CONTENT.contactInfo.socialMedia,
        ...(data.contactInfo?.socialMedia || {}),
      },
    },

    footer: {
      ...DEFAULT_MARKETING_CONTENT.footer,
      ...(data.footer || {}),
      copyrightText: data.footer?.copyrightText || DEFAULT_MARKETING_CONTENT.footer.copyrightText,
      disclaimer: data.footer?.disclaimer || DEFAULT_MARKETING_CONTENT.footer.disclaimer,
      quickLinks: Array.isArray(data.footer?.quickLinks) && data.footer.quickLinks.length > 0
        ? data.footer.quickLinks
        : DEFAULT_MARKETING_CONTENT.footer.quickLinks,
      privacyPolicyUrl: data.footer?.privacyPolicyUrl || DEFAULT_MARKETING_CONTENT.footer.privacyPolicyUrl,
      termsOfServiceUrl: data.footer?.termsOfServiceUrl || DEFAULT_MARKETING_CONTENT.footer.termsOfServiceUrl,
    },

    navigation: {
      items: Array.isArray(data.navigation?.items) && data.navigation.items.length > 0
        ? data.navigation.items
        : DEFAULT_MARKETING_CONTENT.navigation.items,
    },

    publishing: {
      status: data.publishing?.status || 'published',
      publishedAt: data.publishing?.publishedAt || data.updatedAt,
      draftSavedAt: data.publishing?.draftSavedAt,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    },

    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export const MarketingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, showToast } = useAuth();
  
  const [publishedContent, setPublishedContent] = useState<MarketingSiteData>(DEFAULT_MARKETING_CONTENT);
  const [draftContent, setDraftContent] = useState<MarketingSiteData>(DEFAULT_MARKETING_CONTENT);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() => {
    return sessionStorage.getItem('edukenza_marketing_preview') === 'true';
  });
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Subscribe in real-time to published live marketing_site/content
  useEffect(() => {
    setIsLiveSyncing(true);
    const publishedDocRef = doc(db, 'marketing_site', 'content');

    const unsubscribePublished = onSnapshot(
      publishedDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const sanitized = sanitizeMarketingData(snapshot.data());
          setPublishedContent(sanitized);
        } else {
          setPublishedContent(DEFAULT_MARKETING_CONTENT);
        }
        setIsLiveSyncing(false);
      },
      (error) => {
        console.warn('Live Marketing Site sync listener notice:', error);
        setIsLiveSyncing(false);
      }
    );

    return () => unsubscribePublished();
  }, []);

  // If user is Platform Owner, also listen in real-time to marketing_site/draft
  useEffect(() => {
    if (!currentUser || !isPlatformOwner(currentUser)) {
      setDraftContent(publishedContent);
      return;
    }

    const draftDocRef = doc(db, 'marketing_site', 'draft');
    const unsubscribeDraft = onSnapshot(
      draftDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const sanitized = sanitizeMarketingData(snapshot.data());
          setDraftContent(sanitized);
        } else {
          // If no draft exists yet, initialize draft from published content
          setDraftContent(publishedContent);
        }
      },
      (error) => {
        console.warn('Draft sync notice:', error);
      }
    );

    return () => unsubscribeDraft();
  }, [currentUser, publishedContent]);

  // Determine active marketing content:
  // If Platform Owner has toggled Preview Mode, display draft content; otherwise display published content
  const activeMarketingContent = useMemo(() => {
    if (isPreviewMode && isPlatformOwner(currentUser)) {
      return draftContent;
    }
    return publishedContent;
  }, [isPreviewMode, currentUser, draftContent, publishedContent]);

  const hasUnpublishedChanges = useMemo(() => {
    if (!draftContent.publishing?.draftSavedAt) return false;
    if (!publishedContent.publishing?.publishedAt) return true;
    return new Date(draftContent.publishing.draftSavedAt).getTime() > new Date(publishedContent.publishing.publishedAt).getTime();
  }, [draftContent, publishedContent]);

  const togglePreviewMode = useCallback((enabled?: boolean) => {
    setIsPreviewMode((prev) => {
      const next = enabled !== undefined ? enabled : !prev;
      sessionStorage.setItem('edukenza_marketing_preview', next ? 'true' : 'false');
      if (next) {
        showToast('Preview Mode Active — Viewing unpublished draft content.', 'info');
      } else {
        showToast('Exited Preview Mode — Viewing live published website.', 'info');
      }
      return next;
    });
  }, [showToast]);

  // Upload Image Helper (Validates file type & size, uploads to Firebase Storage with Base64 fallback)
  const uploadImage = async (file: File, folder = 'uploads'): Promise<string> => {
    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error(`Invalid image type (${file.type}). Supported formats: PNG, JPG, WEBP, SVG.`);
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB max
    if (file.size > maxSizeBytes) {
      throw new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 5MB.`);
    }

    try {
      if (storage) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
        const storagePath = `marketing/${folder}/${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
      }
    } catch (err: any) {
      console.warn('Firebase Storage upload failed, utilizing resilient Data URL fallback:', err);
    }

    // Fallback: Convert file to Base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(new Error('Failed to read file buffer'));
      reader.readAsDataURL(file);
    });
  };

  // Upload Logo Helper
  const uploadLogo = async (file: File): Promise<string> => {
    return await uploadImage(file, 'logo');
  };

  // Remove Logo Helper (clears custom logo, restores default brand emblem)
  const removeLogo = async (): Promise<boolean> => {
    if (!isPlatformOwner(currentUser)) {
      showToast('Unauthorized: Only Platform Owner can manage website branding.', 'error');
      return false;
    }

    setIsSaving(true);
    try {
      // Update draft
      const updatedDraft: MarketingSiteData = {
        ...draftContent,
        branding: {
          ...draftContent.branding,
          logoUrl: '',
        },
        publishing: {
          status: 'draft',
          draftSavedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || 'platform_owner',
        }
      };

      const draftDocRef = doc(db, 'marketing_site', 'draft');
      await setDoc(draftDocRef, updatedDraft, { merge: true });

      // If user also wants to publish the change immediately:
      const publishedDocRef = doc(db, 'marketing_site', 'content');
      await setDoc(publishedDocRef, {
        branding: { logoUrl: '' },
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'platform_owner',
      }, { merge: true });

      showToast('Custom logo removed. Default EDUkenZA brand identity restored.', 'success');
      setIsSaving(false);
      return true;
    } catch (error: any) {
      console.error('Error removing logo:', error);
      showToast(`Failed to remove logo: ${error.message}`, 'error');
      setIsSaving(false);
      return false;
    }
  };

  // Validate marketing content before saving
  const validateContent = (content: MarketingSiteData): string | null => {
    if (!content.websiteName?.trim()) {
      return 'Website name cannot be empty.';
    }
    if (content.websiteName.length > 40) {
      return 'Website name must not exceed 40 characters.';
    }
    if (!content.hero?.headline?.trim()) {
      return 'Hero headline cannot be empty.';
    }
    if (content.hero.headline.length > 150) {
      return 'Hero headline must not exceed 150 characters to prevent broken layouts.';
    }
    if (content.hero.subtitle && content.hero.subtitle.length > 350) {
      return 'Hero description must not exceed 350 characters to prevent broken layouts.';
    }
    if (!content.contactInfo?.email?.trim()) {
      return 'Contact email cannot be empty.';
    }
    return null;
  };

  // Save as Draft (marketing_site/draft)
  const saveDraft = async (newContent: MarketingSiteData): Promise<boolean> => {
    if (!isPlatformOwner(currentUser)) {
      showToast('Unauthorized: Only Platform Owner can modify Marketing Site content.', 'error');
      return false;
    }

    const validationError = validateContent(newContent);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload: MarketingSiteData = {
        ...sanitizeMarketingData(newContent),
        publishing: {
          status: 'draft',
          draftSavedAt: now,
          publishedAt: publishedContent.publishing?.publishedAt,
          updatedAt: now,
          updatedBy: currentUser?.email || 'platform_owner',
        },
        updatedAt: now,
        updatedBy: currentUser?.email || 'platform_owner',
      };

      const docRef = doc(db, 'marketing_site', 'draft');
      await setDoc(docRef, payload, { merge: true });

      setDraftContent(payload);
      showToast('Draft saved successfully! You can preview it before publishing live.', 'success');
      setIsSaving(false);
      return true;
    } catch (error: any) {
      console.error('Error saving marketing draft:', error);
      showToast(`Failed to save draft: ${error.message || 'Check Firestore permissions'}`, 'error');
      setIsSaving(false);
      return false;
    }
  };

  // Publish Live (marketing_site/content)
  const publishLive = async (newContent: MarketingSiteData): Promise<boolean> => {
    if (!isPlatformOwner(currentUser)) {
      showToast('Unauthorized: Only Platform Owner can publish Marketing Site content.', 'error');
      return false;
    }

    const validationError = validateContent(newContent);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const sanitized = sanitizeMarketingData(newContent);

      const payload: MarketingSiteData = {
        ...sanitized,
        publishing: {
          status: 'published',
          publishedAt: now,
          draftSavedAt: now,
          updatedAt: now,
          updatedBy: currentUser?.email || 'platform_owner',
        },
        updatedAt: now,
        updatedBy: currentUser?.email || 'platform_owner',
      };

      // 1. Write to authoritative public content document
      const contentRef = doc(db, 'marketing_site', 'content');
      await setDoc(contentRef, payload, { merge: true });

      // 2. Also sync to draft document so they stay aligned
      const draftRef = doc(db, 'marketing_site', 'draft');
      await setDoc(draftRef, payload, { merge: true });

      setPublishedContent(payload);
      setDraftContent(payload);

      showToast('Marketing Website published live! Real-time public updates are now active.', 'success');
      setIsSaving(false);
      return true;
    } catch (error: any) {
      console.error('Error publishing marketing site content to Firestore:', error);
      showToast(`Failed to publish updates: ${error.message || 'Check Firestore permissions'}`, 'error');
      setIsSaving(false);
      return false;
    }
  };

  // Unpublish or toggle an individual section
  const unpublishSection = async (sectionKey: keyof MarketingSiteData): Promise<boolean> => {
    if (!isPlatformOwner(currentUser)) {
      showToast('Unauthorized.', 'error');
      return false;
    }

    const currentSection = (publishedContent as any)[sectionKey];
    if (typeof currentSection !== 'object' || currentSection === null) {
      showToast('Cannot toggle this section.', 'error');
      return false;
    }

    const updated = {
      ...publishedContent,
      [sectionKey]: {
        ...currentSection,
        enabled: !currentSection.enabled,
      }
    };

    return await publishLive(updated);
  };

  // Reset to Defaults
  const resetToDefaults = async (): Promise<boolean> => {
    if (!isPlatformOwner(currentUser)) {
      showToast('Unauthorized action.', 'error');
      return false;
    }

    const confirmed = window.confirm('Reset all marketing website content and branding back to system defaults? This will overwrite existing custom content.');
    if (!confirmed) return false;

    return await publishLive(DEFAULT_MARKETING_CONTENT);
  };

  return (
    <MarketingContext.Provider
      value={{
        marketingContent: activeMarketingContent,
        publishedContent,
        draftContent,
        isPreviewMode,
        isLiveSyncing,
        isSaving,
        hasUnpublishedChanges,
        togglePreviewMode,
        saveDraft,
        publishLive,
        unpublishSection,
        uploadLogo,
        removeLogo,
        uploadImage,
        resetToDefaults,
      }}
    >
      {children}
    </MarketingContext.Provider>
  );
};

export const useMarketing = () => {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error('useMarketing must be used within a MarketingProvider');
  }
  return context;
};
