import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Download, 
  MessageSquare, 
  BarChart2, 
  Sparkles, 
  WifiOff, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  CheckCircle2, 
  Layers,
  GraduationCap,
  Upload,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { LmsCourse, LmsLesson, LmsQuiz, LmsMaterial, LmsDiscussion, LmsProgress } from '../../types/lms';
import { LmsService } from '../../services/lmsService';
import { LmsCourseCard } from './LmsCourseCard';
import { LmsLessonViewer } from './LmsLessonViewer';
import { LmsQuizEngine } from './LmsQuizEngine';
import { LmsDiscussionBoard } from './LmsDiscussionBoard';
import { LmsAiAssistantModal } from './LmsAiAssistantModal';
import { LmsProgressDashboard } from './LmsProgressDashboard';
import { LmsOfflineManagerModal } from './LmsOfflineManagerModal';
import { CourseEditorModal } from './CourseEditorModal';
import { LessonEditorModal } from './LessonEditorModal';
import { QuizBuilderModal } from './QuizBuilderModal';
import { LmsCourseAssignments } from './LmsCourseAssignments';

export type LmsUserRole = 
  | 'school_admin' 
  | 'teacher' 
  | 'student' 
  | 'parent' 
  | 'school_head' 
  | 'assistant_academics' 
  | 'assistant_domestic' 
  | 'house_master' 
  | 'housekeeping' 
  | 'facilities' 
  | 'general_services' 
  | 'platform_owner';

interface LmsMainViewProps {
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: LmsUserRole;
  studentName?: string; // For parent monitoring
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsMainView: React.FC<LmsMainViewProps> = ({
  schoolId = '',
  currentUserId,
  currentUserName,
  currentUserRole,
  studentName,
  showToast
}) => {
  const isInstructorOrAdmin = 
    currentUserRole === 'school_admin' || 
    currentUserRole === 'teacher' || 
    currentUserRole === 'school_head' || 
    currentUserRole === 'assistant_academics' || 
    currentUserRole === 'platform_owner';

  const effectiveRole: 'school_admin' | 'teacher' | 'student' | 'parent' = 
    (currentUserRole === 'school_head' || currentUserRole === 'assistant_academics' || currentUserRole === 'platform_owner') 
      ? 'school_admin' 
      : (currentUserRole === 'student' ? 'student' : (currentUserRole === 'parent' ? 'parent' : (currentUserRole === 'teacher' ? 'teacher' : 'school_admin')));

  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'quizzes' | 'assignments' | 'materials' | 'discussions' | 'progress'>('courses');
  
  // Data states for selected course
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [quizzes, setQuizzes] = useState<LmsQuiz[]>([]);
  const [materials, setMaterials] = useState<LmsMaterial[]>([]);
  const [discussions, setDiscussions] = useState<LmsDiscussion[]>([]);
  const [progress, setProgress] = useState<LmsProgress | null>(null);
  const [allProgressMap, setAllProgressMap] = useState<Record<string, LmsProgress>>({});

  // Active viewing sub-states
  const [activeLesson, setActiveLesson] = useState<LmsLesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<LmsQuiz | null>(null);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<LmsCourse | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LmsLesson | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  
  // Materials Upload Modal
  const [showUploadMaterialModal, setShowUploadMaterialModal] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialCategory, setMaterialCategory] = useState<'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'ZIP' | 'Video' | 'Image' | 'Audio'>('PDF');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialUploadProgress, setMaterialUploadProgress] = useState<number | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Real-time courses listener
  useEffect(() => {
    const unsub = LmsService.subscribeToCourses(schoolId, (fetched) => {
      setCourses(fetched);
    });
    return () => unsub();
  }, [schoolId]);

  // Real-time student progress map for card completion rates
  useEffect(() => {
    const targetId = (currentUserRole === 'student' || currentUserRole === 'parent') ? currentUserId : '';
    if (targetId) {
      const unsub = LmsService.subscribeAllStudentProgress(targetId, (map) => {
        setAllProgressMap(map);
      });
      return () => unsub();
    }
  }, [currentUserId, currentUserRole]);

