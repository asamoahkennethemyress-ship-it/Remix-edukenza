import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { 
  CalendarOff, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Paperclip, 
  User, 
  Send, 
  Trash2, 
  Edit, 
  Download, 
  RefreshCw, 
  HelpCircle, 
  MessageSquare, 
  X, 
  Sparkles, 
  Users,
  Building2,
  Calendar
} from 'lucide-react';

export interface LeaveManagementProps {
  schoolId: string;
  teachers: any[];
  currentUser?: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type LeaveType = 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Maternity Leave' | 'Emergency Leave';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'More Info Requested';

export interface LeaveRequest {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  supportingDocUrl?: string;
  supportingDocName?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function LeaveManagement({
  schoolId,
  teachers,
  currentUser,
  showToast
}: LeaveManagementProps) {
  // Firestore State
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // New Leave Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({
    teacherId: teachers[0]?.id || '',
    leaveType: 'Sick Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    status: 'Pending'
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  // Review / Decision Modal State
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    leave: LeaveRequest | null;
    action: 'Approved' | 'Rejected' | 'More Info Requested';
    notes: string;
  }>({ open: false, leave: null, action: 'Approved', notes: '' });

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; leave: LeaveRequest | null }>({
    open: false,
    leave: null
  });

  // Fetch Leave Requests from Firestore
  const fetchLeaves = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'leaveRequests'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const list: LeaveRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LeaveRequest));
      // Sort newest first
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLeaveRequests(list);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      showToast("Failed to load staff leave applications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    fetchLeaves();

    const q = query(collection(db, 'leaveRequests'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(q, (snap) => {
      const list: LeaveRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LeaveRequest));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLeaveRequests(list);
    }, (err) => console.warn('Leave requests real-time listener error:', err));

    return () => unsub();
  }, [schoolId]);

  // Upload file helper
  const uploadDocToStorage = async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `leaveDocs/${schoolId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn("Storage error fallback:", err);
      return URL.createObjectURL(file);
    }
  };

  // Submit / Save Leave Application
  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.teacherId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setSaving(true);
    try {
      let supportingDocUrl = leaveForm.supportingDocUrl || '';
      let supportingDocName = leaveForm.supportingDocName || '';

      if (docFile) {
        setUploading(true);
        supportingDocUrl = await uploadDocToStorage(docFile);
        supportingDocName = docFile.name;
        setUploading(false);
      }

      const selectedTeacher = teachers.find(t => t.id === leaveForm.teacherId);
      const teacherName = selectedTeacher ? (selectedTeacher.name || `${selectedTeacher.firstName} ${selectedTeacher.lastName}`) : 'Staff Member';

      const payload = {
        schoolId,
        teacherId: leaveForm.teacherId,
        teacherName,
        leaveType: leaveForm.leaveType || 'Sick Leave',
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        supportingDocUrl,
        supportingDocName,
        status: leaveForm.status || 'Pending',
        updatedAt: serverTimestamp()
      };

      if (editingLeave?.id) {
        await updateDoc(doc(db, 'leaveRequests', editingLeave.id), payload);
        showToast("Leave request updated successfully", "success");
      } else {
        await addDoc(collection(db, 'leaveRequests'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast("Staff leave application submitted!", "success");
      }

      setIsModalOpen(false);
      setEditingLeave(null);
      setDocFile(null);
      fetchLeaves();
    } catch (err) {
      showToast("Failed to save leave request", "error");
    } finally {
      setSaving(false);
    }
  };

  // Admin Review Action (Approve / Reject / Request More Info)
  const handleReviewLeave = async () => {
    if (!reviewModal.leave?.id) return;
    setSaving(true);
    try {
      const payload = {
        status: reviewModal.action,
        reviewedBy: currentUser?.displayName || currentUser?.email || 'School Admin',
        reviewNotes: reviewModal.notes || '',
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'leaveRequests', reviewModal.leave.id), payload);
      try {
        await updateDoc(doc(db, 'teacherLeaveRequests', reviewModal.leave.id), {
          status: reviewModal.action === 'Approved' ? 'Approved' : 'Rejected',
          adminComment: reviewModal.notes || '',
          updatedAt: serverTimestamp()
        });
      } catch (tErr) {
        console.warn("teacherLeaveRequests update sync warning:", tErr);
      }

      // Trigger notification for the teacher
      await addDoc(collection(db, 'notifications'), {
        schoolId,
        title: `Leave Application ${reviewModal.action}`,
        message: `Your ${reviewModal.leave.leaveType} request (${reviewModal.leave.startDate} to ${reviewModal.leave.endDate}) has been ${reviewModal.action.toLowerCase()}. ${reviewModal.notes ? 'Notes: ' + reviewModal.notes : ''}`,
        recipientType: 'Teachers',
        targetId: reviewModal.leave.teacherId,
        targetName: reviewModal.leave.teacherName,
        type: reviewModal.action === 'Approved' ? 'Information' : 'Warning',
        deliveryMethods: { inApp: true, push: true, email: false },
        sentAt: serverTimestamp()
      });

      showToast(`Leave application marked as ${reviewModal.action}`, "success");
      setReviewModal({ open: false, leave: null, action: 'Approved', notes: '' });
      fetchLeaves();
    } catch (err) {
      showToast("Failed to update leave status", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Leave Request
  const handleConfirmDelete = async () => {
    if (!deleteModal.leave?.id) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'leaveRequests', deleteModal.leave.id));
      showToast("Leave application deleted", "success");
      setDeleteModal({ open: false, leave: null });
      fetchLeaves();
    } catch (err) {
      showToast("Failed to delete leave application", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const matchSearch = l.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' || l.status === statusFilter;
      const matchType = typeFilter === 'All' || l.leaveType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [leaveRequests, searchTerm, statusFilter, typeFilter]);

  // Leave Stats Summary
  const leaveStats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, moreInfo = 0;
    leaveRequests.forEach(l => {
      if (l.status === 'Pending') pending++;
      else if (l.status === 'Approved') approved++;
      else if (l.status === 'Rejected') rejected++;
      else if (l.status === 'More Info Requested') moreInfo++;
    });
    return { pending, approved, rejected, moreInfo, total: leaveRequests.length };
  }, [leaveRequests]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarOff className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-black tracking-tight">Staff Leave Management</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Log staff leave applications, upload medical certificates, review requests & manage staff leave quotas.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLeave(null);
            setLeaveForm({
              teacherId: teachers[0]?.id || '',
              leaveType: 'Sick Leave',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              reason: '',
              status: 'Pending'
            });
            setIsModalOpen(true);
          }}
          className="bg-amber-400 hover:bg-amber-500 text-[#002147] font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Log Staff Leave
        </button>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Applications</p>
          <p className="text-lg font-black text-[#002147]">{leaveStats.total}</p>
        </div>
        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center space-y-1">
          <p className="text-[10px] text-amber-700 uppercase font-bold">Pending Review</p>
          <p className="text-lg font-black text-amber-800">{leaveStats.pending}</p>
        </div>
        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center space-y-1">
          <p className="text-[10px] text-emerald-700 uppercase font-bold">Approved</p>
          <p className="text-lg font-black text-emerald-800">{leaveStats.approved}</p>
        </div>
        <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center space-y-1">
          <p className="text-[10px] text-red-700 uppercase font-bold">Rejected</p>
          <p className="text-lg font-black text-red-800">{leaveStats.rejected}</p>
        </div>
        <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-center space-y-1">
          <p className="text-[10px] text-blue-700 uppercase font-bold">More Info Requested</p>
          <p className="text-lg font-black text-blue-800">{leaveStats.moreInfo}</p>
        </div>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name or reason..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="More Info Requested">More Info Requested</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Leave Types</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Casual Leave">Casual Leave</option>
            <option value="Annual Leave">Annual Leave</option>
            <option value="Maternity Leave">Maternity Leave</option>
            <option value="Emergency Leave">Emergency Leave</option>
          </select>

          <button
            onClick={fetchLeaves}
            title="Refresh list"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* LEAVE APPLICATIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading leave requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CalendarOff className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">No Leave Applications Found</p>
            <p className="text-xs text-slate-400">Click "Log Staff Leave" to submit an application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Leave Type</th>
                  <th className="p-3.5">Dates (Duration)</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map(leave => {
                  const getStatusBadge = (s: LeaveStatus) => {
                    switch (s) {
                      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
                      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200 font-bold';
                      case 'More Info Requested': return 'bg-blue-100 text-blue-800 border-blue-200 font-bold';
                      default: return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
                    }
                  };

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-[#002147]">
                        {leave.teacherName}
                      </td>
                      <td className="p-3.5 font-medium">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px]">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="flex items-center gap-1 font-mono font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {leave.startDate} to {leave.endDate}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {leave.reason}
                      </td>
                      <td className="p-3.5">
                        {leave.supportingDocUrl ? (
                          <a
                            href={leave.supportingDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-2 py-1 rounded-md"
                          >
                            <Paperclip className="w-3 h-3" />
                            View Doc
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getStatusBadge(leave.status)}`}>
                          {leave.status}
                        </span>
                        {leave.reviewNotes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                            Note: {leave.reviewNotes}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Button */}
                          <button
                            onClick={() => setReviewModal({ open: true, leave, action: 'Approved', notes: '' })}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold transition text-xs flex items-center gap-1"
                            title="Approve Leave"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          {/* Reject Button */}
                          <button
                            onClick={() => setReviewModal({ open: true, leave, action: 'Rejected', notes: '' })}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold transition text-xs flex items-center gap-1"
                            title="Reject Leave"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>

                          {/* More Info Button */}
                          <button
                            onClick={() => setReviewModal({ open: true, leave, action: 'More Info Requested', notes: '' })}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold transition text-xs flex items-center gap-1"
                            title="Request More Info"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Info
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModal({ open: true, leave })}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. NEW LEAVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-amber-500" />
                {editingLeave ? 'Edit Leave Application' : 'Log Staff Leave Application'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Staff Member *</label>
                <select
                  required
                  value={leaveForm.teacherId}
                  onChange={e => setLeaveForm({ ...leaveForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name || `${t.firstName} ${t.lastName}`} ({t.subject || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail reason for taking leave..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Supporting Document (Doctor Note, etc.)</label>
                <input
                  type="file"
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl transition shadow-md"
                >
                  {saving ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. REVIEW DECISION MODAL */}
      {reviewModal.open && reviewModal.leave && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[#002147] border-b border-slate-100 pb-2">
              Review Leave Application ({reviewModal.action})
            </h3>

            <p className="text-xs text-slate-600">
              Staff: <strong className="text-[#002147]">{reviewModal.leave.teacherName}</strong><br />
              Type: <strong>{reviewModal.leave.leaveType}</strong> ({reviewModal.leave.startDate} to {reviewModal.leave.endDate})
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Review Notes / Remarks for Staff</label>
              <textarea
                rows={3}
                placeholder="Optional decision notes..."
                value={reviewModal.notes}
                onChange={e => setReviewModal({ ...reviewModal, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModal({ open: false, leave: null, action: 'Approved', notes: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewLeave}
                disabled={saving}
                className={`px-5 py-2 text-white font-bold rounded-xl transition text-xs shadow-md ${
                  reviewModal.action === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewModal.action === 'Rejected' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm {reviewModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DELETE CONFIRMATION MODAL */}
      {deleteModal.open && deleteModal.leave && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-base font-black text-[#002147]">Delete Leave Application?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete the leave request for <strong>{deleteModal.leave.teacherName}</strong>?
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteModal({ open: false, leave: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
