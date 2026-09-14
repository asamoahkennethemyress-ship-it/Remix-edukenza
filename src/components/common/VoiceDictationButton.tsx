import React from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

export interface VoiceDictationButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  language?: string;
  className?: string;
  buttonText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
  disabled?: boolean;
  showWaveform?: boolean;
  enableAcademicFormatting?: boolean;
  onError?: (msg: string) => void;
  showLiveInterimBadge?: boolean;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscript,
  language = 'en-US',
  className = '',
  buttonText,
  size = 'md',
  variant = 'primary',
  disabled = false,
  showWaveform = true,
  enableAcademicFormatting = true,
  onError,
  showLiveInterimBadge = true,
}) => {
  const {
    isSupported,
    state,
    isListening,
    interimTranscript,
    errorMessage,
    toggleListening,
    resetError,
  } = useVoiceDictation({
    language,
    enableAcademicFormatting,
    onInterimResult: (interim) => {
      onTranscript(interim, false);
    },
    onFinalResult: (finalText) => {
      onTranscript(finalText, true);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (errorMessage) {
      resetError();
    }
    toggleListening();
  };

  // Button size styling (ensures min 44px touch targets on mobile)
  const sizeClasses = {
    sm: 'px-3 py-2 min-h-[40px] text-xs gap-1.5',
    md: 'px-4 py-2.5 min-h-[44px] text-xs font-bold gap-2',
    lg: 'px-5 py-3 min-h-[48px] text-sm font-extrabold gap-2.5',
  }[size];

  // Button visual states
  let stateStyles = '';
  if (!isSupported) {
    stateStyles = 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300';
  } else if (state === 'error') {
    stateStyles = 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300';
  } else if (state === 'processing') {
    stateStyles = 'bg-amber-500 text-slate-950 font-bold border border-amber-600 animate-pulse';
  } else if (isListening) {
    stateStyles = 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 border border-red-500 ring-2 ring-red-400/50';
  } else {
    // Idle variant styling
    switch (variant) {
      case 'secondary':
        stateStyles = 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border border-indigo-700';
        break;
      case 'outline':
        stateStyles = 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs';
        break;
      case 'ghost':
        stateStyles = 'hover:bg-slate-100 text-slate-700 border border-transparent';
        break;
      case 'icon':
        stateStyles = 'p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300';
        break;
      case 'primary':
      default:
        stateStyles = 'bg-[#002147] hover:bg-[#003366] text-[#D4AF37] font-bold shadow-xs border border-[#002147]';
        break;
    }
  }

  const ariaLabel = !isSupported
    ? 'Voice dictation is not supported in this browser'
    : isListening
    ? 'Stop voice dictation'
    : state === 'processing'
    ? 'Initializing speech recognition...'
    : state === 'error'
    ? 'Microphone error. Click to retry voice dictation'
    : 'Start voice dictation';

  const tooltip = !isSupported
    ? 'Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.'
    : isListening
    ? 'Listening... Click to stop voice dictation'
    : state === 'processing'
    ? 'Connecting to microphone...'
    : state === 'error'
    ? errorMessage || 'Click to retry voice dictation'
    : 'Click to dictate via microphone';

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || !isSupported}
          aria-label={ariaLabel}
          aria-pressed={isListening}
          title={tooltip}
          className={`relative rounded-2xl transition-all cursor-pointer flex items-center justify-center select-none focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-offset-1 ${sizeClasses} ${stateStyles} ${className}`}
        >
          {/* Subtle pulse aura when listening */}
          {isListening && (
            <span className="absolute -inset-1 rounded-2xl bg-red-500/20 animate-ping pointer-events-none" />
          )}

          {/* STATE 1: PROCESSING */}
          {state === 'processing' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              {variant !== 'icon' && <span>Initializing...</span>}
            </>
          )}

          {/* STATE 2: LISTENING */}
          {isListening && (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <MicOff className="w-4 h-4 text-white" />
              {variant !== 'icon' && (
                <span className="tracking-tight">{buttonText || 'Listening...'}</span>
              )}
              {showWaveform && (
                <div className="flex items-end gap-0.5 h-3 ml-1 pl-1 border-l border-white/30">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" />
                </div>
              )}
            </>
          )}

          {/* STATE 3: ERROR */}
          {state === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              {variant !== 'icon' && <span>Retry Dictation</span>}
            </>
          )}

          {/* STATE 4: IDLE */}
          {state === 'idle' && (
            <>
              <Mic className="w-4 h-4 text-[#D4AF37]" />
              {variant !== 'icon' && (
                <span>{buttonText || 'Voice Dictate'}</span>
              )}
            </>
          )}
        </button>

        {/* Outer Visual Waveform Badge when Listening */}
        {isListening && (
          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-xl border border-red-500/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-wider">
              Listening
            </span>
          </div>
        )}
      </div>

      {/* Live Interim Transcript Bubble */}
      {showLiveInterimBadge && isListening && interimTranscript && (
        <div className="text-[11px] text-indigo-900 font-medium bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl max-w-sm truncate animate-pulse flex items-center gap-1.5 shadow-xs">
          <span className="text-indigo-500">🎙️</span>
          <span>{interimTranscript}...</span>
        </div>
      )}

      {/* Friendly Error Message */}
      {errorMessage && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 p-2 rounded-xl flex items-start gap-1.5 max-w-sm shadow-xs mt-1 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-snug font-medium">{errorMessage}</p>
            <button
              type="button"
              onClick={resetError}
              className="text-[10px] text-red-600 underline font-bold mt-1 hover:text-red-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
