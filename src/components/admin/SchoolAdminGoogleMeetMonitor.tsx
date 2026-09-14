import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ExternalLink,
  Search,
  Filter,
  Eye,
  Check
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { GoogleMeetClass } from '../../services/googleMeetService';
import { VirtualClassroomRoomModal } from '../vle/VirtualClassroomRoomModal';

interface SchoolAdminGoogleMeetMonitorProps {
  schoolId: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SchoolAdminGoogleMeetMonitor: React.FC<SchoolAdminGoogleMeetMonitorProps> = ({
  schoolId,
  showToast
}) => {
  const [classes, setClasses] = useState<GoogleMeetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeVleMeeting, setActiveVleMeeting] = useState<GoogleMeetClass | null>(null);

  useEffect(() => {
    setLoading(true);

    let q;
    if (schoolId) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId)
      );
    } else {
      q = query(collection(db, 'googleMeetClasses'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GoogleMeetClass[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as GoogleMeetClass));
      
      list.sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
      setClasses(list);
      setLoading(false);
    }, (err) => {
      console.warn('Admin Google Meet snapshot warning:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const handleToggleApproval = async (meetingId: string, currentStatus?: boolean) => {
    try {
      await updateDoc(doc(db, 'googleMeetClasses', meetingId), {
        isApproved: !currentStatus
      });
      if (showToast) showToast(`Online class approval updated!`, 'success');
    } catch (err) {
      if (showToast) showToast('Error updating approval status', 'error');
    }
  };

  const activeCount = classes.filter(c => c.status === 'active').length;
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length;

  const filtered = classes.filter(c => {
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchSearch = searchTerm === '' || 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.className.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">School-wide Google Meet Supervision</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Monitor active online classes, approve teacher virtual sessions & audit attendance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{activeCount} Live Now</span>
          </div>
          <div className="px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-xl text-xs font-bold">
            {scheduledCount} Scheduled
          </div>
        </div>
      </div>

      {/* CONTROLS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search teacher, class, subject..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {['All', 'active', 'scheduled', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                statusFilter === st ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* CLASSES TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
              <tr>
                <th className="p-4">Status</th>
                <th className="p-4">Title & Subject</th>
                <th className="p-4">Class</th>
                <th className="p-4">Teacher</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Meet Link</th>
                <th className="p-4 text-right">Admin Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading school online classes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No Google Meet sessions match criteria.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                          : item.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#002147]">
                      <div>{item.title}</div>
                      <div className="text-[11px] text-amber-800 font-medium">{item.subject}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{item.className}</td>
                    <td className="p-4 text-slate-600 font-medium">{item.teacherName}</td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {item.date} ({item.startTime} - {item.endTime})
                    </td>
                    <td className="p-4">
                      <a
                        href={item.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-[11px] flex items-center gap-1 font-bold"
                      >
                        {item.meetingId} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setActiveVleMeeting(item)}
                        className="px-3 py-1.5 bg-[#002147] hover:bg-[#001833] text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Inspect VLE Room"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" /> VLE Room
                      </button>

                      <button
                        onClick={() => handleToggleApproval(item.id!, item.isApproved)}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                          item.isApproved !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-amber-50 text-amber-700 border border-amber-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{item.isApproved !== false ? 'Approved' : 'Pending Approval'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VLE ROOM MODAL */}
      {activeVleMeeting && (
        <VirtualClassroomRoomModal
          meeting={activeVleMeeting}
          isOpen={!!activeVleMeeting}
          onClose={() => setActiveVleMeeting(null)}
          currentUser={{ uid: 'admin', displayName: 'School Administrator' }}
          userRole="school_admin"
          showToast={showToast}
        />
      )}

    </div>
  );
};
