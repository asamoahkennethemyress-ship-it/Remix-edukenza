import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { BrandLogo } from './brand/BrandLogo';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, setActiveView } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Signing you in…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    setLoadingMessage('Signing you in…');

    try {
      const result = await loginWithGoogle((stage) => {
        if (stage === 'signing_in') {
          setLoadingMessage('Signing you in…');
        } else if (stage === 'loading_profile') {
          setLoadingMessage('Loading your EDUkenZA profile…');
        }
      });

      if (!result.success && result.message) {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 text-slate-900 flex flex-col justify-center items-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/40 text-center space-y-7">
        
        {/* EDUkenZA Logo */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="inline-flex items-center justify-center cursor-pointer hover:opacity-95 transition focus:outline-none"
            aria-label="EDUkenZA Home"
          >
            <BrandLogo variant="full-light" size="lg" showTagline={false} />
          </button>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#002147]">
            Sign in to EDUkenZA
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Welcome to EDUkenZA. Sign in with your authorized Google account to access your institutional portal.
          </p>
        </div>

        {/* Clear Authentication Failure Message (Only when authentication genuinely fails) */}
        {errorMessage && (
          <div 
            id="auth-error-banner"
            className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs text-left animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* [ Continue with Google ] Button */}
        <div>
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-5 rounded-xl bg-white border border-slate-300 hover:border-[#002147] hover:bg-slate-50/80 text-slate-800 font-semibold text-sm sm:text-base transition-all duration-150 shadow-xs hover:shadow-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-wait group focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
          >
            {loading ? (
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 text-[#002147] animate-spin" />
                <span className="text-slate-700 font-medium">{loadingMessage}</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0 transition group-hover:scale-105" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="tracking-tight text-slate-800 group-hover:text-[#002147]">
                  Continue with Google
                </span>
              </>
            )}
          </button>
        </div>

        {/* Minimal Navigation Link */}
        <div className="pt-2 flex items-center justify-center border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>

      </div>
    </div>
  );
};

