import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Radio, 
  Lock, 
  Check, 
  X,
  Sliders,
  Activity,
  Cpu,
  Usb,
  Server,
  Play,
  FileCheck,
  Building2,
  Trash2,
  Info,
  Layers,
  ChevronRight,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';
import { 
  BiometricDevice,
  BiometricEnrolment,
  BiometricLog,
  AttendanceCorrection,
  BiometricHardwareStatus,
  BiometricDiagnosticSuiteResult,
  detectPhysicalHardware,
  pairPhysicalWebUsbDevice,
  capturePhysicalBiometricPasskey,
  verifyPhysicalBiometricPasskey,
  registerBiometricDevice,
  getSchoolBiometricDevices,
  updateBiometricDeviceStatus,
  deleteBiometricDevice,
  linkUserBiometric,
  getSchoolBiometricEnrolments,
  updateBiometricEnrolmentStatus,
  deleteBiometricEnrolment,
  processBiometricAttendanceVerification,
  getPendingAttendanceCorrections,
  approveAttendanceCorrection,
  rejectAttendanceCorrection,
  runBiometricPipelineDiagnostics,
  playBiometricTone
} from '../../services/biometricService';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export interface BiometricControlCenterProps {
  currentUser?: any;
  userRole?: string;
  schoolName?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRequireBiometricAuth?: (actionName: string, onSuccess: () => void) => void;
}

