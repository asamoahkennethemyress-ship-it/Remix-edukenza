import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  DollarSign, 
  Filter, 
  Sparkles, 
  Clock, 
  Layers,
  Utensils,
  Bus,
  BookOpen,
  Printer,
  ShieldAlert,
  Save,
  UserCheck,
  TrendingUp,
  Receipt,
  Activity,
  CreditCard,
  Check,
  Zap,
  Tag
} from 'lucide-react';
import { 
  DailyService, 
  DailyServiceCategory, 
  StudentServiceEnrollment, 
  DailyServiceUsage 
} from '../../types/dailyServicesWallet';
import { 
  saveDailyService, 
  deleteDailyService, 
  enrollStudentInService,
  subscribeToDailyServices,
  subscribeToStudentEnrollments,
  subscribeToDailyServiceUsage,
  purchaseDailyServiceWithWallet
} from '../../services/dailyServicesWalletService';

interface Props {
  schoolId: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  students?: any[];
  classes?: any[];
}

export const DailyServicesManager: React.FC<Props> = ({
  schoolId,
  showToast,
  students = [],
  classes = []
}) => {
  const availableClasses = Array.from(new Set([...(classes || []).map((c: any) => c.name || c.className || c), ...students.map(s => s.className)])).filter(Boolean);

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'enrollments' | 'usage'>('catalog');
  const [services, setServices] = useState<DailyService[]>([]);
  const [enrollments, setEnrollments] = useState<StudentServiceEnrollment[]>([]);
  const [usages, setUsages] = useState<DailyServiceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal State for New/Edit Service
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DailyService | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DailyServiceCategory>('canteen');
  const [dailyCost, setDailyCost] = useState<number>(10);
  const [weeklyCost, setWeeklyCost] = useState<number>(45);
  const [monthlyCost, setMonthlyCost] = useState<number>(160);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [term, setTerm] = useState('Term 1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [walletEligible, setWalletEligible] = useState(true);
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [applicableClasses, setApplicableClasses] = useState<string>('All');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cash' | 'auto_deduct'>('wallet');

  // Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedServiceToAssign, setSelectedServiceToAssign] = useState<DailyService | null>(null);
  const [assignTargetType, setAssignTargetType] = useState<'individual' | 'class'>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.studentId || students[0]?.id || '');
  const [selectedClass, setSelectedClass] = useState(availableClasses[0] || 'All');
  const [billingFrequency, setBillingFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Quick Charge / Test Service Usage Modal
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false);
  const [quickChargeService, setQuickChargeService] = useState<DailyService | null>(null);
  const [quickChargeStudentId, setQuickChargeStudentId] = useState(students[0]?.studentId || students[0]?.id || '');
  const [quickChargeLoading, setQuickChargeLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const unsubServices = subscribeToDailyServices(schoolId, (data) => {
      setServices(data);
      setLoading(false);
    });

    const unsubEnrollments = subscribeToStudentEnrollments(schoolId, (enr) => {
      setEnrollments(enr);
    });

    const unsubUsages = subscribeToDailyServiceUsage(schoolId, (usg) => {
      setUsages(usg);
    });

    return () => {
      unsubServices();
      unsubEnrollments();
      unsubUsages();
    };
  }, [schoolId]);

  const handleOpenModal = (service?: DailyService) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDescription(service.description);
      setCategory(service.category);
      setDailyCost(service.dailyCost);
      setWeeklyCost(service.weeklyCost || service.dailyCost * 4.5);
      setMonthlyCost(service.monthlyCost || service.dailyCost * 18);
      setAcademicYear(service.academicYear || '2025/2026');
      setTerm(service.term || 'Term 1');
      setStartDate(service.startDate || '');
      setEndDate(service.endDate || '');
      setWalletEligible(service.walletEligible !== false);
      setStatus(service.status);
      setApplicableClasses(service.applicableClasses?.join(', ') || 'All');
      setPaymentMethod(service.paymentMethod);
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setCategory('canteen');
      setDailyCost(12);
      setWeeklyCost(50);
      setMonthlyCost(180);
      setAcademicYear('2025/2026');
      setTerm('Term 1');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setWalletEligible(true);
      setStatus('active');
      setApplicableClasses('All');
      setPaymentMethod('wallet');
    }
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const classesArray = applicableClasses.split(',').map(c => c.trim()).filter(Boolean);
      const payload: Omit<DailyService, 'id'> & { id?: string } = {
        id: editingService?.id,
        schoolId,
        name: name.trim(),
        description: description.trim(),
        category,
        dailyCost: Number(dailyCost),
        weeklyCost: Number(weeklyCost),
        monthlyCost: Number(monthlyCost),
        academicYear,
        term,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        walletEligible,
        status,
        applicableClasses: classesArray.length ? classesArray : ['All'],
        paymentMethod,
        createdAt: editingService?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveDailyService(payload);
      if (showToast) {
        showToast(`Daily Service "${name}" ${editingService ? 'updated' : 'created'} successfully!`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to save daily service', 'error');
    }
  };

  const handleDelete = async (id: string, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete service "${serviceName}"?`)) return;
    try {
      await deleteDailyService(id);
      if (showToast) showToast(`Service "${serviceName}" deleted`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to delete service', 'error');
    }
  };

  const handleOpenAssignModal = (service: DailyService) => {
    setSelectedServiceToAssign(service);
    setIsAssignModalOpen(true);
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceToAssign) return;

    try {
      if (assignTargetType === 'individual') {
        const studentObj = students.find(s => (s.uid === selectedStudentId || s.studentId === selectedStudentId || s.id === selectedStudentId)) || {
          studentId: selectedStudentId,
          name: 'Student',
          className: ''
        };

        await enrollStudentInService({
          schoolId,
          studentId: studentObj.studentId || selectedStudentId,
          studentName: studentObj.name || studentObj.fullName || 'Student',
          className: studentObj.className || '',
          serviceId: selectedServiceToAssign.id,
          serviceName: selectedServiceToAssign.name,
          category: selectedServiceToAssign.category,
          cost: billingFrequency === 'daily' ? selectedServiceToAssign.dailyCost : billingFrequency === 'weekly' ? (selectedServiceToAssign.weeklyCost || 50) : (selectedServiceToAssign.monthlyCost || 180),
          billingFrequency,
          status: 'active',
          assignedDate: new Date().toISOString()
        });

        if (showToast) {
          showToast(`Enrolled student ${studentObj.name || studentObj.fullName || 'Student'} into "${selectedServiceToAssign.name}"`, 'success');
        }
      } else {
        await enrollStudentInService({
          schoolId,
          studentId: `CLASS_GROUP_${selectedClass}`,
          studentName: `Entire Class ${selectedClass}`,
          className: selectedClass,
          serviceId: selectedServiceToAssign.id,
          serviceName: selectedServiceToAssign.name,
          category: selectedServiceToAssign.category,
          cost: selectedServiceToAssign.dailyCost,
          billingFrequency: 'daily',
          status: 'active',
          assignedDate: new Date().toISOString()
        });

        if (showToast) {
          showToast(`Enrolled entire class ${selectedClass} into "${selectedServiceToAssign.name}"`, 'success');
        }
      }

      setIsAssignModalOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to enroll student', 'error');
    }
  };

  const handleExecuteQuickCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickChargeService || !quickChargeStudentId) return;

    setQuickChargeLoading(true);
    try {
      const res = await purchaseDailyServiceWithWallet({
        schoolId,
        studentId: quickChargeStudentId,
        serviceId: quickChargeService.id,
        processedBy: 'Daily Services Admin Terminal'
      });

      if (res.success) {
        showToast?.(`Charged GHS ${res.amount.toFixed(2)} for ${res.serviceName}. New student wallet balance: GHS ${res.newBalance.toFixed(2)} (Ref: ${res.reference})`, 'success');
        setIsQuickChargeOpen(false);
      } else {
        showToast?.(`Charge failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Transaction failed', 'error');
    } finally {
      setQuickChargeLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat: DailyServiceCategory) => {
    switch (cat) {
      case 'canteen':
      case 'lunch':
      case 'breakfast':
      case 'snacks':
      case 'dinner':
      case 'boarding':
      case 'hostel':
        return Utensils;
      case 'transport':
      case 'bus':
        return Bus;
      case 'library':
      case 'lab':
      case 'extra_classes':
        return BookOpen;
      case 'printing':
      case 'shop':
        return Printer;
      default:
        return Layers;
    }
  };

  // Aggregated calculations
  const totalRevenueGenerated = usages.reduce((sum, u) => sum + (Number(u.cost) || 0), 0);
  const activeServicesCount = services.filter(s => s.status === 'active').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayUsagesCount = usages.filter(u => u.date && u.date.startsWith(todayStr)).length;
  const todayRevenue = usages
    .filter(u => u.date && u.date.startsWith(todayStr))
    .reduce((sum, u) => sum + (Number(u.cost) || 0), 0);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#002147] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            Daily Chargeable Services Manager
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Admin-managed campus services: canteen lunch, school bus, extra classes, lab, hostel boarding, and student wallet auto-deductions.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Create New Daily Service</span>
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Services</span>
            <Layers className="w-4 h-4 text-[#002147]" />
          </div>
          <div className="text-2xl font-black text-[#002147] mt-1">{activeServicesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{services.length} Total Configured</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{enrollments.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active subscriptions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-[#002147] mt-1">GHS {todayRevenue.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{todayUsagesCount} charges today</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Services Revenue</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">GHS {totalRevenueGenerated.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{usages.length} all-time usages</div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'catalog'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Services Catalog ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('enrollments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'enrollments'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student Enrollments ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('usage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'usage'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Usage & Revenue Ledger ({usages.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: SERVICES CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          {/* FILTERS AND SEARCH */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search services by name, description, or term..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#002147]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#002147]"
              >
                <option value="ALL">All Categories</option>
                <option value="canteen">Canteen / Lunch</option>
                <option value="breakfast">Breakfast</option>
                <option value="snacks">Snacks</option>
                <option value="dinner">Dinner</option>
                <option value="bus">School Bus Transport</option>
                <option value="extra_classes">Extra Classes & STEM</option>
                <option value="boarding">Boarding / Hostel</option>
                <option value="library">Library / Lab</option>
                <option value="printing">Printing & Photostat</option>
                <option value="trips">School Trips & Excursions</option>
                <option value="clubs">Clubs & Sports</option>
                <option value="shop">School Shop</option>
                <option value="other">Custom Services</option>
              </select>
            </div>
          </div>

          {/* SERVICES GRID */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              Loading real-time daily services from Firestore...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Daily Services Found</p>
              <p className="text-xs text-slate-400 mt-1">Create your first daily service to start enrolling students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((service) => {
                const Icon = getCategoryIcon(service.category);
                const activeEnrollmentsCount = enrollments.filter(e => e.serviceId === service.id).length;
                const serviceRevenue = usages
                  .filter(u => u.serviceId === service.id)
                  .reduce((sum, u) => sum + (Number(u.cost) || 0), 0);

                return (
                  <div 
                    key={service.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-3 bg-[#002147]/5 text-[#002147] rounded-xl border border-[#002147]/10">
                          <Icon className="w-6 h-6 text-[#002147]" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            service.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {service.status}
                          </span>
                          {service.walletEligible !== false && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5" /> Wallet
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-black text-slate-900 text-sm">{service.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.description || 'No description provided.'}</p>

                      {/* SERVICE METADATA TAGS */}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          {service.academicYear || '2025/2026'} • {service.term || 'Term 1'}
                        </span>
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                          Method: {service.paymentMethod.toUpperCase()}
                        </span>
                      </div>

                      {/* PRICING CARDS */}
                      <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Daily</span>
                          <span className="text-xs font-black text-[#002147]">GHS {service.dailyCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Weekly</span>
                          <span className="text-xs font-bold text-slate-700">GHS {(service.weeklyCost || service.dailyCost * 4.5).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Monthly</span>
                          <span className="text-xs font-bold text-slate-700">GHS {(service.monthlyCost || service.dailyCost * 18).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium truncate max-w-[150px]">Classes: <strong className="text-slate-800">{service.applicableClasses?.join(', ')}</strong></span>
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {activeEnrollmentsCount} Enrolled
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 text-right">
                        Service Revenue: <strong className="text-slate-800 font-mono">GHS {serviceRevenue.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenAssignModal(service)}
                        className="flex-1 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Assign</span>
                      </button>

                      <button
                        onClick={() => {
                          setQuickChargeService(service);
                          setIsQuickChargeOpen(true);
                        }}
                        className="px-3 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Charge Student Wallet for this Service"
                      >
                        <Zap className="w-3 h-3 text-[#D4AF37]" />
                        <span>Charge</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(service)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: STUDENT ENROLLMENTS */}
      {activeSubTab === 'enrollments' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#D4AF37]" />
              Assigned Student Service Subscriptions
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {enrollments.length} Active Subscriptions
            </span>
          </div>

          {enrollments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No students enrolled in daily services yet. Click "Assign" on any service above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Cost</th>
                    <th className="py-3 px-4">Assigned Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{enr.studentName}</td>
                      <td className="py-3 px-4 text-slate-600">{enr.className || 'General'}</td>
                      <td className="py-3 px-4 font-bold text-[#002147]">{enr.serviceName}</td>
                      <td className="py-3 px-4 uppercase font-bold text-[10px] text-slate-500">{enr.billingFrequency}</td>
                      <td className="py-3 px-4 font-black font-mono text-slate-900">GHS {Number(enr.cost).toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(enr.assignedDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {enr.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: USAGE & REVENUE LEDGER */}
      {activeSubTab === 'usage' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#D4AF37]" />
                Daily Service Usages & Real-Time Revenue Ledger
              </h3>
              <p className="text-xs text-slate-500">Live stream of student check-ins, canteen meal purchases, and bus charges.</p>
            </div>
            <span className="text-xs font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Total Revenue: GHS {totalRevenueGenerated.toFixed(2)}
            </span>
          </div>

          {usages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No daily service usages recorded yet. Use the "Charge" button to simulate a service deduction.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Fee Charged</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usages.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.date).toLocaleDateString()} {new Date(u.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{u.studentName}</td>
                      <td className="py-3 px-4 font-black text-[#002147]">{u.serviceName}</td>
                      <td className="py-3 px-4 capitalize text-slate-600">{u.category}</td>
                      <td className="py-3 px-4 font-black font-mono text-emerald-700">GHS {Number(u.cost).toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{u.transactionRef || u.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {u.status?.toUpperCase() || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                {editingService ? 'Edit Daily Service' : 'Create New Daily Service'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Daily Canteen Lunch, Express School Bus, Lab Practical Access"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DailyServiceCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="canteen">Canteen / Lunch</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="snacks">Snacks</option>
                    <option value="dinner">Dinner</option>
                    <option value="bus">School Bus / Transport</option>
                    <option value="extra_classes">Extra Classes & STEM</option>
                    <option value="boarding">Boarding / Hostel</option>
                    <option value="printing">Printing & Photostat</option>
                    <option value="library">Library / Lab Access</option>
                    <option value="trips">School Trips & Excursions</option>
                    <option value="clubs">Clubs & Sports</option>
                    <option value="shop">School Shop</option>
                    <option value="other">Custom Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="wallet">Student Digital Wallet</option>
                    <option value="auto_deduct">Automatic Daily Deduction</option>
                    <option value="cash">Direct Cash / Counter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Service description, daily menu specifications, route stops, or lab guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              {/* PRICING */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Daily Cost (GHS) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={dailyCost}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDailyCost(val);
                      setWeeklyCost(Number((val * 4.5).toFixed(2)));
                      setMonthlyCost(Number((val * 18).toFixed(2)));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Weekly Cost (GHS)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={weeklyCost}
                    onChange={(e) => setWeeklyCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Monthly Cost (GHS)</label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={monthlyCost}
                    onChange={(e) => setMonthlyCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* ACADEMIC YEAR, TERM & DATES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Term</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                    <option value="Full Year">Full Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* APPLICABLE CLASSES AND STATUS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Classes</label>
                  <input
                    type="text"
                    placeholder="e.g. All, Grade 10A, Basic 1"
                    value={applicableClasses}
                    onChange={(e) => setApplicableClasses(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* WALLET ELIGIBLE TOGGLE */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Student Wallet Deductible</div>
                  <div className="text-[10px] text-slate-500">Allow students to purchase this service directly with their digital wallet balance.</div>
                </div>
                <input
                  type="checkbox"
                  checked={walletEligible}
                  onChange={(e) => setWalletEligible(e.target.checked)}
                  className="w-4 h-4 rounded text-[#002147] cursor-pointer"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                  <span>Save Service</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SERVICE MODAL */}
      {isAssignModalOpen && selectedServiceToAssign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                Assign Service to Student or Class
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAssignment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Selected Service</div>
                <div className="text-sm font-black text-[#002147]">{selectedServiceToAssign.name}</div>
                <div className="text-xs text-slate-600 font-semibold">GHS {selectedServiceToAssign.dailyCost.toFixed(2)} / day</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assignment Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignTargetType('individual')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition ${
                      assignTargetType === 'individual'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Individual Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTargetType('class')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition ${
                      assignTargetType === 'class'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Entire Class
                  </button>
                </div>
              </div>

              {assignTargetType === 'individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                  >
                    {students.length === 0 ? (
                      <option value="">No registered students found</option>
                    ) : (
                      students.map(s => (
                        <option key={s.id || s.uid || s.studentId} value={s.studentId || s.uid || s.id}>
                          {s.name || s.fullName} ({s.className || 'Class'} - ID: {s.studentId || 'N/A'})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Target Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                  >
                    {availableClasses.length === 0 ? (
                      <option value="">No classes configured</option>
                    ) : (
                      availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Frequency</label>
                <select
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                >
                  <option value="daily">Daily Auto Deduct (GHS {selectedServiceToAssign.dailyCost.toFixed(2)})</option>
                  <option value="weekly">Weekly Charge (GHS {(selectedServiceToAssign.weeklyCost || selectedServiceToAssign.dailyCost * 4.5).toFixed(2)})</option>
                  <option value="monthly">Monthly Charge (GHS {(selectedServiceToAssign.monthlyCost || selectedServiceToAssign.dailyCost * 18).toFixed(2)})</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirm Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CHARGE SERVICE MODAL */}
      {isQuickChargeOpen && quickChargeService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D4AF37]" />
                Charge Student Wallet for Service
              </h3>
              <button onClick={() => setIsQuickChargeOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickCharge} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Service</div>
                <div className="text-sm font-black text-[#002147]">{quickChargeService.name}</div>
                <div className="text-xs font-black text-emerald-700 mt-1 font-mono">
                  Cost: GHS {quickChargeService.dailyCost.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Enforces server-authoritative balance check. Deducts directly from wallet and creates immutable transaction record.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
                <select
                  value={quickChargeStudentId}
                  onChange={(e) => setQuickChargeStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#002147]"
                >
                  {students.map(s => (
                    <option key={s.id || s.uid || s.studentId} value={s.studentId || s.uid || s.id}>
                      {s.name || s.fullName} ({s.className || 'Class'} - ID: {s.studentId || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickChargeOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickChargeLoading}
                  className="px-5 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                  <span>{quickChargeLoading ? 'Deducting...' : `Charge GHS ${quickChargeService.dailyCost.toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
