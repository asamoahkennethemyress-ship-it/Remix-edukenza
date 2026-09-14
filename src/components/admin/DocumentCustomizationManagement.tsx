import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  FileText, 
  Receipt, 
  Eye, 
  Save, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Trash2,
  HelpCircle,
  Award
} from 'lucide-react';
import { 
  SchoolDocumentSettings, 
  DEFAULT_DOCUMENT_SETTINGS, 
  DEFAULT_GRADE_RULES,
  GradeRule 
} from '../../types/documentCustomization';
import { 
  getSchoolDocumentSettings, 
  saveSchoolDocumentSettings,
  subscribeSchoolDocumentSettings 
} from '../../services/documentCustomizationService';
import { PrintablePaymentReceipt } from '../documents/PrintablePaymentReceipt';
import { PrintableReportCard } from '../documents/PrintableReportCard';

interface DocumentCustomizationManagementProps {
  schoolId: string;
  schoolProfile: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COLOR_PRESETS = [
  { name: 'Oxford Navy & Gold', primary: '#002147', accent: '#D4AF37' },
  { name: 'Royal Blue & Amber', primary: '#1e3a8a', accent: '#f59e0b' },
  { name: 'Forest Green & Gold', primary: '#064e3b', accent: '#eab308' },
  { name: 'Burgundy & Champagne', primary: '#701a75', accent: '#fbbf24' },
  { name: 'Slate & Cyan', primary: '#0f172a', accent: '#06b6d4' },
  { name: 'Deep Crimson & Platinum', primary: '#881337', accent: '#e2e8f0' },
];

export const DocumentCustomizationManagement: React.FC<DocumentCustomizationManagementProps> = ({
  schoolId,
  schoolProfile,
  showToast
}) => {
  const [settings, setSettings] = useState<SchoolDocumentSettings>(DEFAULT_DOCUMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<'none' | 'receipt' | 'report'>('none');

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const unsub = subscribeSchoolDocumentSettings(schoolId, (fetched) => {
      setSettings(fetched);
      setLoading(false);
    }, schoolProfile);

    return () => unsub();
  }, [schoolId, schoolProfile]);

