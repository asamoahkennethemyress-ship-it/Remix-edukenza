import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { isPlatformOwner } from '../utils/permissions';
import { PricingPlanDoc } from '../types';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  AlertTriangle, 
  Loader2, 
  Check, 
  X, 
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const PricingManagement: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const isOwner = isPlatformOwner(currentUser);

  const [plans, setPlans] = useState<PricingPlanDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form & Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlanDoc | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form fields
  const [formData, setFormData] = useState<{
    planName: string;
    price: string;
    currency: string;
    billingPeriod: string;
    description: string;
    featuresText: string;
    buttonText: string;
    status: 'active' | 'inactive';
    order: number;
    popular: boolean;
  }>({
    planName: '',
    price: '',
    currency: 'R',
    billingPeriod: '/ month',
    description: '',
    featuresText: '',
    buttonText: 'Select Plan',
    status: 'active',
    order: 1,
    popular: false
  });

  // Delete confirmation modal state
  const [planToDelete, setPlanToDelete] = useState<PricingPlanDoc | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Real-time listener on pricingPlans collection
  useEffect(() => {
    setLoading(true);
    setError(null);

    const plansRef = collection(db, 'pricingPlans');
    const unsubscribe = onSnapshot(
      plansRef,
      (snapshot) => {
        try {
          const fetchedPlans: PricingPlanDoc[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              docId: d.id,
              id: d.id,
              planName: data.planName || 'Unnamed Plan',
              price: data.price !== undefined ? data.price : '0',
              currency: data.currency || '',
              billingPeriod: data.billingPeriod || '/ month',
              description: data.description || '',
              features: Array.isArray(data.features) ? data.features : [],
              buttonText: data.buttonText || 'Select Plan',
              status: data.status === 'inactive' ? 'inactive' : 'active',
              order: typeof data.order === 'number' ? data.order : 1,
              popular: !!data.popular,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
          });

          // Sort by order ascending
          fetchedPlans.sort((a, b) => (a.order || 0) - (b.order || 0));

          setPlans(fetchedPlans);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error('[PRICING MANAGEMENT] Error processing snapshot:', err);
          setError(err.message || 'Failed to parse pricing plans');
          setLoading(false);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pricingPlans');
        console.warn('[PRICING MANAGEMENT] Snapshot listener notice:', err);
        setError('Failed to sync pricing plans. Please verify database connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm space-y-2">
        <div className="flex items-center gap-2 font-black uppercase tracking-wide text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>Access Restricted</span>
        </div>
        <p>Only the Platform Owner can access and manage pricing plans in the App Control Center.</p>
      </div>
    );
  }

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextOrder = plans.length > 0 ? Math.max(...plans.map((p) => p.order || 0)) + 1 : 1;
    setEditingPlan(null);
    setFormData({
      planName: '',
      price: '1500',
      currency: 'R',
      billingPeriod: '/ month',
      description: '',
      featuresText: 'Full Platform Access\nAcademic & Exam Modules\nParent & Student Portals\n24/7 Email Support',
      buttonText: 'Select Plan',
      status: 'active',
      order: nextOrder,
      popular: false
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan: PricingPlanDoc) => {
    setEditingPlan(plan);
    setFormData({
      planName: plan.planName,
      price: String(plan.price),
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      description: plan.description,
      featuresText: plan.features.join('\n'),
      buttonText: plan.buttonText,
      status: plan.status,
      order: plan.order,
      popular: !!plan.popular
    });
    setIsModalOpen(true);
  };

  // Save Plan (Create or Edit)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.planName.trim()) {
      showToast('Plan Name is required.', 'error');
      return;
    }

    if (!formData.price.toString().trim()) {
      showToast('Price is required.', 'error');
      return;
    }

    const featuresList = formData.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    setSaving(true);
    try {
      const now = new Date().toISOString();

      const payload: Omit<PricingPlanDoc, 'id' | 'docId'> = {
        planName: formData.planName.trim(),
        price: formData.price.trim(),
        currency: formData.currency.trim(),
        billingPeriod: formData.billingPeriod.trim(),
        description: formData.description.trim(),
        features: featuresList,
        buttonText: formData.buttonText.trim() || 'Select Plan',
        status: formData.status,
        order: Number(formData.order) || 1,
        popular: formData.popular,
        updatedAt: now
      };

      if (editingPlan && editingPlan.docId) {
        // Edit existing doc
        const planDocRef = doc(db, 'pricingPlans', editingPlan.docId);
        await updateDoc(planDocRef, payload);
        showToast(`Pricing plan "${formData.planName}" updated successfully!`, 'success');
      } else {
        // Create new doc
        const newPayload = {
          ...payload,
          createdAt: now
        };
        await addDoc(collection(db, 'pricingPlans'), newPayload);
        showToast(`Pricing plan "${formData.planName}" created successfully!`, 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, editingPlan?.docId ? OperationType.UPDATE : OperationType.CREATE, 'pricingPlans');
      console.error('[PRICING MANAGEMENT] Save failed:', err);
      showToast(`Failed to save plan: ${err.message || 'Firestore error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Activate / Deactivate
  const handleToggleStatus = async (plan: PricingPlanDoc) => {
    if (!plan.docId) return;
    const newStatus: 'active' | 'inactive' = plan.status === 'active' ? 'inactive' : 'active';

    try {
      const planRef = doc(db, 'pricingPlans', plan.docId);
      await updateDoc(planRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(
        `Plan "${plan.planName}" is now ${newStatus === 'active' ? 'ACTIVATED (visible on website)' : 'DEACTIVATED (hidden)'}.`,
        'success'
      );
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `pricingPlans/${plan.docId}`);
      console.error('[PRICING MANAGEMENT] Status toggle failed:', err);
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  // Delete Plan Confirmation & Delete
  const handleConfirmDelete = async () => {
    if (!planToDelete || !planToDelete.docId) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'pricingPlans', planToDelete.docId));
      showToast(`Pricing plan "${planToDelete.planName}" deleted permanently.`, 'success');
      setPlanToDelete(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `pricingPlans/${planToDelete.docId}`);
      console.error('[PRICING MANAGEMENT] Delete failed:', err);
      showToast(`Failed to delete plan: ${err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Reorder Plans (Shift up or down)
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const currentPlan = plans[index];
    const targetPlan = plans[targetIndex];

    if (!currentPlan.docId || !targetPlan.docId) return;

    try {
      const batch = writeBatch(db);
      
      const currentRef = doc(db, 'pricingPlans', currentPlan.docId);
      const targetRef = doc(db, 'pricingPlans', targetPlan.docId);

      batch.update(currentRef, { order: targetPlan.order, updatedAt: new Date().toISOString() });
      batch.update(targetRef, { order: currentPlan.order, updatedAt: new Date().toISOString() });

      await batch.commit();
      showToast('Plan sequence reordered live.', 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'pricingPlans');
      console.error('[PRICING MANAGEMENT] Reorder failed:', err);
      showToast(`Failed to reorder: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#D4AF37]" />
            <h2 className="text-2xl font-black text-[#002147] tracking-tight">Dynamic Pricing Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure, activate, deactivate, or reorder public pricing tiers displayed on the EDUkenZA marketing website in real-time.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Create Pricing Plan</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading Skeleton / Loader */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Syncing Pricing Plans from Firestore...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#002147]">No Pricing Plans Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create your first pricing plan to make it visible on the marketing website.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded bg-[#002147] text-white text-xs font-bold uppercase tracking-wider"
          >
            Create Plan
          </button>
        </div>
      ) : (
        /* Pricing Plans Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={plan.docId || index}
              className={`relative rounded-xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                plan.status === 'active'
                  ? plan.popular
                    ? 'bg-[#002147] text-white border-[#D4AF37] shadow-lg'
                    : 'bg-white text-slate-900 border-slate-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-dashed border-slate-300 opacity-80'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && plan.status === 'active' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#002147] px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Popular Plan</span>
                </div>
              )}

              <div className="space-y-4">
                
                {/* Plan Status Header */}
                <div className="flex items-center justify-between border-b pb-2 border-slate-200/40">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Order #{plan.order}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      plan.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {plan.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Name & Tagline */}
                <div>
                  <h3 className={`text-lg font-black uppercase tracking-tight ${plan.status === 'active' && plan.popular ? 'text-white' : 'text-[#002147]'}`}>
                    {plan.planName}
                  </h3>
                  <p className="text-xs mt-1 text-slate-500 leading-relaxed min-h-[36px]">
                    {plan.description || 'No description provided.'}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-2.5 border-y border-slate-200/40">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${plan.status === 'active' && plan.popular ? 'text-[#D4AF37]' : 'text-[#002147]'}`}>
                      {plan.currency}{plan.price}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {plan.billingPeriod}
                    </span>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="space-y-1.5 text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Included Features ({plan.features.length}):
                  </div>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-1.5 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Action Controls Footer */}
              <div className="pt-4 border-t border-slate-200/40 mt-4 space-y-2">
                
                {/* Primary Button Preview */}
                <div className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-wider mb-2">
                  Button: "{plan.buttonText}"
                </div>

                {/* Controls toolbar */}
                <div className="flex items-center justify-between gap-1">
                  
                  {/* Reorder Up / Down */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0}
                      title="Move Up in Order"
                      className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === plans.length - 1}
                      title="Move Down in Order"
                      className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Activate / Deactivate Toggle */}
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    title={plan.status === 'active' ? 'Deactivate Plan' : 'Activate Plan'}
                    className={`px-2.5 py-1.5 rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition cursor-pointer ${
                      plan.status === 'active'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {plan.status === 'active' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>

                  {/* Edit Plan */}
                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    title="Edit Plan"
                    className="p-1.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Plan */}
                  <button
                    onClick={() => setPlanToDelete(plan)}
                    title="Delete Plan"
                    className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT PRICING PLAN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full my-8 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-black text-[#002147] uppercase tracking-tight">
                  {editingPlan ? 'Edit Pricing Plan' : 'Create New Pricing Plan'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              
              {/* Plan Name & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic, Enterprise, Gold"
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              {/* Price, Currency, Billing Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Currency Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. R, $, $"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Price *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1500 or Free or Custom"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Billing Period</label>
                  <input
                    type="text"
                    placeholder="e.g. / month, / year, Contact Us"
                    value={formData.billingPeriod}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>
              </div>

              {/* Description / Tagline */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase">Short Description / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Essential SaaS management for growing primary schools"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                />
              </div>

              {/* Button Text & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Button Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Select Plan, Contact Sales"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 outline-none focus:border-[#002147]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 bg-white"
                  >
                    <option value="active">Active (Visible on Website)</option>
                    <option value="inactive">Inactive (Hidden from Website)</option>
                  </select>
                </div>
              </div>

              {/* Popular Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="popular-checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                  className="w-4 h-4 text-[#002147] rounded border-slate-300 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="popular-checkbox" className="font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Highlight as "Most Popular Choice" badge</span>
                </label>
              </div>

              {/* Features (One per line) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-700 uppercase">Included Features (Enter one per line)</label>
                  <span className="text-[10px] text-slate-400">Lines will convert to checkmarks</span>
                </div>
                <textarea
                  rows={5}
                  placeholder={`Up to 500 Students Cap\nFull Academic & Exam Modules\nParent & Student Portals\n24/7 Priority Support`}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 outline-none focus:border-[#002147]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>{editingPlan ? 'Update Plan' : 'Publish Plan'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE PRICING PLAN --- */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-[#002147]">Delete Pricing Plan</h3>
                <p className="text-xs text-slate-500 font-medium">Confirm Permanent Firestore Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              Are you sure you want to delete the pricing plan <strong className="text-slate-900">"{planToDelete.planName}"</strong>? This will remove it from Firestore immediately and it will no longer appear on the website.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPlanToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow transition disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
