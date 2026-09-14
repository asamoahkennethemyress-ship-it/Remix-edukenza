import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  School,
  Users,
  GraduationCap,
  CreditCard,
  FileSpreadsheet,
  Video,
  Calendar,
  CheckSquare,
  Award,
  FileText,
  BookOpen,
  LayoutDashboard,
  UploadCloud,
  Laptop,
  BookOpenCheck,
  TrendingUp,
  Receipt,
  ShieldCheck,
  FileCheck,
  MessageSquare,
  Globe,
  Building2,
  ShieldAlert,
  Lightbulb,
  Compass,
  Check,
  RotateCcw
} from 'lucide-react';

interface WalkthroughStep {
  id: string;
  badge: string;
  title: string;
  icon: React.ElementType;
  description: string;
  highlights: string[];
  tip: string;
  accentColor: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    gradient: string;
  };
}

const ROLE_WALKTHROUGHS: Partial<Record<UserRole, { roleName: string; rolePill: string; steps: WalkthroughStep[] }>> = {
  school_admin: {
    roleName: 'School Administrator',
    rolePill: 'bg-[#002147] text-[#D4AF37] border-amber-500/30',
    steps: [
      {
        id: 'admin_setup',
        badge: '1. School Administration',
        title: 'School Profile & Staff Allocations',
        icon: School,
        description:
          'Set up your institutional details, manage academic terms, invite teachers, allocate class teachers, and assign subjects effortlessly.',
        highlights: [
          'Manage Staff Directory & Credentials',
          'Assign Class Teachers & Arms',
          'Subject Allocation & Period Load',
          'School Custom Branding & Seal'
        ],
        tip: 'Pro-Tip: You can bulk-import staff records via Excel/CSV files directly in the Import/Export Center.',
        accentColor: {
          bg: 'bg-navy-900',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/30',
          gradient: 'from-[#002147] to-slate-900'
        }
      },
      {
        id: 'admin_students',
        badge: '2. Enrolment & Classes',
        title: 'Student Registry & Admissions',
        icon: GraduationCap,
        description:
          'Streamline admissions, configure grade levels (Grade R - 12), generate Student ID credentials, and manage parent linkages.',
        highlights: [
          'Student Admission & Profile Records',
          'Class Streams & Section Allocations',
          'Parent-Child Account Associations',
          'Passcode-Free Student ID Logins'
        ],
        tip: 'Student IDs (e.g., STU1001) allow students to log in quickly without needing an email address.',
        accentColor: {
          bg: 'bg-emerald-950',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-950 to-slate-900'
        }
      },
      {
        id: 'admin_finance',
        badge: '3. Billing & Fees',
        title: 'Financial Management & Fee Collection',
        icon: CreditCard,
        description:
          'Configure term tuition structures, dispatch digital invoices to parent portals, track real-time payments, and issue receipts.',
        highlights: [
          'Termly Tuition Fee Setup',
          'Automated Parent Invoice Generation',
          'Online & Bank Transfer Reconciliation',
          'Debtors List & Payment Receipt Downloads'
        ],
        tip: 'Send automated email & SMS payment reminders directly from the Finance tab to boost recovery rates.',
        accentColor: {
          bg: 'bg-amber-950',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-950 to-slate-900'
        }
      },
      {
        id: 'admin_exams',
        badge: '4. Assessment Engine',
        title: 'Exams, Grading & Master Broadsheets',
        icon: FileSpreadsheet,
        description:
          'Define CA and Exam weighting structures, approve teacher score submissions, and export official PDF report cards in bulk.',
        highlights: [
          'CA & Exam Weighting Controls',
          'Teacher Grade Submission Approvals',
          'Class & Subject Master Broadsheets',
          'Bulk PDF Report Card Generation'
        ],
        tip: 'Print complete class report cards with principal signature stamps in a single click.',
        accentColor: {
          bg: 'bg-indigo-950',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-500/30',
          gradient: 'from-indigo-950 to-slate-900'
        }
      },
      {
        id: 'admin_ai',
        badge: '5. VLE & AI Analytics',
        title: 'Virtual Learning & Predictive AI',
        icon: Sparkles,
        description:
          'Monitor live Google Meet video classes, oversee VLE digital classrooms, and view predictive AI insights on school performance.',
        highlights: [
          'Live Google Meet Hub',
          'VLE Digital Classroom Rooms',
          'Predictive At-Risk Student AI',
          'Enterprise School Performance Analytics'
        ],
        tip: 'Use the AI Analyst to identify struggling students early before final examinations.',
        accentColor: {
          bg: 'bg-purple-950',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-950 to-slate-900'
        }
      }
    ]
  },
  teacher: {
    roleName: 'Educator / Teacher',
    rolePill: 'bg-emerald-900 text-emerald-300 border-emerald-500/30',
    steps: [
      {
        id: 'teacher_timetable',
        badge: '1. Daily Schedule',
        title: 'Personalized Class Timetable',
        icon: Calendar,
        description:
          'View your daily schedule, assigned classes, subject periods, and upcoming school calendar events at a glance.',
        highlights: [
          'Weekly Subject Timetable',
          'Assigned Class & Arm Overview',
          'Period-by-Period Daily Schedule',
          'Direct Classroom Quick-Links'
        ],
        tip: 'Click on any scheduled period to launch your virtual classroom or Google Meet link instantly.',
        accentColor: {
          bg: 'bg-emerald-950',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-950 to-slate-900'
        }
      },
      {
        id: 'teacher_attendance',
        badge: '2. Register & Roll Call',
        title: 'Real-Time Student Attendance',
        icon: CheckSquare,
        description:
          'Take morning or period-based roll call with one click, record absence reasons, and auto-sync records with parents.',
        highlights: [
          'One-Tap Attendance Register',
          'Present / Absent / Late Flags',
          'Absence Reason & Leave Notes',
          'Monthly Class Attendance Analytics'
        ],
        tip: 'Flag persistent absenteeism to automatically trigger counselor and parent notifications.',
        accentColor: {
          bg: 'bg-blue-950',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/30',
          gradient: 'from-blue-950 to-slate-900'
        }
      },
      {
        id: 'teacher_scores',
        badge: '3. Gradebook & Marks',
        title: 'Score Entry & Assessment Engine',
        icon: Award,
        description:
          'Enter test, quiz, assignment, and exam scores with automatic grade calculation, position sorting, and admin submission.',
        highlights: [
          'Continuous Assessment (CA) & Exam Entry',
          'Instant Auto Grade & Pass Calculation',
          'Automatic Class Position Ranking',
          'One-Click Submission to School Admin'
        ],
        tip: 'Use keyboard navigation (Tab / Enter) to rapidly fill out marksheets for large classes.',
        accentColor: {
          bg: 'bg-amber-950',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-950 to-slate-900'
        }
      },
      {
        id: 'teacher_cbt',
        badge: '4. Homework & CBT Tests',
        title: 'Assignments & Online Quizzes',
        icon: FileText,
        description:
          'Publish digital homework, build auto-graded Computer-Based Tests (CBT), and grade student submission attachments.',
        highlights: [
          'Digital Homework Wizard',
          'CBT Question Bank & Exam Builder',
          'Auto-Marked Multiple Choice Quizzes',
          'Submission File Review & Feedback'
        ],
        tip: 'Use the AI Quiz Generator to auto-generate CAPS curriculum practice quizzes in seconds.',
        accentColor: {
          bg: 'bg-purple-950',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-950 to-slate-900'
        }
      },
      {
        id: 'teacher_vle',
        badge: '5. VLE & Lesson Plans',
        title: 'Virtual Classroom & CAPS Lesson Planner',
        icon: BookOpen,
        description:
          'Host live video lectures, upload teaching materials to the library, craft CAPS lesson plans, and chat with students.',
        highlights: [
          'VLE Digital Classroom Rooms',
          'CAPS Lesson Plan Generator',
          'Study Resource Library Uploads',
          'Live Student Chat & Q&A'
        ],
        tip: 'Attach reference documents and video links to VLE rooms for student home revision.',
        accentColor: {
          bg: 'bg-indigo-950',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-500/30',
          gradient: 'from-indigo-950 to-slate-900'
        }
      }
    ]
  },
  student: {
    roleName: 'Student Portal',
    rolePill: 'bg-amber-900 text-amber-300 border-amber-500/30',
    steps: [
      {
        id: 'student_dashboard',
        badge: '1. Student Center',
        title: 'My Academic Command Center',
        icon: LayoutDashboard,
        description:
          'View your daily timetable, pending homework deadlines, class announcements, and overall subject grades.',
        highlights: [
          "Today's Class Timetable",
          'Pending Homework Alerts',
          'Teacher & School Announcements',
          'Overall Term Mark Summary'
        ],
        tip: 'Check your portal every morning for live class links and daily announcements!',
        accentColor: {
          bg: 'bg-amber-950',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-950 to-slate-900'
        }
      },
      {
        id: 'student_assignments',
        badge: '2. Homework',
        title: 'Assignments & Submission Portal',
        icon: UploadCloud,
        description:
          'Access homework assignments, download teacher reading materials, type responses online, or upload photos of written work.',
        highlights: [
          'Active & Completed Homework List',
          'File Attachment Uploads',
          'Teacher Feedback & Comments',
          'Score & Mark Details'
        ],
        tip: 'Snap a photo of your written notebook work with your smartphone and upload it directly!',
        accentColor: {
          bg: 'bg-blue-950',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/30',
          gradient: 'from-blue-950 to-slate-900'
        }
      },
      {
        id: 'student_cbt',
        badge: '3. Online Tests',
        title: 'CBT Examinations & Practice Quizzes',
        icon: Laptop,
        description:
          'Take timed online tests securely with instant feedback, question navigation, and practice quiz modes.',
        highlights: [
          'Scheduled CBT Online Tests',
          'Real-Time Countdown Timer',
          'Instant Automatic Marking',
          'Practice Quiz Replays'
        ],
        tip: 'Practice with AI revision quizzes in the Digital Library to prepare for terminal exams.',
        accentColor: {
          bg: 'bg-purple-950',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-950 to-slate-900'
        }
      },
      {
        id: 'student_vle',
        badge: '4. Learning Hub',
        title: 'VLE Live Classes & Digital Library',
        icon: BookOpenCheck,
        description:
          'Join live video lectures on Google Meet, read textbooks in the Digital Library, and use the AI Study Buddy.',
        highlights: [
          'One-Click Google Meet Join',
          'Digital E-Book Library Access',
          'VLE Digital Classroom Rooms',
          'Step-by-Step AI Study Assistant'
        ],
        tip: 'Ask the AI Study Buddy to explain difficult math equations or science problems step-by-step!',
        accentColor: {
          bg: 'bg-emerald-950',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-950 to-slate-900'
        }
      },
      {
        id: 'student_results',
        badge: '5. Report Cards',
        title: 'Terminal Report Cards & Results',
        icon: TrendingUp,
        description:
          'View your subject marks, Continuous Assessment (CA) scores, teacher remarks, and download official report cards.',
        highlights: [
          'Terminal Report Card View',
          'Subject-by-Subject Mark Breakdown',
          'Class Teacher & Principal Remarks',
          'Download PDF Report Card'
        ],
        tip: 'Track your term-over-term progress charts to stay on top of your academic goals.',
        accentColor: {
          bg: 'bg-indigo-950',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-500/30',
          gradient: 'from-indigo-950 to-slate-900'
        }
      }
    ]
  },
  parent: {
    roleName: 'Parent / Guardian',
    rolePill: 'bg-indigo-900 text-indigo-300 border-indigo-500/30',
    steps: [
      {
        id: 'parent_overview',
        badge: '1. Child Command',
        title: 'Multi-Child Dashboard Overview',
        icon: Users,
        description:
          'Monitor academic progress, attendance records, and school notifications for all your enrolled children in one place.',
        highlights: [
          'Multi-Child Selection Tab',
          'Real-Time Attendance Overview',
          'Academic Summary Cards',
          'School Bulletins & Circulars'
        ],
        tip: 'Switch between your linked children effortlessly using the child selection tab at the top.',
        accentColor: {
          bg: 'bg-indigo-950',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-500/30',
          gradient: 'from-indigo-950 to-slate-900'
        }
      },
      {
        id: 'parent_fees',
        badge: '2. Fees & Payments',
        title: 'School Fee Statements & Online Payments',
        icon: Receipt,
        description:
          'View termly fee breakdowns, outstanding balances, download invoices, and pay securely online or via bank transfer.',
        highlights: [
          'Term Fee Statement Breakdown',
          'Instant Online Credit/Debit Payment',
          'Bank Transfer Receipt Upload',
          'Official Tax & Employer Receipts'
        ],
        tip: 'Download official PDF payment receipts anytime for employer or tax records.',
        accentColor: {
          bg: 'bg-amber-950',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-950 to-slate-900'
        }
      },
      {
        id: 'parent_attendance',
        badge: '3. Welfare & Attendance',
        title: 'Attendance Tracking & Conduct Logs',
        icon: ShieldCheck,
        description:
          'Stay informed with daily attendance alerts, punctuality statistics, and teacher commendation or conduct notes.',
        highlights: [
          'Daily Punctuality Tracker',
          'Absence Alerts & Reasons',
          'Teacher Conduct & Merit Notes',
          'Sick Leave Request Submission'
        ],
        tip: 'Submit absence notices directly through the portal if your child is unwell.',
        accentColor: {
          bg: 'bg-emerald-950',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-950 to-slate-900'
        }
      },
      {
        id: 'parent_reports',
        badge: '4. Official Reports',
        title: 'Terminal Report Cards & Teacher Feedback',
        icon: FileCheck,
        description:
          'Access official termly report cards, subject grades, class teacher comments, and principal sign-offs.',
        highlights: [
          'Official Termly Report Cards',
          'Subject Grade Details',
          'Class Teacher & Principal Remarks',
          'Official PDF Download'
        ],
        tip: 'Review detailed teacher remarks to know exactly which subjects need extra home encouragement.',
        accentColor: {
          bg: 'bg-blue-950',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/30',
          gradient: 'from-blue-950 to-slate-900'
        }
      },
      {
        id: 'parent_comm',
        badge: '5. Communication',
        title: 'School Notices & Teacher Meetings',
        icon: MessageSquare,
        description:
          'Receive official school announcements, request parent-teacher virtual meetings, and contact school administrators.',
        highlights: [
          'Official School Circulars',
          'Virtual Parent-Teacher Meetings',
          'Direct Contact Directory',
          'Google Meet Video Links'
        ],
        tip: 'Join parent-teacher conferences directly via one-click Google Meet video links.',
        accentColor: {
          bg: 'bg-purple-950',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-950 to-slate-900'
        }
      }
    ]
  },
  platform_owner: {
    roleName: 'Platform Owner (SaaS Admin)',
    rolePill: 'bg-purple-900 text-purple-300 border-purple-500/30',
    steps: [
      {
        id: 'owner_saas',
        badge: '1. SaaS Command',
        title: 'Global SaaS Multi-Tenant Command Center',
        icon: Globe,
        description:
          'Monitor onboarded schools, active subscriber counts, system uptime, and platform MRR revenue.',
        highlights: [
          'Global Platform Metrics & KPIs',
          'Multi-Tenant School Registry',
          'Active User & System Health',
          'Monthly Recurring Revenue (MRR)'
        ],
        tip: 'Monitor live database traffic and system performance metrics in real time.',
        accentColor: {
          bg: 'bg-purple-950',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-950 to-slate-900'
        }
      },
      {
        id: 'owner_schools',
        badge: '2. School Onboarding',
        title: 'School Onboarding & Tenant Management',
        icon: Building2,
        description:
          'Review new school registration applications, assign plan tiers, configure tenant databases, and grant admin access.',
        highlights: [
          'Pending School Approvals',
          'School Tenant Registry',
          'Admin Credential Provisioning',
          'Tenant Workspace Config'
        ],
        tip: 'One-click approval automatically provisions an isolated school workspace and emails credentials.',
        accentColor: {
          bg: 'bg-blue-950',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/30',
          gradient: 'from-blue-950 to-slate-900'
        }
      },
      {
        id: 'owner_plans',
        badge: '3. Plans & Monetization',
        title: 'Subscription Tier & Pricing Matrix Manager',
        icon: CreditCard,
        description:
          'Configure plan tiers (Basic, Professional, Enterprise), customize feature entitlements, and adjust pricing.',
        highlights: [
          'Subscription Tier Configuration',
          'Feature Entitlement Control',
          'Billing Cycle Management',
          'Live Website Pricing Sync'
        ],
        tip: 'Updates made to pricing plans immediately reflect on the public marketing site.',
        accentColor: {
          bg: 'bg-amber-950',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-950 to-slate-900'
        }
      },
      {
        id: 'owner_security',
        badge: '4. Security & Audit',
        title: 'System Audit Logs & Security Oversight',
        icon: ShieldAlert,
        description:
          'Inspect full system activity logs, monitor security events, verify data backups, and ensure compliance.',
        highlights: [
          'Real-Time Audit Trail Logging',
          'System Health & Uptime Diagnostics',
          'Automated Database Backup Engine',
          'Security Role & Permission Enforcement'
        ],
        tip: 'Filter audit logs by UID, IP address, or timestamp for security investigations.',
        accentColor: {
          bg: 'bg-emerald-950',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-950 to-slate-900'
        }
      }
    ]
  }
};

