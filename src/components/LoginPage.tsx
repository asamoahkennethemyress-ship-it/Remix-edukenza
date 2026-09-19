import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ArrowRight, CheckCircle2, Building, Sparkles } from 'lucide-react';
import { BrandLogo } from './brand/BrandLogo';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithGoogleRedirect, setActiveView } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Signing you in…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);
  const [institutionalCode, setInstitutionalCode] = useState<string>('');
  const [inputFocused, setInputFocused] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setShowRedirectOption(false);
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
        if (result.canUseRedirect) {
          setShowRedirectOption(true);
        }
      } else if (result.success) {
        setAuthSuccess(true);
        setLoadingMessage('Access granted! Connecting to portal…');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during Google sign-in.');
      setShowRedirectOption(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    setLoadingMessage('Redirecting to Google…');
    try {
      await loginWithGoogleRedirect();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to redirect to Google.');
      setLoading(false);
    }
  };

  // Helper for testing the error shake animation directly
  const triggerDemoError = () => {
    setErrorMessage('Invalid authentication credentials or unauthorized institutional domain.');
    setShowRedirectOption(true);
  };

  return (
    <div className="relative min-h-[85vh] bg-slate-50 text-slate-900 flex flex-col justify-center items-center py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle Ambient Background Gradient Lighting */}
      <div 
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"
      />
      <div 
        aria-hidden="true"
        className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow delay-300"
      />

      {/* Main Login Card with smooth entrance animation */}
      <div 
        id="login-card-container"
        className="animate-fade-in-up relative z-10 max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/40 text-center space-y-7 transition-all duration-300"
      >
        
        {/* EDUkenZA Logo with entrance animation */}
        <div className="flex justify-center animate-fade-in-down">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="inline-flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
            aria-label="EDUkenZA Home"
          >
            <BrandLogo variant="full-light" size="lg" showTagline={false} />
          </button>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2 animate-fade-in delay-100">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#002147]">
            Sign in to EDUkenZA
          </h1>
          <p className="text-sm text-slate-500 font-normal leading-relaxed">
            Welcome to EDUkenZA. Sign in with your authorized Google account to access your institutional portal.
          </p>
        </div>

        {/* Input Focus Transition Field: Institutional Domain / Access Identifier */}
        <div className="text-left space-y-1.5 animate-fade-in delay-150">
          <label 
            htmlFor="institutional-code-input"
            className={`block text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
              inputFocused ? 'text-[#002147]' : 'text-slate-600'
            }`}
          >
            Institutional Domain or School ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building className={`w-4 h-4 transition-colors duration-200 ${inputFocused ? 'text-[#002147]' : 'text-slate-400'}`} />
            </div>
            <input
              id="institutional-code-input"
              type="text"
              value={institutionalCode}
              onChange={(e) => setInstitutionalCode(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="e.g. achimota-high or school@domain.edu"
              className="input-animated w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Optional domain routing for pre-configured institutional single-sign-on.
          </p>
        </div>

        {/* Successful Authentication Transition State */}
        {authSuccess && (
          <div className="animate-scale-up p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-center gap-3 text-emerald-800 text-xs font-semibold shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce-subtle" />
            <span>Authenticated successfully. Preparing your portal…</span>
          </div>
        )}

        {/* Clear Authentication Failure Message with Shake & Fade */}
        {errorMessage && (
          <div 
            id="auth-error-banner"
            key="auth-error"
            className="animate-shake p-3.5 bg-red-50/95 border border-red-200 rounded-xl space-y-2 text-red-800 text-xs text-left shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMessage}</p>
            </div>
            {showRedirectOption && (
              <div className="pt-2 border-t border-red-200/60 flex justify-end">
                <button
                  type="button"
                  onClick={handleGoogleRedirectSignIn}
                  disabled={loading}
                  className="btn-interactive inline-flex items-center gap-1.5 text-xs font-semibold text-[#002147] hover:underline cursor-pointer"
                >
                  <span>Continue with Google (Redirect Mode)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* [ Continue with Google ] Button with polished hover & press effects */}
        <div className="space-y-3 animate-fade-in delay-200">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-interactive w-full py-3.5 px-5 rounded-xl bg-white border border-slate-300 hover:border-[#002147] hover:bg-slate-50/90 text-slate-800 font-semibold text-sm sm:text-base transition-colors duration-200 shadow-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-wait group focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
          >
            {loading ? (
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 text-[#002147] animate-spin" />
                <span className="text-slate-700 font-medium">{loadingMessage}</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
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
                <span className="tracking-tight text-slate-800 group-hover:text-[#002147] transition-colors">
                  Continue with Google
                </span>
              </>
            )}
          </button>

          {/* Fallback Redirect Option for strict browser environments */}
          <button
            id="google-redirect-btn"
            type="button"
            onClick={handleGoogleRedirectSignIn}
            disabled={loading}
            className="btn-interactive w-full text-xs text-slate-500 hover:text-[#002147] transition-colors py-1 text-center cursor-pointer font-medium"
          >
            Trouble with popups? Continue with Google (Redirect)
          </button>

          {/* Demo Error Animation Trigger */}
          <button
            type="button"
            onClick={triggerDemoError}
            className="text-[11px] text-slate-400 hover:text-red-600 transition-colors py-0.5 text-center cursor-pointer font-normal underline"
          >
            Test Error Shake Animation
          </button>
        </div>

        {/* Minimal Navigation Link */}
        <div className="pt-2 flex items-center justify-center border-t border-slate-100 text-xs animate-fade-in delay-250">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="font-medium text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer group"
          >
            <span className="transition-transform duration-150 group-hover:-translate-x-0.5">←</span>
            <span>Back to Home</span>
          </button>
        </div>

      </div>
    </div>
  );
};


