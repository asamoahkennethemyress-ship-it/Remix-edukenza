import React, { useState } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Image as ImageIcon, 
  Sliders, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  BarChart3, 
  Lightbulb,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FolderDown
} from 'lucide-react';

import { AiChatSection } from './AiChatSection';
import { AiChatInterface } from './AiChatInterface';
import { GeminiAiExperience, GeminiSparkleIcon } from './GeminiAiExperience';
import { AiImageGeneratorSection } from './AiImageGeneratorSection';
import { AiImageEditorSection } from './AiImageEditorSection';
import { AiDocumentAssistantSection } from './AiDocumentAssistantSection';
import { AiLessonPlannerSection } from './AiLessonPlannerSection';
import { AiQuizGeneratorSection } from './AiQuizGeneratorSection';
import { AiReportWriterSection } from './AiReportWriterSection';
import { AiStudyAssistantSection } from './AiStudyAssistantSection';
import { UserContentHub } from '../common/UserContentHub';

export interface AiWorkspaceProps {
  currentUser: any;
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  initialTab?: string;
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiWorkspace: React.FC<AiWorkspaceProps> = ({
  currentUser,
  userRole,
  initialTab = 'chat',
  onInsertToAssignment,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [editorImageUrl, setEditorImageUrl] = useState<string | undefined>(undefined);

  const handleSendToEditor = (url: string) => {
    setEditorImageUrl(url);
    setActiveTab('editor');
    showToast('Transferred diagram to AI Image Editor', 'info');
  };

  const navTabs = [
    { id: 'chat', label: 'Gemini AI Chat', icon: GeminiSparkleIcon, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'image', label: 'AI Image Generator', icon: ImageIcon, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'editor', label: 'AI Image Editor', icon: Sliders, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'document', label: 'AI Document Assistant', icon: FileText, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'lesson', label: 'AI Lesson Planner', icon: BookOpen, roles: ['platform_owner', 'school_admin', 'teacher'] },
    { id: 'quiz', label: 'AI Quiz Generator', icon: HelpCircle, roles: ['platform_owner', 'school_admin', 'teacher'] },
    { id: 'report', label: 'AI Report Writer', icon: BarChart3, roles: ['platform_owner', 'school_admin', 'teacher', 'parent'] },
    { id: 'study', label: 'AI Study Assistant', icon: Lightbulb, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'saved', label: 'My Saved AI Resources', icon: FolderDown, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
  ].filter(t => t.roles.includes(userRole));

  return (
    <div className="space-y-4">
      
      {/* TOP NAVIGATION TABS (Sleek Gemini Pill Design) */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full border border-slate-200">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive && tab.id !== 'chat' ? 'text-blue-600' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-500 font-medium">Role:</span>
          <span className="font-bold text-slate-800 uppercase">{userRole.replace('_', ' ')}</span>
        </div>
      </div>

      {/* ACTIVE TAB SECTION CONTENT */}
      <div>
        {activeTab === 'chat' && (
          <GeminiAiExperience
            currentUser={currentUser}
            userRole={userRole}
            onInsertToAssignment={onInsertToAssignment}
            onOpenSpecializedTool={(toolId) => setActiveTab(toolId)}
            showToast={showToast}
          />
        )}

        {activeTab === 'image' && (
          <AiImageGeneratorSection
            onInsertToAssignment={onInsertToAssignment}
            onSendToEditor={handleSendToEditor}
            showToast={showToast}
          />
        )}

        {activeTab === 'editor' && (
          <AiImageEditorSection
            initialImageUrl={editorImageUrl}
            onInsertToAssignment={onInsertToAssignment}
            showToast={showToast}
          />
        )}

        {activeTab === 'document' && (
          <AiDocumentAssistantSection
            showToast={showToast}
          />
        )}

        {activeTab === 'lesson' && (
          <AiLessonPlannerSection
            onInsertToAssignment={onInsertToAssignment}
            showToast={showToast}
          />
        )}

        {activeTab === 'quiz' && (
          <AiQuizGeneratorSection
            onInsertToAssignment={onInsertToAssignment}
            showToast={showToast}
          />
        )}

        {activeTab === 'report' && (
          <AiReportWriterSection
            userRole={userRole}
            showToast={showToast}
          />
        )}

        {activeTab === 'study' && (
          <AiStudyAssistantSection
            showToast={showToast}
          />
        )}

        {activeTab === 'saved' && (
          <UserContentHub
            currentUser={currentUser}
            userRole={userRole}
            schoolId={currentUser?.schoolId || ''}
            defaultTypeFilter="ai_resource"
            titleOverride="My Saved AI Resources & Educational Content"
            descriptionOverride="Manage AI-generated lesson plans, quiz sheets, revision summaries, and study guides with full ownership controls: create, edit, copy, delete, share, and download."
            showToast={showToast}
          />
        )}
      </div>

    </div>
  );
};
