import React from 'react';
import {
  BookOpen,
  Download,
  Eye,
  Clock,
  TrendingUp,
  Award,
  Layers,
  PieChart,
  BarChart,
  Users,
  CheckCircle2
} from 'lucide-react';
import { LibraryResource } from '../../types/library';

interface LibraryAnalyticsViewProps {
  resources: LibraryResource[];
  schoolName: string;
}

export const LibraryAnalyticsView: React.FC<LibraryAnalyticsViewProps> = ({
  resources,
  schoolName
}) => {
  const totalResources = resources.length;
  const totalDownloads = resources.reduce((acc, r) => acc + (r.downloadsCount || 0), 0);
  const totalViews = resources.reduce((acc, r) => acc + (r.viewsCount || 0), 0);
  const totalPhysicalCopies = resources.reduce((acc, r) => acc + (r.totalPhysicalCopies || 0), 0);
  const physicalAvailable = resources.reduce((acc, r) => acc + (r.availablePhysicalCopies || 0), 0);

  // Group by category
  const categoryMap = new Map<string, number>();
  resources.forEach(r => {
    categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
  });
  const categoryStats = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

  // Top Circulating & Most Viewed Resources from real resources
  const topCirculatingResources = [...resources]
    .sort((a, b) => ((b.viewsCount || 0) + (b.downloadsCount || 0)) - ((a.viewsCount || 0) + (a.downloadsCount || 0)))
    .slice(0, 5);

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#002147] via-[#001733] to-[#001024] border border-[#D4AF37]/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">
            Executive Analytics • {schoolName}
          </span>
          <h2 className="text-xl font-black text-white mt-1">Digital Library & Learning Resource Center Intelligence</h2>
          <p className="text-xs text-slate-300 mt-0.5">Real-time statistics on resource utilization, reading hours, and curriculum engagement.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-center">
            <span className="text-[9px] font-bold text-slate-300 uppercase block">Total Catalog</span>
            <span className="text-lg font-black text-[#D4AF37]">{totalResources} Titles</span>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Downloads</span>
          <p className="text-xl font-black text-white">{totalDownloads.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Reader Views</span>
          <p className="text-xl font-black text-white">{totalViews.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Est. Reading Hours</span>
          <p className="text-xl font-black text-white">{Math.round(totalViews * 0.4)} Hours</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Physical Book Inventory</span>
          <p className="text-xl font-black text-white">{physicalAvailable} / {totalPhysicalCopies} Available</p>
        </div>
      </div>

      {/* CATEGORIES BREAKDOWN & LEADERBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Resource Category Distribution
          </h3>
          <div className="space-y-2">
            {categoryStats.map(cat => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>{cat.name}</span>
                  <span className="text-amber-400">{cat.count} Titles</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (cat.count / totalResources) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Circulating Resources */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
            <Award className="w-4 h-4" /> Top Circulating Resources
          </h3>
          <div className="space-y-3">
            {topCirculatingResources.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No resources indexed yet.</div>
            ) : (
              topCirculatingResources.map((r, i) => (
                <div key={r.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-[#D4AF37] text-[#002147] font-black text-xs flex items-center justify-center shrink-0">
                      #{i + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-xs line-clamp-1">{r.title}</h4>
                      <span className="text-[10px] text-slate-400">{r.category} {r.gradeClass ? `• ${r.gradeClass}` : ''}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-amber-400 text-xs block">{r.downloadsCount || 0} Downloads</span>
                    <span className="text-[10px] text-slate-400">{r.viewsCount || 0} Views</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
