import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  PaymentMethod, 
  PaymentRecord, 
  SchoolAccount, 
  SubscriptionPlanConfig 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle, 
  DollarSign, 
  Smartphone, 
  Landmark, 
  Upload, 
  RefreshCw, 
  Calendar, 
  ShieldCheck, 
  Building2,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';

interface Props {
  schoolId: string;
  schoolName: string;
}

const DEFAULT_PLANS: SubscriptionPlanConfig[] = [
  {
    planId: 'basic',
    name: 'Basic Academic Tier',
    price: 499,
    currency: 'GHS',
    duration: 'annual',
    features: ['Up to 500 Students', 'Core Academic Management', 'Teacher Portal', 'Parent Reports'],
    status: 'active'
  },
  {
    planId: 'professional',
    name: 'Professional Institution',
    price: 899,
    currency: 'GHS',
    duration: 'annual',
    features: ['Up to 2,000 Students', 'AI Grade Assistant', 'Finance & Fees Tracker', 'SMS Alerts', 'Priority Support'],
    status: 'active'
  },
  {
    planId: 'enterprise',
    name: 'Enterprise Multi-Campus',
    price: 1499,
    currency: 'GHS',
    duration: 'annual',
    features: ['Unlimited Students', 'Custom Domain', 'Dedicated Account Manager', 'Advanced Analytics'],
    status: 'active'
  }
];

