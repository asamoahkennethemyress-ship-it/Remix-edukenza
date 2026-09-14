import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  Trash2, 
  BookOpen, 
  RefreshCw, 
  X, 
  CheckCircle,
  Download
} from 'lucide-react';
import { LmsOfflineCachedLesson } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LmsOfflineManagerModalProps {
  onClose: () => void;
  onSelectLesson: (lesson: any) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsOfflineManagerModal: React.FC<LmsOfflineManagerModalProps> = ({
  onClose,
  onSelectLesson,
  showToast
}) => {
  const [cachedLessons, setCachedLessons] = useState<LmsOfflineCachedLesson[]>([]);

  useEffect(() => {
    setCachedLessons(LmsService.getOfflineCachedLessons());
  }, []);

  const handleRemove = (lessonId: string) => {
    LmsService.removeOfflineLesson(lessonId);
    setCachedLessons(LmsService.getOfflineCachedLessons());
    showToast?.('Removed from offline storage.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Offline LMS Storage & Sync</h3>
            <p className="text-xs text-slate-500">
              Downloaded lessons can be read anywhere without internet connection.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {cachedLessons.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Download className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-600">No lessons downloaded yet</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Click "Save Offline" while viewing any lesson to store it locally.
              </div>
            </div>
          ) : (
            cachedLessons.map(item => (
              <div 
                key={item.lesson.id} 
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-[11px] font-bold text-indigo-600 uppercase">{item.courseName}</div>
                  <div className="text-xs font-bold text-slate-900">{item.lesson.title}</div>
                  <div className="text-[10px] text-slate-400">
                    Downloaded: {new Date(item.cachedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectLesson(item.lesson);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Read
                  </button>
                  <button
                    onClick={() => handleRemove(item.lesson.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
