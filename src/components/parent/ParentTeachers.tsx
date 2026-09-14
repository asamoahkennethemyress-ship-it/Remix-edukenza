import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Mail, 
  Phone, 
  Clock, 
  MessageSquare, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  RefreshCw,
  Award
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentTeachersProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent?: (student: any) => void;
  setActiveTab: (tab: any) => void;
  setPreselectedTeacher?: (teacher: any) => void;
}

export const ParentTeachers: React.FC<ParentTeachersProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setActiveTab
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const activeClass = activeStudent?.className || '';

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Real-time listener for school teachers
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(collection(db, 'teachers'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });

      if (list.length === 0) {
        // Fallback search in users collection if teachers collection is empty
        const qUsers = query(
          collection(db, 'users'), 
          where('schoolId', '==', schoolId),
          where('role', '==', 'teacher')
        );
        onSnapshot(qUsers, (uSnap) => {
          const uList: any[] = [];
          uSnap.forEach(ud => uList.push({ id: ud.id, ...ud.data() }));
          setTeachers(uList);
          setLoading(false);
        }, (err) => {
          console.warn('Users teachers listener error:', err);
          setLoading(false);
        });
      } else {
        setTeachers(list);
        setLoading(false);
      }
    }, (err) => {
      console.warn('Teachers listener error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId]);

  // Filter teachers assigned to active student's class / subjects
  const studentTeachers = teachers.filter(t => {
    if (!activeClass) return true;
    const classes = t.assignedClasses || t.classes || [t.className];
    const isAssigned = Array.isArray(classes) 
      ? classes.some((c: any) => (typeof c === 'string' ? c === activeClass : c?.name === activeClass || c?.className === activeClass))
      : t.className === activeClass;
    return isAssigned || t.isClassTeacher;
  });

  const displayList = studentTeachers.length > 0 ? studentTeachers : teachers;

  const filtered = displayList.filter(t => {
    const name = (t.fullName || t.name || '').toLowerCase();
    const subj = (t.subjects || t.subject || '').toString().toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase()) || subj.includes(searchTerm.toLowerCase());
    const matchSubj = subjectFilter === 'All' || subj.includes(subjectFilter.toLowerCase());
    return matchSearch && matchSubj;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Class & Subject Educators</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official teachers and academic educators assigned to <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span> ({activeClass || 'All Classes'}).
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search teacher by name or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="English">English</option>
            <option value="Science">Physical Science</option>
            <option value="History">History & Social</option>
          </select>

          <div className="text-xs text-slate-500 font-bold px-3 py-2 bg-slate-100 rounded-xl">
            {filtered.length} Teacher{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* TEACHERS GRID */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
          <p className="text-xs">Loading assigned educators...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
          <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-bold text-slate-600">No teachers found for this selection.</p>
          <p className="text-slate-400">Please contact School Administration to confirm class educator assignments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((teacher, idx) => {
            const name = teacher.fullName || teacher.name || 'Educator';
            const subjects = Array.isArray(teacher.subjects) 
              ? teacher.subjects.join(', ') 
              : teacher.subjects || teacher.subject || 'General Education';
            const position = teacher.position || teacher.roleTitle || (teacher.isClassTeacher ? `Class Teacher (${activeClass})` : 'Subject Educator');
            const email = teacher.email || `${name.toLowerCase().replace(/\s+/g, '.')}@edukenza.edu`;
            const phone = teacher.phone || '+27 (0) 11 982 4000';
            const availability = teacher.availability || 'Mon-Fri 14:00 - 16:00 (By Appointment)';

            return (
              <div 
                key={teacher.id || idx}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  
                  {/* PHOTO & HEADER */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#002147] to-[#0b3c5d] text-[#D4AF37] font-black flex items-center justify-center text-xl shadow-md shrink-0 overflow-hidden">
                      {teacher.photoUrl ? (
                        <img src={teacher.photoUrl} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>

                    <div className="truncate">
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                        {position}
                      </span>
                      <h3 className="text-base font-black text-[#002147] truncate mt-1">
                        {name}
                      </h3>
                      <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {subjects}
                      </p>
                    </div>
                  </div>

                  {/* CONTACT & AVAILABILITY DETAILS */}
                  <div className="space-y-2 text-xs pt-3 border-t border-slate-100 text-slate-700 bg-slate-50 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-600 truncate">{email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-600">{phone}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-600">{availability}</span>
                    </div>
                  </div>

                </div>

                {/* ACTION BUTTON */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('communication')}
                    className="w-full py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                    <span>Send Direct Message</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
