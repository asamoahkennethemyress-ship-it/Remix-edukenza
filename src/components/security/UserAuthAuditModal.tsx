import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Server, 
  User, 
  Key, 
  Building2, 
  Mail, 
  ExternalLink,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../../firebase/config';

interface UserAuditResult {
  source: 'client' | 'server' | 'combined';
  targetEmail: string;
  recordExists: boolean;
  storedUid: string | null;
  authExpectedUid: string | null;
  isUidMatch: boolean;
  userData: {
    uid?: string;
    email?: string;
    fullName?: string;
    role?: string;
    schoolId?: string;
    schoolName?: string;
    status?: string;
    createdAt?: string;
  } | null;
  directDoc9DJH?: {
    exists: boolean;
    data: any | null;
  };
  serverPayload?: any;
  diagnosis: string;
  timestamp: string;
}

export const UserAuthAuditModal: React.FC = () => {
  const [emailInput, setEmailInput] = useState('kennethasamoa@gmail.com');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<UserAuditResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'visual' | 'json'>('visual');
  const [authProviderStatus, setAuthProviderStatus] = useState<any>(null);

  const fetchProviderStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthProviderStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch auth provider status:', e);
    }
  };

  const runAudit = async (targetEmail = emailInput) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    setLoading(true);

    try {
      // 1. Client-Side Firestore Query
      let clientRecordExists = false;
      let clientStoredUid: string | null = null;
      let clientUserData: any = null;
      let directDocCheck = { exists: false, data: null as any };

      try {
        const directRef = doc(db, 'users', '9DJH0qjNvbRq36hqwh1Awc3AXQq2');
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          directDocCheck.exists = true;
          directDocCheck.data = directSnap.data();
        }
      } catch (e) {
        console.warn('Client direct doc lookup warning:', e);
      }

      try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', cleanEmail));
        const snap = await getDocs(q);

        if (!snap.empty) {
          clientRecordExists = true;
          const first = snap.docs[0];
          clientStoredUid = first.id;
          clientUserData = first.data();
        } else if (directDocCheck.exists && String(directDocCheck.data?.email || '').toLowerCase() === cleanEmail) {
          clientRecordExists = true;
          clientStoredUid = '9DJH0qjNvbRq36hqwh1Awc3AXQq2';
          clientUserData = directDocCheck.data;
        }
      } catch (e) {
        console.warn('Client query error:', e);
      }

      // 2. Server-Side API Query
      let serverData: any = null;
      try {
        const res = await fetch(`/api/debug/check-user?email=${encodeURIComponent(cleanEmail)}`);
        if (res.ok) {
          serverData = await res.json();
        }
      } catch (err) {
        console.warn('Server debug API fetch error:', err);
      }

      const expectedUid = cleanEmail === 'kennethasamoa@gmail.com' ? '9DJH0qjNvbRq36hqwh1Awc3AXQq2' : null;
      const finalStoredUid = serverData?.storedUid || clientStoredUid;
      const finalExists = serverData?.recordExists || clientRecordExists;
      const finalUserData = serverData?.userData || clientUserData;
      const isMatch = expectedUid && finalStoredUid ? finalStoredUid === expectedUid : false;

      let diagnosisMsg = '';
      if (finalExists) {
        diagnosisMsg = `Firestore Document Found. Stored Document UID: "${finalStoredUid}". Role: "${finalUserData?.role || 'N/A'}", School: "${finalUserData?.schoolName || finalUserData?.schoolId || 'N/A'}". ${expectedUid ? (isMatch ? 'PERFECT MATCH with Auth UID.' : 'UID mismatch with Auth UID.') : ''}`;
      } else {
        diagnosisMsg = `No Firestore document found for "${cleanEmail}" in collection "users".`;
      }

      setAuditResult({
        source: serverData ? 'combined' : 'client',
        targetEmail: cleanEmail,
        recordExists: finalExists,
        storedUid: finalStoredUid,
        authExpectedUid: expectedUid,
        isUidMatch: isMatch,
        userData: finalUserData,
        directDoc9DJH: directDocCheck,
        serverPayload: serverData,
        diagnosis: diagnosisMsg,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Audit execution error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderStatus();
    runAudit('kennethasamoa@gmail.com');
  }, []);

  const handleCopyJson = () => {
    if (auditResult) {
      navigator.clipboard.writeText(JSON.stringify(auditResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">User Firestore UID & Auth Match Audit Utility</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/30 text-indigo-200 rounded-full border border-indigo-400/30">
                Server + Client Dual Verify
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Queries Firestore database <code className="text-amber-300 font-mono">{firebaseConfig.projectId}</code> collection <code className="text-amber-300 font-mono">users</code> to verify record existence and stored UID match.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveViewMode(activeViewMode === 'visual' ? 'json' : 'visual')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <Code className="w-3.5 h-3.5" />
            {activeViewMode === 'visual' ? 'View Raw JSON' : 'Visual Mode'}
          </button>
          <button
            onClick={() => runAudit(emailInput)}
            disabled={loading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run UID Audit
          </button>
        </div>
      </div>

      {/* Quick Search & Preset Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-96">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAudit(emailInput)}
              placeholder="Enter user email (e.g. kennethasamoa@gmail.com)"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={() => runAudit(emailInput)}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
          >
            Check
          </button>
        </div>

        {/* Quick Fill Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Presets:</span>
          <button
            onClick={() => {
              setEmailInput('kennethasamoa@gmail.com');
              runAudit('kennethasamoa@gmail.com');
            }}
            className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded text-xs font-bold shadow-xs transition"
          >
            Kenneth (Admin)
          </button>
          <button
            onClick={() => {
              setEmailInput('asamoahkennethemyress@gmail.com');
              runAudit('asamoahkennethemyress@gmail.com');
            }}
            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-xs font-medium transition"
          >
            Platform Owner
          </button>
          <button
            onClick={() => {
              setEmailInput('teacher@school.edu');
              runAudit('teacher@school.edu');
            }}
            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-xs font-medium transition"
          >
            Teacher
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Querying Firestore & Backend Debug Services...</p>
            <p className="text-xs text-slate-400 font-mono">Checking `users` collection for {emailInput}...</p>
          </div>
        ) : !auditResult ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Click &quot;Run UID Audit&quot; to inspect Firestore user records.
          </div>
        ) : activeViewMode === 'json' ? (
          /* JSON View */
          <div className="relative">
            <button
              onClick={handleCopyJson}
              className="absolute top-3 right-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96">
              {JSON.stringify(auditResult, null, 2)}
            </pre>
          </div>
        ) : (
          /* Visual Cards */
          <div className="space-y-6">
            {/* Firebase Auth Sign-in Provider Status Card */}
            {authProviderStatus && (
              <div className={`p-4 rounded-xl border ${
                authProviderStatus.emailPasswordProviderEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {authProviderStatus.emailPasswordProviderEnabled ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">
                          Firebase Auth Provider: Email/Password
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                          authProviderStatus.emailPasswordProviderEnabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}>
                          {authProviderStatus.emailPasswordProviderEnabled ? 'ACTIVE & ENABLED' : 'DISABLED IN FIREBASE CONSOLE'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          (Project: {authProviderStatus.projectId})
                        </span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">
                        {authProviderStatus.emailPasswordProviderEnabled
                          ? 'Email/Password authentication provider is verified active. Student and staff password logins are operational.'
                          : 'Student and staff password sign-in requires Email/Password provider to be enabled in your Firebase project console.'}
                      </p>
                      {!authProviderStatus.emailPasswordProviderEnabled && authProviderStatus.instructions && (
                        <div className="mt-2.5 p-2.5 bg-amber-100/60 rounded-lg border border-amber-200 text-[11px] space-y-1">
                          <p className="font-bold text-amber-900">How to Enable in Firebase Console:</p>
                          <ol className="list-decimal list-inside space-y-0.5 text-amber-900/90 font-medium">
                            <li>Open the Firebase Console: <a href={authProviderStatus.instructions.consoleUrl} target="_blank" rel="noreferrer" className="underline font-bold text-indigo-700 hover:text-indigo-900">Authentication &gt; Sign-in method</a></li>
                            <li>Under <strong>Sign-in providers</strong>, click <strong>Email/Password</strong></li>
                            <li>Switch the toggle for <strong>Email/Password</strong> to <strong>Enabled</strong> and click <strong>Save</strong></li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={fetchProviderStatus}
                    className="p-1.5 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-700 transition shrink-0"
                    title="Refresh Provider Status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Primary Status Banner */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              auditResult.recordExists && (auditResult.isUidMatch || !auditResult.authExpectedUid)
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : auditResult.recordExists
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {auditResult.recordExists ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base">
                      {auditResult.recordExists ? 'Firestore User Record Found' : 'User Record Not Found in Firestore'}
                    </span>
                    {auditResult.isUidMatch && (
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-extrabold rounded-full">
                        AUTH UID MATCH CONFIRMED
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 font-medium opacity-90">{auditResult.diagnosis}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500">Target Email:</span>
                <span className="px-2.5 py-1 bg-white border border-slate-300 font-mono text-xs font-bold rounded-lg text-slate-900">
                  {auditResult.targetEmail}
                </span>
              </div>
            </div>

            {/* Diagnostic Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Stored Document UID */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>STORED FIRESTORE UID</span>
                  <Key className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="font-mono text-sm font-black text-indigo-900 break-all">
                  {auditResult.storedUid || 'NOT FOUND'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Path: <code className="text-slate-700">users/{auditResult.storedUid || '...'}</code>
                </div>
              </div>

              {/* Card 2: Auth Expected UID */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>EXPECTED AUTH UID</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-mono text-sm font-black text-slate-900 break-all">
                  {auditResult.authExpectedUid || 'N/A (Generic Check)'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Match Status: {auditResult.isUidMatch ? (
                    <span className="text-emerald-600 font-bold">100% Exact Match</span>
                  ) : auditResult.authExpectedUid ? (
                    <span className="text-rose-600 font-bold">Mismatch</span>
                  ) : (
                    'Verified'
                  )}
                </div>
              </div>

              {/* Card 3: Role & Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>ROLE & STATUS</span>
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-black text-slate-900 capitalize">
                  {auditResult.userData?.role || 'None'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                  Status: 
                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                    auditResult.userData?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {auditResult.userData?.status || 'active'}
                  </span>
                </div>
              </div>

              {/* Card 4: School Assignment */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>SCHOOL ASSIGNMENT</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm font-black text-slate-900 truncate" title={auditResult.userData?.schoolName}>
                  {auditResult.userData?.schoolName || auditResult.userData?.schoolId || 'None'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
                  ID: {auditResult.userData?.schoolId || 'None'}
                </div>
              </div>
            </div>

            {/* Server Endpoint Diagnostics Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Server-Side Debug Endpoint Details
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  GET /api/debug/check-user?email={auditResult.targetEmail}
                </span>
              </div>

              <div className="p-4 bg-white space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 font-bold">Firebase Project:</span>
                    <p className="font-mono text-slate-900 font-semibold">{firebaseConfig.projectId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Firestore Database ID:</span>
                    <p className="font-mono text-slate-900 font-semibold">{firebaseConfig.firestoreDatabaseId || '(default)'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Last Audited Timestamp:</span>
                    <p className="font-mono text-slate-900">{new Date(auditResult.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {auditResult.serverPayload?.allMatchingRecords && auditResult.serverPayload.allMatchingRecords.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-700 mb-2 block">Matching Documents in `users` Collection:</span>
                    <div className="space-y-1.5">
                      {auditResult.serverPayload.allMatchingRecords.map((rec: any, i: number) => (
                        <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between font-mono text-[11px]">
                          <span>
                            Doc ID: <strong className="text-indigo-700">{rec.docId}</strong> ({rec.email})
                          </span>
                          <span className="text-slate-600">
                            Role: <strong>{rec.role}</strong> | School: <strong>{rec.schoolName || rec.schoolId}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