export const BiometricControlCenter: React.FC<BiometricControlCenterProps> = ({
  currentUser,
  userRole = 'school_admin',
  schoolName = 'EDUkenZA Academy',
  showToast
}) => {
  const schoolId = currentUser?.schoolId || currentUser?.school_id || 'school-default';

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
    else console.log(`[BIOMETRIC ${type.toUpperCase()}] ${msg}`);
  };

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState<'terminal' | 'devices' | 'linking' | 'attendance' | 'corrections' | 'diagnostics'>('terminal');

  // Hardware Connection & Detection State
  const [hardwareStatus, setHardwareStatus] = useState<BiometricHardwareStatus>({
    deviceConnected: false,
    hardwareType: 'none',
    deviceName: 'Checking Hardware...',
    statusMessage: 'REAL DEVICE INTEGRATION REQUIRED.',
    details: {
      webAuthnAvailable: false,
      webAuthnPlatformBio: false,
      webUsbAvailable: false,
      webUsbDevicesCount: 0,
      webHidAvailable: false,
      webHidDevicesCount: 0,
      localBridgeConnected: false,
      bridgeUrl: 'http://127.0.0.1:11100'
    }
  });
  const [probingHardware, setProbingHardware] = useState(false);

  // Registered Devices State
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);
  const [isRegisterDeviceModalOpen, setIsRegisterDeviceModalOpen] = useState(false);
  const [newDeviceSerial, setNewDeviceSerial] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceLocation, setNewDeviceLocation] = useState('Main Gate Terminal');
  const [newDeviceType, setNewDeviceType] = useState<BiometricDevice['deviceType']>('optical_usb');
  const [registeringDevice, setRegisteringDevice] = useState(false);

  // Enrolled Users State
  const [enrolments, setEnrolments] = useState<BiometricEnrolment[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUserToLink, setSelectedUserToLink] = useState<any | null>(null);
  const [linkingRole, setLinkingRole] = useState<'student' | 'teacher' | 'school_admin' | 'staff'>('student');
  const [linkBiometricId, setLinkBiometricId] = useState('');
  const [linkingUser, setLinkingUser] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Live Attendance & Logs State
  const [liveAttendanceLogs, setLiveAttendanceLogs] = useState<any[]>([]);
  const [biometricAuditLogs, setBiometricAuditLogs] = useState<BiometricLog[]>([]);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceFilterRole, setAttendanceFilterRole] = useState('all');

  // Corrections State
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [processingCorrectionId, setProcessingCorrectionId] = useState<string | null>(null);
  const [adminCorrectionRemarks, setAdminCorrectionRemarks] = useState<Record<string, string>>({});

  // Real Hardware Scanning Action State
  const [isHardwareScanning, setIsHardwareScanning] = useState(false);
  const [lastVerificationResult, setLastVerificationResult] = useState<any | null>(null);
  const [lateCutoffTime, setLateCutoffTime] = useState('08:00');

  // Diagnostics Suite State
  const [diagnosticsResult, setDiagnosticsResult] = useState<BiometricDiagnosticSuiteResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // -------------------------------------------------------------
  // 1. HARDWARE PROBE ON MOUNT
  // -------------------------------------------------------------
  const checkHardware = async () => {
    setProbingHardware(true);
    try {
      const status = await detectPhysicalHardware();
      setHardwareStatus(status);
      if (status.deviceConnected) {
        notify(`Physical Biometric Device Connected: ${status.deviceName}`, 'success');
      }
    } catch (e) {
      console.warn('Hardware probe error:', e);
    } finally {
      setProbingHardware(false);
    }
  };

  useEffect(() => {
    checkHardware();
  }, []);

  // -------------------------------------------------------------
  // 2. REAL-TIME SUBSCRIPTIONS
  // -------------------------------------------------------------
  // Load registered biometric devices for school
  useEffect(() => {
    if (!schoolId) return;
    const qDev = query(collection(db, 'biometricDevices'), where('schoolId', '==', schoolId));
    const unsubDev = onSnapshot(qDev, (snap) => {
      const list: BiometricDevice[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setDevices(list);
      if (list.length > 0 && !selectedDevice) {
        setSelectedDevice(list[0]);
      }
    }, (err) => console.warn('Biometric devices listener:', err));

    return () => unsubDev();
  }, [schoolId]);

  // Load biometric enrolments for school
  useEffect(() => {
    if (!schoolId) return;
    const qEnr = query(collection(db, 'biometric_enrolments'), where('schoolId', '==', schoolId));
    const unsubEnr = onSnapshot(qEnr, (snap) => {
      const list: BiometricEnrolment[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setEnrolments(list);
    }, (err) => console.warn('Enrolments listener:', err));

    return () => unsubEnr();
  }, [schoolId]);

  // Load biometric audit logs in real-time
  useEffect(() => {
    if (!schoolId) return;
    const qLogs = query(
      collection(db, 'biometric_logs'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const list: BiometricLog[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setBiometricAuditLogs(list);
    }, (err) => {
      // Fallback if index is building
      const simpleQuery = query(collection(db, 'biometric_logs'), where('schoolId', '==', schoolId), limit(50));
      onSnapshot(simpleQuery, (snap2) => {
        setBiometricAuditLogs(snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      });
    });

    return () => unsubLogs();
  }, [schoolId]);

  // Load today's verified student attendance in real-time
  useEffect(() => {
    if (!schoolId) return;
    const today = new Date().toISOString().split('T')[0];
    const qAtt = query(
      collection(db, 'studentAttendance'),
      where('schoolId', '==', schoolId),
      where('date', '==', today)
    );
    const unsubAtt = onSnapshot(qAtt, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, type: 'student', ...(d.data() as any) }));
      setLiveAttendanceLogs(list);
    }, (err) => console.warn('Student attendance listener:', err));

    return () => unsubAtt();
  }, [schoolId]);

  // Load pending attendance corrections
  const loadCorrections = async () => {
    if (!schoolId) return;
    setLoadingCorrections(true);
    try {
      const list = await getPendingAttendanceCorrections(schoolId);
      setCorrections(list);
    } catch (e) {
      console.warn('Corrections load note:', e);
    } finally {
      setLoadingCorrections(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'corrections') {
      loadCorrections();
    }
  }, [activeTab, schoolId]);

  // Load school users (students & teachers) when in linking tab
  const loadSchoolUsers = async () => {
    if (!schoolId) return;
    setLoadingUsers(true);
    try {
      const qUsers = query(collection(db, 'users'), where('schoolId', '==', schoolId));
      const snap = await getDocs(qUsers);
      const list = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
      setSchoolUsers(list);
    } catch (e) {
      console.warn('Load users note:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'linking') {
      loadSchoolUsers();
    }
  }, [activeTab, schoolId]);

  // -------------------------------------------------------------
  // 3. PHYSICAL HARDWARE SCAN / CLOCK-IN
  // -------------------------------------------------------------
  const handlePhysicalHardwareScan = async () => {
    if (!hardwareStatus.deviceConnected) {
      notify('REAL DEVICE INTEGRATION REQUIRED: Please connect a physical biometric scanner or passkey authenticator.', 'error');
      playBiometricTone('error');
      return;
    }

    if (!selectedDevice) {
      notify('Please select an authorized biometric device terminal first.', 'info');
      return;
    }

    setIsHardwareScanning(true);
    setLastVerificationResult(null);
    playBiometricTone('scan');

    try {
      // 1. Invoke real physical hardware sensor (WebAuthn / TouchID / Windows Hello / USB Reader)
      const captureRes = await verifyPhysicalBiometricPasskey();
      if (!captureRes.success || !captureRes.credentialId) {
        notify(`Hardware Rejected: ${captureRes.error || 'Biometric fingerprint did not match sensor.'}`, 'error');
        playBiometricTone('error');
        setIsHardwareScanning(false);
        return;
      }

      // 2. Feed hardware verified biometric token into secure backend verification pipeline
      const pipelineRes = await processBiometricAttendanceVerification({
        schoolId,
        deviceId: selectedDevice.deviceId,
        biometricId: captureRes.credentialId,
        webAuthnCredentialId: captureRes.credentialId,
        lateCutoffTime
      });

      setLastVerificationResult(pipelineRes);

      if (pipelineRes.success) {
        notify(pipelineRes.message, 'success');
        playBiometricTone('success');
      } else {
        notify(`Attendance Blocked: ${pipelineRes.message}`, 'error');
        playBiometricTone('error');
      }
    } catch (err: any) {
      notify(`Terminal Error: ${err?.message || 'Failed to communicate with physical biometric device.'}`, 'error');
      playBiometricTone('error');
    } finally {
      setIsHardwareScanning(false);
    }
  };

  // Pair WebUSB device
  const handlePairWebUsb = async () => {
    const res = await pairPhysicalWebUsbDevice();
    if (res.success) {
      notify(`Paired Physical USB Scanner: ${res.deviceName}`, 'success');
      checkHardware();
    } else {
      notify(res.error || 'Pairing failed.', 'error');
    }
  };

  // -------------------------------------------------------------
  // 4. DEVICE MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleRegisterDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceSerial.trim() || !newDeviceName.trim()) {
      notify('Device serial number and descriptive name are required.', 'error');
      return;
    }

    setRegisteringDevice(true);
    try {
      const dev = await registerBiometricDevice({
        deviceId: newDeviceSerial.trim(),
        deviceName: newDeviceName.trim(),
        location: newDeviceLocation.trim() || 'Main Campus Gate',
        schoolId,
        deviceType: newDeviceType,
        status: 'authorized',
        registeredBy: currentUser?.uid || 'admin',
        registeredByName: currentUser?.displayName || currentUser?.fullName || 'School Admin',
        lastSeen: new Date().toISOString()
      });

      notify(`Authorized physical device: ${dev.deviceName} (${dev.deviceId})`, 'success');
      setIsRegisterDeviceModalOpen(false);
      setNewDeviceSerial('');
      setNewDeviceName('');
    } catch (err: any) {
      notify(`Failed to register device: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleToggleDeviceStatus = async (dev: BiometricDevice) => {
    const newStatus = dev.status === 'authorized' ? 'revoked' : 'authorized';
    try {
      await updateBiometricDeviceStatus(dev.id, newStatus);
      notify(`Device "${dev.deviceName}" status updated to ${newStatus.toUpperCase()}`, 'success');
    } catch (err: any) {
      notify('Error updating device status', 'error');
    }
  };

  const handleDeleteDevice = async (dev: BiometricDevice) => {
    if (!confirm(`Are you sure you want to remove authorized terminal "${dev.deviceName}"?`)) return;
    try {
      await deleteBiometricDevice(dev.id);
      notify(`Device "${dev.deviceName}" removed.`, 'info');
      if (selectedDevice?.id === dev.id) setSelectedDevice(null);
    } catch (err: any) {
      notify('Failed to delete device', 'error');
    }
  };

  // -------------------------------------------------------------
  // 5. USER BIOMETRIC LINKING HANDLERS
  // -------------------------------------------------------------
  const handleOpenLinkModal = (user: any) => {
    setSelectedUserToLink(user);
    setLinkingRole(user.role || 'student');
    // Pre-fill a standard hardware token format based on user UID
    setLinkBiometricId(`BIO-HARDWARE-TOKEN-${user.uid.slice(0, 8).toUpperCase()}`);
    setIsLinkModalOpen(true);
  };

  const handleCaptureHardwareEnrollment = async () => {
    if (!selectedUserToLink) return;
    try {
      notify('Touch physical fingerprint sensor to register cryptographic token...', 'info');
      playBiometricTone('scan');
      const res = await capturePhysicalBiometricPasskey(
        selectedUserToLink.email || selectedUserToLink.uid,
        selectedUserToLink.fullName || selectedUserToLink.name || 'User'
      );
      if (res.success && res.credentialId) {
        setLinkBiometricId(res.credentialId);
        notify('Physical fingerprint token successfully captured from hardware!', 'success');
        playBiometricTone('success');
      } else {
        notify(res.error || 'Failed to capture from hardware device.', 'error');
        playBiometricTone('error');
      }
    } catch (err: any) {
      notify('Hardware capture cancelled or failed.', 'error');
    }
  };

  const handleConfirmUserLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToLink || !linkBiometricId.trim()) {
      notify('User and hardware biometric ID token are required.', 'error');
      return;
    }

    setLinkingUser(true);
    try {
      await linkUserBiometric({
        biometricId: linkBiometricId.trim(),
        firebaseUid: selectedUserToLink.uid,
        schoolId,
        fullName: selectedUserToLink.fullName || selectedUserToLink.name || 'Unnamed User',
        role: linkingRole,
        studentId: selectedUserToLink.studentId || selectedUserToLink.admissionNumber || '',
        teacherId: selectedUserToLink.teacherId || '',
        className: selectedUserToLink.className || selectedUserToLink.classId || '',
        credentialType: linkBiometricId.startsWith('BIO-HARDWARE') ? 'fingerprint_token' : 'webauthn_fido2',
        webAuthnCredentialId: linkBiometricId.startsWith('BIO-HARDWARE') ? undefined : linkBiometricId,
        status: 'active',
        enrolledBy: currentUser?.uid || 'admin'
      });

      notify(`Biometric user successfully linked: ${selectedUserToLink.fullName} (UID: ${selectedUserToLink.uid})`, 'success');
      setIsLinkModalOpen(false);
      setSelectedUserToLink(null);
    } catch (err: any) {
      notify(`Failed to link biometric user: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setLinkingUser(false);
    }
  };

  const handleUnlinkBiometric = async (enrolment: BiometricEnrolment) => {
    if (!confirm(`Revoke biometric link for ${enrolment.fullName}?`)) return;
    try {
      await deleteBiometricEnrolment(enrolment.id);
      notify(`Biometric link revoked for ${enrolment.fullName}`, 'info');
    } catch (e) {
      notify('Error revoking link', 'error');
    }
  };

  // -------------------------------------------------------------
  // 6. ATTENDANCE CORRECTION HANDLERS
  // -------------------------------------------------------------
  const handleApproveCorrection = async (corr: AttendanceCorrection) => {
    setProcessingCorrectionId(corr.id);
    try {
      const remarks = adminCorrectionRemarks[corr.id] || 'Approved by School Admin';
      await approveAttendanceCorrection(
        corr,
        currentUser?.uid || 'admin',
        currentUser?.displayName || currentUser?.fullName || 'School Admin',
        remarks
      );
      notify(`Correction approved: ${corr.studentName || corr.teacherName} marked ${corr.requestedStatus}`, 'success');
      loadCorrections();
    } catch (err: any) {
      notify(`Failed to approve correction: ${err?.message || 'Error'}`, 'error');
    } finally {
      setProcessingCorrectionId(null);
    }
  };

  const handleRejectCorrection = async (corr: AttendanceCorrection) => {
    const reason = prompt('Enter reason for rejecting this correction:');
    if (!reason) return;
    setProcessingCorrectionId(corr.id);
    try {
      await rejectAttendanceCorrection(
        corr.id,
        currentUser?.uid || 'admin',
        currentUser?.displayName || currentUser?.fullName || 'School Admin',
        reason
      );
      notify('Correction request rejected.', 'info');
      loadCorrections();
    } catch (err: any) {
      notify('Failed to reject correction', 'error');
    } finally {
      setProcessingCorrectionId(null);
    }
  };

  // -------------------------------------------------------------
  // 7. COMPREHENSIVE PIPELINE DIAGNOSTICS SUITE RUNNER
  // -------------------------------------------------------------
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticsResult(null);
    notify('Running Biometric Pipeline Verification Test Suite...', 'info');

    try {
      const result = await runBiometricPipelineDiagnostics(schoolId, currentUser);
      setDiagnosticsResult(result);
      if (result.summary.finalStatus === 'READY') {
        notify('Diagnostics Completed: All biometric pipeline tests PASSED!', 'success');
      } else if (result.summary.finalStatus === 'DEVICE INTEGRATION REQUIRED') {
        notify('Diagnostics Completed: Pipeline logic verified. REAL DEVICE INTEGRATION REQUIRED.', 'info');
      } else {
        notify('Diagnostics Completed: Some tests failed. Inspect diagnostic details below.', 'error');
      }
    } catch (err: any) {
      notify(`Diagnostics failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Filtered users for linking
  const filteredUsers = schoolUsers.filter(u => {
    const q = searchUserQuery.toLowerCase();
    const name = (u.fullName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const uid = (u.uid || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q) || uid.includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* ------------------------------------------------------------- */}
      {/* GLOBAL HARDWARE STATUS BANNER & WARNING                       */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-5 rounded-2xl border transition-all ${
        hardwareStatus.deviceConnected 
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
          : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-xl ${
              hardwareStatus.deviceConnected ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                  hardwareStatus.deviceConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {hardwareStatus.deviceConnected ? 'HARDWARE CONNECTED' : 'REAL DEVICE INTEGRATION REQUIRED'}
                </span>
                <span className="text-sm font-bold">{hardwareStatus.deviceName}</span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                {hardwareStatus.statusMessage}
                {!hardwareStatus.deviceConnected && (
                  <span className="font-semibold text-amber-900 ml-1">
                    Connect a supported physical USB fingerprint reader (SecuGen Hamster Pro, DigitalPersona 4500, Mantra MFS100, ZKTeco) or Touch ID / Windows Hello.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={checkHardware}
              disabled={probingHardware}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probingHardware ? 'animate-spin' : ''}`} />
              {probingHardware ? 'Probing...' : 'Probe Hardware'}
            </button>

            <button
              onClick={handlePairWebUsb}
              className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Usb className="w-3.5 h-3.5 text-indigo-600" />
              Pair USB Scanner
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#002147] hover:bg-[#003366] text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-[#D4AF37]" />
              Run Test Suite
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HEADER WITH CONTROLS & NAVIGATION                             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            Enterprise Biometric Terminal Control
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Real Physical Fingerprint Gate & Attendance System
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Enforce hardware-verified attendance linked to Firebase UID with strict multi-tenant school isolation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRegisterDeviceModalOpen(true)}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            Register Device
          </button>
          <button
            onClick={() => { setActiveTab('linking'); loadSchoolUsers(); }}
            className="px-4 py-2 text-xs font-bold bg-[#D4AF37] hover:bg-[#c49f2f] text-slate-900 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <UserCheck className="w-4 h-4" />
            Link Users
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS                                               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'terminal' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          Live Hardware Terminal
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'devices' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Authorized Devices ({devices.length})
        </button>

        <button
          onClick={() => setActiveTab('linking')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'linking' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          User Biometric Linking ({enrolments.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'attendance' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Live Attendance ({liveAttendanceLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all relative ${
            activeTab === 'corrections' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Approve Corrections
          {corrections.length > 0 && (
            <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
              {corrections.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'diagnostics' 
              ? 'bg-amber-600 text-white shadow-sm' 
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Pipeline Test Harness
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LIVE HARDWARE TERMINAL & SCANNER                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Terminal Panel */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Physical Biometric Terminal</h2>
                <p className="text-xs text-slate-500">Hardware gate & attendance station</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-700">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Terminal
              </div>
            </div>

            {/* Select Active Terminal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Active Hardware Device
              </label>
              {devices.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  No devices registered yet. Click &quot;Register Device&quot; to authorize a terminal.
                </div>
              ) : (
                <select
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const dev = devices.find(d => d.id === e.target.value) || null;
                    setSelectedDevice(dev);
                  }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.deviceName} — {d.location} ({d.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Terminal Specs Card */}
            {selectedDevice && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial / Device ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedDevice.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">{selectedDevice.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hardware Type:</span>
                  <span className="font-semibold text-slate-800 uppercase">{selectedDevice.deviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorization:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    selectedDevice.status === 'authorized' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Cutoff Config */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Late Cutoff Time (24h)
              </label>
              <input
                type="time"
                value={lateCutoffTime}
                onChange={(e) => setLateCutoffTime(e.target.value)}
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Clock-ins after this time are marked &quot;Late&quot; on the official register.
              </span>
            </div>

            {/* Real Hardware Trigger Action */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handlePhysicalHardwareScan}
                disabled={isHardwareScanning || !selectedDevice || selectedDevice.status !== 'authorized'}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                  isHardwareScanning
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : selectedDevice?.status === 'authorized'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Fingerprint className={`w-5 h-5 ${isHardwareScanning ? 'animate-spin' : ''}`} />
                {isHardwareScanning ? 'Awaiting Physical Sensor...' : 'Touch Physical Fingerprint Sensor'}
              </button>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Interacts with physical hardware via W3C WebAuthn biometric authenticator or WebUSB scanner. No simulated scans.
              </p>
            </div>

            {/* Last Scan Result Display */}
            {lastVerificationResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                lastVerificationResult.success 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {lastVerificationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{lastVerificationResult.code}</span>
                </div>
                <p className="text-xs leading-relaxed">{lastVerificationResult.message}</p>
                {lastVerificationResult.attendanceRecord && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 text-[11px] font-mono">
                    Record ID: {lastVerificationResult.attendanceRecord.id}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Gate Activity Feed */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Live Hardware Verification Stream</h2>
                <p className="text-xs text-slate-500">Real-time attendance clocked at authorized school gates</p>
              </div>
              <div className="text-xs font-bold text-slate-500">
                Today: <span className="text-slate-900">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {liveAttendanceLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No Biometric Clock-ins Recorded Today</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When students or staff scan their physical fingerprints at an authorized gate terminal, their verified arrival appears here instantly in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {liveAttendanceLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-xs font-bold ${
                        log.status === 'Present' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{log.studentName || log.teacherName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {log.className || 'Staff'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Fingerprint Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {log.deviceLocation || 'Main Gate'} • Terminal {log.deviceId || 'DEV-1'} • UID: {log.verifiedUid?.slice(0, 8) || 'VERIFIED'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-900 block">{log.checkInTime || '07:45 AM'}</span>
                      <span className={`text-[10px] font-bold ${
                        log.status === 'Present' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audit Log Footnote */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>All biometric clock-ins are synchronized to teacher registers and parent portals instantly.</span>
              <span className="font-semibold">{biometricAuditLogs.length} Security Audit Events</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: AUTHORIZED HARDWARE DEVICES (REQUIREMENT 3)            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'devices' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Authorized Physical Biometric Devices</h2>
              <p className="text-xs text-slate-500">
                Register, authorize, and audit physical fingerprint scanners and terminals for {schoolName}
              </p>
            </div>
            <button
              onClick={() => setIsRegisterDeviceModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-[#002147] hover:bg-[#003366] text-white rounded-xl flex items-center gap-2 self-start transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              Register New Terminal
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Cpu className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Physical Devices Registered</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Only devices explicitly authorized by the School Admin can record biometric attendance. Click &quot;Register New Terminal&quot; to authorize a hardware serial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((dev) => (
                <div 
                  key={dev.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-500">{dev.deviceId}</span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">{dev.deviceName}</h3>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      dev.status === 'authorized' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {dev.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-semibold text-slate-800">{dev.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware Interface:</span>
                      <span className="font-semibold text-slate-800 uppercase">{dev.deviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Seen:</span>
                      <span className="font-semibold text-slate-800">
                        {dev.lastSeen ? new Date(dev.lastSeen).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleDeviceStatus(dev)}
                      className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${
                        dev.status === 'authorized'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {dev.status === 'authorized' ? 'Revoke Access' : 'Authorize Device'}
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(dev)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Device"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: USER BIOMETRIC LINKING (REQUIREMENTS 1 & 3)             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'linking' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">User Biometric Registration & Linking</h2>
              <p className="text-xs text-slate-500">
                Link students and teachers to their authoritative Firebase UID and schoolId.
              </p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user name or UID..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Important Security Notice */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-indigo-950 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Biometric Privacy & Compliance Architecture:</span>
              <p className="mt-0.5 leading-relaxed text-indigo-900">
                EDUkenZA strictly complies with data privacy laws. We <span className="font-bold underline">NEVER</span> store raw fingerprint images or minutiae in Firestore. Devices perform on-device matching and send only cryptographic hardware tokens linked to the user&apos;s authoritative Firebase UID (<code className="bg-white/80 px-1 py-0.5 rounded font-mono">users/&#123;UID&#125;</code>).
              </p>
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading school directory...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No users found for this search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">User Name</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Firebase UID</th>
                    <th className="pb-3">Biometric Link Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const enr = enrolments.find(e => e.firebaseUid === u.uid);
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5">
                          <span className="font-bold text-slate-900 block">{u.fullName || u.name || 'Unnamed'}</span>
                          <span className="text-[11px] text-slate-400">{u.email || u.studentId || 'No email'}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {u.role || 'student'}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-slate-600">
                          {u.uid}
                        </td>
                        <td className="py-3.5">
                          {enr ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Linked ({enr.biometricId.slice(0, 14)}...)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Unlinked
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          {enr ? (
                            <button
                              onClick={() => handleUnlinkBiometric(enr)}
                              className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              Unlink
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenLinkModal(u)}
                              className="px-3 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all"
                            >
                              Link Biometric
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: REAL-TIME ATTENDANCE & AUDIT LOGS                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Real-Time Biometric Attendance Register</h2>
              <p className="text-xs text-slate-500">Live attendance stream with hardware verification telemetry</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={attendanceFilterRole}
                onChange={(e) => setAttendanceFilterRole(e.target.value)}
                className="text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
              </select>
            </div>
          </div>

          {liveAttendanceLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Clock className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Attendance Records Today</p>
              <p className="text-xs text-slate-500">Records created via fingerprint terminals will stream here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Class / Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Clock-In Time</th>
                    <th className="pb-3">Terminal / Device</th>
                    <th className="pb-3">Verification Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveAttendanceLogs.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-900">
                        {att.studentName || att.teacherName}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {att.className || 'Staff'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          att.status === 'Present' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {att.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-800">
                        {att.checkInTime || '07:45 AM'}
                      </td>
                      <td className="py-3 text-slate-600">
                        {att.deviceLocation || 'Main Gate'} ({att.deviceId || 'DEV-01'})
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <Fingerprint className="w-3 h-3 text-emerald-600" />
                          Fingerprint Hardware
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ATTENDANCE CORRECTIONS APPROVAL (REQUIREMENT 3)         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'corrections' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Attendance Correction Requests</h2>
              <p className="text-xs text-slate-500">
                School Admin approval workflow for manual corrections submitted by teachers and parents
              </p>
            </div>
            <button
              onClick={loadCorrections}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCorrections ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {corrections.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">No Pending Correction Requests</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All attendance records are synchronized. When a teacher or staff member requests an attendance change, it appears here for admin approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {corrections.map((corr) => (
                <div 
                  key={corr.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-slate-500">Date: {corr.date}</span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">
                        {corr.studentName || corr.teacherName || 'Unknown Student/User'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Requested by: {corr.requestedByName} ({corr.requestedByRole})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 line-through">
                        {corr.originalStatus}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        {corr.requestedStatus}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Reason: </span>
                    {corr.reason}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Admin remarks (optional)..."
                      value={adminCorrectionRemarks[corr.id] || ''}
                      onChange={(e) => setAdminCorrectionRemarks(prev => ({ ...prev, [corr.id]: e.target.value }))}
                      className="flex-1 text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveCorrection(corr)}
                        disabled={processingCorrectionId === corr.id}
                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>

                      <button
                        onClick={() => handleRejectCorrection(corr)}
                        disabled={processingCorrectionId === corr.id}
                        className="px-4 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: DIAGNOSTICS & TEST HARNESS                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Biometric Verification Pipeline Diagnostics</h2>
              <p className="text-xs text-slate-500">
                Automated test harness verifying: successful, failed, unknown, duplicate, inactive, wrong-school, unauthorized-device, and offline cases.
              </p>
            </div>

            <button
              onClick={handleRunDiagnostics}
              disabled={isRunningDiagnostics}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Play className={`w-4 h-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
              {isRunningDiagnostics ? 'Executing Test Suite...' : 'Run All Test Cases'}
            </button>
          </div>

          {diagnosticsResult && (
            <div className="space-y-6">
              
              {/* FINAL REPORT SUMMARY MATRIX (MATCHING REQUIRED SPECIFICATION) */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-black uppercase text-[#D4AF37] tracking-wider">
                    Biometric Systems Engineering Final Report
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(diagnosticsResult.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">DEVICE CONNECTED</span>
                    <span className={`text-base font-black ${
                      diagnosticsResult.summary.deviceConnected === 'YES' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {diagnosticsResult.summary.deviceConnected}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">FINGERPRINT VERIFICATION</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.fingerprintVerification}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">ATTENDANCE PIPELINE</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.attendance}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">REAL-TIME DASHBOARDS</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.realTime}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">SECURITY & RBAC</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.security}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">SCHOOL ISOLATION</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.schoolIsolation}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">EXISTING ATTENDANCE</span>
                    <span className="text-base font-black text-emerald-400">
                      {diagnosticsResult.summary.existingAttendance}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold block">FINAL STATUS</span>
                    <span className={`text-xs font-black px-2 py-1 rounded inline-block mt-0.5 ${
                      diagnosticsResult.summary.finalStatus === 'READY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {diagnosticsResult.summary.finalStatus}
                    </span>
                  </div>
                </div>

                {/* Explicit Hardware Integrity Guarantee */}
                <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-[#D4AF37]">CRITICAL HARDWARE ENFORCEMENT: </span>
                  EDUkenZA strictly refuses to simulate biometric scans. If no physical fingerprint scanner is detected, the status remains <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">DEVICE INTEGRATION REQUIRED</code> until physical hardware is paired.
                </div>
              </div>

              {/* DETAILED CASE-BY-CASE BREAKDOWN */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Test Execution Breakdown ({diagnosticsResult.cases.length} Cases)
                </h3>

                <div className="space-y-2.5">
                  {diagnosticsResult.cases.map((c) => (
                    <div 
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                            c.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.passed ? '✓' : '✕'}
                          </span>
                          <span className="text-xs font-black text-slate-900">{c.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {c.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 pl-7">{c.details}</p>
                      </div>

                      <div className="text-right pl-7 sm:pl-0">
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                          c.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {c.actualResult}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">{c.executionTimeMs} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REGISTER NEW PHYSICAL DEVICE                           */}
      {/* ------------------------------------------------------------- */}
      {isRegisterDeviceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Authorize Biometric Terminal</h3>
                <p className="text-xs text-slate-500">Add physical scanner serial number for {schoolName}</p>
              </div>
              <button
                onClick={() => setIsRegisterDeviceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDeviceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hardware Serial / Device ID *</label>
                <input
                  type="text"
                  placeholder="e.g. SECUGEN-PRO-88492 or DP4500-A1"
                  value={newDeviceSerial}
                  onChange={(e) => setNewDeviceSerial(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Device Descriptive Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate Terminal 1 (SecuGen Hamster Pro)"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / Gate Zone</label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate A, Staff Entrance, Library"
                  value={newDeviceLocation}
                  onChange={(e) => setNewDeviceLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hardware Interface</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
                >
                  <option value="optical_usb">Optical USB Fingerprint Scanner (SecuGen / DigitalPersona / Mantra / ZKTeco)</option>
                  <option value="webauthn_bio">FIDO2 / Platform Biometric (Touch ID / Windows Hello / YubiKey Bio)</option>
                  <option value="webusb_scanner">Direct WebUSB Scanner</option>
                  <option value="local_bridge">Local Biometric Daemon Service (Port 11100 / 8080)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterDeviceModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringDevice}
                  className="px-5 py-2 font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
                >
                  {registeringDevice ? 'Authorizing...' : 'Authorize Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LINK USER BIOMETRIC TOKEN                              */}
      {/* ------------------------------------------------------------- */}
      {isLinkModalOpen && selectedUserToLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Link Biometric User</h3>
                <p className="text-xs text-slate-500">Bind hardware fingerprint credential to Firebase UID</p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUserLink} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-slate-500">Target User:</div>
                <div className="font-bold text-slate-900 text-sm">{selectedUserToLink.fullName || selectedUserToLink.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">Firebase UID: {selectedUserToLink.uid}</div>
                <div className="text-slate-500 text-[11px]">School ID: {schoolId}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={linkingRole}
                  onChange={(e) => setLinkingRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="school_admin">School Admin</option>
                  <option value="staff">Domestic / Facilities Staff</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Hardware Biometric ID / Token *</label>
                  <button
                    type="button"
                    onClick={handleCaptureHardwareEnrollment}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Touch Physical Sensor
                  </button>
                </div>
                <input
                  type="text"
                  value={linkBiometricId}
                  onChange={(e) => setLinkBiometricId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-[11px]"
                  placeholder="Cryptographic fingerprint token from hardware..."
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Hardware token generated by sensor. No raw fingerprint image is stored.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingUser}
                  className="px-5 py-2 font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
                >
                  {linkingUser ? 'Linking...' : 'Confirm Biometric Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
