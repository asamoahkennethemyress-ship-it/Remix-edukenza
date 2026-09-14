import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  BarChart3, 
  PieChart as PieIcon, 
  RefreshCw,
  Users,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { RevenueAnalytics } from '../../types/billing';
import { calculateRevenueAnalytics } from '../../services/billingService';

const PIE_COLORS = ['#002147', '#D4AF37', '#10B981', '#6366F1', '#EC4899', '#F59E0B'];

export const RevenueAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await calculateRevenueAnalytics();
    setAnalytics(data);
    setLoading(false);
  };

  if (loading || !analytics) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#002147] mx-auto mb-2" />
        <p className="font-semibold text-sm">Calculating SaaS Revenue Metrics & Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002147]">Commercial Revenue & SaaS Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time Financial Performance, MRR, ARR, Renewal Rates, and Payment Gateway Distributions.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Monthly Revenue</div>
          <div className="text-xl font-black text-[#002147]">GHS {analytics.monthlyRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +14% vs last month
          </div>
        </div>

        {/* Annual Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Annual Revenue</div>
          <div className="text-xl font-black text-[#002147]">GHS {analytics.annualRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> ARR Projected
          </div>
        </div>

        {/* Active Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Active Schools</div>
          <div className="text-xl font-black text-emerald-700">{analytics.activeSchoolsCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Paying licenses</div>
        </div>

        {/* Trial Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Trial Schools</div>
          <div className="text-xl font-black text-blue-700">{analytics.trialSchoolsCount}</div>
          <div className="text-[10px] text-blue-600 font-medium">In 14-day trial</div>
        </div>

        {/* Expired / Grace */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Expired</div>
          <div className="text-xl font-black text-amber-700">{analytics.expiredCount}</div>
          <div className="text-[10px] text-amber-600 font-medium">Pending renewal</div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Txns</div>
          <div className="text-xl font-black text-purple-700">{analytics.totalTransactionsCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Processed</div>
        </div>

        {/* ARPU */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">ARPU</div>
          <div className="text-xl font-black text-[#D4AF37]">GHS {analytics.arpu.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 font-medium">Avg Rev / School</div>
        </div>
      </div>

      {/* RENEWAL RATE & CHURN BARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renewal Rate</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{analytics.renewalRatePercent}%</div>
            <p className="text-xs text-slate-500 mt-1">High retention across active school subscriptions.</p>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-emerald-700 text-lg">
            {analytics.renewalRatePercent}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Churn Rate</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{analytics.churnRatePercent}%</div>
            <p className="text-xs text-slate-500 mt-1">Expired or cancelled subscriptions percentage.</p>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-rose-400 flex items-center justify-center font-black text-rose-700 text-lg">
            {analytics.churnRatePercent}%
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#002147] text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              Monthly Revenue Growth Trend
            </h3>
            <span className="text-xs font-semibold text-slate-400">Last 6 Months</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyRevenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002147" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#002147" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip 
                  formatter={(val: any) => [`GHS ${val.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#002147" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#002147] text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Subscription Plan Distribution
            </h3>
            <span className="text-xs font-semibold text-slate-400">By Active Licenses</span>
          </div>

          <div className="h-64 w-full">
            {analytics.planDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No plan data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.planDistribution}
                    dataKey="count"
                    nameKey="planName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.planName || entry.name || ''} (${entry.percentage || 0}%)`}
                  >
                    {analytics.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#002147] text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Payment Channel Revenue Volume
            </h3>
            <span className="text-xs font-semibold text-slate-400">Mobile Money vs Cards vs Bank</span>
          </div>

          <div className="h-60 w-full">
            {analytics.paymentMethodDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No payment volume data recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.paymentMethodDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="method" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip formatter={(val: any) => [`GHS ${val.toLocaleString()}`, 'Total Volume']} />
                  <Bar dataKey="totalAmount" fill="#002147" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
