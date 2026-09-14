import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  FolderDown, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Award, 
  Info,
  Lock,
  Plus,
  BookOpen
} from 'lucide-react';
import { UserContentHub } from '../common/UserContentHub';

export interface ParentDocumentsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ParentDocuments: React.FC<ParentDocumentsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  showToast
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const [activeTab, setActiveTab] = useState<'official_records' | 'personal_notes'>('official_records');
  const [filterType, setFilterType] = useState('All');

  const documentList = [
    {
      id: '1',
      title: 'Term 1 Official Academic Report Card',
      category: 'Report Cards',
      date: '2025-04-15',
      size: '1.2 MB',
      fileType: 'PDF',
      isOfficial: true
    },
    {
      id: '2',
      title: 'Term 2 Fee Settlement Official Receipt (RCP-2025-901)',
      category: 'Receipts',
      date: '2025-04-10',
      size: '450 KB',
      fileType: 'PDF',
      isOfficial: true
    },
    {
      id: '3',
      title: activeStudent?.className ? `Class ${activeStudent.className} Weekly Timetable` : 'Class Weekly Timetable',
      category: 'Timetables',
      date: '2025-01-10',
      size: '320 KB',
      fileType: 'PDF',
      isOfficial: true
    },
    {
      id: '4',
      title: 'Winter Uniform & School Code of Conduct Circular',
      category: 'School Circulars',
      date: '2025-05-01',
      size: '890 KB',
      fileType: 'PDF',
      isOfficial: true
    },
    {
      id: '5',
      title: `${activeStudent?.fullName || activeStudent?.name || 'Student'} Verified Enrollment Certificate`,
      category: 'Student Documents',
      date: '2025-01-08',
      size: '620 KB',
      fileType: 'PDF',
      isOfficial: true
    }
  ];

  const filteredDocs = filterType === 'All'
    ? documentList
    : documentList.filter(d => d.category === filterType);

  const handleDownload = (doc: any) => {
    showToast(`Downloading official school document: ${doc.title}...`, 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <FolderDown className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Parent Document & Personal Notes Hub</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Access official school circulars and certificates, or maintain your private parent notes, meeting logs, and drafts with full ownership controls.
          </p>
        </div>

        {activeStudent && (
          <div className="bg-white/10 px-3 py-2 rounded-2xl border border-white/20 text-xs font-bold text-amber-300">
            Student: {activeStudent.fullName || activeStudent.name} ({activeStudent.className || 'General'})
          </div>
        )}
      </div>

      {/* TOP TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('official_records')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'official_records'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          <span>Official School Documents ({filteredDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal_notes')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'personal_notes'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>My Personal Parent Notes & Drafts</span>
        </button>
      </div>

      {/* TAB 1: OFFICIAL SCHOOL DOCUMENTS (READ-ONLY) */}
      {activeTab === 'official_records' && (
        <div className="space-y-4">
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>School Records:</strong> These documents are issued by the school administration. Parents have read and download privileges. To keep private notes or meeting logs, use the <em>"My Personal Parent Notes & Drafts"</em> tab.
            </span>
          </div>

          {/* FILTER BUTTONS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
            {['All', 'Report Cards', 'Receipts', 'Timetables', 'School Circulars', 'Student Documents'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === type 
                    ? 'bg-[#002147] text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* DOCUMENT LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-[#002147] font-bold text-[10px] rounded-lg">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{doc.fileType} • {doc.size}</span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">{doc.title}</h3>
                  <p className="text-xs text-slate-500 font-mono">Issued: {doc.date}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold">Issued by School</span>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="px-3 py-1.5 bg-[#002147] hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY PERSONAL PARENT NOTES (FULL USER OWNERSHIP CONTROLS) */}
      {activeTab === 'personal_notes' && (
        <UserContentHub
          currentUser={currentUser}
          userRole="parent"
          schoolId={currentUser?.schoolId || ''}
          defaultTypeFilter="notes"
          titleOverride="Parent Personal Notes & Private Documents"
          descriptionOverride="Create and manage your private parent meeting notes, tutor observations, medical exemption drafts, and reminders. You have full ownership to create, edit, save, copy, delete, and download your personal content."
          showToast={showToast}
        />
      )}

    </div>
  );
};