export const RoleWalkthroughModal: React.FC = () => {
  const { currentUser, isWalkthroughOpen, closeWalkthrough, showToast } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset to step 0 whenever modal opens
  useEffect(() => {
    if (isWalkthroughOpen) {
      setCurrentStepIndex(0);
    }
  }, [isWalkthroughOpen]);

  // Handle keyboard arrow keys and Escape
  useEffect(() => {
    if (!isWalkthroughOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWalkthrough();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkthroughOpen, currentStepIndex, currentUser]);

  if (!isWalkthroughOpen || !currentUser) {
    return null;
  }

  const userRole = (currentUser.role || 'school_admin') as UserRole;
  const walkthroughData = ROLE_WALKTHROUGHS[userRole] || ROLE_WALKTHROUGHS.school_admin;
  const steps = walkthroughData.steps;
  const step = steps[currentStepIndex] || steps[0];
  const StepIcon = step.icon;

  const totalSteps = steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    closeWalkthrough();
    showToast(`Tour completed! You can replay this guided tour anytime using the Guided Tour button.`, 'success');
  };

  const userName = currentUser.name || currentUser.fullName || 'User';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100 transition-all">
        {/* Animated Top Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] via-amber-400 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/90">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${walkthroughData.rolePill}`}>
                <Compass className="w-3 h-3 text-[#D4AF37]" />
                <span>{walkthroughData.roleName}</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Welcome to EDUkenZA, {userName}!</span>
              <span className="animate-pulse">👋</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Let's take a quick 1-minute guided tour of your portal's key features.
            </p>
          </div>

          <button
            onClick={closeWalkthrough}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title="Close Tour (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Main Visual Body */}
        <div className="p-5 sm:p-7 space-y-6 bg-slate-900/60 overflow-y-auto max-h-[60vh]">
          {/* Step Banner & Header */}
          <div className="flex items-start gap-4">
            <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-lg shrink-0 ${step.accentColor.bg} ${step.accentColor.border} ${step.accentColor.text}`}>
              <StepIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${step.accentColor.badgeBg}`}>
                {step.badge}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {step.description}
              </p>
            </div>
          </div>

          {/* Key Capabilities Checklist */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Key Features in this Module</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {step.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro-Tip Callout Box */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold uppercase text-[10px] text-amber-400 tracking-wider block">
                Quick Feature Tip
              </span>
              <p className="text-amber-100/90 font-medium">
                {step.tip}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={closeWalkthrough}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-semibold transition cursor-pointer px-2 py-1"
            >
              Skip Tour
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#002147] via-[#003366] to-[#002147] hover:from-[#003366] hover:to-[#002147] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer border border-amber-500/40 hover:border-amber-400 transition-all"
            >
              {currentStepIndex === totalSteps - 1 ? (
                <>
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Get Started Now</span>
                </>
              ) : (
                <>
                  <span>Next Feature</span>
                  <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleWalkthroughModal;