export const SchoolPaymentManager: React.FC<Props> = ({ schoolId, schoolName }) => {
  const { showToast, currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [schoolDoc, setSchoolDoc] = useState<SchoolAccount | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>(DEFAULT_PLANS);
  const [activePaymentMethods, setActivePaymentMethods] = useState<PaymentMethod[]>([]);
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);

  // Submission Form State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanConfig>(DEFAULT_PLANS[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [amountInput, setAmountInput] = useState<number>(DEFAULT_PLANS[0].price);
  const [paymentProofBase64, setPaymentProofBase64] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      // 1. Fetch School document
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolRef);
      if (schoolSnap.exists()) {
        setSchoolDoc({ id: schoolSnap.id, ...schoolSnap.data() } as SchoolAccount);
      }

      // 2. Fetch Subscription Plans from Firestore
      const plansSnap = await getDocs(collection(db, 'subscriptionPlans'));
      const activePlans: SubscriptionPlanConfig[] = plansSnap.docs
        .map(d => ({ planId: d.id, ...d.data() } as SubscriptionPlanConfig))
        .filter(p => p.status === 'active');
      
      if (activePlans.length > 0) {
        setPlans(activePlans);
        setSelectedPlan(activePlans[0]);
        setAmountInput(activePlans[0].price);
      }

      // 3. Fetch Active Payment Methods
      const methodsSnap = await getDocs(collection(db, 'paymentMethods'));
      const activeMethods = methodsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as PaymentMethod))
        .filter(m => m.status === 'active');

      setActivePaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedMethod(activeMethods[0]);
      }

      // 4. Fetch School Payments (Strict isolation: schoolId == currentSchoolId)
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('schoolId', '==', schoolId));
      const myPaymentsSnap = await getDocs(q);
      const list: PaymentRecord[] = myPaymentsSnap.docs.map(d => ({
        paymentId: d.id,
        ...d.data()
      } as PaymentRecord));

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyPayments(list);

    } catch (err: any) {
      console.error('Error fetching school payment view:', err);
      showToast('Failed to load payment history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlanConfig) => {
    setSelectedPlan(plan);
    setAmountInput(plan.price);
  };

  // Proof Image Converter
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) { // 3MB limit
      showToast('File size must be less than 3MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofBase64(reader.result as string);
      showToast('Payment receipt uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
      showToast('Please select a payment method.', 'error');
      return;
    }
    if (!transactionRef.trim()) {
      showToast('Please enter your payment transaction reference number.', 'error');
      return;
    }
    if (amountInput <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      const newPayment: PaymentRecord = {
        paymentId,
        schoolId,
        schoolName: schoolName || schoolDoc?.schoolName || 'School',
        planId: selectedPlan.planId,
        planName: selectedPlan.name,
        amount: Number(amountInput),
        currency: selectedMethod.currency || 'GHS',
        paymentMethod: selectedMethod.methodName,
        transactionReference: transactionRef.trim(),
        paymentProofUrl: paymentProofBase64 || '',
        paymentStatus: 'pending',
        createdAt: timestamp,
        submittedByEmail: currentUser?.email
      };

      await setDoc(doc(db, 'payments', paymentId), newPayment);

      showToast(`Payment reference '${transactionRef.trim()}' submitted successfully! The Platform Owner will review and activate your subscription.`, 'success');
      
      // Reset Form
      setTransactionRef('');
      setPaymentProofBase64('');
      fetchSchoolData();

    } catch (err: any) {
      console.error('Error submitting payment:', err);
      showToast(err.message || 'Failed to submit payment record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Subscription Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#002147] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Active Subscription Status</h2>
              <p className="text-xs text-slate-400">{schoolName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-400">Current Plan: </span>
              <span className="font-bold text-[#D4AF37] text-sm uppercase">{(schoolDoc as any)?.subscriptionPlan || schoolDoc?.plan || 'Free Trial'}</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400">Status: </span>
              <span className={`font-bold capitalize ${
                schoolDoc?.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {schoolDoc?.status || 'Active'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSchoolData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {/* PLAN SELECTION & PAYMENT FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Plan & Method Selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4AF37]" /> Step 1: Select Subscription Tier
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isSelected = selectedPlan.planId === p.planId;
                return (
                  <div
                    key={p.planId}
                    onClick={() => handlePlanSelect(p)}
                    className={`cursor-pointer border rounded-2xl p-4 transition relative ${
                      isSelected
                        ? 'border-[#D4AF37] bg-slate-950 shadow-lg shadow-[#D4AF37]/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#D4AF37] text-[#002147] flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                    <h4 className="font-bold text-white text-sm mb-1">{p.name}</h4>
                    <div className="text-xl font-black text-[#D4AF37] mb-2">
                      {p.currency || 'GHS'} {(Number(p?.price) || 0).toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-normal"> / yr</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      {p.features?.slice(0, 3).map((f, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#D4AF37]" /> Step 2: Choose Payment Method
            </h3>

            {activePaymentMethods.length === 0 ? (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                No active payment methods configured by the Platform Owner yet. Please contact support.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePaymentMethods.map((m) => {
                  const isSelected = selectedMethod?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethod(m)}
                      className={`cursor-pointer border rounded-xl p-4 transition ${
                        isSelected
                          ? 'border-[#D4AF37] bg-slate-950 shadow-md'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-xs">{m.methodName}</span>
                        <span className="text-[10px] text-amber-400 font-bold">{m.currency || 'GHS'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{m.providerName}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Method Instructions */}
            {selectedMethod && (
              <div className="bg-slate-950 border border-[#D4AF37]/30 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Instructions for {selectedMethod.methodName}:</span>
                  <span className="text-amber-400 font-mono">{selectedMethod.accountName}</span>
                </div>

                {selectedMethod.mobileMoneyNumber && (
                  <div className="text-slate-300">
                    Mobile Money Number: <span className="font-mono font-bold text-white">{selectedMethod.mobileMoneyNumber}</span>
                  </div>
                )}

                {selectedMethod.merchantNumber && (
                  <div className="text-slate-300">
                    Merchant / Till ID: <span className="font-mono font-bold text-amber-400">{selectedMethod.merchantNumber}</span>
                  </div>
                )}

                {selectedMethod.bankAccountDetails && (
                  <div className="text-slate-300 whitespace-pre-line font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {selectedMethod.bankAccountDetails}
                  </div>
                )}

                <p className="text-slate-300 leading-relaxed pt-1 text-[11px] border-t border-slate-800/80">
                  {selectedMethod.instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl h-fit">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <DollarSign className="w-4 h-4 text-[#D4AF37]" /> Step 3: Submit Payment
          </h3>

          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Selected Plan</label>
              <input
                type="text"
                disabled
                value={`${selectedPlan.name} (${selectedPlan.currency || 'GHS'} ${selectedPlan.price})`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-amber-400 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Amount Paid *</label>
              <input
                type="number"
                required
                min={1}
                value={amountInput}
                onChange={(e) => setAmountInput(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Transaction Reference Number *</label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 849201938201 / MoMo ID"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Upload Receipt / Payment Proof</label>
              <div className="border border-dashed border-slate-700 bg-slate-950 rounded-xl p-4 text-center cursor-pointer hover:border-[#D4AF37] transition relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-slate-300 text-[11px] block font-medium">Click or drop receipt image here</span>
                <span className="text-[10px] text-slate-500">Max size 3MB</span>
              </div>

              {paymentProofBase64 && (
                <div className="mt-2 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Receipt Image Attached
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#c4a02e] text-[#002147] font-black uppercase tracking-wider transition shadow-lg shadow-[#D4AF37]/10"
            >
              {submitting ? 'Submitting...' : 'Submit Payment for Verification'}
            </button>
          </form>
        </div>
      </div>

      {/* SCHOOL PAYMENT HISTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="font-bold text-white text-base">Payment History</h3>
            <p className="text-xs text-slate-400">View your school's payment submissions and approval statuses.</p>
          </div>
          <span className="text-xs text-slate-400">{myPayments.length} Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Submission Date</th>
                <th className="p-3.5">Plan Name</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Txn Reference</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Notes / Rejection Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {myPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No payment records submitted yet for this school account.
                  </td>
                </tr>
              ) : (
                myPayments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-medium text-slate-300">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="p-3.5 font-bold text-white">{p.planName}</td>
                    <td className="p-3.5 font-bold text-emerald-400">
                      {p.currency || 'GHS'} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-slate-300">{p.paymentMethod}</td>
                    <td className="p-3.5 font-mono text-amber-400 font-bold">{p.transactionReference}</td>
                    <td className="p-3.5">
                      {p.paymentStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {p.paymentStatus === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                          <Clock className="w-3 h-3" /> Pending Owner Review
                        </span>
                      )}
                      {(p.paymentStatus === 'rejected' || p.paymentStatus === 'failed') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate">
                      {p.rejectionReason ? (
                        <span className="text-rose-400 font-medium">{p.rejectionReason}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
