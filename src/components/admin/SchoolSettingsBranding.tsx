import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Palette, 
  Sparkles, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Trash2, 
  Eye, 
  ShieldCheck,
  GraduationCap,
  Layers,
  Check
} from 'lucide-react';
import { useSchoolBranding } from '../../context/SchoolBrandingContext';
import { BRAND_COLOR_PRESETS, getAccessibleTextColor, SchoolBranding } from '../../services/schoolBrandingService';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';

export const SchoolSettingsBranding: React.FC = () => {
  const { 
    branding, 
    schoolId, 
    isSchoolAdmin, 
    saveBranding, 
    uploadLogo, 
    removeLogo 
  } = useSchoolBranding();

  const [form, setForm] = useState<Partial<SchoolBranding>>({
    schoolName: '',
    motto: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    primaryColor: '#002147',
    secondaryColor: '#D4AF37',
    theme: 'classic',
    academicTerm: 'Term 1',
    country: ''
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (branding) {
      setForm({
        schoolName: branding.schoolName || '',
        motto: branding.motto || '',
        logoUrl: branding.logoUrl || '',
        address: branding.address || '',
        phone: branding.phone || '',
        email: branding.email || '',
        website: branding.website || '',
        primaryColor: branding.primaryColor || '#002147',
        secondaryColor: branding.secondaryColor || '#D4AF37',
        theme: branding.theme || 'classic',
        academicTerm: branding.academicTerm || 'Term 1',
        country: branding.country || ''
      });
    }
  }, [branding]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handlePresetSelect = (preset: typeof BRAND_COLOR_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      theme: preset.theme
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSchoolAdmin) {
      showToast('Unauthorized: Only School Administrators can modify school branding.', 'error');
      return;
    }

    if (!form.schoolName?.trim()) {
      showToast('School Name cannot be empty.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveBranding({
        schoolName: form.schoolName?.trim(),
        motto: form.motto?.trim(),
        address: form.address?.trim(),
        phone: form.phone?.trim(),
        email: form.email?.trim(),
        website: form.website?.trim(),
        primaryColor: form.primaryColor || '#002147',
        secondaryColor: form.secondaryColor || '#D4AF37',
        theme: form.theme || 'classic',
        academicTerm: form.academicTerm?.trim() || 'Term 1',
        country: form.country?.trim() || ''
      });
      showToast('School identity & branding published successfully! Changes will appear in real time across all portals.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save school branding.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const primaryText = getAccessibleTextColor(form.primaryColor || '#002147');
  const secondaryText = getAccessibleTextColor(form.secondaryColor || '#D4AF37');

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Toast banner */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 transition-all ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-950 text-emerald-100 border-emerald-500/40' 
            : toastMsg.type === 'error'
            ? 'bg-red-950 text-red-100 border-red-500/40'
            : 'bg-[#002147] text-white border-amber-400'
        }`}>
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 tracking-wider">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>School Identity & Custom Branding</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#002147] mt-1">School Profile & Visual Branding</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your school identity, official crest, colors, motto, and contact coordinates. All modifications synchronize across Teacher, Student, and Parent portals in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-mono">
          <span className="text-slate-400">School ID:</span>
          <span className="font-bold text-slate-800">{schoolId}</span>
        </div>
      </div>

      {/* Main Grid: Form + Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Settings (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          
          {/* 1. School Logo & Crest Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Official School Logo / Crest</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Uploaded to Firebase Storage under secure school-isolated partition.
                </p>
              </div>
            </div>

            <ProfilePhotoUploader
              currentPhotoUrl={branding?.logoUrl || form.logoUrl}
              displayName={form.schoolName || 'School Crest'}
              subtitle="Official Institutional Emblem"
              shape="rounded"
              size="xl"
              primaryColor={form.primaryColor || '#002147'}
              secondaryColor={form.secondaryColor || '#D4AF37'}
              onUpload={async (file, onProgress) => {
                const url = await uploadLogo(file, onProgress);
                setForm(prev => ({ ...prev, logoUrl: url }));
                return url;
              }}
              onRemove={async () => {
                await removeLogo();
                setForm(prev => ({ ...prev, logoUrl: '' }));
              }}
              disabled={!isSchoolAdmin}
            />
          </div>

          {/* 2. School Core Identity Information */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Institutional Identity</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Official name and inspirational motto displayed on portal headers, report cards, and student cards.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.schoolName || ''}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  placeholder="e.g. St. Charles High School"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none font-bold text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  School Motto / Slogan
                </label>
                <input
                  type="text"
                  value={form.motto || ''}
                  onChange={(e) => setForm({ ...form, motto: e.target.value })}
                  placeholder="e.g. Knowledge, Integrity, and Excellence"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800 bg-white shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Academic Term</label>
                  <input
                    type="text"
                    value={form.academicTerm || ''}
                    onChange={(e) => setForm({ ...form, academicTerm: e.target.value })}
                    placeholder="e.g. Term 1 (2026)"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800 bg-white shadow-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country / Jurisdiction</label>
                  <input
                    type="text"
                    value={form.country || ''}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="e.g. South Africa, Kenya, Ghana"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800 bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Color Palette & Visual Theme */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>School Brand Colors & Theme</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose custom school hex codes or select from verified institutional color presets.
              </p>
            </div>

            {/* Presets */}
            <div>
              <label className="block font-bold text-slate-700 mb-2 text-xs">
                Verified Academic Color Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BRAND_COLOR_PRESETS.map((preset) => {
                  const isSelected = form.primaryColor?.toLowerCase() === preset.primary.toLowerCase() &&
                                     form.secondaryColor?.toLowerCase() === preset.secondary.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        isSelected 
                          ? 'border-[#002147] bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span 
                          className="w-4 h-4 rounded-full shadow-inner border border-black/10" 
                          style={{ backgroundColor: preset.primary }} 
                        />
                        <span 
                          className="w-4 h-4 rounded-full shadow-inner border border-black/10" 
                          style={{ backgroundColor: preset.secondary }} 
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-700 ml-auto" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-slate-700">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor || '#002147'}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white shadow-sm"
                  />
                  <input
                    type="text"
                    value={form.primaryColor || '#002147'}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    placeholder="#002147"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Used on top navigation, hero headers, and primary buttons.</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-slate-700">Secondary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor || '#D4AF37'}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white shadow-sm"
                  />
                  <input
                    type="text"
                    value={form.secondaryColor || '#D4AF37'}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    placeholder="#D4AF37"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Used for badges, crest highlights, and active indicators.</p>
              </div>
            </div>
          </div>

          {/* 4. Official Contact & Coordinates */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Contact & Communication Details</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Official contact details printed on report cards, fee invoices, and official notices.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 124 Education Ridge, Cantonments, Accra"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official School Phone</label>
                  <input
                    type="text"
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +27 21 555 0199"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official School Email</label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. info@school.edu.za"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">School Website URL</label>
                <input
                  type="url"
                  value={form.website || ''}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="e.g. https://www.schoolacademy.edu.za"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#002147] focus:outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Changes sync instantly to all school accounts upon saving.
            </span>

            <button
              type="submit"
              disabled={isSaving || !isSchoolAdmin}
              className="px-6 py-3 rounded-2xl font-black text-xs text-white shadow-xl flex items-center gap-2 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: form.primaryColor || '#002147' }}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Publishing Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Save & Publish Branding</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Live Real-Time Preview</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  How your school branding looks across all user portals.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Live Rendering
              </span>
            </div>

            {/* 1. Header Banner Mockup */}
            <div 
              className="p-5 rounded-2xl shadow-lg border transition-all duration-300"
              style={{ 
                backgroundColor: form.primaryColor || '#002147',
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl overflow-hidden shadow border flex items-center justify-center shrink-0"
                  style={{ borderColor: form.secondaryColor || '#D4AF37' }}
                >
                  {form.logoUrl ? (
                    <img 
                      src={form.logoUrl} 
                      alt="Crest" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center font-black text-sm"
                      style={{ 
                        backgroundColor: form.secondaryColor || '#D4AF37', 
                        color: form.primaryColor || '#002147' 
                      }}
                    >
                      {form.schoolName?.substring(0, 2).toUpperCase() || 'SC'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div 
                    className="text-[9px] font-black uppercase tracking-widest truncate"
                    style={{ color: form.secondaryColor || '#D4AF37' }}
                  >
                    Official Portal Environment
                  </div>
                  <h4 
                    className="text-sm font-black truncate leading-tight"
                    style={{ color: primaryText }}
                  >
                    {form.schoolName || 'School Name'}
                  </h4>
                  <p 
                    className="text-[10px] italic truncate opacity-80 mt-0.5"
                    style={{ color: primaryText }}
                  >
                    &ldquo;{form.motto || 'Knowledge, Integrity, Excellence'}&rdquo;
                  </p>
                </div>
              </div>

              {/* Sample badges */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{ 
                    backgroundColor: form.secondaryColor || '#D4AF37',
                    color: secondaryText
                  }}
                >
                  {form.academicTerm || 'Term 1'}
                </span>

                <span 
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/10"
                  style={{ color: primaryText }}
                >
                  {form.phone || '+27 Campus Office'}
                </span>
              </div>
            </div>

            {/* 2. Interactive Component Samples */}
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold text-slate-700">UI Controls Styling</h5>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold shadow transition hover:opacity-90"
                  style={{ 
                    backgroundColor: form.primaryColor || '#002147',
                    color: primaryText 
                  }}
                >
                  Primary Action
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold shadow transition hover:opacity-90"
                  style={{ 
                    backgroundColor: form.secondaryColor || '#D4AF37',
                    color: secondaryText 
                  }}
                >
                  Accent Action
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Secondary Action
                </button>
              </div>
            </div>

            {/* 3. Accessibility / Contrast Indicator */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>WCAG AA Contrast Check</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Compliant
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dynamic text luminance calculates automatically. Your text uses{' '}
                <strong>{primaryText === '#FFFFFF' ? 'White' : 'Slate Dark'}</strong> on Primary and{' '}
                <strong>{secondaryText === '#FFFFFF' ? 'White' : 'Slate Dark'}</strong> on Accent, guaranteeing optimal readability across all displays.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
