import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  User, 
  FileText, 
  Send, 
  Megaphone, 
  Search, 
  ChevronRight, 
  X, 
  Download,
  FolderOpen
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentSubjectsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab: (tab: any) => void;
}

export const StudentSubjects: React.FC<StudentSubjectsProps> = ({
  currentUser,
  studentRecord,
  showToast,
  setActiveTab
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Real-time listener for subjects added by School Admin
  useEffect(() => {
    if (!schoolId) {
      setSubjects([]);
      return;
    }

    const q = query(
      collection(db, 'subjects'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const matchesClass = !data.className || !className || data.className === className || data.targetClass === className;
        if (matchesClass) {
          list.push({
            id: d.id,
            name: data.subjectName || data.name || 'Subject',
            code: data.subjectCode || data.code || 'SUB-10',
            teacherName: data.teacherName || data.assignedTeacher || 'Class Educator',
            teacherEmail: data.teacherEmail || ''
          });
        }
      });

      setSubjects(list);
    }, (err) => {
      console.warn("Real-time subjects subscription warning:", err);
    });

    return () => unsub();
  }, [schoolId, className]);

  const [subjectMaterials, setSubjectMaterials] = useState<any[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
  const [subjectAnnouncements, setSubjectAnnouncements] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Fetch subject details when a subject is opened
  const handleOpenSubject = async (subj: any) => {
    setSelectedSubject(subj);
    setLoadingModalData(true);
    try {
      // 1. Fetch Materials
      const matQ = query(
        collection(db, 'learningMaterials'),
        where('schoolId', '==', schoolId)
      );
      const matSnap = await getDocs(matQ);
      const matList: any[] = [];
      matSnap.forEach(d => {
        const data = d.data();
        if ((data.subject === subj.name || data.subjectName === subj.name) && (data.className === className || data.targetClass === className || !data.className)) {
          matList.push({ id: d.id, ...data });
        }
      });
      setSubjectMaterials(matList);

      // 2. Fetch Assignments
      const assQ = query(
        collection(db, 'assignments'),
        where('schoolId', '==', schoolId)
      );
      const assSnap = await getDocs(assQ);
      const assList: any[] = [];
      assSnap.forEach(d => {
        const data = d.data();
        if ((data.subject === subj.name || data.subjectName === subj.name) && (data.className === className || data.targetClass === className || !data.className)) {
          assList.push({ id: d.id, ...data });
        }
      });
      setSubjectAssignments(assList);

      // 3. Fetch Announcements
      const annQ = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
      );
      const annSnap = await getDocs(annQ);
      const annList: any[] = [];
      annSnap.forEach(d => {
        const data = d.data();
        if (data.subject === subj.name || data.targetSubject === subj.name) {
          annList.push({ id: d.id, ...data });
        }
      });
      setSubjectAnnouncements(annList);

    } catch (err) {
      console.error("Error fetching subject specific data:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">My Subjects & Curriculum</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Enrolled subject modules, assigned educators, study materials, and subject notices.
          </p>
        </div>

        <span className="px-3.5 py-1.5 bg-[#D4AF37] text-[#002147] font-black text-xs rounded-full uppercase tracking-wider">
          {filteredSubjects.length} Subjects Active
        </span>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject or teacher name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>
      </div>

      {/* SUBJECT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map(subj => (
          <div
            key={subj.id}
            onClick={() => handleOpenSubject(subj)}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-[#002147] hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 bg-slate-100 text-[#002147] font-mono font-bold text-[10px] rounded-lg border border-slate-200">
                  {subj.code}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition" />
              </div>

              <h2 className="text-base font-black text-[#002147]">{subj.name}</h2>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Assigned Teacher</span>
                <p className="text-xs font-bold text-slate-700 truncate">{subj.teacherName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SUBJECT DETAILS MODAL */}
      {selectedSubject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 bg-[#D4AF37] text-[#002147] rounded-full text-[10px] font-black uppercase">
                  {selectedSubject.code}
                </span>
                <h2 className="text-xl font-black text-[#002147] mt-1">{selectedSubject.name}</h2>
                <p className="text-xs text-slate-500">Educator: <span className="font-bold text-slate-700">{selectedSubject.teacherName}</span></p>
              </div>

              <button
                onClick={() => setSelectedSubject(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingModalData ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading subject resources...
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* LEARNING MATERIALS */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                    Learning Materials & Notes
                  </h3>

                  {subjectMaterials.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
                      No files or notes uploaded for this subject yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subjectMaterials.map(mat => (
                        <div key={mat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-[#002147]">{mat.title}</p>
                            <p className="text-[10px] text-slate-500">{mat.description || 'Module Notes'}</p>
                          </div>
                          {mat.fileUrl && (
                            <a
                              href={mat.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-[#002147] text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> View File
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ASSIGNMENTS */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#D4AF37]" />
                    Subject Assignments
                  </h3>

                  {subjectAssignments.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
                      No active assignments for this subject.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subjectAssignments.map(ass => (
                        <div key={ass.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-[#002147]">{ass.title}</p>
                            <p className="text-[10px] text-slate-500">Due: {ass.dueDate || 'Soon'}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSubject(null);
                              setActiveTab('assignments');
                            }}
                            className="px-3 py-1 bg-[#D4AF37] text-[#002147] rounded-lg font-black text-[11px]"
                          >
                            Go to Submissions
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSubject(null)}
                className="px-5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
