import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Mail, 
  Send, 
  KeyRound, 
  CheckCircle2,
  Lock,
  Phone,
  Building2,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export const Modals: React.FC = () => {
  const { 
    currentUser,
    activeModal, 
    setActiveModal, 
    setupSchoolAdminPassword,
    setupSchoolAdminPasswordWithCredentials,
    showToast 
  } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [contactForm, setContactForm] = useState({ name: '', email: '', school: '', message: '' });
  const [loading, setLoading] = useState(false);

  // First Login Password Setup State
  const [setupEmail, setSetupEmail] = useState('');
  const [setupTempPassword, setSetupTempPassword] = useState('');
  const [setupNewPassword, setSetupNewPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Strength Validator
  const getPasswordStrength = (password: string) => {
    const checks = {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    let score: 'none' | 'weak' | 'fair' | 'strong' = 'none';
    let percent = 0;
    let label = 'Enter password';
    let colorClass = 'bg-slate-200';
    let textClass = 'text-slate-400';

    if (password.length > 0) {
      if (passedCount <= 2 || password.length < 6) {
        score = 'weak';
        percent = 33;
        label = 'Weak Password';
        colorClass = 'bg-red-500';
        textClass = 'text-red-600';
      } else if (passedCount === 3 || passedCount === 4) {
        score = 'fair';
        percent = 66;
        label = 'Fair Password';
        colorClass = 'bg-amber-500';
        textClass = 'text-amber-600';
      } else {
        score = 'strong';
        percent = 100;
        label = 'Strong Password';
        colorClass = 'bg-emerald-500';
        textClass = 'text-emerald-600';
      }
    }

    const isSecureEnough = password.length >= 8 && checks.hasUpper && checks.hasLower && (checks.hasNumber || checks.hasSpecial);

    return {
      checks,
      passedCount,
      score,
      percent,
      label,
      colorClass,
      textClass,
      isSecureEnough
    };
  };

  const pwdStrength = getPasswordStrength(setupNewPassword);

  if (!activeModal) return null;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Thank you ${contactForm.name}! An EDUkenZA representative will contact ${contactForm.email} within 2 hours.`, 'success');
    setActiveModal(null);
    setContactForm({ name: '', email: '', school: '', message: '' });
  };

  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!setupNewPassword || setupNewPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (!pwdStrength.isSecureEnough) {
      showToast('Password is too weak. Please ensure it is at least 8 characters long and contains uppercase, lowercase, and numbers or symbols.', 'error');
      return;
    }

    if (setupNewPassword !== setupConfirmPassword) {
      showToast('Passwords do not match. Please ensure both fields match.', 'error');
      return;
    }

    setLoading(true);

    if (currentUser) {
      // Authenticated session exists, call updatePassword directly on current session
      const res = await setupSchoolAdminPassword(setupNewPassword);
      if (res.success) {
        setSetupNewPassword('');
        setSetupConfirmPassword('');
      }
    } else {
      // Unauthenticated session, sign in with temp pass first
      const res = await setupSchoolAdminPasswordWithCredentials(
        setupEmail,
        setupTempPassword,
        setupNewPassword
      );
      if (res.success) {
        setSetupEmail('');
        setSetupTempPassword('');
        setSetupNewPassword('');
        setSetupConfirmPassword('');
      }
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="bg-white border-2 border-[#002147] rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 my-8 max-h-[90vh] overflow-y-auto text-slate-900"
      >
        
        {/* Close Button */}
        <button
          onClick={() => setActiveModal(null)}
          className="absolute top-5 right-5 p-1.5 rounded bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* CONTACT MODAL */}
        {activeModal === 'contact' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#002147] uppercase tracking-tight">Contact EDUkenZA Support</h3>
                <p className="text-xs text-slate-600">Speak with an education technologist or request custom enterprise onboarding.</p>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Principal Sarah Jenkins"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">Your Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="s.jenkins@school.edu"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">School / Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. ARISING START Academy"
                  value={contactForm.school}
                  onChange={(e) => setContactForm({ ...contactForm, school: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">How can we help your school?</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tell us about your student capacity, current software, or questions..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded bg-slate-200 text-slate-800 text-xs font-extrabold uppercase tracking-wider hover:bg-slate-300 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003366] cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Submit Inquiry</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PRIVACY POLICY MODAL */}
        {activeModal === 'privacy' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#002147] uppercase tracking-tight">EDUkenZA Privacy Policy</h3>
                <p className="text-xs text-slate-600">Enterprise Data Security & Student Data Protection Policy</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-3 max-h-80 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200 leading-relaxed">
              <h4 className="font-extrabold text-[#002147] text-xs uppercase">1. Zero Student Data Monetization</h4>
              <p>EDUkenZA will NEVER sell, rent, or commercialize student records, guardian contact details, or performance analytics to third parties or advertising brokers.</p>

              <h4 className="font-extrabold text-[#002147] text-xs uppercase">2. Multi-Tenant Partitioning & Encryption</h4>
              <p>All institutional records stored in Firestore Database and Firebase Storage are encrypted in transit using TLS 1.3 and at rest using AES-256 bits. Every school's database is strictly partitioned by unique School IDs.</p>

              <h4 className="font-extrabold text-[#002147] text-xs uppercase">3. Regulatory Compliance</h4>
              <p>Our platform complies fully with the Protection of Personal Information Act (POPIA), General Data Protection Regulation (GDPR), and regional educational privacy guidelines.</p>

              <h4 className="font-extrabold text-[#002147] text-xs uppercase">4. Data Ownership</h4>
              <p>The school retains 100% full ownership of all uploaded records. School administrators may request full JSON/CSV data exports or record purge at any time.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded bg-[#002147] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003366] cursor-pointer"
              >
                Close Privacy Policy
              </button>
            </div>
          </div>
        )}

        {/* TERMS OF SERVICE MODAL */}
        {activeModal === 'terms' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#002147] uppercase tracking-tight">Terms of Service</h3>
                <p className="text-xs text-slate-600">Master SaaS Subscription Agreement</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-3 max-h-80 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200 leading-relaxed">
              <h4 className="font-extrabold text-[#002147] text-xs uppercase">1. Free Trial & Subscriptions</h4>
              <p>Upon registration, institutions receive a 30-day Free Trial with unrestricted access to core school management modules. Subscriptions auto-renew monthly or annually based on selected plan terms.</p>

              <h4 className="font-extrabold text-[#002147] text-xs uppercase">2. Role-Based Access Responsibility</h4>
              <p>School Administrators are responsible for maintaining accurate role assignments for teachers, students, and parents to prevent unauthorized view permissions.</p>

              <h4 className="font-extrabold text-[#002147] text-xs uppercase">3. Platform Uptime SLA</h4>
              <p>EDUkenZA maintains a 99.9% monthly uptime guarantee for all production cloud server instances.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded bg-[#002147] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003366] cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