  // Real-time subscription to course details when selectedCourse changes
  useEffect(() => {
    if (!selectedCourse) return;

    const unsubLessons = LmsService.subscribeToLessons(selectedCourse.id, setLessons);
    const unsubQuizzes = LmsService.subscribeToQuizzes(selectedCourse.id, setQuizzes);
    const unsubMaterials = LmsService.subscribeToMaterials(selectedCourse.id, setMaterials);
    const unsubDiscussions = LmsService.subscribeToDiscussions(selectedCourse.id, setDiscussions);
    
    const targetStudentId = (currentUserRole === 'student' || currentUserRole === 'parent') ? currentUserId : '';
    const unsubProgress = targetStudentId 
      ? LmsService.subscribeToStudentProgress(targetStudentId, selectedCourse.id, setProgress) 
      : () => {};

    return () => {
      unsubLessons();
      unsubQuizzes();
      unsubMaterials();
      unsubDiscussions();
      unsubProgress();
    };
  }, [selectedCourse, currentUserId, currentUserRole]);

  const handleSelectCourse = (course: LmsCourse) => {
    setSelectedCourse(course);
    setActiveLesson(null);
    setActiveQuiz(null);
    setActiveTab('lessons');
  };

  const handleMarkLessonComplete = async (lessonId: string) => {
    if (!selectedCourse) return;
    const updated = await LmsService.updateStudentProgress(currentUserId, selectedCourse.id, schoolId, {
      completedLessonId: lessonId
    });
    setProgress(updated);
    showToast?.('Lesson marked as completed!', 'success');
  };

