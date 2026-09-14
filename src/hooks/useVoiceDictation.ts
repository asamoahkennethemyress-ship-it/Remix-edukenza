import { useState, useRef, useEffect, useCallback } from 'react';
import { formatAcademicSpeech } from '../utils/academicSpeechFormatter';

export type VoiceDictationState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseVoiceDictationOptions {
  language?: string;
  onInterimResult?: (interim: string) => void;
  onFinalResult?: (finalText: string) => void;
  onError?: (errorMessage: string) => void;
  enableAcademicFormatting?: boolean;
}

export interface UseVoiceDictationReturn {
  isSupported: boolean;
  state: VoiceDictationState;
  isListening: boolean;
  interimTranscript: string;
  errorMessage: string | null;
  startListening: (langOverride?: string) => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => void;
  resetError: () => void;
  selectedLanguage: string;
  setLanguage: (lang: string) => void;
}

// Map technical SpeechRecognition error codes to friendly messages
export function getFriendlyErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
      return 'Microphone access is required for voice dictation. Please allow microphone access in your browser settings and try again.';
    case 'service-not-allowed':
      return 'Voice dictation service is not allowed by your browser or system security settings.';
    case 'no-speech':
      return 'No speech was detected. Please try speaking again.';
    case 'audio-capture':
      return 'No microphone was found or microphone is already in use by another app. Please check your audio settings.';
    case 'network':
      return 'Voice dictation network error. Please check your internet connection and try again.';
    case 'aborted':
      return 'Voice dictation was stopped.';
    case 'language-not-supported':
      return 'The selected language is not supported for voice dictation in this browser.';
    case 'unsupported-browser':
      return 'Voice dictation is not supported in this browser. Please use a supported browser or type your message.';
    default:
      return 'Could not process voice input. Please try again.';
  }
}

export function useVoiceDictation({
  language = 'en-US',
  onInterimResult,
  onFinalResult,
  onError,
  enableAcademicFormatting = true
}: UseVoiceDictationOptions = {}): UseVoiceDictationReturn {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);
  const [state, setState] = useState<VoiceDictationState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef<boolean>(false);
  const isExplicitStopRef = useRef<boolean>(false);

  // Keep latest callbacks in refs to prevent re-instantiation
  const onInterimResultRef = useRef(onInterimResult);
  onInterimResultRef.current = onInterimResult;

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Stop and cleanup recognition session
  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Recognition might already be stopped
      }
    }
    setState('idle');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const resetError = useCallback(() => {
    setErrorMessage(null);
    if (state === 'error') {
      setState('idle');
    }
  }, [state]);

  const startListening = useCallback(async (langOverride?: string): Promise<boolean> => {
    // 1. Check support
    if (!isSupported) {
      const msg = getFriendlyErrorMessage('unsupported-browser');
      setErrorMessage(msg);
      setState('error');
      onErrorRef.current?.(msg);
      return false;
    }

    // 2. Prevent duplicate rapid invocation
    if (isStartingRef.current || state === 'listening') {
      return true;
    }

    isStartingRef.current = true;
    isExplicitStopRef.current = false;
    setErrorMessage(null);
    setState('processing');

    // 3. Stop previous instance if still hanging
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = langOverride || selectedLanguage || 'en-US';

      recognition.onstart = () => {
        isStartingRef.current = false;
        setState('listening');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalizedText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const resultItem = event.results[i];
          const transcriptChunk = resultItem[0]?.transcript || '';

          if (resultItem.isFinal) {
            finalizedText += transcriptChunk;
          } else {
            interimText += transcriptChunk;
          }
        }

        // Handle Interim words
        if (interimText) {
          setInterimTranscript(interimText);
          onInterimResultRef.current?.(interimText);
        }

        // Handle Final transcript
        if (finalizedText) {
          const processedFinal = enableAcademicFormatting
            ? formatAcademicSpeech(finalizedText)
            : finalizedText.trim();

          setInterimTranscript('');
          onInterimResultRef.current?.('');
          onFinalResultRef.current?.(processedFinal);
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        const errCode = event.error || 'unknown';

        // Ignore harmless 'aborted' if user clicked stop
        if (errCode === 'aborted' && isExplicitStopRef.current) {
          setState('idle');
          return;
        }

        const friendlyMsg = getFriendlyErrorMessage(errCode);
        setErrorMessage(friendlyMsg);
        setState('error');
        onErrorRef.current?.(friendlyMsg);
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        // If user didn't explicitly stop and not in error, cleanly transition to idle
        setState((prevState) => (prevState === 'listening' || prevState === 'processing' ? 'idle' : prevState));
        setInterimTranscript('');
      };

      recognition.start();
      return true;

    } catch (startErr: any) {
      isStartingRef.current = false;
      const friendlyMsg = getFriendlyErrorMessage('not-allowed');
      setErrorMessage(friendlyMsg);
      setState('error');
      onErrorRef.current?.(friendlyMsg);
      return false;
    }
  }, [isSupported, state, selectedLanguage, enableAcademicFormatting]);

  const toggleListening = useCallback(() => {
    if (state === 'listening' || state === 'processing') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  return {
    isSupported,
    state,
    isListening: state === 'listening',
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    resetError,
    selectedLanguage,
    setLanguage: setSelectedLanguage
  };
}
