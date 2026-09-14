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
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'image', label: 'AI Image Generator', icon: ImageIcon, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'editor', label: 'AI Image Editor', icon: Sliders, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'document', label: 'AI Document Assistant', icon: FileText, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'lesson', label: 'AI Lesson Planner', icon: BookOpen, roles: ['platform_owner', 'school_admin', 'teacher'] },
    { id: 'quiz', label: 'AI Quiz Generator', icon: HelpCircle, roles: ['platform_owner', 'school_admin', 'teacher'] },
    { id: 'report', label: 'AI Report Writer', icon: BarChart3, roles: ['platform_owner', 'school_admin', 'teacher', 'parent'] },
    { id: 'study', label: 'AI Study Assistant', icon: Lightbulb, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
    { id: 'saved', label: 'My Saved AI Resources & Content', icon: FolderDown, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
  ].filter(t => t.roles.includes(userRole));

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-[#001529] text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#002147] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-inner shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">EDUkenZA AI Studio</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-amber-300 text-[10px] font-extrabold border border-[#D4AF37]/40 uppercase tracking-wider">
                Multimodal AI Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Educational AI workspace for streaming text, KaTeX math reasoning, textbook image generation & document synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-semibold">Active Role:</span>
          <span className="font-extrabold text-amber-400 uppercase">{userRole.replace('_', ' ')}</span>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#002147] text-white border border-[#D4AF37] shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB SECTION CONTENT */}
      <div>
        {activeTab === 'chat' && (
          userRole === 'school_admin' || userRole === 'platform_owner' ? (
            <AiChatInterface
              currentUser={currentUser}
              userRole={userRole}
              showToast={showToast}
            />
          ) : (
            <AiChatSection
              currentUser={currentUser}
              userRole={userRole}
              onInsertToAssignment={onInsertToAssignment}
              showToast={showToast}
            />
          )
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
