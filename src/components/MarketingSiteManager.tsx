import React, { useState, useEffect } from 'react';
import { useMarketing } from '../context/MarketingContext';
import { PricingManagement } from './PricingManagement';
import { 
  MarketingSiteData, 
  TestimonialItem, 
  QuickLinkItem, 
  NavigationMenuItem, 
  BenefitItem 
} from '../types/marketing';
import { FeatureItem, PricingPlan, FaqItem, PlanType } from '../types';
import { 
  Globe, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  Sparkles, 
  Layers, 
  DollarSign, 
  HelpCircle, 
  PhoneCall, 
  Palette, 
  Layout, 
  Info,
  Check,
  Star,
  Link as LinkIcon,
  Eye,
  Send,
  ShieldCheck,
  Activity,
  Award,
  UserCheck,
  GraduationCap,
  Users,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react';
import { BrandLogo } from './brand/BrandLogo';

const LUCIDE_ICONS = [
  'GraduationCap', 
  'UserCheck', 
  'Users', 
  'CalendarCheck', 
  'Award', 
  'CreditCard', 
  'Clock', 
  'FileText', 
  'BarChart3', 
  'Sparkles',
  'BookOpen',
  'ShieldCheck',
  'School',
  'TrendingUp',
  'BellRing',
  'Check'
];

type ManagerTab = 
  | 'branding'
  | 'hero' 
  | 'about'
  | 'features' 
  | 'benefits'
  | 'roles'
  | 'tech'
  | 'pricing' 
  | 'testimonials' 
  | 'faq' 
  | 'contact' 
  | 'navigation';

export const MarketingSiteManager: React.FC = () => {
  const { 
    marketingContent,
    publishedContent,
    draftContent,
    isPreviewMode,
    isLiveSyncing, 
    isSaving, 
    hasUnpublishedChanges,
    togglePreviewMode,
    saveDraft, 
    publishLive,
    resetToDefaults,
    uploadLogo,
    removeLogo,
    uploadImage 
  } = useMarketing();

  const [activeTab, setActiveTab] = useState<ManagerTab>('branding');
  // Initialize form state with draft content if available, else marketingContent
  const [formData, setFormData] = useState<MarketingSiteData>(draftContent || marketingContent);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync internal state when draftContent changes
  useEffect(() => {
    setFormData(draftContent);
  }, [draftContent]);

  // Direct nested updaters
  const updateBranding = (field: keyof typeof formData.branding, value: string) => {
    setFormData((prev) => ({
      ...prev,
      branding: { ...prev.branding, [field]: value },
    }));
  };

  const updateHero = (field: keyof typeof formData.hero, value: any) => {
    setFormData((prev) => ({
      ...prev,
      hero: { ...prev.hero, [field]: value },
    }));
  };

  const updateAbout = (field: keyof typeof formData.about, value: any) => {
    setFormData((prev) => ({
      ...prev,
      about: { ...prev.about, [field]: value },
    }));
  };

  const updateContact = (field: keyof typeof formData.contactInfo, value: any) => {
    setFormData((prev) => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, [field]: value },
    }));
  };

  const updateSocialMedia = (field: keyof typeof formData.contactInfo.socialMedia, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        socialMedia: { ...prev.contactInfo.socialMedia, [field]: value },
      },
    }));
  };

  const updateFooter = (field: keyof typeof formData.footer, value: any) => {
    setFormData((prev) => ({
      ...prev,
      footer: { ...prev.footer, [field]: value },
    }));
  };

  // Image Upload Handler
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    onUrlChange: (url: string) => void, 
    fieldName: string,
    isLogo = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fieldName);
    setUploadError(null);

    try {
      let url = '';
      if (isLogo) {
        url = await uploadLogo(file);
      } else {
        url = await uploadImage(file);
      }
      onUrlChange(url);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Image upload failed. Please verify file is an image under 5MB.');
    } finally {
      setUploadingField(null);
    }
  };

  // Workflow Action Handlers
  const handleSaveDraft = async () => {
    await saveDraft(formData);
  };

  const handlePublishLive = async () => {
    await publishLive(formData);
  };

  const handleRemoveLogo = async () => {
    const success = await removeLogo();
    if (success) {
      setFormData((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          logoUrl: '',
        }
      }));
    }
  };

  /* ================= FEATURES MANAGERS ================= */
  const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(null);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState<FeatureItem>({
    id: '',
    title: '',
    description: '',
    iconName: 'GraduationCap',
    category: 'Administration',
    benefits: ['']
  });

  const openNewFeatureModal = () => {
    setFeatureForm({
      id: `feat-${Date.now()}`,
      title: '',
      description: '',
      iconName: 'GraduationCap',
      category: 'Administration',
      benefits: ['']
    });
    setEditingFeature(null);
    setIsFeatureModalOpen(true);
  };

  const openEditFeatureModal = (feat: FeatureItem) => {
    setFeatureForm({ ...feat, benefits: [...(feat.benefits || [''])] });
    setEditingFeature(feat);
    setIsFeatureModalOpen(true);
  };

  const saveFeatureItem = () => {
    if (!featureForm.title.trim() || !featureForm.description.trim()) return;

    setFormData((prev) => {
      const exists = prev.features.items.some((f) => f.id === featureForm.id);
      let updatedItems: FeatureItem[];
      if (exists) {
        updatedItems = prev.features.items.map((f) => (f.id === featureForm.id ? featureForm : f));
      } else {
        updatedItems = [...prev.features.items, featureForm];
      }
      return {
        ...prev,
        features: { ...prev.features, items: updatedItems }
      };
    });

    setIsFeatureModalOpen(false);
  };

  const deleteFeatureItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.filter((f) => f.id !== id)
      }
    }));
  };

  /* ================= BENEFITS MANAGERS ================= */
  const [editingBenefit, setEditingBenefit] = useState<BenefitItem | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [benefitForm, setBenefitForm] = useState<BenefitItem>({
    id: '',
    title: '',
    description: '',
    metric: '',
    metricLabel: '',
    iconName: 'Clock'
  });

  const openNewBenefitModal = () => {
    setBenefitForm({
      id: `ben-${Date.now()}`,
      title: '',
      description: '',
      metric: '95%',
      metricLabel: 'Improved Metric',
      iconName: 'Clock'
    });
    setEditingBenefit(null);
    setIsBenefitModalOpen(true);
  };

  const openEditBenefitModal = (ben: BenefitItem) => {
    setBenefitForm({ ...ben });
    setEditingBenefit(ben);
    setIsBenefitModalOpen(true);
  };

  const saveBenefitItem = () => {
    if (!benefitForm.title.trim() || !benefitForm.description.trim()) return;

    setFormData((prev) => {
      const exists = prev.benefits.items.some((b) => b.id === benefitForm.id);
      let updatedItems: BenefitItem[];
      if (exists) {
        updatedItems = prev.benefits.items.map((b) => (b.id === benefitForm.id ? benefitForm : b));
      } else {
        updatedItems = [...prev.benefits.items, benefitForm];
      }
      return {
        ...prev,
        benefits: { ...prev.benefits, items: updatedItems }
      };
    });

    setIsBenefitModalOpen(false);
  };

  const deleteBenefitItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        items: prev.benefits.items.filter((b) => b.id !== id)
      }
    }));
  };

  /* ================= TESTIMONIALS MANAGERS ================= */
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialItem>({
    id: '',
    name: '',
    role: 'Principal',
    schoolName: '',
    content: '',
    rating: 5,
    avatarUrl: ''
  });

  const openNewTestimonialModal = () => {
    setTestimonialForm({
      id: `test-${Date.now()}`,
      name: '',
      role: 'Principal',
      schoolName: '',
      content: '',
      rating: 5,
      avatarUrl: ''
    });
    setEditingTestimonial(null);
    setIsTestimonialModalOpen(true);
  };

  const openEditTestimonialModal = (item: TestimonialItem) => {
    setTestimonialForm({ ...item });
    setEditingTestimonial(item);
    setIsTestimonialModalOpen(true);
  };

  const saveTestimonialItem = () => {
    if (!testimonialForm.name.trim() || !testimonialForm.content.trim()) return;

    setFormData((prev) => {
      const exists = prev.testimonials.items.some((t) => t.id === testimonialForm.id);
      let updatedItems: TestimonialItem[];
      if (exists) {
        updatedItems = prev.testimonials.items.map((t) => (t.id === testimonialForm.id ? testimonialForm : t));
      } else {
        updatedItems = [...prev.testimonials.items, testimonialForm];
      }
      return {
        ...prev,
        testimonials: { ...prev.testimonials, items: updatedItems }
      };
    });

    setIsTestimonialModalOpen(false);
  };

  const deleteTestimonialItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: prev.testimonials.items.filter((t) => t.id !== id)
      }
    }));
  };

  /* ================= FAQ MANAGERS ================= */
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState<FaqItem>({
    id: '',
    question: '',
    answer: '',
    category: 'General'
  });

  const openNewFaqModal = () => {
    setFaqForm({
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
      category: 'General'
    });
    setEditingFaq(null);
    setIsFaqModalOpen(true);
  };

  const openEditFaqModal = (item: FaqItem) => {
    setFaqForm({ ...item });
    setEditingFaq(item);
    setIsFaqModalOpen(true);
  };

  const saveFaqItem = () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;

    setFormData((prev) => {
      const exists = prev.faq.items.some((f) => f.id === faqForm.id);
      let updatedItems: FaqItem[];
      if (exists) {
        updatedItems = prev.faq.items.map((f) => (f.id === faqForm.id ? faqForm : f));
      } else {
        updatedItems = [...prev.faq.items, faqForm];
      }
      return {
        ...prev,
        faq: { ...prev.faq, items: updatedItems }
      };
    });

    setIsFaqModalOpen(false);
  };

  const deleteFaqItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: prev.faq.items.filter((f) => f.id !== id)
      }
    }));
  };

  /* ================= NAVIGATION MANAGERS ================= */
  const [editingNav, setEditingNav] = useState<NavigationMenuItem | null>(null);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [navForm, setNavForm] = useState<NavigationMenuItem>({
    id: '',
    label: '',
    view: 'home',
    order: 1,
    enabled: true
  });

  const openNewNavModal = () => {
    setNavForm({
      id: `nav-${Date.now()}`,
      label: '',
      view: 'features',
      order: (formData.navigation.items.length || 0) + 1,
      enabled: true
    });
    setEditingNav(null);
    setIsNavModalOpen(true);
  };

  const openEditNavModal = (item: NavigationMenuItem) => {
    setNavForm({ ...item });
    setEditingNav(item);
    setIsNavModalOpen(true);
  };

  const saveNavItem = () => {
    if (!navForm.label.trim() || !navForm.view.trim()) return;

    setFormData((prev) => {
      const exists = prev.navigation.items.some((n) => n.id === navForm.id);
      let updatedItems: NavigationMenuItem[];
      if (exists) {
        updatedItems = prev.navigation.items.map((n) => (n.id === navForm.id ? navForm : n));
      } else {
        updatedItems = [...prev.navigation.items, navForm];
      }
      return {
        ...prev,
        navigation: { items: updatedItems }
      };
    });

    setIsNavModalOpen(false);
  };

  const deleteNavItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      navigation: {
        items: prev.navigation.items.filter((n) => n.id !== id)
      }
    }));
  };

  /* ================= QUICK LINKS MANAGERS ================= */
  const [quickLinkForm, setQuickLinkForm] = useState<QuickLinkItem>({ id: '', name: '', url: '' });
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false);

  const saveQuickLink = () => {
    if (!quickLinkForm.name.trim() || !quickLinkForm.url.trim()) return;

    setFormData((prev) => {
      const exists = prev.footer.quickLinks.some((q) => q.id === quickLinkForm.id);
      let updated: QuickLinkItem[];
      if (exists) {
        updated = prev.footer.quickLinks.map((q) => (q.id === quickLinkForm.id ? quickLinkForm : q));
      } else {
        updated = [...prev.footer.quickLinks, { ...quickLinkForm, id: `ql-${Date.now()}` }];
      }
      return {
        ...prev,
        footer: { ...prev.footer, quickLinks: updated }
      };
    });

    setIsQuickLinkModalOpen(false);
  };

  const deleteQuickLink = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: prev.footer.quickLinks.filter((q) => q.id !== id)
      }
    }));
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* TOP WORKFLOW CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#D4AF37]" />
              <span>Marketing Site Management</span>
            </h2>

            {/* Publishing Status Badge */}
            {hasUnpublishedChanges ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Draft (Unpublished Changes)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live Published</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Edit, preview, and publish all public marketing pages, branding, images, and content.
            {publishedContent.publishing?.publishedAt && (
              <span className="ml-2 text-slate-500">
                • Last published: {new Date(publishedContent.publishing.publishedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Reset button */}
          <button
            onClick={resetToDefaults}
            disabled={isSaving}
            className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700 disabled:opacity-50"
            title="Reset to default copy"
          >
            Reset Defaults
          </button>

          {/* Toggle Preview Mode */}
          <button
            onClick={() => togglePreviewMode()}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition border flex items-center gap-1.5 cursor-pointer ${
              isPreviewMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? 'Preview Mode: ON' : 'Preview Draft'}</span>
          </button>

          {/* Save as Draft Button */}
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-lg transition border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Draft</span>
          </button>

          {/* Publish Live Button */}
          <button
            onClick={handlePublishLive}
            disabled={isSaving}
            className="px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-lg transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* Upload error banner if any */}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'branding', label: '1. Logo & Branding', icon: Palette },
          { id: 'hero', label: '2. Hero Section', icon: Layout },
          { id: 'about', label: '3. About EDUkenZA', icon: Info },
          { id: 'features', label: '4. Features', icon: Sparkles },
          { id: 'benefits', label: '5. Benefits', icon: Award },
          { id: 'roles', label: '6. Role Showcases', icon: Users },
          { id: 'tech', label: '7. AI & Security', icon: ShieldCheck },
          { id: 'pricing', label: '8. Pricing Plans', icon: DollarSign },
          { id: 'testimonials', label: '9. Testimonials', icon: Star },
          { id: 'faq', label: '10. FAQ', icon: HelpCircle },
          { id: 'contact', label: '11. Contact & Support', icon: PhoneCall },
          { id: 'navigation', label: '12. Nav & Footer', icon: LinkIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ManagerTab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==========================================================
          TAB 1: LOGO & BRANDING (Comprehensive Upload/Replace/Remove)
          ========================================================== */}
      {activeTab === 'branding' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                <Palette className="w-5 h-5" />
                <span>Website Logo, Brand Identity & Color Palette</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload a custom brand logo, replace or remove it to restore default emblem, and adjust platform colors.
              </p>
            </div>
          </div>

          {/* Website Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Website / Platform Name
              </label>
              <input
                type="text"
                value={formData.websiteName || ''}
                maxLength={40}
                onChange={(e) => setFormData((prev) => ({ ...prev, websiteName: e.target.value }))}
                placeholder="e.g. EDUkenZA"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Displayed on navigation bar, footer, and titles.</span>
                <span>{(formData.websiteName || '').length}/40</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Logo Alt Description
              </label>
              <input
                type="text"
                value={formData.branding.logoAlt || ''}
                onChange={(e) => updateBranding('logoAlt', e.target.value)}
                placeholder="e.g. EDUkenZA Enterprise SaaS Logo"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          {/* Custom Logo Upload / Replace / Remove Section */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                  <span>Custom Website Logo</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Supported formats: PNG, JPG, WEBP, SVG (Max size: 5MB).
                </p>
              </div>

              {formData.branding.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Remove custom logo and restore default emblem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo (Restore Default)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-8 flex gap-2">
                <input
                  type="text"
                  value={formData.branding.logoUrl || ''}
                  onChange={(e) => updateBranding('logoUrl', e.target.value)}
                  placeholder="Paste direct Logo URL or click Upload"
                  className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
                />
                
                <label className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700 transition">
                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{uploadingField === 'logo' ? 'Uploading...' : 'Upload New Logo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleImageUpload(e, (url) => updateBranding('logoUrl', url), 'logo', true)}
                    className="hidden"
                    disabled={uploadingField === 'logo'}
                  />
                </label>
              </div>

              <div className="md:col-span-4 text-xs text-slate-400">
                {formData.branding.logoUrl ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Custom logo configured
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Using default EDUkenZA brand asset
                  </span>
                )}
              </div>
            </div>

            {/* LIVE PREVIEW COMPARISON BOX */}
            <div className="pt-3 border-t border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 uppercase mb-3">
                Live Brand Logo Previews
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Preview on Dark Navy Header */}
                <div className="bg-[#002147] border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-3">
                    Preview: Dark Navbar Background (#002147)
                  </div>
                  <div className="py-2 flex items-center">
                    <BrandLogo 
                      variant="full-dark" 
                      size="md" 
                      overrideLogoUrl={formData.branding.logoUrl}
                      overrideWebsiteName={formData.websiteName}
                    />
                  </div>
                </div>

                {/* Preview on Light Clean Canvas */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-3">
                    Preview: Light Background (#FFFFFF)
                  </div>
                  <div className="py-2 flex items-center">
                    <BrandLogo 
                      variant="full-light" 
                      size="md" 
                      overrideLogoUrl={formData.branding.logoUrl}
                      overrideWebsiteName={formData.websiteName}
                    />
                  </div>
                </div>

                {/* Preview as App Icon */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">
                    Preview: Compact Icon Only
                  </div>
                  <div className="py-2 flex items-center">
                    <BrandLogo 
                      variant="app-icon" 
                      size="md" 
                      overrideLogoUrl={formData.branding.logoUrl}
                      overrideWebsiteName={formData.websiteName}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Favicon & Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Favicon URL</label>
              <input
                type="text"
                value={formData.branding.faviconUrl || ''}
                onChange={(e) => updateBranding('faviconUrl', e.target.value)}
                placeholder="Custom Favicon URL (Optional)"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.branding.primaryColor || '#002147'}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.branding.primaryColor || '#002147'}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Secondary Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.branding.secondaryColor || '#D4AF37'}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.branding.secondaryColor || '#D4AF37'}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 2: HERO SECTION
          ========================================================== */}
      {activeTab === 'hero' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <Layout className="w-5 h-5" />
              <span>Hero Section</span>
            </h3>

            {/* Toggle Section Enabled */}
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.hero.enabled !== false}
                onChange={(e) => updateHero('enabled', e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
              />
              <span>Section Visible</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Badge Text */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Top Eyebrow Badge Text
              </label>
              <input
                type="text"
                value={formData.hero.badgeText || ''}
                onChange={(e) => updateHero('badgeText', e.target.value)}
                placeholder="e.g. Next-Gen Multi-School SaaS Architecture"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            {/* Headline */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Main Headline
                </label>
                <span className="text-[10px] text-slate-400">
                  {formData.hero.headline?.length || 0}/150
                </span>
              </div>
              <input
                type="text"
                value={formData.hero.headline}
                maxLength={150}
                onChange={(e) => updateHero('headline', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
              />
            </div>

            {/* Subtitle */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Description / Subtitle
                </label>
                <span className="text-[10px] text-slate-400">
                  {formData.hero.subtitle?.length || 0}/350
                </span>
              </div>
              <textarea
                value={formData.hero.subtitle}
                maxLength={350}
                onChange={(e) => updateHero('subtitle', e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
              />
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Primary CTA Button Label
                </label>
                <input
                  type="text"
                  value={formData.hero.primaryCtaText}
                  onChange={(e) => updateHero('primaryCtaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Secondary CTA Button Label
                </label>
                <input
                  type="text"
                  value={formData.hero.secondaryCtaText}
                  onChange={(e) => updateHero('secondaryCtaText', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            {/* Hero Image */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Hero Image URL / Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.hero.heroImageUrl || ''}
                  onChange={(e) => updateHero('heroImageUrl', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
                <label className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{uploadingField === 'heroImage' ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (url) => updateHero('heroImageUrl', url), 'heroImage')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 3: ABOUT SECTION
          ========================================================== */}
      {activeTab === 'about' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span>About EDUkenZA Section</span>
            </h3>

            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.about.enabled !== false}
                onChange={(e) => updateAbout('enabled', e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
              />
              <span>Section Visible</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Eyebrow Badge</label>
              <input
                type="text"
                value={formData.about.badgeText || ''}
                onChange={(e) => updateAbout('badgeText', e.target.value)}
                placeholder="e.g. About EDUkenZA"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline Title</label>
              <input
                type="text"
                value={formData.about.title}
                onChange={(e) => updateAbout('title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Sub-headline</label>
              <input
                type="text"
                value={formData.about.subtitle || ''}
                onChange={(e) => updateAbout('subtitle', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Detailed Narrative / Description</label>
              <textarea
                value={formData.about.description}
                onChange={(e) => updateAbout('description', e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Showcase Image URL / Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.about.imageUrl}
                  onChange={(e) => updateAbout('imageUrl', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
                <label className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (url) => updateAbout('imageUrl', url), 'aboutImage')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Highlights list */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Highlights Bullet Points</label>
              <div className="space-y-2">
                {(formData.about.highlights || []).map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => {
                        const next = [...(formData.about.highlights || [])];
                        next[i] = e.target.value;
                        updateAbout('highlights', next);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
                    />
                    <button
                      onClick={() => {
                        const next = (formData.about.highlights || []).filter((_, idx) => idx !== i);
                        updateAbout('highlights', next);
                      }}
                      className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const next = [...(formData.about.highlights || []), ''];
                    updateAbout('highlights', next);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Highlight Bullet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 4: FEATURES
          ========================================================== */}
      {activeTab === 'features' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Core SaaS Features Management</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize titles, icons, categories, descriptions, and feature bullet benefits.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.features.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    features: { ...prev.features, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>

              <button
                onClick={openNewFeatureModal}
                className="px-3 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feature</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline</label>
              <input
                type="text"
                value={formData.features.title}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  features: { ...prev.features, title: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Eyebrow Badge</label>
              <input
                type="text"
                value={formData.features.badgeText || ''}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  features: { ...prev.features, badgeText: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Subtitle</label>
            <textarea
              value={formData.features.subtitle}
              onChange={(e) => setFormData((prev) => ({
                ...prev,
                features: { ...prev.features, subtitle: e.target.value }
              }))}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
            />
          </div>

          {/* Features Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {formData.features.items.map((feat) => (
              <div key={feat.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {feat.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditFeatureModal(feat)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteFeatureItem(feat.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{feat.description}</p>
                </div>

                <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{feat.benefits?.length || 0} bullet benefits attached</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 5: BENEFITS
          ========================================================== */}
      {activeTab === 'benefits' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>Benefits Section Management</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize why schools choose EDUkenZA, highlight metrics (e.g. 75% Less Paperwork), and icons.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.benefits.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    benefits: { ...prev.benefits, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>

              <button
                onClick={openNewBenefitModal}
                className="px-3 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Benefit</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline</label>
              <input
                type="text"
                value={formData.benefits.title}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  benefits: { ...prev.benefits, title: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Eyebrow Badge</label>
              <input
                type="text"
                value={formData.benefits.badgeText || ''}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  benefits: { ...prev.benefits, badgeText: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Subtitle</label>
            <textarea
              value={formData.benefits.subtitle}
              onChange={(e) => setFormData((prev) => ({
                ...prev,
                benefits: { ...prev.benefits, subtitle: e.target.value }
              }))}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
            />
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {formData.benefits.items.map((ben) => (
              <div key={ben.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-black text-white">
                    {ben.metric}
                    <span className="text-[10px] text-slate-400 font-normal ml-1.5 uppercase tracking-wider block">
                      {ben.metricLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditBenefitModal(ben)} className="p-1 text-slate-400 hover:text-white">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteBenefitItem(ben.id)} className="p-1 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#D4AF37]">{ben.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ben.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 6: ROLE SHOWCASES (Teacher, Student, Parent Portals)
          ========================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* TEACHER SHOWCASE */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>Teacher Portal Showcase</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.teacherSection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    teacherSection: { ...prev.teacherSection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.teacherSection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    teacherSection: { ...prev.teacherSection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.teacherSection.subtitle}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    teacherSection: { ...prev.teacherSection, subtitle: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
              <textarea
                value={formData.teacherSection.description}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  teacherSection: { ...prev.teacherSection, description: e.target.value }
                }))}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* STUDENT SHOWCASE */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Student Portal Showcase</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.studentSection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    studentSection: { ...prev.studentSection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.studentSection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    studentSection: { ...prev.studentSection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.studentSection.subtitle}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    studentSection: { ...prev.studentSection, subtitle: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
              <textarea
                value={formData.studentSection.description}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  studentSection: { ...prev.studentSection, description: e.target.value }
                }))}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* PARENT SHOWCASE */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Parent Network Showcase</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.parentSection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    parentSection: { ...prev.parentSection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.parentSection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    parentSection: { ...prev.parentSection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.parentSection.subtitle}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    parentSection: { ...prev.parentSection, subtitle: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
              <textarea
                value={formData.parentSection.description}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  parentSection: { ...prev.parentSection, description: e.target.value }
                }))}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 7: AI, REAL-TIME & SECURITY SHOWCASES
          ========================================================== */}
      {activeTab === 'tech' && (
        <div className="space-y-6">
          {/* AI SECTION */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Gemini AI Showcase</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.aiSection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    aiSection: { ...prev.aiSection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.aiSection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    aiSection: { ...prev.aiSection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Eyebrow Badge</label>
                <input
                  type="text"
                  value={formData.aiSection.badgeText || ''}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    aiSection: { ...prev.aiSection, badgeText: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
              <textarea
                value={formData.aiSection.description}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  aiSection: { ...prev.aiSection, description: e.target.value }
                }))}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* REALTIME OPERATIONS SECTION */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Real-Time Management Section</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.realtimeSection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    realtimeSection: { ...prev.realtimeSection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.realtimeSection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    realtimeSection: { ...prev.realtimeSection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
                <input
                  type="text"
                  value={formData.realtimeSection.description}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    realtimeSection: { ...prev.realtimeSection, description: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* SECURITY SECTION */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Security & Multi-Tenant Isolation Section</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.securitySection.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    securitySection: { ...prev.securitySection, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={formData.securitySection.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    securitySection: { ...prev.securitySection, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description</label>
                <input
                  type="text"
                  value={formData.securitySection.description}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    securitySection: { ...prev.securitySection, description: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 8: PRICING SECTION
          ========================================================== */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#D4AF37] flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Pricing Section Settings</span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.pricing.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline</label>
                <input
                  type="text"
                  value={formData.pricing.title}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, title: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Eyebrow Badge</label>
                <input
                  type="text"
                  value={formData.pricing.badgeText || ''}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, badgeText: e.target.value }
                  }))}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Subtitle</label>
              <textarea
                value={formData.pricing.subtitle}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, subtitle: e.target.value }
                }))}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* Pricing Management Integrated Module */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Subscription Plan Limits & Features
            </h4>
            <PricingManagement />
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 9: TESTIMONIALS (VERIFIED ONLY)
          ========================================================== */}
      {activeTab === 'testimonials' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span>Testimonials (Verified Institutional Reviews Only)</span>
              </h3>
              <p className="text-xs text-amber-300/80 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Authentic verification rule: Only publish genuine reviews from real school clients.</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.testimonials.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>

              <button
                onClick={openNewTestimonialModal}
                className="px-3 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Testimonial</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline</label>
              <input
                type="text"
                value={formData.testimonials.title}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  testimonials: { ...prev.testimonials, title: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Eyebrow Badge</label>
              <input
                type="text"
                value={formData.testimonials.badgeText || ''}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  testimonials: { ...prev.testimonials, badgeText: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {formData.testimonials.items.map((item) => (
              <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#D4AF37]">
                      {Array.from({ length: item.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditTestimonialModal(item)} className="p-1 text-slate-400 hover:text-white">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTestimonialItem(item.id)} className="p-1 text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic">"{item.content}"</p>
                </div>

                <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                  <div className="font-bold text-white">{item.name}</div>
                  <div>{item.role} • {item.schoolName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 10: FAQ
          ========================================================== */}
      {activeTab === 'faq' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <span>Frequently Asked Questions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Add, edit, or delete FAQ accordion items.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.faq.enabled !== false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, enabled: e.target.checked }
                  }))}
                  className="rounded border-slate-700 bg-slate-950 text-[#D4AF37] focus:ring-0"
                />
                <span>Visible</span>
              </label>

              <button
                onClick={openNewFaqModal}
                className="px-3 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Headline</label>
              <input
                type="text"
                value={formData.faq.title}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  faq: { ...prev.faq, title: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Section Subtitle</label>
              <input
                type="text"
                value={formData.faq.subtitle}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  faq: { ...prev.faq, subtitle: e.target.value }
                }))}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {formData.faq.items.map((item) => (
              <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {item.category || 'General'}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.question}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.answer}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditFaqModal(item)} className="p-1 text-slate-400 hover:text-white">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteFaqItem(item.id)} className="p-1 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 11: CONTACT & SUPPORT
          ========================================================== */}
      {activeTab === 'contact' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <PhoneCall className="w-5 h-5" />
              <span>Contact & Institutional Support Information</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure public contact channels, operating hours, emergency hotlines, and social media handles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Official Email</label>
              <input
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => updateContact('email', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Telephone / Mobile</label>
              <input
                type="text"
                value={formData.contactInfo.phone}
                onChange={(e) => updateContact('phone', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Physical Address / Headquarters</label>
              <input
                type="text"
                value={formData.contactInfo.address}
                onChange={(e) => updateContact('address', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Support Operating Hours</label>
              <input
                type="text"
                value={formData.contactInfo.supportHours || ''}
                onChange={(e) => updateContact('supportHours', e.target.value)}
                placeholder="e.g. Mon - Fri: 8:00 AM - 6:00 PM GMT / EAT"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">24/7 Critical Emergency Helpline</label>
              <input
                type="text"
                value={formData.contactInfo.emergencyHotline || ''}
                onChange={(e) => updateContact('emergencyHotline', e.target.value)}
                placeholder="e.g. +27 (0) 11 980 4099"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Official Social Media URLs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'github'].map((network) => (
                <div key={network}>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    {network}
                  </label>
                  <input
                    type="text"
                    value={(formData.contactInfo.socialMedia as any)[network] || ''}
                    onChange={(e) => updateSocialMedia(network as any, e.target.value)}
                    placeholder={`https://${network}.com/...`}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 12: NAVIGATION & FOOTER
          ========================================================== */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          {/* NAVIGATION MENU ITEMS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#D4AF37] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>Header Navigation Links</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Manage menu items in the top navigation bar.
                </p>
              </div>

              <button
                onClick={openNewNavModal}
                className="px-3 py-1.5 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Nav Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {formData.navigation.items.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{item.label}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({item.view})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Order: {item.order}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditNavModal(item)} className="p-1 text-slate-400 hover:text-white">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteNavItem(item.id)} className="p-1 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER SETTINGS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-[#D4AF37] border-b border-slate-800 pb-3">
              Footer Content & Legal Disclaimers
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Copyright Text</label>
              <input
                type="text"
                value={formData.footer.copyrightText}
                onChange={(e) => updateFooter('copyrightText', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Disclaimer / Legal Notice</label>
              <textarea
                value={formData.footer.disclaimer || ''}
                onChange={(e) => updateFooter('disclaimer', e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Privacy Policy URL / View</label>
                <input
                  type="text"
                  value={formData.footer.privacyPolicyUrl}
                  onChange={(e) => updateFooter('privacyPolicyUrl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Terms of Service URL / View</label>
                <input
                  type="text"
                  value={formData.footer.termsOfServiceUrl}
                  onChange={(e) => updateFooter('termsOfServiceUrl', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODALS FOR CREATING / EDITING ITEMS
          ========================================================== */}

      {/* FEATURE MODAL */}
      {isFeatureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingFeature ? 'Edit Feature' : 'Add New Feature'}
              </h3>
              <button onClick={() => setIsFeatureModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Feature Title</label>
                <input
                  type="text"
                  value={featureForm.title}
                  onChange={(e) => setFeatureForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Category</label>
                <select
                  value={featureForm.category}
                  onChange={(e) => setFeatureForm((prev) => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                >
                  <option value="Administration">Administration</option>
                  <option value="Academics">Academics</option>
                  <option value="Portals">Portals</option>
                  <option value="Analytics">Analytics</option>
                  <option value="AI Technology">AI Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Icon</label>
                <select
                  value={featureForm.iconName}
                  onChange={(e) => setFeatureForm((prev) => ({ ...prev, iconName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                >
                  {LUCIDE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Description</label>
                <textarea
                  value={featureForm.description}
                  onChange={(e) => setFeatureForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsFeatureModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveFeatureItem}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black"
              >
                Save Feature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BENEFIT MODAL */}
      {isBenefitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingBenefit ? 'Edit Benefit' : 'Add New Benefit'}
              </h3>
              <button onClick={() => setIsBenefitModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Benefit Title</label>
                <input
                  type="text"
                  value={benefitForm.title}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Metric (e.g. 75%)</label>
                  <input
                    type="text"
                    value={benefitForm.metric}
                    onChange={(e) => setBenefitForm((prev) => ({ ...prev, metric: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Metric Label</label>
                  <input
                    type="text"
                    value={benefitForm.metricLabel}
                    onChange={(e) => setBenefitForm((prev) => ({ ...prev, metricLabel: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Description</label>
                <textarea
                  value={benefitForm.description}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBenefitModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveBenefitItem}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black"
              >
                Save Benefit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TESTIMONIAL MODAL */}
      {isTestimonialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingTestimonial ? 'Edit Testimonial' : 'Add Real Testimonial'}
              </h3>
              <button onClick={() => setIsTestimonialModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Person Name</label>
                  <input
                    type="text"
                    value={testimonialForm.name}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Role / Title</label>
                  <input
                    type="text"
                    value={testimonialForm.role}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">School / Institution Name</label>
                <input
                  type="text"
                  value={testimonialForm.schoolName}
                  onChange={(e) => setTestimonialForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Review Quote</label>
                <textarea
                  value={testimonialForm.content}
                  onChange={(e) => setTestimonialForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Star Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={testimonialForm.rating}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Avatar Image URL</label>
                  <input
                    type="text"
                    value={testimonialForm.avatarUrl || ''}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsTestimonialModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveTestimonialItem}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black"
              >
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
              </h3>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Question</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={faqForm.category || 'General'}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Answer</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, answer: e.target.value }))}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveFaqItem}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black"
              >
                Save FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION MODAL */}
      {isNavModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingNav ? 'Edit Nav Link' : 'Add Nav Link'}
              </h3>
              <button onClick={() => setIsNavModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Menu Label</label>
                <input
                  type="text"
                  value={navForm.label}
                  onChange={(e) => setNavForm((prev) => ({ ...prev, label: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Target View ID</label>
                <select
                  value={navForm.view}
                  onChange={(e) => setNavForm((prev) => ({ ...prev, view: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                >
                  <option value="home">Home</option>
                  <option value="features">Features</option>
                  <option value="about">About</option>
                  <option value="how-it-works">How It Works</option>
                  <option value="benefits">Benefits</option>
                  <option value="pricing">Pricing</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Display Order</label>
                <input
                  type="number"
                  value={navForm.order}
                  onChange={(e) => setNavForm((prev) => ({ ...prev, order: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsNavModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveNavItem}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black"
              >
                Save Nav Link
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
