import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  FileText, 
  Sparkles, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  ArrowUpRight,
  RefreshCw,
  Smartphone,
  Building,
  Check
} from 'lucide-react';
import { 
  SchoolSubscription, 
  SubscriptionPlan, 
  BillingInvoice, 
  BillingTransaction, 
  PaymentMethodConfig 
} from '../../types/billing';
import { 
  fetchSchoolSubscription, 
  fetchAllSubscriptionPlans, 
  fetchSchoolInvoices, 
  fetchSchoolTransactions, 
  fetchAllPaymentMethods,
  createOrUpdateSchoolSubscription,
  recordTransaction,
  updateInvoiceStatus
} from '../../services/billingService';
import { generateInvoicePDF } from '../../services/invoiceGeneratorService';
import { useAuth } from '../../context/AuthContext';

export const SchoolAdminBillingCenter: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const schoolId = currentUser?.schoolId || 'global';
  const schoolName = currentUser?.schoolName || 'My School';

  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  // Pay Invoice Modal State
  const [payingInvoice, setPayingInvoice] = useState<BillingInvoice | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodConfig | null>(null);
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [sub, planList, invList, txnList, pmList] = await Promise.all([
      fetchSchoolSubscription(schoolId),
      fetchAllSubscriptionPlans(),
      fetchSchoolInvoices(schoolId),
      fetchSchoolTransactions(schoolId),
      fetchAllPaymentMethods()
    ]);

    setSubscription(sub);
    setPlans(planList);
    setInvoices(invList);
    setTransactions(txnList);
    setPaymentMethods(pmList.filter(pm => pm.enabled));
    setLoading(false);
  };

  const handleSelectUpgradePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      const price = cycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
      const expDate = new Date();
      if (cycle === 'annual') {
        expDate.setFullYear(expDate.getFullYear() + 1);
      } else {
        expDate.setMonth(expDate.getMonth() + 1);
      }

      await createOrUpdateSchoolSubscription(
        {
          schoolId,
          schoolName,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle: cycle,
          amount: price,
          currency: selectedPlan.currency || 'GHS',
          status: 'active',
          startDate: new Date().toISOString(),
          renewalDate: expDate.toISOString(),
          expirationDate: expDate.toISOString(),
          autoRenew: true,
          paymentStatus: 'paid',
          maxStudents: selectedPlan.maxStudents,
          maxTeachers: selectedPlan.maxTeachers,
          maxParents: selectedPlan.maxParents,
          maxClasses: selectedPlan.maxClasses,
          maxStorageGB: selectedPlan.maxStorageGB,
          aiFeaturesEnabled: selectedPlan.aiFeaturesEnabled,
          customBrandingEnabled: selectedPlan.customBrandingEnabled,
          prioritySupportEnabled: selectedPlan.prioritySupportEnabled
        },
        currentUser?.email
      );

      showToast?.(`Successfully upgraded to ${selectedPlan.name} Plan!`, 'success');
      setShowUpgradeModal(false);
      loadData();
    } catch (err) {
      showToast?.('Failed to switch plan', 'error');
    }
  };

  const handlePayInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice || !selectedPaymentMethod || !transactionRef.trim()) {
      showToast?.('Please enter payment transaction reference', 'error');
      return;
    }

    try {
      // Record transaction
      await recordTransaction(
        {
          schoolId,
          schoolName,
          invoiceId: payingInvoice.id,
          invoiceNumber: payingInvoice.invoiceNumber,
          amount: payingInvoice.totalAmount,
          currency: payingInvoice.currency,
          paymentMethod: selectedPaymentMethod.name,
          transactionReference: transactionRef,
          status: 'successful',
          date: new Date().toISOString(),
          processedBy: currentUser?.email
        },
        currentUser?.email
      );

      // Mark invoice paid
      await updateInvoiceStatus(payingInvoice.id, 'paid', new Date().toISOString(), currentUser?.email);

      showToast?.(`Payment submitted for Invoice #${payingInvoice.invoiceNumber}!`, 'success');
      setPayingInvoice(null);
      loadData();
    } catch (err) {
      showToast?.('Failed to submit payment', 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading school billing details...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#002147] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-[#D4AF37]">
        <div>
          <span className="px-3 py-1 bg-amber-400/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold rounded-full">
            Commercial SaaS Subscription
          </span>
          <h2 className="text-2xl font-black mt-2">{schoolName} Subscription & Billing</h2>
          <p className="text-xs text-slate-300 mt-1">
            Manage your school’s license tier, capacity limits, invoices, and direct Mobile Money payments.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition border border-white/20"
        >
          <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
          <span>Refresh Subscription</span>
        </button>
      </div>

      {/* CURRENT SUBSCRIPTION CARD */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Active Plan</span>
            <div className="flex items-center gap-3 mt-1">
              <h3 className="text-2xl font-black text-[#002147]">
                {subscription ? subscription.planName : 'Starter Plan (Trial)'}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800'
              }`}>
                {subscription?.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xl font-black text-[#002147]">
                {subscription ? `${subscription.currency} ${subscription.amount.toLocaleString()}` : 'GHS 150'} / mo
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Expires: {subscription ? new Date(subscription.expirationDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>

            <button
              onClick={() => {
                const targetModal = document.getElementById('available-plans-section');
                targetModal?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-[#002147] hover:bg-[#001833] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Capacity Limits Bar Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Student Capacity</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-black text-[#002147] mt-2">
              {subscription?.maxStudents === -1 ? 'Unlimited' : `${subscription?.maxStudents || 150} Students`}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Teacher Capacity</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-[#002147] mt-2">
              {subscription?.maxTeachers === -1 ? 'Unlimited' : `${subscription?.maxTeachers || 10} Teachers`}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Cloud Storage</span>
              <HardDrive className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-[#002147] mt-2">
              {subscription?.maxStorageGB || 5} GB Storage
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>AI Features</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-black text-[#002147] mt-2">
              {subscription?.aiFeaturesEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* AVAILABLE UPGRADE PLANS TIERS */}
      <div id="available-plans-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#002147]">Available Subscription Plans</h3>
            <p className="text-xs text-slate-500">Select a commercial tier to upgrade or renew your license.</p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                cycle === 'monthly' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                cycle === 'annual' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Annual (Save 15%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = subscription?.planId === p.id;
            const priceVal = Number((cycle === 'annual' ? p.annualPrice : p.monthlyPrice) ?? (p as any).price) || 0;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition shadow-sm hover:shadow-md ${
                  isCurrent ? 'border-[#002147] ring-2 ring-[#002147]/20 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#002147] text-lg">{p.name}</h4>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 bg-[#002147] text-white text-[10px] font-black rounded-full">
                        CURRENT PLAN
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-black text-[#002147]">{p.currency || 'GHS'} {priceVal.toLocaleString()}</span>
                    <span className="text-xs text-slate-500"> / {cycle}</span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{p.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span><strong>{p.maxStudents === -1 ? 'Unlimited' : p.maxStudents}</strong> Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span><strong>{p.maxTeachers === -1 ? 'Unlimited' : p.maxTeachers}</strong> Teachers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span><strong>{p.maxStorageGB} GB</strong> Storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{p.aiFeaturesEnabled ? 'AI Grading & Reports' : 'Basic Reporting'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    disabled={isCurrent}
                    onClick={() => handleSelectUpgradePlan(p)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                      isCurrent
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-[#002147] hover:bg-[#001833] text-white shadow-sm'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Subscribe to ${p.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SCHOOL INVOICES TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-[#002147] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#D4AF37]" />
          School Billing Invoices
        </h3>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No billing invoices found for your school.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-bold text-[#002147]">{inv.invoiceNumber}</td>
                    <td className="p-3 font-medium">{inv.billingPeriod}</td>
                    <td className="p-3 font-black text-[#002147]">{inv.currency} {inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => generateInvoicePDF(inv)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        title="Download PDF Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setPayingInvoice(inv);
                            setSelectedPaymentMethod(paymentMethods[0] || null);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs"
                        >
                          Pay Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAY INVOICE MODAL */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Pay Invoice: #{payingInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500 font-bold">Total Payable Amount</div>
              <div className="text-2xl font-black text-[#002147]">
                {payingInvoice.currency} {payingInvoice.totalAmount.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handlePayInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Payment Channel</label>
                <select
                  value={selectedPaymentMethod?.id || ''}
                  onChange={(e) => {
                    const pm = paymentMethods.find(p => p.id === e.target.value);
                    setSelectedPaymentMethod(pm || null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPaymentMethod && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-mono whitespace-pre-wrap">
                  {selectedPaymentMethod.instructions}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Reference / MoMo Transaction ID *</label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. 2026072810229"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM UPGRADE MODAL */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Confirm Plan Upgrade
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              You are subscribing <strong>{schoolName}</strong> to the <strong>{selectedPlan.name} Plan</strong> on an <strong>{cycle}</strong> billing schedule.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Billed:</span>
              <span className="text-xl font-black text-[#002147]">
                {selectedPlan.currency} {(cycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString()}
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlanChange}
                className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Confirm & Activate Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
