import React, { useState } from 'react';
import { 
  CreditCard, 
  Building2, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Sliders, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Layers
} from 'lucide-react';
import { SubscriptionPlansManager } from './SubscriptionPlansManager';
import { SchoolSubscriptionsManager } from './SchoolSubscriptionsManager';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { BillingInvoicesManager } from './BillingInvoicesManager';
import { TransactionsManager } from './TransactionsManager';
import { RevenueAnalyticsDashboard } from './RevenueAnalyticsDashboard';
import { EnterpriseDailyServicesModule } from '../dailyServices/EnterpriseDailyServicesModule';

export type BillingTab = 
  | 'plans' 
  | 'subscriptions' 
  | 'invoices' 
  | 'payment-methods' 
  | 'analytics' 
  | 'transactions'
  | 'daily-services';

export const BillingManagementSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BillingTab>('daily-services');

  const tabs: Array<{ id: BillingTab; label: string; icon: any; description: string }> = [
    {
      id: 'daily-services',
      label: 'Daily Services & Wallet Ecosystem',
      icon: Sparkles,
      description: 'Daily canteen, bus tracking, student digital wallet & shop inventory'
    },
    {
      id: 'analytics',
      label: 'Revenue Analytics',
      icon: TrendingUp,
      description: 'MRR, ARR, Subscription growth, and financial metrics'
    },
    {
      id: 'plans',
      label: 'Subscription Plans',
      icon: Layers,
      description: 'Manage pricing tiers, capacity limits & AI capabilities'
    },
    {
      id: 'subscriptions',
      label: 'School Subscriptions',
      icon: Building2,
      description: 'Directory of active, trial & expired school licenses'
    },
    {
      id: 'invoices',
      label: 'Billing & Invoices',
      icon: FileText,
      description: 'Tax invoices, PDF downloads & email dispatch'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CreditCard,
      description: 'Audit log of all Mobile Money, card & bank payments'
    },
    {
      id: 'payment-methods',
      label: 'Payment Methods',
      icon: Sliders,
      description: 'Configure MoMo channels, fees & gateway instructions'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-[#002147] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-[#D4AF37]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] text-xs font-black rounded-full uppercase tracking-wider">
              Commercial SaaS Billing Engine
            </span>
            <span className="text-xs text-slate-300 font-semibold">• Real Firestore Storage & Rules</span>
          </div>
          <h1 className="text-2xl font-black mt-2">EDUkenZA Subscription & Revenue Management</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Commercial platform control center for creating subscription plans, tracking active school licenses, issuing tax invoices, auditing Mobile Money transactions, and analyzing MRR/ARR growth.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-right">
            <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">SaaS Engine Status</div>
            <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Operational & Syncing</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#002147] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#002147]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div>
        {activeTab === 'daily-services' && <EnterpriseDailyServicesModule />}
        {activeTab === 'analytics' && <RevenueAnalyticsDashboard />}
        {activeTab === 'plans' && <SubscriptionPlansManager />}
        {activeTab === 'subscriptions' && <SchoolSubscriptionsManager />}
        {activeTab === 'invoices' && <BillingInvoicesManager />}
        {activeTab === 'transactions' && <TransactionsManager />}
        {activeTab === 'payment-methods' && <PaymentMethodsManager />}
      </div>
    </div>
  );
};
