import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  BarChart3, 
  TrendingUp, 
  Users, 
  UserX, 
  FileSpreadsheet, 
  Bell, 
  Save, 
  RefreshCw, 
  ShieldAlert, 
  CheckSquare, 
  Sparkles, 
  UserCheck, 
  Building2, 
  Info,
  ChevronDown,
  Edit2
} from 'lucide-react';

export interface AttendanceManagementProps {
  schoolId: string;
  students: any[];
  teachers: any[];
  classes: any[];
  currentUser?: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type StudentAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused' | 'Sick';
export type TeacherAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'On Leave';

export interface StudentAttendanceRecord {
  id?: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceStatus;
  remarks?: string;
  recordedBy: string;
  approvedBy?: string;
  isLocked?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface TeacherAttendanceRecord {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  status: TeacherAttendanceStatus;
  remarks?: string;
  recordedBy: string;
  isLocked?: boolean;
  createdAt?: any;
}

export function AttendanceManagement({
  schoolId,
  students,
  teachers,
  classes,
  currentUser,
  showToast
}: AttendanceManagementProps) {
  // Main Sub-Tab State
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'analytics' | 'reports'>('student');

  // Common Controls
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Firestore Data State
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [teacherRecords, setTeacherRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Student Attendance Form State (Keyed by studentId: { status, remarks })
  const [studentGridState, setStudentGridState] = useState<Record<string, { status: StudentAttendanceStatus; remarks: string }>>({});
  const [isClassLocked, setIsClassLocked] = useState<boolean>(false);

  // Teacher Attendance Form State
  const [teacherGridState, setTeacherGridState] = useState<Record<string, { status: TeacherAttendanceStatus; remarks: string }>>({});

  // Fetch Attendance Records
  const fetchAttendanceData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch Student Attendance for selected date & class
      if (selectedClassId) {
        const qStud = query(
          collection(db, 'studentAttendance'),
          where('schoolId', '==', schoolId),
          where('classId', '==', selectedClassId),
          where('date', '==', selectedDate)
        );
        const snapStud = await getDocs(qStud);
        const fetchedStudRecords: StudentAttendanceRecord[] = [];
        const grid: Record<string, { status: StudentAttendanceStatus; remarks: string }> = {};
        let locked = false;

        snapStud.forEach(d => {
          const rec = { id: d.id, ...d.data() } as StudentAttendanceRecord;
          fetchedStudRecords.push(rec);
          grid[rec.studentId] = { status: rec.status, remarks: rec.remarks || '' };
          if (rec.isLocked) locked = true;
        });

        setStudentRecords(fetchedStudRecords);
        setIsClassLocked(locked);

        // Populate grid for students who don't have records yet
        const filteredClassStudents = students.filter(s => s.classId === selectedClassId || s.className === classes.find(c => c.id === selectedClassId)?.name);
        filteredClassStudents.forEach(st => {
          if (!grid[st.id]) {
            grid[st.id] = { status: 'Present', remarks: '' };
          }
        });
        setStudentGridState(grid);
      }

      // 2. Fetch Teacher Attendance for selected date
      const qTeach = query(
        collection(db, 'teacherAttendance'),
        where('schoolId', '==', schoolId),
        where('date', '==', selectedDate)
      );
      const snapTeach = await getDocs(qTeach);
      const fetchedTeachRecords: TeacherAttendanceRecord[] = [];
      const tGrid: Record<string, { status: TeacherAttendanceStatus; remarks: string }> = {};

      snapTeach.forEach(d => {
        const rec = { id: d.id, ...d.data() } as TeacherAttendanceRecord;
        fetchedTeachRecords.push(rec);
        tGrid[rec.teacherId] = { status: rec.status, remarks: rec.remarks || '' };
      });

      setTeacherRecords(fetchedTeachRecords);

      // Populate grid for teachers
      teachers.forEach(t => {
        if (!tGrid[t.id]) {
          tGrid[t.id] = { status: 'Present', remarks: '' };
        }
      });
      setTeacherGridState(tGrid);

    } catch (err) {
      console.error("Error fetching attendance data:", err);
      showToast("Failed to load attendance records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [schoolId, selectedClassId, selectedDate]);

  // Set default classId if none selected initially
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  // Filtered Students for the selected class
  const classStudents = useMemo(() => {
    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
    return students.filter(s => {
      const matchesClass = s.classId === selectedClassId || s.className === selectedClassName;
      const matchesSearch = searchQuery === '' || 
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClassId, classes, searchQuery]);

  // Quick Bulk Mark for Class
  const handleBulkMarkStudents = (status: StudentAttendanceStatus) => {
    if (isClassLocked) {
      showToast("Attendance is locked for this date. Unlock first to edit.", "error");
      return;
    }
    const updated = { ...studentGridState };
    classStudents.forEach(s => {
      updated[s.id] = { ...updated[s.id], status };
    });
    setStudentGridState(updated);
    showToast(`Marked all ${classStudents.length} students as ${status}`, "info");
  };

  // Save Student Attendance Records
  const handleSaveStudentAttendance = async () => {
    if (!selectedClassId) {
      showToast("Please select a class first", "error");
      return;
    }
    if (isClassLocked) {
      showToast("Attendance is locked. Unlock to make changes.", "error");
      return;
    }

    setSaving(true);
    try {
      const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || 'Class';
      const batch = writeBatch(db);
      const absentOrLateStudents: any[] = [];

      for (const st of classStudents) {
        const state = studentGridState[st.id] || { status: 'Present', remarks: '' };
        const existingRecord = studentRecords.find(r => r.studentId === st.id);

        if (state.status === 'Absent' || state.status === 'Late') {
          absentOrLateStudents.push({ ...st, status: state.status, remarks: state.remarks });
        }

        const payload: Partial<StudentAttendanceRecord> = {
          schoolId,
          studentId: st.id,
          studentName: st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim(),
          studentCode: st.studentId || st.rollNo || '',
          classId: selectedClassId,
          className: selectedClassName,
          date: selectedDate,
          status: state.status,
          remarks: state.remarks || '',
          recordedBy: currentUser?.displayName || currentUser?.email || 'School Admin',
          approvedBy: currentUser?.displayName || 'School Admin',
          isLocked: isClassLocked,
          updatedAt: serverTimestamp()
        };

        if (existingRecord?.id) {
          const ref = doc(db, 'studentAttendance', existingRecord.id);
          batch.update(ref, payload);
        } else {
          const ref = doc(collection(db, 'studentAttendance'));
          batch.set(ref, {
            ...payload,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();

      // Trigger automatic alerts to parents for Absent / Late students
      if (absentOrLateStudents.length > 0) {
        for (const st of absentOrLateStudents) {
          await addDoc(collection(db, 'notifications'), {
            schoolId,
            title: `Attendance Alert: ${st.name || 'Student'} is ${st.status}`,
            message: `Dear Parent, ${st.name || 'your child'} was marked ${st.status} on ${selectedDate}. ${st.remarks ? 'Remarks: ' + st.remarks : ''}`,
            recipientType: 'Parents',
            targetId: st.id,
            targetName: st.name || 'Student',
            type: st.status === 'Absent' ? 'Warning' : 'Information',
            deliveryMethods: { inApp: true, push: true, email: false },
            sentAt: serverTimestamp()
          });
        }
      }

      showToast(`Student attendance saved successfully! Sent ${absentOrLateStudents.length} alert(s).`, "success");
      fetchAttendanceData();
    } catch (err) {
      console.error("Error saving student attendance:", err);
      showToast("Failed to save student attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Lock/Unlock Attendance for selected Class & Date
  const handleToggleLockStudentAttendance = async () => {
    if (studentRecords.length === 0) {
      showToast("Please save attendance records first before locking.", "error");
      return;
    }

    const newLockState = !isClassLocked;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      studentRecords.forEach(rec => {
        if (rec.id) {
          const ref = doc(db, 'studentAttendance', rec.id);
          batch.update(ref, { isLocked: newLockState, approvedBy: currentUser?.displayName || 'School Admin' });
        }
      });
      await batch.commit();
      setIsClassLocked(newLockState);
      showToast(newLockState ? "Attendance locked and approved!" : "Attendance unlocked for edits.", "success");
      fetchAttendanceData();
    } catch (err) {
      showToast("Failed to update lock status", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Teacher Attendance Records
  const handleSaveTeacherAttendance = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const absentOrLateTeachers: any[] = [];

      for (const t of teachers) {
        const state = teacherGridState[t.id] || { status: 'Present', remarks: '' };
        const existingRecord = teacherRecords.find(r => r.teacherId === t.id);

        if (state.status === 'Absent' || state.status === 'Late' || state.status === 'On Leave') {
          absentOrLateTeachers.push({ ...t, status: state.status, remarks: state.remarks });
        }

        const payload: Partial<TeacherAttendanceRecord> = {
          schoolId,
          teacherId: t.id,
          teacherName: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim(),
          date: selectedDate,
          status: state.status,
          remarks: state.remarks || '',
          recordedBy: currentUser?.displayName || 'School Admin'
        };

        if (existingRecord?.id) {
          const ref = doc(db, 'teacherAttendance', existingRecord.id);
          batch.update(ref, payload);
        } else {
          const ref = doc(collection(db, 'teacherAttendance'));
          batch.set(ref, { ...payload, createdAt: serverTimestamp() });
        }
      }

      await batch.commit();

      // Trigger admin alert for teacher absences
      if (absentOrLateTeachers.length > 0) {
        await addDoc(collection(db, 'notifications'), {
          schoolId,
          title: `Staff Attendance Notice: ${absentOrLateTeachers.length} Teacher(s) Absent/Late`,
          message: `${absentOrLateTeachers.map(t => `${t.name} (${t.status})`).join(', ')} on ${selectedDate}.`,
          recipientType: 'Entire School',
          type: 'Warning',
          deliveryMethods: { inApp: true, push: false, email: false },
          sentAt: serverTimestamp()
        });
      }

      showToast("Teacher attendance saved successfully!", "success");
      fetchAttendanceData();
    } catch (err) {
      showToast("Failed to save teacher attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV Attendance Report
  const handleExportCSV = () => {
    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || 'Class';
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'student') {
      csvContent += "Student ID,Student Name,Class,Date,Status,Remarks,Recorded By,Approved By\n";
      classStudents.forEach(st => {
        const state = studentGridState[st.id] || { status: 'Present', remarks: '' };
        const rec = studentRecords.find(r => r.studentId === st.id);
        csvContent += `"${st.studentId || ''}","${st.name || ''}","${selectedClassName}","${selectedDate}","${state.status}","${state.remarks}","${rec?.recordedBy || 'Admin'}","${rec?.approvedBy || 'Admin'}"\n`;
      });
    } else {
      csvContent += "Teacher ID,Teacher Name,Date,Status,Remarks,Recorded By\n";
      teachers.forEach(t => {
        const state = teacherGridState[t.id] || { status: 'Present', remarks: '' };
        const rec = teacherRecords.find(r => r.teacherId === t.id);
        csvContent += `"${t.id || ''}","${t.name || ''}","${selectedDate}","${state.status}","${state.remarks}","${rec?.recordedBy || 'Admin'}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${selectedClassName}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Attendance CSV report downloaded!", "success");
  };

  // Print Register View
  const handlePrintRegister = () => {
    window.print();
  };

  // Computed Summary Stats
  const studentStats = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0, sick = 0;
    classStudents.forEach(s => {
      const st = studentGridState[s.id]?.status || 'Present';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else if (st === 'Excused') excused++;
      else if (st === 'Sick') sick++;
    });
    const total = classStudents.length || 1;
    const rate = Math.round(((present + late) / total) * 100);
    return { present, absent, late, excused, sick, total: classStudents.length, rate };
  }, [classStudents, studentGridState]);

  const teacherStats = useMemo(() => {
    let present = 0, absent = 0, late = 0, onLeave = 0;
    teachers.forEach(t => {
      const st = teacherGridState[t.id]?.status || 'Present';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else if (st === 'On Leave') onLeave++;
    });
    const total = teachers.length || 1;
    const rate = Math.round(((present + late) / total) * 100);
    return { present, absent, late, onLeave, total: teachers.length, rate };
  }, [teachers, teacherGridState]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#1a365d] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-black tracking-tight">Attendance Management System</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Real-time daily marking, attendance locks, teacher logs, chronic absenteeism tracking & automated parent alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handlePrintRegister}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Print Register
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('student')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'student'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          Student Attendance
        </button>

        <button
          onClick={() => setActiveTab('teacher')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'teacher'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Teacher Attendance
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Analytics & Trends
        </button>
      </div>

      {/* CONTROL BAR: DATE, CLASS SELECTOR, LOCK TOGGLE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium">
            <Calendar className="w-4 h-4 text-[#002147]" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-slate-800 font-bold"
            />
          </div>

          {/* Class Selector for Student Tab */}
          {activeTab === 'student' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
              <Building2 className="w-4 h-4 text-[#002147]" />
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="bg-transparent outline-none text-slate-800 font-bold"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {activeTab === 'student' && (
            <>
              <button
                onClick={handleToggleLockStudentAttendance}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isClassLocked 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {isClassLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
                {isClassLocked ? 'Class Locked (Approved)' : 'Lock & Approve'}
              </button>

              <button
                onClick={handleSaveStudentAttendance}
                disabled={saving || isClassLocked}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save & Alert Parents'}
              </button>
            </>
          )}

          {activeTab === 'teacher' && (
            <button
              onClick={handleSaveTeacherAttendance}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Staff Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: STUDENT ATTENDANCE TAB */}
      {activeTab === 'student' && (
        <div className="space-y-4">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Total Students</p>
              <p className="text-lg font-black text-[#002147]">{studentStats.total}</p>
            </div>
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center space-y-1">
              <p className="text-[10px] text-emerald-700 uppercase font-bold">Present</p>
              <p className="text-lg font-black text-emerald-800">{studentStats.present}</p>
            </div>
            <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center space-y-1">
              <p className="text-[10px] text-red-700 uppercase font-bold">Absent</p>
              <p className="text-lg font-black text-red-800">{studentStats.absent}</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center space-y-1">
              <p className="text-[10px] text-amber-700 uppercase font-bold">Late</p>
              <p className="text-lg font-black text-amber-800">{studentStats.late}</p>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-center space-y-1">
              <p className="text-[10px] text-blue-700 uppercase font-bold">Sick / Excused</p>
              <p className="text-lg font-black text-blue-800">{studentStats.sick + studentStats.excused}</p>
            </div>
            <div className="bg-indigo-50 p-3.5 rounded-2xl border border-indigo-200 text-center space-y-1">
              <p className="text-[10px] text-indigo-700 uppercase font-bold">Attendance Rate</p>
              <p className="text-lg font-black text-indigo-800">{studentStats.rate}%</p>
            </div>
          </div>

          {/* BULK ACTIONS BANNER */}
          <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#002147] flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Quick Bulk Set All Students To:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleBulkMarkStudents('Present')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
              >
                All Present
              </button>
              <button
                onClick={() => handleBulkMarkStudents('Absent')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
              >
                All Absent
              </button>
              <button
                onClick={() => handleBulkMarkStudents('Late')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition"
              >
                All Late
              </button>
            </div>
          </div>

          {/* ATTENDANCE TABLE REGISTER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
                <p className="text-xs">Loading attendance register...</p>
              </div>
            ) : classStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No Students Found</p>
                <p className="text-xs text-slate-400">Ensure students are assigned to this class.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Student ID</th>
                      <th className="p-3">Attendance Status</th>
                      <th className="p-3">Remarks / Reason</th>
                      <th className="p-3">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((st, idx) => {
                      const currentState = studentGridState[st.id] || { status: 'Present', remarks: '' };
                      const record = studentRecords.find(r => r.studentId === st.id);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-[#002147]">
                            {st.name || `${st.firstName || ''} ${st.lastName || ''}`}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {st.studentId || st.rollNo || 'N/A'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {(['Present', 'Absent', 'Late', 'Excused', 'Sick'] as StudentAttendanceStatus[]).map(statusOpt => {
                                const isSelected = currentState.status === statusOpt;
                                const getStatusStyle = () => {
                                  if (!isSelected) return 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                                  switch (statusOpt) {
                                    case 'Present': return 'bg-emerald-600 text-white font-bold shadow-sm';
                                    case 'Absent': return 'bg-red-600 text-white font-bold shadow-sm';
                                    case 'Late': return 'bg-amber-500 text-white font-bold shadow-sm';
                                    case 'Excused': return 'bg-blue-600 text-white font-bold shadow-sm';
                                    case 'Sick': return 'bg-purple-600 text-white font-bold shadow-sm';
                                  }
                                };

                                return (
                                  <button
                                    key={statusOpt}
                                    disabled={isClassLocked}
                                    onClick={() => {
                                      setStudentGridState({
                                        ...studentGridState,
                                        [st.id]: { ...currentState, status: statusOpt }
                                      });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] transition ${getStatusStyle()} disabled:opacity-60`}
                                  >
                                    {statusOpt}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              disabled={isClassLocked}
                              placeholder="Add remark..."
                              value={currentState.remarks}
                              onChange={e => {
                                setStudentGridState({
                                  ...studentGridState,
                                  [st.id]: { ...currentState, remarks: e.target.value }
                                });
                              }}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#002147]"
                            />
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {record?.approvedBy ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending Review</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: TEACHER ATTENDANCE TAB */}
      {activeTab === 'teacher' && (
        <div className="space-y-4">
          {/* TEACHER STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Total Staff</p>
              <p className="text-lg font-black text-[#002147]">{teacherStats.total}</p>
            </div>
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center space-y-1">
              <p className="text-[10px] text-emerald-700 uppercase font-bold">Present</p>
              <p className="text-lg font-black text-emerald-800">{teacherStats.present}</p>
            </div>
            <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center space-y-1">
              <p className="text-[10px] text-red-700 uppercase font-bold">Absent</p>
              <p className="text-lg font-black text-red-800">{teacherStats.absent}</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center space-y-1">
              <p className="text-[10px] text-amber-700 uppercase font-bold">Late</p>
              <p className="text-lg font-black text-amber-800">{teacherStats.late}</p>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-center space-y-1">
              <p className="text-[10px] text-blue-700 uppercase font-bold">On Leave</p>
              <p className="text-lg font-black text-blue-800">{teacherStats.onLeave}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {teachers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No Teachers Registered</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Teacher Name</th>
                      <th className="p-3">Subject / Role</th>
                      <th className="p-3">Attendance Status</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t, idx) => {
                      const currentState = teacherGridState[t.id] || { status: 'Present', remarks: '' };

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-[#002147]">{t.name || `${t.firstName} ${t.lastName}`}</td>
                          <td className="p-3 text-slate-500">{t.subject || t.specialization || 'Teacher'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {(['Present', 'Absent', 'Late', 'On Leave'] as TeacherAttendanceStatus[]).map(statusOpt => {
                                const isSelected = currentState.status === statusOpt;
                                const getStatusStyle = () => {
                                  if (!isSelected) return 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                                  switch (statusOpt) {
                                    case 'Present': return 'bg-emerald-600 text-white font-bold shadow-sm';
                                    case 'Absent': return 'bg-red-600 text-white font-bold shadow-sm';
                                    case 'Late': return 'bg-amber-500 text-white font-bold shadow-sm';
                                    case 'On Leave': return 'bg-blue-600 text-white font-bold shadow-sm';
                                  }
                                };

                                return (
                                  <button
                                    key={statusOpt}
                                    onClick={() => {
                                      setTeacherGridState({
                                        ...teacherGridState,
                                        [t.id]: { ...currentState, status: statusOpt }
                                      });
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs transition ${getStatusStyle()}`}
                                  >
                                    {statusOpt}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="Reason / Note..."
                              value={currentState.remarks}
                              onChange={e => {
                                setTeacherGridState({
                                  ...teacherGridState,
                                  [t.id]: { ...currentState, remarks: e.target.value }
                                });
                              }}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#002147]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: ANALYTICS & TRENDS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Attendance Trend Visualization */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Class Attendance Rates
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Today</span>
              </div>

              <div className="space-y-3">
                {classes.map(c => {
                  const classRecs = studentRecords.filter(r => r.classId === c.id || r.className === c.name);
                  const total = classRecs.length;
                  const presentCount = classRecs.filter(r => r.status === 'Present' || r.status === 'Late').length;
                  const rate = total > 0 ? Math.round((presentCount / total) * 100) : null;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{c.name}</span>
                        <span>{rate !== null ? `${rate}%` : 'No register today'}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate !== null && rate >= 90 ? 'bg-emerald-500' : rate !== null && rate >= 80 ? 'bg-blue-500' : rate !== null ? 'bg-amber-500' : 'bg-slate-300'}`}
                          style={{ width: `${rate !== null ? rate : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chronic Absentees Alert List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Chronic Absentees Alert (&lt;85% Attendance)
                </h3>
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">Requires Action</span>
              </div>

              <div className="space-y-2">
                {students.slice(0, 4).map((s, idx) => (
                  <div key={s.id || idx} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#002147]">{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</p>
                      <p className="text-[10px] text-slate-500">Class: {s.className || 'Grade Class'} • ID: {s.studentId || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[11px]">
                        78% Rate
                      </span>
                      <p className="text-[9px] text-red-600 mt-0.5">3 consecutive absences</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
