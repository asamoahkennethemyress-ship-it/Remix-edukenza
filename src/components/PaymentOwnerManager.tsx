import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  PaymentMethod, 
  PaymentRecord, 
  PaymentStatus, 
  SchoolAccount, 
  SubscriptionPlanConfig,
  PaymentMethodType 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Building2, 
  Smartphone, 
  Landmark, 
  Check, 
  X, 
  FileText,
  Filter,
  ShieldCheck
} from 'lucide-react';

const INITIAL_PAYMENT_METHODS: Omit<PaymentMethod, 'id'>[] = [
  {
    methodName: 'MTN Mobile Money',
    type: 'mtn_momo',
    providerName: 'MTN Ghana',
    accountName: 'EDUkenZA Technologies Ltd',
    mobileMoneyNumber: '+233 24 123 4567',
    merchantNumber: '589214',
    bankAccountDetails: '',
    instructions: 'Send payment via MTN MoMo (*170#), select Pay Merchant or Transfer, enter merchant number 589214, and use your School Name as Reference.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    methodName: 'Vodafone Cash',
    type: 'vodafone_cash',
    providerName: 'Telecel Ghana (Vodafone)',
    accountName: 'EDUkenZA Technologies Ltd',
    mobileMoneyNumber: '+233 20 987 6543',
    merchantNumber: '312980',
    bankAccountDetails: '',
    instructions: 'Dial *110#, select Pay Bill / Merchant, enter Till Number 312980, enter amount, and use your School ID as Reference.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    methodName: 'AirtelTigo Money',
    type: 'airteltigo_money',
    providerName: 'AT Money Ghana',
    accountName: 'EDUkenZA Technologies Ltd',
    mobileMoneyNumber: '+233 27 555 0192',
    merchantNumber: '771204',
    bankAccountDetails: '',
    instructions: 'Dial *110#, select Pay Merchant, enter Merchant ID 771204, enter amount and confirm payment.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    methodName: 'Ecobank Bank Transfer',
    type: 'bank_transfer',
    providerName: 'Ecobank Ghana',
    accountName: 'EDUkenZA Technologies Limited',
    mobileMoneyNumber: '',
    merchantNumber: '',
    bankAccountDetails: 'Bank: Ecobank Ghana Ltd\nAccount Number: 1441002983101\nBranch: Ring Road East, Accra\nSWIFT: ECOGHAC',
    instructions: 'Make a direct bank deposit or internet banking transfer to the Ecobank account. Include your School Name in the deposit description.',
    currency: 'GHS',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const PaymentOwnerManager: React.FC = () => {
  const { showToast, currentUser } = useAuth();

  const [subTab, setSubTab] = useState<'methods' | 'submissions'>('submissions');
  const [loading, setLoading] = useState<boolean>(false);

  // Firestore Collections
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [schools, setSchools] = useState<SchoolAccount[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');

  // Payment Method Modal
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodFormData, setMethodFormData] = useState({
    methodName: '',
    type: 'mtn_momo' as PaymentMethodType | string,
    providerName: '',
    accountName: '',
    mobileMoneyNumber: '',
    merchantNumber: '',
    bankAccountDetails: '',
    instructions: '',
    currency: 'GHS',
    status: 'active' as 'active' | 'inactive'
  });

  // Delete Confirmation Modal
  const [deleteConfirmMethod, setDeleteConfirmMethod] = useState<PaymentMethod | null>(null);

  // Payment Detail / Approval / Rejection Modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingModalOpen, setIsRejectingModalOpen] = useState(false);
  const [isApprovingModalOpen, setIsApprovingModalOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Payment Methods
      const methodsSnap = await getDocs(collection(db, 'paymentMethods'));
      let methodsList: PaymentMethod[] = methodsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as PaymentMethod));

      // Seed initial payment methods if collection is empty
      if (methodsList.length === 0) {
        for (const initial of INITIAL_PAYMENT_METHODS) {
          const newDocRef = doc(collection(db, 'paymentMethods'));
          const item: PaymentMethod = { id: newDocRef.id, ...initial };
          await setDoc(newDocRef, item);
          methodsList.push(item);
        }
      }
      setPaymentMethods(methodsList);

      // 2. Fetch Payments
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      const paymentsList: PaymentRecord[] = paymentsSnap.docs.map(docSnap => ({
        paymentId: docSnap.id,
        ...docSnap.data()
      } as PaymentRecord));
      paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(paymentsList);

      // 3. Fetch Schools
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      setSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolAccount)));

      // 4. Fetch Subscription Plans
      const plansSnap = await getDocs(collection(db, 'subscriptionPlans'));
      setPlans(plansSnap.docs.map(d => ({ planId: d.id, ...d.data() } as SubscriptionPlanConfig)));

    } catch (err: any) {
      console.error('Error fetching payment data:', err);
      showToast('Failed to load payment records from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const totalRevenue = payments
    .filter(p => p.paymentStatus === 'approved')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const approvedCount = payments.filter(p => p.paymentStatus === 'approved').length;
  const pendingCount = payments.filter(p => p.paymentStatus === 'pending').length;
  const rejectedCount = payments.filter(p => p.paymentStatus === 'rejected' || p.paymentStatus === 'failed').length;
  const activeSubscriptionsCount = schools.filter(s => s.status === 'active' && s.plan !== 'free_trial').length;

  // Handlers for Payment Methods
  const handleOpenMethodModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setMethodFormData({
        methodName: method.methodName,
        type: method.type,
        providerName: method.providerName,
        accountName: method.accountName,
        mobileMoneyNumber: method.mobileMoneyNumber || '',
        merchantNumber: method.merchantNumber || '',
        bankAccountDetails: method.bankAccountDetails || '',
        instructions: method.instructions,
        currency: method.currency || 'GHS',
        status: method.status
      });
    } else {
      setEditingMethod(null);
      setMethodFormData({
        methodName: '',
        type: 'mtn_momo',
        providerName: '',
        accountName: '',
        mobileMoneyNumber: '',
        merchantNumber: '',
        bankAccountDetails: '',
        instructions: '',
        currency: 'GHS',
        status: 'active'
      });
    }
    setIsMethodModalOpen(true);
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodFormData.methodName || !methodFormData.providerName || !methodFormData.accountName) {
      showToast('Please fill in required fields (Method Name, Provider, Account Name).', 'error');
      return;
    }

    try {
      if (editingMethod) {
        const methodRef = doc(db, 'paymentMethods', editingMethod.id);
        const updatedData = {
          ...methodFormData,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(methodRef, updatedData);
        showToast(`Payment method '${methodFormData.methodName}' updated successfully!`, 'success');
      } else {
        const newRef = doc(collection(db, 'paymentMethods'));
        const newMethod: PaymentMethod = {
          id: newRef.id,
          ...methodFormData,
          createdAt: new Date().toISOString()
        };
        await setDoc(newRef, newMethod);
        showToast(`Payment method '${methodFormData.methodName}' created successfully!`, 'success');
      }

      setIsMethodModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      showToast(err.message || 'Failed to save payment method.', 'error');
    }
  };

  const handleToggleMethodStatus = async (method: PaymentMethod) => {
    const newStatus = method.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'paymentMethods', method.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(`Payment method '${method.methodName}' is now ${newStatus.toUpperCase()}`, 'info');
      fetchAllData();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDeleteMethod = async () => {
    if (!deleteConfirmMethod) return;
    try {
      await deleteDoc(doc(db, 'paymentMethods', deleteConfirmMethod.id));
      showToast(`Payment method '${deleteConfirmMethod.methodName}' deleted.`, 'success');
      setDeleteConfirmMethod(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      showToast('Failed to delete payment method.', 'error');
    }
  };

  // Approval & Rejection Handlers
  const handleApprovePayment = async () => {
    if (!selectedPayment) return;
    setLoading(true);
    try {
      const now = new Date();
      const processedAtISO = now.toISOString();

      // Calculate subscription end date (1 year from now)
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const endDateISO = endDate.toISOString();

      // 1. Update Payment record
      await updateDoc(doc(db, 'payments', selectedPayment.paymentId), {
        paymentStatus: 'approved',
        processedAt: processedAtISO
      });

      // 2. Update School Subscription status
      if (selectedPayment.schoolId) {
        const schoolRef = doc(db, 'schools', selectedPayment.schoolId);
        await updateDoc(schoolRef, {
          subscriptionPlan: selectedPayment.planId || selectedPayment.planName,
          status: 'active',
          subscriptionStatus: 'active',
          subscriptionStartDate: processedAtISO,
          subscriptionEndDate: endDateISO,
          updatedAt: processedAtISO
        });
      }

      // 3. Record in Subscriptions collection
      const subRef = doc(db, 'subscriptions', `sub_${selectedPayment.schoolId}`);
      await setDoc(subRef, {
        subscriptionId: `sub_${selectedPayment.schoolId}`,
        schoolId: selectedPayment.schoolId,
        schoolName: selectedPayment.schoolName,
        planId: selectedPayment.planId,
        planName: selectedPayment.planName,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency,
        status: 'active',
        startDate: processedAtISO,
        endDate: endDateISO,
        lastPaymentId: selectedPayment.paymentId,
        updatedAt: processedAtISO
      });

      showToast(`Payment of ${selectedPayment.currency} ${selectedPayment.amount.toLocaleString()} for ${selectedPayment.schoolName} APPROVED! Subscription activated.`, 'success');
      setIsApprovingModalOpen(false);
      setSelectedPayment(null);
      fetchAllData();

    } catch (err: any) {
      console.error('Error approving payment:', err);
      showToast(err.message || 'Failed to approve payment.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      showToast('Please state a reason for rejecting this payment.', 'error');
      return;
    }
    setLoading(true);
    try {
      const processedAtISO = new Date().toISOString();

      await updateDoc(doc(db, 'payments', selectedPayment.paymentId), {
        paymentStatus: 'rejected',
        rejectionReason: rejectionReason.trim(),
        processedAt: processedAtISO
      });

      showToast(`Payment for ${selectedPayment.schoolName} REJECTED.`, 'info');
      setIsRejectingModalOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
      fetchAllData();

    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      showToast(err.message || 'Failed to reject payment.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Payments List
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.planName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">Platform Payment Control Center</h1>
              <p className="text-xs text-slate-400">Configure payment gateways, verify transactions, and collect SaaS subscriptions.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {subTab === 'methods' && (
            <button
              onClick={() => handleOpenMethodModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c4a02e] text-[#002147] text-xs font-black uppercase tracking-wider transition shadow-lg shadow-[#D4AF37]/10"
            >
              <Plus className="w-4 h-4" />
              Add Payment Method
            </button>
          )}
        </div>
      </div>

      {/* Control Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setSubTab('submissions')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-wider transition border-b-2 ${
            subTab === 'submissions'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Subscription Submissions ({pendingCount} Pending)
        </button>

        <button
          onClick={() => setSubTab('methods')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-wider transition border-b-2 ${
            subTab === 'methods'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Payment Methods Configuration ({paymentMethods.length})
        </button>
      </div>

      {/* SUBMISSION CONTROL CENTER TAB */}
      {subTab === 'submissions' && (
        <div className="space-y-6">
          {/* Revenue & Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white">GHS {totalRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-400 mt-1 font-semibold">Verified Approved Payments</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pending Verification</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-400">{pendingCount}</div>
              <div className="text-[10px] text-amber-400/80 mt-1">Requires Owner Approval</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Successful Payments</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">{approvedCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Subscriptions Activated</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Failed / Rejected</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-400">{rejectedCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Invalid or Duplicate</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Schools</span>
                <Building2 className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-xl font-black text-[#D4AF37]">{activeSubscriptionsCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">On Paid Subscription</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by school, ref, method..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold whitespace-nowrap">
                <Filter className="w-3.5 h-3.5" /> Filter Status:
              </span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-[#D4AF37] text-[#002147]'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Subscription Payment Submissions</h2>
              <span className="text-xs text-slate-400">Showing {filteredPayments.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">School Name</th>
                    <th className="p-3.5">Plan Purchased</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Txn Reference</th>
                    <th className="p-3.5">Submitted Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No subscription payments found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.paymentId} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold text-white">{p.schoolName}</td>
                        <td className="p-3.5 text-slate-300 font-medium">{p.planName}</td>
                        <td className="p-3.5 font-bold text-emerald-400">
                          {p.currency || 'GHS'} {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-slate-300">{p.paymentMethod}</td>
                        <td className="p-3.5 font-mono text-xs text-amber-400 font-bold">{p.transactionReference}</td>
                        <td className="p-3.5 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-3.5">
                          {p.paymentStatus === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {p.paymentStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          )}
                          {(p.paymentStatus === 'rejected' || p.paymentStatus === 'failed') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="View Payment Details & Proof"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {p.paymentStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setIsApprovingModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setRejectionReason('');
                                  setIsRejectingModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold transition"
                              >
                                Reject
                              </button>
                            </>
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
      )}

      {/* PAYMENT METHODS CONFIGURATION TAB */}
      {subTab === 'methods' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentMethods.map((m) => (
              <div 
                key={m.id} 
                className={`bg-slate-900 border rounded-2xl p-6 relative transition shadow-xl ${
                  m.status === 'active' ? 'border-slate-800' : 'border-rose-900/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#D4AF37]">
                      {m.type === 'bank_transfer' ? (
                        <Landmark className="w-6 h-6" />
                      ) : m.type === 'card' ? (
                        <CreditCard className="w-6 h-6" />
                      ) : (
                        <Smartphone className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base">{m.methodName}</h3>
                      <p className="text-xs text-slate-400">{m.providerName} • Currency: <span className="text-amber-400 font-bold">{m.currency || 'GHS'}</span></p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    m.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Name:</span>
                    <span className="text-white font-bold">{m.accountName}</span>
                  </div>

                  {m.mobileMoneyNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">MoMo Number:</span>
                      <span className="text-amber-400 font-bold">{m.mobileMoneyNumber}</span>
                    </div>
                  )}

                  {m.merchantNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Merchant/Till ID:</span>
                      <span className="text-amber-400 font-bold">{m.merchantNumber}</span>
                    </div>
                  )}

                  {m.bankAccountDetails && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 whitespace-pre-line font-sans">
                      <span className="text-slate-500 block font-mono mb-1">Bank Account Info:</span>
                      {m.bankAccountDetails}
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-4">
                  <span className="text-slate-300 font-bold block mb-1">Instructions for Schools:</span>
                  <p className="line-clamp-2">{m.instructions}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleToggleMethodStatus(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                      m.status === 'active'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {m.status === 'active' ? 'Deactivate Method' : 'Activate Method'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenMethodModal(m)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Edit Payment Method"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmMethod(m)}
                      className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
                      title="Delete Payment Method"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW PAYMENT DETAILS MODAL */}
      {selectedPayment && !isApprovingModalOpen && !isRejectingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-white text-base">Payment Submission Details</h3>
              </div>
              <button 
                onClick={() => setSelectedPayment(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-500 block">School Name</span>
                  <span className="font-bold text-white text-sm">{selectedPayment.schoolName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Subscription Plan</span>
                  <span className="font-bold text-amber-400 text-sm">{selectedPayment.planName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount Paid</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedPayment.currency || 'GHS'} {Number(selectedPayment.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Method</span>
                  <span className="font-bold text-slate-200">{selectedPayment.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Transaction Reference</span>
                  <span className="font-mono font-bold text-amber-400">{selectedPayment.transactionReference}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Submission Date</span>
                  <span className="text-slate-300">{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {selectedPayment.paymentProofUrl && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Payment Proof / Receipt Uploaded:</span>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2 text-center">
                    <img 
                      src={selectedPayment.paymentProofUrl} 
                      alt="Payment Proof" 
                      className="max-h-60 mx-auto rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}

              {selectedPayment.rejectionReason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <span className="font-bold block mb-1">Rejection Reason:</span>
                  {selectedPayment.rejectionReason}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              {selectedPayment.paymentStatus === 'pending' && (
                <>
                  <button
                    onClick={() => setIsRejectingModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={() => setIsApprovingModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                  >
                    Approve & Activate Subscription
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE PAYMENT CONFIRMATION MODAL */}
      {isApprovingModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">Confirm Payment Approval</h3>
              <p className="text-xs text-slate-300">
                You are about to approve <span className="text-emerald-400 font-bold">{selectedPayment.currency || 'GHS'} {Number(selectedPayment.amount).toLocaleString()}</span> for <span className="text-white font-bold">{selectedPayment.schoolName}</span>.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl text-left text-xs text-slate-300 space-y-1 font-mono">
                <div>Plan: <span className="text-amber-400 font-bold">{selectedPayment.planName}</span></div>
                <div>Txn Ref: <span className="text-amber-400 font-bold">{selectedPayment.transactionReference}</span></div>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">
                This will automatically activate the school's SaaS subscription for 1 Year.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsApprovingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePayment}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
              >
                {loading ? 'Processing...' : 'Confirm & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PAYMENT MODAL */}
      {isRejectingModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">Reject Payment Submission</h3>
              <p className="text-xs text-slate-300">
                Specify why this payment for <span className="text-white font-bold">{selectedPayment.schoolName}</span> is being rejected.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Rejection Reason *</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid transaction reference number or receipt not clear."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsRejectingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                {loading ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PAYMENT METHOD MODAL */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-base">
                {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
              </h3>
              <button onClick={() => setIsMethodModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Payment Method Name *</label>
                <input
                  type="text"
                  required
                  value={methodFormData.methodName}
                  onChange={(e) => setMethodFormData({ ...methodFormData, methodName: e.target.value })}
                  placeholder="e.g. MTN Mobile Money"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Method Type</label>
                  <select
                    value={methodFormData.type}
                    onChange={(e) => setMethodFormData({ ...methodFormData, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  >
                    <option value="mtn_momo">MTN Mobile Money</option>
                    <option value="vodafone_cash">Vodafone Cash</option>
                    <option value="airteltigo_money">AirtelTigo Money</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card Payment</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Currency</label>
                  <select
                    value={methodFormData.currency}
                    onChange={(e) => setMethodFormData({ ...methodFormData, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  >
                    <option value="GHS">GHS (Ghana Cedi)</option>
                    <option value="ZAR">ZAR (SA Rand)</option>
                    <option value="USD">USD ($ Dollar)</option>
                    <option value="NGN">NGN (Nigerian Naira)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Provider Name *</label>
                  <input
                    type="text"
                    required
                    value={methodFormData.providerName}
                    onChange={(e) => setMethodFormData({ ...methodFormData, providerName: e.target.value })}
                    placeholder="e.g. MTN Ghana"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={methodFormData.accountName}
                    onChange={(e) => setMethodFormData({ ...methodFormData, accountName: e.target.value })}
                    placeholder="e.g. EDUkenZA Ltd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Mobile Money Number</label>
                  <input
                    type="text"
                    value={methodFormData.mobileMoneyNumber}
                    onChange={(e) => setMethodFormData({ ...methodFormData, mobileMoneyNumber: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Merchant / Till Number</label>
                  <input
                    type="text"
                    value={methodFormData.merchantNumber}
                    onChange={(e) => setMethodFormData({ ...methodFormData, merchantNumber: e.target.value })}
                    placeholder="589214"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Bank Account Details (if applicable)</label>
                <textarea
                  rows={2}
                  value={methodFormData.bankAccountDetails}
                  onChange={(e) => setMethodFormData({ ...methodFormData, bankAccountDetails: e.target.value })}
                  placeholder="Bank: Ecobank Ghana Ltd, Account Number: 1441002983101..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Instructions for Schools *</label>
                <textarea
                  rows={3}
                  required
                  value={methodFormData.instructions}
                  onChange={(e) => setMethodFormData({ ...methodFormData, instructions: e.target.value })}
                  placeholder="Step-by-step payment instructions to display during payment submission..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Status</label>
                <select
                  value={methodFormData.status}
                  onChange={(e) => setMethodFormData({ ...methodFormData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#D4AF37]"
                >
                  <option value="active">Active (Visible to Schools)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMethodModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#002147] font-black uppercase tracking-wider"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmMethod && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">Delete Payment Method?</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete <span className="text-white font-bold">{deleteConfirmMethod.methodName}</span>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmMethod(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMethod}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
