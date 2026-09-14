import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Smartphone, 
  Laptop, 
  Tablet, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Key, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Shield,
  Clock,
  Info
} from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { logSecurityEvent } from '../../services/securityAuditService';

export interface BiometricCredentialItem {
  id: string;
  credentialId: string;
  deviceName: string;
  registeredAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
  revokedAt?: string;
  deviceType?: 'phone' | 'laptop' | 'tablet' | 'desktop';
}

export const BiometricPasskeysSettings: React.FC = () => {
  const { currentUser, registerBiometricDevice, showToast } = useAuth();
  const [credentials, setCredentials] = useState<BiometricCredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCredToRevoke, setSelectedCredToRevoke] = useState<BiometricCredentialItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  const localCredId = localStorage.getItem('edukenza_biometric_cred_id');
  const localBoundUid = localStorage.getItem('edukenza_biometric_uid');

  // Load registered biometric credentials from Firestore in real-time
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const credsRef = collection(db, 'users', currentUser.uid, 'biometricCredentials');
    const unsubscribe = onSnapshot(credsRef, (snapshot) => {
      const items: BiometricCredentialItem[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          credentialId: data.credentialId || d.id,
          deviceName: data.deviceName || 'Registered Passkey Device',
          registeredAt: data.registeredAt || new Date().toISOString(),
          lastUsedAt: data.lastUsedAt,
          status: data.status === 'revoked' ? 'revoked' : 'active',
          revokedAt: data.revokedAt,
          deviceType: data.deviceType || getDeviceTypeFromName(data.deviceName || '')
        };
      });

      // Sort: active first, then newest registered
      items.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      });

      setCredentials(items);
      setLoading(false);
    }, (err) => {
      console.warn('Error loading biometric credentials from Firestore:', err);
      // Fallback if collection doesn't exist yet
      if (localCredId) {
        setCredentials([{
          id: localCredId,
          credentialId: localCredId,
          deviceName: window.navigator.userAgent.includes('Mac') ? 'MacBook Touch ID' : 'Primary Device Passkey',
          registeredAt: new Date().toISOString(),
          status: 'active',
          deviceType: 'laptop'
        }]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, localCredId]);

  function getDeviceTypeFromName(name: string): 'phone' | 'laptop' | 'tablet' | 'desktop' {
    const n = name.toLowerCase();
    if (n.includes('phone') || n.includes('iphone') || n.includes('android')) return 'phone';
    if (n.includes('pad') || n.includes('tablet')) return 'tablet';
    if (n.includes('mac') || n.includes('laptop') || n.includes('book')) return 'laptop';
    return 'desktop';
  }

  function getDeviceIcon(type?: string) {
    switch (type) {
      case 'phone': return <Smartphone className="w-5 h-5 text-indigo-600" />;
      case 'tablet': return <Tablet className="w-5 h-5 text-purple-600" />;
      case 'laptop': return <Laptop className="w-5 h-5 text-[#002147]" />;
      default: return <Fingerprint className="w-5 h-5 text-[#D4AF37]" />;
    }
  }

  // Handle registering new biometric device passkey
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) {
      showToast('Please specify a device name (e.g. My MacBook Touch ID)', 'error');
      return;
    }

    setRegistering(true);
    try {
      const res = await registerBiometricDevice(newDeviceName.trim());
      if (res.success) {
        setShowRegisterModal(false);
        setNewDeviceName('');
      }
    } catch (err: any) {
      console.error('Failed to register device:', err);
    } finally {
      setRegistering(false);
    }
  };

  // Revoke credential (for lost device or security management)
  const handleConfirmRevoke = async () => {
    if (!selectedCredToRevoke || !currentUser?.uid) return;
    setRevoking(true);

    try {
      const credRef = doc(db, 'users', currentUser.uid, 'biometricCredentials', selectedCredToRevoke.id);
      await updateDoc(credRef, {
        status: 'revoked',
        revokedAt: new Date().toISOString()
      });

      // If the revoked device is current device, clear local passkey bindings
      if (selectedCredToRevoke.id === localCredId || selectedCredToRevoke.credentialId === localCredId) {
        localStorage.removeItem('edukenza_biometric_uid');
        localStorage.removeItem('edukenza_biometric_cred_id');
        localStorage.removeItem('edukenza_biometric_email');
      }

      // Security Audit Logging (NO RAW BIOMETRICS LOGGED)
      logSecurityEvent({
        eventType: 'SETTINGS_CHANGED',
        action: 'REVOKE_BIOMETRIC_CREDENTIAL',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        schoolId: currentUser.schoolId,
        details: `Revoked biometric credential (${selectedCredToRevoke.credentialId}) for device: ${selectedCredToRevoke.deviceName}`
      });

      showToast(`Biometric passkey for "${selectedCredToRevoke.deviceName}" revoked successfully.`, 'success');
      setSelectedCredToRevoke(null);
    } catch (err: any) {
      console.error('Error revoking credential:', err);
      showToast('Failed to revoke credential. Try again.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  // Disable biometric auto-login on current device
  const handleDisableLocalBiometrics = () => {
    localStorage.removeItem('edukenza_biometric_uid');
    localStorage.removeItem('edukenza_biometric_cred_id');
    localStorage.removeItem('edukenza_biometric_email');
    showToast('Biometric quick-login disabled on this browser instance.', 'info');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base font-black text-[#002147] tracking-tight">Biometric & Passkeys Security</h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              WebAuthn FIDO2
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage registered hardware authentication credentials across phone, laptop, and tablet devices.
          </p>
        </div>

        <button
          onClick={() => {
            const defaultName = window.navigator.userAgent.includes('Mac') 
              ? 'MacBook Touch ID' 
              : window.navigator.userAgent.includes('iPhone') 
              ? 'iPhone Face ID' 
              : 'Primary Device Passkey';
            setNewDeviceName(defaultName);
            setShowRegisterModal(true);
          }}
          className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white font-extrabold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Register New Device</span>
        </button>
      </div>

      {/* PRIVACY ASSURANCE BANNER */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-[#002147] uppercase text-[11px] tracking-wider">
            Zero-Knowledge Hardware Security
          </p>
          <p className="text-slate-600 font-medium">
            Your fingerprints and facial scans NEVER leave your local device. EDUkenZA uses public-key cryptography (WebAuthn) to verify authentication securely without collecting or storing raw biometric data.
          </p>
        </div>
      </div>

      {/* REGISTERED DEVICES LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
          <span>Registered Hardware Devices ({credentials.length})</span>
          {localBoundUid && (
            <button
              onClick={handleDisableLocalBiometrics}
              className="text-[10px] text-red-600 hover:text-red-700 underline font-bold cursor-pointer"
            >
              Disable Passkey on this Browser
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
            <span>Loading registered devices...</span>
          </div>
        ) : credentials.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <Fingerprint className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-700">No Biometric Passkeys Registered Yet</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Register this device to enable instant, passwordless logins using Touch ID, Face ID, or Windows Hello.
              </p>
            </div>
            <button
              onClick={() => {
                setNewDeviceName('Primary Device Passkey');
                setShowRegisterModal(true);
              }}
              className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Add First Device</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {credentials.map(cred => {
              const isCurrentDevice = cred.id === localCredId || cred.credentialId === localCredId;
              const isActive = cred.status === 'active';

              return (
                <div
                  key={cred.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? isCurrentDevice
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                      {getDeviceIcon(cred.deviceType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-[#002147]">{cred.deviceName}</span>
                        {isCurrentDevice && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            Current Device
                          </span>
                        )}
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" /> Revoked
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="font-mono text-[10px] text-slate-400">ID: {cred.credentialId.slice(0, 16)}...</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Registered {new Date(cred.registeredAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  {isActive && (
                    <button
                      onClick={() => setSelectedCredToRevoke(cred)}
                      className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Revoke credential (for lost or replaced devices)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Revoke Access</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REGISTER NEW DEVICE MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-black text-sm text-[#002147]">Register Biometric Passkey</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You are about to link this hardware device to your EDUkenZA account. Give this device a recognizable label.
            </p>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Device Name / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro Touch ID, Personal iPhone, Office Laptop"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Fingerprint className="w-4 h-4 text-[#D4AF37]" />
                  <span>{registering ? 'Verifying Hardware...' : 'Scan & Link Hardware'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM REVOKE MODAL */}
      {selectedCredToRevoke && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-sm text-slate-900">Revoke Biometric Credential?</h3>
                <p className="text-[11px] text-slate-500 font-medium">Lost Device Recovery Procedure</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to revoke biometric access for <strong className="text-slate-900">{selectedCredToRevoke.deviceName}</strong>? Once revoked, this passkey will no longer authenticate your account from that device.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-600 font-mono">
              <div>Credential ID: {selectedCredToRevoke.credentialId}</div>
              <div>Registered: {new Date(selectedCredToRevoke.registeredAt).toLocaleString()}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCredToRevoke(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revoking}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{revoking ? 'Revoking Access...' : 'Confirm Revoke Access'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
