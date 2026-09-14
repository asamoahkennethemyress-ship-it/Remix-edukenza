import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Clock, 
  CheckSquare, 
  FileText, 
  Award, 
  Send, 
  DollarSign, 
  CreditCard, 
  Megaphone, 
  MessageSquare, 
  FolderDown, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  ChevronRight, 
  Menu, 
  X, 
  BookOpen,
  Bell,
  Sparkles,
  Wallet
} from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AiWorkspace } from './ai/AiWorkspace';
import { EnterpriseDailyServicesModule } from './dailyServices/EnterpriseDailyServicesModule';

import { ParentOverview } from './parent/ParentOverview';
import { ParentMyChildren } from './parent/ParentMyChildren';
import { ParentStudentProfiles } from './parent/ParentStudentProfiles';
import { ParentTimetables } from './parent/ParentTimetables';
import { ParentAttendance } from './parent/ParentAttendance';
import { ParentResults } from './parent/ParentResults';
import { ParentAcademicReports } from './parent/ParentAcademicReports';
import { ParentAssignments } from './parent/ParentAssignments';
import { ParentFeePayments } from './parent/ParentFeePayments';
import { ParentPaymentReceipts } from './parent/ParentPaymentReceipts';
import { ParentSchoolCalendar } from './parent/ParentSchoolCalendar';
import { ParentAnnouncements } from './parent/ParentAnnouncements';
import { ParentCommunication } from './parent/ParentCommunication';
import { ParentTeachers } from './parent/ParentTeachers';
import { ParentBehaviour } from './parent/ParentBehaviour';
import { ParentDocuments } from './parent/ParentDocuments';
import { ParentSettings } from './parent/ParentSettings';
import { ParentGoogleMeetView } from './parent/ParentGoogleMeetView';
import { ParentLmsView } from './parent/ParentLmsView';
import { ParentExeatView } from './parent/ParentExeatView';
import { DigitalLibraryDashboard } from './library/DigitalLibraryDashboard';
import { EnterpriseAiAnalyticsCenter } from './analytics/EnterpriseAiAnalyticsCenter';
import { GoogleFormsManager } from './common/GoogleFormsManager';
import { Video, Compass, ClipboardCheck } from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';
import { LivePortalClock } from './common/LivePortalClock';
import { NotificationCenter } from './notifications/NotificationCenter';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { SchoolBrandedHeader } from './common/SchoolBrandedHeader';
import { useAssignmentNotificationListener } from '../hooks/useAssignmentNotificationListener';

export type ParentTabType = 
  | 'dashboard'
  | 'ai-analytics'
  | 'lms'
  | 'digital-library'
  | 'exeats'
  | 'google-meet'
  | 'google-forms'
  | 'ai-workspace'
  | 'notifications'
  | 'my-children'
  | 'student-profiles'
  | 'teachers'
  | 'behaviour'
  | 'timetables'
  | 'attendance'
  | 'reports'
  | 'results'
  | 'assignments'
  | 'fees'
  | 'daily-services'
  | 'payment-receipts'
  | 'school-calendar'
  | 'announcements'
  | 'communication'
  | 'documents'
  | 'settings';

