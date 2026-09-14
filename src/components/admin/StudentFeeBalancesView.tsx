import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpDown, 
  Download, 
  FileSpreadsheet, 
  Plus, 
  Eye, 
  Receipt,
  UserCheck
} from 'lucide-react';
import { StudentRecord, ClassRecord } from '../SchoolAdminDashboard';
import { PaymentRecord, StudentInvoiceRecord } from './PaymentManagement';

interface StudentFeeBalancesViewProps {
  students: StudentRecord[];
  classes: ClassRecord[];
  invoices: StudentInvoiceRecord[];
  payments: PaymentRecord[];
  currency?: string;
  onRecordPaymentForStudent: (student: StudentRecord, outstanding: number) => void;
  onViewStudentReceipts: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface StudentBalanceItem {
  student: StudentRecord;
  studentId: string;
  studentName: string;
  className: string;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'No Fees Assigned';
  invoiceCount: number;
  paymentCount: number;
  lastPaymentDate?: string;
}

export const StudentFeeBalancesView: React.FC<StudentFeeBalancesViewProps> = ({
  students,
  classes,
  invoices,
  payments,
  currency = 'GHS',
  onRecordPaymentForStudent,
  onViewStudentReceipts,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'outstanding' | 'paid'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute student balances from real Firestore data
  const studentBalances = useMemo(() => {
    // Map of studentId -> { billed, paid, lastPaymentDate, invoiceCount, paymentCount }
    const invoiceMap: { [sid: string]: { billed: number; paid: number; invoiceCount: number } } = {};
    invoices.forEach(inv => {
      const sid = inv.studentId;
      if (!invoiceMap[sid]) invoiceMap[sid] = { billed: 0, paid: 0, invoiceCount: 0 };
      invoiceMap[sid].billed += (inv.totalAmount || 0);
      invoiceMap[sid].paid += (inv.amountPaid || 0);
      invoiceMap[sid].invoiceCount += 1;
    });

    const paymentMap: { [sid: string]: { paid: number; count: number; lastDate?: string } } = {};
    payments
      .filter(p => p.status !== 'Reversed' && p.status !== 'Cancelled')
      .forEach(p => {
        const sid = p.studentId;
        if (!paymentMap[sid]) paymentMap[sid] = { paid: 0, count: 0 };
        paymentMap[sid].paid += (p.amountPaid || 0);
        paymentMap[sid].count += 1;
        if (!paymentMap[sid].lastDate || (p.datePaid && p.datePaid > paymentMap[sid].lastDate!)) {
          paymentMap[sid].lastDate = p.datePaid;
        }
      });

    return students.map(st => {
      const sId = st.studentId || st.id;
      const invData = invoiceMap[sId] || invoiceMap[st.id] || { billed: 0, paid: 0, invoiceCount: 0 };
      const payData = paymentMap[sId] || paymentMap[st.id] || { paid: 0, count: 0 };

      const totalBilled = invData.billed;
      const totalPaid = Math.max(invData.paid, payData.paid);
      const outstandingBalance = Math.max(0, totalBilled - totalPaid);

      let status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'No Fees Assigned' = 'No Fees Assigned';
      if (totalBilled > 0) {
        if (outstandingBalance === 0) status = 'Fully Paid';
        else if (totalPaid > 0) status = 'Partially Paid';
        else status = 'Unpaid';
      }

      return {
        student: st,
        studentId: sId,
        studentName: st.fullName,
        className: st.className || 'Unassigned Class',
        totalBilled,
        totalPaid,
        outstandingBalance,
        status,
        invoiceCount: invData.invoiceCount,
        paymentCount: payData.count,
        lastPaymentDate: payData.lastDate
      } as StudentBalanceItem;
    });
  }, [students, invoices, payments]);

  // Filtering
  const filtered = useMemo(() => {
    return studentBalances.filter(item => {
      const matchesSearch = 
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.className.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = selectedClass === 'All' || item.className === selectedClass;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

      return matchesSearch && matchesClass && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.studentName.localeCompare(b.studentName)
          : b.studentName.localeCompare(a.studentName);
      } else if (sortBy === 'outstanding') {
        return sortOrder === 'asc'
          ? a.outstandingBalance - b.outstandingBalance
          : b.outstandingBalance - a.outstandingBalance;
      } else {
        return sortOrder === 'asc'
          ? a.totalPaid - b.totalPaid
          : b.totalPaid - a.totalPaid;
      }
    });
  }, [studentBalances, searchQuery, selectedClass, statusFilter, sortBy, sortOrder]);

  // Aggregate balance metrics
  const totalOutstandingAll = filtered.reduce((acc, i) => acc + i.outstandingBalance, 0);
  const totalPaidAll = filtered.reduce((acc, i) => acc + i.totalPaid, 0);
  const fullyPaidCount = filtered.filter(i => i.status === 'Fully Paid').length;
  const partialCount = filtered.filter(i => i.status === 'Partially Paid').length;
  const unpaidCount = filtered.filter(i => i.status === 'Unpaid').length;

  const handleExportBalancesCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Class', 'Total Billed', 'Total Paid', 'Outstanding Balance', 'Payment Status', 'Last Payment Date'];
    const rows = filtered.map(i => [
      i.studentId,
      `"${i.studentName.replace(/"/g, '""')}"`,
      `"${i.className}"`,
      i.totalBilled,
      i.totalPaid,
      i.outstandingBalance,
      i.status,
      i.lastPaymentDate || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Student_Fee_Balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Balances list exported to CSV.', 'success');
  };

  return (
    <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Outstanding</span>
          <span className="text-base font-black text-amber-600">{currency} {totalOutstandingAll.toLocaleString()}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Collected</span>
          <span className="text-base font-black text-emerald-700">{currency} {totalPaidAll.toLocaleString()}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Fully Paid</span>
          <span className="text-base font-black text-emerald-800">{fullyPaidCount} Students</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Partially Paid</span>
          <span className="text-base font-black text-blue-700">{partialCount} Students</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Unpaid Balance</span>
          <span className="text-base font-black text-red-600">{unpaidCount} Students</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, ID or class..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-semibold"
          >
            <option value="All">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.className}>{c.className}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Fully Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="No Fees Assigned">No Fees Assigned</option>
          </select>

          {/* Sort trigger */}
          <button
            onClick={() => {
              if (sortBy === 'outstanding') {
                setSortBy('paid');
              } else if (sortBy === 'paid') {
                setSortBy('name');
              } else {
                setSortBy('outstanding');
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort: {sortBy}</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportBalancesCSV}
            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Balances Data Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#002147] text-white">
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider">Student Name & ID</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider">Class</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right">Total Billed</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right">Total Paid</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right">Outstanding Balance</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-center">Status</th>
              <th className="p-3 font-bold uppercase text-[11px] tracking-wider text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                  No student records matched your balance filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.studentId} className="hover:bg-slate-50/80 transition">
                  <td className="p-3">
                    <div className="font-extrabold text-slate-900">{item.studentName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {item.studentId}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-700">
                    {item.className}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-700">
                    {currency} {item.totalBilled.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {currency} {item.totalPaid.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-black">
                    {item.outstandingBalance > 0 ? (
                      <span className="text-amber-700">
                        {currency} {item.outstandingBalance.toLocaleString()}
                      </span>
                    ) : item.totalBilled > 0 ? (
                      <span className="text-emerald-700">Cleared (0.00)</span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span 
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        item.status === 'Unpaid' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onRecordPaymentForStudent(item.student, item.outstandingBalance)}
                        className="px-2.5 py-1 bg-[#002147] hover:bg-[#003366] text-[#D4AF37] font-black text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Record payment for this student"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                      <button
                        onClick={() => onViewStudentReceipts(item.studentId)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="View receipts for this student"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipts</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
