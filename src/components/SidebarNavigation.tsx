import React from 'react';
import { useSchoolBranding } from '../context/SchoolBrandingContext';
import { 
  LayoutDashboard, 
  Building2, 
  GraduationCap, 
  Users, 
  School, 
  BookOpen, 
  UserCheck, 
  HeartHandshake, 
  Link2, 
  UserCog, 
  Settings, 
  X,
  ChevronRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  FileText,
  BarChart3,
  CheckSquare,
  Sliders,
  Award,
  Megaphone,
  ClipboardCheck,
  CalendarOff,
  Bell,
  FileSpreadsheet,
  DollarSign,
  Sparkles,
  Video,
  Fingerprint,
  Wallet
} from 'lucide-react';

export type AdminTab = 
  | 'overview' 
  | 'lms'
  | 'digital-library'
  | 'google-meet'
  | 'google-forms'
  | 'ai-workspace'
  | 'profile' 
  | 'notifications'
  | 'students' 
  | 'teachers' 
  | 'classes' 
  | 'subjects' 
  | 'assignments' 
  | 'timetable'
  | 'attendance'
  | 'biometric'
  | 'leave-management'
  | 'payments'
  | 'daily-services'
  | 'subscription-billing'
  | 'academic-reports'
  | 'examinations'
  | 'communication'
  | 'reports-analytics'
  | 'result-approval'
  | 'control-center'
  | 'import-export'
  | 'backup-recovery'
  | 'security-hardening'
  | 'parents' 
  | 'linking' 
  | 'users' 
  | 'settings';

export interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
}

export interface SidebarNavigationProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  schoolName?: string;
  schoolLogo?: string;
  counts?: {
    students?: number;
    teachers?: number;
    parents?: number;
    classes?: number;
    subjects?: number;
  };
}

