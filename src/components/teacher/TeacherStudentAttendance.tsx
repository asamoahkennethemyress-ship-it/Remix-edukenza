import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Search, 
  Save, 
  Send, 
  RefreshCw,
  Check,
  Building2,
  FileText,
  Fingerprint
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherStudentAttendanceProps {
  schoolId: string;
  assignedClasses: any[];
  students: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused' | 'Sick';

export interface AttendanceRecord {
  id?: string;
  schoolId: string;
  classId: string;
  className: string;
  date: string;
  markedByTeacherId: string;
  markedByTeacherName: string;
  approvalStatus: 'Pending Admin Approval' | 'Approved' | 'Rejected';
  studentRecords: {
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

export const TeacherStudentAttendance: React.FC<TeacherStudentAttendanceProps> = ({
  schoolId,
  assignedClasses,
  students,
  currentUser,
  showToast
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(
    assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(null);

  // Map student attendance states
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  // Real-time physical biometric clock-ins
  const [biometricCheckIns, setBiometricCheckIns] = useState<Record<string, { checkInTime: string; deviceLocation?: string; status: string }>>({});

  // Get class roster for selected class
  const classStudents = students.filter(s => 
    s.className === selectedClass || s.classId === selectedClass || s.gradeLevel === selectedClass
  );

  // Subscribe to real-time biometric and official attendance for selected class & date
  useEffect(() => {
    if (!schoolId || !selectedClass || !selectedDate) return;
    setLoading(true);

    const q = query(
      collection(db, 'studentAttendance'),
      where('schoolId', '==', schoolId),
      where('date', '==', selectedDate)
    );

    const unsub = onSnapshot(q, (snap) => {
      const bioMap: Record<string, { checkInTime: string; deviceLocation?: string; status: string }> = {};
      let matchedSheet: AttendanceRecord | null = null;

      snap.docs.forEach(d => {
        const data = d.data() as any;
        // Check if this is a class register sheet
        if (data.className === selectedClass && data.studentRecords) {
          matchedSheet = { id: d.id, ...data };
        }
        // Check if this is an individual biometric gate record
        if (data.checkInMethod === 'fingerprint_hardware' || data.verifiedUid) {
          const key = data.studentId || data.verifiedUid;
          if (key) {
            bioMap[key] = {
              checkInTime: data.checkInTime || '07:45 AM',
              deviceLocation: data.deviceLocation || 'Main Gate',
              status: data.status || 'Present'
            };
          }
        }
      });

      setBiometricCheckIns(bioMap);

      if (matchedSheet) {
        setExistingRecord(matchedSheet);
        const map: Record<string, { status: AttendanceStatus; remarks: string }> = {};
        (matchedSheet as AttendanceRecord).studentRecords?.forEach(st => {
          map[st.studentId] = { status: st.status, remarks: st.remarks || '' };
        });
        setAttendanceMap(map);
      } else {
        setExistingRecord(null);
        // Default with biometric status if student clocked in at gate, else Present
        setAttendanceMap(prev => {
          const initialMap: Record<string, { status: AttendanceStatus; remarks: string }> = { ...prev };
          classStudents.forEach(st => {
            const sid = st.id || st.studentId;
            const bio = bioMap[sid] || bioMap[st.uid] || bioMap[st.studentId];
            if (!initialMap[sid] || initialMap[sid].remarks.includes('Biometric')) {
              initialMap[sid] = {
                status: (bio?.status as AttendanceStatus) || 'Present',
                remarks: bio ? `Verified via Fingerprint Terminal (${bio.deviceLocation} at ${bio.checkInTime})` : ''
              };
            }
          });
          return initialMap;
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Attendance subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, selectedClass, selectedDate]);

  // Handle Mark Single Student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  // Mark all students Present
  const handleMarkAllPresent = () => {
    const newMap = { ...attendanceMap };
    classStudents.forEach(st => {
      const id = st.id || st.studentId;
      newMap[id] = { ...newMap[id], status: 'Present' };
    });
    setAttendanceMap(newMap);
    showToast("All students marked Present", "info");
  };

  // Submit / Save Attendance
  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedDate) {
      showToast("Please select a class and date", "error");
      return;
    }

    if (existingRecord && existingRecord.approvalStatus === 'Approved') {
      showToast("This attendance sheet has already been approved by Admin and locked.", "error");
      return;
    }

    setSaving(true);
    try {
      const studentRecordsArray = classStudents.map(st => {
        const id = st.id || st.studentId;
        return {
          studentId: id,
          studentName: st.name || st.fullName || 'Student',
          status: attendanceMap[id]?.status || 'Present',
          remarks: attendanceMap[id]?.remarks || ''
        };
      });

      const payload = {
        schoolId,
        className: selectedClass,
        date: selectedDate,
        markedByTeacherId: currentUser?.uid || '',
        markedByTeacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        approvalStatus: 'Pending Admin Approval',
        studentRecords: studentRecordsArray,
        updatedAt: serverTimestamp()
      };

      if (existingRecord?.id) {
        await updateDoc(doc(db, 'studentAttendance', existingRecord.id), payload);
        showToast("Attendance sheet updated and submitted to Admin!", "success");
      } else {
        await addDoc(collection(db, 'studentAttendance'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast("Attendance submitted for Admin approval!", "success");
      }
    } catch (err) {
      console.error("Save attendance error:", err);
      showToast("Failed to save attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Daily Attendance Register</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Mark daily attendance for your assigned class. Submitted registers are reviewed by the School Admin.
          </p>
        </div>

        <button
          onClick={handleMarkAllPresent}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Mark All Present</span>
        </button>
      </div>

      {/* SELECTORS & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
            >
              {assignedClasses.map((c, idx) => {
                const name = c.name || c.className || c;
                return (
                  <option key={idx} value={name}>
                    Class: {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
            />
          </div>

          <button
            onClick={() => showToast("Real-time attendance stream active", "info")}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition mt-4 sm:mt-0"
            title="Real-time Attendance Active"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* STATUS BADGE */}
        {existingRecord && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Sheet Approval Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              existingRecord.approvalStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              existingRecord.approvalStatus === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
              'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {existingRecord.approvalStatus}
            </span>
          </div>
        )}
      </div>

      {/* STUDENT REGISTER ROSTER TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs font-semibold">Loading roster for {selectedClass}...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No students found for {selectedClass}. Contact Admin to assign students.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Attendance Status</th>
                  <th className="p-4">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st, i) => {
                  const id = st.id || st.studentId;
                  const currentStatus = attendanceMap[id]?.status || 'Present';

                  return (
                    <tr key={id || i} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-4 font-bold text-[#002147]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{st.name || st.fullName}</span>
                          {(biometricCheckIns[id] || biometricCheckIns[st.uid] || biometricCheckIns[st.studentId]) && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                              title={`Verified by Hardware Fingerprint Scanner at ${(biometricCheckIns[id] || biometricCheckIns[st.uid] || biometricCheckIns[st.studentId])?.deviceLocation || 'Gate'}`}
                            >
                              <Fingerprint className="w-3 h-3 text-emerald-700" />
                              Bio: {(biometricCheckIns[id] || biometricCheckIns[st.uid] || biometricCheckIns[st.studentId])?.checkInTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {st.studentId || st.id || 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['Present', 'Absent', 'Late', 'Excused', 'Sick'] as AttendanceStatus[]).map(status => {
                            const isSelected = currentStatus === status;
                            let activeClass = 'bg-slate-100 text-slate-600';
                            if (isSelected) {
                              if (status === 'Present') activeClass = 'bg-emerald-600 text-white font-black shadow-sm';
                              if (status === 'Absent') activeClass = 'bg-red-600 text-white font-black shadow-sm';
                              if (status === 'Late') activeClass = 'bg-amber-500 text-white font-black shadow-sm';
                              if (status === 'Excused') activeClass = 'bg-blue-600 text-white font-black shadow-sm';
                              if (status === 'Sick') activeClass = 'bg-purple-600 text-white font-black shadow-sm';
                            }

                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(id, status)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${activeClass}`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Optional remark..."
                          value={attendanceMap[id]?.remarks || ''}
                          onChange={e => setAttendanceMap({
                            ...attendanceMap,
                            [id]: { ...attendanceMap[id], remarks: e.target.value }
                          })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#002147]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            Total Class Roster: <strong>{classStudents.length} Students</strong>
          </p>

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || classStudents.length === 0}
            className="px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#D4AF37]" />
            <span>{saving ? 'Submitting Register...' : 'Submit Register to Admin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
