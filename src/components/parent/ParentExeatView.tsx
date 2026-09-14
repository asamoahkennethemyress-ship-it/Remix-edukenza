import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Home, 
  Phone, 
  FileText, 
  ShieldCheck, 
  User
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ExeatRequest, BoardingHouse } from '../../types';

interface ParentExeatViewProps {
  schoolId: string;
  selectedStudent: any;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ParentExeatView: React.FC<ParentExeatViewProps> = ({
  schoolId,
  selectedStudent,
  showToast
}) => {
  const studentDocId = selectedStudent?.id || '';
  const studentIdNumber = selectedStudent?.studentId || '';
  const studentFullName = selectedStudent?.fullName || selectedStudent?.name || 'Your Child';
  const cleanEmail = (selectedStudent?.email || '').toLowerCase();
  const houseId = selectedStudent?.houseId || '';
  const houseName = selectedStudent?.houseName || '';
  const isBoarder = selectedStudent?.residentialStatus === 'Boarder' || selectedStudent?.isBoarder || !!houseId;

  const [exeats, setExeats] = useState<ExeatRequest[]>([]);
  const [houseInfo, setHouseInfo] = useState<BoardingHouse | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time listener for exeat requests of the selected student
  useEffect(() => {
    if (!schoolId || !studentDocId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'exeatRequests'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: ExeatRequest[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as ExeatRequest;
        if (
          item.studentId === studentDocId ||
          item.studentId === studentIdNumber ||
          (item as any).studentEmail?.toLowerCase() === cleanEmail
        ) {
          list.push(item);
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExeats(list);
      setLoading(false);
    }, (err) => {
      console.warn('[ParentExeatView] Exeat snapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentDocId, studentIdNumber, cleanEmail]);

  // House listener
  useEffect(() => {
    if (!schoolId || !houseId) return;

    const unsubHouse = onSnapshot(doc(db, 'boardingHouses', houseId), (snap) => {
      if (snap.exists()) {
        setHouseInfo({ id: snap.id, ...snap.data() } as BoardingHouse);
      }
    }, (err) => console.warn('[ParentExeatView] House snapshot error:', err));

    return () => unsubHouse();
  }, [schoolId, houseId]);

  const getStatusBadge = (status: ExeatRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" /> Under Review
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
            <ShieldCheck className="w-3 h-3 text-emerald-700" /> Approved by Domestic Office
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-600" /> Safely Returned to Campus
          </span>
        );
      case 'denied':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-700" /> Declined
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
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#D4AF37]" />
            Boarding Exeat & Off-Campus Permits
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time tracking of boarding permissions and weekend leave for <span className="font-bold text-[#002147]">{studentFullName}</span>.
          </p>
        </div>
      </div>

      {/* House Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boarding House</div>
            <div className="font-black text-sm text-[#002147]">
              {houseName || houseInfo?.name || (isBoarder ? 'Boarding House Assigned' : 'Day Student')}
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
              {houseInfo?.houseMasterName || 'House Master On Duty'}
            </div>
            {houseInfo?.houseMasterPhone && (
              <div className="text-[10px] text-slate-500 font-semibold">{houseInfo.houseMasterPhone}</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Policy</div>
            <div className="text-xs font-bold text-slate-700">
              Parent contact confirmation required before departure
            </div>
          </div>
        </div>
      </div>

      {!isBoarder && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold">Day Student Status:</span> {studentFullName} is enrolled as a day student. Exeat permits apply to students living in campus boarding houses.
          </div>
        </div>
      )}

      {/* Table of Exeats */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-sm text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Exeat History & Live Status ({exeats.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading exeat records...</div>
        ) : exeats.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-black text-sm text-slate-700">No Exeat Requests On File</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no pending or historic exeat requests logged for {studentFullName}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[#002147] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Departure Date</th>
                  <th className="p-3.5">Return Date</th>
                  <th className="p-3.5">Reason / Destination</th>
                  <th className="p-3.5">Current Status</th>
                  <th className="p-3.5">Approved By</th>
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
                    <td className="p-3.5">{getStatusBadge(ex.status)}</td>
                    <td className="p-3.5 text-slate-600 font-bold">
                      {ex.approvedBy || (ex.status === 'pending' ? 'Pending Review' : 'School Authority')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