  const handleSave = async () => {
    if (!schoolId) {
      showToast('School ID is missing. Please reload.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await saveSchoolDocumentSettings(schoolId, settings);
      showToast('Document branding & layout settings saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save document settings:', err);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all document customization to standard school defaults?')) {
      setSettings({
        ...DEFAULT_DOCUMENT_SETTINGS,
        schoolId,
        schoolName: schoolProfile?.schoolName || DEFAULT_DOCUMENT_SETTINGS.schoolName,
        phone: schoolProfile?.phone || DEFAULT_DOCUMENT_SETTINGS.phone,
        email: schoolProfile?.email || DEFAULT_DOCUMENT_SETTINGS.email,
        address: schoolProfile?.address || DEFAULT_DOCUMENT_SETTINGS.address
      });
      showToast('Reset to default template styling.', 'info');
    }
  };

  const handleAddGradeRule = () => {
    setSettings(prev => ({
      ...prev,
      gradeRules: [
        ...prev.gradeRules,
        { minMark: 0, maxMark: 100, grade: 'E', remark: 'Satisfactory' }
      ]
    }));
  };

  const handleRemoveGradeRule = (index: number) => {
    setSettings(prev => ({
      ...prev,
      gradeRules: prev.gradeRules.filter((_, i) => i !== index)
    }));
  };

  const handleGradeRuleChange = (index: number, field: keyof GradeRule, value: any) => {
    setSettings(prev => {
      const updated = [...prev.gradeRules];
      updated[index] = {
        ...updated[index],
        [field]: field === 'minMark' || field === 'maxMark' ? Number(value) : value
      };
      return { ...prev, gradeRules: updated };
    });
  };

  // Sample data for instant live preview
  const sampleReceipt = {
    receiptNumber: 'REC-2026-PREVIEW',
    schoolId,
    studentId: 'EDU-2026-042',
    studentName: 'Kwame Mensah Boakye',
    parentName: 'Mr. Emmanuel Boakye',
    className: 'Form 3 Gold (Science)',
    feeType: 'Tuition & Examination Fee',
    amountDue: 2400,
    amountPaid: 2400,
    previousBalance: 2400,
    balance: 0,
    paymentMethod: 'MTN Mobile Money',
    transactionRef: 'MM-2026-984218',
    datePaid: new Date().toISOString().split('T')[0],
    receivedBy: settings.cashierTitle || 'Senior Bursar',
    notes: 'Term 1 full tuition settlement with cleared balance.',
    status: 'Verified & Cleared',
    academicYear: settings.academicYear || '2026',
    term: settings.academicTerm || 'Term 1, 2026'
  };

  const sampleReport = {
    id: 'REP-PREVIEW',
    reportId: 'REP-2026-081',
    schoolId,
    studentId: 'EDU-2026-042',
    studentName: 'Kwame Mensah Boakye',
    className: 'Form 3 Gold (Science)',
    academicYear: settings.academicYear || '2026',
    term: settings.academicTerm || 'Term 1, 2026',
    dateIssued: new Date().toISOString().split('T')[0],
    attendance: '64 / 65 Days (98.5%)',
    conduct: 'Exemplary & Diligent',
    classPosition: 2,
    overallTotalScore: 456,
    overallAverage: 91.2,
    promotionStatus: 'Promoted with Honors',
    nextClass: 'Form 4 Advanced',
    classTeacherComment: 'A very disciplined, inquisitive and academically outstanding student. Continues to lead by example in science and mathematics.',
    headteacherComment: 'Superb academic performance across all disciplines. Recommended for academic distinction.',
    subjectResults: [
      { subjectName: 'Integrated Science', caScore: 38, examScore: 56, totalScore: 94, grade: 'A', teacherRemark: 'Superb laboratory proficiency' },
      { subjectName: 'Core Mathematics', caScore: 37, examScore: 55, totalScore: 92, grade: 'A', teacherRemark: 'Excellent analytical dexterity' },
      { subjectName: 'English Language', caScore: 35, examScore: 53, totalScore: 88, grade: 'A', teacherRemark: 'Eloquent written prose and clarity' },
      { subjectName: 'Physics', caScore: 39, examScore: 57, totalScore: 96, grade: 'A', teacherRemark: 'Exceptional mastery of Newtonian dynamics' },
      { subjectName: 'Elective Chemistry', caScore: 36, examScore: 50, totalScore: 86, grade: 'A', teacherRemark: 'Strong stoichiometry analysis' }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#002147] text-[#D4AF37] flex items-center justify-center font-black shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-[#002147] uppercase tracking-wider">
              Document & Report Customization
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure school branding, color palette, signature titles, grading boundaries, and layout toggles for official Payment Receipts and Student Report Cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => setPreviewTab('receipt')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Receipt className="w-3.5 h-3.5 text-[#002147]" />
            <span>Preview Receipt</span>
          </button>

          <button
            onClick={() => setPreviewTab('report')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition"
          >
            <FileText className="w-3.5 h-3.5 text-[#002147]" />
            <span>Preview Report Card</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-[#D4AF37] text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Branding'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: School Identity & Palette */}
        <div className="space-y-6">
          {/* Section 1: School Identity */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              School Official Identity
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official School Name *</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  placeholder="e.g. EDUkenZA International Academy"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">School Motto / Tagline</label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  placeholder="e.g. Excellence, Integrity & Leadership"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">School Crest / Logo URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#002147]"
                    placeholder="https://... logo image"
                  />
                  {settings.logoUrl && (
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo preview" 
                      className="w-9 h-9 rounded-lg border border-slate-200 p-0.5 object-contain bg-white shrink-0" 
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-[11px] font-semibold"
                    placeholder="+233 24 000 0000"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-[11px] font-semibold"
                    placeholder="bursar@school.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">School Physical Address</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-[11px] font-semibold"
                  placeholder="P.O. Box 450, Cantonments, Accra"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">School Website</label>
                <input
                  type="text"
                  value={settings.website || ''}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-[11px] font-semibold"
                  placeholder="www.school.edu"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Document Color Palette */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#D4AF37]" />
              Color Palette & Theme
            </h3>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Preset Themes</span>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSettings({ ...settings, primaryColor: preset.primary, accentColor: preset.accent })}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer transition text-[11px]"
                  >
                    <div className="flex -space-x-1 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.primary }} />
                      <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <span className="font-bold text-slate-800 truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Accent / Gold Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Layout Toggles & Signature Authorities */}
        <div className="space-y-6">
          {/* Section 3: Visibility & Layout Options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D4AF37]" />
              Field Visibility Toggles
            </h3>

            <div className="space-y-2.5 text-xs">
              {[
                { key: 'showPosition', label: 'Show Student Class Position / Rank', desc: 'Calculates and shows position on report card' },
                { key: 'showAttendance', label: 'Show Attendance Tracking', desc: 'Displays total days attended / session total' },
                { key: 'showConduct', label: 'Show Student Conduct & Attitude', desc: 'Displays teacher assessment of conduct' },
                { key: 'showPreviousBalance', label: 'Show Remaining Balance on Receipts', desc: 'Shows outstanding fee balance after payment' },
                { key: 'showAmountInWords', label: 'Show Amount in Words on Receipts', desc: 'Formal currency in words (e.g. One Thousand Cedis)' },
                { key: 'showOfficialStamp', label: 'Show Official School Stamp Seal', desc: 'Renders authentic circular security seal' },
                { key: 'showGradeLegend', label: 'Show Grade Key Legend Table', desc: 'Displays interpretation scale at bottom of report' }
              ].map((item) => (
                <label 
                  key={item.key} 
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-[#002147] rounded border-slate-300 focus:ring-[#002147]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Signatures & Authority Titles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              Authorized Signatures & Titles
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Principal / Head of School Name</label>
                <input
                  type="text"
                  value={settings.principalName}
                  onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold"
                  placeholder="e.g. Dr. Kenneth Asamoah"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Principal Title / Label</label>
                <input
                  type="text"
                  value={settings.principalTitle}
                  onChange={(e) => setSettings({ ...settings, principalTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold"
                  placeholder="e.g. Head of School & Principal"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Bursar / Cashier Signature Title</label>
                <input
                  type="text"
                  value={settings.cashierTitle}
                  onChange={(e) => setSettings({ ...settings, cashierTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold"
                  placeholder="e.g. Senior Bursar / Finance Officer"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Class Teacher Title / Label</label>
                <input
                  type="text"
                  value={settings.classTeacherTitle}
                  onChange={(e) => setSettings({ ...settings, classTeacherTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold"
                  placeholder="e.g. Class Tutor / Form Master"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Grading Criteria & Document Texts */}
        <div className="space-y-6">
          {/* Section 5: Grading Criteria */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#D4AF37]" />
                Grading Scale & Remarks
              </h3>
              <button
                type="button"
                onClick={handleAddGradeRule}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Band
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-slate-500 uppercase px-1">
                <span className="col-span-2">Grade</span>
                <span className="col-span-2 text-center">Min %</span>
                <span className="col-span-2 text-center">Max %</span>
                <span className="col-span-5">Remark</span>
                <span className="col-span-1"></span>
              </div>

              {settings.gradeRules.map((rule, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    value={rule.grade}
                    onChange={(e) => handleGradeRuleChange(idx, 'grade', e.target.value)}
                    className="col-span-2 px-1.5 py-1 bg-white rounded border border-slate-300 font-black text-center text-xs"
                  />
                  <input
                    type="number"
                    value={rule.minMark}
                    onChange={(e) => handleGradeRuleChange(idx, 'minMark', e.target.value)}
                    className="col-span-2 px-1.5 py-1 bg-white rounded border border-slate-300 font-bold text-center text-xs"
                  />
                  <input
                    type="number"
                    value={rule.maxMark}
                    onChange={(e) => handleGradeRuleChange(idx, 'maxMark', e.target.value)}
                    className="col-span-2 px-1.5 py-1 bg-white rounded border border-slate-300 font-bold text-center text-xs"
                  />
                  <input
                    type="text"
                    value={rule.remark}
                    onChange={(e) => handleGradeRuleChange(idx, 'remark', e.target.value)}
                    className="col-span-5 px-1.5 py-1 bg-white rounded border border-slate-300 font-semibold text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGradeRule(idx)}
                    className="col-span-1 p-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Header & Footer Official Notices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              Official Disclaimers & Notices
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Document Header Subtitle</label>
                <input
                  type="text"
                  value={settings.headerText || ''}
                  onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold"
                  placeholder="Official School Administrative Record"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Document Footer Disclaimer</label>
                <textarea
                  rows={3}
                  value={settings.footerText || ''}
                  onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-xs resize-none"
                  placeholder="This is an authentic computer-generated record from the EDUkenZA School Management System..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: LIVE PREVIEW RECEIPT */}
      {previewTab === 'receipt' && (
        <PrintablePaymentReceipt
          receipt={sampleReceipt}
          settings={settings}
          onClose={() => setPreviewTab('none')}
          showToast={showToast}
        />
      )}

      {/* MODAL: LIVE PREVIEW REPORT CARD */}
      {previewTab === 'report' && (
        <PrintableReportCard
          report={sampleReport as any}
          settings={settings}
          classPositionText="2nd of 35 Students"
          onClose={() => setPreviewTab('none')}
          showToast={showToast}
        />
      )}
    </div>
  );
};
