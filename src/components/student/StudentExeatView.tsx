import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Home, 
  Calendar, 
  Phone, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  User,
  X
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ExeatRequest, BoardingHouse } from '../../types';

interface StudentExeatViewProps {
  currentUser: any;
  studentRecord: any;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentExeatView: React.FC<StudentExeatViewProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentDocId = studentRecord?.id || currentUser?.uid || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || '';
  const studentFullName = studentRecord?.fullName || currentUser?.fullName || currentUser?.name || 'Student';
  const cleanEmail = (currentUser?.email || studentRecord?.email || '').toLowerCase();
  
  const houseId = studentRecord?.houseId || currentUser?.houseId || '';
  const houseName = studentRecord?.houseName || currentUser?.houseName || '';
  const isBoarder = studentRecord?.residentialStatus === 'Boarder' || studentRecord?.isBoarder || !!houseId;

  const [exeats, setExeats] = useState<ExeatRequest[]>([]);
  const [houseInfo, setHouseInfo] = useState<BoardingHouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: 'Weekend' as 'Medical' | 'Weekend' | 'Emergency' | 'Official',
    departureDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    reason: '',
    parentContactPhone: studentRecord?.parentPhone || currentUser?.parentPhone || ''
  });

  // Real-time listener for exeat requests
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'exeatRequests'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const allList: ExeatRequest[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as ExeatRequest;
        // Filter for this student by ID, admission number, or email
        if (
          item.studentId === studentDocId ||
          item.studentId === studentIdNumber ||
          (item as any).studentEmail?.toLowerCase() === cleanEmail
        ) {
          allList.push(item);
        }
      });
      // Sort newest first
      allList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExeats(allList);
      setLoading(false);
    }, (err) => {
      console.warn('[StudentExeatView] Exeat snapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentDocId, studentIdNumber, cleanEmail]);

  // House information listener
  useEffect(() => {
    if (!schoolId || !houseId) return;

    const unsubHouse = onSnapshot(doc(db, 'boardingHouses', houseId), (snap) => {
      if (snap.exists()) {
        setHouseInfo({ id: snap.id, ...snap.data() } as BoardingHouse);
      }
    }, (err) => console.warn('[StudentExeatView] House snapshot error:', err));

    return () => unsubHouse();
  }, [schoolId, houseId]);

  const handleSubmitExeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      showToast?.('Please specify a valid reason / destination for the exeat.', 'error');
      return;
    }
    if (!formData.parentContactPhone.trim()) {
      showToast?.('Parent / Emergency contact phone number is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const exeatRef = doc(collection(db, 'exeatRequests'));
      const newExeatDoc: any = {
        id: exeatRef.id,
        schoolId,
        studentId: studentDocId,
        studentName: studentFullName,
        studentEmail: cleanEmail,
        studentIdNumber: studentIdNumber,
        houseId: houseId || 'General',
        houseName: houseName || houseInfo?.name || 'Boarding House',
        category: formData.category,
        departureDate: formData.departureDate,
        expectedReturnDate: formData.expectedReturnDate,
        reason: formData.reason.trim(),
        parentContactPhone: formData.parentContactPhone.trim(),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(exeatRef, newExeatDoc);
      showToast?.('Exeat request submitted successfully! Awaiting House Master review.', 'success');
      setIsModalOpen(false);
      setFormData({
        category: 'Weekend',
        departureDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        reason: '',
        parentContactPhone: studentRecord?.parentPhone || currentUser?.parentPhone || ''
      });
    } catch (err: any) {
      showToast?.('Failed to submit exeat: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ExeatRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" /> Pending House Master
          </span>
        );
      case 'approved_by_house_master':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-700" /> Endorsed by House Master
          </span>
        );
      case 'approved_by_domestic':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-700" /> Approved & Authorized Pass
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-600" /> Safely Returned
          </span>
        );
      case 'denied':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-700" /> Exeat Declined
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#D4AF37]" />
            Boarding Exeat & Permission Pass
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Senior High Boarding Exeat portal. Submit official departure permits and track live approvals.
          </p>
        </div>

        {isBoarder && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#002147] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#003366] transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Request New Exeat</span>
          </button>
        )}
      </div>

      {/* House Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boarding House</div>
            <div className="font-black text-sm text-[#002147]">
              {houseName || houseInfo?.name || (isBoarder ? 'Boarding House Assigned' : 'Day Student (Non-Boarder)')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">House Master / Mistress</div>
            <div className="font-black text-sm text-[#002147]">
              {houseInfo?.houseMasterName || 'Senior House Master'}
            </div>
            {houseInfo?.houseMasterPhone && (
              <div className="text-[10px] text-slate-500 font-semibold">{houseInfo.houseMasterPhone}</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Workflow</div>
            <div className="text-xs font-bold text-slate-700">
              House Master Endorsement → Domestic Final Sign-off
            </div>
          </div>
        </div>
      </div>

      {/* Non-Boarder Notice */}
      {!isBoarder && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold">Day Student Status:</span> You are currently enrolled as a Day Student. Exeat permits are required exclusively for boarding students residing on campus. If you have moved to campus boarding, please notify the Assistant Head Domestic.
          </div>
        </div>
      )}

      {/* Exeat History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            My Exeat Requests & Active Passes ({exeats.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading exeat records...</div>
        ) : exeats.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-black text-sm text-slate-700">No Exeat Requests Filed</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You currently have no active or archived exeat passes on record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[#002147] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Exeat Category</th>
                  <th className="p-3.5">Departure</th>
                  <th className="p-3.5">Expected Return</th>
                  <th className="p-3.5">Reason / Destination</th>
                  <th className="p-3.5">Parent Contact</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Digital Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {exeats.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                        {ex.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{ex.departureDate}</td>
                    <td className="p-3.5 font-bold text-slate-900">{ex.expectedReturnDate}</td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate">{ex.reason}</td>
                    <td className="p-3.5 text-slate-600 font-mono">{ex.parentContactPhone || 'Not provided'}</td>
                    <td className="p-3.5">{getStatusBadge(ex.status)}</td>
                    <td className="p-3.5">
                      {ex.status === 'approved_by_domestic' ? (
                        <span className="px-2 py-1 rounded bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                          <ShieldCheck className="w-3 h-3" /> Gate Pass Valid
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Not authorized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBMIT EXEAT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#002147] uppercase">Submit Boarding Exeat Request</h3>
                <p className="text-[11px] text-slate-500 font-medium">Requires House Master verification before domestic clearance</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExeat} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Exeat Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:border-[#002147] outline-hidden"
                >
                  <option value="Weekend">Weekend Leave</option>
                  <option value="Medical">Medical / Hospital Exeat</option>
                  <option value="Emergency">Family / Emergency Leave</option>
                  <option value="Official">Official School Representation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:border-[#002147] outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Return Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expectedReturnDate}
                    onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:border-[#002147] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination & Full Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the destination address, clinical facility, or specific purpose for departure..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:border-[#002147] outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Parent / Guardian Emergency Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="+233 ... or active telephone number"
                  value={formData.parentContactPhone}
                  onChange={(e) => setFormData({ ...formData, parentContactPhone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:border-[#002147] outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The House Master or Domestic Office may contact this number to confirm authorization before departure.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#002147] text-white font-bold hover:bg-[#003366] transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
