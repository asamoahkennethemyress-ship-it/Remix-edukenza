import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { SchoolSubscription, SubscriptionPlan, SubscriptionStatus } from '../../types/billing';
import { 
  fetchAllSchoolSubscriptions, 
  fetchAllSubscriptionPlans, 
  createOrUpdateSchoolSubscription,
  generateInvoice
} from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';

export const SchoolSubscriptionsManager: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [selectedSub, setSelectedSub] = useState<SchoolSubscription | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);

  // Modal edit state
  const [newPlanId, setNewPlanId] = useState('');
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>('active');
  const [newExpirationDate, setNewExpirationDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [subList, planList] = await Promise.all([
      fetchAllSchoolSubscriptions(),
      fetchAllSubscriptionPlans()
    ]);
    setSubscriptions(subList);
    setPlans(planList);
    setLoading(false);
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.schoolName.toLowerCase().includes(search.toLowerCase()) || s.planName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleOpenManageModal = (sub: SchoolSubscription) => {
    setSelectedSub(sub);
    setNewPlanId(sub.planId);
    setNewStatus(sub.status);
    setNewExpirationDate(sub.expirationDate.split('T')[0] || new Date().toISOString().split('T')[0]);
    setShowManageModal(true);
  };

  const handleSaveSubscriptionChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    const chosenPlan = plans.find(p => p.id === newPlanId) || {
      name: selectedSub.planName,
      monthlyPrice: selectedSub.amount,
      maxStudents: selectedSub.maxStudents,
      maxTeachers: selectedSub.maxTeachers,
      maxParents: selectedSub.maxParents,
      maxClasses: selectedSub.maxClasses,
      maxStorageGB: selectedSub.maxStorageGB,
      aiFeaturesEnabled: selectedSub.aiFeaturesEnabled,
      customBrandingEnabled: selectedSub.customBrandingEnabled,
      prioritySupportEnabled: selectedSub.prioritySupportEnabled
    };

    try {
      await createOrUpdateSchoolSubscription(
        {
          ...selectedSub,
          planId: newPlanId,
          planName: chosenPlan.name,
          amount: chosenPlan.monthlyPrice,
          status: newStatus,
          expirationDate: new Date(newExpirationDate).toISOString(),
          maxStudents: chosenPlan.maxStudents,
          maxTeachers: chosenPlan.maxTeachers,
          maxParents: chosenPlan.maxParents,
          maxClasses: chosenPlan.maxClasses,
          maxStorageGB: chosenPlan.maxStorageGB,
          aiFeaturesEnabled: chosenPlan.aiFeaturesEnabled,
          customBrandingEnabled: chosenPlan.customBrandingEnabled,
          prioritySupportEnabled: chosenPlan.prioritySupportEnabled
        },
        currentUser?.email
      );

      showToast?.(`Updated subscription for ${selectedSub.schoolName}`, 'success');
      setShowManageModal(false);
      loadData();
    } catch (err) {
      showToast?.('Failed to update school subscription', 'error');
    }
  };

  const handleQuickApprove = async (sub: SchoolSubscription) => {
    try {
      const nextExpDate = new Date();
      nextExpDate.setMonth(nextExpDate.getMonth() + 1);

      await createOrUpdateSchoolSubscription(
        {
          ...sub,
          status: 'active',
          paymentStatus: 'paid',
          expirationDate: nextExpDate.toISOString()
        },
        currentUser?.email
      );

      // Auto generate invoice
      await generateInvoice(
        {
          schoolId: sub.schoolId,
          schoolName: sub.schoolName,
          planId: sub.planId,
          planName: sub.planName,
          billingPeriod: `${new Date().toLocaleDateString()} - ${nextExpDate.toLocaleDateString()}`,
          amount: sub.amount,
          taxAmount: 0,
          totalAmount: sub.amount,
          currency: sub.currency || 'GHS',
          status: 'paid',
          dueDate: new Date().toISOString().split('T')[0],
          notes: 'Auto-generated invoice on manual approval.'
        },
        currentUser?.email
      );

      showToast?.(`Approved subscription for ${sub.schoolName}`, 'success');
      loadData();
    } catch (err) {
      showToast?.('Failed to approve subscription', 'error');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
      case 'trial':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Trial</span>;
      case 'expired':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Expired</span>;
      case 'suspended':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Suspended</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002147]">School Subscriptions Directory</h2>
          <p className="text-sm text-slate-500 mt-1">
            Track active SaaS school licenses, subscription statuses, billing expiration dates, and quick upgrades.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search school name or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="trial">Free Trial Only</option>
            <option value="expired">Expired Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading school subscriptions...</div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No school subscriptions match your filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">School Details</th>
                  <th className="p-4">Plan & Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Expiration / Renewal</th>
                  <th className="p-4">Resource Limits</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-[#002147] text-sm">{sub.schoolName}</div>
                      <div className="text-slate-400 font-mono text-[11px]">ID: {sub.schoolId}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-800">{sub.planName}</div>
                      <div className="text-slate-500 font-medium">
                        {sub.currency || 'GHS'} {sub.amount.toLocaleString()} / {sub.billingCycle || 'monthly'}
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(sub.status)}
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800">
                        {new Date(sub.expirationDate || Date.now()).toLocaleDateString()}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Auto-renew: {sub.autoRenew ? 'Enabled' : 'Disabled'}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5 text-[11px] text-slate-600">
                        <div>Students: <strong>{sub.maxStudents === -1 ? 'Unlimited' : sub.maxStudents}</strong></div>
                        <div>Teachers: <strong>{sub.maxTeachers === -1 ? 'Unlimited' : sub.maxTeachers}</strong></div>
                      </div>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      {sub.status === 'trial' || sub.status === 'expired' ? (
                        <button
                          onClick={() => handleQuickApprove(sub)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition"
                        >
                          Approve / Renew
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleOpenManageModal(sub)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGE SUBSCRIPTION MODAL */}
      {showManageModal && selectedSub && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Manage License: {selectedSub.schoolName}
              </h3>
              <button 
                onClick={() => setShowManageModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscriptionChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Plan</label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currency} {p.monthlyPrice}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="trial">Trial (Temporary Access)</option>
                  <option value="expired">Expired (Grace Period)</option>
                  <option value="suspended">Suspended (Features Blocked)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
