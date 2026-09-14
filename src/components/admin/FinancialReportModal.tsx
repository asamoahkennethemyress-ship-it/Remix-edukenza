import React from 'react';
import { 
  Printer, 
  X, 
  Download, 
  DollarSign, 
  FileSpreadsheet, 
  Calendar, 
  Building2, 
  TrendingUp, 
  PieChart, 
  Layers,
  ShieldCheck
} from 'lucide-react';
import { SchoolDocumentSettings, DEFAULT_DOCUMENT_SETTINGS } from '../../types/documentCustomization';
import { PaymentRecord, FeeStructureRecord, StudentInvoiceRecord } from './PaymentManagement';
import { StudentRecord } from '../SchoolAdminDashboard';

interface FinancialReportModalProps {
  schoolId: string;
  payments: PaymentRecord[];
  feeStructures: FeeStructureRecord[];
  invoices: StudentInvoiceRecord[];
  students: StudentRecord[];
  settings?: SchoolDocumentSettings;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  schoolId,
  payments,
  feeStructures,
  invoices,
  students,
  settings = DEFAULT_DOCUMENT_SETTINGS,
  onClose,
  showToast
}) => {
  const primaryColor = settings.primaryColor || '#002147';
  const accentColor = settings.accentColor || '#D4AF37';
  const currency = settings.currencySymbol || 'GHS';

  // Metrics
  const validPayments = payments.filter(p => p.status !== 'Reversed' && p.status !== 'Cancelled');
  const totalRevenue = validPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalRevenue / totalInvoiced) * 100)) : 100;

  // Breakdown by Fee Category
  const categoryMap: { [cat: string]: { billed: number; collected: number } } = {};
  invoices.forEach(inv => {
    const cat = inv.feeCategory || 'General Tuition';
    if (!categoryMap[cat]) categoryMap[cat] = { billed: 0, collected: 0 };
    categoryMap[cat].billed += inv.totalAmount || 0;
  });
  validPayments.forEach(pay => {
    const cat = pay.feeType || 'General Tuition';
    if (!categoryMap[cat]) categoryMap[cat] = { billed: 0, collected: 0 };
    categoryMap[cat].collected += pay.amountPaid || 0;
  });

  // Breakdown by Class Level
  const classMap: { [className: string]: { count: number; billed: number; collected: number; outstanding: number } } = {};
  invoices.forEach(inv => {
    const c = inv.className || 'Unassigned Class';
    if (!classMap[c]) classMap[c] = { count: 0, billed: 0, collected: 0, outstanding: 0 };
    classMap[c].count += 1;
    classMap[c].billed += inv.totalAmount || 0;
    classMap[c].collected += inv.amountPaid || 0;
    classMap[c].outstanding += inv.outstandingBalance || 0;
  });

  // Payment Method Distribution
  const methodMap: { [m: string]: number } = {};
  validPayments.forEach(pay => {
    const m = pay.paymentMethod || 'Cash';
    methodMap[m] = (methodMap[m] || 0) + (pay.amountPaid || 0);
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date', 'Student ID', 'Student Name', 'Class', 'Fee Type', 'Amount Paid', 'Method', 'Reference', 'Status'];
    const rows = validPayments.map(p => [
      p.receiptNumber,
      p.datePaid,
      p.studentId,
      `"${p.studentName.replace(/"/g, '""')}"`,
      `"${p.className}"`,
      `"${p.feeType}"`,
      p.amountPaid,
      `"${p.paymentMethod}"`,
      `"${p.transactionRef || ''}"`,
      p.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `School_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial report CSV downloaded successfully!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #financial-report-print, #financial-report-print * {
            visibility: visible;
          }
          #financial-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div 
        id="financial-report-print"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Top Control Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Official Institutional Financial Summary Report
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Statement</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Sheet */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-white text-slate-900 space-y-6">
          {/* Header */}
          <div className="border-b-2 pb-5 border-slate-200" style={{ borderBottomColor: primaryColor }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={settings.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl}
                  alt={settings.schoolName}
                  className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                    {settings.schoolName}
                  </h1>
                  <p className="text-xs text-slate-500">{settings.address} • Tel: {settings.phone}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                    ACADEMIC SESSION: {settings.academicYear || '2026'} ({settings.academicTerm || 'Term 1, 2026'})
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span 
                  className="inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Executive Financial Statement
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-white p-4 rounded-xl shadow-sm" style={{ backgroundColor: primaryColor }}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Total Revenue Collected
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {currency} {totalRevenue.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Total Fees Invoiced
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {currency} {totalInvoiced.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Outstanding Dues
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                {currency} {totalOutstanding.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Collection Efficiency
              </span>
              <span className="text-xl sm:text-2xl font-black" style={{ color: accentColor }}>
                {collectionRate}%
              </span>
            </div>
          </div>

          {/* Class-by-Class Revenue Performance */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002147] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              Class-by-Class Revenue & Balance Breakdown
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                    <th className="p-2.5 uppercase font-bold text-[11px]">Class Name</th>
                    <th className="p-2.5 uppercase font-bold text-[11px] text-center">Invoiced Students</th>
                    <th className="p-2.5 uppercase font-bold text-[11px] text-right">Total Invoiced</th>
                    <th className="p-2.5 uppercase font-bold text-[11px] text-right">Total Collected</th>
                    <th className="p-2.5 uppercase font-bold text-[11px] text-right">Outstanding</th>
                    <th className="p-2.5 uppercase font-bold text-[11px] text-center">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {Object.keys(classMap).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">No class invoice data available.</td>
                    </tr>
                  ) : (
                    Object.entries(classMap).map(([cName, stats]) => {
                      const rate = stats.billed > 0 ? Math.round((stats.collected / stats.billed) * 100) : 100;
                      return (
                        <tr key={cName} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-bold text-slate-900">{cName}</td>
                          <td className="p-2.5 text-center text-slate-600">{stats.count}</td>
                          <td className="p-2.5 text-right font-semibold text-slate-700">{currency} {stats.billed.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">{currency} {stats.collected.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-bold text-amber-700">{currency} {stats.outstanding.toLocaleString()}</td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${rate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Method Channels & Fee Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category summary */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
              <h4 className="font-black text-[#002147] uppercase text-[11px] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-[#D4AF37]" />
                Fee Categories Collected
              </h4>
              <div className="space-y-1.5">
                {Object.entries(categoryMap).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">{cat}</span>
                    <span className="font-mono font-black text-emerald-700">{currency} {val.collected.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method summary */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
              <h4 className="font-black text-[#002147] uppercase text-[11px] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                Payment Channels Utilized
              </h4>
              <div className="space-y-1.5">
                {Object.entries(methodMap).map(([m, val]) => (
                  <div key={m} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">{m}</span>
                    <span className="font-mono font-black text-[#002147]">{currency} {val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Endorsement Signature Area */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
            <div className="space-y-4">
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                Certified By: <span className="font-bold text-slate-900">{settings.cashierTitle}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Signature of Bursar / Finance Controller</p>
            </div>

            <div className="space-y-4 text-right">
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                Approved By: <span className="font-bold text-slate-900">{settings.principalName || settings.principalTitle}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Official Approval & Executive Endorsement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
