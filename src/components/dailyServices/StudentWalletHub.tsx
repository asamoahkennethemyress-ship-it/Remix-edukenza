import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  History, 
  Sliders, 
  Lock, 
  Unlock, 
  CreditCard, 
  Smartphone, 
  Building2, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw,
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { StudentWallet, WalletTransaction, DailyServiceCategory } from '../../types/dailyServicesWallet';
import { 
  fetchStudentWallet, 
  updateStudentWalletLimits, 
  topUpStudentWallet, 
  fetchWalletTransactions,
  subscribeToStudentWallet,
  subscribeToWalletTransactions
} from '../../services/dailyServicesWalletService';
import { startPaystackCheckout } from '../../services/paymentGatewayService';
import { QrNfcStudentCardModal } from './QrNfcStudentCardModal';

interface Props {
  schoolId: string;
  studentId?: string; // If provided, locks view to this student (e.g., Parent/Student Portal)
  userRole?: 'parent' | 'school_admin' | 'student' | 'teacher';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  students?: any[];
}

export const StudentWalletHub: React.FC<Props> = ({
  schoolId,
  studentId,
  userRole = 'parent',
  showToast,
  students = []
}) => {
  const initialStudentId = studentId || students[0]?.id || students[0]?.studentId || '';
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [wallet, setWallet] = useState<StudentWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Top Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<'paystack_momo' | 'paystack_card' | 'cash'>('paystack_momo');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Spending Limit Editing
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const [weeklyLimit, setWeeklyLimit] = useState<number>(250);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(1000);
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState<boolean>(false);
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState<number>(10);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState<number>(50);
  const [disabledCategories, setDisabledCategories] = useState<DailyServiceCategory[]>([]);

  // QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sync selected student ID if prop changes
  useEffect(() => {
    if (studentId) setSelectedStudentId(studentId);
  }, [studentId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!schoolId || !selectedStudentId) return;
    setLoading(true);

    const unsubWallet = subscribeToStudentWallet(schoolId, selectedStudentId, (w) => {
      setWallet(w);
      if (w) {
        setDailyLimit(w.dailyLimit);
        setWeeklyLimit(w.weeklyLimit);
        setMonthlyLimit(w.monthlyLimit);
        setAutoTopUpEnabled(w.autoTopUpEnabled);
        setAutoTopUpThreshold(w.autoTopUpThreshold);
        setAutoTopUpAmount(w.autoTopUpAmount);
        setDisabledCategories(w.disabledCategories || []);
      }
      setLoading(false);
    });

    const unsubTxns = subscribeToWalletTransactions(schoolId, (txns) => {
      setTransactions(txns);
    }, selectedStudentId);

    return () => {
      unsubWallet();
      unsubTxns();
    };
  }, [schoolId, selectedStudentId]);

  const handleExecuteTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || topUpAmount <= 0) return;

    setTopUpLoading(true);
    try {
      if (paymentMethod === 'cash' && (userRole === 'school_admin' || userRole === 'teacher')) {
        // Admin Physical Cash Desk Deposit
        const refCode = `CASH-DESK-${Date.now()}`;
        await topUpStudentWallet({
          walletId: wallet.id,
          schoolId,
          studentId: wallet.studentId,
          studentName: wallet.studentName,
          amount: Number(topUpAmount),
          paymentMethod: 'cash',
          reference: refCode,
          processedBy: 'Finance Desk Cashier'
        });

        if (showToast) {
          showToast(`Cash top-up of GHS ${topUpAmount.toFixed(2)} recorded for ${wallet.studentName}!`, 'success');
        }
        setIsTopUpOpen(false);
      } else {
        // Real Paystack Checkout Integration
        showToast?.('Launching Paystack Payment Gateway...', 'info');

        const verification = await startPaystackCheckout({
          walletId: wallet.id,
          studentId: wallet.studentId,
          studentName: wallet.studentName,
          schoolId,
          invoiceType: 'wallet_topup',
          amount: Number(topUpAmount),
          currency: 'GHS',
          payerEmail: payerEmail || `${wallet.studentId.toLowerCase()}@edukenza.edu`,
          feeType: 'Student Digital Wallet Top-Up',
          callbackUrl: window.location.href
        });

        if (verification.success && verification.status === 'successful') {
          showToast?.(`Wallet successfully credited with GHS ${topUpAmount.toFixed(2)}! Receipt #${verification.receiptNumber}`, 'success');
          setIsTopUpOpen(false);
        } else {
          showToast?.(`Wallet top-up failed: ${verification.message}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Wallet top-up error:', err);
      if (showToast) showToast(err.message || 'Wallet top-up was not completed.', 'error');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!wallet) return;
    try {
      await updateStudentWalletLimits(wallet.id, {
        dailyLimit: Number(dailyLimit),
        weeklyLimit: Number(weeklyLimit),
        monthlyLimit: Number(monthlyLimit),
        autoTopUpEnabled,
        autoTopUpThreshold: Number(autoTopUpThreshold),
        autoTopUpAmount: Number(autoTopUpAmount),
        disabledCategories
      });

      if (showToast) {
        showToast('Wallet spending limits & controls updated!', 'success');
      }
      setIsEditingLimits(false);
    } catch (err) {
      if (showToast) showToast('Failed to update wallet settings', 'error');
    }
  };

  const toggleCategoryRestriction = (cat: DailyServiceCategory) => {
    if (disabledCategories.includes(cat)) {
      setDisabledCategories(disabledCategories.filter(c => c !== cat));
    } else {
      setDisabledCategories([...disabledCategories, cat]);
    }
  };

  if (loading && !wallet) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#002147] animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Student Wallet...</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-black text-[#002147]">No Digital Wallet Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          A digital wallet for student ID <span className="font-mono font-bold text-slate-800">{selectedStudentId}</span> has not been initialized.
        </p>
      </div>
    );
  }

  const isLowBalance = wallet.balance < (wallet.autoTopUpThreshold || 15);

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER BAR */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Digital Wallet & ID Hub</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Real-time contactless balance for canteen, campus store, transportation, and school fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {students.length > 0 && userRole === 'school_admin' && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-white/10 text-white font-bold text-xs p-2.5 rounded-xl outline-none border border-white/20"
            >
              {students.map(s => (
                <option key={s.id || s.studentId} value={s.id || s.studentId} className="bg-[#002147]">
                  {s.fullName || s.name} {s.className ? `(${s.className})` : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#D4AF37]" /> View Digital ID Card
          </button>

          <button
            onClick={() => setIsTopUpOpen(true)}
            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Top-Up via Paystack
          </button>
        </div>
      </div>

      {/* WALLET SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CURRENT BALANCE */}
        <div className={`p-5 rounded-3xl border shadow-sm space-y-1 relative overflow-hidden ${
          isLowBalance ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Available Balance</span>
            <Wallet className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-3xl font-black text-[#002147]">
            GHS {wallet.balance.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 pt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              wallet.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {wallet.status.toUpperCase()}
            </span>
            {isLowBalance && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Low Balance
              </span>
            )}
          </div>
        </div>

        {/* TODAY'S SPENT / DAILY LIMIT */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Daily Spending</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Limit: GHS {wallet.dailyLimit}</span>
          </div>
          <p className="text-2xl font-black text-slate-800">
            GHS {wallet.dailySpent.toFixed(2)}
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className={`h-full rounded-full transition-all ${
                wallet.dailySpent >= wallet.dailyLimit ? 'bg-red-500' : 'bg-[#002147]'
              }`}
              style={{ width: `${Math.min(100, (wallet.dailySpent / Math.max(1, wallet.dailyLimit)) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-medium pt-1">
            {(wallet.dailyLimit - wallet.dailySpent) > 0 
              ? `GHS ${(wallet.dailyLimit - wallet.dailySpent).toFixed(2)} remaining today` 
              : 'Daily limit reached'}
          </p>
        </div>

        {/* WEEKLY SPENT */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Weekly Spent</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Limit: GHS {wallet.weeklyLimit}</span>
          </div>
          <p className="text-2xl font-black text-slate-800">
            GHS {wallet.weeklySpent.toFixed(2)}
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, (wallet.weeklySpent / Math.max(1, wallet.weeklyLimit)) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-medium pt-1">Resets every Sunday midnight</p>
        </div>

        {/* MONTHLY SPENT */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly Total</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Limit: GHS {wallet.monthlyLimit}</span>
          </div>
          <p className="text-2xl font-black text-slate-800">
            GHS {wallet.monthlySpent.toFixed(2)}
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-[#D4AF37] rounded-full transition-all"
              style={{ width: `${Math.min(100, (wallet.monthlySpent / Math.max(1, wallet.monthlyLimit)) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-medium pt-1">Parent parental budget cap</p>
        </div>

      </div>

      {/* MAIN CONTENT SPLIT: LEFT CONTROLS, RIGHT AUDIT TRAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: WALLET CONTROLS & RESTRICTIONS */}
        <div className="space-y-6">
          
          {/* SPENDING LIMITS CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#D4AF37]" />
                Parental Spending Limits
              </h3>
              <button
                onClick={() => setIsEditingLimits(!isEditingLimits)}
                className="text-[11px] font-black text-[#002147] hover:underline cursor-pointer"
              >
                {isEditingLimits ? 'Cancel' : 'Configure'}
              </button>
            </div>

            {isEditingLimits ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Daily Limit (GHS)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Weekly Limit (GHS)</label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Monthly Limit (GHS)</label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoTopUpEnabled}
                      onChange={(e) => setAutoTopUpEnabled(e.target.checked)}
                      className="rounded text-[#002147]"
                    />
                    Enable Auto Top-Up on Low Balance
                  </label>

                  {autoTopUpEnabled && (
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Threshold (GHS)</label>
                        <input
                          type="number"
                          value={autoTopUpThreshold}
                          onChange={(e) => setAutoTopUpThreshold(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Top-Up Amount</label>
                        <input
                          type="number"
                          value={autoTopUpAmount}
                          onChange={(e) => setAutoTopUpAmount(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveLimits}
                  className="w-full py-2.5 bg-[#002147] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#003366] transition cursor-pointer shadow-sm"
                >
                  Save Spending Controls
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs">
                  <span className="text-slate-600 font-medium">Daily Limit:</span>
                  <span className="font-black text-[#002147]">GHS {wallet.dailyLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs">
                  <span className="text-slate-600 font-medium">Weekly Limit:</span>
                  <span className="font-black text-[#002147]">GHS {wallet.weeklyLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs">
                  <span className="text-slate-600 font-medium">Monthly Limit:</span>
                  <span className="font-black text-[#002147]">GHS {wallet.monthlyLimit.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2 font-bold">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <span>Auto Top-Up: {wallet.autoTopUpEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  </div>
                  {wallet.autoTopUpEnabled && (
                    <span className="text-[10px] font-semibold">
                      GHS {wallet.autoTopUpAmount} when &lt; GHS {wallet.autoTopUpThreshold}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY RESTRICTION LOCKS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#D4AF37]" />
              Category Spending Restrictions
            </h3>
            <p className="text-xs text-slate-500">
              Parents can restrict specific item categories from wallet purchases.
            </p>

            <div className="space-y-2 pt-1">
              {[
                { id: 'canteen_snack', label: 'Canteen Snacks & Sweets' },
                { id: 'shop', label: 'School Shop Merchandise' },
                { id: 'printing', label: 'Printing Credits' },
                { id: 'trips', label: 'Excursions & School Trips' }
              ].map(catItem => {
                const isRestricted = disabledCategories.includes(catItem.id as DailyServiceCategory);
                return (
                  <div 
                    key={catItem.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-bold text-slate-700">{catItem.label}</span>
                    <button
                      onClick={() => toggleCategoryRestriction(catItem.id as DailyServiceCategory)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        isRestricted 
                          ? 'bg-red-100 text-red-800 border border-red-300' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isRestricted ? (
                        <>
                          <Lock className="w-3 h-3 text-red-600" /> Restricted
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-600" /> Allowed
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME TRANSACTION AUDIT HISTORY */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-base text-[#002147] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#D4AF37]" />
                  Wallet Activity & Audit Log
                </h3>
                <p className="text-xs text-slate-500">Real-time immutable ledger of all top-ups, canteen meals, bus fees, and shop purchases.</p>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {transactions.length} Records
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No wallet transactions recorded yet for this student.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {transactions.map(t => {
                  const isCredit = t.type === 'topup' || t.type === 'refund';
                  return (
                    <div key={t.id} className="py-3 flex items-center justify-between hover:bg-slate-50 transition px-2 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{t.description}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span className="font-mono">{t.reference || t.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs font-black font-mono ${
                          isCredit ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          {isCredit ? '+' : '-'} GHS {t.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Bal: GHS {t.newBalance?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TOP UP MODAL */}
      {isTopUpOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-[#002147] to-[#0b3c5d] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#D4AF37]" />
                Top-Up Student Digital Wallet
              </h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTopUp} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Recipient Student</div>
                <div className="text-xs font-black text-[#002147]">{wallet.studentName} ({wallet.className})</div>
                <div className="text-[11px] font-mono text-slate-600">Wallet ID: {wallet.walletId}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Top-Up Amount (GHS) *</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[20, 50, 100, 200].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        topUpAmount === amt
                          ? 'bg-[#002147] text-white border-[#002147]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      GHS {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="50000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black font-mono focus:ring-2 focus:ring-[#002147] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147] outline-none"
                >
                  <option value="paystack_momo">Paystack — Mobile Money (MTN, Telecel, AirtelTigo)</option>
                  <option value="paystack_card">Paystack — Visa & Mastercard / Bank</option>
                  {(userRole === 'school_admin' || userRole === 'teacher') && (
                    <option value="cash">Finance Desk Cashier (Cash Deposit)</option>
                  )}
                </select>
              </div>

              {paymentMethod.startsWith('paystack') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payer Email (for Paystack receipt)</label>
                  <input
                    type="email"
                    placeholder="parent@example.com"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147] outline-none"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="px-6 py-2 bg-[#002147] hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-70"
                >
                  {topUpLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Proceed to Pay GHS {topUpAmount.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR/NFC ID MODAL */}
      {isQrModalOpen && (
        <QrNfcStudentCardModal
          wallet={wallet}
          onClose={() => setIsQrModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
