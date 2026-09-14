import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Upload, 
  X, 
  RefreshCw 
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  addDoc, 
  setDoc,
  doc,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

export interface TeacherLeaveRequestsProps {
  schoolId: string;
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface LeaveRequestDoc {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  leaveType: 'Sick Leave' | 'Personal Leave' | 'Study Leave' | 'Maternity / Paternity' | 'Other';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  attachmentUrl?: string;
  status: 'Pending Admin Approval' | 'Approved' | 'Rejected';
  adminComment?: string;
  createdAt?: any;
}

export const TeacherLeaveRequests: React.FC<TeacherLeaveRequestsProps> = ({
  schoolId,
  currentUser,
  showToast
}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<{
    leaveType: 'Sick Leave' | 'Personal Leave' | 'Study Leave' | 'Maternity / Paternity' | 'Other';
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    leaveType: 'Sick Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const [attachFile, setAttachFile] = useState<File | null>(null);

  // Fetch Leave Requests
  const fetchLeaveRequests = async () => {
    if (!schoolId || !currentUser?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'teacherLeaveRequests'),
        where('schoolId', '==', schoolId),
        where('teacherId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const list: LeaveRequestDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LeaveRequestDoc));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLeaveRequests(list);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      showToast("Failed to load leave requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId || !currentUser?.uid) return;
    fetchLeaveRequests();

    const q = query(
      collection(db, 'teacherLeaveRequests'),
      where('schoolId', '==', schoolId),
      where('teacherId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: LeaveRequestDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LeaveRequestDoc));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLeaveRequests(list);
    }, (err) => console.warn('Teacher leave requests real-time listener error:', err));

    return () => unsub();
  }, [schoolId, currentUser?.uid]);

  // Handle Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason || !form.startDate || !form.endDate) {
      showToast("Please fill in dates and reason for leave", "error");
      return;
    }

    setSubmitting(true);
    try {
      let attachmentUrl = '';
      if (attachFile) {
        try {
          const storageRef = ref(storage, `leaveAttachments/${schoolId}/${Date.now()}_${attachFile.name}`);
          const snapshot = await uploadBytes(storageRef, attachFile);
          attachmentUrl = await getDownloadURL(snapshot.ref);
        } catch (e) {
          console.warn("Storage fallback:", e);
          attachmentUrl = URL.createObjectURL(attachFile);
        }
      }

      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const payload: LeaveRequestDoc = {
        schoolId,
        teacherId: currentUser.uid,
        teacherName: currentUser.fullName || currentUser.name || 'Teacher',
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        daysCount,
        reason: form.reason,
        attachmentUrl,
        status: 'Pending Admin Approval',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'teacherLeaveRequests'), payload);
      try {
        await setDoc(doc(db, 'leaveRequests', docRef.id), {
          ...payload,
          applicantId: currentUser.uid,
          applicantName: currentUser.fullName || currentUser.name || 'Teacher',
          applicantRole: 'teacher',
          staffName: currentUser.fullName || currentUser.name || 'Teacher'
        });
      } catch (lErr) {
        console.warn("leaveRequests sync error:", lErr);
      }
      showToast("Leave application submitted to School Admin!", "success");

      setIsModalOpen(false);
      setAttachFile(null);
      setForm({
        leaveType: 'Sick Leave',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
      fetchLeaveRequests();
    } catch (err) {
      console.error("Apply leave error:", err);
      showToast("Failed to submit leave application", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Staff Leave & Absence Management</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Apply for sick leave, study leave or personal days off, and track admin authorization status.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* LEAVE HISTORY LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xs font-black text-[#002147] uppercase tracking-wider">Leave Applications & History</h2>
          <button
            onClick={fetchLeaveRequests}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading leave history...</p>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="p-12 text-center bg-white text-slate-400 text-xs">
            No leave requests submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">Leave Category</th>
                  <th className="p-4">Duration & Dates</th>
                  <th className="p-4">Days</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-[#002147]">
                      {req.leaveType}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {req.startDate} to {req.endDate}
                    </td>
                    <td className="p-4 font-bold text-amber-800">
                      {req.daysCount} Days
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPLY LEAVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                Apply for Staff Leave
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Category *</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Study Leave">Study Leave</option>
                  <option value="Maternity / Paternity">Maternity / Paternity</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Application *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide brief explanation for leave..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Supporting Document / Medical Certificate</label>
                <input
                  type="file"
                  onChange={e => setAttachFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
