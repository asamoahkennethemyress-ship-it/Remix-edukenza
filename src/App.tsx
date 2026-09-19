import React, { Suspense, lazy, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolBrandingProvider } from './context/SchoolBrandingContext';
import { MarketingProvider } from './context/MarketingContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { BenefitsSection } from './components/BenefitsSection';
import { 
  TeacherShowcaseSection, 
  StudentShowcaseSection, 
  ParentShowcaseSection, 
  AiShowcaseSection, 
  RealtimeShowcaseSection, 
  SecurityShowcaseSection 
} from './components/showcase/RoleShowcases';
import { PricingSection } from './components/PricingSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FaqSection } from './components/FaqSection';
import { LoginPage } from './components/LoginPage';
import { RegisterSchoolPage } from './components/RegisterSchoolPage';
import { RoleRedirectPreviewModal } from './components/RoleRedirectPreviewModal';
import { Footer } from './components/Footer';
import { Modals } from './components/Modals';
import { CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { RoleWalkthroughModal } from './components/common/RoleWalkthroughModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserRole } from './types';
import { useScrollReveal } from './utils/scrollReveal';

// Code-split heavy dashboards for optimal load speed and isolation
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const SchoolAdminDashboard = lazy(() => import('./components/SchoolAdminDashboard').then(m => ({ default: m.SchoolAdminDashboard })));
const SeniorHighDashboard = lazy(() => import('./components/SeniorHighDashboard').then(m => ({ default: m.SeniorHighDashboard })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const ParentDashboard = lazy(() => import('./components/ParentDashboard').then(m => ({ default: m.ParentDashboard })));

const DashboardLoadingFallback: React.FC<{ roleName: string }> = ({ roleName }) => (
  <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    <div className="text-center">
      <h3 className="text-lg font-bold text-white">Loading {roleName}...</h3>
      <p className="text-xs text-slate-400 mt-1">Preparing your workspace</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  requiredRole: UserRole | UserRole[];
  portalName: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, portalName, children }) => {
  const { currentUser, loadingAuth, setActiveView, showToast } = useAuth();

  useEffect(() => {
    if (!loadingAuth) {
      if (!currentUser) {
        console.warn(`[SECURITY GUARD] Unauthenticated access attempt to ${portalName}. Redirecting to login.`);
        showToast(`Please sign in with authorized credentials to access the ${portalName}.`, 'error');
        setActiveView('login');
      } else {
        const isAllowed = Array.isArray(requiredRole)
          ? requiredRole.includes(currentUser.role) || currentUser.role === 'platform_owner'
          : currentUser.role === requiredRole || currentUser.role === 'platform_owner';
        if (!isAllowed) {
          console.warn(`[SECURITY GUARD] Role mismatch for ${portalName}. Current role: '${currentUser.role}'. Access blocked.`);
          showToast(`Access denied: You do not have permission to access the ${portalName}.`, 'error');
          setActiveView('home');
        }
      }
    }
  }, [currentUser, loadingAuth, requiredRole, portalName, setActiveView, showToast]);

  if (loadingAuth) {
    return <DashboardLoadingFallback roleName={portalName} />;
  }

  const isAllowed = currentUser && (
    Array.isArray(requiredRole)
      ? requiredRole.includes(currentUser.role) || currentUser.role === 'platform_owner'
      : currentUser.role === requiredRole || currentUser.role === 'platform_owner'
  );

  if (!isAllowed) {
    return <DashboardLoadingFallback roleName="Verifying credentials..." />;
  }

  return <>{children}</>;
};

const ToastNotification: React.FC = () => {
  const { toast } = useAuth();
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-bounce-short">
      <div className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
        toast.type === 'error'
          ? 'bg-red-950/90 border-red-500/50 text-red-200'
          : toast.type === 'info'
          ? 'bg-blue-950/90 border-blue-500/50 text-blue-200'
          : 'bg-slate-900/95 border-amber-500/60 text-white'
      }`}>
        <div className="mt-0.5">
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : toast.type === 'info' ? (
            <Info className="w-5 h-5 text-blue-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          )}
        </div>
        <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
          {toast.message}
        </div>
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeView } = useAuth();
  useScrollReveal(activeView);

  if (activeView === 'owner-dashboard') {
    return (
      <ProtectedRoute requiredRole="platform_owner" portalName="Owner Console">
        <div className="min-h-screen bg-slate-100 font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="Owner Console Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="Owner Console" />}>
              <OwnerDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  if (activeView === 'school-admin-dashboard') {
    return (
      <ProtectedRoute requiredRole={['school_admin', 'school_head', 'platform_owner']} portalName="School Administration Portal">
        <div className="min-h-screen bg-slate-100 font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="School Admin Portal Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="School Administration Portal" />}>
              <SchoolAdminDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  if (activeView === 'senior-high-dashboard') {
    return (
      <ProtectedRoute 
        requiredRole={[
          'school_head', 
          'assistant_academics', 
          'assistant_domestic', 
          'house_master', 
          'housekeeping', 
          'facilities', 
          'general_services', 
          'school_admin', 
          'platform_owner'
        ]} 
        portalName="Senior High Portal"
      >
        <div className="min-h-screen bg-slate-100 font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="Senior High Portal Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="Senior High Portal" />}>
              <SeniorHighDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  if (activeView === 'teacher-dashboard') {
    return (
      <ProtectedRoute 
        requiredRole={['teacher', 'school_admin', 'school_head', 'assistant_academics', 'platform_owner']} 
        portalName="Teacher Portal"
      >
        <div className="min-h-screen bg-slate-100 font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="Teacher Portal Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="Teacher Portal" />}>
              <TeacherDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  if (activeView === 'student-dashboard') {
    return (
      <ProtectedRoute 
        requiredRole={['student', 'school_admin', 'school_head', 'teacher', 'platform_owner']} 
        portalName="Student Portal"
      >
        <div className="min-h-screen bg-slate-100 font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="Student Portal Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="Student Portal" />}>
              <StudentDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  if (activeView === 'parent-dashboard') {
    return (
      <ProtectedRoute 
        requiredRole={['parent', 'school_admin', 'school_head', 'platform_owner']} 
        portalName="Parent Portal"
      >
        <div className="min-h-screen bg-[#002147] font-sans">
          <RoleWalkthroughModal />
          <ErrorBoundary fallbackTitle="Parent Portal Recovery">
            <Suspense fallback={<DashboardLoadingFallback roleName="Parent Portal" />}>
              <ParentDashboard />
            </Suspense>
          </ErrorBoundary>
          <ToastNotification />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      <Navbar />

      <main className="flex-grow">
        {activeView === 'home' && (
          <>
            <HeroSection />
            <AboutSection />
            <FeaturesSection />
            <TeacherShowcaseSection />
            <StudentShowcaseSection />
            <ParentShowcaseSection />
            <AiShowcaseSection />
            <RealtimeShowcaseSection />
            <SecurityShowcaseSection />
            <HowItWorksSection />
            <BenefitsSection />
            <PricingSection />
            <TestimonialsSection />
            <FaqSection />
          </>
        )}

        {activeView === 'about' && (
          <div className="pt-6">
            <AboutSection />
            <SecurityShowcaseSection />
            <RealtimeShowcaseSection />
          </div>
        )}

        {activeView === 'features' && (
          <div className="pt-6">
            <FeaturesSection />
            <PricingSection />
            <FaqSection />
          </div>
        )}

        {activeView === 'how-it-works' && (
          <div className="pt-6">
            <HowItWorksSection />
            <FeaturesSection />
          </div>
        )}

        {activeView === 'benefits' && (
          <div className="pt-6">
            <BenefitsSection />
            <FeaturesSection />
          </div>
        )}

        {activeView === 'pricing' && (
          <div className="pt-6">
            <PricingSection />
            <FaqSection />
          </div>
        )}

        {activeView === 'faq' && (
          <div className="pt-6">
            <FaqSection />
          </div>
        )}

        {activeView === 'login' && <LoginPage />}

        {activeView === 'register-school' && <RegisterSchoolPage />}

        {activeView === 'role-preview' && <RoleRedirectPreviewModal />}
      </main>

      <Footer />
      <Modals />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="EDUkenZA Application Recovery">
      <AuthProvider>
        <SchoolBrandingProvider>
          <MarketingProvider>
            <OfflineSyncBanner />
            <MainContent />
          </MarketingProvider>
        </SchoolBrandingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}