  const handleUploadMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !materialTitle.trim() || !materialFile) {
      showToast?.('Please provide title and choose a file.', 'error');
      return;
    }

    setIsUploadingMaterial(true);
    try {
      const uploadRes = await LmsService.uploadLmsFile(
        schoolId,
        'materials',
        materialFile,
        (pct) => setMaterialUploadProgress(pct)
      );

      await LmsService.uploadMaterial({
        courseId: selectedCourse.id,
        schoolId,
        title: materialTitle.trim(),
        description: uploadRes.fileName,
        category: materialCategory,
        fileUrl: uploadRes.downloadUrl,
        fileType: materialFile.type || materialFile.name.split('.').pop() || 'file',
        fileSize: uploadRes.fileSize,
        downloadPermitted: true,
        uploaderId: currentUserId,
        uploaderName: currentUserName
      });

      showToast?.('Learning material uploaded successfully!', 'success');
      setShowUploadMaterialModal(false);
      setMaterialTitle('');
      setMaterialFile(null);
      setMaterialUploadProgress(null);
    } catch (err) {
      console.error('Error uploading material:', err);
      showToast?.('Failed to upload material.', 'error');
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this learning material?')) return;
    try {
      await LmsService.deleteMaterial(materialId);
      showToast?.('Material removed.', 'info');
    } catch (err) {
      console.error('Error deleting material:', err);
      showToast?.('Failed to delete material.', 'error');
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || c.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const subjectsList = ['All', ...Array.from(new Set(courses.map(c => c.subject)))];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-900/30">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" /> EDUkenZA Enterprise LMS
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Learning Management Portal
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            Access courses, interactive lessons, STEM formulas, video lectures, quizzes, learning materials, and AI study tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" /> EDUkenZA AI Tutor
          </button>

          <button
            onClick={() => setShowOfflineModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all"
          >
            <WifiOff className="w-4 h-4 text-emerald-400" /> Offline Downloads
          </button>

          {isInstructorOrAdmin && (
            <button
              onClick={() => {
                setEditingCourse(null);
                setShowCourseModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      {!selectedCourse ? (
        /* Courses Grid View */
        <div className="space-y-6">
          {/* Search & Subject Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses by code, title, or subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Subject:
              </span>
              {subjectsList.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    subjectFilter === sub
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Courses List */}
          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No Courses Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isInstructorOrAdmin
                  ? 'Click "Create Course" to add your curriculum courses to the portal.'
                  : 'No enrolled courses match your current search criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <LmsCourseCard
                  key={course.id}
                  course={course}
                  progressPercent={allProgressMap[course.id]?.overallPercentage || 0}
                  userRole={effectiveRole}
                  onSelect={handleSelectCourse}
                  onEdit={(c) => {
                    setEditingCourse(c);
                    setShowCourseModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Course Detail Hub */
        <div className="space-y-6">
          {/* Course Detail Navigation Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Back to All Courses"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase">
                  {selectedCourse.courseCode}
                </span>
                <h2 className="text-base font-bold text-slate-900 line-clamp-1">
                  {selectedCourse.courseName}
                </h2>
              </div>
            </div>

            {/* Course Sub Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => { setActiveTab('lessons'); setActiveLesson(null); setActiveQuiz(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'lessons' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Lessons ({lessons.length})
              </button>

              <button
                onClick={() => { setActiveTab('quizzes'); setActiveQuiz(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'quizzes' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" /> Quizzes ({quizzes.length})
              </button>

              <button
                onClick={() => { setActiveTab('assignments'); setActiveLesson(null); setActiveQuiz(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'assignments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Assignments
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'materials' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> Materials ({materials.length})
              </button>

              <button
                onClick={() => setActiveTab('discussions')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'discussions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Forum ({discussions.length})
              </button>

              <button
                onClick={() => setActiveTab('progress')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'progress' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Analytics
              </button>
            </div>
          </div>

          {/* Active Tab Views */}
          {activeTab === 'lessons' && (
            activeLesson ? (
              <LmsLessonViewer
                lesson={activeLesson}
                courseName={selectedCourse.courseName}
                userRole={effectiveRole}
                onBack={() => setActiveLesson(null)}
                isCompleted={progress?.completedLessonIds.includes(activeLesson.id)}
                onMarkComplete={handleMarkLessonComplete}
                onEditLesson={(l) => { setEditingLesson(l); setShowLessonModal(true); }}
                showToast={showToast}
              />
            ) : (
              <div className="space-y-4">
                {isInstructorOrAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setEditingLesson(null); setShowLessonModal(true); }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Create Lesson
                    </button>
                  </div>
                )}

                {lessons.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No Lessons Published Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {isInstructorOrAdmin
                        ? 'Click "Create Lesson" to build multimedia lessons, upload video lectures, or format STEM formulas.'
                        : 'Your instructor has not published any lesson content for this course yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                            {lesson.order}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                              {lesson.title}
                            </h3>
                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{lesson.summary}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {progress?.completedLessonIds.includes(lesson.id) && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-medium">{lesson.durationMinutes} mins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'quizzes' && (
            activeQuiz ? (
              <LmsQuizEngine
                quiz={activeQuiz}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onBack={() => setActiveQuiz(null)}
                onComplete={() => {}}
              />
            ) : (
              <div className="space-y-4">
                {isInstructorOrAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowQuizModal(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Build New Quiz
                    </button>
                  </div>
                )}

                {quizzes.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No Quizzes Available</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {isInstructorOrAdmin
                        ? 'Click "Build New Quiz" to compose auto-graded assessments with timers.'
                        : 'No quizzes or tests have been scheduled for this course yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map(qz => (
                      <div key={qz.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {qz.questions.length} Questions
                          </span>
                          <span className="text-xs font-bold text-slate-500">{qz.timeLimitMinutes} Mins</span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900">{qz.title}</h3>
                          <p className="text-slate-600 text-xs mt-1 line-clamp-2">{qz.description}</p>
                        </div>

                        <button
                          onClick={() => setActiveQuiz(qz)}
                          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                        >
                          Start Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'assignments' && (
            <LmsCourseAssignments
              course={selectedCourse}
              schoolId={schoolId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserRole={effectiveRole}
              studentName={studentName}
              showToast={showToast}
            />
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              {isInstructorOrAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowUploadMaterialModal(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Upload Material
                  </button>
                </div>
              )}

              {materials.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                  <Download className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800">No Course Materials Uploaded</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {isInstructorOrAdmin
                      ? 'Upload course syllabi, lecture slides, worksheets, or reading packets.'
                      : 'No downloadable documents or media files have been attached to this course yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {materials.map(mat => (
                    <div key={mat.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {mat.category}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{mat.title}</h4>
                          <div className="text-[11px] text-slate-500">{mat.fileSize} • {mat.uploaderName}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition-colors"
                          title="Download / View Material"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {isInstructorOrAdmin && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussions' && (
            <LmsDiscussionBoard
              courseId={selectedCourse.id}
              schoolId={schoolId}
              discussions={discussions}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserRole={effectiveRole}
              onRefresh={() => {}}
              showToast={showToast}
            />
          )}

          {activeTab === 'progress' && (
            <LmsProgressDashboard
              progress={progress}
              courses={courses}
              userRole={effectiveRole}
              studentName={studentName}
              allProgressMap={allProgressMap}
            />
          )}
        </div>
      )}

      {/* Render Modals */}
      {showAiModal && (
        <LmsAiAssistantModal
          userRole={effectiveRole}
          onClose={() => setShowAiModal(false)}
          showToast={showToast}
        />
      )}

      {showOfflineModal && (
        <LmsOfflineManagerModal
          onClose={() => setShowOfflineModal(false)}
          onSelectLesson={(lesson) => {
            setActiveLesson(lesson);
            setActiveTab('lessons');
          }}
          showToast={showToast}
        />
      )}

      {showCourseModal && (
        <CourseEditorModal
          course={editingCourse}
          schoolId={schoolId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setShowCourseModal(false)}
          onSaved={() => {}}
          showToast={showToast}
        />
      )}

      {showLessonModal && selectedCourse && (
        <LessonEditorModal
          lesson={editingLesson}
          courseId={selectedCourse.id}
          schoolId={schoolId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setShowLessonModal(false)}
          onSaved={() => {}}
          showToast={showToast}
        />
      )}

      {showQuizModal && selectedCourse && (
        <QuizBuilderModal
          courseId={selectedCourse.id}
          schoolId={schoolId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setShowQuizModal(false)}
          onSaved={() => {}}
          showToast={showToast}
        />
      )}

      {/* Upload Material Modal */}
      {showUploadMaterialModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowUploadMaterialModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Learning Material</h3>
                <p className="text-xs text-slate-500">{selectedCourse.courseName}</p>
              </div>
            </div>

            <form onSubmit={handleUploadMaterialSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document / Asset Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Reference Notes & Formula Sheet"
                  value={materialTitle}
                  onChange={e => setMaterialTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={materialCategory}
                  onChange={e => setMaterialCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="PPTX">Slides / Presentation (PPTX)</option>
                  <option value="DOCX">Word Document (DOCX)</option>
                  <option value="XLSX">Spreadsheet (XLSX)</option>
                  <option value="Video">Video Resource</option>
                  <option value="ZIP">Archive Bundle (ZIP)</option>
                  <option value="Image">Graphic / Diagram (Image)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File *
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    required
                    id="material-file-upload"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setMaterialFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="material-file-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    {materialFile ? (
                      <div className="text-xs font-bold text-indigo-700">
                        {materialFile.name} ({(materialFile.size / 1024).toFixed(0)} KB)
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-indigo-600">Click to browse</span> or drop file here
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {materialUploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Uploading to Firebase Storage...</span>
                    <span>{materialUploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${materialUploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadMaterialModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMaterial}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isUploadingMaterial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
