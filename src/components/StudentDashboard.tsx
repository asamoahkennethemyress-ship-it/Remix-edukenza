import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LayoutDashboard, 
  User, 
  Calendar, 
  BookOpen, 
  Send, 
  FileCheck, 
  Award, 
  FileText, 
  UserCheck, 
  Receipt, 
  Download, 
  Megaphone, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  Menu, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Bell,
  Video,
  Compass
} from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Import Student Sub-components
import { StudentOverview } from './student/StudentOverview';
import { StudentProfileView } from './student/StudentProfileView';
import { StudentAssignments } from './student/StudentAssignments';
import { StudentSubmissions } from './student/StudentSubmissions';
import { StudentExaminations } from './student/StudentExaminations';
import { StudentResults } from './student/StudentResults';
import { StudentAcademicReports } from './student/StudentAcademicReports';
import { StudentAttendanceView } from './student/StudentAttendanceView';
import { StudentPaymentReceipts } from './student/StudentPaymentReceipts';
import { StudentLearningMaterials } from './student/StudentLearningMaterials';
import { StudentAnnouncements } from './student/StudentAnnouncements';
import { StudentMessages } from './student/StudentMessages';
import { StudentSchoolCalendar } from './student/StudentSchoolCalendar';
import { StudentDownloads } from './student/StudentDownloads';
import { StudentSettings } from './student/StudentSettings';
import { StudentTimetable } from './student/StudentTimetable';
import { StudentSubjects } from './student/StudentSubjects';
import { StudentGoogleMeet } from './student/StudentGoogleMeet';
import { RealTimeHeaderWidget } from './student/RealTimeClockSubject';
import { NotificationBell } from './notifications/NotificationBell';
import { LivePortalClock } from './common/LivePortalClock';
import { NotificationCenter } from './notifications/NotificationCenter';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { SchoolBrandedHeader } from './common/SchoolBrandedHeader';
import { useAssignmentNotificationListener } from '../hooks/useAssignmentNotificationListener';
import { AiWorkspace } from './ai/AiWorkspace';
import { LmsMainView } from './lms/LmsMainView';
import { DigitalLibraryDashboard } from './library/DigitalLibraryDashboard';
import { EnterpriseAiAnalyticsCenter } from './analytics/EnterpriseAiAnalyticsCenter';
import { GoogleFormsManager } from './common/GoogleFormsManager';
import { StudentExeatView } from './student/StudentExeatView';
import { EnterpriseDailyServicesModule } from './dailyServices/EnterpriseDailyServicesModule';
import { Sparkles, ClipboardCheck, Wallet } from 'lucide-react';

export type StudentTab = 
  | 'dashboard' 
  | 'ai-analytics'
  | 'lms'
  | 'digital-library'
  | 'exeats'
  | 'google-meet'
  | 'google-forms'
  | 'ai-workspace'
  | 'notifications'
  | 'profile' 
  | 'timetable' 
  | 'subjects' 
  | 'assignments' 
  | 'submissions' 
  | 'examinations' 
  | 'results' 
  | 'reports' 
  | 'attendance' 
  | 'payments' 
  | 'daily-services'
  | 'materials' 
  | 'announcements' 
  | 'messages' 
  | 'calendar' 
  | 'downloads' 
  | 'settings';

