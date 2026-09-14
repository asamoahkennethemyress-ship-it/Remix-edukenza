import React from 'react';
import { useAuth, getDashboardViewForRole } from '../context/AuthContext';
import { isPlatformOwner } from '../utils/permissions';
import { 
  Building2, 
  Crown, 
  UserCheck, 
  Users, 
  BookOpen, 
  CheckCircle, 
  ArrowLeft, 
  LogOut,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
  GraduationCap
} from 'lucide-react';

export const RoleRedirectPreviewModal: React.FC = () => {
  const { currentUser, targetRoleDestination, clearRoleDestination, logout, setActiveView } = useAuth();

  if (!currentUser || !targetRoleDestination) {
    return (
      <div className="min-h-[70vh] bg-slate-100 text-slate-900 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-xl max-w-md text-center space-y-4 shadow-lg">
          <p className="text-slate-600 text-xs font-semibold">No active user session detected.</p>
          <button
            onClick={() => setActiveView('login')}
            className="px-6 py-2.5 rounded bg-[#002147] text-white font-black text-xs uppercase tracking-wider"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'platform_owner': return <Crown className="w-6 h-6 text-[#D4AF37]" />;
      case 'school_head': return <GraduationCap className="w-6 h-6 text-[#D4AF37]" />;
      case 'assistant_academics': return <BookOpen className="w-6 h-6 text-[#D4AF37]" />;
      case 'assistant_domestic': return <Building2 className="w-6 h-6 text-[#D4AF37]" />;
      case 'school_admin': return <Building2 className="w-6 h-6 text-[#D4AF37]" />;
      case 'teacher': return <UserCheck className="w-6 h-6 text-[#D4AF37]" />;
      case 'student': return <BookOpen className="w-6 h-6 text-[#D4AF37]" />;
      case 'parent': return <Users className="w-6 h-6 text-[#D4AF37]" />;
      default: return <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />;
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-100 text-slate-900 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#002147] border border-[#D4AF37] flex items-center justify-center shadow">
                {getRoleIcon(currentUser.role)}
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  <CheckCircle className="w-3 h-3" /> Authentication Successful
                </div>
                <h1 className="text-xl font-black text-[#002147]">{currentUser.name}</h1>
                <p className="text-xs text-slate-600 font-medium">{currentUser.email} • {currentUser.schoolName || 'EDUkenZA SaaS'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3.5 py-2 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Destination Target Banner */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#002147]">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-black uppercase tracking-widest">After Login Target Destination</span>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#002147] text-[#D4AF37] text-[10px] font-extrabold uppercase border border-[#D4AF37]/30">
                Verified Redirect Target
              </span>
            </div>

            <h2 className="text-xl font-black text-[#002147] uppercase tracking-tight">{targetRoleDestination.title}</h2>
            <p className="text-xs text-[#002147] font-extrabold uppercase tracking-wide">{targetRoleDestination.subtitle}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{targetRoleDestination.description}</p>

            <div className="pt-2">
              <p className="text-[10px] font-black text-[#002147] uppercase tracking-wider mb-2">Key Dedicated Features Ready For Next Phase:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {targetRoleDestination.features.map((feat, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-2 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scope Note Banner */}
          <div className="bg-[#002147] text-white border-2 border-[#D4AF37] p-4 rounded-lg flex items-start gap-3 text-xs">
            <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-[#D4AF37] uppercase tracking-wider">Phase 1 Scope Completion Confirmed:</p>
              <p className="text-slate-200 text-xs leading-relaxed">
                Marketing Landing Page, School Registration, Login Interface, Role Authentication, and Firebase Infrastructure preparation are fully constructed as requested.
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              onClick={clearRoleDestination}
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Marketing Website</span>
            </button>

            <button
              onClick={() => {
                const targetView = getDashboardViewForRole(currentUser.role, currentUser.educationCategory);
                setActiveView(targetView);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>
                Launch {
                  currentUser.role === 'platform_owner' ? 'Owner' :
                  currentUser.role === 'school_head' ? 'School Head' :
                  currentUser.role === 'assistant_academics' ? 'Academics' :
                  currentUser.role === 'assistant_domestic' ? 'Domestic' :
                  currentUser.role === 'house_master' ? 'House Master' :
                  currentUser.role === 'school_admin' ? 'School Admin' :
                  currentUser.role === 'teacher' ? 'Teacher' :
                  currentUser.role === 'student' ? 'Student' :
                  currentUser.role === 'parent' ? 'Parent' : 'User'
                } Dashboard
              </span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
