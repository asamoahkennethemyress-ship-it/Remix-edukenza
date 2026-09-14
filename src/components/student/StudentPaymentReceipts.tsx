import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Receipt, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  RefreshCw,
  FileText,
  Eye,
  ShieldCheck,
  X
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentPaymentReceiptsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentPaymentReceipts: React.FC<StudentPaymentReceiptsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [receipts, setReceipts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Real-time Listeners
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    // 1. Receipts & Payments
    const qReceipts = query(
      collection(db, 'paymentReceipts'),
      where('schoolId', '==', schoolId)
    );
    const unsubReceipts = onSnapshot(qReceipts, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentIdNumber || data.studentUid === currentUser?.uid || data.studentId === currentUser?.studentId) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.datePaid || b.paymentDate || b.createdAt || 0).getTime() - new Date(a.datePaid || a.paymentDate || a.createdAt || 0).getTime());
      setReceipts(list);
      setLoading(false);
    }, (err) => {
      console.warn("Real-time payment receipts error:", err);
      setLoading(false);
    });

    // 2. Published Invoices
    const qInvoices = query(
      collection(db, 'studentInvoices'),
      where('schoolId', '==', schoolId)
    );
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentIdNumber || data.studentUid === currentUser?.uid || data.studentId === currentUser?.studentId) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setInvoices(list);
    }, (err) => console.warn("Invoices error:", err));

    return () => {
      unsubReceipts();
      unsubInvoices();
    };
  }, [schoolId, studentIdNumber, currentUser?.uid, currentUser?.studentId]);

  // Calculations
  const totalBilled = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = receipts
    .filter(p => p.status !== 'Reversed')
    .reduce((acc, r) => acc + (Number(r.amountPaid || r.amount) || 0), 0);

  const outstandingBal = Math.max(0, invoices.reduce((acc, inv) => acc + (Number(inv.outstandingBalance) || 0), 0));

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Fee Invoices & Receipts</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official proof of payment receipts, itemized invoices, and financial statement records.
          </p>
        </div>

        <button
          onClick={() => showToast("Real-time finance status synced", "info")}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</span>
          <p className={`text-xl font-black ${outstandingBal === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {outstandingBal === 0 ? 'In Good Standing' : 'Balance Outstanding'}
          </p>
          <p className="text-[10px] text-slate-500 font-bold">{outstandingBal === 0 ? 'All Due Fees Settled' : 'Payment Required'}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed Fees</span>
          <p className="text-2xl font-black text-[#002147]">GHS {totalBilled.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">Academic Year 2026</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid to Date</span>
          <p className="text-2xl font-black text-emerald-700">GHS {totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-bold">{receipts.length} Receipts Verified</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Balance</span>
          <p className="text-2xl font-black text-amber-600">GHS {outstandingBal.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">Next Billing Term</p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-3xl overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" /> Published Invoices ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'receipts'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" /> Official Receipts ({receipts.length})
        </button>
      </div>

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm p-6 space-y-4 print:hidden">
          <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            School Admin Fee Invoices ({invoices.length})
          </h2>

          <div className="overflow-x-auto">
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center italic border border-dashed rounded-2xl">
                No invoices published yet. Published invoices will appear here.
              </p>
            ) : (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Fee Category</th>
                    <th className="p-3 font-mono">Total Billed</th>
                    <th className="p-3 font-mono">Paid</th>
                    <th className="p-3 font-mono">Outstanding</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#002147]">{inv.invoiceNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{inv.feeCategory}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">GHS {Number(inv.totalAmount).toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-700">GHS {Number(inv.amountPaid || 0).toLocaleString()}</td>
                      <td className="p-3 font-mono font-black text-amber-700">GHS {Number(inv.outstandingBalance).toLocaleString()}</td>
                      <td className="p-3 font-mono text-slate-600">{inv.dueDate}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 bg-[#002147] text-white font-bold text-[10px] rounded-lg hover:bg-[#003366] transition flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#D4AF37]" /> View Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm p-6 space-y-4 print:hidden">
          <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
            Official Verified Payment Receipts ({receipts.length})
          </h2>

          <div className="space-y-3">
            {receipts.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center italic border border-dashed rounded-2xl">
                No payment receipts found yet.
              </p>
            ) : (
              receipts.map((rcpt, i) => (
                <div key={rcpt.id || i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#002147] text-[#D4AF37] font-mono font-bold text-[10px] rounded-lg">
                        {rcpt.receiptNumber || rcpt.id}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">{rcpt.datePaid || rcpt.paymentDate}</span>
                    </div>
                    <h3 className="text-sm font-black text-[#002147]">{rcpt.feeType || rcpt.description}</h3>
                    <p className="text-xs text-slate-500">Paid via: {rcpt.paymentMethod} • Issued by: {rcpt.receivedBy || 'Accounts'}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-base font-black text-[#002147]">GHS {Number(rcpt.amountPaid || rcpt.amount).toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {rcpt.status || 'Verified'}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedReceipt(rcpt)}
                      className="px-3.5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Receipt
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RECEIPT PRINT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 print:shadow-none print:p-0 print:max-w-none border border-slate-200">
            
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-[#002147]">{currentUser.schoolName || 'EDUkenZA Academy'}</h1>
              <p className="font-bold text-xs text-slate-600">OFFICIAL PAYMENT RECEIPT</p>
              <p className="text-xs font-mono font-bold text-[#D4AF37]">{selectedReceipt.receiptNumber || selectedReceipt.id}</p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Student Name:</span>
                <span className="font-bold text-[#002147]">{selectedReceipt.studentName || currentUser.fullName} ({studentIdNumber})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Payment Date:</span>
                <span className="font-mono">{selectedReceipt.datePaid || selectedReceipt.paymentDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Category:</span>
                <span className="font-bold">{selectedReceipt.feeType || selectedReceipt.description}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Payment Method:</span>
                <span>{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-700">Amount Paid:</span>
                <span className="text-base font-black text-emerald-700">GHS {Number(selectedReceipt.amountPaid || selectedReceipt.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] text-slate-400">
              Verified & Issued by EDUkenZA Commercial School Billing Engine.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-100 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INVOICE PRINT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 print:shadow-none print:p-0 print:max-w-none border border-slate-200">
            
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-[#002147]">{currentUser.schoolName || 'EDUkenZA Academy'}</h1>
              <p className="font-bold text-xs text-slate-600">OFFICIAL FEE INVOICE</p>
              <p className="text-xs font-mono font-bold text-[#D4AF37]">{selectedInvoice.invoiceNumber}</p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Category:</span>
                <span className="font-bold text-[#002147]">{selectedInvoice.feeCategory}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Total Billed:</span>
                <span className="font-bold">GHS {Number(selectedInvoice.totalAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-400">Due Date:</span>
                <span className="font-mono text-amber-700 font-bold">{selectedInvoice.dueDate}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-700">Outstanding Balance:</span>
                <span className="text-base font-black text-amber-600">GHS {Number(selectedInvoice.outstandingBalance).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-600">
              <span className="font-bold text-[#002147] block mb-1">Payment Instructions:</span>
              <p>{selectedInvoice.paymentInstructions || 'Bank: Standard Bank Ghana • Mobile Money: 055 123 4567'}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Invoice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
