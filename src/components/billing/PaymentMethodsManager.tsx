import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  CreditCard, 
  Building, 
  ToggleLeft, 
  ToggleRight, 
  Edit2, 
  CheckCircle, 
  HelpCircle,
  Plus,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { PaymentMethodConfig } from '../../types/billing';
import { fetchAllPaymentMethods, updatePaymentMethodConfig } from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';

export const PaymentMethodsManager: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodConfig | null>(null);

  // Modal State
  const [instructions, setInstructions] = useState('');
  const [feePercent, setFeePercent] = useState(0);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    const data = await fetchAllPaymentMethods();
    setMethods(data);
    setLoading(false);
  };

  const handleToggleEnable = async (method: PaymentMethodConfig) => {
    try {
      await updatePaymentMethodConfig(method.id, { enabled: !method.enabled }, currentUser?.email);
      showToast?.(`${method.name} is now ${!method.enabled ? 'Enabled' : 'Disabled'}`, 'success');
      loadMethods();
    } catch (err) {
      showToast?.('Failed to update payment method status', 'error');
    }
  };

  const handleOpenEdit = (method: PaymentMethodConfig) => {
    setEditingMethod(method);
    setInstructions(method.instructions || '');
    setFeePercent(method.processingFeePercent || 0);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    try {
      await updatePaymentMethodConfig(
        editingMethod.id,
        {
          instructions,
          processingFeePercent: feePercent
        },
        currentUser?.email
      );
      showToast?.(`Saved configuration for ${editingMethod.name}`, 'success');
      setEditingMethod(null);
      loadMethods();
    } catch (err) {
      showToast?.('Failed to save payment method changes', 'error');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-amber-600" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'bank_transfer':
        return <Building className="w-5 h-5 text-emerald-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002147]">Commercial Payment Gateway & Channel Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enable or disable Mobile Money, Visa/Mastercard, and Direct Bank Transfer channels for school subscription payments.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Modular Payment Gateway Ready (Paystack/Hubtel/Stripe)</span>
        </div>
      </div>

      {/* Methods List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading payment methods...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`bg-white rounded-xl border p-5 transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                method.enabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      {getCategoryIcon(method.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#002147] text-base">{method.name}</h3>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {method.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEnable(method)}
                    className="cursor-pointer"
                    title={method.enabled ? 'Disable Channel' : 'Enable Channel'}
                  >
                    {method.enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="py-4 space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-slate-500">Instructions shown to school:</span>
                    <p className="mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-[11px] whitespace-pre-wrap">
                      {method.instructions || 'No specific instructions set.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-slate-600">Processing Fee:</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {method.processingFeePercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => handleOpenEdit(method)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#002147] text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure Instructions & Fee</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT METHOD MODAL */}
      {editingMethod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Configure Channel: {editingMethod.name}
              </h3>
              <button 
                onClick={() => setEditingMethod(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Instructions & Account Details
                </label>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter account number, MoMo merchant ID, bank name, or reference directions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Processing Fee Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={feePercent}
                  onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
