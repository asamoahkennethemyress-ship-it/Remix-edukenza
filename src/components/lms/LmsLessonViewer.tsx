import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Download, 
  FileText, 
  Video, 
  Code, 
  Sparkles, 
  Bookmark, 
  ExternalLink,
  ArrowLeft,
  Play,
  Share2,
  Lock,
  Edit3,
  WifiOff,
  Clock
} from 'lucide-react';
import { LmsLesson, LessonAttachment } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LmsLessonViewerProps {
  lesson: LmsLesson;
  courseName: string;
  userRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  onBack: () => void;
  onMarkComplete?: (lessonId: string) => void;
  isCompleted?: boolean;
  onEditLesson?: (lesson: LmsLesson) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsLessonViewer: React.FC<LmsLessonViewerProps> = ({
  lesson,
  courseName,
  userRole,
  onBack,
  onMarkComplete,
  isCompleted = false,
  onEditLesson,
  showToast
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'video' | 'attachments' | 'stem'>('content');

  const handleOfflineSave = () => {
    const success = LmsService.saveLessonOffline(lesson, courseName);
    if (success) {
      setIsOfflineSaved(true);
      showToast?.('Lesson saved for offline access!', 'success');
    } else {
      showToast?.('Failed to save offline.', 'error');
    }
  };

  const renderVideoPlayer = () => {
    if (!lesson.videoUrl) return null;

    if (lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) {
      let embedId = '';
      if (lesson.videoUrl.includes('v=')) {
        embedId = lesson.videoUrl.split('v=')[1]?.split('&')[0] || '';
      } else if (lesson.videoUrl.includes('youtu.be/')) {
        embedId = lesson.videoUrl.split('youtu.be/')[1] || '';
      }
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md">
          <iframe
            src={`https://www.youtube.com/embed/${embedId}?autoplay=0&rel=0`}
            title={lesson.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-md flex items-center justify-center p-4">
        <video 
          controls 
          className="w-full h-full object-contain rounded-xl"
          poster={lesson.coverImage}
        >
          <source src={lesson.videoUrl} type="video/mp4" />
          Your browser does not support HTML5 video player.
        </video>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lessons
        </button>

        <div className="flex items-center gap-2">
          {userRole === 'student' && (
            <>
              <button
                onClick={handleOfflineSave}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  isOfflineSaved 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                {isOfflineSaved ? 'Downloaded' : 'Save Offline'}
              </button>

              {onMarkComplete && (
                <button
                  onClick={() => onMarkComplete(lesson.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCompleted 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isCompleted ? 'Completed' : 'Mark as Completed'}
                </button>
              )}
            </>
          )}

          {(userRole === 'teacher' || userRole === 'school_admin') && onEditLesson && (
            <button
              onClick={() => onEditLesson(lesson)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Lesson
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>{courseName}</span> • <span>Lesson {lesson.order}</span>
            {lesson.status === 'draft' && (
              <span className="bg-amber-500/80 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                DRAFT
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-3">
            {lesson.title}
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
            {lesson.summary}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-indigo-400" /> {lesson.durationMinutes} mins
            </span>
            <span>•</span>
            <span>By {lesson.authorName}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'content'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Lesson Notes
        </button>

        {lesson.videoUrl && (
          <button
            onClick={() => setActiveTab('video')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'video'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Video className="w-4 h-4" /> Video Lecture
          </button>
        )}

        {((lesson.mathExpressions && lesson.mathExpressions.length > 0) || 
          (lesson.chemicalFormulas && lesson.chemicalFormulas.length > 0) ||
          (lesson.codeSnippets && lesson.codeSnippets.length > 0)) && (
          <button
            onClick={() => setActiveTab('stem')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'stem'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" /> Math, Science & Code
          </button>
        )}

        {lesson.attachments && lesson.attachments.length > 0 && (
          <button
            onClick={() => setActiveTab('attachments')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'attachments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" /> Downloads ({lesson.attachments.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm min-h-[400px]">
        {activeTab === 'content' && (
          <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-4">
            {lesson.content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={index} className="text-xl font-bold text-slate-900 border-b pb-2 pt-4">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={index} className="text-lg font-bold text-slate-900 pt-2">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('$$') && paragraph.endsWith('$$')) {
                return (
                  <div key={index} className="my-4 p-4 bg-slate-50 rounded-2xl border border-indigo-100 font-mono text-center text-indigo-900 text-lg shadow-inner">
                    {paragraph.replace(/\$\$/g, '')}
                  </div>
                );
              }
              return <p key={index}>{paragraph}</p>;
            })}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-600" /> Interactive Video Lecture
            </h3>
            {renderVideoPlayer()}
          </div>
        )}

        {activeTab === 'stem' && (
          <div className="space-y-6">
            {lesson.mathExpressions && lesson.mathExpressions.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Mathematical Formulas & Equations (LaTeX)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lesson.mathExpressions.map((expr, idx) => (
                    <div key={idx} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 font-mono text-indigo-950 font-bold text-center">
                      $${expr}$$
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lesson.chemicalFormulas && lesson.chemicalFormulas.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Chemical Reactions & Formulas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lesson.chemicalFormulas.map((chem, idx) => (
                    <div key={idx} className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 font-mono text-emerald-950 font-bold text-center">
                      {chem}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lesson.codeSnippets && lesson.codeSnippets.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Code Snippets & Algorithms
                </h4>
                <div className="space-y-4">
                  {lesson.codeSnippets.map((snippet, idx) => (
                    <div key={idx} className="rounded-2xl bg-slate-950 text-slate-100 overflow-hidden shadow-lg border border-slate-800">
                      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-indigo-300 flex items-center justify-between">
                        <span>{snippet.title || snippet.language.toUpperCase()}</span>
                        <span className="uppercase text-[10px] bg-indigo-950 px-2 py-0.5 rounded text-indigo-400">
                          {snippet.language}
                        </span>
                      </div>
                      <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed">
                        <code>{snippet.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Downloadable Learning Materials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lesson.attachments?.map(att => (
                <div key={att.id} className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                      {att.type}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{att.name}</div>
                      <div className="text-[11px] text-slate-500">{att.size}</div>
                    </div>
                  </div>

                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
