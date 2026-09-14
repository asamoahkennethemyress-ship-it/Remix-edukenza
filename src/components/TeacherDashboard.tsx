import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserCheck, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  LogOut, 
  Calendar, 
  Sparkles, 
  FileText,
  Clock,
  ShieldAlert,
  Send,
  Plus,
  User,
  LayoutDashboard,
  Award,
  Upload,
  FileCheck,
  TrendingUp,
  MessageSquare,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  RefreshCw,
  Bell,
  Mic,
  Video,
  Compass
} from 'lucide-react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Import subcomponents
import { TeacherOverview } from './teacher/TeacherOverview';
import { TeacherProfileView } from './teacher/TeacherProfileView';
import { TeacherTimetable } from './teacher/TeacherTimetable';
import { AiWorkspace } from './ai/AiWorkspace';
import { TeacherClassesSubjects } from './teacher/TeacherClassesSubjects';
import { TeacherStudentAttendance } from './teacher/TeacherStudentAttendance';
import { TeacherLessonPlans } from './teacher/TeacherLessonPlans';
import { TeacherTeachingMaterials } from './teacher/TeacherTeachingMaterials';
import { TeacherAssignments } from './teacher/TeacherAssignments';
import { TeacherAssignmentSubmissions } from './teacher/TeacherAssignmentSubmissions';
import { TeacherExaminations } from './teacher/TeacherExaminations';
import { TeacherScoreEntry } from './teacher/TeacherScoreEntry';
import { TeacherResultSubmission } from './teacher/TeacherResultSubmission';
import { TeacherStudentBehaviour } from './teacher/TeacherStudentBehaviour';
import { TeacherStudentPerformance } from './teacher/TeacherStudentPerformance';
import { TeacherCommunication } from './teacher/TeacherCommunication';
import { TeacherLeaveRequests } from './teacher/TeacherLeaveRequests';
import { TeacherReportsView } from './teacher/TeacherReportsView';
import { EnterpriseAiAnalyticsCenter } from './analytics/EnterpriseAiAnalyticsCenter';
import { TeacherVoiceDictation } from './teacher/TeacherVoiceDictation';
import { TeacherGoogleMeetManager } from './teacher/TeacherGoogleMeetManager';
import { GoogleFormsManager } from './common/GoogleFormsManager';
import { LmsMainView } from './lms/LmsMainView';
import { DigitalLibraryDashboard } from './library/DigitalLibraryDashboard';
import { NotificationBell } from './notifications/NotificationBell';
import { LivePortalClock } from './common/LivePortalClock';
import { NotificationCenter } from './notifications/NotificationCenter';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { SchoolBrandedHeader } from './common/SchoolBrandedHeader';
import { SendNotificationModal } from './notifications/SendNotificationModal';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, logout, setActiveView, showToast, openWalkthrough } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'dashboard' |
    'lms' |
    'digital-library' |
    'google-meet' |
    'google-forms' |
    'voice-dictation' |
    'notifications' |
    'profile' |
    'timetable' |
    'classes-subjects' |
    'attendance' |
    'lesson-plans' |
    'materials' |
    'assignments' |
    'assignment-submissions' |
    'examinations' |
    'score-entry' |
    'result-submission' |
    'behaviour' |
    'performance' |
    'communication' |
    'leave-requests' |
    'reports' |
    'analytics' |
    'ai-workspace'
  >('dashboard');

  const [students, setStudents] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [lessonsToday, setLessonsToday] = useState<any[]>([]);
  const [pendingScoresCount, setPendingScoresCount] = useState<number>(0);
  const [attendanceTodayMarked, setAttendanceTodayMarked] = useState<boolean>(false);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Notification Modals State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const schoolId = currentUser?.schoolId || currentUser?.id || '';

  // Fetch all teacher-scoped data from Firestore
  const fetchTeacherData = async () => {
    if (!schoolId || !currentUser?.uid) return;
    setLoadingData(true);
    try {
      const teacherUid = currentUser.uid;
      const teacherCode = currentUser.teacherId || '';

      // 1. Fetch Teacher Assignments & Profile
      // 1. Fetch Teacher Assignments
      try {
        const assignQ = query(
          collection(db, 'teacherAssignments'),
          where('schoolId', '==', schoolId)
        );
        const assignSnap = await getDocs(assignQ);

        const fetchedClasses: any[] = [];
        const fetchedSubjects: any[] = [];

        assignSnap.forEach(d => {
          const data = d.data();
          if (data.teacherId === teacherUid || (teacherCode && data.teacherId === teacherCode)) {
            if (data.classId || data.className) {
              fetchedClasses.push({
                id: data.classId || data.className,
                name: data.className || data.classId
              });
            }
            if (data.subjectId || data.subjectName) {
              fetchedSubjects.push({
                id: data.subjectId || data.subjectName,
                name: data.subjectName || data.subjectId,
                code: data.subjectId || data.subjectName
              });
            }
          }
        });

        // Merge with user profile assigned arrays if available
        if (Array.isArray(currentUser.assignedClasses)) {
          currentUser.assignedClasses.forEach((c: any) => {
            const name = typeof c === 'string' ? c : (c.name || c.className);
            const id = typeof c === 'string' ? c : (c.id || name);
            if (name) fetchedClasses.push({ id, name });
          });
        }
        if (Array.isArray(currentUser.assignedSubjects)) {
          currentUser.assignedSubjects.forEach((s: any) => {
            const name = typeof s === 'string' ? s : (s.name || s.subjectName);
            const id = typeof s === 'string' ? s : (s.id || name);
            if (name) fetchedSubjects.push({ id, name, code: id });
          });
        }

        // Deduplicate classes and subjects
        const uniqueClassesMap = new Map();
        fetchedClasses.forEach(c => uniqueClassesMap.set(c.name, c));
        const uniqueClasses = Array.from(uniqueClassesMap.values());

        const uniqueSubjectsMap = new Map();
        fetchedSubjects.forEach(s => uniqueSubjectsMap.set(s.name, s));
        const uniqueSubjects = Array.from(uniqueSubjectsMap.values());

        setAssignedClasses(uniqueClasses);
        setAssignedSubjects(uniqueSubjects);
      } catch (err) {
        console.warn('Teacher assignments fetch skipped:', err);
      }

      // 2. Fetch Students for School
      try {
        const studentsQ = query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId)
        );
        const studentsSnap = await getDocs(studentsQ);
        const studentList: any[] = [];
        studentsSnap.forEach(d => studentList.push({ id: d.id, ...d.data() }));
        setStudents(studentList);
      } catch (err) {
        console.warn('Students fetch skipped:', err);
      }

      // 3. Fetch Teacher Assignments
      try {
        const assignDocQ = query(
          collection(db, 'assignments'),
          where('schoolId', '==', schoolId)
        );
        const assignDocSnap = await getDocs(assignDocQ);
        const assignmentList: any[] = [];
        assignDocSnap.forEach(d => {
          const data = d.data();
          if (data.teacherId === teacherUid || (teacherCode && data.teacherId === teacherCode)) {
            assignmentList.push({ id: d.id, ...data });
          }
        });
        setAssignments(assignmentList);
      } catch (err) {
        console.warn('Assignments fetch skipped:', err);
      }

      // 4. Timetables are listened to in real-time below via onSnapshot

      // 5. Fetch Pending Scores (Subject Results in Draft)
      try {
        const resultsQ = query(collection(db, 'subjectResults'), where('schoolId', '==', schoolId));
        const resultsSnap = await getDocs(resultsQ);
        let draftCount = 0;
        resultsSnap.forEach(d => {
          const data = d.data();
          if ((data.teacherId === teacherUid || data.teacherId === teacherCode) && data.submissionStatus === 'Draft') {
            draftCount++;
          }
        });
        setPendingScoresCount(draftCount);
      } catch (err) {
        console.warn('Subject results fetch skipped:', err);
      }

      // 6. Check Today's Attendance
      try {
        const todayYMD = new Date().toISOString().split('T')[0];
        const attQ = query(
          collection(db, 'studentAttendance'),
          where('schoolId', '==', schoolId),
          where('date', '==', todayYMD)
        );
        const attSnap = await getDocs(attQ);
        let markedToday = false;
        attSnap.forEach(d => {
          const data = d.data();
          if (data.markedByTeacherId === teacherUid || data.markedByTeacherId === teacherCode) {
            markedToday = true;
          }
        });
        setAttendanceTodayMarked(markedToday);
      } catch (err) {
        console.warn('Attendance check skipped:', err);
      }

      // 7. Fetch Upcoming Examinations
      try {
        const examQ = query(collection(db, 'examinations'), where('schoolId', '==', schoolId));
        const examSnap = await getDocs(examQ);
        const examList: any[] = [];
        examSnap.forEach(d => examList.push({ id: d.id, ...d.data() }));
        setUpcomingExams(examList);
      } catch (err) {
        console.warn('Examinations fetch skipped:', err);
      }

      // 8. Fetch Recent Activities (Notifications)
      try {
        const notifQ = query(collection(db, 'notifications'), where('schoolId', '==', schoolId));
        const notifSnap = await getDocs(notifQ);
        const notifList: any[] = [];
        notifSnap.forEach(d => notifList.push({ id: d.id, ...d.data() }));
        notifList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setRecentActivities(notifList.slice(0, 5));
      } catch (err) {
        console.warn('Notifications fetch skipped:', err);
      }

    } catch (err) {
      console.error("Error fetching teacher dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!schoolId || !currentUser?.uid) return;
    fetchTeacherData();

    // 1. Real-time Teacher Assignments
    const unsubAssign = onSnapshot(query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId)), () => {
      fetchTeacherData();
    }, (err) => console.warn('Teacher assignments real-time listener error:', err));

    // 2. Real-time Students
    const unsubStudents = onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), (snap) => {
      const allStuds: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(allStuds);
    }, (err) => console.warn('Students real-time listener error:', err));

    // 3. Real-time Assignments
    const unsubAssignments = onSnapshot(query(collection(db, 'assignments'), where('schoolId', '==', schoolId)), (snap) => {
      const teacherUid = currentUser.uid;
      const teacherCode = currentUser.teacherId || '';
      const filteredAssignments = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((a: any) => a.teacherId === teacherUid || a.teacherId === teacherCode || a.createdBy === teacherUid);
      setAssignments(filteredAssignments);
    }, (err) => console.warn('Assignments real-time listener error:', err));

    // 4. Real-time Published Timetables for Teacher
    const unsubTimetable = onSnapshot(query(collection(db, 'timetables'), where('schoolId', '==', schoolId)), (snap) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()];

      const teacherUid = currentUser.uid;
      const teacherCode = currentUser.teacherId || currentUser.employeeId || '';
      const teacherName = String(currentUser.displayName || currentUser.fullName || currentUser.name || '').toLowerCase().trim();

      const teacherLessons: any[] = [];
      const todayLessons: any[] = [];

      snap.forEach(d => {
        const data = d.data();

        // Must be Published
        const isPublished = data.status && String(data.status).toLowerCase() === 'published';
        if (!isPublished) return;

        // Nested periods array or single entry
        if (Array.isArray(data.periods)) {
          data.periods.forEach((p: any, idx: number) => {
            const pTeacherId = String(p.teacherId || data.teacherId || '').trim();
            const pTeacherName = String(p.teacherName || p.teacher || data.teacherName || '').toLowerCase().trim();

            const isTeacherMatch = 
              (pTeacherId && (pTeacherId === teacherUid || pTeacherId === teacherCode || pTeacherId === currentUser.id)) ||
              (pTeacherName && teacherName && (pTeacherName === teacherName || teacherName.includes(pTeacherName) || pTeacherName.includes(teacherName)));

            if (isTeacherMatch) {
              const sTime = p.startTime || data.startTime || '';
              const eTime = p.endTime || data.endTime || '';
              const formattedTime = (sTime && eTime) ? `${sTime} - ${eTime}` : (p.time || '08:00 - 08:40');
              const dayName = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
              const slot = {
                id: `${d.id}-${idx}`,
                day: dayName,
                time: formattedTime,
                class: data.className || data.targetClass || p.className || 'Class',
                subject: p.subjectName || p.subject || 'Subject',
                room: p.room || p.classroom || p.venue || 'Classroom',
                teacher: p.teacherName || p.teacher || data.teacherName,
                startTime: p.startTime,
                endTime: p.endTime,
                academicYear: data.academicYear,
                term: data.term
              };
              teacherLessons.push(slot);
              if (dayName === todayDay) todayLessons.push(slot);
            }
          });
        } else {
          const docTeacherId = String(data.teacherId || '').trim();
          const docTeacherName = String(data.teacherName || data.teacher || '').toLowerCase().trim();

          const isTeacherMatch = 
            (docTeacherId && (docTeacherId === teacherUid || docTeacherId === teacherCode || docTeacherId === currentUser.id)) ||
            (docTeacherName && teacherName && (docTeacherName === teacherName || teacherName.includes(docTeacherName) || docTeacherName.includes(teacherName)));

          if (isTeacherMatch) {
            const sTime = data.startTime || '';
            const eTime = data.endTime || '';
            const formattedTime = (sTime && eTime) ? `${sTime} - ${eTime}` : (data.time || '08:00 - 08:40');
            const dayName = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
            const slot = {
              id: d.id,
              day: dayName,
              time: formattedTime,
              class: data.className || data.targetClass || 'Class',
              subject: data.subjectName || data.subject || 'Subject',
              room: data.room || data.classroom || data.venue || 'Classroom',
              teacher: data.teacherName || data.teacher,
              startTime: data.startTime,
              endTime: data.endTime,
              academicYear: data.academicYear,
              term: data.term
            };
            teacherLessons.push(slot);
            if (dayName === todayDay) todayLessons.push(slot);
          }
        }
      });

      setTimetableData(teacherLessons);
      setLessonsToday(todayLessons);
    }, (err) => console.warn('Timetables real-time listener error:', err));

    return () => {
      unsubAssign();
      unsubStudents();
      unsubAssignments();
      unsubTimetable();
    };
  }, [schoolId, currentUser?.uid]);

  // Verify Role Guard
  if (!currentUser || currentUser.role !== 'teacher' || currentUser.status !== 'active') {
    return (
      <div className="min-h-[80vh] bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-950 border border-red-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Only users with role = teacher assigned to an active school can access this portal.
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lms', label: 'LMS Learning Hub', icon: BookOpen },
    { id: 'digital-library', label: 'Digital Library & AI Resources', icon: BookOpen },
    { id: 'google-meet', label: 'Google Meet Virtual Hub', icon: Video },
    { id: 'google-forms', label: 'Google Forms Center', icon: FileText },
    { id: 'voice-dictation', label: 'Voice Notes & Dictation', icon: Mic },
    { id: 'ai-workspace', label: 'EDUkenZA AI Studio', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'timetable', label: 'My Timetable', icon: Calendar },
    { id: 'classes-subjects', label: 'My Classes & Subjects', icon: BookOpen },
    { id: 'attendance', label: 'Student Attendance', icon: UserCheck },
    { id: 'lesson-plans', label: 'Lesson Plans', icon: FileText },
    { id: 'materials', label: 'Teaching Materials', icon: Upload },
    { id: 'assignments', label: 'Assignments', icon: Send },
    { id: 'assignment-submissions', label: 'Submissions', icon: FileCheck },
    { id: 'examinations', label: 'Examinations', icon: GraduationCap },
    { id: 'score-entry', label: 'Score Entry', icon: Award },
    { id: 'result-submission', label: 'Result Submission', icon: CheckCircle },
    { id: 'behaviour', label: 'Student Behaviour', icon: ShieldAlert },
    { id: 'performance', label: 'Student Performance', icon: TrendingUp },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'leave-requests', label: 'Leave Requests', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#002147] text-white flex-shrink-0 flex flex-col justify-between p-4 shadow-2xl border-r border-[#00152e] max-h-screen overflow-y-auto">
        <div className="space-y-4">
          
          {/* TEACHER PROFILE BADGE */}
          <div className="p-3 bg-[#00152e] rounded-2xl border border-[#D4AF37]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <div className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest">Teacher Portal</div>
              <h1 className="text-xs font-black text-white truncate">{currentUser.fullName || currentUser.name}</h1>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.schoolName || 'EDUkenZA Academy'}</p>
            </div>
          </div>

          {/* MENU ITEMS */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                    isActive 
                      ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#002147]' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT */}
        <div className="pt-4 border-t border-slate-700/60 mt-4 space-y-2">
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-screen flex flex-col">
        {/* Real-time Dynamic School Branded Header */}
        <SchoolBrandedHeader
          portalRoleName="Faculty Teacher"
          portalRoleBadge="Faculty Portal"
          userName={currentUser.fullName || currentUser.name}
          userPhotoUrl={currentUser.photoUrl || currentUser.avatarUrl}
          onOpenProfile={() => setActiveTab('profile')}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('voice-dictation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  activeTab === 'voice-dictation'
                    ? 'bg-white text-slate-900 border-white shadow-sm'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="Dictate classroom notes or feedback"
              >
                <Mic className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Voice Notes</span>
              </button>
              <button
                onClick={openWalkthrough}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                title="Replay Guided Tour"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Guided Tour</span>
              </button>
              <LivePortalClock 
                role="teacher" 
                variant="compact" 
                schoolId={currentUser.schoolId} 
                schoolName={currentUser.schoolName} 
              />
              <NotificationBell
                onOpenFullCenter={() => setActiveTab('notifications')}
              />
            </div>
          }
        />
        
        {/* TAB ROUTING */}
        {activeTab === 'notifications' && <NotificationCenter />}

        {activeTab === 'lms' && (
          <LmsMainView
            schoolId={schoolId}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="teacher"
            showToast={showToast}
          />
        )}

        {activeTab === 'digital-library' && (
          <DigitalLibraryDashboard
            schoolId={schoolId}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name}
            currentUserRole="teacher"
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            showToast={showToast}
          />
        )}

        {activeTab === 'voice-dictation' && (
          <TeacherVoiceDictation
            schoolId={schoolId}
            currentUser={currentUser}
            assignedClasses={assignedClasses || []}
            assignedSubjects={assignedSubjects || []}
            students={students || []}
            showToast={showToast}
            onSendToAssignment={(dictatedText) => {
              setActiveTab('assignments');
              showToast('Dictated text sent to assignment editor', 'info');
            }}
          />
        )}

        {activeTab === 'ai-workspace' && (
          <AiWorkspace
            currentUser={currentUser}
            userRole="teacher"
            showToast={showToast}
            onInsertToAssignment={(text, imageUrl) => {
              setActiveTab('assignments');
              showToast('Inserted content into teacher assignment builder!', 'success');
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <TeacherOverview
            currentUser={currentUser}
            assignedClasses={assignedClasses || []}
            assignedSubjects={assignedSubjects || []}
            students={students || []}
            assignments={assignments || []}
            lessonsToday={lessonsToday || []}
            pendingScoresCount={pendingScoresCount || 0}
            attendanceTodayMarked={attendanceTodayMarked}
            upcomingExams={upcomingExams || []}
            recentActivities={recentActivities || []}
            setActiveTab={(t: any) => setActiveTab(t)}
          />
        )}

        {activeTab === 'profile' && (
          <TeacherProfileView
            currentUser={currentUser}
            showToast={showToast}
            assignedClasses={assignedClasses || []}
            assignedSubjects={assignedSubjects || []}
          />
        )}

        {activeTab === 'google-meet' && (
          <TeacherGoogleMeetManager
            schoolId={schoolId}
            currentUser={currentUser}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            showToast={showToast}
          />
        )}

        {activeTab === 'google-forms' && (
          <GoogleFormsManager
            schoolId={schoolId}
            currentUserId={currentUser.uid || currentUser.id}
            currentUserName={currentUser.fullName || currentUser.name || 'Teacher'}
            currentUserRole="teacher"
            showToast={showToast}
          />
        )}

        {activeTab === 'timetable' && (
          <TeacherTimetable
            timetableData={timetableData || []}
            teacherName={currentUser.fullName || currentUser.name || 'Teacher'}
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            assignedClasses={assignedClasses || []}
            schoolId={schoolId}
            teacherId={currentUser?.uid || currentUser?.id}
            showToast={showToast}
          />
        )}

        {activeTab === 'classes-subjects' && (
          <TeacherClassesSubjects
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            students={students}
          />
        )}

        {activeTab === 'attendance' && (
          <TeacherStudentAttendance
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            students={students}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'lesson-plans' && (
          <TeacherLessonPlans
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'materials' && (
          <TeacherTeachingMaterials
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'assignments' && (
          <TeacherAssignments
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            currentUser={currentUser}
            showToast={showToast}
            setActiveTab={(t: any) => setActiveTab(t)}
          />
        )}

        {activeTab === 'assignment-submissions' && (
          <TeacherAssignmentSubmissions
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'examinations' && (
          <TeacherExaminations
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            showToast={showToast}
            setActiveTab={(t: any) => setActiveTab(t)}
          />
        )}

        {activeTab === 'score-entry' && (
          <TeacherScoreEntry
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            students={students}
            currentUser={currentUser}
            showToast={showToast}
            setActiveTab={(t: any) => setActiveTab(t)}
          />
        )}

        {activeTab === 'result-submission' && (
          <TeacherResultSubmission
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'behaviour' && (
          <TeacherStudentBehaviour
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            students={students}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'performance' && (
          <TeacherStudentPerformance
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            students={students}
            showToast={showToast}
          />
        )}

        {activeTab === 'communication' && (
          <TeacherCommunication
            schoolId={schoolId}
            assignedClasses={assignedClasses}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'leave-requests' && (
          <TeacherLeaveRequests
            schoolId={schoolId}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {(activeTab === 'reports' || activeTab === 'analytics') && (
          <EnterpriseAiAnalyticsCenter
            userRole="teacher"
            currentUser={currentUser}
            schoolId={schoolId}
            schoolName={currentUser.schoolName || 'EDUkenZA Academy'}
            students={students}
            classes={assignedClasses}
            subjects={assignedSubjects}
            showToast={showToast}
          />
        )}

      </main>

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
