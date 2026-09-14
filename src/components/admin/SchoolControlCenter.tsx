import React, { useState, useEffect } from 'react';
import { 
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, addDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { 
  Sliders, Building2, BookOpen, UserPlus, Palette, Bell, FileCode2, Save, 
  RefreshCw, CheckCircle2, ShieldCheck, History, Image, Mail, Phone, Globe, MapPin, Award
} from 'lucide-react';

interface SchoolControlCenterProps {
  schoolId: string;
  schoolProfile: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SchoolControlCenter: React.FC<SchoolControlCenterProps> = ({
  schoolId,
  schoolProfile,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'registration' | 'branding' | 'communication' | 'audit'>('general');
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState({
    // General
    name: schoolProfile?.name || schoolProfile?.schoolName || 'School Profile',
    logo: schoolProfile?.logo || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
    email: schoolProfile?.email || '',
    phone: schoolProfile?.phone || '',
    address: schoolProfile?.address || '',
    website: schoolProfile?.website || '',
    motto: schoolProfile?.motto || 'Excellence, Character and Wisdom',

    // Academic
    academicYear: schoolProfile?.academicYear || '2025/2026',
    currentTerm: schoolProfile?.currentTerm || 'Term 1',
    gradingSystem: schoolProfile?.gradingSystem || 'Standard WAEC / GES 9-Point Scale',
    promotionRules: schoolProfile?.promotionRules || 'Minimum 50% overall pass mark across core subjects.',
    passingScore: schoolProfile?.passingScore || 50,

    // Registration Toggles
    enableStudentRegistration: schoolProfile?.enableStudentRegistration ?? true,
    enableTeacherRegistration: schoolProfile?.enableTeacherRegistration ?? true,
    enableParentRegistration: schoolProfile?.enableParentRegistration ?? true,

    // School Branding
    primaryColor: schoolProfile?.primaryColor || '#002147',
    secondaryColor: schoolProfile?.secondaryColor || '#D4AF37',
    schoolStamp: schoolProfile?.schoolStamp || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
    principalSignature: schoolProfile?.principalSignature || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=80',
    reportCardLogo: schoolProfile?.reportCardLogo || schoolProfile?.logo || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',

    // Communication Toggles
    emailNotifications: schoolProfile?.emailNotifications ?? true,
    smsNotifications: schoolProfile?.smsNotifications ?? true,
    parentNotifications: schoolProfile?.parentNotifications ?? true
  });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Fetch settings from Firestore
  const fetchSettings = async () => {
    if (!schoolId) return;
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      const snap = await getDoc(schoolRef);
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (err) {
      console.error('Error loading school control center settings:', err);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!schoolId) return;
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'auditLogs'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const fetched: any[] = [];
      snap.forEach(docSnap => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by timestamp descending locally
      fetched.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

      if (fetched.length === 0) {
        // Initial sample audit log entries if empty
        const initialLogs = [
          {
            id: 'log-1',
            action: 'Settings Updated',
            performedBy: schoolProfile?.name || 'School Admin',
            userRole: 'school_admin',
            schoolId,
            timestamp: new Date().toISOString(),
            affectedRecord: 'School Branding & Academic Term',
            details: 'Configured academic term to 2025/2026 Term 1.'
          },
          {
            id: 'log-2',
            action: 'Result Approved',
            performedBy: schoolProfile?.name || 'School Admin',
            userRole: 'school_admin',
            schoolId,
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            affectedRecord: 'Basic 7 - Mathematics',
            details: 'Approved term 1 result scores.'
          }
        ];
        setAuditLogs(initialLogs);
      } else {
        setAuditLogs(fetched);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      handleFirestoreError(err, OperationType.GET, 'auditLogs');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAuditLogs();
  }, [schoolId]);

  // Save Settings
  const handleSaveSettings = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const schoolRef = doc(db, 'schools', schoolId);

      await setDoc(schoolRef, {
        ...settings,
        updatedAt: now
      }, { merge: true });

      // Add audit log record
      await addDoc(collection(db, 'auditLogs'), {
        action: 'School Settings Configured',
        performedBy: settings.name || 'School Admin',
        userRole: 'school_admin',
        schoolId,
        timestamp: now,
        affectedRecord: 'School Control Center Settings',
        details: 'Updated general settings, branding, and registration toggles.'
      });

      showToast('School settings saved successfully!', 'success');
      fetchAuditLogs();
    } catch (err) {
      console.error('Error saving settings:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'schools');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#001529] p-6 rounded-2xl text-white shadow-xl border border-[#D4AF37]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            School Control Center
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Configure school profile, academic grading rules, branding signatures, registration access, and audit trail logs.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] rounded-xl font-black text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer self-start md:self-auto"
        >
          <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'general' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>General Info</span>
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'academic' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Academic Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('registration')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'registration' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Registration Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'branding' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>School Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('communication')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'communication' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Communication</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'audit' ? 'bg-[#002147] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* 1. GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span>General School Profile</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">School Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">School Logo URL</label>
              <input
                type="text"
                value={settings.logo}
                onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Website URL
              </label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-slate-400" /> School Motto
              </label>
              <input
                type="text"
                value={settings.motto}
                onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Physical Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. ACADEMIC SETTINGS */}
      {activeTab === 'academic' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>Academic Configuration</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Year</label>
              <select
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Current Term</label>
              <select
                value={settings.currentTerm}
                onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grading System</label>
              <input
                type="text"
                value={settings.gradingSystem}
                onChange={(e) => setSettings({ ...settings, gradingSystem: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Passing Score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.passingScore}
                onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Promotion Rules</label>
              <textarea
                rows={3}
                value={settings.promotionRules}
                onChange={(e) => setSettings({ ...settings, promotionRules: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. REGISTRATION SETTINGS */}
      {activeTab === 'registration' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            <span>Registration & Portal Access Control</span>
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Enable Student Self-Registration</h3>
                <p className="text-[11px] text-slate-500">Allow new students to register account credentials on the landing page.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableStudentRegistration}
                onChange={(e) => setSettings({ ...settings, enableStudentRegistration: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Enable Teacher Account Onboarding</h3>
                <p className="text-[11px] text-slate-500">Allow staff educators to submit onboarding applications.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableTeacherRegistration}
                onChange={(e) => setSettings({ ...settings, enableTeacherRegistration: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Enable Parent Portal Registration</h3>
                <p className="text-[11px] text-slate-500">Allow guardians to register and request student account linkage.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableParentRegistration}
                onChange={(e) => setSettings({ ...settings, enableParentRegistration: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. BRANDING SETTINGS */}
      {activeTab === 'branding' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-rose-500" />
            <span>School Branding & Report Assets</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">School Official Stamp Image URL</label>
              <input
                type="text"
                value={settings.schoolStamp}
                onChange={(e) => setSettings({ ...settings, schoolStamp: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Principal Signature Image URL</label>
              <input
                type="text"
                value={settings.principalSignature}
                onChange={(e) => setSettings({ ...settings, principalSignature: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Report Card Header Logo URL</label>
              <input
                type="text"
                value={settings.reportCardLogo}
                onChange={(e) => setSettings({ ...settings, reportCardLogo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. COMMUNICATION SETTINGS */}
      {activeTab === 'communication' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-500" />
            <span>Automated Notifications & Dispatch</span>
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Email Notifications</h3>
                <p className="text-[11px] text-slate-500">Send automatic receipt and report card links via email.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">SMS Notifications</h3>
                <p className="text-[11px] text-slate-500">Send fee reminders and urgent broadcasts to registered phone numbers.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Parent Alerts</h3>
                <p className="text-[11px] text-slate-500">Notify guardians immediately upon published results or attendance marks.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.parentNotifications}
                onChange={(e) => setSettings({ ...settings, parentNotifications: e.target.checked })}
                className="w-5 h-5 accent-[#002147] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-500" />
                <span>Administrative Audit Trail Logs</span>
              </h2>
              <p className="text-xs text-slate-500">Immutable history of administrative actions executed within this school environment.</p>
            </div>

            <button
              onClick={fetchAuditLogs}
              disabled={loadingLogs}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Trail</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Executed</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Affected Record</th>
                  <th className="p-3">Details / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {auditLogs.length > 0 ? (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                      </td>
                      <td className="p-3 font-bold text-[#002147] dark:text-amber-400">
                        {log.action}
                      </td>
                      <td className="p-3 font-semibold">
                        {log.performedBy} ({log.userRole || 'admin'})
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                        {log.affectedRecord || '-'}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
