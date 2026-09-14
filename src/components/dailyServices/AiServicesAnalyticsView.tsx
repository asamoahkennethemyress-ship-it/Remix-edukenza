import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Utensils, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  BarChart2, 
  CheckCircle2,
  RefreshCw,
  BrainCircuit,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { generateAiServicesAnalytics } from '../../services/dailyServicesWalletService';

interface Props {
  schoolId: string;
}

export const AiServicesAnalyticsView: React.FC<Props> = ({ schoolId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAiData();
  }, [schoolId]);

  const loadAiData = async () => {
    setLoading(true);
    try {
      const res = await generateAiServicesAnalytics(schoolId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="py-12 text-center text-slate-500 text-xs font-medium">Generating AI predictive intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* AI HERO HEADER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#00152e] text-white p-6 rounded-3xl shadow-xl border-b-4 border-[#D4AF37] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#002147]" />
              EDUkenZA Neural Predictive Engine
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">Daily Services & Wallet AI Intelligence</h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Real-time machine learning predictions for kitchen meal prep, student spending anomaly detection, and automated inventory restocking recommendations.
          </p>
        </div>

        <button
          onClick={loadAiData}
          className="px-5 py-3 bg-[#D4AF37] hover:bg-[#b8952b] text-[#002147] font-black rounded-2xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer z-10"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Re-Run AI Models</span>
        </button>
      </div>

      {/* THREE AI INTELLIGENCE MODULES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MEAL DEMAND PREDICTION */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#D4AF37]" />
              Meal Demand Predictor
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              95% Accuracy
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Recommended kitchen portion preparation for tomorrow based on student historical preferences and timetable.
          </p>

          <div className="space-y-3 pt-1">
            {data.mealDemandPrediction.map((meal: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{meal.meal}</span>
                  <span className="font-mono text-[10px] text-[#D4AF37] font-bold">{meal.confidence}% confidence</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Predicted Orders: <strong className="text-slate-800">{meal.predictedOrders}</strong></span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Prep: {meal.recommendedPrep}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SPENDING ANOMALY DETECTION */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Spending Anomaly Radar
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Active Monitoring
            </span>
          </div>

          <p className="text-xs text-slate-500">
            AI flags irregular student purchasing patterns or rapid wallet depletion for parent notification.
          </p>

          <div className="space-y-3 pt-1">
            {data.spendingAnomalies.map((anom: any, idx: number) => (
              <div key={idx} className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{anom.studentName}</span>
                  <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                    {anom.riskLevel} Risk
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 font-medium">{anom.issue}</div>
                <div className="text-[10px] text-slate-500">Category: {anom.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* INVENTORY RESTOCK ADVISOR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#D4AF37]" />
              Smart Inventory Restock Advisor
            </h3>
            <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
              Automated Reorder
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Recommended inventory purchase orders calculated to prevent out-of-stock items during peak exams.
          </p>

          <div className="space-y-3 pt-1">
            {data.inventoryRestockAdvice.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-[10px] text-slate-400">Current Stock: {item.currentStock} units</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#002147] block">Order +{item.recommendedOrder}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    item.urgency === 'high' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.urgency} Urgency
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
