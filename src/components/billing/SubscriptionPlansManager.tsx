import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ShieldCheck, 
  HardDrive, 
  Users, 
  GraduationCap, 
  BookOpen,
  DollarSign,
  Info,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { SubscriptionPlan } from '../../types/billing';
import { 
  fetchAllSubscriptionPlans, 
  createSubscriptionPlan, 
  updateSubscriptionPlan, 
  deleteSubscriptionPlan 
} from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';

export const SubscriptionPlansManager: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<SubscriptionPlan, 'id'>>({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'GHS',
    trialDays: 14,
    maxStudents: 500,
    maxTeachers: 25,
    maxParents: 1000,
    maxClasses: 20,
    maxStorageGB: 10,
    aiFeaturesEnabled: true,
    customBrandingEnabled: true,
    prioritySupportEnabled: false,
    status: 'active',
    displayOrder: 1
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await fetchAllSubscriptionPlans();
    setPlans(data);
    setLoading(false);
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      monthlyPrice: 100,
      annualPrice: 1000,
      currency: 'GHS',
      trialDays: 14,
      maxStudents: 500,
      maxTeachers: 25,
      maxParents: 1000,
      maxClasses: 20,
      maxStorageGB: 10,
      aiFeaturesEnabled: true,
      customBrandingEnabled: false,
      prioritySupportEnabled: false,
      status: 'active',
      displayOrder: plans.length + 1
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      currency: plan.currency || 'GHS',
      trialDays: plan.trialDays,
      maxStudents: plan.maxStudents,
      maxTeachers: plan.maxTeachers,
      maxParents: plan.maxParents,
      maxClasses: plan.maxClasses,
      maxStorageGB: plan.maxStorageGB,
      aiFeaturesEnabled: plan.aiFeaturesEnabled,
      customBrandingEnabled: plan.customBrandingEnabled,
      prioritySupportEnabled: plan.prioritySupportEnabled,
      status: plan.status,
      displayOrder: plan.displayOrder
    });
    setShowModal(true);
  };

  const handleDuplicatePlan = async (plan: SubscriptionPlan) => {
    try {
      const dupData: Omit<SubscriptionPlan, 'id'> = {
        ...plan,
        name: `${plan.name} (Copy)`,
        displayOrder: plans.length + 1
      };
      await createSubscriptionPlan(dupData, currentUser?.email);
      showToast?.(`Duplicated plan as "${dupData.name}"`, 'success');
      loadPlans();
    } catch (err) {
      showToast?.('Failed to duplicate plan', 'error');
    }
  };

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    const nextStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      await updateSubscriptionPlan(plan.id, { status: nextStatus }, currentUser?.email);
      showToast?.(`Plan ${plan.name} set to ${nextStatus}`, 'success');
      loadPlans();
    } catch (err) {
      showToast?.('Failed to update status', 'error');
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) return;
    try {
      await deleteSubscriptionPlan(plan.id, plan.name, currentUser?.email);
      showToast?.(`Deleted plan "${plan.name}"`, 'success');
      loadPlans();
    } catch (err) {
      showToast?.('Failed to delete plan', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast?.('Plan name is required', 'error');
      return;
    }

    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, formData, currentUser?.email);
        showToast?.(`Plan "${formData.name}" updated successfully`, 'success');
      } else {
        await createSubscriptionPlan(formData, currentUser?.email);
        showToast?.(`Plan "${formData.name}" created successfully`, 'success');
      }
      setShowModal(false);
      loadPlans();
    } catch (err) {
      showToast?.('Failed to save subscription plan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-100 text-[#002147] text-xs font-bold rounded-full border border-amber-300">
              Platform Owner Control
            </span>
            <h2 className="text-xl font-bold text-[#002147]">Commercial Subscription Plans</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Define pricing tiers, trial durations, feature flags, and student/teacher capacity limits for EDUkenZA.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#002147] hover:bg-[#001833] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading commercial subscription plans...</div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-600 font-medium">No subscription plans found in database.</p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-3 px-4 py-2 bg-[#002147] text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                plan.status === 'active' ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20 opacity-75'
              }`}
            >
              <div>
                {/* Top Badge Banner */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Order #{plan.displayOrder}</span>
                    <h3 className="text-lg font-black text-[#002147] mt-0.5">{plan.name}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      plan.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {plan.status.toUpperCase()}
                  </span>
                </div>

                {/* Price Display */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#002147]">{plan.currency} {plan.monthlyPrice.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    Or {plan.currency} {plan.annualPrice.toLocaleString()} / year (Save ~15%)
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                    {plan.description || 'Standard commercial tier for school management.'}
                  </p>
                </div>

                {/* Features & Limits Checklist */}
                <div className="p-5 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>{plan.maxStudents === -1 ? 'Unlimited' : plan.maxStudents.toLocaleString()}</strong> Students</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>{plan.maxTeachers === -1 ? 'Unlimited' : plan.maxTeachers.toLocaleString()}</strong> Teachers</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>{plan.maxClasses === -1 ? 'Unlimited' : plan.maxClasses.toLocaleString()}</strong> Classes</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>{plan.maxStorageGB} GB</strong> Storage</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>{plan.trialDays} Days</strong> Free Trial</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      {plan.aiFeaturesEnabled ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={plan.aiFeaturesEnabled ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                        AI Powered Features
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.customBrandingEnabled ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={plan.customBrandingEnabled ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                        Custom School Branding
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.prioritySupportEnabled ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={plan.prioritySupportEnabled ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                        Priority 24/7 SLA Support
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                <button
                  onClick={() => handleToggleStatus(plan)}
                  title={plan.status === 'active' ? 'Deactivate Plan' : 'Activate Plan'}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    plan.status === 'active' 
                      ? 'text-amber-700 hover:bg-amber-100' 
                      : 'text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {plan.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleDuplicatePlan(plan)}
                  title="Duplicate Plan"
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleOpenEditModal(plan)}
                  title="Edit Plan"
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(plan)}
                  title="Delete Plan"
                  className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                {editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : 'Create Commercial Subscription Plan'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Standard"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short marketing explanation for school admins..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Price</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Annual Price</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.annualPrice}
                    onChange={(e) => setFormData({ ...formData, annualPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="GHS">GHS (Ghana Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="NGN">NGN (Nigerian Naira)</option>
                    <option value="KES">KES (Kenyan Shilling)</option>
                  </select>
                </div>
              </div>

              {/* Limits Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource Capacity Limits (-1 for Unlimited)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Students</label>
                    <input
                      type="number"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || -1 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Teachers</label>
                    <input
                      type="number"
                      value={formData.maxTeachers}
                      onChange={(e) => setFormData({ ...formData, maxTeachers: parseInt(e.target.value) || -1 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Parents</label>
                    <input
                      type="number"
                      value={formData.maxParents}
                      onChange={(e) => setFormData({ ...formData, maxParents: parseInt(e.target.value) || -1 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Classes</label>
                    <input
                      type="number"
                      value={formData.maxClasses}
                      onChange={(e) => setFormData({ ...formData, maxClasses: parseInt(e.target.value) || -1 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Storage (GB)</label>
                    <input
                      type="number"
                      value={formData.maxStorageGB}
                      onChange={(e) => setFormData({ ...formData, maxStorageGB: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aiFeaturesEnabled}
                    onChange={(e) => setFormData({ ...formData, aiFeaturesEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#002147] rounded"
                  />
                  <span>AI Features Enabled</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.customBrandingEnabled}
                    onChange={(e) => setFormData({ ...formData, customBrandingEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#002147] rounded"
                  />
                  <span>Custom School Branding</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.prioritySupportEnabled}
                    onChange={(e) => setFormData({ ...formData, prioritySupportEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#002147] rounded"
                  />
                  <span>Priority Support SLA</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm"
                >
                  {editingPlan ? 'Save Plan Changes' : 'Create Subscription Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