export const StudentDashboard: React.FC = () => {
  const { currentUser, logout, setActiveView, openWalkthrough } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentRecord, setStudentRecord] = useState<any | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 2000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };


  // Fetch & Subscribe to student profile record from Firestore in real-time
  useEffect(() => {
    if (!currentUser || !currentUser.schoolId) return;
    const schoolId = currentUser.schoolId;

    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      let matchedRecord: any = null;
      snap.forEach(d => {
        const data = d.data();
        const matchesUid = data.uid === currentUser.uid || data.studentUid === currentUser.uid;
        const matchesEmail = currentUser.email && data.email && data.email.toLowerCase() === currentUser.email.toLowerCase();
        const matchesId = currentUser.studentId && (data.studentId === currentUser.studentId || data.admissionNumber === currentUser.studentId);
        
        if (matchesUid || matchesEmail || matchesId) {
          matchedRecord = { id: d.id, ...data };
        }
      });

      if (matchedRecord) {
        setStudentRecord(matchedRecord);
      } else {
        // Build authorized student record from authenticated user profile
        setStudentRecord({
          studentId: currentUser.studentId || currentUser.admissionNumber || '',
          fullName: currentUser.fullName || currentUser.displayName || currentUser.name || 'Student',
          email: currentUser.email || '',
          className: currentUser.className || '',
          status: currentUser.status || 'active',
          outstandingFees: 0
        });
      }
    }, (err) => console.warn('Student profile real-time error:', err));

    return () => unsub();
  }, [currentUser]);

  // Verify Role Guard
  if (!currentUser || currentUser.role !== 'student' || currentUser.status !== 'active') {
    return (
      <div className="min-h-[80vh] bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-950 border border-red-500/40 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Restricted</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Only active Student accounts belong to this portal. Please log in with valid student credentials.
          </p>
          <button
            onClick={() => setActiveView('login')}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#002147] font-black text-xs uppercase tracking-wider transition hover:bg-amber-400 cursor-pointer"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  const isSeniorHighOrBoarder = 
    currentUser?.educationCategory === 'SENIOR_HIGH' || 
    studentRecord?.educationCategory === 'SENIOR_HIGH' || 
    studentRecord?.residentialStatus === 'Boarder' || 
    studentRecord?.isBoarder || 
    !!studentRecord?.houseId;

  const sidebarItems: Array<{ id: StudentTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lms', label: 'LMS Learning Hub', icon: BookOpen },
    { id: 'digital-library', label: 'Digital Library & AI Resources', icon: BookOpen },
    ...(isSeniorHighOrBoarder ? [
      { id: 'exeats' as StudentTab, label: 'Boarding Exeat Permits', icon: ClipboardCheck }
    ] : []),
    { id: 'google-meet', label: 'Google Meet Virtual Classroom', icon: Video },
    { id: 'google-forms', label: 'Forms & CBT Center', icon: FileText },
    { id: 'ai-workspace', label: 'EDUkenZA AI Studio', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'timetable', label: 'Class Timetable', icon: Calendar },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: Send },
    { id: 'submissions', label: 'Submissions', icon: FileCheck },
    { id: 'examinations', label: 'Examinations', icon: GraduationCap },
    { id: 'results', label: 'Results', icon: Award },
    { id: 'reports', label: 'Academic Reports', icon: FileText },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'payments', label: 'Payment Receipts', icon: Receipt },
    { id: 'daily-services', label: 'My Wallet & Daily Services', icon: Wallet },
    { id: 'materials', label: 'Learning Materials', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const className = studentRecord?.className || currentUser?.className || '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row font-sans">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 border ${
            toast.type === 'success' ? 'bg-emerald-800 border-emerald-600' :
            toast.type === 'error' ? 'bg-red-800 border-red-600' :
            'bg-[#002147] border-[#D4AF37]'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-amber-300" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* MOBILE NAVBAR TOP HEADER */}
      <div className="md:hidden bg-[#002147] text-white p-4 flex justify-between items-center border-b border-[#00152e] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest block">Student Portal</span>
            <h1 className="text-xs font-black truncate">{currentUser.fullName || currentUser.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RealTimeHeaderWidget 
            schoolId={currentUser.schoolId} 
            className={className} 
            onOpenTimetable={() => setActiveTab('timetable')} 
          />
          <NotificationBell onOpenFullCenter={() => setActiveTab('notifications')} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white bg-white/10 rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#002147] text-white flex-shrink-0 flex flex-col justify-between p-4 shadow-2xl border-r border-[#00152e] transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="space-y-4 overflow-y-auto pr-1">
          
          {/* BRAND CARD */}
          <div className="p-3 bg-[#00152e] rounded-2xl border border-[#D4AF37]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md shrink-0">
              <GraduationCap className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <div className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest">Student Portal</div>
              <h1 className="text-xs font-black text-white truncate">{currentUser.fullName || currentUser.name}</h1>
              <p className="text-[10px] text-slate-400 font-mono">ID: {studentIdNumber}</p>
            </div>
          </div>

          <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-700/50 text-[11px] space-y-0.5">
            <p className="font-bold text-slate-100 truncate">{currentUser.schoolName || 'EDUkenZA Academy'}</p>
            <p className="text-[10px] text-slate-400 font-bold">Class: <span className="text-[#D4AF37]">{className}</span></p>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                    isActive 
                      ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 border-t border-slate-700/60 mt-2">
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto flex flex-col">
        {/* Real-time Dynamic School Branded Header */}
        <SchoolBrandedHeader
          portalRoleName="Student"
          portalRoleBadge="Student Scholar"
          userName={currentUser.fullName || currentUser.name}
          userPhotoUrl={currentUser.photoUrl || currentUser.avatarUrl}
          onOpenProfile={() => setActiveTab('profile')}
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
                role="student" 
                variant="compact" 
                schoolId={currentUser.schoolId} 
                studentName={currentUser.fullName || currentUser.name}
              />
              <RealTimeHeaderWidget 
                schoolId={currentUser.schoolId} 
                className={className} 
                onOpenTimetable={() => setActiveTab('timetable')} 
              />
              <NotificationBell onOpenFullCenter={() => setActiveTab('notifications')} />
            </div>
          }
        />

        {activeTab === 'notifications' && <NotificationCenter />}

        {activeTab === 'lms' && (
          <LmsMainView
            schoolId={currentUser.schoolId || ''}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="student"
            showToast={showToast}
          />
        )}

        {activeTab === 'digital-library' && (
          <DigitalLibraryDashboard
            schoolId={currentUser.schoolId || ''}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="student"
            currentUserGrade={className}
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            showToast={showToast}
          />
        )}

        {activeTab === 'exeats' && (
          <StudentExeatView
            currentUser={currentUser}
            studentRecord={studentRecord}
            showToast={showToast}
          />
        )}

        {activeTab === 'ai-workspace' && (
          <AiWorkspace
            currentUser={currentUser}
            userRole="student"
            showToast={showToast}
          />
        )}

        {activeTab === 'ai-analytics' && (
          <EnterpriseAiAnalyticsCenter
            userRole="student"
            currentUser={currentUser}
            schoolId={currentUser.schoolId || ''}
            schoolName={currentUser.schoolName || ''}
            showToast={showToast}
          />
        )}

        {activeTab === 'google-meet' && (
          <StudentGoogleMeet
            schoolId={currentUser.schoolId || ''}
            className={className}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            showToast={showToast}
          />
        )}

        {activeTab === 'google-forms' && (
          <GoogleFormsManager
            schoolId={currentUser.schoolId || ''}
            schoolName={currentUser.schoolName || ''}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name || 'Student'}
            currentUserRole="student"
            showToast={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentOverview 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'timetable' && (
          <StudentTimetable 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
          />
        )}

        {activeTab === 'subjects' && (
          <StudentSubjects 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'profile' && (
          <StudentProfileView 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'assignments' && (
          <StudentAssignments 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'submissions' && (
          <StudentSubmissions 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'examinations' && (
          <StudentExaminations 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
          />
        )}

        {activeTab === 'results' && (
          <StudentResults 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'reports' && (
          <StudentAcademicReports 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'attendance' && (
          <StudentAttendanceView 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'payments' && (
          <StudentPaymentReceipts 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'daily-services' && (
          <EnterpriseDailyServicesModule
            schoolId={currentUser.schoolId || studentRecord?.schoolId || ''}
            userRole="student"
            currentStudentId={studentRecord?.studentId || currentUser?.studentId || currentUser?.uid || ''}
            students={studentRecord ? [studentRecord] : []}
            showToast={showToast}
          />
        )}

        {activeTab === 'materials' && (
          <StudentLearningMaterials 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'announcements' && (
          <StudentAnnouncements 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'messages' && (
          <StudentMessages 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'calendar' && (
          <StudentSchoolCalendar 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
          />
        )}

        {activeTab === 'downloads' && (
          <StudentDownloads 
            currentUser={currentUser} 
            studentRecord={studentRecord} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'settings' && (
          <StudentSettings 
            currentUser={currentUser} 
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