export const NAV_ITEMS: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'School statistics & activities' 
  },
  { 
    id: 'classes', 
    label: 'Class Management', 
    icon: School,
    description: 'Class levels, grades & class teachers' 
  },
  { 
    id: 'students', 
    label: 'Student Management', 
    icon: GraduationCap,
    description: 'Register, edit & view student profiles' 
  },
  { 
    id: 'teachers', 
    label: 'Teacher Management', 
    icon: Users,
    description: 'Authorize teachers & subject assignments' 
  },
  { 
    id: 'parents', 
    label: 'Parent Management', 
    icon: HeartHandshake,
    description: 'Authorize parents & family contacts' 
  },
  { 
    id: 'subjects', 
    label: 'Subject Management', 
    icon: BookOpen,
    description: 'Academic subjects & codes' 
  },
  { 
    id: 'assignments', 
    label: 'Teacher Assignment', 
    icon: UserCheck,
    description: 'Assign Teacher → Class → Subject' 
  },
  { 
    id: 'linking', 
    label: 'Parent-Student Linking', 
    icon: Link2,
    description: 'Link parents to students' 
  },
  {
    id: 'lms',
    label: 'LMS Learning Hub',
    icon: BookOpen,
    description: 'Courses, lessons, quizzes & school analytics'
  },
  {
    id: 'digital-library',
    label: 'Digital Library & AI Resource Center',
    icon: BookOpen,
    description: 'Books, past papers, media & AI study center'
  },
  {
    id: 'google-meet',
    label: 'Google Meet Classes',
    icon: Video,
    description: 'Monitor live online classes & approvals'
  },
  {
    id: 'google-forms',
    label: 'Google Forms Center',
    icon: FileText,
    description: 'Quizzes, surveys, admissions & feedback forms'
  },
  {
    id: 'ai-workspace',
    label: 'EDUkenZA AI Studio',
    icon: Sparkles,
    description: 'Multimodal AI Chat, Images & Lesson Planner'
  },
  { 
    id: 'profile', 
    label: 'School Profile', 
    icon: Building2,
    description: 'Name, logo, contact & address' 
  },
  { 
    id: 'notifications', 
    label: 'Notification Center', 
    icon: Bell,
    description: 'Global alerts, history & broadcasts' 
  },
  { 
    id: 'timetable', 
    label: 'Timetable Management', 
    icon: Calendar,
    description: 'Weekly schedules & conflict check' 
  },
  { 
    id: 'attendance', 
    label: 'Attendance', 
    icon: ClipboardCheck,
    description: 'Student & teacher daily attendance & lock' 
  },
  {
    id: 'biometric',
    label: 'Biometric Gate & Terminal',
    icon: Fingerprint,
    description: 'Facial AI, fingerprint scanner & WebAuthn passkeys',
    badge: 'NEW'
  },
  { 
    id: 'leave-management', 
    label: 'Leave Management', 
    icon: CalendarOff,
    description: 'Staff leave applications & approvals' 
  },
  { 
    id: 'payments', 
    label: 'Payments & Receipts', 
    icon: CreditCard,
    description: 'Fees, payments & printable receipts' 
  },
  { 
    id: 'daily-services', 
    label: 'Daily Services & Campus Wallet', 
    icon: Wallet,
    description: 'Canteen, bus tracking, student wallet, store & services',
    badge: 'LIVE'
  },
  { 
    id: 'subscription-billing', 
    label: 'Subscription & Billing', 
    icon: DollarSign,
    description: 'School SaaS plan, renewal & tax invoices' 
  },
  { 
    id: 'academic-reports', 
    label: 'Academic Reports', 
    icon: FileText,
    description: 'Report cards, grading & rankings' 
  },
  { 
    id: 'examinations', 
    label: 'Examinations', 
    icon: Award,
    description: 'Exams, score entry, review & analytics' 
  },
  { 
    id: 'communication', 
    label: 'Communication Center', 
    icon: Megaphone,
    description: 'Announcements, notifications, events & docs' 
  },
  { 
    id: 'reports-analytics', 
    label: 'Reports & Analytics', 
    icon: BarChart3,
    description: 'Real-time school stats & charts' 
  },
  { 
    id: 'result-approval', 
    label: 'Result Approval', 
    icon: CheckSquare,
    description: 'Review, validate & publish results' 
  },
  { 
    id: 'control-center', 
    label: 'School Control Center', 
    icon: Sliders,
    description: 'School config, branding & audit logs' 
  },
  {
    id: 'import-export',
    label: 'Import & Export',
    icon: FileSpreadsheet,
    description: 'Excel/CSV bulk import & custom report exports'
  },
  {
    id: 'backup-recovery',
    label: 'Backup & Recovery',
    icon: ShieldCheck,
    description: 'School data backups, recovery & disaster protection'
  },
  {
    id: 'security-hardening',
    label: 'Security & Hardening',
    icon: ShieldCheck,
    description: 'Security audit, RBAC compliance & threat logs'
  },
  { 
    id: 'users', 
    label: 'User Management', 
    icon: UserCog,
    description: 'Create user credentials' 
  },
  { 
    id: 'settings', 
    label: 'School Settings & Branding', 
    icon: Settings,
    description: 'Logo, colors, motto & profile' 
  },
];

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  setIsMobileOpen,
  schoolName = "EDUkenZA Partner School",
  schoolLogo = '',
  counts
}) => {
  const brandingContext = useSchoolBranding();
  const effectiveSchoolName = brandingContext?.schoolName || schoolName || 'EDUkenZA Partner School';
  const effectiveSchoolLogo = brandingContext?.logoUrl || schoolLogo || '';
  const effectiveMotto = brandingContext?.motto || '';
  const effectivePrimary = brandingContext?.primaryColor || '#002147';
  const effectiveSecondary = brandingContext?.secondaryColor || '#D4AF37';

  const handleSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const getBadgeCount = (id: AdminTab) => {
    if (!counts) return null;
    switch (id) {
      case 'students':
        return counts.students !== undefined ? counts.students : null;
      case 'teachers':
        return counts.teachers !== undefined ? counts.teachers : null;
      case 'parents':
        return counts.parents !== undefined ? counts.parents : null;
      case 'classes':
        return counts.classes !== undefined ? counts.classes : null;
      case 'subjects':
        return counts.subjects !== undefined ? counts.subjects : null;
      default:
        return null;
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-[#001529] text-slate-100 border-r border-slate-800 select-none">
      {/* Sidebar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#001c38]">
        <div className="flex items-center gap-3 overflow-hidden">
          {effectiveSchoolLogo ? (
            <img 
              src={effectiveSchoolLogo} 
              alt={effectiveSchoolName} 
              className="w-10 h-10 rounded-xl object-cover border border-[#D4AF37]/40 shadow-sm shrink-0" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-bold"
              style={{
                backgroundColor: effectivePrimary,
                borderColor: `${effectiveSecondary}80`,
                color: effectiveSecondary
              }}
            >
              <School className="w-5 h-5" />
            </div>
          )}
          <div className="truncate min-w-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-white truncate leading-snug">
              {effectiveSchoolName}
            </h2>
            {effectiveMotto ? (
              <p className="text-[9px] italic text-slate-400 truncate mt-0.5">
                {effectiveMotto}
              </p>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-amber-400 font-semibold tracking-wide">
                <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                <span>School Admin Portal</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile close button */}
        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Main Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = getBadgeCount(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-[#002147] to-[#003366] text-white border border-[#D4AF37]/60 shadow-md shadow-blue-950/40' 
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#D4AF37] text-[#002147] font-bold' 
                      : 'bg-slate-800/80 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="truncate">
                  <div className={`font-bold ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-slate-400 font-normal truncate max-w-[170px]">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {count !== null && (
                  <span 
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive 
                        ? 'bg-[#D4AF37] text-[#002147]' 
                        : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
                <ChevronRight 
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-[#D4AF37] translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`} 
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info / Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-[#001122] text-[10px] text-slate-400 flex items-center justify-between">
        <span className="font-medium text-slate-400">EDUkenZA v2.5</span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
          School Admin
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 h-screen sticky top-0 shrink-0 shadow-xl z-20">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
