import React, { useState } from 'react';
import { 
  Layers, 
  Wallet, 
  Utensils, 
  Bus, 
  ShoppingBag, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2,
  DollarSign,
  QrCode
} from 'lucide-react';
import { DailyServicesManager } from './DailyServicesManager';
import { StudentWalletHub } from './StudentWalletHub';
import { CanteenPosAndPreOrders } from './CanteenPosAndPreOrders';
import { TransportBusTracker } from './TransportBusTracker';
import { SchoolShopAndInventory } from './SchoolShopAndInventory';
import { AiServicesAnalyticsView } from './AiServicesAnalyticsView';

interface Props {
  schoolId?: string;
  userRole?: 'parent' | 'school_admin' | 'teacher' | 'student' | 'owner' | 'canteen_staff';
  currentStudentId?: string;
  students?: any[];
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EnterpriseDailyServicesModule: React.FC<Props> = ({
  schoolId = '',
  userRole = 'school_admin',
  currentStudentId = '',
  students = [],
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'wallets' | 'canteen' | 'transport' | 'shop' | 'ai_analytics'>('services');

  return (
    <div className="space-y-6">
      {/* TOP ECOSYSTEM HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#001833] text-white p-6 rounded-3xl shadow-xl border-b-4 border-[#D4AF37] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Background Radial Glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#002147]" />
              EDUkenZA Enterprise Module
            </span>
            <span className="text-xs text-slate-300 font-medium">Daily Services & Wallet Ecosystem</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Daily Chargeable Services, Student Wallet & Campus Ecosystem
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Integrated canteen meals, school bus tracking, digital wallet, store inventory, QR/NFC ID cards, and AI predictive intelligence.
          </p>
        </div>

        <div className="z-10 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-right min-w-[150px]">
          <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">Multi-Tenant Status</span>
          <span className="text-xs font-black text-white flex items-center justify-end gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Isolated & Secured
          </span>
          <span className="text-[9px] text-slate-300 block font-mono mt-0.5">{schoolId}</span>
        </div>
      </div>

      {/* MASTER NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1 overflow-x-auto">
        {[
          { id: 'services', label: 'Daily Services Manager', icon: Layers },
          { id: 'wallets', label: 'Student Wallet & Cards', icon: Wallet },
          { id: 'canteen', label: 'Canteen POS & Meals', icon: Utensils },
          { id: 'transport', label: 'Bus Fleet & Live GPS', icon: Bus },
          { id: 'shop', label: 'School Store & Inventory', icon: ShoppingBag },
          { id: 'ai_analytics', label: 'AI Services Analytics', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#002147] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE TAB */}
      <div className="transition-all duration-200">
        {activeTab === 'services' && (
          <DailyServicesManager
            schoolId={schoolId}
            showToast={showToast}
            students={students}
          />
        )}

        {activeTab === 'wallets' && (
          <StudentWalletHub
            schoolId={schoolId}
            studentId={currentStudentId}
            userRole={userRole as any}
            showToast={showToast}
            students={students}
          />
        )}

        {activeTab === 'canteen' && (
          <CanteenPosAndPreOrders
            schoolId={schoolId}
            userRole={userRole as any}
            currentStudentId={currentStudentId}
            showToast={showToast}
            students={students}
          />
        )}

        {activeTab === 'transport' && (
          <TransportBusTracker
            schoolId={schoolId}
            userRole={userRole as any}
            showToast={showToast}
            students={students}
          />
        )}

        {activeTab === 'shop' && (
          <SchoolShopAndInventory
            schoolId={schoolId}
            userRole={userRole as any}
            showToast={showToast}
            students={students}
          />
        )}

        {activeTab === 'ai_analytics' && (
          <AiServicesAnalyticsView
            schoolId={schoolId}
          />
        )}
      </div>
    </div>
  );
};
