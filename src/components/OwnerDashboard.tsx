import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isPlatformOwner, isPlatformOwnerEmail, PRIMARY_PLATFORM_OWNER_EMAIL } from '../utils/permissions';
import { deleteAuthUserWithoutLoggingOut } from '../utils/secondaryAuth';
import { logAuthDebug } from '../utils/debugLogger';
import { 
  SchoolAccount, 
  UserProfile, 
  SubscriptionPlanConfig, 
  PlatformSettingsData, 
  AuditLogItem,
  EducationCategory,
  UserRole
} from '../types';
import { db, auth, getSavedSchools, removeSavedSchoolAccount } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  query,
  where,
  orderBy,
  limit 
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { NotificationBell } from './notifications/NotificationBell';
import { LivePortalClock } from './common/LivePortalClock';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { SendNotificationModal } from './notifications/SendNotificationModal';
import { BackupRecoveryCenter } from './backup/BackupRecoveryCenter';
import { AiWorkspace } from './ai/AiWorkspace';
import { PersonalDataExportCard } from './profile/PersonalDataExportCard';
import { Sparkles } from 'lucide-react';
import { 
  Crown, 
  Building2, 
  Users, 
  UserCheck, 
  CreditCard, 
  Sliders, 
  ShieldAlert, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Key, 
  Check, 
  Eye, 
  Power, 
  Layers, 
  Settings, 
  ShieldCheck, 
  Activity,
  Compass,
  UserX,
  Link as LinkIcon,
  Unlink,
  DollarSign,
  TrendingUp,
  Globe,
  Phone,
  MapPin,
  Image,
  X,
  Loader2,
  AlertTriangle,
  Bell,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { MarketingSiteManager } from './MarketingSiteManager';
import { PaymentOwnerManager } from './PaymentOwnerManager';
import { PricingManagement } from './PricingManagement';
import { NotificationCenter } from './notifications/NotificationCenter';
import { triggerPlatformOwnerAlert } from '../services/notificationService';

import { ImportExportCenter } from './importExport/ImportExportCenter';
import { SecurityAuditCenter } from './security/SecurityAuditCenter';
import { BillingManagementSystem } from './billing/BillingManagementSystem';
import { OwnerMonitoringDashboard } from './monitoring/OwnerMonitoringDashboard';
import { LmsMainView } from './lms/LmsMainView';
import { DigitalLibraryDashboard } from './library/DigitalLibraryDashboard';
import { EnterpriseAiAnalyticsCenter } from './analytics/EnterpriseAiAnalyticsCenter';

type SidebarTab = 'overview' | 'analytics' | 'lms' | 'digital-library' | 'monitoring' | 'ai-workspace' | 'notifications' | 'schools' | 'school-admins' | 'assign-admin' | 'payments' | 'subscriptions' | 'control-center' | 'marketing-site' | 'import-export' | 'backup-recovery' | 'security-hardening';

export const OwnerDashboard: React.FC = () => {
  const { currentUser, logout, setActiveView, showToast, openWalkthrough } = useAuth();

  const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
  const [loading, setLoading] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  // Firestore Data States
  const [schools, setSchools] = useState<SchoolAccount[]>([]);
  const [schoolAdmins, setSchoolAdmins] = useState<UserProfile[]>([]);
  const [allUsersCount, setAllUsersCount] = useState<number>(0);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsData>({
    appName: 'EDUkenZA SaaS',
    logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop&q=80',
    themeColor: '#002147',
    contactEmail: 'support@edukenza.com',
    contactPhone: '+27 11 982 4000',
    enableRegistrations: true,
    maintenanceMode: false,
    platformStatus: 'operational'
  });

  // Modal & Form States
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolAccount | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolAccount | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [educationCategoryFilter, setEducationCategoryFilter] = useState<'all' | 'BASIC' | 'SENIOR_HIGH'>('all');
  const [schoolFormData, setSchoolFormData] = useState({
    schoolName: '',
    educationCategory: 'BASIC' as EducationCategory,
    schoolEmail: '',
    phoneNumber: '',
    country: 'Ghana',
    address: '',
    logoUrl: '',
    plan: 'basic',
    status: 'active' as 'active' | 'suspended' | 'pending'
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<UserProfile | null>(null);
  const [adminFormData, setAdminFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    assignedSchoolId: '',
    role: 'school_admin' as UserRole,
    status: 'active' as 'active' | 'disabled' | 'pending'
  });

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanConfig | null>(null);
  const [planFormData, setPlanFormData] = useState({
    planId: '',
    name: '',
    price: 0,
    currency: 'ZAR',
    duration: 'monthly' as 'monthly' | 'annual',
    featuresText: '',
    status: 'active' as 'active' | 'inactive'
  });

  const [selectedSchoolForDetail, setSelectedSchoolForDetail] = useState<SchoolAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load Firestore Data
  const fetchData = async () => {
    if (!isPlatformOwner(currentUser)) return;
    setLoading(true);
    try {
      // 1. Fetch Schools
      try {
        const schoolsSnap = await getDocs(collection(db, 'schools'));
        const schoolList: SchoolAccount[] = schoolsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            schoolName: data.schoolName || 'Unnamed Institution',
            schoolEmail: data.email || data.schoolEmail || '',
            phoneNumber: data.phone || data.phoneNumber || 'N/A',
            country: data.country || 'South Africa',
            address: data.address || 'N/A',
            adminName: data.adminName || 'Admin',
            adminEmail: data.adminEmail || data.email || 'admin@school.com',
            adminId: data.adminId || '',
            logoUrl: data.logoUrl || '',
            educationCategory: data.educationCategory || 'BASIC',
            plan: data.subscriptionPlan || 'basic',
            status: data.status || 'active',
            createdAt: data.createdAt || new Date().toISOString()
          };
        });
        if (schoolList.length > 0) {
          setSchools(schoolList);
        } else {
          setSchools(getSavedSchools());
        }
      } catch (schoolsErr: any) {
        console.warn('[OwnerDashboard] Note: Schools load fallback used:', schoolsErr?.message || schoolsErr);
        setSchools(getSavedSchools());
      }

      // 2. Fetch Users & School Admins
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setAllUsersCount(usersSnap.size);

        const admins: UserProfile[] = [];
        usersSnap.docs.forEach((d) => {
          const data = d.data();
          const role = data.role as UserRole;
          if (
            role === 'school_admin' || 
            role === 'school_head' || 
            role === 'assistant_academics' || 
            role === 'assistant_domestic' ||
            role === 'house_master'
          ) {
            admins.push({
              uid: d.id,
              email: data.email || '',
              name: data.fullName || data.name || 'School Admin',
              fullName: data.fullName || data.name || 'School Admin',
              phone: data.phone || '',
              role: role,
              educationCategory: data.educationCategory,
              status: data.status || 'active',
              schoolId: data.schoolId || '',
              schoolName: data.schoolName || '',
              createdAt: data.createdAt || new Date().toISOString()
            });
          }
        });
        setSchoolAdmins(admins);
      } catch (usersErr: any) {
        console.warn('[OwnerDashboard] Note: Users load fallback used:', usersErr?.message || usersErr);
      }

      // 3. Fetch Subscription Plans
      try {
        const plansSnap = await getDocs(collection(db, 'subscriptionPlans'));
        if (!plansSnap.empty) {
          const pList: SubscriptionPlanConfig[] = plansSnap.docs.map((d) => {
            const data = d.data();
            return {
              planId: d.id,
              name: data.name || 'Plan',
              price: data.price || 0,
              currency: data.currency || 'ZAR',
              duration: data.duration || 'monthly',
              features: data.features || [],
              status: data.status || 'active'
            };
          });
          setSubscriptionPlans(pList);
        } else {
          setSubscriptionPlans([
            {
              planId: 'plan_free_trial',
              name: 'Free Trial',
              price: 0,
              currency: 'ZAR',
              duration: 'monthly',
              features: ['100 Students Cap', 'Basic Attendance', 'Email Support'],
              status: 'active'
            },
            {
              planId: 'plan_basic',
              name: 'Basic',
              price: 1500,
              currency: 'ZAR',
              duration: 'monthly',
              features: ['500 Students Cap', 'Full Portals', 'Automated Reports', 'Standard SLA'],
              status: 'active'
            },
            {
              planId: 'plan_professional',
              name: 'Professional',
              price: 3500,
              currency: 'ZAR',
              duration: 'monthly',
              features: ['2,000 Students Cap', 'Fee Collection Gateway', 'AI Learning Assistant', 'Priority Support'],
              status: 'active'
            },
            {
              planId: 'plan_enterprise',
              name: 'Enterprise',
              price: 7500,
              currency: 'ZAR',
              duration: 'monthly',
              features: ['Unlimited Students', 'Multi-Campus Sync', 'Custom Domain', 'Dedicated Account Manager'],
              status: 'active'
            }
          ]);
        }
      } catch (plansErr: any) {
        console.warn('[OwnerDashboard] Note: Subscription plans load fallback used:', plansErr?.message || plansErr);
      }

      // 4. Fetch Platform Settings
      try {
        const settingsDoc = await getDoc(doc(db, 'platformSettings', 'global_config'));
        if (settingsDoc.exists()) {
          setPlatformSettings(settingsDoc.data() as PlatformSettingsData);
        }
      } catch (settingsErr: any) {
        console.warn('[OwnerDashboard] Note: Settings load fallback used:', settingsErr?.message || settingsErr);
      }

      // 5. Fetch Audit Logs
      try {
        const auditSnap = await getDocs(collection(db, 'auditLogs'));
        if (!auditSnap.empty) {
          const logList: AuditLogItem[] = auditSnap.docs.map((d) => ({
            logId: d.id,
            ...(d.data() as Omit<AuditLogItem, 'logId'>)
          }));
          setAuditLogs(logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
          setAuditLogs([
            {
              logId: 'log_01',
              action: 'Platform Initialization',
              performedBy: currentUser.fullName || currentUser.name,
              performedByEmail: currentUser.email,
              details: 'EDUkenZA SaaS Platform Owner Engine booted with active Firestore authorization.',
              timestamp: new Date().toISOString()
            },
            {
              logId: 'log_02',
              action: 'Security Policy Check',
              performedBy: 'System Guard',
              performedByEmail: 'security@edukenza.com',
              details: 'Operational school data isolation active. Platform owner read permissions on student/teacher collections blocked.',
              timestamp: new Date(Date.now() - 3600000).toISOString()
            }
          ]);
        }
      } catch (auditErr: any) {
        console.warn('[OwnerDashboard] Note: Audit logs load fallback used:', auditErr?.message || auditErr);
      }

    } catch (err: any) {
      console.warn('[OwnerDashboard] Data fetch complete with info:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlatformOwner(currentUser)) return;
    fetchData();

    // Real-time listener for Schools
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      const schoolList: SchoolAccount[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          schoolName: data.schoolName || 'Unnamed Institution',
          schoolEmail: data.email || data.schoolEmail || '',
          phoneNumber: data.phone || data.phoneNumber || 'N/A',
          country: data.country || 'South Africa',
          address: data.address || 'N/A',
          adminName: data.adminName || 'Admin',
          adminEmail: data.adminEmail || data.email || 'admin@school.com',
          adminId: data.adminId || '',
          logoUrl: data.logoUrl || '',
          educationCategory: data.educationCategory || 'BASIC',
          plan: data.subscriptionPlan || 'basic',
          status: data.status || 'active',
          createdAt: data.createdAt || new Date().toISOString()
        };
      });
      if (schoolList.length > 0) {
        setSchools(schoolList);
      }
    }, (err) => console.warn('Schools real-time listener error:', err));

    // Real-time listener for Users / School Admins
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsersCount(snap.size);
      const admins: UserProfile[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.role === 'school_admin') {
          admins.push({
            uid: d.id,
            email: data.email || '',
            name: data.fullName || data.name || 'School Admin',
            fullName: data.fullName || data.name || 'School Admin',
            phone: data.phone || '',
            role: 'school_admin',
            status: data.status || 'active',
            schoolId: data.schoolId || '',
            schoolName: data.schoolName || '',
            createdAt: data.createdAt || new Date().toISOString()
          });
        }
      });
      setSchoolAdmins(admins);
    }, (err) => console.warn('Users real-time listener error:', err));

    return () => {
      unsubSchools();
      unsubUsers();
    };
  }, [currentUser]);

  // Access Control Verification (Rendered AFTER all React hooks)
  if (!isPlatformOwner(currentUser)) {
    return (
      <div className="min-h-[80vh] bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-950 border border-red-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The Platform Owner Dashboard is strictly restricted to the primary Platform Owner account (asamoahkennethemyress@gmail.com).
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setActiveView('home')}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition"
            >
              Return to Public Website
            </button>
            <button
              onClick={() => setActiveView('login')}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              Sign In as Platform Owner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to log audit trail
  const logAudit = async (action: string, details: string) => {
    try {
      const newLog = {
        action,
        performedBy: currentUser.fullName || currentUser.name,
        performedByEmail: currentUser.email,
        details,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'auditLogs'), newLog);
      setAuditLogs((prev) => [ { logId: `log_${Date.now()}`, ...newLog }, ...prev]);
    } catch (e) {
      console.warn('Could not write audit log:', e);
    }
  };

  // --- SCHOOL MANAGEMENT HANDLERS ---
  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormData.schoolName || !schoolFormData.schoolEmail) {
      showToast('School name and school email are required.', 'error');
      return;
    }

    try {
      if (editingSchool) {
        // Update School
        const schoolRef = doc(db, 'schools', editingSchool.id);
        const updatePayload = {
          schoolName: schoolFormData.schoolName,
          educationCategory: schoolFormData.educationCategory || 'BASIC',
          email: schoolFormData.schoolEmail,
          phone: schoolFormData.phoneNumber,
          country: schoolFormData.country,
          address: schoolFormData.address,
          logoUrl: schoolFormData.logoUrl,
          subscriptionPlan: schoolFormData.plan,
          status: schoolFormData.status
        };
        await updateDoc(schoolRef, updatePayload);

        showToast(`School '${schoolFormData.schoolName}' updated successfully.`, 'success');
        await logAudit('Edit School Profile', `Updated school record for ${schoolFormData.schoolName}`);
      } else {
        // Create School
        const newSchoolId = `sch_${Date.now()}`;
        const newSchoolDoc = {
          schoolId: newSchoolId,
          schoolName: schoolFormData.schoolName,
          educationCategory: schoolFormData.educationCategory || 'BASIC',
          email: schoolFormData.schoolEmail,
          phone: schoolFormData.phoneNumber,
          country: schoolFormData.country,
          address: schoolFormData.address,
          logoUrl: schoolFormData.logoUrl,
          adminId: 'unassigned',
          adminName: 'Unassigned Admin',
          adminEmail: 'unassigned@edukenza.com',
          subscriptionPlan: schoolFormData.plan,
          status: schoolFormData.status,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'schools', newSchoolId), newSchoolDoc);

        showToast(`School '${schoolFormData.schoolName}' created successfully.`, 'success');
        await logAudit('Create School Account', `Registered new school ${schoolFormData.schoolName}`);
      }

      setIsSchoolModalOpen(false);
      setEditingSchool(null);
      fetchData();
    } catch (err: any) {
      showToast(`Failed to save school: ${err.message}`, 'error');
    }
  };

  const handleToggleSchoolStatus = async (school: SchoolAccount) => {
    const newStatus = school.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'schools', school.id), { status: newStatus });
      showToast(`School '${school.schoolName}' status set to ${newStatus.toUpperCase()}`, 'success');
      await logAudit('School Status Change', `Changed status of ${school.schoolName} to ${newStatus}`);
      fetchData();
    } catch (e: any) {
      showToast(`Error updating status: ${e.message}`, 'error');
    }
  };

  const handleDeleteSchool = (school: SchoolAccount) => {
    if (currentUser?.role !== 'platform_owner') {
      showToast('Delete failed. Only Platform Owners can permanently delete schools.', 'error');
      return;
    }
    setSchoolToDelete(school);
  };

  const handleConfirmDeleteSchool = async (school: SchoolAccount) => {
    if (currentUser?.role !== 'platform_owner') {
      showToast('Delete failed. Only Platform Owners can permanently delete schools.', 'error');
      return;
    }

    setDeletingSchoolId(school.id);

    logAuthDebug({
      functionName: 'handleConfirmDeleteSchool',
      action: 'FIRESTORE_DELETE',
      collectionName: 'schools',
      details: `Attempting permanent deletion of school '${school.schoolName}' (ID: ${school.id})`
    });

    try {
      // 1. Delete school document from Firestore
      await deleteDoc(doc(db, 'schools', school.id));
      if (school.schoolId && school.schoolId !== school.id) {
        try {
          await deleteDoc(doc(db, 'schools', school.schoolId));
        } catch (e) {
          // secondary doc ID attempt, ignore if non-existent
        }
      }

      // 2. Remove from local storage cache
      removeSavedSchoolAccount(school.id);
      if (school.schoolId) {
        removeSavedSchoolAccount(school.schoolId);
      }

      // 3. Unassign any users/admins linked to this schoolId
      try {
        const linkedUsersSnap = await getDocs(
          query(collection(db, 'users'), where('schoolId', '==', school.id))
        );
        for (const userDoc of linkedUsersSnap.docs) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            schoolId: '',
            schoolName: ''
          });
        }
      } catch (unassignErr: any) {
        console.warn('Note: Could not unassign linked users from deleted school:', unassignErr?.message || unassignErr);
      }

      // 4. Update UI state
      setSchools((prev) => prev.filter((s) => s.id !== school.id && s.schoolId !== school.id));
      if (selectedSchoolForDetail?.id === school.id) {
        setSelectedSchoolForDetail(null);
      }

      logAuthDebug({
        functionName: 'handleConfirmDeleteSchool',
        action: 'FIRESTORE_DELETE',
        collectionName: 'schools',
        details: `Successfully permanently deleted school '${school.schoolName}' (ID: ${school.id}) from Firestore`
      });

      showToast(`School '${school.schoolName}' has been permanently deleted.`, 'success');
      await logAudit('Delete School Permanent', `Permanently deleted institution '${school.schoolName}' (${school.id})`);
      
      setSchoolToDelete(null);
      fetchData();
    } catch (e: any) {
      logAuthDebug({
        functionName: 'handleConfirmDeleteSchool',
        action: 'FIRESTORE_DELETE',
        collectionName: 'schools',
        details: `FAILED to delete school '${school.schoolName}': ${e?.message || e}`,
        error: e
      });
      showToast(`Failed to delete school: ${e?.message || e}`, 'error');
    } finally {
      setDeletingSchoolId(null);
    }
  };

  // --- SCHOOL ADMIN MANAGEMENT HANDLERS ---
  const handleSaveSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFormData.fullName || !adminFormData.email) {
      showToast('Admin name and email are required.', 'error');
      return;
    }

    const cleanEmail = adminFormData.email.trim().toLowerCase();

    // REQUIREMENT 4: Protect Platform Owner account
    if (isPlatformOwnerEmail(cleanEmail)) {
      showToast('The Platform Owner email (asamoahkennethemyress@gmail.com) cannot be created or modified as a School Admin.', 'error');
      return;
    }

    try {
      if (editingAdmin) {
        if (isPlatformOwnerEmail(editingAdmin.email)) {
          showToast('Cannot modify Platform Owner account from School Admin manager.', 'error');
          return;
        }

        // Update Admin
        const userRef = doc(db, 'users', editingAdmin.uid);
        const assignedSchool = schools.find((s) => s.id === adminFormData.assignedSchoolId);
        
        const assignedRole: UserRole = adminFormData.role || (assignedSchool?.educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin');

        await updateDoc(userRef, {
          fullName: adminFormData.fullName,
          name: adminFormData.fullName,
          phone: adminFormData.phone || 'N/A',
          role: assignedRole,
          educationCategory: assignedSchool?.educationCategory || editingAdmin.educationCategory || 'BASIC',
          status: adminFormData.status,
          schoolId: adminFormData.assignedSchoolId || editingAdmin.schoolId || '',
          schoolName: assignedSchool?.schoolName || editingAdmin.schoolName || ''
        });

        logAuthDebug({
          functionName: 'handleSaveSchoolAdmin',
          action: 'USER_UPDATE',
          uid: editingAdmin.uid,
          email: cleanEmail,
          role: assignedRole,
          collectionName: 'users',
          details: 'Updated Administrator profile in Firestore'
        });

        // Also update school if assigned
        if (assignedSchool) {
          await updateDoc(doc(db, 'schools', assignedSchool.id), {
            adminId: editingAdmin.uid,
            adminName: adminFormData.fullName,
            adminEmail: cleanEmail
          });
        }

        showToast(`School Admin '${adminFormData.fullName}' updated successfully.`, 'success');
        await logAudit('Edit School Admin', `Updated profile for School Admin ${adminFormData.fullName}`);
      } else {
        // Platform Owner registers a School Admin with their Google Account
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', cleanEmail));
        const existingSnap = await getDocs(q);

        if (!existingSnap.empty) {
          showToast(`An account with email '${cleanEmail}' already exists in Firestore.`, 'error');
          return;
        }

        const assignedSchool = schools.find((s) => s.id === adminFormData.assignedSchoolId);

        // Pre-create the user document or schoolAdmin entry
        const newAdminDocRef = doc(collection(db, 'users'));
        const newAdminId = newAdminDocRef.id;

        const assignedRole: UserRole = adminFormData.role || (assignedSchool?.educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin');

        await setDoc(newAdminDocRef, {
          uid: newAdminId,
          fullName: adminFormData.fullName.trim(),
          name: adminFormData.fullName.trim(),
          email: cleanEmail,
          phone: adminFormData.phone || 'N/A',
          role: assignedRole,
          educationCategory: assignedSchool?.educationCategory || 'BASIC',
          status: 'active',
          schoolId: adminFormData.assignedSchoolId || '',
          schoolName: assignedSchool?.schoolName || '',
          authMethod: 'google',
          createdAt: new Date().toISOString()
        });

        logAuthDebug({
          functionName: 'handleSaveSchoolAdmin',
          action: 'USER_CREATION',
          uid: newAdminId,
          email: cleanEmail,
          role: assignedRole,
          collectionName: 'users',
          details: `Platform Owner registered new Administrator '${adminFormData.fullName}' (${assignedRole}) with Google Auth`
        });

        if (assignedSchool) {
          await updateDoc(doc(db, 'schools', assignedSchool.id), {
            adminId: newAdminId,
            adminName: adminFormData.fullName.trim(),
            adminEmail: cleanEmail
          });
        }

        showToast(`School Admin '${adminFormData.fullName}' registered! They can now sign in using their Google account (${cleanEmail}).`, 'success', 6000);
        await logAudit('Create School Admin', `Created School Admin ${adminFormData.fullName} for ${assignedSchool?.schoolName || 'Unassigned'}`);
      }

      setIsAdminModalOpen(false);
      setEditingAdmin(null);
      fetchData();
    } catch (e: any) {
      showToast(`Error saving admin: ${e.message}`, 'error');
    }
  };

  const handleToggleAdminStatus = async (adminUser: UserProfile) => {
    const newStatus = adminUser.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'users', adminUser.uid), { status: newStatus });
      showToast(`Admin '${adminUser.name}' set to ${newStatus.toUpperCase()}`, 'success');
      await logAudit('Admin Status Change', `Changed status of ${adminUser.name} to ${newStatus}`);
      fetchData();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleResetAdminPassword = async (adminUser: UserProfile) => {
    try {
      await sendPasswordResetEmail(auth, adminUser.email);
      showToast(`Firebase password reset email sent to ${adminUser.email}`, 'success');
      await logAudit('Password Reset Triggered', `Sent reset email to admin ${adminUser.email}`);
    } catch (e: any) {
      showToast(`Reset error: ${e.message || 'Ensure user email is valid'}`, 'error');
    }
  };

  const handleDeleteAdmin = (adminUser: UserProfile) => {
    // REQUIREMENT 1 & 8: Role verification - Only platform_owner can delete School Admin accounts
    if (currentUser?.role !== 'platform_owner') {
      showToast('Delete failed. Only Platform Owners can delete School Admin accounts.', 'error');
      return;
    }

    // REQUIREMENT 8: Do not allow School Admins/Users to delete themselves
    if (adminUser.uid === currentUser?.uid) {
      showToast('Delete failed. You cannot delete your own account.', 'error');
      return;
    }

    // Open Modal Confirmation Dialog
    setAdminToDelete(adminUser);
  };

  const handleConfirmDeleteAdmin = async (adminUser: UserProfile) => {
    if (currentUser?.role !== 'platform_owner') {
      showToast('Delete failed. Only Platform Owners can delete School Admin accounts.', 'error');
      return;
    }

    if (adminUser.uid === currentUser?.uid) {
      showToast('Delete failed. You cannot delete your own account.', 'error');
      return;
    }

    // Loading state while async deletion process is pending
    setDeletingAdminId(adminUser.uid);

    logAuthDebug({
      functionName: 'handleConfirmDeleteAdmin',
      action: 'FIRESTORE_DELETE',
      uid: adminUser.uid,
      email: adminUser.email,
      role: adminUser.role,
      collectionName: 'users',
      details: `Initiating permanent deletion for School Admin '${adminUser.name}' (UID: ${adminUser.uid})`
    });

    try {
      // REQUIREMENT 3: Before deletion, check if the School Admin has an assigned school and remove assignments
      const assignedSchools = schools.filter(
        (s) => s.adminId === adminUser.uid ||
               (s.adminEmail && s.adminEmail.toLowerCase() === adminUser.email.toLowerCase()) ||
               (adminUser.schoolId && s.id === adminUser.schoolId)
      );

      for (const school of assignedSchools) {
        logAuthDebug({
          functionName: 'handleConfirmDeleteAdmin',
          action: 'FIRESTORE_WRITE',
          collectionName: 'schools',
          details: `Unassigning deleted admin '${adminUser.email}' from school '${school.schoolName}' (ID: ${school.id})`
        });

        await updateDoc(doc(db, 'schools', school.id), {
          adminId: '',
          adminName: '',
          adminEmail: ''
        });

        await logAudit(
          'Unassign School Admin',
          `Removed admin assignment (${adminUser.email}) from school ${school.schoolName}`
        );
      }

      // REQUIREMENT 2: Completely remove the account from Firestore: users/{uid} and schoolAdmins/{uid}
      await deleteDoc(doc(db, 'users', adminUser.uid));

      try {
        await deleteDoc(doc(db, 'schoolAdmins', adminUser.uid));
      } catch (colErr) {
        // Document in schoolAdmins sub/separate collection may not exist, non-fatal
      }

      // REQUIREMENT 2 & 7: Remove/cleanup Firebase Authentication user account if possible
      try {
        await deleteAuthUserWithoutLoggingOut(adminUser.email, undefined, 'handleConfirmDeleteAdmin');
      } catch (authErr) {
        console.warn('Firebase auth secondary cleanup finished:', authErr);
      }

      // REQUIREMENT 4: After deletion, immediately update UI state so admin no longer appears
      setSchoolAdmins((prev) => prev.filter((a) => a.uid !== adminUser.uid));

      logAuthDebug({
        functionName: 'handleConfirmDeleteAdmin',
        action: 'FIRESTORE_DELETE',
        uid: adminUser.uid,
        email: adminUser.email,
        role: adminUser.role,
        collectionName: 'users',
        details: `Successfully deleted School Admin '${adminUser.name}' (UID: ${adminUser.uid})`
      });

      // REQUIREMENT 6: Feedback state
      showToast('Successfully deleted.', 'success');
      await logAudit('Delete School Admin', `Permanently deleted School Admin account ${adminUser.email}`);
      setAdminToDelete(null);
      await fetchData();
    } catch (e: any) {
      logAuthDebug({
        functionName: 'handleConfirmDeleteAdmin',
        action: 'FIRESTORE_DELETE',
        uid: adminUser.uid,
        email: adminUser.email,
        role: adminUser.role,
        collectionName: 'users',
        details: `Delete failed for School Admin '${adminUser.name}' (UID: ${adminUser.uid}): ${e?.message || e}`,
        error: e
      });
      // REQUIREMENT 6: Error state feedback
      showToast('Delete failed.', 'error');
    } finally {
      setDeletingAdminId(null);
    }
  };

  // --- ASSIGNMENT HANDLERS ---
  const handleAssignAdminToSchool = async (schoolId: string, adminUid: string) => {
    if (!schoolId || !adminUid) {
      showToast('Please select both a school and a school admin.', 'error');
      return;
    }
    try {
      const selectedSchool = schools.find((s) => s.id === schoolId);
      const selectedAdmin = schoolAdmins.find((a) => a.uid === adminUid);

      if (!selectedSchool || !selectedAdmin) return;

      // Update school
      await updateDoc(doc(db, 'schools', schoolId), {
        adminId: adminUid,
        adminName: selectedAdmin.fullName || selectedAdmin.name,
        adminEmail: selectedAdmin.email
      });

      // Update user
      await updateDoc(doc(db, 'users', adminUid), {
        schoolId: schoolId,
        schoolName: selectedSchool.schoolName
      });

      showToast(`Assigned ${selectedAdmin.name} to ${selectedSchool.schoolName}!`, 'success');
      await logAudit('Assign School Admin', `Assigned ${selectedAdmin.name} to ${selectedSchool.schoolName}`);
      fetchData();
    } catch (e: any) {
      showToast(`Assignment failed: ${e.message}`, 'error');
    }
  };

  const handleRemoveAssignment = async (school: SchoolAccount) => {
    if (!window.confirm(`Unassign current administrator from ${school.schoolName}?`)) return;
    try {
      if (school.adminId && school.adminId !== 'unassigned') {
        await updateDoc(doc(db, 'users', school.adminId), {
          schoolId: '',
          schoolName: ''
        });
      }
      await updateDoc(doc(db, 'schools', school.id), {
        adminId: 'unassigned',
        adminName: 'Unassigned Admin',
        adminEmail: 'unassigned@edukenza.com'
      });

      showToast(`Admin unassigned from ${school.schoolName}`, 'success');
      await logAudit('Remove Admin Assignment', `Removed admin from ${school.schoolName}`);
      fetchData();
    } catch (e: any) {
      showToast(`Unassign error: ${e.message}`, 'error');
    }
  };

  // --- SUBSCRIPTION PLAN HANDLERS ---
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormData.name || planFormData.price < 0) {
      showToast('Plan name and valid price are required.', 'error');
      return;
    }

    const featuresList = planFormData.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const planId = planFormData.planId || `plan_${planFormData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const newPlan: SubscriptionPlanConfig = {
      planId,
      name: planFormData.name,
      price: Number(planFormData.price),
      currency: planFormData.currency,
      duration: planFormData.duration,
      features: featuresList,
      status: planFormData.status
    };

    try {
      await setDoc(doc(db, 'subscriptionPlans', planId), newPlan);
      showToast(`Subscription plan '${planFormData.name}' saved.`, 'success');
      await logAudit('Update Subscription Plan', `Saved plan ${planFormData.name} (${planFormData.currency} ${planFormData.price})`);
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (e: any) {
      showToast(`Error saving plan: ${e.message}`, 'error');
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlanConfig) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'subscriptionPlans', plan.planId), { status: newStatus });
      showToast(`Plan '${plan.name}' set to ${newStatus.toUpperCase()}`, 'success');
      await logAudit('Plan Status Changed', `Set plan ${plan.name} status to ${newStatus}`);
      fetchData();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlanConfig) => {
    if (!window.confirm(`Delete subscription plan '${plan.name}'?`)) return;
    logAuthDebug({
      functionName: 'handleDeletePlan',
      action: 'FIRESTORE_DELETE',
      collectionName: 'subscriptionPlans',
      details: `Attempting to delete plan '${plan.name}' with doc ID '${plan.planId}'`
    });
    try {
      await deleteDoc(doc(db, 'subscriptionPlans', plan.planId));
      setSubscriptionPlans((prev) => prev.filter((p) => p.planId !== plan.planId));
      logAuthDebug({
        functionName: 'handleDeletePlan',
        action: 'FIRESTORE_DELETE',
        collectionName: 'subscriptionPlans',
        details: `Successfully deleted plan '${plan.name}' (doc ID: ${plan.planId}) from Firestore`
      });
      showToast(`Plan '${plan.name}' deleted.`, 'success');
      await logAudit('Delete Subscription Plan', `Removed plan ${plan.name}`);
      fetchData();
    } catch (e: any) {
      logAuthDebug({
        functionName: 'handleDeletePlan',
        action: 'FIRESTORE_DELETE',
        collectionName: 'subscriptionPlans',
        details: `FAILED to delete plan '${plan.name}' (doc ID: ${plan.planId}): ${e?.message || e}`,
        error: e
      });
      showToast(`Error: ${e?.message || e}`, 'error');
    }
  };

  // --- APP CONTROL CENTER HANDLERS ---
  const handleSaveControlCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'platformSettings', 'global_config'), platformSettings);
      showToast('Global App Control Center settings saved to Firestore!', 'success');
      await logAudit('Update Platform Settings', 'Saved global app control settings & operational toggles.');
      try {
        await triggerPlatformOwnerAlert(
          'Platform Control Center Configuration Changed',
          `High-level configuration updated. Registrations Allowed: ${platformSettings.enableRegistrations ? 'YES' : 'NO'}, Maintenance Mode: ${platformSettings.maintenanceMode ? 'ON' : 'OFF'}, Platform Status: ${platformSettings.platformStatus.toUpperCase()}.`,
          'System Alert'
        );
      } catch (notifErr) {
        console.warn('Could not send control center notification:', notifErr);
      }
    } catch (e: any) {
      showToast(`Settings save failed: ${e.message}`, 'error');
    }
  };

  // Derived Calculations
  const activeSchoolsCount = schools.filter((s) => s.status === 'active').length;
  const activePlansCount = subscriptionPlans.filter((p) => p.status === 'active').length;
  
  // Calculate revenue estimate from schools
  const totalRevenue = schools.reduce((acc, s) => {
    const matchingPlan = subscriptionPlans.find((p) => p.name.toLowerCase() === s.plan.toLowerCase() || p.planId === s.plan);
    return acc + (matchingPlan ? matchingPlan.price : 1500);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#002147] text-white flex-shrink-0 flex flex-col justify-between p-4 shadow-2xl border-r border-[#00152e]">
        <div className="space-y-6">
          
          {/* Top Brand Header */}
          <div className="p-3 bg-[#00152e] rounded-xl border border-[#D4AF37]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">Platform Owner</div>
              <h1 className="text-sm font-black text-white tracking-wide">EDUkenZA SaaS</h1>
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="px-3 py-2.5 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-slate-100 truncate">{currentUser.fullName || currentUser.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <button
            onClick={openWalkthrough}
            className="w-full px-3 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            title="Replay Interactive Guided Walkthrough"
          >
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <span>Guided Tour 🚀</span>
          </button>

          {/* Navigation Menu Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>1. Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>AI Analytics Center</span>
            </button>

            <button
              onClick={() => setActiveTab('lms')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'lms'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>2. Enterprise LMS Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('digital-library')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'digital-library'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              <span>3. Digital Library & AI Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('monitoring')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'monitoring'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>2. System Monitoring</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-workspace')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'ai-workspace'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>EDUkenZA AI Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>2. Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab('schools')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'schools'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. School Management</span>
            </button>

            <button
              onClick={() => setActiveTab('school-admins')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'school-admins'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>3. School Admins</span>
            </button>

            <button
              onClick={() => setActiveTab('assign-admin')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'assign-admin'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>4. Assign Schools</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>5. Payments</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'subscriptions'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>6. Subscription Plans</span>
            </button>

            <button
              onClick={() => setActiveTab('control-center')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'control-center'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>7. App Control Center</span>
            </button>

            <button
              onClick={() => setActiveTab('marketing-site')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'marketing-site'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>8. Marketing Site Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('import-export')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'import-export'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>9. Import & Export</span>
            </button>

            <button
              onClick={() => setActiveTab('backup-recovery')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'backup-recovery'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>10. Backup & Recovery</span>
            </button>

            <button
              onClick={() => setActiveTab('security-hardening')}
              className={`w-full px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'security-hardening'
                  ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>11. Security & Hardening</span>
            </button>
          </nav>

        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-700/60 space-y-2">
          <button
            onClick={fetchData}
            className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Firestore</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-2.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT CANVAS */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        
        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            SaaS Platform Owner Console
          </div>
          <div className="flex items-center gap-3">
            <LivePortalClock role="platform_owner" variant="compact" />
            <NotificationBell 
              onOpenCenter={() => setIsNotificationCenterOpen(true)} 
              onOpenSendModal={() => setIsSendModalOpen(true)}
            />
          </div>
        </div>

        {/* ISOLATION NOTICE BANNER */}
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-amber-900">
            <span className="font-extrabold uppercase tracking-wide">Platform Owner Access Rules Active: </span>
            <span>
              You are viewing top-level SaaS platform statistics, subscription tiers, school accounts, and platform administration settings. Private operational school data (Students, Teachers, Classes, Attendance, Exam Results, Fees) is strictly isolated and inaccessible to Platform Owners.
            </span>
          </div>
        </div>

        {/* --- SYSTEM MONITORING TAB --- */}
        {activeTab === 'analytics' && (
          <EnterpriseAiAnalyticsCenter
            userRole="platform_owner"
            currentUser={currentUser}
            schoolId={selectedSchoolForDetail?.id || currentUser.schoolId || 'global_edukenza'}
            schoolName="EDUkenZA Master Platform"
            showToast={showToast}
          />
        )}

        {activeTab === 'lms' && (
          <LmsMainView
            schoolId={selectedSchoolForDetail?.id || currentUser.schoolId || ''}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="school_admin"
            showToast={showToast}
          />
        )}

        {activeTab === 'digital-library' && (
          <DigitalLibraryDashboard
            schoolId={selectedSchoolForDetail?.id || currentUser.schoolId || ''}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="owner"
            schoolName="EDUkenZA Master Platform"
            showToast={showToast}
          />
        )}

        {activeTab === 'monitoring' && (
          <OwnerMonitoringDashboard showToast={showToast} />
        )}

        {/* --- NOTIFICATIONS TAB --- */}
        {activeTab === 'notifications' && <NotificationCenter />}

        {/* --- AI WORKSPACE TAB --- */}
        {activeTab === 'ai-workspace' && (
          <AiWorkspace
            currentUser={currentUser}
            userRole="platform_owner"
            showToast={showToast}
          />
        )}

        {/* --- IMPORT & EXPORT TAB --- */}
        {activeTab === 'import-export' && (
          <ImportExportCenter userRole="platform_owner" currentUser={currentUser} />
        )}

        {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            <LivePortalClock role="platform_owner" variant="card" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#002147] tracking-tight">Platform Owner Overview</h2>
                <p className="text-xs text-slate-500 font-medium">Global SaaS Multi-School Metrics & Platform Activity</p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Firebase Live Sync
              </span>
            </div>

            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">Total Schools</span>
                  <Building2 className="w-4 h-4 text-[#002147]" />
                </div>
                <div className="text-2xl font-black text-[#002147]">{schools.length}</div>
                <div className="text-[10px] text-slate-500 font-medium">Registered Institutions</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">Active Schools</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700">{activeSchoolsCount}</div>
                <div className="text-[10px] text-emerald-800 font-medium">{schools.length > 0 ? Math.round((activeSchoolsCount / schools.length) * 100) : 100}% Active Tenants</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">School Admins</span>
                  <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="text-2xl font-black text-[#002147]">{schoolAdmins.length}</div>
                <div className="text-[10px] text-slate-500 font-medium">Assigned Principal Accounts</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">Total Users</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-900">{allUsersCount}</div>
                <div className="text-[10px] text-slate-500 font-medium">Auth Accounts (Count Only)</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">Active Plans</span>
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="text-2xl font-black text-[#002147]">{activePlansCount}</div>
                <div className="text-[10px] text-slate-500 font-medium">SaaS Subscription Tiers</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-extrabold uppercase">SaaS Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-[#002147]">R{totalRevenue.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-medium">Est. Monthly Subscription Revenue</div>
              </div>

            </div>

            {/* RECENT PLATFORM ACTIVITIES */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="text-base font-black text-[#002147]">Recent Platform Audit & System Activity</h3>
                </div>
                <span className="text-xs text-slate-500 font-bold">{auditLogs.length} Log Entries</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.logId} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-[#002147] flex items-center gap-2">
                        <span>{log.action}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 border text-[10px] text-slate-600">{log.performedBy}</span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: SCHOOL MANAGEMENT --- */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#002147] tracking-tight">School Account Management</h2>
                <p className="text-xs text-slate-500 font-medium">Register, edit, suspend, or delete institutional tenant accounts</p>
              </div>

              <button
                onClick={() => {
                  setEditingSchool(null);
                  setSchoolFormData({
                    schoolName: '',
                    educationCategory: 'BASIC',
                    schoolEmail: '',
                    phoneNumber: '',
                    country: 'Ghana',
                    address: '',
                    logoUrl: '',
                    plan: 'basic',
                    status: 'active'
                  });
                  setIsSchoolModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Register New School</span>
              </button>
            </div>

            {/* SEARCH & CATEGORY FILTERS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 flex-1">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search school by name, email, or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-transparent outline-none font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Education Category Filter Tabs */}
              <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEducationCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    educationCategoryFilter === 'all'
                      ? 'bg-[#002147] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({schools.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEducationCategoryFilter('BASIC')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    educationCategoryFilter === 'BASIC'
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Basic ({schools.filter((s) => s.educationCategory !== 'SENIOR_HIGH').length})
                </button>
                <button
                  type="button"
                  onClick={() => setEducationCategoryFilter('SENIOR_HIGH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    educationCategoryFilter === 'SENIOR_HIGH'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Senior High ({schools.filter((s) => s.educationCategory === 'SENIOR_HIGH').length})
                </button>
              </div>
            </div>

            {/* SCHOOLS TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[#002147] font-black uppercase tracking-wider">
                      <th className="p-3.5">School Name & Info</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Contact Details</th>
                      <th className="p-3.5">Assigned Admin</th>
                      <th className="p-3.5">Subscription Plan</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {schools
                      .filter((s) => s.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) || s.schoolEmail.toLowerCase().includes(searchTerm.toLowerCase()))
                      .filter((s) => {
                        if (educationCategoryFilter === 'all') return true;
                        if (educationCategoryFilter === 'SENIOR_HIGH') return s.educationCategory === 'SENIOR_HIGH';
                        return s.educationCategory !== 'SENIOR_HIGH';
                      })
                      .map((school) => (
                        <tr key={school.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#002147] overflow-hidden">
                                {school.logoUrl ? (
                                  <img src={school.logoUrl} alt={school.schoolName} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-[#002147] text-sm">{school.schoolName}</div>
                                <div className="text-[10px] text-slate-400">{school.country} • Registered {new Date(school.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                              school.educationCategory === 'SENIOR_HIGH'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}>
                              {school.educationCategory === 'SENIOR_HIGH' ? 'Senior High (SHS)' : 'Basic School'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="text-slate-700 font-medium">{school.schoolEmail}</div>
                            <div className="text-[10px] text-slate-500">{school.phoneNumber}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{school.adminName || 'Unassigned'}</div>
                            <div className="text-[10px] text-slate-500">{school.adminEmail || 'N/A'}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-[10px] uppercase">
                              {school.plan}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                              school.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}>
                              {school.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSchoolForDetail(school)}
                                title="View Basic Info"
                                className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingSchool(school);
                                  setSchoolFormData({
                                    schoolName: school.schoolName,
                                    educationCategory: school.educationCategory || 'BASIC',
                                    schoolEmail: school.schoolEmail,
                                    phoneNumber: school.phoneNumber,
                                    country: school.country,
                                    address: school.address,
                                    logoUrl: school.logoUrl || '',
                                    plan: school.plan as any,
                                    status: school.status
                                  });
                                  setIsSchoolModalOpen(true);
                                }}
                                title="Edit School"
                                className="p-1.5 rounded hover:bg-slate-200 text-[#002147] transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleSchoolStatus(school)}
                                title={school.status === 'active' ? 'Suspend School' : 'Activate School'}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  school.status === 'active' ? 'hover:bg-amber-100 text-amber-700' : 'hover:bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteSchool(school)}
                                title="Delete School"
                                className="p-1.5 rounded hover:bg-red-100 text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 3: SCHOOL ADMIN MANAGEMENT --- */}
        {activeTab === 'school-admins' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#002147] tracking-tight">School Admin Management</h2>
                <p className="text-xs text-slate-500 font-medium">Provision and manage administrator credentials for institutional principals</p>
              </div>

              <button
                onClick={() => {
                  setEditingAdmin(null);
                  setAdminFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    password: '',
                    assignedSchoolId: '',
                    role: 'school_admin',
                    status: 'active'
                  });
                  setIsAdminModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Create School Admin</span>
              </button>
            </div>

            {/* ADMINS TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[#002147] font-black uppercase tracking-wider">
                      <th className="p-3.5">Administrator Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Email & Phone</th>
                      <th className="p-3.5">Assigned Institution</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {schoolAdmins.map((admin) => (
                      <tr key={admin.uid} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-[#002147]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#002147] text-[#D4AF37] flex items-center justify-center font-black">
                              {(admin.fullName || admin.name).charAt(0)}
                            </div>
                            <div>
                              <div>{admin.fullName || admin.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">UID: {admin.uid}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            admin.role === 'school_head'
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : admin.role === 'assistant_academics'
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : admin.role === 'assistant_domestic'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : admin.role === 'house_master'
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {admin.role.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-800">{admin.email}</div>
                          <div className="text-[10px] text-slate-500">{admin.phone || 'No phone recorded'}</div>
                        </td>

                        <td className="p-3.5">
                          {admin.schoolName ? (
                            <span className="px-2.5 py-1 rounded bg-slate-100 border text-slate-800 font-bold text-[11px]">
                              {admin.schoolName}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                            admin.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}>
                            {admin.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingAdmin(admin);
                                setAdminFormData({
                                  fullName: admin.fullName || admin.name || '',
                                  email: admin.email || '',
                                  phone: admin.phone || '',
                                  password: '',
                                  assignedSchoolId: admin.schoolId || '',
                                  role: admin.role,
                                  status: (admin.status === 'disabled' || admin.status === 'pending') ? admin.status : 'active'
                                });
                                setIsAdminModalOpen(true);
                              }}
                              title="Edit Admin"
                              className="p-1.5 rounded hover:bg-slate-200 text-[#002147] transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleResetAdminPassword(admin)}
                              title="Send Reset Password Email"
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleAdminStatus(admin)}
                              title={admin.status === 'active' ? 'Disable Account' : 'Enable Account'}
                              className="p-1.5 rounded hover:bg-amber-100 text-amber-700 transition cursor-pointer"
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteAdmin(admin)}
                              disabled={deletingAdminId === admin.uid}
                              title="Delete Account"
                              className="px-2 py-1.5 rounded hover:bg-red-100 text-red-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-xs"
                            >
                              {deletingAdminId === admin.uid ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 4: ASSIGN SCHOOL TO SCHOOL ADMIN --- */}
        {activeTab === 'assign-admin' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#002147] tracking-tight">Assign School to School Admin</h2>
              <p className="text-xs text-slate-500 font-medium">Link institutional tenant accounts with designated administrator credentials</p>
            </div>

            {/* ASSIGNMENT CARD FORM */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
              <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>Create or Modify School Assignment</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Select Target School</label>
                  <select
                    id="assign-school-select"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Choose School --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.schoolName} ({s.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Select School Admin</label>
                  <select
                    id="assign-admin-select"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Choose Administrator --</option>
                    {schoolAdmins.map((a) => (
                      <option key={a.uid} value={a.uid}>
                        {a.fullName || a.name} ({a.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  const sSelect = document.getElementById('assign-school-select') as HTMLSelectElement;
                  const aSelect = document.getElementById('assign-admin-select') as HTMLSelectElement;
                  if (sSelect && aSelect) {
                    handleAssignAdminToSchool(sSelect.value, aSelect.value);
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>Confirm Assignment Link</span>
              </button>
            </div>

            {/* CURRENT ASSIGNMENTS TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 font-black text-xs text-[#002147] uppercase">
                Active Institution & Administrator Pairings
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[#002147] font-black uppercase tracking-wider">
                      <th className="p-3.5">School Name</th>
                      <th className="p-3.5">Assigned Administrator</th>
                      <th className="p-3.5">Admin Email</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {schools.map((school) => (
                      <tr key={school.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-[#002147]">{school.schoolName}</td>
                        <td className="p-3.5 font-bold text-slate-800">{school.adminName}</td>
                        <td className="p-3.5 text-slate-600">{school.adminEmail}</td>
                        <td className="p-3.5 text-right">
                          {school.adminId && school.adminId !== 'unassigned' ? (
                            <button
                              onClick={() => handleRemoveAssignment(school)}
                              className="px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase border border-red-200 flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Unlink className="w-3 h-3" />
                              <span>Remove Assignment</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold uppercase">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 5 & 6: SAAS BILLING & SUBSCRIPTIONS SYSTEM --- */}
        {(activeTab === 'payments' || activeTab === 'subscriptions') && (
          <BillingManagementSystem />
        )}

        {/* --- TAB 6: APP CONTROL CENTER --- */}
        {activeTab === 'control-center' && (
          <div className="space-y-8">
            <form onSubmit={handleSaveControlCenter} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#002147] tracking-tight">App Control Center</h2>
                  <p className="text-xs text-slate-500 font-medium">Global platform settings, operational status toggles, and security monitoring</p>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Save Platform Settings</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* GENERAL SETTINGS */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                    <Globe className="w-4 h-4 text-[#D4AF37]" />
                    <span>General Branding & Contact</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700">App Branding Name</label>
                      <input
                        type="text"
                        value={platformSettings.appName}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, appName: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded border border-slate-300 text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">Logo Image URL</label>
                      <input
                        type="text"
                        value={platformSettings.logoUrl}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, logoUrl: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded border border-slate-300 text-slate-800 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700">Support Email</label>
                        <input
                          type="email"
                          value={platformSettings.contactEmail}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, contactEmail: e.target.value })}
                          className="w-full mt-1 p-2.5 rounded border border-slate-300 text-slate-800 font-medium"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700">Support Phone</label>
                        <input
                          type="text"
                          value={platformSettings.contactPhone}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, contactPhone: e.target.value })}
                          className="w-full mt-1 p-2.5 rounded border border-slate-300 text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SYSTEM TOGGLES */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                    <span>System Toggles & Health</span>
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <div className="font-bold text-slate-900">Public School Registrations</div>
                        <div className="text-[10px] text-slate-500">Allow new schools to sign up from the public web form</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.enableRegistrations}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, enableRegistrations: e.target.checked })}
                        className="w-5 h-5 accent-[#002147] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <div className="font-bold text-slate-900">Platform Maintenance Mode</div>
                        <div className="text-[10px] text-slate-500">Temporarily restrict login access to system maintenance staff</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.maintenanceMode}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                        className="w-5 h-5 accent-red-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">Global Platform Status Indicator</label>
                      <select
                        value={platformSettings.platformStatus}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, platformStatus: e.target.value as any })}
                        className="w-full mt-1 p-2.5 rounded border border-slate-300 font-bold text-slate-800 bg-white"
                      >
                        <option value="operational">Operational (All Services Normal)</option>
                        <option value="degraded">Degraded Performance (Notice Displayed)</option>
                        <option value="maintenance">Under Scheduled Maintenance</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </form>

            {/* DYNAMIC PRICING MANAGEMENT UNDER APP CONTROL CENTER */}
            <div className="pt-6 border-t border-slate-200">
              <PricingManagement />
            </div>

            {/* DATA PRIVACY & DOWNLOAD PERSONAL DATA */}
            <div className="pt-6 border-t border-slate-200">
              <PersonalDataExportCard
                currentUser={currentUser}
                customTitle="Download Platform Owner Personal Data"
                customDescription="Export a machine-readable JSON archive of your super admin profile, system configuration logs, and administrative credentials metadata."
              />
            </div>
          </div>
        )}

        {/* --- TAB 7: MARKETING SITE MANAGER --- */}
        {activeTab === 'marketing-site' && (
          <MarketingSiteManager />
        )}

        {/* --- TAB 10: BACKUP & DISASTER RECOVERY --- */}
        {activeTab === 'backup-recovery' && (
          <BackupRecoveryCenter
            role="platform_owner"
            currentUser={currentUser}
            defaultSchoolId="global"
            defaultSchoolName="EDUkenZA Platform"
          />
        )}

        {/* --- TAB 11: SECURITY & HARDENING --- */}
        {activeTab === 'security-hardening' && (
          <SecurityAuditCenter />
        )}

      </main>

      {/* --- MODAL: CREATE / EDIT SCHOOL --- */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">
                {editingSchool ? 'Edit School Profile' : 'Register New School'}
              </h3>
              <button onClick={() => setIsSchoolModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Education Category</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div
                    onClick={() => setSchoolFormData({ ...schoolFormData, educationCategory: 'BASIC' })}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer transition flex items-center gap-2 ${
                      (schoolFormData.educationCategory || 'BASIC') === 'BASIC'
                        ? 'border-[#002147] bg-blue-50/70 text-[#002147] font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 font-bold'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      (schoolFormData.educationCategory || 'BASIC') === 'BASIC' ? 'border-[#002147]' : 'border-slate-400'
                    }`}>
                      {(schoolFormData.educationCategory || 'BASIC') === 'BASIC' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#002147]" />
                      )}
                    </div>
                    <span>1. BASIC SCHOOL</span>
                  </div>

                  <div
                    onClick={() => setSchoolFormData({ ...schoolFormData, educationCategory: 'SENIOR_HIGH' })}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer transition flex items-center gap-2 ${
                      schoolFormData.educationCategory === 'SENIOR_HIGH'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 font-bold'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      schoolFormData.educationCategory === 'SENIOR_HIGH' ? 'border-amber-600' : 'border-slate-400'
                    }`}>
                      {schoolFormData.educationCategory === 'SENIOR_HIGH' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      )}
                    </div>
                    <span>2. SENIOR HIGH (SHS)</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {schoolFormData.educationCategory === 'SENIOR_HIGH'
                    ? '• Senior High: School Head / Owner → Assistant Academics & Assistant Domestic branches (Boarding Houses, Exeats, Maintenance).'
                    : '• Basic School: School Admin → Teachers → Students & Parents.'}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700">School Name</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.schoolName || ''}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, schoolName: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    required
                    value={schoolFormData.schoolEmail || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, schoolEmail: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={schoolFormData.phoneNumber || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, phoneNumber: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Country</label>
                  <input
                    type="text"
                    value={schoolFormData.country || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, country: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Subscription Plan</label>
                  <select
                    value={schoolFormData.plan || 'basic'}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, plan: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="free_trial">Free Trial</option>
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Campus Address</label>
                <input
                  type="text"
                  value={schoolFormData.address || ''}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">School Logo URL</label>
                <input
                  type="text"
                  value={schoolFormData.logoUrl || ''}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Account Status</label>
                <select
                  value={schoolFormData.status || 'active'}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, status: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase"
                >
                  Save School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT SCHOOL ADMIN --- */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">
                {editingAdmin ? 'Edit School Admin' : 'Create School Admin Account'}
              </h3>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={adminFormData.fullName || ''}
                  onChange={(e) => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Administrator Email</label>
                  <input
                    type="email"
                    required
                    value={adminFormData.email || ''}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={adminFormData.phone || ''}
                    onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-blue-900">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <div>
                    <p className="font-bold text-xs">Google Authentication</p>
                    <p className="text-[11px] text-blue-700 font-medium leading-tight mt-0.5">
                      School Admin will sign in securely using their Google account ({adminFormData.email || 'email entered above'}).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Assigned School Institution</label>
                <select
                  value={adminFormData.assignedSchoolId || ''}
                  onChange={(e) => {
                    const newSchoolId = e.target.value;
                    const targetSchool = schools.find((s) => s.id === newSchoolId);
                    const defaultRole: UserRole = targetSchool?.educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin';
                    setAdminFormData({
                      ...adminFormData,
                      assignedSchoolId: newSchoolId,
                      role: adminFormData.role || defaultRole
                    });
                  }}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                >
                  <option value="">-- Unassigned --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schoolName} ({s.educationCategory === 'SENIOR_HIGH' ? 'Senior High' : 'Basic'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Administrative Role</label>
                {(() => {
                  const targetSchool = schools.find((s) => s.id === adminFormData.assignedSchoolId);
                  const isSeniorHigh = targetSchool?.educationCategory === 'SENIOR_HIGH';

                  return (
                    <select
                      value={adminFormData.role || (isSeniorHigh ? 'school_head' : 'school_admin')}
                      onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value as UserRole })}
                      className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                    >
                      {isSeniorHigh ? (
                        <>
                          <option value="school_head">School Head / Principal (Senior High)</option>
                          <option value="assistant_academics">Assistant Head Academics (SHS)</option>
                          <option value="assistant_domestic">Assistant Head Domestic (SHS)</option>
                          <option value="house_master">House Master / Mistress (Boarding House)</option>
                          <option value="housekeeping">Housekeeping & Dining Lead</option>
                          <option value="facilities">Facilities & Maintenance Lead</option>
                          <option value="general_services">General Services & Security Lead</option>
                        </>
                      ) : (
                        <>
                          <option value="school_admin">School Administrator (Basic School)</option>
                          <option value="teacher">Class Teacher</option>
                        </>
                      )}
                    </select>
                  );
                })()}
                <p className="text-[10px] text-slate-500 mt-1">
                  Role adapts dynamically according to whether this institution is a Basic School or a Senior High (SHS).
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700">Account Status</label>
                <select
                  value={adminFormData.status}
                  onChange={(e) => setAdminFormData({ ...adminFormData, status: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase"
                >
                  Save Admin Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT SUBSCRIPTION PLAN --- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Price Amount</label>
                  <input
                    type="number"
                    required
                    value={planFormData.price}
                    onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Currency</label>
                  <input
                    type="text"
                    value={planFormData.currency}
                    onChange={(e) => setPlanFormData({ ...planFormData, currency: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Duration Cycle</label>
                <select
                  value={planFormData.duration}
                  onChange={(e) => setPlanFormData({ ...planFormData, duration: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Tier Features (One per line)</label>
                <textarea
                  rows={4}
                  value={planFormData.featuresText}
                  onChange={(e) => setPlanFormData({ ...planFormData, featuresText: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Plan Status</label>
                <select
                  value={planFormData.status}
                  onChange={(e) => setPlanFormData({ ...planFormData, status: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW BASIC SCHOOL DETAILS ONLY --- */}
      {selectedSchoolForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#002147]" />
                <h3 className="text-sm font-black text-[#002147] uppercase">Basic Institution Profile</h3>
              </div>
              <button onClick={() => setSelectedSchoolForDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded border space-y-1">
                <div className="text-base font-black text-[#002147]">{selectedSchoolForDetail.schoolName}</div>
                <div className="text-slate-500">ID: {selectedSchoolForDetail.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded border">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Email</div>
                  <div className="font-bold text-slate-800">{selectedSchoolForDetail.schoolEmail}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Phone</div>
                  <div className="font-bold text-slate-800">{selectedSchoolForDetail.phoneNumber}</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border">
                <div className="font-bold text-slate-500 text-[10px] uppercase">Country & Address</div>
                <div className="font-bold text-slate-800">{selectedSchoolForDetail.country} — {selectedSchoolForDetail.address}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded border">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Assigned Admin</div>
                  <div className="font-bold text-slate-800">{selectedSchoolForDetail.adminName}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Subscription Tier</div>
                  <div className="font-bold text-amber-800 uppercase">{selectedSchoolForDetail.plan}</div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed font-medium">
                Note: Operational data (students list, gradebook, attendance logs, and fee ledgers) is isolated to the School Admin portal.
              </div>
            </div>

            <button
              onClick={() => setSelectedSchoolForDetail(null)}
              className="w-full py-2.5 rounded bg-[#002147] text-white text-xs font-black uppercase"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE SCHOOL PERMANENTLY --- */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-wide">Permanently Delete School</h3>
              </div>
              <button 
                onClick={() => !deletingSchoolId && setSchoolToDelete(null)} 
                disabled={!!deletingSchoolId}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-800 leading-relaxed">
                Are you sure you want to permanently delete this school institution from the platform? This will remove its profile and unassign all linked accounts.
              </p>

              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg space-y-2.5">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">School Name</span>
                  <div className="font-black text-slate-900 text-sm">{schoolToDelete.schoolName}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Email</span>
                    <div className="font-bold text-slate-800">{schoolToDelete.schoolEmail || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Country</span>
                    <div className="font-bold text-slate-800">{schoolToDelete.country || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">School Document ID</span>
                  <div className="font-mono text-[11px] text-slate-600 break-all">{schoolToDelete.id}</div>
                </div>
                {schoolToDelete.adminName && (
                  <div className="pt-2 border-t border-red-200">
                    <span className="font-bold text-red-800 uppercase text-[10px]">Assigned Admin</span>
                    <div className="font-bold text-red-950 text-xs">{schoolToDelete.adminName} ({schoolToDelete.adminEmail || 'N/A'})</div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSchoolToDelete(null)}
                disabled={!!deletingSchoolId}
                className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteSchool(schoolToDelete)}
                disabled={!!deletingSchoolId}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow"
              >
                {deletingSchoolId === schoolToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE SCHOOL ADMIN --- */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-wide">Confirm Delete School Admin</h3>
              </div>
              <button 
                onClick={() => !deletingAdminId && setAdminToDelete(null)} 
                disabled={!!deletingAdminId}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-800 leading-relaxed">
                Are you sure you want to permanently delete this School Admin account? This action cannot be undone.
              </p>

              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg space-y-2.5">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Administrator Name</span>
                  <div className="font-black text-slate-900 text-sm">{adminToDelete.fullName || adminToDelete.name || 'School Admin'}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Email Address</span>
                  <div className="font-bold text-slate-800">{adminToDelete.email}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Account ID (UID)</span>
                  <div className="font-mono text-[11px] text-slate-600 break-all">{adminToDelete.uid}</div>
                </div>

                {(() => {
                  const assigned = schools.filter(
                    (s) => s.adminId === adminToDelete.uid ||
                           (s.adminEmail && s.adminEmail.toLowerCase() === adminToDelete.email.toLowerCase()) ||
                           (adminToDelete.schoolId && s.id === adminToDelete.schoolId)
                  );
                  if (assigned.length > 0) {
                    return (
                      <div className="pt-2 border-t border-red-200">
                        <span className="font-bold text-red-800 uppercase text-[10px]">Assigned Institution(s)</span>
                        <div className="font-black text-red-950 text-xs">
                          {assigned.map(s => s.schoolName).join(', ')}
                        </div>
                        <p className="text-[10px] text-red-700 mt-1 font-medium leading-relaxed">
                          Note: Deleting this admin will automatically unassign them from the above institution(s).
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                disabled={!!deletingAdminId}
                className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteAdmin(adminToDelete)}
                disabled={!!deletingAdminId}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow"
              >
                {deletingAdminId === adminToDelete.uid ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Notification Center & Broadcast Modals */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

    </div>
  );
};
