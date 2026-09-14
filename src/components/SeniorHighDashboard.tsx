import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserProfile, 
  BoardingHouse, 
  ExeatRequest, 
  MaintenanceWorkOrder, 
  SchoolAccount,
  EducationCategory,
  UserRole
} from '../types';
import { 
  Building2, 
  GraduationCap, 
  Home, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  Wrench, 
  ShieldCheck, 
  Bed, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Calendar, 
  Phone, 
  Mail, 
  LogOut, 
  Sparkles,
  Utensils,
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  UserPlus,
  Trash2
} from 'lucide-react';
import { 
  getBoardingHouses, 
  addBoardingHouse, 
  updateBoardingHouse, 
  deleteBoardingHouse,
  getExeatRequests, 
  submitExeatRequest, 
  updateExeatStatus,
  getMaintenanceWorkOrders, 
  createMaintenanceWorkOrder, 
  updateMaintenanceWorkOrderStatus,
  getSeniorHighStaff,
  SENIOR_HIGH_PROGRAMMES,
  DEFAULT_BOARDING_HOUSES
} from '../services/seniorHighService';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LmsMainView } from './lms/LmsMainView';

export const SeniorHighDashboard: React.FC = () => {
  const { currentUser, logout, showToast, setActiveView } = useAuth();
  const schoolId = currentUser?.schoolId || '';
  const userRole = currentUser?.role || 'school_head';

  // Role Hierarchy flags
  const isSchoolHead = userRole === 'school_head' || userRole === 'school_admin' || userRole === 'platform_owner';
  const isAcademics = userRole === 'assistant_academics' || isSchoolHead;
  const isDomestic = userRole === 'assistant_domestic' || isSchoolHead;
  const isHouseMaster = userRole === 'house_master';
  const isDomesticStaff = isDomestic || isHouseMaster || userRole === 'housekeeping' || userRole === 'facilities' || userRole === 'general_services';

  // Active Tab
  type ShsTab = 'overview' | 'academics' | 'lms' | 'domestic' | 'houses' | 'exeats' | 'facilities' | 'staff' | 'students';
  const [activeTab, setActiveTab] = useState<ShsTab>(() => {
    if (userRole === 'assistant_academics') return 'academics';
    if (userRole === 'assistant_domestic') return 'domestic';
    if (userRole === 'house_master') return 'houses';
    if (userRole === 'facilities' || userRole === 'housekeeping' || userRole === 'general_services') return 'facilities';
    return 'overview';
  });

  // Data States
  const [loading, setLoading] = useState(true);
  const [boardingHouses, setBoardingHouses] = useState<BoardingHouse[]>([]);
  const [exeatRequests, setExeatRequests] = useState<ExeatRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [academicsStaff, setAcademicsStaff] = useState<UserProfile[]>([]);
  const [domesticStaff, setDomesticStaff] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolData, setSchoolData] = useState<SchoolAccount | null>(null);

  // Modals
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [isExeatModalOpen, setIsExeatModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Form States
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'teacher' as UserRole,
    department: 'academics' as 'academics' | 'domestic',
    specialization: ''
  });

  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    studentId: '',
    programme: 'General Science',
    form: 'SHS 1',
    residentialStatus: 'Boarder' as 'Boarder' | 'Day',
    houseId: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });

  const [houseForm, setHouseForm] = useState({
    name: '',
    gender: 'Boys' as 'Boys' | 'Girls' | 'Mixed',
    capacity: 120,
    houseMasterName: '',
    houseMasterPhone: '',
    description: ''
  });

  const [exeatForm, setExeatForm] = useState({
    studentName: '',
    studentId: '',
    houseId: '',
    houseName: '',
    reason: '',
    category: 'Weekend' as 'Medical' | 'Weekend' | 'Emergency' | 'Official',
    departureDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    parentContactPhone: ''
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    title: '',
    facilityLocation: '',
    category: 'Electrical' as 'Electrical' | 'Plumbing' | 'Carpentry' | 'Structural' | 'Sanitation' | 'General',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: ''
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('all');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('all');

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Boarding Houses listener
    const qHouses = query(collection(db, 'boardingHouses'), where('schoolId', '==', schoolId));
    const unsubHouses = onSnapshot(qHouses, async (snap) => {
      const houses: BoardingHouse[] = [];
      snap.forEach((d) => houses.push({ id: d.id, ...d.data() } as BoardingHouse));
      houses.sort((a, b) => a.name.localeCompare(b.name));

      setBoardingHouses(houses);
    }, (err) => console.warn('[SeniorHighDashboard] houses snapshot error:', err));

    // 2. Exeat Requests listener (Real-time updates for approvals/submissions)
    const qExeats = query(collection(db, 'exeatRequests'), where('schoolId', '==', schoolId));
    const unsubExeats = onSnapshot(qExeats, (snap) => {
      const requests: ExeatRequest[] = [];
      snap.forEach((d) => requests.push({ id: d.id, ...d.data() } as ExeatRequest));
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExeatRequests(requests);
    }, (err) => console.warn('[SeniorHighDashboard] exeats snapshot error:', err));

    // 3. Maintenance Work Orders listener
    const qOrders = query(collection(db, 'maintenanceWorkOrders'), where('schoolId', '==', schoolId));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const orders: MaintenanceWorkOrder[] = [];
      snap.forEach((d) => orders.push({ id: d.id, ...d.data() } as MaintenanceWorkOrder));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWorkOrders(orders);
    }, (err) => console.warn('[SeniorHighDashboard] orders snapshot error:', err));

    // 4. Students listener
    const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const studentList: any[] = [];
      snap.forEach((d) => studentList.push({ id: d.id, ...d.data() }));
      setStudents(studentList);
      setLoading(false);
    }, (err) => {
      console.warn('[SeniorHighDashboard] students snapshot error:', err);
      setLoading(false);
    });

    // 5. Staff (Users) listener
    const qStaff = query(collection(db, 'users'), where('schoolId', '==', schoolId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      const academics: UserProfile[] = [];
      const domestic: UserProfile[] = [];
      snap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as UserProfile;
        if (u.role === 'teacher' || u.role === 'assistant_academics' || u.role === 'school_head' || u.department === 'academics') {
          academics.push(u);
        }
        if (
          u.role === 'house_master' ||
          u.role === 'housekeeping' ||
          u.role === 'facilities' ||
          u.role === 'general_services' ||
          u.role === 'assistant_domestic' ||
          u.department === 'domestic'
        ) {
          domestic.push(u);
        }
      });
      setAcademicsStaff(academics);
      setDomesticStaff(domestic);
    }, (err) => console.warn('[SeniorHighDashboard] staff snapshot error:', err));

    // 6. School document listener
    const unsubSchool = onSnapshot(doc(db, 'schools', schoolId), (snap) => {
      if (snap.exists()) {
        setSchoolData({ id: snap.id, ...snap.data() } as any);
      }
    }, (err) => console.warn('[SeniorHighDashboard] school snapshot error:', err));

    return () => {
      unsubHouses();
      unsubExeats();
      unsubOrders();
      unsubStudents();
      unsubStaff();
      unsubSchool();
    };
  }, [schoolId, isSchoolHead]);

  // Derived Metrics
  const totalStudents = students.length;
  const boardersCount = students.filter(s => s.isBoarder || s.boardingStatus === 'boarder').length;
  const dayStudentsCount = totalStudents - boardersCount;
  const totalCapacity = boardingHouses.reduce((acc, h) => acc + (Number(h.capacity) || 0), 0);
  const totalOccupancy = boardingHouses.reduce((acc, h) => acc + (Number(h.currentOccupancy) || 0), 0);
  const pendingExeats = exeatRequests.filter(e => e.status === 'pending');
  const activeOrders = workOrders.filter(w => w.status === 'reported' || w.status === 'in_progress');

  // Handle Staff Save
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName.trim() || !staffForm.email.trim()) {
      showToast('Name and email are required.', 'error');
      return;
    }
    setIsSubmittingStaff(true);
    try {
      const emailClean = staffForm.email.trim().toLowerCase();
      const qExisting = query(collection(db, 'users'), where('email', '==', emailClean));
      const existingSnap = await getDocs(qExisting);
      if (!existingSnap.empty) {
        showToast('A user with this email address already exists.', 'error');
        setIsSubmittingStaff(false);
        return;
      }

      const newUid = `user_shs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const userDoc: any = {
        uid: newUid,
        email: emailClean,
        fullName: staffForm.fullName.trim(),
        name: staffForm.fullName.trim(),
        role: staffForm.role,
        department: staffForm.department,
        schoolId,
        schoolName: schoolData?.schoolName || currentUser.schoolName || 'Senior High School',
        educationCategory: 'SENIOR_HIGH',
        status: 'active',
        phone: staffForm.phone.trim(),
        specialization: staffForm.specialization.trim(),
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'users', newUid), userDoc);

      if (staffForm.role === 'teacher' || staffForm.role === 'assistant_academics') {
        const teacherDocRef = doc(collection(db, 'teachers'));
        await setDoc(teacherDocRef, {
          id: teacherDocRef.id,
          uid: newUid,
          schoolId,
          fullName: staffForm.fullName.trim(),
          name: staffForm.fullName.trim(),
          email: emailClean,
          phone: staffForm.phone.trim(),
          subjectSpecialization: staffForm.specialization.trim(),
          educationCategory: 'SENIOR_HIGH',
          status: 'active',
          createdAt: now
        });
      }

      showToast(`Staff member '${staffForm.fullName}' registered successfully.`, 'success');
      setIsStaffModalOpen(false);
      setStaffForm({
        fullName: '',
        email: '',
        phone: '',
        role: 'teacher',
        department: 'academics',
        specialization: ''
      });
    } catch (err: any) {
      showToast('Failed to register staff: ' + err.message, 'error');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffUid: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove ${staffName}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', staffUid));
      showToast(`Staff member '${staffName}' removed.`, 'info');
    } catch (err: any) {
      showToast('Failed to delete staff: ' + err.message, 'error');
    }
  };

  // Handle Student Save
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.fullName.trim()) {
      showToast('Student full name is required.', 'error');
      return;
    }
    const studentIdClean = studentForm.studentId.trim() || `SHS-${Date.now().toString().slice(-6)}`;
    setIsSubmittingStudent(true);
    try {
      const qExisting = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('studentId', '==', studentIdClean)
      );
      const existingSnap = await getDocs(qExisting);
      if (!existingSnap.empty) {
        showToast(`Student ID '${studentIdClean}' is already assigned in this school.`, 'error');
        setIsSubmittingStudent(false);
        return;
      }

      const assignedHouse = boardingHouses.find(h => h.id === studentForm.houseId);
      const now = new Date().toISOString();
      const studentDocRef = doc(collection(db, 'students'));
      const studentData: any = {
        id: studentDocRef.id,
        schoolId,
        schoolName: schoolData?.schoolName || currentUser.schoolName || 'Senior High School',
        studentId: studentIdClean,
        fullName: studentForm.fullName.trim(),
        name: studentForm.fullName.trim(),
        email: studentForm.email.trim().toLowerCase() || `${studentIdClean.toLowerCase()}@shs.edukenza.internal`,
        programme: studentForm.programme,
        form: studentForm.form,
        className: `${studentForm.programme} - ${studentForm.form}`,
        residentialStatus: studentForm.residentialStatus,
        isBoarder: studentForm.residentialStatus === 'Boarder',
        houseId: studentForm.residentialStatus === 'Boarder' ? (assignedHouse?.id || '') : '',
        houseName: studentForm.residentialStatus === 'Boarder' ? (assignedHouse?.name || 'Boarding') : 'Day Student',
        gender: studentForm.gender,
        dateOfBirth: studentForm.dob,
        parentName: studentForm.parentName.trim(),
        parentPhone: studentForm.parentPhone.trim(),
        parentEmail: studentForm.parentEmail.trim().toLowerCase(),
        status: 'active',
        educationCategory: 'SENIOR_HIGH',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(studentDocRef, studentData);

      if (assignedHouse && studentForm.residentialStatus === 'Boarder') {
        const houseDocRef = doc(db, 'boardingHouses', assignedHouse.id);
        await updateDoc(houseDocRef, {
          currentOccupancy: (Number(assignedHouse.currentOccupancy) || 0) + 1
        });
      }

      showToast(`Student '${studentForm.fullName}' registered successfully.`, 'success');
      setIsStudentModalOpen(false);
      setStudentForm({
        fullName: '',
        email: '',
        studentId: '',
        programme: 'General Science',
        form: 'SHS 1',
        residentialStatus: 'Boarder',
        houseId: '',
        gender: 'Male',
        dob: '',
        parentName: '',
        parentPhone: '',
        parentEmail: ''
      });
    } catch (err: any) {
      showToast('Failed to register student: ' + err.message, 'error');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove student record for ${studentName}?`)) return;
    try {
      await deleteDoc(doc(db, 'students', studentId));
      showToast(`Student '${studentName}' removed.`, 'info');
    } catch (err: any) {
      showToast('Failed to delete student: ' + err.message, 'error');
    }
  };

  // Handle House Save
  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseForm.name.trim()) {
      showToast('Please enter a house name.', 'error');
      return;
    }
    try {
      await addBoardingHouse({
        schoolId,
        name: houseForm.name.trim(),
        gender: houseForm.gender,
        capacity: Number(houseForm.capacity) || 100,
        currentOccupancy: 0,
        houseMasterName: houseForm.houseMasterName.trim(),
        houseMasterPhone: houseForm.houseMasterPhone.trim(),
        description: houseForm.description.trim()
      });
      showToast(`House '${houseForm.name}' added successfully.`, 'success');
      setIsHouseModalOpen(false);
      setHouseForm({
        name: '',
        gender: 'Boys',
        capacity: 120,
        houseMasterName: '',
        houseMasterPhone: '',
        description: ''
      });
    } catch (err: any) {
      showToast('Failed to add house: ' + err.message, 'error');
    }
  };

  // Handle Exeat Submit
  const handleSaveExeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exeatForm.studentName.trim() || !exeatForm.reason.trim()) {
      showToast('Student name and reason are required.', 'error');
      return;
    }
    const targetHouse = boardingHouses.find(h => h.id === exeatForm.houseId) || boardingHouses[0];
    try {
      await submitExeatRequest({
        schoolId,
        studentId: exeatForm.studentId || `stu_${Date.now()}`,
        studentName: exeatForm.studentName.trim(),
        houseId: targetHouse ? targetHouse.id : 'unassigned',
        houseName: targetHouse ? targetHouse.name : 'General Campus',
        reason: exeatForm.reason.trim(),
        category: exeatForm.category,
        departureDate: exeatForm.departureDate,
        expectedReturnDate: exeatForm.expectedReturnDate,
        parentContactPhone: exeatForm.parentContactPhone.trim()
      });
      showToast('Exeat request submitted successfully.', 'success');
      setIsExeatModalOpen(false);
      setExeatForm({
        studentName: '',
        studentId: '',
        houseId: '',
        houseName: '',
        reason: '',
        category: 'Weekend',
        departureDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        parentContactPhone: ''
      });
    } catch (err: any) {
      showToast('Failed to submit exeat: ' + err.message, 'error');
    }
  };

  // Handle Work Order Submit
  const handleSaveWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderForm.title.trim() || !workOrderForm.facilityLocation.trim()) {
      showToast('Work order title and location are required.', 'error');
      return;
    }
    try {
      await createMaintenanceWorkOrder({
        schoolId,
        title: workOrderForm.title.trim(),
        facilityLocation: workOrderForm.facilityLocation.trim(),
        category: workOrderForm.category,
        priority: workOrderForm.priority,
        reportedBy: currentUser?.fullName || currentUser?.name || 'Staff',
        reportedByRole: userRole,
        notes: workOrderForm.notes.trim()
      });
      showToast('Maintenance work order logged.', 'success');
      setIsWorkOrderModalOpen(false);
      setWorkOrderForm({
        title: '',
        facilityLocation: '',
        category: 'Electrical',
        priority: 'medium',
        notes: ''
      });
    } catch (err: any) {
      showToast('Failed to log work order: ' + err.message, 'error');
    }
  };

  // Exeat Status update
  const handleExeatAction = async (exeatId: string, newStatus: ExeatRequest['status']) => {
    try {
      await updateExeatStatus(
        exeatId, 
        newStatus, 
        currentUser?.fullName || currentUser?.name || 'House Master',
        `Approved by ${userRole.replace('_', ' ')}`
      );
      showToast(`Exeat marked as ${newStatus.replace('_', ' ')}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update exeat: ' + err.message, 'error');
    }
  };

  // Work Order Status update
  const handleWorkOrderAction = async (orderId: string, newStatus: MaintenanceWorkOrder['status']) => {
    try {
      await updateMaintenanceWorkOrderStatus(
        orderId, 
        newStatus, 
        currentUser?.fullName || currentUser?.name
      );
      showToast(`Work order status updated to ${newStatus}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update work order: ' + err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* TOP SENIOR HIGH HEADER */}
      <header className="bg-[#002147] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight uppercase">
                  {currentUser?.schoolName || 'Senior High School'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#D4AF37] text-[#002147] tracking-wider uppercase">
                  SENIOR HIGH (SHS)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <span>Role:</span>
                <span className="text-[#D4AF37] font-bold uppercase">{userRole.replace(/_/g, ' ')}</span>
                <span>•</span>
                <span>Workflow: Academic & Domestic Administration</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-100">{currentUser?.fullName || currentUser?.name}</div>
              <div className="text-[10px] text-slate-400">{currentUser?.email}</div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-[#001833] px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto text-xs font-bold border-t border-white/5">
          
          {isSchoolHead && (
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>School Head Overview</span>
            </button>
          )}

          {isAcademics && (
            <>
              <button
                onClick={() => setActiveTab('academics')}
                className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'academics'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Academics (Programmes & Faculty)</span>
              </button>

              <button
                onClick={() => setActiveTab('lms')}
                className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'lms'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>SHS Learning Management (LMS)</span>
              </button>
            </>
          )}

          {isDomestic && (
            <button
              onClick={() => setActiveTab('domestic')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'domestic'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Domestic & Boarding Administration</span>
            </button>
          )}

          {isDomesticStaff && (
            <>
              <button
                onClick={() => setActiveTab('houses')}
                className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'houses'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Boarding Houses ({boardingHouses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('exeats')}
                className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'exeats'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Exeat System</span>
                {pendingExeats.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {pendingExeats.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('facilities')}
                className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'facilities'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Facilities & Services ({workOrders.length})</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'staff'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Roster (Academics / Domestic)</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>SHS Students ({totalStudents})</span>
          </button>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* HIERARCHY BANNER */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-[#002147] text-sm uppercase">Senior High Structural Hierarchy</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                School Head → Academics & Domestic Branches
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Assistant Academics directs Teachers, Students & Curriculum. Assistant Domestic manages House Masters, Boarding Houses, Exeats, Housekeeping, Facilities & General Services.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWorkOrderModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-600" />
              <span>Log Work Order</span>
            </button>

            <button
              onClick={() => setIsExeatModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Issue Exeat</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Total Students</div>
                <div className="text-2xl font-black text-[#002147]">{totalStudents}</div>
                <div className="text-[10px] text-slate-500 font-medium">SHS Enrolled Roster</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Boarding Students</div>
                <div className="text-2xl font-black text-indigo-700">{boardersCount}</div>
                <div className="text-[10px] text-slate-500 font-medium">Resident in Dormitories</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Day Students</div>
                <div className="text-2xl font-black text-emerald-700">{dayStudentsCount}</div>
                <div className="text-[10px] text-slate-500 font-medium">Commuter Scholars</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Boarding Houses</div>
                <div className="text-2xl font-black text-[#002147]">{boardingHouses.length}</div>
                <div className="text-[10px] text-slate-500 font-medium">{totalCapacity} Total Bed Spaces</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Pending Exeats</div>
                <div className="text-2xl font-black text-amber-600">{pendingExeats.length}</div>
                <div className="text-[10px] text-slate-500 font-medium">Awaiting Endorsement</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Active Work Orders</div>
                <div className="text-2xl font-black text-rose-600">{activeOrders.length}</div>
                <div className="text-[10px] text-slate-500 font-medium">Campus Maintenance</div>
              </div>

            </div>

            {/* TWO-BRANCH WORKFLOW DISPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ACADEMICS BRANCH CARD */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-[#002147] uppercase">Academics Branch</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Headed by Assistant Academics</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('lms')}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>LMS Hub</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('academics')}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Branch</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-xs font-bold text-slate-700">SHS Programmes Offered:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SENIOR_HIGH_PROGRAMMES.map((prog) => (
                        <span key={prog} className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-slate-200 text-slate-800">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                      <span className="text-slate-500 font-medium">Academic Staff</span>
                      <p className="text-lg font-black text-blue-950 mt-1">{academicsStaff.length} Teachers</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                      <span className="text-slate-500 font-medium">Core Form Levels</span>
                      <p className="text-lg font-black text-blue-950 mt-1">Form 1, 2 & 3</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DOMESTIC BRANCH CARD */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-[#002147] uppercase">Domestic Branch</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Headed by Assistant Domestic</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('domestic')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Branch</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <Bed className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                      <div className="font-black text-slate-900">{boardingHouses.length}</div>
                      <div className="text-[10px] text-slate-500">Houses</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <ClipboardCheck className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
                      <div className="font-black text-slate-900">{exeatRequests.length}</div>
                      <div className="text-[10px] text-slate-500">Exeats</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <Wrench className="w-4 h-4 mx-auto text-rose-600 mb-1" />
                      <div className="font-black text-slate-900">{workOrders.length}</div>
                      <div className="text-[10px] text-slate-500">Work Orders</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-xs text-amber-950 font-medium">
                    Sub-divisions: House Masters/Mistresses • Housekeeping & Dining • Facilities & Maintenance • General Services
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ACADEMICS BRANCH */}
        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Academic Administration (SHS)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Programmes, Subject specializations, Curriculum delivery and Faculty management
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('lms')}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <GraduationCap className="w-4 h-4 text-white" />
                  <span>Open SHS LMS Portal</span>
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className="px-4 py-2 rounded-lg bg-[#002147] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Assign Teacher</span>
                </button>
              </div>
            </div>

            {/* PROGRAMMES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SENIOR_HIGH_PROGRAMMES.map((programme) => (
                <div key={programme} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-900 font-black text-xs uppercase">
                      {programme}
                    </span>
                    <BookOpen className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Form 1, 2, and 3 specialised stream curriculum including elective and core subjects.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Active Track: WASSCE Standard</span>
                    <span className="text-blue-700 font-bold">Standard Syllabus</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2B: SHS LMS PORTAL */}
        {activeTab === 'lms' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Senior High Learning Management System (LMS)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Create and deliver Form 1-3 curricula, manage WASSCE subject courses, video lectures, assignments, timed quizzes, and monitor student academic performance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {userRole === 'school_head' ? 'School Head Access' : 'Academic Leadership Access'}
                </span>
              </div>
            </div>

            <LmsMainView
              schoolId={schoolId}
              currentUserId={currentUser?.uid || currentUser?.id || ''}
              currentUserName={currentUser?.fullName || currentUser?.name || 'School Head'}
              currentUserRole={userRole as any}
              showToast={showToast}
            />
          </div>
        )}

        {/* TAB 3: DOMESTIC BRANCH */}
        {activeTab === 'domestic' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Domestic & Boarding Administration
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Executive management of Boarding Houses, Exeats, Dining Hall, Facilities & General Services
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHouseModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-[#002147] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Add Boarding House</span>
                </button>
              </div>
            </div>

            {/* DOMESTIC PILLARS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div 
                onClick={() => setActiveTab('houses')}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 shadow-sm transition cursor-pointer space-y-2"
              >
                <Bed className="w-6 h-6 text-amber-600" />
                <h3 className="font-bold text-sm text-[#002147]">1. Boarding Houses</h3>
                <p className="text-xs text-slate-500">
                  {boardingHouses.length} Residential Houses with {totalCapacity} bed space capacity.
                </p>
                <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 pt-2">
                  <span>View Houses</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('exeats')}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-sm transition cursor-pointer space-y-2"
              >
                <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                <h3 className="font-bold text-sm text-[#002147]">2. Exeat Management</h3>
                <p className="text-xs text-slate-500">
                  {exeatRequests.length} Total Requests, {pendingExeats.length} Pending Approval.
                </p>
                <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 pt-2">
                  <span>Manage Exeats</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('facilities')}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-rose-400 shadow-sm transition cursor-pointer space-y-2"
              >
                <Wrench className="w-6 h-6 text-rose-600" />
                <h3 className="font-bold text-sm text-[#002147]">3. Facilities & Repairs</h3>
                <p className="text-xs text-slate-500">
                  {workOrders.length} Maintenance orders logged across campus infrastructure.
                </p>
                <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1 pt-2">
                  <span>Work Orders</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('staff')}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-400 shadow-sm transition cursor-pointer space-y-2"
              >
                <Users className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-sm text-[#002147]">4. Domestic Staff Roster</h3>
                <p className="text-xs text-slate-500">
                  House Masters, Housekeeping, Facilities, and General Services officers.
                </p>
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 pt-2">
                  <span>View Staff</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: BOARDING HOUSES */}
        {activeTab === 'houses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Boarding Houses & Dormitories
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Manage dormitory capacities, occupancy, and House Master / Mistress allocations
                </p>
              </div>

              <button
                onClick={() => setIsHouseModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#002147] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Add Boarding House</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boardingHouses.map((house) => (
                <div key={house.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-[#D4AF37]" />
                      <h3 className="font-black text-sm text-[#002147]">{house.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {house.gender}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Capacity:</span>
                      <span className="font-bold text-slate-800">{house.capacity} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Occupancy:</span>
                      <span className="font-bold text-slate-800">{house.currentOccupancy || 0} Students</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">House Master / Mistress:</span>
                      <span className="font-bold text-[#002147]">{house.houseMasterName || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#D4AF37] h-full"
                      style={{ width: `${Math.min(100, Math.round(((house.currentOccupancy || 0) / (house.capacity || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: EXEATS */}
        {activeTab === 'exeats' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Student Exeat Management
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Review, approve, and track boarding student leaves, weekend permits, and medical exeats
                </p>
              </div>

              <button
                onClick={() => setIsExeatModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#002147] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>New Exeat Request</span>
              </button>
            </div>

            {/* EXEATS TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[#002147] font-black uppercase tracking-wider">
                      <th className="p-3.5">Student & House</th>
                      <th className="p-3.5">Category & Reason</th>
                      <th className="p-3.5">Departure Date</th>
                      <th className="p-3.5">Expected Return</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {exeatRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No exeat requests recorded yet.
                        </td>
                      </tr>
                    ) : (
                      exeatRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-[#002147]">{req.studentName}</div>
                            <div className="text-[10px] text-slate-400">{req.houseName}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">
                              {req.category}
                            </span>
                            <div className="text-slate-600 mt-1">{req.reason}</div>
                          </td>
                          <td className="p-3.5 text-slate-700">{req.departureDate}</td>
                          <td className="p-3.5 text-slate-700">{req.expectedReturnDate}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              req.status.includes('approved') ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {req.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleExeatAction(req.id, 'approved_by_house_master')}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleExeatAction(req.id, 'denied')}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                            {req.status.includes('approved') && (
                              <button
                                onClick={() => handleExeatAction(req.id, 'returned')}
                                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Mark Returned
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: FACILITIES & SERVICES */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Facilities, Housekeeping & General Services
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Track campus maintenance work orders, dining hall schedules, and sanitation tickets
                </p>
              </div>

              <button
                onClick={() => setIsWorkOrderModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#002147] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Log Maintenance Order</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workOrders.length === 0 ? (
                <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                  No work orders logged yet.
                </div>
              ) : (
                workOrders.map((order) => (
                  <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {order.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        order.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                        order.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.priority}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#002147]">{order.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">Location: {order.facilityLocation}</p>
                    </div>

                    {order.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        {order.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className={`font-bold capitalize ${
                        order.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>

                      {order.status !== 'completed' && (
                        <button
                          onClick={() => handleWorkOrderAction(order.id, 'completed')}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: STAFF ROSTER */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Senior High Staff Directory
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Categorized by Academic Faculty, Domestic & Boarding Staff, and Executive Leadership
                </p>
              </div>

              {(isSchoolHead || currentUser.role === 'platform_owner') && (
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#002147] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#003366] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Register Staff Member</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ACADEMIC STAFF */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <BookOpen className="w-5 h-5 text-blue-700" />
                  <h3 className="font-black text-sm text-[#002147] uppercase">Academic Staff ({academicsStaff.length})</h3>
                </div>

                <div className="space-y-2">
                  {academicsStaff.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No teachers registered yet.</p>
                  ) : (
                    academicsStaff.map((staff) => (
                      <div key={staff.uid} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-[#002147]">{staff.fullName || staff.name}</div>
                          <div className="text-[10px] text-slate-400">{staff.email}</div>
                          {staff.specialization && (
                            <div className="text-[10px] text-blue-600 font-medium">{staff.specialization}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold uppercase text-[10px]">
                            {staff.role.replace(/_/g, ' ')}
                          </span>
                          {(isSchoolHead || currentUser.role === 'platform_owner') && (
                            <button
                              onClick={() => handleDeleteStaff(staff.uid, staff.fullName || staff.name || 'Staff')}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* DOMESTIC STAFF */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Home className="w-5 h-5 text-amber-700" />
                  <h3 className="font-black text-sm text-[#002147] uppercase">Domestic & Services Staff ({domesticStaff.length})</h3>
                </div>

                <div className="space-y-2">
                  {domesticStaff.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No domestic staff registered yet.</p>
                  ) : (
                    domesticStaff.map((staff) => (
                      <div key={staff.uid} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-[#002147]">{staff.fullName || staff.name}</div>
                          <div className="text-[10px] text-slate-400">{staff.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold uppercase text-[10px]">
                            {staff.role.replace(/_/g, ' ')}
                          </span>
                          {(isSchoolHead || currentUser.role === 'platform_owner') && (
                            <button
                              onClick={() => handleDeleteStaff(staff.uid, staff.fullName || staff.name || 'Staff')}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 8: STUDENTS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#002147] tracking-tight uppercase">
                  Senior High Students Roster
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Students segmented by Programme (Science, Arts, Business) and Status (Boarder / Day)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(isSchoolHead || currentUser.role === 'platform_owner' || isAcademics) && (
                  <button
                    onClick={() => setIsStudentModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#002147] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#003366] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Register SHS Student</span>
                  </button>
                )}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[#002147] font-black uppercase tracking-wider">
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Student ID</th>
                      <th className="p-3.5">Programme</th>
                      <th className="p-3.5">Residency Status</th>
                      <th className="p-3.5">Assigned House</th>
                      <th className="p-3.5">Form Level</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No students registered in this school yet.
                        </td>
                      </tr>
                    ) : (
                      students
                        .filter(s => (s.name || s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5 font-bold text-[#002147]">{s.fullName || s.name}</td>
                            <td className="p-3.5 font-mono text-slate-600 font-bold">{s.studentId || 'N/A'}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold">
                                {s.programme || 'General Science'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.isBoarder || s.residentialStatus === 'Boarder' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                {s.isBoarder || s.residentialStatus === 'Boarder' ? 'Boarder' : 'Day Student'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-700">
                              {s.houseName || (s.isBoarder || s.residentialStatus === 'Boarder' ? 'Boarding House' : 'Day Student')}
                            </td>
                            <td className="p-3.5 text-slate-700">{s.form || s.className || 'SHS 1'}</td>
                            <td className="p-3.5 text-right">
                              {(isSchoolHead || currentUser.role === 'platform_owner') && (
                                <button
                                  onClick={() => handleDeleteStudent(s.id, s.fullName || s.name || 'Student')}
                                  className="p-1.5 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MODAL: ADD BOARDING HOUSE */}
      {isHouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">Add Boarding House</h3>
              <button onClick={() => setIsHouseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHouse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">House Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yaa Asantewaa House"
                  value={houseForm.name}
                  onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Resident Gender</label>
                  <select
                    value={houseForm.gender}
                    onChange={(e) => setHouseForm({ ...houseForm, gender: e.target.value as any })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Bed Capacity</label>
                  <input
                    type="number"
                    value={houseForm.capacity}
                    onChange={(e) => setHouseForm({ ...houseForm, capacity: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">House Master / Mistress Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. K. Mensah"
                  value={houseForm.houseMasterName}
                  onChange={(e) => setHouseForm({ ...houseForm, houseMasterName: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">House Master Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +233 24 000 0000"
                  value={houseForm.houseMasterPhone}
                  onChange={(e) => setHouseForm({ ...houseForm, houseMasterPhone: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHouseModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase"
                >
                  Save House
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW EXEAT REQUEST */}
      {isExeatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">Issue Student Exeat</h3>
              <button onClick={() => setIsExeatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExeat} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="Full name of student"
                  value={exeatForm.studentName}
                  onChange={(e) => setExeatForm({ ...exeatForm, studentName: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Boarding House</label>
                  <select
                    value={exeatForm.houseId}
                    onChange={(e) => setExeatForm({ ...exeatForm, houseId: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="">Select House</option>
                    {boardingHouses.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={exeatForm.category}
                    onChange={(e) => setExeatForm({ ...exeatForm, category: e.target.value as any })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="Weekend">Weekend</option>
                    <option value="Medical">Medical</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Official">Official</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Reason for Exeat</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the reason for leave..."
                  value={exeatForm.reason}
                  onChange={(e) => setExeatForm({ ...exeatForm, reason: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={exeatForm.departureDate}
                    onChange={(e) => setExeatForm({ ...exeatForm, departureDate: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Expected Return</label>
                  <input
                    type="date"
                    required
                    value={exeatForm.expectedReturnDate}
                    onChange={(e) => setExeatForm({ ...exeatForm, expectedReturnDate: e.target.value })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Parent / Guardian Contact</label>
                <input
                  type="text"
                  placeholder="Emergency phone number"
                  value={exeatForm.parentContactPhone}
                  onChange={(e) => setExeatForm({ ...exeatForm, parentContactPhone: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExeatModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase"
                >
                  Submit Exeat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG MAINTENANCE WORK ORDER */}
      {isWorkOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#002147] uppercase">Log Campus Work Order</h3>
              <button onClick={() => setIsWorkOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab 2 Lighting Repair"
                  value={workOrderForm.title}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dorm Block B, Dining Hall, Lab 1"
                  value={workOrderForm.facilityLocation}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, facilityLocation: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={workOrderForm.category}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, category: e.target.value as any })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Structural">Structural</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Priority</label>
                  <select
                    value={workOrderForm.priority}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, priority: e.target.value as any })}
                    className="w-full mt-1 p-2 rounded border border-slate-300 font-bold bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Details / Observations</label>
                <textarea
                  rows={2}
                  placeholder="Optional repair specifications..."
                  value={workOrderForm.notes}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, notes: e.target.value })}
                  className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWorkOrderModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#002147] text-white font-black uppercase cursor-pointer"
                >
                  Log Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER STAFF MEMBER */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#002147]" />
                <h3 className="text-base font-black text-[#002147] uppercase">Register Staff Member</h3>
              </div>
              <button 
                onClick={() => setIsStaffModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kwame Mensah"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="kwame.mensah@shs.internal"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+233 24 000 0000"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Institutional Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      const isDom = newRole === 'house_master' || newRole === 'assistant_domestic' || newRole === 'facilities' || newRole === 'housekeeping' || newRole === 'general_services';
                      setStaffForm({
                        ...staffForm,
                        role: newRole,
                        department: isDom ? 'domestic' : 'academics'
                      });
                    }}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    <option value="teacher">Subject Teacher / Tutor</option>
                    <option value="assistant_academics">Assistant Head - Academics</option>
                    <option value="assistant_domestic">Assistant Head - Domestic</option>
                    <option value="house_master">House Master / Mistress</option>
                    <option value="facilities">Facilities & Maintenance</option>
                    <option value="housekeeping">Housekeeping & Sanitation</option>
                    <option value="general_services">General Services & Security</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Department</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    <option value="academics">Academics Faculty</option>
                    <option value="domestic">Domestic & Residential Life</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Subject Specialization / Primary Focus</label>
                <input
                  type="text"
                  placeholder="e.g. Elective Physics, Core Mathematics, Resident Hall Ops"
                  value={staffForm.specialization}
                  onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-5 py-2 rounded-xl bg-[#002147] text-white font-black uppercase hover:bg-[#003366] transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStaff ? 'Registering...' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER SHS STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#002147]" />
                <h3 className="text-base font-black text-[#002147] uppercase">Register SHS Student</h3>
              </div>
              <button 
                onClick={() => setIsStudentModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kofi Boateng"
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Student ID / Index No.</label>
                  <input
                    type="text"
                    placeholder="Leave empty for auto-generated"
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Academic Programme *</label>
                  <select
                    value={studentForm.programme}
                    onChange={(e) => setStudentForm({ ...studentForm, programme: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    {SENIOR_HIGH_PROGRAMMES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Form Level *</label>
                  <select
                    value={studentForm.form}
                    onChange={(e) => setStudentForm({ ...studentForm, form: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    <option value="SHS 1">SHS 1</option>
                    <option value="SHS 2">SHS 2</option>
                    <option value="SHS 3">SHS 3</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Gender</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700">Residency Status *</label>
                  <select
                    value={studentForm.residentialStatus}
                    onChange={(e) => setStudentForm({ ...studentForm, residentialStatus: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                  >
                    <option value="Boarder">Boarder (Resident)</option>
                    <option value="Day">Day Student (Commuter)</option>
                  </select>
                </div>

                {studentForm.residentialStatus === 'Boarder' && (
                  <div>
                    <label className="font-bold text-slate-700">Assigned Boarding House</label>
                    <select
                      value={studentForm.houseId}
                      onChange={(e) => setStudentForm({ ...studentForm, houseId: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#002147] focus:outline-none"
                    >
                      <option value="">-- Select House --</option>
                      {boardingHouses.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.gender}) - {h.currentOccupancy}/{h.capacity}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Guardian / Parent Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Parent Name</label>
                    <input
                      type="text"
                      placeholder="Parent/Guardian name"
                      value={studentForm.parentName}
                      onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                      className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Parent Phone</label>
                    <input
                      type="tel"
                      placeholder="+233 24 000 0000"
                      value={studentForm.parentPhone}
                      onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                      className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Parent Email</label>
                    <input
                      type="email"
                      placeholder="parent@email.com"
                      value={studentForm.parentEmail}
                      onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                      className="w-full mt-1 p-2 rounded border border-slate-300 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="px-5 py-2 rounded-xl bg-[#002147] text-white font-black uppercase hover:bg-[#003366] transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStudent ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
