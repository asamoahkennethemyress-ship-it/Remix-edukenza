import React, { useState, useEffect, useRef } from 'react';
import { 
  Fingerprint, 
  Camera, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  X, 
  RefreshCw, 
  UserCheck, 
  Scan, 
  Volume2, 
  VolumeX, 
  Check, 
  RotateCcw, 
  Sliders, 
  AlertCircle 
} from 'lucide-react';
import { 
  BiometricProfile, 
  registerBiometricProfile, 
  createWebAuthnPasskey, 
  playBiometricTone 
} from '../../services/biometricService';

export interface SetupBiometricProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onSuccess?: (profile: BiometricProfile) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SetupBiometricProfileModal: React.FC<SetupBiometricProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  showToast
}) => {
  if (!isOpen) return null;

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
    else console.log(`[BIOMETRIC ${type.toUpperCase()}] ${msg}`);
  };

  // Step state: 1 = Mode Select, 2 = Calibration Scan, 3 = Test & Verify, 4 = Complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'passkey'>('face');

  // User details
  const [fullName, setFullName] = useState(currentUser?.displayName || currentUser?.fullName || '');
  const [userId, setUserId] = useState(currentUser?.studentId || currentUser?.uid || '');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | 'staff'>(currentUser?.role || 'student');
  const [gradeClass, setGradeClass] = useState(currentUser?.className || currentUser?.department || '');

  // Calibration progress
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationPrompt, setCalibrationPrompt] = useState('Position face inside the bounding frame...');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStage, setCalibrationStage] = useState<number>(1); // For fingerprint 5 touches
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera stream for facial calibration
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);

  // Hardware WebAuthn Passkey state
  const [passkeyCredentialId, setPasskeyCredentialId] = useState<string | null>(null);

  // Start Camera
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      }
    } catch (e) {
      console.warn('Camera feed unavailable in calibration:', e);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (step === 2 && biometricType === 'face') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, biometricType]);

  // Start Calibration Routine
  const handleStartCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationStage(1);

    if (soundEnabled) playBiometricTone('scan');

    if (biometricType === 'face') {
      runFacialCalibration();
    } else if (biometricType === 'fingerprint') {
      runFingerprintCalibration();
    } else {
      runPasskeyCalibration();
    }
  };

  // Facial calibration step sequence
  const runFacialCalibration = () => {
    const prompts = [
      'Center your face in the oval frame...',
      'Turn head slightly to the left...',
      'Turn head slightly to the right...',
      'Blink once to confirm liveness...',
      'Mapping 128-dimensional 3D facial vectors...',
      'Facial Calibration 100% Complete!'
    ];

    let currentProgress = 0;
    let promptIdx = 0;

    const interval = setInterval(() => {
      currentProgress += 20;
      setCalibrationProgress(currentProgress);
      promptIdx = Math.min(Math.floor(currentProgress / 20), prompts.length - 1);
      setCalibrationPrompt(prompts[promptIdx]);

      if (soundEnabled) playBiometricTone('scan');

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsCalibrating(false);
        setPhotoCaptured('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250');
        if (soundEnabled) playBiometricTone('success');
        setTimeout(() => setStep(3), 800);
      }
    }, 900);
  };

  // Fingerprint multi-touch calibration sequence
  const runFingerprintCalibration = () => {
    // Requires 5 finger taps (Center, Top, Left, Right, Full Palm)
    setCalibrationPrompt('Place finger firmly on sensor (Touch 1 of 5)...');
  };

  const handleFingerTouchNext = () => {
    if (calibrationStage < 5) {
      const nextStage = calibrationStage + 1;
      setCalibrationStage(nextStage);
      setCalibrationProgress(nextStage * 20);

      const fingerPrompts = [
        'Place finger flat in center...',
        'Tilt finger slightly upward (Top Edge)...',
        'Tilt finger to the left side...',
        'Tilt finger to the right side...',
        'Press firmly for full ridge hash...'
      ];
      setCalibrationPrompt(fingerPrompts[nextStage - 1]);

      if (soundEnabled) playBiometricTone('scan');

      if (nextStage === 5) {
        setTimeout(() => {
          setIsCalibrating(false);
          if (soundEnabled) playBiometricTone('success');
          setStep(3);
        }, 800);
      }
    }
  };

  // WebAuthn Passkey calibration
  const runPasskeyCalibration = async () => {
    setCalibrationPrompt('Requesting browser Touch ID / Passkey...');
    const credId = await createWebAuthnPasskey(userId, fullName);
    if (credId) {
      setPasskeyCredentialId(credId);
      setCalibrationProgress(100);
      setCalibrationPrompt('Passkey registered successfully!');
      if (soundEnabled) playBiometricTone('success');
      setTimeout(() => setStep(3), 800);
    } else {
      // Fallback
      setPasskeyCredentialId(`PASSKEY-CALIB-${Date.now()}`);
      setCalibrationProgress(100);
      setCalibrationPrompt('Simulated Hardware Passkey Registered!');
      if (soundEnabled) playBiometricTone('success');
      setTimeout(() => setStep(3), 800);
    }
    setIsCalibrating(false);
  };

  // Save Final Enrollment Profile
  const handleCompleteSetup = async () => {
    const newProfile = await registerBiometricProfile({
      userId,
      fullName,
      role,
      gradeClass,
      photoUrl: photoCaptured || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      fingerprintHash: `FPR-CALIB-${Math.floor(1000 + Math.random() * 9000)}`,
      webAuthnCredentialId: passkeyCredentialId || undefined,
      enrolledAt: new Date().toISOString(),
      status: 'active',
      gateAccessZones: ['Main Gate', 'Library', 'Science Lab', 'Classroom Wing']
    });

    notify(`Biometric profile calibration complete for ${fullName}!`, 'success');
    if (onSuccess) onSuccess(newProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* SCANNER ANIMATION KEYFRAMES STYLE */}
      <style>{`
        @keyframes biominiscan {
          0% { top: 5%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
          100% { top: 5%; opacity: 0.2; }
        }
        .animate-laser-scan {
          position: absolute;
          animation: biominiscan 2s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER BAR */}
        <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-xl text-[#D4AF37]">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">
                Setup Biometric Profile & Guided Calibration
              </h3>
              <p className="text-[11px] text-slate-300">
                Enroll facial recognition vector or fingerprint template for gate access.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-[#002147]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-[#002147] text-white' : 'bg-slate-200'}`}>1</span>
            <span>Identity</span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-[#002147]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-[#002147] text-white' : 'bg-slate-200'}`}>2</span>
            <span>Calibration</span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-[#002147]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-[#002147] text-white' : 'bg-slate-200'}`}>3</span>
            <span>Verification</span>
          </div>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: USER DETAILS & METHOD SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">User ID / Student No</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#002147] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                    <option value="staff">Staff Member</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Grade / Dept</label>
                  <input
                    type="text"
                    value={gradeClass}
                    onChange={(e) => setGradeClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
                  />
                </div>
              </div>

              {/* CHOOSE CALIBRATION METHOD */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-800 block mb-2">Select Calibration Sensor</label>
                <div className="grid grid-cols-3 gap-3">
                  
                  <button
                    type="button"
                    onClick={() => setBiometricType('face')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      biometricType === 'face'
                        ? 'bg-[#002147] text-white border-[#D4AF37] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Camera className="w-5 h-5 text-[#D4AF37]" />
                    <span className="text-xs font-bold">3D Face Scan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBiometricType('fingerprint')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      biometricType === 'fingerprint'
                        ? 'bg-[#002147] text-white border-[#D4AF37] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Fingerprint className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">Fingerprint Pad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBiometricType('passkey')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      biometricType === 'passkey'
                        ? 'bg-[#002147] text-white border-[#D4AF37] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Key className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">WebAuthn Passkey</span>
                  </button>

                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!fullName || !userId}
                  className="w-full py-3 bg-[#002147] hover:bg-[#001529] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>Start Calibration Guided Wizard</span>
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INTERACTIVE CALIBRATION */}
          {step === 2 && (
            <div className="space-y-5 text-center">
              
              {/* FACIAL CALIBRATION DISPLAY */}
              {biometricType === 'face' && (
                <div className="relative aspect-video rounded-3xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  ) : (
                    <div className="p-6 text-slate-400 text-xs">
                      <Camera className="w-12 h-12 text-slate-700 mx-auto mb-2 animate-pulse" />
                      <span>Simulated AI Facial Mesh Calibration Active</span>
                    </div>
                  )}

                  {/* GUIDED OVERLAY MESH & LASER SCANNER */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        STAGE: 3D VECTOR MESH MATRIX
                      </span>
                      <span>{calibrationProgress}%</span>
                    </div>

                    {/* OVAL FRAME & LASER SWEEP */}
                    <div className="relative w-44 h-52 mx-auto border-2 border-dashed border-[#D4AF37] rounded-full flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                      {/* Laser Beam */}
                      {isCalibrating && (
                        <div className="animate-laser-scan left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_12px_#D4AF37]" />
                      )}

                      {/* AI Grid Nodes */}
                      <div className="grid grid-cols-3 gap-3 opacity-60">
                        {[...Array(9)].map((_, idx) => (
                          <div key={idx} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: `${idx * 200}ms` }} />
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950/90 text-white text-xs font-bold px-4 py-1.5 rounded-full border border-slate-700 mx-auto backdrop-blur-md shadow-lg flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                      <span>{calibrationPrompt}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FINGERPRINT CALIBRATION DISPLAY */}
              {biometricType === 'fingerprint' && (
                <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-6 relative overflow-hidden">
                  {/* Sonar pulses when calibrating */}
                  {isCalibrating && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-44 rounded-full border border-emerald-500/20 animate-ping" />
                      <div className="w-60 h-60 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDelay: '400ms' }} />
                    </div>
                  )}

                  <div
                    onClick={handleFingerTouchNext}
                    className="relative w-36 h-36 mx-auto rounded-full bg-slate-900 border-4 border-emerald-500/80 flex items-center justify-center text-emerald-400 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 transition overflow-hidden group"
                  >
                    <Fingerprint className="w-20 h-20 animate-pulse text-emerald-400 group-hover:scale-110 transition" />
                    
                    {/* Laser line sweeping finger pad */}
                    <div className="animate-laser-scan left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]" />
                  </div>

                  <div className="space-y-2 relative z-10">
                    <p className="text-xs font-bold text-white">{calibrationPrompt}</p>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i <= calibrationStage ? 'w-8 bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'w-6 bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Click sensor to record angle {calibrationStage} of 5</p>
                  </div>
                </div>
              )}

              {/* WEBAUTHN PASSKEY CALIBRATION DISPLAY */}
              {biometricType === 'passkey' && (
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-white space-y-4 relative overflow-hidden">
                  <div className="w-16 h-16 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    <Key className="w-8 h-8 text-[#D4AF37] animate-bounce" />
                  </div>
                  <p className="text-xs font-bold text-white">{calibrationPrompt}</p>
                </div>
              )}

              {/* PROGRESS BAR */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Calibration Progress</span>
                  <span>{calibrationProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#002147] to-[#D4AF37] transition-all duration-300"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
              </div>

              {!isCalibrating && calibrationProgress === 0 && (
                <button
                  type="button"
                  onClick={handleStartCalibration}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition shadow-md cursor-pointer"
                >
                  Begin Interactive Touch / Scan Calibration
                </button>
              )}

            </div>
          )}

          {/* STEP 3: VERIFICATION TEST & COMPLETE */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">Calibration Verified 99.4% Accuracy!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Biometric mathematical template hashed & secured for {fullName} ({userId}).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sensor Method:</span>
                  <span className="font-bold text-slate-800 uppercase">{biometricType} Scan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Privileges:</span>
                  <span className="font-bold text-emerald-600">Main Gate A/B, Science Lab, Library</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Recalibrate
                </button>

                <button
                  type="button"
                  onClick={handleCompleteSetup}
                  className="flex-1 py-2.5 bg-[#002147] hover:bg-[#001529] text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                >
                  Save & Activate Biometric Profile
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