export const ParentDashboard: React.FC = () => {
  const { currentUser, logout, setActiveView, showToast, openWalkthrough } = useAuth();

  const [activeTab, setActiveTab] = useState<ParentTabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const schoolId = currentUser?.schoolId || '';

  // DIAGNOSTIC LOGGING FUNCTION FOR PARENT LOGIN
  const logParentDiagnostics = async (parentUid: string, schoolId: string, linkedStudentsList: any[]) => {
    if (!schoolId) return;
    console.group(`🔍 [PARENT PORTAL DIAGNOSTICS] - Parent UID: ${parentUid}`);
    console.log(`Parent ID: ${parentUid}`);
    console.log(`School ID: ${schoolId}`);
    const studentIds = linkedStudentsList.map(s => s.studentId || s.id);
    console.log(`Linked Student IDs:`, studentIds);
    console.log(`Number of linked students: ${linkedStudentsList.length}`);

    if (linkedStudentsList.length === 0) {
      console.warn(`⚠️ Warning: No linked students found for parent ${parentUid}. Parent will see empty state.`);
      console.groupEnd();
      return;
    }

    // Check Assignments
    try {
      const classNames = Array.from(new Set(linkedStudentsList.map(s => s.className).filter(Boolean)));
      const qAss = query(collection(db, 'assignments'), where('schoolId', '==', schoolId));
      const snapAss = await getDocs(qAss);
      let countAss = 0;
      snapAss.forEach(d => {
        const data = d.data();
        if (classNames.includes(data.className) || classNames.includes(data.targetClass) || !data.className) {
          countAss++;
        }
      });
      console.log(`Assignments loaded: ${countAss}`);
      if (countAss === 0) console.info(`Reason for 0 assignments: No assignments published yet for class(es): ${classNames.join(', ')}.`);
    } catch (e) {
      console.error(`Error loading assignments for diagnostics:`, e);
    }

    // Check Attendance Records
    try {
      const qAtt = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
      const snapAtt = await getDocs(qAtt);
      let countAtt = 0;
      snapAtt.forEach(d => {
        const data = d.data();
        if (studentIds.includes(data.studentId) || studentIds.includes(data.studentUid)) {
          countAtt++;
        }
      });
      console.log(`Attendance records loaded: ${countAtt}`);
      if (countAtt === 0) console.info(`Reason for 0 attendance: No attendance marked yet for linked students.`);
    } catch (e) {
      console.error(`Error loading attendance for diagnostics:`, e);
    }

    // Check Results Loaded
    try {
      const qRes = query(collection(db, 'results'), where('schoolId', '==', schoolId));
      const snapRes = await getDocs(qRes);
      let countRes = 0;
      snapRes.forEach(d => {
        const data = d.data();
        if (studentIds.includes(data.studentId) && (data.isApproved === true || data.status === 'approved')) {
          countRes++;
        }
      });
      console.log(`Results loaded: ${countRes}`);
      if (countRes === 0) console.info(`Reason for 0 results: No approved results released yet by School Admin.`);
    } catch (e) {
      console.error(`Error loading results for diagnostics:`, e);
    }

    // Check Payments Loaded
    try {
      const qPay = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
      const snapPay = await getDocs(qPay);
      let countPay = 0;
      snapPay.forEach(d => {
        const data = d.data();
        if (studentIds.includes(data.studentId) || studentIds.includes(data.studentUid)) {
          countPay++;
        }
      });
      console.log(`Payments loaded: ${countPay}`);
      if (countPay === 0) console.info(`Reason for 0 payments: No payment receipts or invoices recorded yet for linked students.`);
    } catch (e) {
      console.error(`Error loading payments for diagnostics:`, e);
    }

    // Check Announcements Loaded
    try {
      const qAnn = query(collection(db, 'announcements'), where('schoolId', '==', schoolId));
      const snapAnn = await getDocs(qAnn);
      console.log(`Announcements loaded: ${snapAnn.size}`);
      if (snapAnn.size === 0) console.info(`Reason for 0 announcements: No announcements published by School Admin.`);
    } catch (e) {
      console.error(`Error loading announcements for diagnostics:`, e);
    }

    // Check Notifications Loaded
    try {
      const qNotif = query(collection(db, 'notifications'), where('schoolId', '==', schoolId));
      const snapNotif = await getDocs(qNotif);
      let countNotif = 0;
      snapNotif.forEach(d => {
        const data = d.data();
        if (data.recipientId === parentUid || data.role === 'parent' || !data.recipientId) {
          countNotif++;
        }
      });
      console.log(`Notifications loaded: ${countNotif}`);
      if (countNotif === 0) console.info(`Reason for 0 notifications: No notifications emitted yet for this account.`);
    } catch (e) {
      console.error(`Error loading notifications for diagnostics:`, e);
    }

    console.groupEnd();
  };

  // Real-time listener for parent's linked students
  useEffect(() => {
    if ((!currentUser?.uid && !currentUser?.email) || !currentUser?.schoolId) return;
    setLoadingStudents(true);
    const schoolId = currentUser.schoolId;

    // Subscribe to parentStudentRelations in real time
    const qRel = query(
      collection(db, 'parentStudentRelations'),
      where('schoolId', '==', schoolId)
    );

    const unsubRel = onSnapshot(qRel, (snapRel) => {
      (async () => {
        try {
          const studentIdsToFetch: string[] = [];

          snapRel.forEach(d => {
            const data = d.data();
            if (
              data.parentUid === currentUser.uid ||
              data.parentId === currentUser.uid ||
              data.parentId === currentUser.parentId ||
              data.parentEmail === currentUser.email
            ) {
              if (data.studentId && !studentIdsToFetch.includes(data.studentId)) {
                studentIdsToFetch.push(data.studentId);
              }
            }
          });

          // Also check currentUser.linkedStudentIds array or currentUser.linkedStudentId
          if (Array.isArray(currentUser.linkedStudentIds)) {
            currentUser.linkedStudentIds.forEach((id: string) => {
              if (!studentIdsToFetch.includes(id)) studentIdsToFetch.push(id);
            });
          } else if (currentUser.linkedStudentId && !studentIdsToFetch.includes(currentUser.linkedStudentId)) {
            studentIdsToFetch.push(currentUser.linkedStudentId);
          }

          let fetchedStudents: any[] = [];
          if (studentIdsToFetch.length > 0) {
            const qStudents = query(
              collection(db, 'students'),
              where('schoolId', '==', schoolId)
            );
            const snapStudents = await getDocs(qStudents);
            snapStudents.forEach(d => {
              const data = d.data();
              if (studentIdsToFetch.includes(d.id) || studentIdsToFetch.includes(data.studentId) || studentIdsToFetch.includes(data.uid)) {
                fetchedStudents.push({ id: d.id, ...data });
              }
            });
          }

          setLinkedStudents(fetchedStudents);
          if (fetchedStudents.length > 0) {
            setSelectedStudent(prev => {
              if (prev && fetchedStudents.some(s => s.id === prev.id || s.studentId === prev.studentId)) {
                return prev;
              }
              return fetchedStudents[0];
            });
          } else {
            setSelectedStudent(null);
          }

          setLoadingStudents(false);
          // Run diagnostic log
          logParentDiagnostics(currentUser.uid, schoolId, fetchedStudents);
        } catch (innerErr) {
          console.warn('[PARENT DASHBOARD] Error loading linked students:', innerErr);
          setLoadingStudents(false);
        }
      })().catch(err => {
        console.warn('[PARENT DASHBOARD] Uncaught async student query:', err);
        setLoadingStudents(false);
      });
    }, (err) => {
      console.warn('Parent linked students real-time error:', err);
      setLoadingStudents(false);
    });

    return () => unsubRel();
  }, [currentUser]);

  // Role Guard
  if (!currentUser || currentUser.role !== 'parent') {
    return (
      <div className="min-h-[80vh] bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-950 border border-red-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Only users with <span className="font-mono font-bold text-red-400">role = parent</span> can access this dashboard.
          </p>
          <button
            onClick={() => setActiveView('login')}
            className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#002147] font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  const isLinkedToSeniorHigh = linkedStudents.some(s => 
    s.educationCategory === 'SENIOR_HIGH' || 
    s.residentialStatus === 'Boarder' || 
    s.isBoarder || 
    !!s.houseId
  ) || currentUser?.educationCategory === 'SENIOR_HIGH';

  const sidebarMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Users },
    { id: 'lms', label: 'LMS Learning Hub', icon: BookOpen },
    { id: 'digital-library', label: 'Digital Library & AI Resources', icon: BookOpen },
    ...(isLinkedToSeniorHigh ? [
      { id: 'exeats' as ParentTabType, label: 'Boarding Exeat Permits', icon: ClipboardCheck }
    ] : []),
    { id: 'google-meet', label: 'Google Meet Classes', icon: Video },
    { id: 'google-forms', label: 'Forms & Surveys', icon: FileText },
    { id: 'ai-workspace', label: 'EDUkenZA AI Studio', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'my-children', label: 'My Children', icon: UserCheck },
    { id: 'student-profiles', label: 'Student Profiles', icon: BookOpen },
    { id: 'teachers', label: 'Class Educators', icon: UserCheck },
    { id: 'behaviour', label: 'Student Conduct', icon: ShieldAlert },
    { id: 'timetables', label: 'Timetables', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'reports', label: 'Academic Reports', icon: FileText },
    { id: 'results', label: 'Results', icon: Award },
    { id: 'assignments', label: 'Assignments', icon: Send },
    { id: 'fees', label: 'Fee Payments', icon: DollarSign },
    { id: 'daily-services', label: 'Child Wallet & Daily Services', icon: Wallet },
    { id: 'payment-receipts', label: 'Payment Receipts', icon: CreditCard },
    { id: 'school-calendar', label: 'School Calendar', icon: Clock },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FolderDown },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-[#002147] text-white p-4 flex items-center justify-between border-b border-[#00152e] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black">
            <Users className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider text-white">EDUkenZA</h1>
            <p className="text-[9px] text-[#D4AF37] font-bold">PARENT PORTAL</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell onOpenFullCenter={() => setActiveTab('notifications')} />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-white/10 text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#002147] text-white flex-shrink-0 flex flex-col justify-between p-4 shadow-2xl border-r border-[#00152e] transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
          
          {/* USER BRAND HEADER */}
          <div className="p-3.5 bg-[#00152e] rounded-2xl border border-[#D4AF37]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md shrink-0">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <div className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest">Parent Portal</div>
              <h2 className="text-xs font-black text-white truncate">{currentUser.fullName || currentUser.name}</h2>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.schoolName || 'EDUkenZA Academy'}</p>
            </div>
          </div>

          {/* ACTIVE CHILD SUMMARY BADGE */}
          {selectedStudent && (
            <div className="px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-700/60 text-[10px] space-y-0.5">
              <span className="text-amber-400 font-bold uppercase tracking-wider block">Active Student:</span>
              <p className="font-black text-white truncate">{selectedStudent.fullName || selectedStudent.name}</p>
              <p className="text-slate-400 font-mono">ID: {selectedStudent.studentId || selectedStudent.id}{selectedStudent.className ? ` • ${selectedStudent.className}` : ''}</p>
            </div>
          )}

          {/* SIDEBAR MENU LINKS */}
          <nav className="space-y-1">
            {sidebarMenuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ParentTabType);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                    isActive 
                      ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#002147]' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 border-t border-slate-700/60">
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto flex flex-col">
        {/* Real-time Dynamic School Branded Header */}
        <SchoolBrandedHeader
          portalRoleName="Guardian & Parent"
          portalRoleBadge="Parent Portal"
          userName={currentUser.fullName || currentUser.name}
          userPhotoUrl={currentUser.photoUrl || currentUser.avatarUrl}
          onOpenProfile={() => setActiveTab('settings')}
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={openWalkthrough}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                title="Replay Guided Tour"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Guided Tour</span>
              </button>
              <LivePortalClock 
                role="parent" 
                variant="compact" 
                schoolId={currentUser.schoolId} 
                studentName={selectedStudent?.fullName || selectedStudent?.name}
              />
              <NotificationBell onOpenFullCenter={() => setActiveTab('notifications')} />
            </div>
          }
        />

        {activeTab === 'notifications' && <NotificationCenter />}

        {activeTab === 'lms' && (
          <ParentLmsView
            schoolId={schoolId}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'ai-analytics' && (
          <EnterpriseAiAnalyticsCenter
            userRole="parent"
            currentUser={currentUser}
            schoolId={schoolId}
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            students={linkedStudents}
            showToast={showToast}
          />
        )}

        {activeTab === 'digital-library' && (
          <DigitalLibraryDashboard
            schoolId={schoolId}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="parent"
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            showToast={showToast}
          />
        )}

        {activeTab === 'exeats' && (
          <ParentExeatView
            schoolId={schoolId}
            selectedStudent={selectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'ai-workspace' && (
          <AiWorkspace
            currentUser={currentUser}
            userRole="parent"
            showToast={showToast}
          />
        )}

        {activeTab === 'google-meet' && (
          <ParentGoogleMeetView
            schoolId={schoolId}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'google-forms' && (
          <GoogleFormsManager
            schoolId={schoolId}
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name || 'Parent'}
            currentUserRole="parent"
            showToast={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <ParentOverview
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            setActiveTab={setActiveTab}
            showToast={showToast}
          />
        )}

        {activeTab === 'my-children' && (
          <ParentMyChildren
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'student-profiles' && (
          <ParentStudentProfiles
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'teachers' && (
          <ParentTeachers
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'behaviour' && (
          <ParentBehaviour
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'timetables' && (
          <ParentTimetables
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'attendance' && (
          <ParentAttendance
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'results' && (
          <ParentResults
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'reports' && (
          <ParentAcademicReports
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'assignments' && (
          <ParentAssignments
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />
        )}

        {activeTab === 'fees' && (
          <ParentFeePayments
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'daily-services' && (
          <EnterpriseDailyServicesModule
            schoolId={schoolId}
            userRole="parent"
            currentStudentId={selectedStudent?.studentId || selectedStudent?.id || linkedStudents[0]?.studentId || linkedStudents[0]?.id || ''}
            students={linkedStudents}
            showToast={showToast}
          />
        )}

        {activeTab === 'payment-receipts' && (
          <ParentPaymentReceipts
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'school-calendar' && (
          <ParentSchoolCalendar currentUser={currentUser} />
        )}

        {activeTab === 'announcements' && (
          <ParentAnnouncements
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
          />
        )}

        {activeTab === 'communication' && (
          <ParentCommunication
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'documents' && (
          <ParentDocuments
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            selectedStudent={selectedStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <ParentSettings
            currentUser={currentUser}
            linkedStudents={linkedStudents}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

    </div>
  );
};
