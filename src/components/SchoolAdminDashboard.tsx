import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { isPlatformOwnerEmail } from '../utils/permissions';
import { createAuthUserWithoutLoggingIn } from '../utils/secondaryAuth';
import { formatStudentAuthEmail } from '../utils/studentAuthHelper';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { SidebarNavigation, AdminTab } from './SidebarNavigation';
import { TimetableManagement } from './admin/TimetableManagement';
import { PaymentManagement } from './admin/PaymentManagement';
import { AcademicReportManagement } from './admin/AcademicReportManagement';
import { ExaminationsManagement } from './admin/ExaminationsManagement';
import { CommunicationCenter } from './admin/CommunicationCenter';
import { AttendanceManagement } from './admin/AttendanceManagement';
import { BiometricControlCenter } from './biometric/BiometricControlCenter';
import { BiometricPasskeysSettings } from './biometric/BiometricPasskeysSettings';
import { PersonalDataExportCard } from './profile/PersonalDataExportCard';
import { LeaveManagement } from './admin/LeaveManagement';
import { ReportsAnalytics } from './admin/ReportsAnalytics';
import { EnterpriseAiAnalyticsCenter } from './analytics/EnterpriseAiAnalyticsCenter';
import { ResultApprovalManagement } from './admin/ResultApprovalManagement';
import { SchoolControlCenter } from './admin/SchoolControlCenter';
import { ImportExportCenter } from './importExport/ImportExportCenter';
import { BackupRecoveryCenter } from './backup/BackupRecoveryCenter';
import { SecurityAuditCenter } from './security/SecurityAuditCenter';
import { SchoolAdminBillingCenter } from './billing/SchoolAdminBillingCenter';
import { SchoolAdminGoogleMeetMonitor } from './admin/SchoolAdminGoogleMeetMonitor';
import { GoogleFormsManager } from './common/GoogleFormsManager';
import { LmsMainView } from './lms/LmsMainView';
import { DigitalLibraryDashboard } from './library/DigitalLibraryDashboard';
import { NotificationBell } from './notifications/NotificationBell';
import { LivePortalClock } from './common/LivePortalClock';
import { NotificationCenter } from './notifications/NotificationCenter';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { SendNotificationModal } from './notifications/SendNotificationModal';
import { triggerNewStudentNotification } from '../services/notificationService';
import { AiWorkspace } from './ai/AiWorkspace';
import { EnterpriseDailyServicesModule } from './dailyServices/EnterpriseDailyServicesModule';
import { logAuditEvent } from '../services/auditHistoryService';
import { SchoolBrandedHeader } from './common/SchoolBrandedHeader';
import { SchoolSettingsBranding } from './admin/SchoolSettingsBranding';
import { ProfilePhotoUploader } from './common/ProfilePhotoUploader';
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/imageStorageService';
import { 
  updateStudentProfilePhoto, 
  updateTeacherProfilePhoto, 
  updateParentProfilePhoto 
} from '../services/schoolBrandingService';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  LogOut, 
  RefreshCw, 
  ShieldAlert,
  UserPlus,
  Compass,
  Mail,
  Phone,
  Settings,
  Eye,
  School,
  MapPin,
  Heart,
  UserCheck,
  Activity,
  Menu,
  Link2,
  BookMarked,
  Globe,
  X,
  AlertTriangle,
  Key,
  DollarSign,
  CalendarCheck,
  Award,
  Download,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Loader2,
  Sliders
} from 'lucide-react';

export interface StudentRecord {
  id: string;
  studentId: string;
  admissionNumber?: string;
  uid?: string;
  fullName: string;
  email: string;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  classId: string;
  className: string;
  parentId?: string;
  parentInfo?: string;
  photoUrl?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  schoolId: string;
  createdAt: string;
}

export interface TeacherRecord {
  id: string;
  teacherId: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  assignedClassId?: string;
  assignedClassName?: string;
  photoUrl?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  schoolId: string;
  createdAt: string;
}

export interface ParentRecord {
  id: string;
  parentId: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  linkedStudentId?: string;
  linkedStudentName?: string;
  photoUrl?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'disabled';
  schoolId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClassRecord {
  id: string;
  className: string;
  classLevel: string;
  academicYear?: string;
  classTeacherId?: string;
  classTeacherName?: string;
  description?: string;
  capacity?: number;
  schoolId: string;
  schoolName?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface SubjectRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  classLevel: string;
  schoolId: string;
  createdAt: string;
}

export interface TeacherAssignmentRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  schoolId: string;
  createdAt: string;
}

export interface ParentStudentRelationRecord {
  id: string;
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  createdAt: string;
}

export interface SchoolProfileData {
  schoolName: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  country?: string;
  academicYear?: string;
  academicTerm?: string;
}

const SchoolDashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-5 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-8 w-16 bg-slate-200 rounded"></div>
          <div className="h-2.5 w-28 bg-slate-100 rounded"></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="h-4 w-40 bg-slate-200 rounded"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl border border-slate-100"></div>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const SchoolAdminDashboard: React.FC = () => {
  const { currentUser, logout, setActiveView, showToast, openWalkthrough } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const schoolId = currentUser?.schoolId || (currentUser as any)?.school_id || (currentUser as any)?.assignedSchoolId || '';
  const initialSchoolName = currentUser?.schoolName || 'School Profile';

  // Modal submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState('');

  // Data States
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>({
    schoolName: initialSchoolName,
    logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
    phone: '',
    email: currentUser?.email || '',
    address: '124 Education Way, Sandton, Johannesburg',
    country: 'South Africa',
    academicTerm: 'Term 1, 2026'
  });

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentRecord[]>([]);
  const [relations, setRelations] = useState<ParentStudentRelationRecord[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // Dashboard Metrics State
  const [attendanceStats, setAttendanceStats] = useState({ rate: '94.8%', count: 0 });
  const [paymentStats, setPaymentStats] = useState({ totalFormatted: 'R148,500', count: 0 });
  const [academicStats, setAcademicStats] = useState({ passRate: '88.5%', examCount: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Student Roster State
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'disabled' | 'pending'>('all');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [studentGenderFilter, setStudentGenderFilter] = useState<string>('all');
  const [studentSortBy, setStudentSortBy] = useState<'fullName' | 'studentId' | 'className' | 'status'>('fullName');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');
  const [studentPage, setStudentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(10);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Advanced Teacher Roster State
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string>('all');
  const [teacherSortBy, setTeacherSortBy] = useState<'fullName' | 'teacherId' | 'subject' | 'status'>('fullName');
  const [teacherSortOrder, setTeacherSortOrder] = useState<'asc' | 'desc'>('asc');
  const [teacherPage, setTeacherPage] = useState<number>(1);
  const [teacherPageSize, setTeacherPageSize] = useState<number>(10);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Advanced Parent State
  const [parentStatusFilter, setParentStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [parentSortBy, setParentSortBy] = useState<'fullName' | 'email' | 'status'>('fullName');
  const [parentSortOrder, setParentSortOrder] = useState<'asc' | 'desc'>('asc');
  const [parentPage, setParentPage] = useState<number>(1);
  const [parentPageSize, setParentPageSize] = useState<number>(10);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);

  // Advanced Class & Subject State
  const [classPage, setClassPage] = useState<number>(1);
  const [subjectPage, setSubjectPage] = useState<number>(1);

  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAuditEvent({
      schoolId,
      schoolName: schoolProfile.schoolName,
      userEmail: currentUser?.email || 'admin@school.com',
      userName: currentUser?.fullName || 'School Admin',
      userRole: 'school_admin',
      action: 'EXPORT_CSV',
      eventType: 'DATA_EXPORT',
      details: `Exported ${rows.length} records to CSV file: ${filename}`
    });
  };

  // Notification Modals State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isSendNotificationModalOpen, setIsSendNotificationModalOpen] = useState(false);

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<'add' | 'edit'>('add');
  const [selectedStudent, setSelectedStudent] = useState<Partial<StudentRecord>>({});
  const [studentTempPassword, setStudentTempPassword] = useState('');
  const [viewStudentProfile, setViewStudentProfile] = useState<StudentRecord | null>(null);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherModalMode, setTeacherModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTeacher, setSelectedTeacher] = useState<Partial<TeacherRecord>>({});
  const [teacherTempPassword, setTeacherTempPassword] = useState('');

  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [parentModalMode, setParentModalMode] = useState<'add' | 'edit'>('add');
  const [selectedParent, setSelectedParent] = useState<Partial<ParentRecord>>({});
  const [parentTempPassword, setParentTempPassword] = useState('');

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classModalMode, setClassModalMode] = useState<'add' | 'edit'>('add');
  const [selectedClass, setSelectedClass] = useState<Partial<ClassRecord>>({});

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'add' | 'edit'>('add');
  const [selectedSubject, setSelectedSubject] = useState<Partial<SubjectRecord>>({});

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedAssignmentForm, setSelectedAssignmentForm] = useState({
    teacherId: '',
    classId: '',
    subjectId: ''
  });

  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [selectedLinkingForm, setSelectedLinkingForm] = useState({
    parentId: '',
    studentId: ''
  });

  const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'teacher' as 'teacher' | 'student' | 'parent',
    password: '',
    customId: ''
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {}
  });

  // Verify Role & Status & Assigned School Guard
  const userRole = currentUser?.role;
  const isSchoolAdminRole = userRole === 'school_admin' || (userRole as string) === 'school admin' || (userRole as string) === 'schoolAdmin';

  // Fetch operational data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch School Profile
      try {
        const schoolDocRef = doc(db, 'schools', schoolId);
        const schoolDocSnap = await getDoc(schoolDocRef);
        if (schoolDocSnap.exists()) {
          const sData = schoolDocSnap.data();
          setSchoolProfile({
            schoolName: sData.schoolName || initialSchoolName,
            logoUrl: sData.logoUrl || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
            phone: sData.phone || sData.phoneNumber || '+27 11 982 3000',
            email: sData.email || sData.schoolEmail || currentUser?.email || 'admin@school.edu',
            address: sData.address || '124 Education Way, Sandton, Johannesburg',
            country: sData.country || 'South Africa',
            academicTerm: sData.academicTerm || 'Term 1, 2026'
          });
        }
      } catch (err) {
        console.warn('Could not fetch school profile:', err);
      }

      // 2. Fetch Students
      try {
        const studentsQuery = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const studentsSnap = await getDocs(studentsQuery);
        setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentRecord[]);
      } catch (err) {
        console.warn('Error fetching students:', err);
      }

      // 3. Fetch Teachers
      try {
        const teachersQuery = query(collection(db, 'teachers'), where('schoolId', '==', schoolId));
        const teachersSnap = await getDocs(teachersQuery);
        setTeachers(teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as TeacherRecord[]);
      } catch (err) {
        console.warn('Error fetching teachers:', err);
      }

      // 4. Fetch Parents
      try {
        const parentsQuery = query(collection(db, 'parents'), where('schoolId', '==', schoolId));
        const parentsSnap = await getDocs(parentsQuery);
        setParents(parentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ParentRecord[]);
      } catch (err) {
        console.warn('Error fetching parents:', err);
      }

      // 5. Fetch Classes
      try {
        const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
        const classesSnap = await getDocs(classesQuery);
        setClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassRecord[]);
      } catch (err) {
        console.warn('Error fetching classes:', err);
      }

      // 6. Fetch Subjects
      try {
        const subjectsQuery = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));
        const subjectsSnap = await getDocs(subjectsQuery);
        setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as SubjectRecord[]);
      } catch (err) {
        console.warn('Error fetching subjects:', err);
      }

      // 7. Fetch Teacher Assignments
      try {
        const assignmentsQuery = query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId));
        const assignmentsSnap = await getDocs(assignmentsQuery);
        setAssignments(assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as TeacherAssignmentRecord[]);
      } catch (err) {
        console.warn('Error fetching teacher assignments:', err);
      }

      // 8. Fetch Parent-Student Relations
      try {
        const relationsQuery = query(collection(db, 'parentStudentRelations'), where('schoolId', '==', schoolId));
        const relationsSnap = await getDocs(relationsQuery);
        setRelations(relationsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ParentStudentRelationRecord[]);
      } catch (err) {
        console.warn('Error fetching parent-student relations:', err);
      }

      // 9. Fetch Users
      try {
        const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        const usersSnap = await getDocs(usersQuery);
        setUsersList(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('Error fetching users:', err);
      }

      // 10. Fetch Attendance Stats
      try {
        const attQuery = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
        const attSnap = await getDocs(attQuery);
        if (!attSnap.empty) {
          const docs = attSnap.docs.map(d => d.data());
          const present = docs.filter(d => d.status === 'Present').length;
          const rate = ((present / docs.length) * 100).toFixed(1) + '%';
          setAttendanceStats({ rate, count: docs.length });
        }
      } catch (err) {
        console.warn('Error fetching attendance stats:', err);
      }

      // 11. Fetch Payment Stats
      try {
        const payQuery = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
        const paySnap = await getDocs(payQuery);
        if (!paySnap.empty) {
          const docs = paySnap.docs.map(d => d.data());
          const total = docs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
          setPaymentStats({ totalFormatted: `R${total.toLocaleString()}`, count: docs.length });
        }
      } catch (err) {
        console.warn('Error fetching payment stats:', err);
      }

      // 12. Fetch Academic Stats
      try {
        const examQuery = query(collection(db, 'examinations'), where('schoolId', '==', schoolId));
        const examSnap = await getDocs(examQuery);
        if (!examSnap.empty) {
          setAcademicStats({ passRate: '88.5%', examCount: examSnap.size });
        }
      } catch (err) {
        console.warn('Error fetching academic stats:', err);
      }

    } catch (error: any) {
      console.error('Error fetching school data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    fetchAllData();

    // 1. Real-time Students
    const unsubStudents = onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentRecord[]);
    }, (err) => console.warn('Students real-time listener error:', err));

    // 2. Real-time Teachers
    const unsubTeachers = onSnapshot(query(collection(db, 'teachers'), where('schoolId', '==', schoolId)), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as TeacherRecord[]);
    }, (err) => console.warn('Teachers real-time listener error:', err));

    // 3. Real-time Parents
    const unsubParents = onSnapshot(query(collection(db, 'parents'), where('schoolId', '==', schoolId)), (snap) => {
      setParents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ParentRecord[]);
    }, (err) => console.warn('Parents real-time listener error:', err));

    // 4. Real-time Classes
    const unsubClasses = onSnapshot(query(collection(db, 'classes'), where('schoolId', '==', schoolId)), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassRecord[]);
    }, (err) => console.warn('Classes real-time listener error:', err));

    // 5. Real-time Subjects
    const unsubSubjects = onSnapshot(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SubjectRecord[]);
    }, (err) => console.warn('Subjects real-time listener error:', err));

    // 6. Real-time Teacher Assignments
    const unsubAssignments = onSnapshot(query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId)), (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as TeacherAssignmentRecord[]);
    }, (err) => console.warn('TeacherAssignments real-time listener error:', err));

    // 7. Real-time Parent-Student Relations
    const unsubRelations = onSnapshot(query(collection(db, 'parentStudentRelations'), where('schoolId', '==', schoolId)), (snap) => {
      setRelations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ParentStudentRelationRecord[]);
    }, (err) => console.warn('Relations real-time listener error:', err));

    // 8. Real-time Users
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', schoolId)), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('Users real-time listener error:', err));

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubParents();
      unsubClasses();
      unsubSubjects();
      unsubAssignments();
      unsubRelations();
      unsubUsers();
    };
  }, [schoolId]);

  if (!currentUser || !isSchoolAdminRole || currentUser.status !== 'active' || !schoolId || schoolId.trim() === '') {
    return (
      <div className="min-h-[80vh] bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-950 border border-red-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Restricted</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Only active <strong>School Administrators</strong> with an assigned school can access the School Admin Dashboard.
          </p>
          <button
            onClick={() => setActiveView('login')}
            className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#002147] font-black text-xs uppercase tracking-wider hover:bg-[#c29f2e] transition cursor-pointer"
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  // 1. STUDENT CRUD
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedStudent.fullName?.trim() || !selectedStudent.studentId?.trim() || !selectedStudent.dob || !selectedStudent.gender || !selectedStudent.classId) {
      showToast('Student Full Name, Student ID Number, Date of Birth, Gender, and Class are required.', 'error');
      return;
    }

    if (!schoolId) {
      showToast('Cannot register student: No active School ID found for current administrator profile.', 'error', 6000);
      return;
    }

    const cleanStudentId = selectedStudent.studentId.trim().toUpperCase();
    const studentEmail = (selectedStudent.email || '').trim().toLowerCase();
    const selectedClassObj = classes.find(c => c.id === selectedStudent.classId);
    const resolvedClassName = selectedClassObj?.className || selectedStudent.className || 'General Class';
    const effectiveSchoolName = schoolProfile.schoolName || currentUser?.schoolName || 'School';
    const now = new Date().toISOString();

    if (!studentEmail || !studentEmail.includes('@')) {
      showToast('Please specify a valid Google Account email for the student to sign in.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction(studentModalMode === 'add' ? 'Registering student & authorizing Google Sign-In...' : 'Updating student record...');

    try {
      if (studentModalMode === 'add') {
        // Student ID Uniqueness Check within the school
        const qCheck = query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId),
          where('studentId', '==', cleanStudentId)
        );
        const checkSnap = await getDocs(qCheck);
        if (!checkSnap.empty) {
          showToast(`Student ID "${cleanStudentId}" is already assigned to another student in this school. Please use a unique Student ID.`, 'error', 6000);
          setIsSubmitting(false);
          setSubmittingAction('');
          return;
        }

        // Student Email Uniqueness Check within the school
        const qEmailCheck = query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId),
          where('email', '==', studentEmail)
        );
        const emailSnap = await getDocs(qEmailCheck);
        if (!emailSnap.empty) {
          showToast(`A student with Google email "${studentEmail}" is already registered in this school.`, 'error', 6000);
          setIsSubmitting(false);
          setSubmittingAction('');
          return;
        }

        // Create student authorization doc in students collection
        const studentRef = doc(collection(db, 'students'));
        const newStudentDocId = studentRef.id;

        await setDoc(studentRef, {
          id: newStudentDocId,
          studentId: cleanStudentId,
          admissionNumber: cleanStudentId,
          fullName: selectedStudent.fullName.trim(),
          email: studentEmail,
          googleEmail: studentEmail,
          gender: selectedStudent.gender || 'Male',
          dob: selectedStudent.dob,
          phone: selectedStudent.phone?.trim() || '',
          address: selectedStudent.address?.trim() || '',
          classId: selectedStudent.classId,
          className: resolvedClassName,
          schoolId,
          schoolName: effectiveSchoolName,
          parentId: selectedStudent.parentId || '',
          parentInfo: selectedStudent.parentInfo || '',
          photoUrl: selectedStudent.photoUrl || '',
          status: selectedStudent.status || 'active',
          authMethod: 'google',
          createdAt: now,
          updatedAt: now
        });

        // Link to Parent if selected
        if (selectedStudent.parentId) {
          const parentObj = parents.find(p => p.id === selectedStudent.parentId);
          const relationRef = doc(collection(db, 'parentStudentRelations'));
          await setDoc(relationRef, {
            id: relationRef.id,
            parentId: selectedStudent.parentId,
            parentName: parentObj?.fullName || selectedStudent.parentInfo || 'Parent',
            parentEmail: parentObj?.email || '',
            studentId: newStudentDocId,
            studentName: selectedStudent.fullName.trim(),
            studentIdNumber: cleanStudentId,
            schoolId,
            relationship: 'Parent/Guardian',
            createdAt: now
          });

          if (parentObj) {
            await updateDoc(doc(db, 'parents', parentObj.id), {
              linkedStudentId: newStudentDocId,
              linkedStudentName: selectedStudent.fullName.trim(),
              updatedAt: now
            }).catch(e => console.warn('Non-fatal: could not update parent record:', e));
          }
        }

        await triggerNewStudentNotification({
          schoolId,
          studentName: selectedStudent.fullName.trim(),
          studentId: cleanStudentId,
          className: resolvedClassName,
          createdBy: currentUser?.fullName || 'School Admin'
        }).catch(err => console.warn('Non-fatal: notification failed:', err));

        await logAuditEvent({
          schoolId,
          schoolName: effectiveSchoolName,
          userEmail: currentUser?.email || '',
          userName: currentUser?.fullName || 'School Admin',
          userRole: 'school_admin',
          action: 'REGISTER_STUDENT',
          eventType: 'STUDENT_REGISTERED',
          details: `Registered student "${selectedStudent.fullName.trim()}" (ID: ${cleanStudentId}) in class "${resolvedClassName}"`
        });

        showToast(`Student ${selectedStudent.fullName} registered successfully! Student ID: ${cleanStudentId}`, 'success', 6000);
      } else {
        if (!selectedStudent.id) return;
        const studentDocRef = doc(db, 'students', selectedStudent.id);
        await updateDoc(studentDocRef, {
          fullName: selectedStudent.fullName.trim(),
          studentId: cleanStudentId,
          email: studentEmail,
          googleEmail: studentEmail,
          gender: selectedStudent.gender,
          dob: selectedStudent.dob,
          phone: selectedStudent.phone?.trim() || '',
          address: selectedStudent.address?.trim() || '',
          classId: selectedStudent.classId,
          className: resolvedClassName,
          parentId: selectedStudent.parentId || '',
          parentInfo: selectedStudent.parentInfo || '',
          photoUrl: selectedStudent.photoUrl || '',
          status: selectedStudent.status || 'active',
          updatedAt: now
        });

        const targetUid = selectedStudent.uid || selectedStudent.id;
        if (targetUid) {
          await updateDoc(doc(db, 'users', targetUid), {
            fullName: selectedStudent.fullName.trim(),
            name: selectedStudent.fullName.trim(),
            email: studentEmail,
            studentId: cleanStudentId,
            classId: selectedStudent.classId,
            className: resolvedClassName,
            phone: selectedStudent.phone?.trim() || '',
            status: selectedStudent.status || 'active',
            updatedAt: now
          }).catch(e => console.warn('Could not update user doc for student:', e));
        }

        showToast(`Student ${selectedStudent.fullName} updated!`, 'success');
      }

      setIsStudentModalOpen(false);
      setSelectedStudent({});
      setStudentTempPassword('');
    } catch (err: any) {
      console.error('Error saving student:', err);
      if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use')) {
        showToast(`A student account with ID "${cleanStudentId}" already exists in Firebase Authentication. Please use a different Student ID.`, 'error', 6000);
      } else {
        handleFirestoreError(err, OperationType.WRITE, 'students');
        const errDetail = err?.message || 'Permission denied or network connection issue.';
        showToast(`Failed to register student: ${errDetail}`, 'error', 7000);
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingAction('');
    }
  };

  const promptDeleteStudent = (student: StudentRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Student',
      message: `Are you sure you want to delete student "${student.fullName}" (${student.studentId})?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'students', student.id));
          if (student.uid) {
            await updateDoc(doc(db, 'users', student.uid), { status: 'disabled' });
          }
          showToast(`Student ${student.fullName} deleted.`, 'success');
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `students/${student.id}`);
          showToast(`Failed to delete student: ${err?.message || 'Error occurred'}`, 'error');
        }
      }
    });
  };

  // 2. TEACHER CRUD (Google Sign-In Architecture)
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedTeacher.fullName?.trim() || !selectedTeacher.email?.trim()) {
      showToast('Teacher Full Name and Google Account Email are required.', 'error');
      return;
    }

    if (!schoolId) {
      showToast('Cannot register teacher: No active School ID found for current administrator profile.', 'error', 6000);
      return;
    }

    const cleanEmail = selectedTeacher.email.trim().toLowerCase();
    if (isPlatformOwnerEmail(cleanEmail)) {
      showToast('This email is reserved for Platform Owner.', 'error');
      return;
    }

    const effectiveSchoolName = schoolProfile.schoolName || currentUser?.schoolName || 'School';
    const now = new Date().toISOString();

    setIsSubmitting(true);
    setSubmittingAction(teacherModalMode === 'add' ? 'Registering teacher for Google Auth...' : 'Updating teacher profile...');

    try {
      if (teacherModalMode === 'add') {
        const customTeacherId = selectedTeacher.teacherId?.trim() || `TCH-${Math.floor(1000 + Math.random() * 9000)}`;

        const qCheck = query(
          collection(db, 'teachers'),
          where('schoolId', '==', schoolId),
          where('email', '==', cleanEmail)
        );
        const checkSnap = await getDocs(qCheck);
        if (!checkSnap.empty) {
          showToast(`A teacher with Google account "${cleanEmail}" is already registered in this school.`, 'error', 6000);
          setIsSubmitting(false);
          setSubmittingAction('');
          return;
        }

        const teacherDocRef = doc(collection(db, 'teachers'));
        const assignedClassObj = classes.find(c => c.id === selectedTeacher.assignedClassId);
        const resolvedAssignedClassName = assignedClassObj?.className || selectedTeacher.assignedClassName || '';

        await setDoc(teacherDocRef, {
          id: teacherDocRef.id,
          teacherId: customTeacherId,
          schoolId,
          schoolName: effectiveSchoolName,
          fullName: selectedTeacher.fullName.trim(),
          email: cleanEmail,
          phone: selectedTeacher.phone?.trim() || '',
          subject: selectedTeacher.subject?.trim() || 'General Education',
          assignedClassId: selectedTeacher.assignedClassId || '',
          assignedClassName: resolvedAssignedClassName,
          status: selectedTeacher.status || 'active',
          authMethod: 'google',
          createdAt: now,
          updatedAt: now
        });

        // If teacher is assigned to a class, link them on the class document
        if (selectedTeacher.assignedClassId) {
          await updateDoc(doc(db, 'classes', selectedTeacher.assignedClassId), {
            classTeacherId: teacherDocRef.id,
            classTeacherName: selectedTeacher.fullName.trim(),
            updatedAt: now
          }).catch(e => console.warn('Non-fatal: could not update class with teacher assignment:', e));
        }

        await logAuditEvent({
          schoolId,
          schoolName: effectiveSchoolName,
          userEmail: currentUser?.email || '',
          userName: currentUser?.fullName || 'School Admin',
          userRole: 'school_admin',
          action: 'REGISTER_TEACHER',
          eventType: 'TEACHER_REGISTERED',
          details: `Registered teacher "${selectedTeacher.fullName.trim()}" (${cleanEmail})`
        });

        showToast(`Teacher ${selectedTeacher.fullName} registered! They can now sign in using their Google account (${cleanEmail}).`, 'success', 6000);
      } else {
        if (!selectedTeacher.id) return;
        const assignedClassObj = classes.find(c => c.id === selectedTeacher.assignedClassId);
        const resolvedAssignedClassName = assignedClassObj?.className || selectedTeacher.assignedClassName || '';

        await updateDoc(doc(db, 'teachers', selectedTeacher.id), {
          fullName: selectedTeacher.fullName.trim(),
          phone: selectedTeacher.phone?.trim() || '',
          subject: selectedTeacher.subject?.trim() || 'General Education',
          assignedClassId: selectedTeacher.assignedClassId || '',
          assignedClassName: resolvedAssignedClassName,
          status: selectedTeacher.status || 'active',
          updatedAt: now
        });

        if (selectedTeacher.uid) {
          await updateDoc(doc(db, 'users', selectedTeacher.uid), {
            fullName: selectedTeacher.fullName.trim(),
            name: selectedTeacher.fullName.trim(),
            phone: selectedTeacher.phone?.trim() || '',
            status: selectedTeacher.status || 'active',
            updatedAt: now
          }).catch(e => console.warn('Could not update teacher user record:', e));
        }

        showToast(`Teacher ${selectedTeacher.fullName} updated!`, 'success');
      }

      setIsTeacherModalOpen(false);
      setSelectedTeacher({});
      setTeacherTempPassword('');
    } catch (err: any) {
      console.error('Error saving teacher:', err);
      handleFirestoreError(err, OperationType.WRITE, 'teachers');
      const errDetail = err?.message || 'Permission denied or network connection issue.';
      showToast(`Failed to save teacher: ${errDetail}`, 'error', 7000);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction('');
    }
  };

  const promptDeleteTeacher = (teacher: TeacherRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Teacher',
      message: `Are you sure you want to delete teacher "${teacher.fullName}" (${teacher.teacherId})?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'teachers', teacher.id));
          if (teacher.uid) {
            await updateDoc(doc(db, 'users', teacher.uid), { status: 'disabled' });
          }
          showToast(`Teacher ${teacher.fullName} deleted.`, 'success');
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `teachers/${teacher.id}`);
          showToast(`Failed to delete teacher: ${err?.message || 'Error occurred'}`, 'error');
        }
      }
    });
  };

  // 3. PARENT CRUD (Google Sign-In Architecture)
  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedParent.fullName?.trim() || !selectedParent.email?.trim()) {
      showToast('Parent Full Name and Google Account Email are required.', 'error');
      return;
    }

    if (!schoolId) {
      showToast('Cannot register parent: No active School ID found for current administrator profile.', 'error', 6000);
      return;
    }

    const cleanEmail = selectedParent.email.trim().toLowerCase();
    if (isPlatformOwnerEmail(cleanEmail)) {
      showToast('This email is reserved for Platform Owner.', 'error');
      return;
    }

    const effectiveSchoolName = schoolProfile.schoolName || currentUser?.schoolName || 'School';
    const now = new Date().toISOString();

    setIsSubmitting(true);
    setSubmittingAction(parentModalMode === 'add' ? 'Registering parent for Google Auth...' : 'Updating parent profile...');

    try {
      const linkedStudentObj = students.find(s => s.id === selectedParent.linkedStudentId);
      const resolvedLinkedStudentName = linkedStudentObj?.fullName || selectedParent.linkedStudentName || '';

      if (parentModalMode === 'add') {
        const customParentId = selectedParent.parentId?.trim() || `PAR-${Math.floor(1000 + Math.random() * 9000)}`;

        const qCheck = query(
          collection(db, 'parents'),
          where('schoolId', '==', schoolId),
          where('email', '==', cleanEmail)
        );
        const checkSnap = await getDocs(qCheck);
        if (!checkSnap.empty) {
          showToast(`A parent with Google account "${cleanEmail}" is already registered in this school.`, 'error', 6000);
          setIsSubmitting(false);
          setSubmittingAction('');
          return;
        }

        const parentDocRef = doc(collection(db, 'parents'));
        await setDoc(parentDocRef, {
          id: parentDocRef.id,
          parentId: customParentId,
          schoolId,
          schoolName: effectiveSchoolName,
          fullName: selectedParent.fullName.trim(),
          email: cleanEmail,
          phone: selectedParent.phone?.trim() || '',
          linkedStudentId: selectedParent.linkedStudentId || '',
          linkedStudentName: resolvedLinkedStudentName,
          status: selectedParent.status || 'active',
          authMethod: 'google',
          createdAt: now,
          updatedAt: now
        });

        // If a student was linked, create relationship and update student document
        if (selectedParent.linkedStudentId && linkedStudentObj) {
          const relDocRef = doc(collection(db, 'parentStudentRelations'));
          await setDoc(relDocRef, {
            id: relDocRef.id,
            parentId: parentDocRef.id,
            parentName: selectedParent.fullName.trim(),
            parentEmail: cleanEmail,
            studentId: linkedStudentObj.id,
            studentName: linkedStudentObj.fullName,
            studentIdNumber: linkedStudentObj.studentId,
            schoolId,
            relationship: 'Parent/Guardian',
            createdAt: now
          });

          await updateDoc(doc(db, 'students', linkedStudentObj.id), {
            parentId: parentDocRef.id,
            parentInfo: `${selectedParent.fullName.trim()} (${cleanEmail})`,
            updatedAt: now
          }).catch(e => console.warn('Could not link student to parent:', e));
        }

        await logAuditEvent({
          schoolId,
          schoolName: effectiveSchoolName,
          userEmail: currentUser?.email || '',
          userName: currentUser?.fullName || 'School Admin',
          userRole: 'school_admin',
          action: 'REGISTER_PARENT',
          eventType: 'PARENT_REGISTERED',
          details: `Registered parent "${selectedParent.fullName.trim()}" (${cleanEmail})${resolvedLinkedStudentName ? ` linked to student ${resolvedLinkedStudentName}` : ''}`
        });

        showToast(`Parent ${selectedParent.fullName} registered! They can now sign in using their Google account (${cleanEmail}).`, 'success', 6000);
      } else {
        if (!selectedParent.id) return;
        await updateDoc(doc(db, 'parents', selectedParent.id), {
          fullName: selectedParent.fullName.trim(),
          phone: selectedParent.phone?.trim() || '',
          linkedStudentId: selectedParent.linkedStudentId || '',
          linkedStudentName: resolvedLinkedStudentName,
          status: selectedParent.status || 'active',
          updatedAt: now
        });

        if (selectedParent.uid) {
          await updateDoc(doc(db, 'users', selectedParent.uid), {
            fullName: selectedParent.fullName.trim(),
            name: selectedParent.fullName.trim(),
            phone: selectedParent.phone?.trim() || '',
            status: selectedParent.status || 'active',
            updatedAt: now
          }).catch(e => console.warn('Could not update parent user record:', e));
        }

        showToast(`Parent ${selectedParent.fullName} updated!`, 'success');
      }

      setIsParentModalOpen(false);
      setSelectedParent({});
      setParentTempPassword('');
    } catch (err: any) {
      console.error('Error saving parent:', err);
      handleFirestoreError(err, OperationType.WRITE, 'parents');
      const errDetail = err?.message || 'Permission denied or network connection issue.';
      showToast(`Failed to save parent: ${errDetail}`, 'error', 7000);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction('');
    }
  };

  const promptDeleteParent = (parent: ParentRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Parent',
      message: `Are you sure you want to delete parent "${parent.fullName}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'parents', parent.id));
          if (parent.uid) {
            await updateDoc(doc(db, 'users', parent.uid), { status: 'disabled' });
          }
          showToast(`Parent ${parent.fullName} deleted.`, 'success');
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `parents/${parent.id}`);
          showToast(`Failed to delete parent: ${err?.message || 'Error occurred'}`, 'error');
        }
      }
    });
  };

  // 4. CLASS CRUD
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedClass.className?.trim() || !selectedClass.classLevel?.trim()) {
      showToast('Class Name and Class Level are required.', 'error');
      return;
    }

    if (!schoolId) {
      showToast('Cannot create class: No active School ID found for current administrator profile.', 'error', 6000);
      return;
    }

    const trimmedName = selectedClass.className.trim();
    const trimmedLevel = selectedClass.classLevel.trim();

    // Check for duplicate class name in this school
    const isDuplicate = classes.some(
      c => c.className.toLowerCase() === trimmedName.toLowerCase() && c.id !== selectedClass.id
    );
    if (isDuplicate) {
      showToast(`A class named "${trimmedName}" already exists in this school. Please choose a different name.`, 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction(classModalMode === 'add' ? 'Creating class in Firestore...' : 'Updating class in Firestore...');

    try {
      const now = new Date().toISOString();
      const currentAdminUid = currentUser?.uid || 'admin';
      const effectiveSchoolName = schoolProfile.schoolName || currentUser?.schoolName || 'School';

      if (classModalMode === 'add') {
        const classDocRef = doc(collection(db, 'classes'));
        const newClassData: ClassRecord = {
          id: classDocRef.id,
          className: trimmedName,
          classLevel: trimmedLevel,
          academicYear: selectedClass.academicYear?.trim() || '2026/2027',
          classTeacherId: selectedClass.classTeacherId || '',
          classTeacherName: selectedClass.classTeacherName || 'Unassigned',
          description: selectedClass.description?.trim() || '',
          capacity: selectedClass.capacity ? Number(selectedClass.capacity) : 40,
          schoolId,
          schoolName: effectiveSchoolName,
          createdAt: now,
          updatedAt: now,
          createdBy: currentAdminUid
        };

        await setDoc(classDocRef, newClassData);

        await logAuditEvent({
          schoolId,
          schoolName: effectiveSchoolName,
          userEmail: currentUser?.email || '',
          userName: currentUser?.fullName || 'School Admin',
          userRole: 'school_admin',
          action: 'CREATE_CLASS',
          eventType: 'CLASS_CREATED',
          details: `Created class "${trimmedName}" (${trimmedLevel})`
        });

        showToast(`Class "${trimmedName}" created successfully!`, 'success', 5000);
      } else {
        if (!selectedClass.id) return;
        const classDocRef = doc(db, 'classes', selectedClass.id);
        const updateData: Partial<ClassRecord> = {
          className: trimmedName,
          classLevel: trimmedLevel,
          academicYear: selectedClass.academicYear?.trim() || '2026/2027',
          classTeacherId: selectedClass.classTeacherId || '',
          classTeacherName: selectedClass.classTeacherName || 'Unassigned',
          description: selectedClass.description?.trim() || '',
          capacity: selectedClass.capacity ? Number(selectedClass.capacity) : 40,
          updatedAt: now
        };

        await updateDoc(classDocRef, updateData);

        await logAuditEvent({
          schoolId,
          schoolName: effectiveSchoolName,
          userEmail: currentUser?.email || '',
          userName: currentUser?.fullName || 'School Admin',
          userRole: 'school_admin',
          action: 'UPDATE_CLASS',
          eventType: 'CLASS_UPDATED',
          details: `Updated class "${trimmedName}"`
        });

        showToast(`Class "${trimmedName}" updated successfully!`, 'success');
      }

      setIsClassModalOpen(false);
      setSelectedClass({});
    } catch (err: any) {
      console.error('Error saving class:', err);
      handleFirestoreError(err, OperationType.WRITE, 'classes');
      const errDetail = err?.message || 'Permission denied or network connection issue.';
      showToast(`Failed to save class: ${errDetail}`, 'error', 7000);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction('');
    }
  };

  const promptDeleteClass = (cls: ClassRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Class',
      message: `Are you sure you want to delete class "${cls.className}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'classes', cls.id));
          showToast(`Class "${cls.className}" deleted.`, 'success');
          fetchAllData();
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `classes/${cls.id}`);
        }
      }
    });
  };

  // SUBJECT CRUD
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject.subjectName || !selectedSubject.code) {
      showToast('Subject Name and Code are required.', 'error');
      return;
    }

    try {
      const customSubId = selectedSubject.subjectId || `SUB-${Math.floor(100 + Math.random() * 900)}`;

      if (subjectModalMode === 'add') {
        await setDoc(doc(collection(db, 'subjects')), {
          subjectId: customSubId,
          subjectName: selectedSubject.subjectName,
          code: selectedSubject.code.toUpperCase(),
          classLevel: selectedSubject.classLevel || 'All Grades',
          schoolId,
          createdAt: new Date().toISOString()
        });
        showToast(`Subject "${selectedSubject.subjectName}" created!`, 'success');
      } else {
        if (!selectedSubject.id) return;
        await updateDoc(doc(db, 'subjects', selectedSubject.id), {
          subjectName: selectedSubject.subjectName,
          code: selectedSubject.code.toUpperCase(),
          classLevel: selectedSubject.classLevel || 'All Grades'
        });
        showToast(`Subject "${selectedSubject.subjectName}" updated!`, 'success');
      }

      setIsSubjectModalOpen(false);
      setSelectedSubject({});
      fetchAllData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'subjects');
    }
  };

  const promptDeleteSubject = (sub: SubjectRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Subject',
      message: `Are you sure you want to delete subject "${sub.subjectName}" (${sub.code})?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'subjects', sub.id));
          showToast(`Subject "${sub.subjectName}" deleted.`, 'success');
          fetchAllData();
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `subjects/${sub.id}`);
        }
      }
    });
  };

  // TEACHER ASSIGNMENT HANDLER
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const { teacherId, classId, subjectId } = selectedAssignmentForm;
    if (!teacherId || !classId || !subjectId) {
      showToast('Please select Teacher, Class, and Subject.', 'error');
      return;
    }

    const tObj = teachers.find(t => t.id === teacherId || t.teacherId === teacherId);
    const cObj = classes.find(c => c.id === classId);
    const sObj = subjects.find(s => s.id === subjectId || s.subjectId === subjectId);

    try {
      await setDoc(doc(collection(db, 'teacherAssignments')), {
        teacherId: tObj?.teacherId || teacherId,
        teacherName: tObj?.fullName || 'Teacher',
        classId,
        className: cObj?.className || 'Class',
        subjectId: sObj?.subjectId || subjectId,
        subjectName: sObj?.subjectName || 'Subject',
        schoolId,
        createdAt: new Date().toISOString()
      });

      showToast(`Assigned ${tObj?.fullName} to ${sObj?.subjectName} (${cObj?.className})`, 'success');
      setIsAssignmentModalOpen(false);
      setSelectedAssignmentForm({ teacherId: '', classId: '', subjectId: '' });
      fetchAllData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'teacherAssignments');
    }
  };

  const promptRemoveAssignment = (assignment: TeacherAssignmentRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Remove Teacher Assignment',
      message: `Are you sure you want to remove assignment for ${assignment.teacherName} in ${assignment.className} - ${assignment.subjectName}?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'teacherAssignments', assignment.id));
          showToast('Assignment removed.', 'success');
          fetchAllData();
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `teacherAssignments/${assignment.id}`);
        }
      }
    });
  };

  // PARENT-STUDENT LINKING HANDLER
  const handleLinkParentStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { parentId, studentId } = selectedLinkingForm;
    if (!parentId || !studentId) {
      showToast('Please select Parent and Student.', 'error');
      return;
    }

    const pObj = parents.find(p => p.id === parentId || p.parentId === parentId);
    const sObj = students.find(s => s.id === studentId || s.studentId === studentId);

    if (!sObj || (sObj.schoolId && sObj.schoolId !== schoolId)) {
      showToast('Linked student must belong to the same school.', 'error');
      return;
    }

    const targetStudentId = sObj.studentId || sObj.id;
    const targetParentId = pObj?.parentId || parentId;

    try {
      await setDoc(doc(collection(db, 'parentStudentRelations')), {
        parentId: targetParentId,
        parentUid: pObj?.uid || '',
        parentEmail: pObj?.email || '',
        parentName: pObj?.fullName || 'Parent',
        studentId: targetStudentId,
        studentName: sObj?.fullName || 'Student',
        schoolId,
        createdAt: new Date().toISOString()
      });

      // Update parent document in 'parents' collection
      if (pObj?.id) {
        await updateDoc(doc(db, 'parents', pObj.id), {
          linkedStudents: arrayUnion(targetStudentId),
          linkedStudentId: targetStudentId,
          linkedStudentName: sObj?.fullName || 'Student'
        }).catch(() => {});
      }

      // Update parent document by UID if different
      if (pObj?.uid) {
        await updateDoc(doc(db, 'parents', pObj.uid), {
          linkedStudents: arrayUnion(targetStudentId)
        }).catch(() => {});

        await updateDoc(doc(db, 'users', pObj.uid), {
          linkedStudentIds: arrayUnion(targetStudentId)
        }).catch(() => {});
      }

      showToast(`Linked Parent ${pObj?.fullName} with Student ${sObj?.fullName}!`, 'success');
      setIsLinkingModalOpen(false);
      setSelectedLinkingForm({ parentId: '', studentId: '' });
      fetchAllData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'parentStudentRelations');
    }
  };

  const promptRemoveRelation = (rel: ParentStudentRelationRecord) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Remove Parent-Student Link',
      message: `Are you sure you want to remove the link between Parent "${rel.parentName}" and Student "${rel.studentName}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'parentStudentRelations', rel.id));

          // Also remove student from parent's linkedStudents array
          const pObj = parents.find(p => p.parentId === rel.parentId || p.id === rel.parentId);
          if (pObj?.id) {
            await updateDoc(doc(db, 'parents', pObj.id), {
              linkedStudents: arrayRemove(rel.studentId)
            }).catch(() => {});
          }
          if (pObj?.uid) {
            await updateDoc(doc(db, 'parents', pObj.uid), {
              linkedStudents: arrayRemove(rel.studentId)
            }).catch(() => {});
            await updateDoc(doc(db, 'users', pObj.uid), {
              linkedStudentIds: arrayRemove(rel.studentId)
            }).catch(() => {});
          }

          showToast('Parent-student link removed.', 'success');
          fetchAllData();
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `parentStudentRelations/${rel.id}`);
        }
      }
    });
  };

  // SCHOOL PROFILE & SETTINGS SAVE
  const handleSaveSchoolProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'schools', schoolId), {
        schoolName: schoolProfile.schoolName,
        logoUrl: schoolProfile.logoUrl,
        phone: schoolProfile.phone,
        phoneNumber: schoolProfile.phone,
        email: schoolProfile.email,
        schoolEmail: schoolProfile.email,
        address: schoolProfile.address,
        country: schoolProfile.country || 'South Africa',
        academicTerm: schoolProfile.academicTerm || 'Term 1, 2026',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('School Profile & Settings updated successfully!', 'success');
      fetchAllData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `schools/${schoolId}`);
    }
  };

  // GENERIC USER CREATION (From User Accounts Tab)
  const handleCreateUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFormData.fullName) {
      showToast('Full Name is required.', 'error');
      return;
    }

    if (newUserFormData.role !== 'teacher' && newUserFormData.role !== 'student' && newUserFormData.role !== 'parent') {
      showToast('School Admin can only create Teacher, Student, or Parent accounts.', 'error');
      return;
    }

    if (!newUserFormData.email) {
      showToast('Google Account Email is required for all user accounts.', 'error');
      return;
    }

    if (newUserFormData.role === 'student' && !newUserFormData.customId) {
      showToast('Student ID (e.g. STU-2026-001) is required for student accounts.', 'error');
      return;
    }

    const cleanEmail = newUserFormData.email.trim().toLowerCase();
    if (isPlatformOwnerEmail(cleanEmail)) {
      showToast('This email is strictly reserved for Platform Owner.', 'error');
      return;
    }

    try {
      if (newUserFormData.role === 'teacher') {
        const customId = newUserFormData.customId || `TCH-${Math.floor(1000 + Math.random() * 9000)}`;
        const teacherDocRef = doc(collection(db, 'teachers'));
        await setDoc(teacherDocRef, {
          id: teacherDocRef.id,
          teacherId: customId,
          schoolId,
          schoolName: schoolProfile.schoolName || 'EDUkenZA Academy',
          fullName: newUserFormData.fullName.trim(),
          email: cleanEmail,
          phone: newUserFormData.phone || '',
          subject: 'General Education',
          status: 'active',
          authMethod: 'google',
          createdAt: new Date().toISOString()
        });

        showToast(`Teacher ${newUserFormData.fullName} registered! They will sign in using Google (${cleanEmail}).`, 'success', 5000);
      } else if (newUserFormData.role === 'parent') {
        const customId = newUserFormData.customId || `PAR-${Math.floor(1000 + Math.random() * 9000)}`;
        const parentDocRef = doc(collection(db, 'parents'));
        await setDoc(parentDocRef, {
          id: parentDocRef.id,
          parentId: customId,
          schoolId,
          schoolName: schoolProfile.schoolName || 'EDUkenZA Academy',
          fullName: newUserFormData.fullName.trim(),
          email: cleanEmail,
          phone: newUserFormData.phone || '',
          status: 'active',
          authMethod: 'google',
          createdAt: new Date().toISOString()
        });

        showToast(`Parent ${newUserFormData.fullName} registered! They will sign in using Google (${cleanEmail}).`, 'success', 5000);
      } else if (newUserFormData.role === 'student') {
        const cleanStudentId = newUserFormData.customId.trim().toUpperCase();

        const studentDocRef = doc(collection(db, 'students'));
        await setDoc(studentDocRef, {
          id: studentDocRef.id,
          studentId: cleanStudentId,
          admissionNumber: cleanStudentId,
          schoolId,
          schoolName: schoolProfile.schoolName || 'EDUkenZA Academy',
          fullName: newUserFormData.fullName.trim(),
          email: cleanEmail,
          googleEmail: cleanEmail,
          gender: 'Unspecified',
          dob: '2008-01-01',
          phone: newUserFormData.phone || '',
          address: '',
          className: 'Unassigned Class',
          status: 'active',
          authMethod: 'google',
          createdAt: new Date().toISOString()
        });

        // Trigger Global Notification
        await triggerNewStudentNotification({
          schoolId,
          studentName: newUserFormData.fullName.trim(),
          studentId: cleanStudentId,
          className: 'Unassigned Class',
          createdBy: currentUser?.fullName || 'School Admin'
        });

        showToast(`Student ${newUserFormData.fullName} registered! They will sign in using Google (${cleanEmail}).`, 'success', 5000);
      }

      setIsUserAccountModalOpen(false);
      setNewUserFormData({ fullName: '', email: '', phone: '', role: 'teacher', password: '', customId: '' });
      fetchAllData();
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use')) {
        showToast('This account identifier already exists in Firebase Authentication.', 'error');
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  // --- ENHANCED FILTER, SORT & PAGINATION FOR STUDENTS ---
  const processedStudents = students
    .filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.className.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter;
      const matchClass = studentClassFilter === 'all' || s.classId === studentClassFilter;
      const matchGender = studentGenderFilter === 'all' || s.gender === studentGenderFilter;

      return matchSearch && matchStatus && matchClass && matchGender;
    })
    .sort((a, b) => {
      let valA = (a[studentSortBy] || '').toLowerCase();
      let valB = (b[studentSortBy] || '').toLowerCase();
      if (valA < valB) return studentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return studentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const studentTotalPages = Math.ceil(processedStudents.length / studentPageSize) || 1;
  const paginatedStudents = processedStudents.slice(
    (studentPage - 1) * studentPageSize,
    studentPage * studentPageSize
  );

  const handleSelectAllStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(paginatedStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudentSelect = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStudentStatusChange = async (newStatus: 'active' | 'disabled' | 'pending') => {
    if (selectedStudentIds.length === 0) return;
    try {
      await Promise.all(
        selectedStudentIds.map(async (id) => {
          const st = students.find(s => s.id === id);
          if (st) {
            await updateDoc(doc(db, 'students', id), { status: newStatus });
            if (st.uid) {
              await updateDoc(doc(db, 'users', st.uid), { status: newStatus });
            }
          }
        })
      );
      showToast(`Updated status for ${selectedStudentIds.length} students to ${newStatus.toUpperCase()}`, 'success');
      logAuditEvent({
        schoolId,
        schoolName: schoolProfile.schoolName,
        userEmail: currentUser?.email || 'admin@school.com',
        userName: currentUser?.fullName || 'School Admin',
        userRole: 'school_admin',
        action: 'BULK_UPDATE_STUDENTS',
        eventType: 'STUDENT_MANAGEMENT',
        details: `Bulk updated ${selectedStudentIds.length} students to status: ${newStatus}`
      });
      setSelectedStudentIds([]);
      fetchAllData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'students');
    }
  };

  const handleBulkStudentDelete = () => {
    if (selectedStudentIds.length === 0) return;
    setDeleteConfirmation({
      isOpen: true,
      title: 'Bulk Delete Students',
      message: `Are you sure you want to delete ${selectedStudentIds.length} selected students?`,
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedStudentIds.map(async (id) => {
              const st = students.find(s => s.id === id);
              await deleteDoc(doc(db, 'students', id));
              if (st?.uid) {
                await updateDoc(doc(db, 'users', st.uid), { status: 'disabled' });
              }
            })
          );
          showToast(`Deleted ${selectedStudentIds.length} students.`, 'success');
          logAuditEvent({
            schoolId,
            schoolName: schoolProfile.schoolName,
            userEmail: currentUser?.email || 'admin@school.com',
            userName: currentUser?.fullName || 'School Admin',
            userRole: 'school_admin',
            action: 'BULK_DELETE_STUDENTS',
            eventType: 'STUDENT_MANAGEMENT',
            details: `Bulk deleted ${selectedStudentIds.length} students`
          });
          setSelectedStudentIds([]);
          fetchAllData();
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, 'students');
        }
      }
    });
  };

  const handleExportStudentsCSV = () => {
    const listToExport = selectedStudentIds.length > 0 
      ? students.filter(s => selectedStudentIds.includes(s.id))
      : processedStudents;
    
    const headers = ['Student ID', 'Full Name', 'Email', 'Class Name', 'Gender', 'DOB', 'Phone', 'Status', 'Created At'];
    const rows = listToExport.map(s => [
      s.studentId || s.admissionNumber || '',
      s.fullName || '',
      s.email || '',
      s.className || '',
      s.gender || '',
      s.dob || '',
      s.phone || '',
      s.status || 'active',
      s.createdAt ? new Date(s.createdAt).toLocaleString() : ''
    ]);

    exportToCSV(`Students_${schoolProfile.schoolName.replace(/\s+/g, '_')}`, headers, rows);
  };

  const filteredStudents = processedStudents;

  // --- ENHANCED FILTER, SORT & PAGINATION FOR TEACHERS ---
  const processedTeachers = teachers
    .filter(t => {
      const matchSearch =
        t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = teacherStatusFilter === 'all' || t.status === teacherStatusFilter;
      const matchSubject = teacherSubjectFilter === 'all' || t.subject === teacherSubjectFilter;

      return matchSearch && matchStatus && matchSubject;
    })
    .sort((a, b) => {
      let valA = (a[teacherSortBy] || '').toLowerCase();
      let valB = (b[teacherSortBy] || '').toLowerCase();
      if (valA < valB) return teacherSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return teacherSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const teacherTotalPages = Math.ceil(processedTeachers.length / teacherPageSize) || 1;
  const paginatedTeachers = processedTeachers.slice(
    (teacherPage - 1) * teacherPageSize,
    teacherPage * teacherPageSize
  );

  const handleExportTeachersCSV = () => {
    const listToExport = selectedTeacherIds.length > 0
      ? teachers.filter(t => selectedTeacherIds.includes(t.id))
      : processedTeachers;

    const headers = ['Teacher ID', 'Full Name', 'Email', 'Phone', 'Subject', 'Assigned Class', 'Status'];
    const rows = listToExport.map(t => [
      t.teacherId || '',
      t.fullName || '',
      t.email || '',
      t.phone || '',
      t.subject || '',
      t.assignedClassName || '',
      t.status || 'active'
    ]);

    exportToCSV(`Teachers_${schoolProfile.schoolName.replace(/\s+/g, '_')}`, headers, rows);
  };

  const filteredTeachers = processedTeachers;

  // --- ENHANCED FILTER, SORT & PAGINATION FOR PARENTS ---
  const processedParents = parents
    .filter(p => {
      const matchSearch =
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.linkedStudentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = parentStatusFilter === 'all' || p.status === parentStatusFilter;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let valA = (a[parentSortBy] || '').toLowerCase();
      let valB = (b[parentSortBy] || '').toLowerCase();
      if (valA < valB) return parentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return parentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const parentTotalPages = Math.ceil(processedParents.length / parentPageSize) || 1;
  const paginatedParents = processedParents.slice(
    (parentPage - 1) * parentPageSize,
    parentPage * parentPageSize
  );

  const handleExportParentsCSV = () => {
    const listToExport = selectedParentIds.length > 0
      ? parents.filter(p => selectedParentIds.includes(p.id))
      : processedParents;

    const headers = ['Parent ID', 'Full Name', 'Email', 'Phone', 'Linked Student Name', 'Status'];
    const rows = listToExport.map(p => [
      p.parentId || '',
      p.fullName || '',
      p.email || '',
      p.phone || '',
      p.linkedStudentName || '',
      p.status || 'active'
    ]);

    exportToCSV(`Parents_${schoolProfile.schoolName.replace(/\s+/g, '_')}`, headers, rows);
  };

  const filteredParents = processedParents;

  const filteredClasses = classes.filter(c => 
    c.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.classLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.classTeacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubjects = subjects.filter(sub => 
    sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.classLevel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* SidebarNavigation Component */}
      <SidebarNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        schoolName={schoolProfile.schoolName}
        schoolLogo={schoolProfile.logoUrl}
        counts={{
          students: (students || []).length,
          teachers: (teachers || []).length,
          parents: (parents || []).length,
          classes: (classes || []).length,
          subjects: (subjects || []).length
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-10 bg-[#002147] text-white px-4 sm:px-6 py-3 shadow-md flex items-center justify-between border-b border-[#00152e]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Open Mobile Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="text-[#D4AF37] font-bold uppercase tracking-wider">{schoolProfile.schoolName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{schoolProfile.academicTerm}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search roster..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Live Clock Badge */}
            <LivePortalClock 
              role="school_admin" 
              variant="compact" 
              schoolId={schoolId} 
              schoolName={schoolProfile.schoolName} 
            />

            {/* Global Notification Bell */}
            <NotificationBell
              onOpenFullCenter={() => setActiveTab('notifications')}
            />

            <button
              onClick={openWalkthrough}
              className="px-2.5 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              title="Replay Guided Walkthrough"
            >
              <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden lg:inline">Guided Tour</span>
            </button>

            <button
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setNewUserFormData({ fullName: '', email: '', phone: '', role: 'teacher', password: '', customId: '' });
                setIsUserAccountModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] text-xs font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow cursor-pointer transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add User</span>
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

            <button
              onClick={logout}
              className="p-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Executive School Branded Header */}
          <SchoolBrandedHeader
            portalRoleName="School Administration"
            portalRoleBadge="Executive Command"
            userName={currentUser.fullName || currentUser.name || 'School Admin'}
            userPhotoUrl={currentUser.photoUrl || currentUser.avatarUrl}
            onOpenProfile={() => setActiveTab('profile')}
            rightWidgets={
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
                title="School Branding & Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden md:inline">Branding & Identity</span>
              </button>
            }
          />

          {/* Mobile Search Bar */}
          <div className="md:hidden relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students, teachers, classes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
            />
          </div>

          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'notifications' && <NotificationCenter />}

          {activeTab === 'lms' && (
            <LmsMainView
              schoolId={schoolId}
              currentUserId={currentUser.uid || currentUser.id}
              currentUserName={currentUser.fullName || currentUser.name}
              currentUserRole="school_admin"
              showToast={showToast}
            />
          )}

          {activeTab === 'digital-library' && (
            <DigitalLibraryDashboard
              schoolId={schoolId}
              currentUserId={currentUser.uid || currentUser.id}
              currentUserName={currentUser.fullName || currentUser.name}
              currentUserRole="school_admin"
              schoolName={schoolProfile.schoolName || 'EDUkenZA Academy'}
              showToast={showToast}
            />
          )}
          {activeTab === 'overview' && (
            loading ? <SchoolDashboardSkeleton /> : (
              <div className="space-y-6">
                
                <LivePortalClock 
                  role="school_admin" 
                  variant="card" 
                  schoolId={schoolId} 
                  schoolName={schoolProfile.schoolName}
                  onNavigateTab={(tab) => setActiveTab(tab as any)} 
                />

                {/* Stats Cards (8 Required Dashboard Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Students</span>
                      <GraduationCap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{(students || []).length}</div>
                    <div className="text-[10px] text-slate-500">Active learners in roster</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Teachers</span>
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{(teachers || []).length}</div>
                    <div className="text-[10px] text-slate-500">Teaching faculty</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Parents</span>
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{(parents || []).length}</div>
                    <div className="text-[10px] text-slate-500">Registered parent accounts</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Classes</span>
                      <School className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{(classes || []).length}</div>
                    <div className="text-[10px] text-slate-500">Grade sections & classrooms</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Subjects</span>
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{(subjects || []).length}</div>
                    <div className="text-[10px] text-slate-500">Curriculum subjects</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Attendance Rate</span>
                      <CalendarCheck className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{attendanceStats.rate}</div>
                    <div className="text-[10px] text-slate-500">Daily attendance average</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Payment Revenue</span>
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{paymentStats.totalFormatted}</div>
                    <div className="text-[10px] text-slate-500">Total fees collected</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Academic Pass Rate</span>
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-black text-[#002147]">{academicStats.passRate}</div>
                    <div className="text-[10px] text-slate-500">Overall academic average</div>
                  </div>
                </div>

                {/* Recent Activities & Quick Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#D4AF37]" />
                        <span>Recent School Activities</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Live Firestore Updates</span>
                    </div>

                    <div className="space-y-3">
                      {students.slice(0, 3).map((st) => (
                        <div key={st.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#002147]">New Student Added: {st.fullName}</p>
                              <p className="text-[10px] text-slate-500">ID: {st.studentId} • Class: {st.className || 'General'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      ))}

                      {teachers.slice(0, 2).map((tc) => (
                        <div key={tc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#002147]">New Teacher Added: {tc.fullName}</p>
                              <p className="text-[10px] text-slate-500">Subject: {tc.subject}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{tc.createdAt ? new Date(tc.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      ))}

                      {relations.slice(0, 2).map((rel) => (
                        <div key={rel.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                              <Link2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#002147]">Parent Linked: {rel.parentName} → {rel.studentName}</p>
                              <p className="text-[10px] text-slate-500">Relationship established</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{rel.createdAt ? new Date(rel.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      ))}

                      {students.length === 0 && teachers.length === 0 && (
                        <div className="text-center py-8 text-xs text-slate-400">
                          No recent activities logged yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setClassModalMode('add');
                          setSelectedClass({});
                          setIsClassModalOpen(true);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-[#002147] hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-[#002147] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Create Class</span>
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                      </button>

                      <button
                        onClick={() => {
                          setStudentModalMode('add');
                          setSelectedStudent({ status: 'active', gender: 'Male' });
                          setStudentTempPassword('');
                          setIsStudentModalOpen(true);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-[#002147] hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-[#002147] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Register Student</span>
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                      </button>

                      <button
                        onClick={() => {
                          setTeacherModalMode('add');
                          setSelectedTeacher({ status: 'active' });
                          setTeacherTempPassword('');
                          setIsTeacherModalOpen(true);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-[#002147] hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-[#002147] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Register Teacher</span>
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                      </button>

                      <button
                        onClick={() => {
                          setParentModalMode('add');
                          setSelectedParent({ status: 'active' });
                          setParentTempPassword('');
                          setIsParentModalOpen(true);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-[#002147] hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-[#002147] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Register Parent</span>
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                      </button>

                      <button
                        onClick={() => {
                          setSubjectModalMode('add');
                          setSelectedSubject({});
                          setIsSubjectModalOpen(true);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-[#002147] hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-[#002147] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Create Subject</span>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* GOOGLE MEET MONITOR TAB */}
          {activeTab === 'google-meet' && (
            <SchoolAdminGoogleMeetMonitor
              schoolId={schoolId}
              showToast={showToast}
            />
          )}

          {/* GOOGLE FORMS CENTER TAB */}
          {activeTab === 'google-forms' && (
            <GoogleFormsManager
              schoolId={schoolId}
              currentUserId={currentUser.uid || currentUser.id}
              currentUserName={currentUser.fullName || currentUser.name || 'School Admin'}
              currentUserRole="school_admin"
              showToast={showToast}
            />
          )}

          {/* AI WORKSPACE TAB */}
          {activeTab === 'ai-workspace' && (
            <AiWorkspace
              currentUser={currentUser}
              userRole="school_admin"
              showToast={showToast}
            />
          )}

          {/* NOTIFICATION CENTER TAB */}
          {activeTab === 'notifications' && <NotificationCenter />}

          {/* 2. SCHOOL PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#002147]">School Profile</h2>
                  <p className="text-xs text-slate-500">Manage school information & metadata for assigned schoolId: <strong>{schoolId}</strong></p>
                </div>
                <Building2 className="w-8 h-8 text-[#D4AF37]" />
              </div>

              <form onSubmit={handleSaveSchoolProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">School Name</label>
                    <input
                      type="text"
                      required
                      value={schoolProfile.schoolName}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, schoolName: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Logo URL</label>
                    <input
                      type="url"
                      value={schoolProfile.logoUrl}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, logoUrl: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={schoolProfile.email}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, email: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={schoolProfile.phone}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, phone: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      required
                      value={schoolProfile.address}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, address: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={schoolProfile.country}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, country: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Academic Term</label>
                    <input
                      type="text"
                      value={schoolProfile.academicTerm}
                      onChange={(e) => setSchoolProfile({ ...schoolProfile, academicTerm: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#002147]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#002147] text-white font-bold rounded-lg hover:bg-[#003366] transition cursor-pointer"
                  >
                    Save School Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. STUDENT MANAGEMENT */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Top Header & Primary Action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#002147]">Student Roster & Directory</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                      {processedStudents.length} Students
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Students log in using Student ID Number + Password</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportStudentsCSV}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                    title="Export Student Directory to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setStudentModalMode('add');
                      setSelectedStudent({ status: 'active', gender: 'Male' });
                      setStudentTempPassword('');
                      setIsStudentModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer shadow-md shadow-[#002147]/10"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Register Student</span>
                  </button>
                </div>
              </div>

              {/* Step 1 Guidance Banner if No Classes Created Yet */}
              {classes.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">Step 1: Create a Class First</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Before registering students, create at least one class so learners can be assigned to their classroom.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setClassModalMode('add');
                      setSelectedClass({});
                      setIsClassModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Create Class</span>
                  </button>
                </div>
              )}

              {/* Advanced Filter Toolbar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, student ID, email, or class..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setStudentPage(1);
                    }}
                    className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002147] outline-none bg-slate-50/50"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Class Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={studentClassFilter}
                      onChange={(e) => {
                        setStudentClassFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => {
                        setStudentStatusFilter(e.target.value as any);
                        setStudentPage(1);
                      }}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  {/* Gender Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <select
                      value={studentGenderFilter}
                      onChange={(e) => {
                        setStudentGenderFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Sorting */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={studentSortBy}
                      onChange={(e) => setStudentSortBy(e.target.value as any)}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="fullName">Sort: Name</option>
                      <option value="studentId">Sort: ID</option>
                      <option value="className">Sort: Class</option>
                      <option value="status">Sort: Status</option>
                    </select>
                    <button
                      onClick={() => setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="ml-1 text-slate-500 hover:text-slate-900 font-bold px-1"
                      title="Toggle Order"
                    >
                      {studentSortOrder.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Action Bar */}
              {selectedStudentIds.length > 0 && (
                <div className="bg-indigo-900 text-white p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 font-bold px-2">
                    <CheckSquare className="w-4 h-4 text-indigo-300" />
                    <span>{selectedStudentIds.length} Student(s) Selected</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkStudentStatusChange('active')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                    >
                      Set Active
                    </button>
                    <button
                      onClick={() => handleBulkStudentStatusChange('disabled')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
                    >
                      Set Disabled
                    </button>
                    <button
                      onClick={handleExportStudentsCSV}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg transition"
                    >
                      Export Selected CSV
                    </button>
                    <button
                      onClick={handleBulkStudentDelete}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedStudentIds([])}
                      className="px-2 py-1 text-indigo-200 hover:text-white text-xs underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              )}

              {/* Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedStudents.length > 0 && selectedStudentIds.length === paginatedStudents.length}
                            onChange={handleSelectAllStudents}
                            className="rounded border-slate-300 text-[#002147] focus:ring-[#002147] cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Student ID</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Gender / DOB</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedStudents.map((st) => {
                        const isSelected = selectedStudentIds.includes(st.id);
                        return (
                          <tr key={st.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudentSelect(st.id)}
                                className="rounded border-slate-300 text-[#002147] focus:ring-[#002147] cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-xs shadow-sm">
                                  {st.photoUrl || st.avatarUrl ? (
                                    <img 
                                      src={st.photoUrl || st.avatarUrl} 
                                      alt={st.fullName} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span className="text-[#002147] font-black">
                                      {st.fullName ? st.fullName.substring(0, 2).toUpperCase() : 'ST'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#002147] truncate">{st.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate">{st.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-600 font-semibold">{st.studentId || st.admissionNumber}</td>
                            <td className="p-3 font-semibold">{st.className || 'General'}</td>
                            <td className="p-3 text-slate-500">{st.gender} • {st.dob}</td>
                            <td className="p-3 text-slate-500">{st.phone || 'N/A'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {st.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setViewStudentProfile(st)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="View Full Profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setStudentModalMode('edit');
                                    setSelectedStudent(st);
                                    setIsStudentModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => promptDeleteStudent(st)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedStudents.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-12 px-4">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">
                                  {students.length === 0 ? 'No students registered yet.' : 'No student records found'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {students.length === 0 
                                    ? 'Get started by registering the first student to this school.' 
                                    : 'Try adjusting your filters or search query.'}
                                </p>
                              </div>
                              {students.length === 0 && (
                                <button
                                  onClick={() => {
                                    setStudentModalMode('add');
                                    setSelectedStudent({ status: 'active', gender: 'Male' });
                                    setStudentTempPassword('');
                                    setIsStudentModalOpen(true);
                                  }}
                                  className="mt-1 px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Register Student</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Footer */}
                {processedStudents.length > 0 && (
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Showing {((studentPage - 1) * studentPageSize) + 1} to {Math.min(studentPage * studentPageSize, processedStudents.length)} of {processedStudents.length} entries</span>
                      <select
                        value={studentPageSize}
                        onChange={(e) => {
                          setStudentPageSize(Number(e.target.value));
                          setStudentPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={studentPage === 1}
                        onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <span className="px-3 py-1 font-bold text-[#002147] bg-white border border-slate-200 rounded-lg">
                        {studentPage} / {studentTotalPages}
                      </span>

                      <button
                        disabled={studentPage >= studentTotalPages}
                        onClick={() => setStudentPage(p => Math.min(studentTotalPages, p + 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. TEACHER MANAGEMENT */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#002147]">Teacher Staff Roster</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                      {processedTeachers.length} Teachers
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Manage teaching staff credentials and subject assignments</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportTeachersCSV}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                    title="Export Teacher Directory to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setTeacherModalMode('add');
                      setSelectedTeacher({ status: 'active' });
                      setTeacherTempPassword('');
                      setIsTeacherModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer shadow-md shadow-[#002147]/10"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Register Teacher</span>
                  </button>
                </div>
              </div>

              {/* Advanced Filter Toolbar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search teachers by name, email, or subject..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setTeacherPage(1);
                    }}
                    className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002147] outline-none bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <select
                      value={teacherStatusFilter}
                      onChange={(e) => {
                        setTeacherStatusFilter(e.target.value as any);
                        setTeacherPage(1);
                      }}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={teacherSortBy}
                      onChange={(e) => setTeacherSortBy(e.target.value as any)}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="fullName">Sort: Name</option>
                      <option value="teacherId">Sort: ID</option>
                      <option value="subject">Sort: Subject</option>
                      <option value="status">Sort: Status</option>
                    </select>
                    <button
                      onClick={() => setTeacherSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="ml-1 text-slate-500 hover:text-slate-900 font-bold px-1"
                    >
                      {teacherSortOrder.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>

              {/* Teacher Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                        <th className="p-3">Teacher Name</th>
                        <th className="p-3">Teacher ID</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedTeachers.map((tc) => (
                        <tr key={tc.id} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-xs shadow-sm">
                                {tc.photoUrl || tc.avatarUrl ? (
                                  <img 
                                    src={tc.photoUrl || tc.avatarUrl} 
                                    alt={tc.fullName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[#002147] font-black">
                                    {tc.fullName ? tc.fullName.substring(0, 2).toUpperCase() : 'TC'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#002147] truncate">{tc.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-normal truncate">{tc.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-600 font-semibold">{tc.teacherId}</td>
                          <td className="p-3 font-semibold">{tc.subject}</td>
                          <td className="p-3 text-slate-500">{tc.phone || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tc.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {tc.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setTeacherModalMode('edit');
                                  setSelectedTeacher(tc);
                                  setIsTeacherModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                                title="Edit Teacher"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => promptDeleteTeacher(tc)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete Teacher"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedTeachers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 px-4">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">
                                  {teachers.length === 0 ? 'No teachers registered yet.' : 'No teacher records found'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {teachers.length === 0 
                                    ? 'Authorize your faculty by registering teachers with their Google account.' 
                                    : 'Try searching with a different name, email, or subject.'}
                                </p>
                              </div>
                              {teachers.length === 0 && (
                                <button
                                  onClick={() => {
                                    setTeacherModalMode('add');
                                    setSelectedTeacher({ status: 'active' });
                                    setTeacherTempPassword('');
                                    setIsTeacherModalOpen(true);
                                  }}
                                  className="mt-1 px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Register Teacher</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Footer */}
                {processedTeachers.length > 0 && (
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Showing {((teacherPage - 1) * teacherPageSize) + 1} to {Math.min(teacherPage * teacherPageSize, processedTeachers.length)} of {processedTeachers.length} entries</span>
                      <select
                        value={teacherPageSize}
                        onChange={(e) => {
                          setTeacherPageSize(Number(e.target.value));
                          setTeacherPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={teacherPage === 1}
                        onClick={() => setTeacherPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <span className="px-3 py-1 font-bold text-[#002147] bg-white border border-slate-200 rounded-lg">
                        {teacherPage} / {teacherTotalPages}
                      </span>

                      <button
                        disabled={teacherPage >= teacherTotalPages}
                        onClick={() => setTeacherPage(p => Math.min(teacherTotalPages, p + 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. CLASS MANAGEMENT */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-[#002147]">Class Management</h2>
                  <p className="text-xs text-slate-500">Configure grade levels & assigned class teachers</p>
                </div>
                <button
                  onClick={() => {
                    setClassModalMode('add');
                    setSelectedClass({});
                    setIsClassModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Create Class</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-black text-[#002147] text-sm">{cls.className}</h3>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">{cls.classLevel}</span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600">
                      <p><strong>Academic Year:</strong> {cls.academicYear || '2026'}</p>
                      <p><strong>Class Teacher:</strong> {cls.classTeacherName || 'Unassigned'}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setClassModalMode('edit');
                          setSelectedClass(cls);
                          setIsClassModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => promptDeleteClass(cls)}
                        className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredClasses.length === 0 && (
                  <div className="col-span-full text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <School className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">
                        {classes.length === 0 ? 'No classes have been created yet.' : 'No classes match your search query.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {classes.length === 0 
                          ? 'Get started by creating your first grade or classroom for this school.' 
                          : 'Try clearing your search term or filtering differently.'}
                      </p>
                    </div>
                    {classes.length === 0 && (
                      <button
                        onClick={() => {
                          setClassModalMode('add');
                          setSelectedClass({});
                          setIsClassModalOpen(true);
                        }}
                        className="mt-1 px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                        <span>Create Class</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. SUBJECT MANAGEMENT */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-[#002147]">Subject Management</h2>
                  <p className="text-xs text-slate-500">Manage curriculum subjects & codes</p>
                </div>
                <button
                  onClick={() => {
                    setSubjectModalMode('add');
                    setSelectedSubject({});
                    setIsSubjectModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Create Subject</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((sub) => (
                  <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-black text-[#002147] text-sm">{sub.subjectName}</h3>
                      <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">{sub.code}</span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <p><strong>Grade Level:</strong> {sub.classLevel || 'All Grades'}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSubjectModalMode('edit');
                          setSelectedSubject(sub);
                          setIsSubjectModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => promptDeleteSubject(sub)}
                        className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredSubjects.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No subjects created yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. TEACHER ASSIGNMENT */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-[#002147]">Teacher Assignment</h2>
                  <p className="text-xs text-slate-500">Assign Teacher → Class → Subject</p>
                </div>
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>New Assignment</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                      <th className="p-3">Teacher</th>
                      <th className="p-3">Assigned Class</th>
                      <th className="p-3">Assigned Subject</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {assignments.map((asg) => (
                      <tr key={asg.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-[#002147]">{asg.teacherName}</td>
                        <td className="p-3 font-semibold">{asg.className}</td>
                        <td className="p-3 font-semibold">{asg.subjectName}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => promptRemoveAssignment(asg)}
                            className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          No teacher assignments configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIMETABLE MANAGEMENT */}
          {activeTab === 'timetable' && (
            <TimetableManagement
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              showToast={showToast}
            />
          )}

          {/* PAYMENTS & RECEIPTS */}
          {activeTab === 'payments' && (
            <PaymentManagement
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              classes={classes}
              currentUserEmail={currentUser?.email}
              currentUserName={currentUser?.fullName}
              showToast={showToast}
            />
          )}

          {/* DAILY CHARGEABLE SERVICES & STUDENT WALLETS */}
          {activeTab === 'daily-services' && (
            <EnterpriseDailyServicesModule
              schoolId={schoolId}
              userRole="school_admin"
              students={students}
              showToast={showToast}
            />
          )}

          {/* ACADEMIC REPORTS */}
          {activeTab === 'academic-reports' && (
            <AcademicReportManagement
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              showToast={showToast}
            />
          )}

          {/* EXAMINATIONS & RESULTS MANAGEMENT */}
          {activeTab === 'examinations' && (
            <ExaminationsManagement
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              showToast={showToast}
            />
          )}

          {/* COMMUNICATION CENTER */}
          {activeTab === 'communication' && (
            <CommunicationCenter
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              teachers={teachers}
              parents={parents}
              classes={classes}
              showToast={showToast}
            />
          )}

          {/* ATTENDANCE MANAGEMENT */}
          {activeTab === 'attendance' && (
            <AttendanceManagement
              schoolId={schoolId}
              students={students}
              teachers={teachers}
              classes={classes}
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {/* BIOMETRIC GATE & SECURITY CONTROL CENTER */}
          {activeTab === 'biometric' && (
            <BiometricControlCenter
              currentUser={currentUser}
              userRole="school_admin"
              schoolName={schoolProfile.schoolName || 'EDUkenZA Academy'}
              showToast={showToast}
            />
          )}

          {/* LEAVE MANAGEMENT */}
          {activeTab === 'leave-management' && (
            <LeaveManagement
              schoolId={schoolId}
              teachers={teachers}
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {/* REPORTS & ENTERPRISE AI ANALYTICS CENTER */}
          {activeTab === 'reports-analytics' && (
            <EnterpriseAiAnalyticsCenter
              userRole="school_admin"
              currentUser={currentUser}
              schoolId={schoolId}
              schoolName={schoolProfile.schoolName}
              students={students}
              teachers={teachers}
              parents={parents}
              classes={classes}
              subjects={subjects}
              showToast={showToast}
            />
          )}

          {/* RESULT APPROVAL */}
          {activeTab === 'result-approval' && (
            <ResultApprovalManagement
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              students={students}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              showToast={showToast}
            />
          )}

          {/* SCHOOL CONTROL CENTER */}
          {activeTab === 'control-center' && (
            <SchoolControlCenter
              schoolId={schoolId}
              schoolProfile={schoolProfile}
              showToast={showToast}
            />
          )}

          {/* 8. PARENT MANAGEMENT */}
          {activeTab === 'parents' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#002147]">Parent Directory & Contacts</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                      {processedParents.length} Parents
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Manage parent accounts, contact details, and student linkages</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportParentsCSV}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                    title="Export Parent Directory to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setParentModalMode('add');
                      setSelectedParent({ status: 'active' });
                      setParentTempPassword('');
                      setIsParentModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer shadow-md shadow-[#002147]/10"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Register Parent</span>
                  </button>
                </div>
              </div>

              {/* Advanced Filter Toolbar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search parents by name, email, or student name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setParentPage(1);
                    }}
                    className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002147] outline-none bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <select
                      value={parentStatusFilter}
                      onChange={(e) => {
                        setParentStatusFilter(e.target.value as any);
                        setParentPage(1);
                      }}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={parentSortBy}
                      onChange={(e) => setParentSortBy(e.target.value as any)}
                      className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="fullName">Sort: Name</option>
                      <option value="email">Sort: Email</option>
                      <option value="status">Sort: Status</option>
                    </select>
                    <button
                      onClick={() => setParentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="ml-1 text-slate-500 hover:text-slate-900 font-bold px-1"
                    >
                      {parentSortOrder.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>

              {/* Parent Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                        <th className="p-3">Parent Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Linked Student</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedParents.map((pr) => (
                        <tr key={pr.id} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-xs shadow-sm">
                                {pr.photoUrl || pr.avatarUrl ? (
                                  <img 
                                    src={pr.photoUrl || pr.avatarUrl} 
                                    alt={pr.fullName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[#002147] font-black">
                                    {pr.fullName ? pr.fullName.substring(0, 2).toUpperCase() : 'PR'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#002147] truncate">{pr.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-normal truncate">{pr.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600">{pr.email}</td>
                          <td className="p-3 text-slate-500">{pr.phone || 'N/A'}</td>
                          <td className="p-3 font-semibold text-indigo-700">{pr.linkedStudentName || 'Unlinked'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {(pr.status || 'active')?.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setParentModalMode('edit');
                                  setSelectedParent(pr);
                                  setIsParentModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                                title="Edit Parent"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => promptDeleteParent(pr)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete Parent"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedParents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 px-4">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">
                                  {parents.length === 0 ? 'No parents registered yet.' : 'No parent records found'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {parents.length === 0 
                                    ? 'Authorize guardians by registering parents with their Google account.' 
                                    : 'Try searching with a different name, email, or student name.'}
                                </p>
                              </div>
                              {parents.length === 0 && (
                                <button
                                  onClick={() => {
                                    setParentModalMode('add');
                                    setSelectedParent({ status: 'active' });
                                    setParentTempPassword('');
                                    setIsParentModalOpen(true);
                                  }}
                                  className="mt-1 px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Register Parent</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Footer */}
                {processedParents.length > 0 && (
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Showing {((parentPage - 1) * parentPageSize) + 1} to {Math.min(parentPage * parentPageSize, processedParents.length)} of {processedParents.length} entries</span>
                      <select
                        value={parentPageSize}
                        onChange={(e) => {
                          setParentPageSize(Number(e.target.value));
                          setParentPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={parentPage === 1}
                        onClick={() => setParentPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <span className="px-3 py-1 font-bold text-[#002147] bg-white border border-slate-200 rounded-lg">
                        {parentPage} / {parentTotalPages}
                      </span>

                      <button
                        disabled={parentPage >= parentTotalPages}
                        onClick={() => setParentPage(p => Math.min(parentTotalPages, p + 1))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. PARENT-STUDENT LINKING */}
          {activeTab === 'linking' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-[#002147]">Parent-Student Linking</h2>
                  <p className="text-xs text-slate-500">Link parent accounts to students in Firestore</p>
                </div>
                <button
                  onClick={() => setIsLinkingModalOpen(true)}
                  className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Link Parent & Student</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                      <th className="p-3">Parent</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Date Linked</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {relations.map((rel) => (
                      <tr key={rel.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-[#002147]">{rel.parentName}</td>
                        <td className="p-3 font-semibold text-indigo-700">{rel.studentName}</td>
                        <td className="p-3 text-slate-500">{rel.createdAt ? new Date(rel.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => promptRemoveRelation(rel)}
                            className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold cursor-pointer"
                          >
                            Unlink
                          </button>
                        </td>
                      </tr>
                    ))}
                    {relations.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          No parent-student relationships linked yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-[#002147]">User Management</h2>
                  <p className="text-xs text-slate-500">School Admin can create Teachers, Parents, and Students credentials</p>
                </div>
                <button
                  onClick={() => setIsUserAccountModalOpen(true)}
                  className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Create Account</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-[#002147]">{usr.fullName || usr.name}</td>
                        <td className="p-3">{usr.email}</td>
                        <td className="p-3 font-semibold uppercase">{usr.role}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            usr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {usr.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 11. SCHOOL SETTINGS & BRANDING */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Comprehensive Real-time School Branding & Profile Center */}
              <SchoolSettingsBranding />

              {/* BIOMETRIC & PASSKEYS MANAGEMENT */}
              <div className="max-w-4xl space-y-6">
                <BiometricPasskeysSettings />

                {/* DATA PRIVACY & DOWNLOAD PERSONAL DATA */}
                <PersonalDataExportCard
                  currentUser={currentUser}
                  customTitle="Download Administrator Personal Data"
                  customDescription="Export a machine-readable JSON archive containing your administrator profile, assigned school credentials, system audit trail, and security settings."
                />
              </div>
            </div>
          )}

          {/* 18. IMPORT & EXPORT CENTER */}
          {activeTab === 'import-export' && (
            <ImportExportCenter
              userRole="school_admin"
              currentUser={currentUser}
              defaultSchoolId={schoolId}
              defaultSchoolName={schoolProfile.schoolName}
            />
          )}

          {/* 19. BACKUP & RECOVERY CENTER */}
          {activeTab === 'backup-recovery' && (
            <BackupRecoveryCenter
              role="school_admin"
              currentUser={currentUser}
              defaultSchoolId={schoolId}
              defaultSchoolName={schoolProfile.schoolName}
            />
          )}

          {/* 20. SECURITY & COMPLIANCE HARDENING */}
          {activeTab === 'security-hardening' && (
            <SecurityAuditCenter />
          )}

          {/* 21. SCHOOL SUBSCRIPTION & BILLING CENTER */}
          {activeTab === 'subscription-billing' && (
            <SchoolAdminBillingCenter />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. STUDENT MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm">{studentModalMode === 'add' ? 'Register New Student' : 'Edit Student Profile'}</h3>
                <p className="text-[11px] text-slate-500">School ID: <span className="font-mono font-bold text-indigo-600">{schoolId}</span></p>
              </div>
              <button disabled={isSubmitting} onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {classes.length === 0 && studentModalMode === 'add' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs">No Classes Available</p>
                  <p className="text-[11px] text-amber-700">You must create at least one class in this school before registering students.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStudentModalOpen(false);
                      setClassModalMode('add');
                      setSelectedClass({});
                      setIsClassModalOpen(true);
                    }}
                    className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Class First
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Student Passport Photo */}
                <div className="col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block font-bold mb-2 text-slate-700">Official Student Passport Photo</label>
                  <ProfilePhotoUploader
                    currentPhotoUrl={selectedStudent.photoUrl || selectedStudent.avatarUrl}
                    displayName={selectedStudent.fullName || 'Student'}
                    subtitle={selectedStudent.studentId ? `Student ID: ${selectedStudent.studentId}` : 'Digital Passport Photo'}
                    shape="circle"
                    size="md"
                    onUpload={async (file, onProgress) => {
                      const entityKey = selectedStudent.studentId || selectedStudent.id || `stu_${Date.now()}`;
                      const url = await uploadProfilePhoto(schoolId, 'students', entityKey, file, onProgress);
                      setSelectedStudent((prev: any) => ({ ...prev, photoUrl: url, avatarUrl: url }));
                      if (selectedStudent.id) {
                        await updateStudentProfilePhoto(schoolId, selectedStudent.id, selectedStudent.studentId || '', url, {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                      return url;
                    }}
                    onRemove={async () => {
                      setSelectedStudent((prev: any) => ({ ...prev, photoUrl: '', avatarUrl: '' }));
                      if (selectedStudent.id) {
                        await updateStudentProfilePhoto(schoolId, selectedStudent.id, selectedStudent.studentId || '', '', {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Student Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={selectedStudent.fullName || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, fullName: e.target.value })}
                    placeholder="e.g. Thabo Mokoena"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Student ID / Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={selectedStudent.studentId || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, studentId: e.target.value })}
                    placeholder="e.g. STU-2026-001"
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Unique identifier used for student login.</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">
                    Student Google Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={selectedStudent.email || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, email: e.target.value })}
                    placeholder="student@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Used for student "Continue with Google" sign-in.</p>
                </div>

                {studentModalMode === 'edit' && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold mb-1 text-slate-700">Account Status</label>
                    <select
                      disabled={isSubmitting}
                      value={selectedStudent.status || 'active'}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, status: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Gender <span className="text-red-500">*</span></label>
                  <select
                    disabled={isSubmitting}
                    value={selectedStudent.gender || 'Male'}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, gender: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    disabled={isSubmitting}
                    value={selectedStudent.dob || '2008-01-01'}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, dob: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Assigned Class <span className="text-red-500">*</span></label>
                  <select
                    required
                    disabled={isSubmitting || classes.length === 0}
                    value={selectedStudent.classId || ''}
                    onChange={(e) => {
                      const cObj = classes.find(c => c.id === e.target.value);
                      setSelectedStudent({ ...selectedStudent, classId: e.target.value, className: cObj?.className || '' });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="">
                      {classes.length === 0 ? '-- No classes created yet. Please create a class first --' : '-- Select Assigned Class --'}
                    </option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.className} — {c.classLevel} {c.academicYear ? `(${c.academicYear})` : ''}
                      </option>
                    ))}
                  </select>
                  {classes.length > 0 && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                      ✓ {classes.length} class{classes.length > 1 ? 'es' : ''} available in school database.
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Link Registered Parent / Guardian</label>
                  <select
                    disabled={isSubmitting}
                    value={selectedStudent.parentId || ''}
                    onChange={(e) => {
                      const pObj = parents.find(p => p.id === e.target.value);
                      setSelectedStudent({
                        ...selectedStudent,
                        parentId: e.target.value,
                        parentInfo: pObj ? `${pObj.fullName} (${pObj.email})` : selectedStudent.parentInfo
                      });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Select Parent from School Registry (Optional) --</option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} — {p.email} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Parent / Guardian Contact Notes</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={selectedStudent.parentInfo || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, parentInfo: e.target.value })}
                    placeholder="e.g. Mrs. Mokoena (082 123 4567)"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Student Phone (Optional)</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={selectedStudent.phone || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, phone: e.target.value })}
                    placeholder="e.g. +27 82 123 4567"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Residential Address (Optional)</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={selectedStudent.address || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, address: e.target.value })}
                    placeholder="e.g. 14 Protea Lane"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {studentModalMode === 'add' ? 'Will create credentials & student record.' : 'Will update student record in Firestore.'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsStudentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (classes.length === 0 && studentModalMode === 'add')}
                    className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>{submittingAction || 'Processing...'}</span>
                      </>
                    ) : (
                      <span>{studentModalMode === 'add' ? 'Register Student' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. TEACHER MODAL */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm">{teacherModalMode === 'add' ? 'Register New Teacher' : 'Edit Teacher Profile'}</h3>
                <p className="text-[11px] text-slate-500">School ID: <span className="font-mono font-bold text-indigo-600">{schoolId}</span></p>
              </div>
              <button disabled={isSubmitting} onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Teacher Passport Photo */}
                <div className="col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block font-bold mb-2 text-slate-700">Official Faculty Passport Photo</label>
                  <ProfilePhotoUploader
                    currentPhotoUrl={selectedTeacher.photoUrl || selectedTeacher.avatarUrl}
                    displayName={selectedTeacher.fullName || 'Teacher'}
                    subtitle={selectedTeacher.teacherId ? `Teacher ID: ${selectedTeacher.teacherId}` : 'Digital Faculty Photo'}
                    shape="circle"
                    size="md"
                    onUpload={async (file, onProgress) => {
                      const entityKey = selectedTeacher.teacherId || selectedTeacher.id || `tc_${Date.now()}`;
                      const url = await uploadProfilePhoto(schoolId, 'teachers', entityKey, file, onProgress);
                      setSelectedTeacher((prev: any) => ({ ...prev, photoUrl: url, avatarUrl: url }));
                      if (selectedTeacher.id) {
                        await updateTeacherProfilePhoto(schoolId, selectedTeacher.id, selectedTeacher.teacherId || '', url, {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                      return url;
                    }}
                    onRemove={async () => {
                      setSelectedTeacher((prev: any) => ({ ...prev, photoUrl: '', avatarUrl: '' }));
                      if (selectedTeacher.id) {
                        await updateTeacherProfilePhoto(schoolId, selectedTeacher.id, selectedTeacher.teacherId || '', '', {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Teacher Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={selectedTeacher.fullName || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, fullName: e.target.value })}
                    placeholder="e.g. Dr. Nkosana Dlamini"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Teacher Google Account Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    disabled={teacherModalMode === 'edit' || isSubmitting}
                    placeholder="teacher.name@gmail.com"
                    value={selectedTeacher.email || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg disabled:bg-slate-100 font-medium text-slate-800"
                  />
                  {teacherModalMode === 'add' && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-blue-900">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="text-[11px] font-normal leading-relaxed">
                        <strong>Google Authentication:</strong> The teacher will log in via Google. Their profile will link seamlessly to this school record.
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Teacher ID / Staff Code</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. TCH-010"
                    value={selectedTeacher.teacherId || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, teacherId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Leave blank to auto-generate.</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. +27 82 555 1234"
                    value={selectedTeacher.phone || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Primary Subject / Department</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. Mathematics, Physical Sciences"
                    value={selectedTeacher.subject || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, subject: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Assigned Class</label>
                  <select
                    disabled={isSubmitting}
                    value={selectedTeacher.assignedClassId || ''}
                    onChange={(e) => {
                      const cObj = classes.find(c => c.id === e.target.value);
                      setSelectedTeacher({
                        ...selectedTeacher,
                        assignedClassId: e.target.value,
                        assignedClassName: cObj?.className || ''
                      });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Select Assigned Class (Optional) --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.classLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {teacherModalMode === 'add' ? 'Registers teacher into school database.' : 'Updates teacher details.'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsTeacherModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>{submittingAction || 'Processing...'}</span>
                      </>
                    ) : (
                      <span>{teacherModalMode === 'add' ? 'Register Teacher' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PARENT MODAL */}
      {isParentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm">{parentModalMode === 'add' ? 'Register New Parent' : 'Edit Parent Profile'}</h3>
                <p className="text-[11px] text-slate-500">School ID: <span className="font-mono font-bold text-indigo-600">{schoolId}</span></p>
              </div>
              <button disabled={isSubmitting} onClick={() => setIsParentModalOpen(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Parent Passport Photo */}
                <div className="col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block font-bold mb-2 text-slate-700">Official Guardian / Parent Photo</label>
                  <ProfilePhotoUploader
                    currentPhotoUrl={selectedParent.photoUrl || selectedParent.avatarUrl}
                    displayName={selectedParent.fullName || 'Parent'}
                    subtitle={selectedParent.parentId ? `Parent ID: ${selectedParent.parentId}` : 'Guardian Photo'}
                    shape="circle"
                    size="md"
                    onUpload={async (file, onProgress) => {
                      const entityKey = selectedParent.parentId || selectedParent.id || `pr_${Date.now()}`;
                      const url = await uploadProfilePhoto(schoolId, 'parents', entityKey, file, onProgress);
                      setSelectedParent((prev: any) => ({ ...prev, photoUrl: url, avatarUrl: url }));
                      if (selectedParent.id) {
                        await updateParentProfilePhoto(schoolId, selectedParent.id, selectedParent.parentId || '', url, {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                      return url;
                    }}
                    onRemove={async () => {
                      setSelectedParent((prev: any) => ({ ...prev, photoUrl: '', avatarUrl: '' }));
                      if (selectedParent.id) {
                        await updateParentProfilePhoto(schoolId, selectedParent.id, selectedParent.parentId || '', '', {
                          email: currentUser.email,
                          name: currentUser.fullName
                        });
                      }
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Parent Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={selectedParent.fullName || ''}
                    onChange={(e) => setSelectedParent({ ...selectedParent, fullName: e.target.value })}
                    placeholder="e.g. Sipho Ndlovu"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Parent Google Account Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    disabled={parentModalMode === 'edit' || isSubmitting}
                    placeholder="parent.name@gmail.com"
                    value={selectedParent.email || ''}
                    onChange={(e) => setSelectedParent({ ...selectedParent, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg disabled:bg-slate-100 font-medium text-slate-800"
                  />
                  {parentModalMode === 'add' && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-blue-900">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="text-[11px] font-normal leading-relaxed">
                        <strong>Google Authentication:</strong> Parent will log in via Google to access their child's portal.
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. +27 83 987 6543"
                    value={selectedParent.phone || ''}
                    onChange={(e) => setSelectedParent({ ...selectedParent, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold mb-1 text-slate-700">Parent ID Code</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. PAR-001"
                    value={selectedParent.parentId || ''}
                    onChange={(e) => setSelectedParent({ ...selectedParent, parentId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Leave blank to auto-generate.</p>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1 text-slate-700">Link to Student / Child in this School</label>
                  <select
                    disabled={isSubmitting}
                    value={selectedParent.linkedStudentId || ''}
                    onChange={(e) => {
                      const sObj = students.find(s => s.id === e.target.value);
                      setSelectedParent({
                        ...selectedParent,
                        linkedStudentId: e.target.value,
                        linkedStudentName: sObj?.fullName || ''
                      });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Select Child / Student to Link (Optional) --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.studentId}) — {s.className}
                      </option>
                    ))}
                  </select>
                  {students.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Automatically establishes parent-student relation and updates records.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {parentModalMode === 'add' ? 'Registers parent into school database.' : 'Updates parent details.'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsParentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>{submittingAction || 'Processing...'}</span>
                      </>
                    ) : (
                      <span>{parentModalMode === 'add' ? 'Register Parent' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CLASS MODAL */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#002147] text-sm">{classModalMode === 'add' ? 'Create New Class' : 'Edit Class Details'}</h3>
                <p className="text-[11px] text-slate-500">
                  School: <span className="font-bold text-slate-800">{schoolProfile.schoolName || currentUser?.schoolName}</span>
                </p>
              </div>
              <button disabled={isSubmitting} onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Active School ID:</span>
              <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">{schoolId}</span>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Class Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={selectedClass.className || ''}
                  onChange={(e) => setSelectedClass({ ...selectedClass, className: e.target.value })}
                  placeholder="e.g. Grade 10A, Basic 7, Form 2B"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Class Level / Stage <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={selectedClass.classLevel || ''}
                  onChange={(e) => setSelectedClass({ ...selectedClass, classLevel: e.target.value })}
                  placeholder="e.g. Grade 10, Junior Secondary, Primary 4"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Academic Year</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={selectedClass.academicYear || '2026/2027'}
                    onChange={(e) => setSelectedClass({ ...selectedClass, academicYear: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Max Capacity</label>
                  <input
                    type="number"
                    disabled={isSubmitting}
                    min="1"
                    max="200"
                    value={selectedClass.capacity || 40}
                    onChange={(e) => setSelectedClass({ ...selectedClass, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Assigned Class Teacher</label>
                <select
                  disabled={isSubmitting}
                  value={selectedClass.classTeacherId || ''}
                  onChange={(e) => {
                    const tObj = teachers.find(t => t.id === e.target.value);
                    setSelectedClass({
                      ...selectedClass,
                      classTeacherId: e.target.value,
                      classTeacherName: tObj?.fullName || 'Unassigned'
                    });
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">
                    {teachers.length === 0 ? '-- No teachers registered yet (Optional) --' : '-- Select Teacher (Optional) --'}
                  </option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.subject ? `(${t.subject})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Description / Room (Optional)</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="e.g. Room 204, East Wing"
                  value={selectedClass.description || ''}
                  onChange={(e) => setSelectedClass({ ...selectedClass, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {classModalMode === 'add' ? 'Real-time sync to all class lists.' : 'Updates class in Firestore.'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsClassModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>{submittingAction || 'Creating...'}</span>
                      </>
                    ) : (
                      <span>{classModalMode === 'add' ? 'Create Class' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. SUBJECT MODAL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm">{subjectModalMode === 'add' ? 'Create Subject' : 'Edit Subject'}</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={selectedSubject.subjectName || ''}
                  onChange={(e) => setSelectedSubject({ ...selectedSubject, subjectName: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={selectedSubject.code || ''}
                  onChange={(e) => setSelectedSubject({ ...selectedSubject, code: e.target.value })}
                  placeholder="e.g. MATH101"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Class Level</label>
                <input
                  type="text"
                  value={selectedSubject.classLevel || 'All Grades'}
                  onChange={(e) => setSelectedSubject({ ...selectedSubject, classLevel: e.target.value })}
                  placeholder="e.g. Grade 10 - 12"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#002147] text-white font-bold rounded-lg">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. TEACHER ASSIGNMENT MODAL */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm">Assign Teacher → Class → Subject</h3>
              <button onClick={() => setIsAssignmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Teacher</label>
                <select
                  required
                  value={selectedAssignmentForm.teacherId}
                  onChange={(e) => setSelectedAssignmentForm({ ...selectedAssignmentForm, teacherId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName} ({t.subject})</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Select Class</label>
                <select
                  required
                  value={selectedAssignmentForm.classId}
                  onChange={(e) => setSelectedAssignmentForm({ ...selectedAssignmentForm, classId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Select Subject</label>
                <select
                  required
                  value={selectedAssignmentForm.subjectId}
                  onChange={(e) => setSelectedAssignmentForm({ ...selectedAssignmentForm, subjectId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName} ({s.code})</option>)}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAssignmentModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#002147] text-white font-bold rounded-lg">Assign Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PARENT-STUDENT LINKING MODAL */}
      {isLinkingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm">Link Parent to Student</h3>
              <button onClick={() => setIsLinkingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkParentStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Parent</label>
                <select
                  required
                  value={selectedLinkingForm.parentId}
                  onChange={(e) => setSelectedLinkingForm({ ...selectedLinkingForm, parentId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Parent...</option>
                  {parents.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.email})</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Select Student</label>
                <select
                  required
                  value={selectedLinkingForm.studentId}
                  onChange={(e) => setSelectedLinkingForm({ ...selectedLinkingForm, studentId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>)}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsLinkingModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#002147] text-white font-bold rounded-lg">Establish Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. CREATE USER ACCOUNT MODAL */}
      {isUserAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm">Create User Credentials</h3>
              <button onClick={() => setIsUserAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Account Role</label>
                <select
                  value={newUserFormData.role}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, role: e.target.value as any })}
                  className="w-full p-2 border rounded-lg font-bold bg-white"
                >
                  <option value="teacher">Teacher (Google Sign-In)</option>
                  <option value="parent">Parent (Google Sign-In)</option>
                  <option value="student">Student (Google Sign-In)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newUserFormData.fullName}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, fullName: e.target.value })}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {newUserFormData.role === 'student' && (
                <div>
                  <label className="block font-bold mb-1">Student ID Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newUserFormData.customId || ''}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, customId: e.target.value })}
                    placeholder="e.g. STU-2026-001"
                    className="w-full p-2 border rounded-lg font-mono font-bold uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">School identifier assigned to student record.</p>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Google Account Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newUserFormData.email}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full p-2 border rounded-lg"
                />
                <div className="mt-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2 text-blue-900">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="text-[11px] font-medium leading-tight">
                    All accounts use Google Sign-In. No temporary passwords required.
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsUserAccountModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#002147] text-white font-bold rounded-lg">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. VIEW STUDENT PROFILE MODAL */}
      {viewStudentProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#002147] text-sm">Student Profile</h3>
              <button onClick={() => setViewStudentProfile(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p><strong>Full Name:</strong> {viewStudentProfile.fullName}</p>
              <p><strong>Student ID / Admission Number:</strong> {viewStudentProfile.studentId || viewStudentProfile.admissionNumber}</p>
              <p><strong>Email:</strong> {viewStudentProfile.email}</p>
              <p><strong>Class:</strong> {viewStudentProfile.className || 'General'}</p>
              <p><strong>Gender:</strong> {viewStudentProfile.gender}</p>
              <p><strong>DOB:</strong> {viewStudentProfile.dob}</p>
              <p><strong>Phone:</strong> {viewStudentProfile.phone || 'N/A'}</p>
              <p><strong>Address:</strong> {viewStudentProfile.address || 'N/A'}</p>
              <p><strong>Status:</strong> <span className="uppercase font-bold">{viewStudentProfile.status}</span></p>
            </div>

            <div className="pt-3 flex justify-end">
              <button onClick={() => setViewStudentProfile(null)} className="px-4 py-2 bg-[#002147] text-white font-bold rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DELETE CONFIRMATION MODAL */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-[#002147] text-sm">{deleteConfirmation.title}</h3>
            <p className="text-xs text-slate-600">{deleteConfirmation.message}</p>

            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteConfirmation.onConfirm();
                  setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer transition"
              >
                Confirm Delete
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
        isOpen={isSendNotificationModalOpen}
        onClose={() => setIsSendNotificationModalOpen(false)}
      />
    </div>
  );
};
