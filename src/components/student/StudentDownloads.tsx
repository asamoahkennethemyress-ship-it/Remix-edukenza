import React from 'react';
import { 
  Download, 
  FileText, 
  Receipt, 
  Calendar, 
  BookOpen, 
  FileCheck 
} from 'lucide-react';

export interface StudentDownloadsProps {
  currentUser: any;
  studentRecord: any;
  setActiveTab: (tab: any) => void;
}

export const StudentDownloads: React.FC<StudentDownloadsProps> = ({
  currentUser,
  studentRecord,
  setActiveTab
}) => {
  const className = studentRecord?.className || currentUser?.className || '';

  const downloadCategories = [
    {
      title: 'Academic Report Cards',
      description: 'Download official Term 1 and Term 2 academic progress report cards.',
      icon: FileText,
      tab: 'reports'
    },
    {
      title: 'Payment Receipts',
      description: 'Download official fee receipts and proof of tuition payment documents.',
      icon: Receipt,
      tab: 'payments'
    },
    {
      title: 'Class Timetable',
      description: 'Export weekly subject schedule and exam timetables.',
      icon: Calendar,
      tab: 'timetable'
    },
    {
      title: 'Learning Materials & Notes',
      description: 'Access study guides, revision slides, and curriculum notes.',
      icon: BookOpen,
      tab: 'materials'
    },
    {
      title: 'Submitted Homework Files',
      description: 'Review and download previously submitted assignment files.',
      icon: FileCheck,
      tab: 'submissions'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Download className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Downloads Hub</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Centralized portal to download report cards, payment receipts, timetables, and study notes for <span className="font-bold text-white">{className}</span>
          </p>
        </div>
      </div>

      {/* CATEGORIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {downloadCategories.map((cat, idx) => {
          const IconComp = cat.icon;
          return (
            <div 
              key={idx}
              onClick={() => setActiveTab(cat.tab)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] hover:shadow-md transition cursor-pointer space-y-4 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#002147] flex items-center justify-center font-bold">
                  <IconComp className="w-6 h-6 text-[#002147]" />
                </div>
                <h2 className="text-base font-black text-[#002147] group-hover:text-[#003366]">{cat.title}</h2>
                <p className="text-xs text-slate-500 leading-relaxed">{cat.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#002147]">
                <span>Go to Downloads</span>
                <Download className="w-4 h-4 text-[#D4AF37] group-hover:translate-y-0.5 transition" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
