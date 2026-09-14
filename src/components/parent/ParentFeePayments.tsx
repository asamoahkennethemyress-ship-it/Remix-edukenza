import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  Printer,
  Eye,
  Plus,
  Send,
  Download,
  ShieldCheck,
  Zap,
  Lock,
  X
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  fetchPaystackConfig, 
  startPaystackCheckout, 
  PaystackConfigResponse 
} from '../../services/paymentGatewayService';

export interface ParentFeePaymentsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentFeePayments: React.FC<ParentFeePaymentsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent,
  showToast
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';

  const [loading, setLoading] = useState(false);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Paystack Gateway State
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfigResponse | null>(null);
  const [isPaystackCheckoutOpen, setIsPaystackCheckoutOpen] = useState(false);
  const [activePayInvoice, setActivePayInvoice] = useState<any | null>(null);
  const [customPayAmount, setCustomPayAmount] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Check Paystack Status on mount
  useEffect(() => {
    fetchPaystackConfig().then(cfg => {
      setPaystackConfig(cfg);
    }).catch(err => {
      console.warn('Paystack config check error:', err);
    });
  }, []);

  // Real-time Listeners
  useEffect(() => {
    if (!schoolId || !studentId) return;
    setLoading(true);

    // 1. Payments & Receipts
    const qPayments = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid || data.studentId === activeStudent?.id) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.datePaid || b.paymentDate || b.createdAt || 0).getTime() - new Date(a.datePaid || a.paymentDate || a.createdAt || 0).getTime());
      setPaymentsList(list);
      setLoading(false);
    }, (err) => {
      console.warn("Payments subscription warning:", err);
      setLoading(false);
    });

    // 2. Student Invoices
    const qInvoices = query(collection(db, 'studentInvoices'), where('schoolId', '==', schoolId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid || data.studentId === activeStudent?.id) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setInvoicesList(list);
    }, (err) => console.warn("Invoices subscription warning:", err));

    return () => {
      unsubPayments();
      unsubInvoices();
    };
  }, [schoolId, studentId, activeStudent?.uid]);

  // Calculations
  const totalBilled = invoicesList.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = paymentsList
    .filter(p => p.status === 'successful' || p.status === 'Fully Paid' || p.status === 'Paid')
    .reduce((acc, p) => acc + (Number(p.amountPaid || p.amount) || 0), 0);

  const outstandingBal = Math.max(0, invoicesList.reduce((acc, inv) => acc + (Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : inv.totalAmount) || 0), 0));

  // Handler: Open Checkout Modal for a specific invoice
  const handleOpenPaystackModal = (invoice: any) => {
    setActivePayInvoice(invoice);
    const balance = Number(invoice.outstandingBalance !== undefined ? invoice.outstandingBalance : invoice.totalAmount);
    setCustomPayAmount(balance > 0 ? balance.toString() : invoice.totalAmount?.toString() || '0');
    setIsPaystackCheckoutOpen(true);
  };

  // Handler: Execute Real Paystack Checkout Flow
  const handleExecutePaystackPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayInvoice) return;

    const payAmountNum = Number(customPayAmount);
    if (!payAmountNum || payAmountNum <= 0) {
      showToast?.('Please enter a valid payment amount.', 'error');
      return;
    }

    const payerEmail = currentUser?.email || activeStudent?.parentEmail || `${currentUser?.username || 'parent'}@edukenza.edu`;

    setIsProcessingPayment(true);
    try {
      showToast?.('Connecting to Paystack Secure Gateway...', 'info');

      const verification = await startPaystackCheckout({
        invoiceId: activePayInvoice.id,
        invoiceType: 'student_invoice',
        schoolId,
        studentId,
        studentName: activeStudent?.fullName || activeStudent?.name || 'Student',
        payerEmail,
        payerName: currentUser?.fullName || currentUser?.name || 'Parent',
        payerUid: currentUser?.uid || '',
        amount: payAmountNum,
        currency: 'GHS',
        feeType: activePayInvoice.feeCategory || 'School Fee Payment',
        callbackUrl: window.location.href
      });

      if (verification.success && verification.status === 'successful') {
        showToast?.(`Payment confirmed! Official Receipt #${verification.receiptNumber} generated.`, 'success');
        setIsPaystackCheckoutOpen(false);
        setActivePayInvoice(null);
      } else {
        showToast?.(`Payment unconfirmed: ${verification.message}`, 'error');
      }
    } catch (err: any) {
      console.error('Paystack checkout error:', err);
      showToast?.(err.message || 'Payment was cancelled or could not be verified.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">School Fees & Paystack Gateway</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official fee statements, published invoices, payment history, and server-verified receipts for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {linkedStudents.length > 1 && (
            <select
              value={activeStudent?.id || activeStudent?.studentId || ''}
              onChange={(e) => {
                const found = linkedStudents.find(s => (s.id === e.target.value || s.studentId === e.target.value));
                if (found) setSelectedStudent(found);
              }}
              className="bg-white/10 text-white font-bold text-xs p-2.5 rounded-xl outline-none cursor-pointer border border-white/20"
            >
              {linkedStudents.map(s => (
                <option key={s.id || s.studentId} value={s.id || s.studentId} className="bg-[#002147]">
                  {s.fullName || s.name} {s.className ? `(${s.className})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PAYSTACK PROVIDER STATUS BANNER */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wider text-[#D4AF37]">Paystack Payment Gateway</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Exclusive Active Provider
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Secure transactions with MTN MoMo, Telecel Cash, AirtelTigo, and Visa/Mastercard. Server-verified & idempotent.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[11px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-300">256-Bit SSL Encrypted</span>
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Invoiced Billed</span>
          <p className="text-2xl font-black text-[#002147]">GHS {totalBilled.toLocaleString()}.00</p>
          <p className="text-[9px] text-slate-500 font-medium">Academic Year 2026</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Total Paid</span>
          <p className="text-2xl font-black text-emerald-600">GHS {totalPaid.toLocaleString()}.00</p>
          <p className="text-[9px] text-slate-500 font-medium">Paystack & Bank Verified</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Balance</span>
          <p className="text-2xl font-black text-amber-600">GHS {outstandingBal.toLocaleString()}.00</p>
          <p className="text-[9px] text-slate-500 font-medium">Pending Settlement</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financial Standing</span>
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                outstandingBal === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {outstandingBal === 0 ? 'Fully Cleared' : 'Payment Due'}
            </span>
          </div>
          <p className="text-[9px] text-slate-500 font-medium">Auto-updated in real-time</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-3xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" /> Published Invoices ({invoicesList.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Verified Receipts ({paymentsList.length})
        </button>
      </div>

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              Official School Fee Invoices ({invoicesList.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {invoicesList.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center italic border border-dashed rounded-2xl">
                No fee invoices issued yet for this student. Published invoices will appear here in real-time.
              </p>
            ) : (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Fee Category</th>
                    <th className="p-3 font-mono">Total Billed</th>
                    <th className="p-3 font-mono">Amount Paid</th>
                    <th className="p-3 font-mono">Outstanding</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoicesList.map((inv) => {
                    const balance = Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : inv.totalAmount);
                    const isFullyPaid = balance <= 0 || inv.status === 'Paid';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-[#002147]">{inv.invoiceNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{inv.feeCategory}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">GHS {Number(inv.totalAmount).toLocaleString()}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">GHS {Number(inv.amountPaid || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono font-black text-amber-700">GHS {balance.toLocaleString()}</td>
                        <td className="p-3 font-mono text-slate-600">{inv.dueDate || 'End of Term'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                              isFullyPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.amountPaid > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isFullyPaid ? 'Paid' : inv.amountPaid > 0 ? 'Partially Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isFullyPaid && (
                              <button
                                onClick={() => handleOpenPaystackModal(inv)}
                                className="px-3 py-1.5 bg-[#002147] hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                              >
                                <Zap className="w-3.5 h-3.5 text-[#D4AF37]" /> Pay with Paystack
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" /> Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
            Verified Payment Receipts & Ledger ({paymentsList.length})
          </h2>

          <div className="overflow-x-auto">
            {paymentsList.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center italic border border-dashed rounded-2xl">
                No payment receipts recorded yet.
              </p>
            ) : (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Receipt Ref</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 font-mono">Amount Paid</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paymentsList.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-[#002147] font-mono">{pay.receiptNumber || pay.reference || pay.id}</td>
                      <td className="p-3 text-slate-500 font-mono">{pay.datePaid || pay.paidAt?.slice(0, 10) || pay.createdAt?.slice(0, 10)}</td>
                      <td className="p-3 font-bold text-slate-800">{pay.feeType}</td>
                      <td className="p-3 text-slate-600">{pay.paymentMethod || 'Paystack'}</td>
                      <td className="p-3 font-mono font-black text-emerald-700">GHS {Number(pay.amountPaid || pay.amount).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {pay.status === 'successful' ? 'Verified' : pay.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(pay)}
                          className="px-3 py-1.5 bg-[#002147] text-white font-bold text-[10px] rounded-lg hover:bg-[#003366] transition flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Inspect Receipt
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

      {/* MODAL: PAYSTACK SECURE CHECKOUT */}
      {isPaystackCheckoutOpen && activePayInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-[#002147] to-[#0b3c5d] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Paystack Instant Checkout</h3>
              </div>
              <button
                onClick={() => {
                  if (!isProcessingPayment) {
                    setIsPaystackCheckoutOpen(false);
                    setActivePayInvoice(null);
                  }
                }}
                disabled={isProcessingPayment}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePaystackPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Student:</span>
                  <span className="text-[#002147]">{activeStudent?.fullName || activeStudent?.name}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Invoice Reference:</span>
                  <span className="font-mono text-slate-800">{activePayInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Fee Category:</span>
                  <span className="text-slate-800">{activePayInvoice.feeCategory}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-black border-t pt-1.5">
                  <span>Total Outstanding:</span>
                  <span className="text-amber-700 font-mono text-sm">
                    GHS {Number(activePayInvoice.outstandingBalance !== undefined ? activePayInvoice.outstandingBalance : activePayInvoice.totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Amount (GHS) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">GHS</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Number(activePayInvoice.outstandingBalance !== undefined ? activePayInvoice.outstandingBalance : activePayInvoice.totalAmount)}
                    step="any"
                    value={customPayAmount}
                    onChange={(e) => setCustomPayAmount(e.target.value)}
                    disabled={isProcessingPayment}
                    className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-black text-sm text-slate-900 focus:border-[#002147] outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can pay the full outstanding balance or make a partial instalment payment.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Supported Payment Channels:
                </span>
                <p className="text-[10px] text-emerald-700 leading-relaxed">
                  MTN Mobile Money, Telecel Cash (Vodafone), AirtelTigo Money, Visa, Mastercard, and Bank Transfer.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaystackCheckoutOpen(false);
                    setActivePayInvoice(null);
                  }}
                  disabled={isProcessingPayment}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 rounded-xl bg-[#002147] hover:bg-emerald-700 text-white font-black uppercase tracking-wider shadow flex items-center gap-2 disabled:opacity-75 cursor-pointer transition"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-[#D4AF37]" />
                      <span>Proceed to Paystack</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="text-center border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-[#002147] uppercase">{currentUser?.schoolName || 'EDUkenZA Academy'}</h2>
              <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">OFFICIAL FEE INVOICE</p>
              <p className="text-xs font-mono font-bold text-slate-600">{selectedInvoice.invoiceNumber}</p>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Student Name:</span>
                <span className="font-bold text-[#002147]">{selectedInvoice.studentName} ({selectedInvoice.studentId})</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Fee Category:</span>
                <span className="font-bold">{selectedInvoice.feeCategory}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Total Billed:</span>
                <span className="font-bold">GHS {Number(selectedInvoice.totalAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-700">GHS {Number(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-[#002147]">Outstanding Due:</span>
                <span className="font-black text-amber-700 text-sm">GHS {Number(selectedInvoice.outstandingBalance !== undefined ? selectedInvoice.outstandingBalance : selectedInvoice.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-[#002147]/5 rounded-xl border border-[#002147]/20 text-[11px] text-slate-700">
              <span className="font-bold text-[#002147] block mb-1">Official Payment Gateway:</span>
              <p>Online payments are securely processed via Paystack. Click "Pay with Paystack" for immediate reconciliation.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
              {Number(selectedInvoice.outstandingBalance !== undefined ? selectedInvoice.outstandingBalance : selectedInvoice.totalAmount) > 0 && (
                <button
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    handleOpenPaystackModal(inv);
                  }}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Zap className="w-4 h-4 text-[#D4AF37]" /> Pay with Paystack
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#002147] text-white font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="text-center border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-[#002147] uppercase">{currentUser?.schoolName || 'EDUkenZA Academy'}</h2>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> OFFICIAL VERIFIED PAYMENT RECEIPT
              </p>
              <p className="text-xs font-mono font-bold text-slate-600">{selectedReceipt.receiptNumber || selectedReceipt.reference || selectedReceipt.id}</p>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Student:</span>
                <span className="font-bold text-[#002147]">{selectedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Payment Date:</span>
                <span className="font-mono">{selectedReceipt.datePaid || selectedReceipt.paidAt?.slice(0, 10) || selectedReceipt.createdAt?.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Fee Category:</span>
                <span className="font-bold">{selectedReceipt.feeType}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Payment Gateway:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.paymentMethod || 'Paystack Gateway'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold text-slate-400">Transaction Reference:</span>
                <span className="font-mono text-slate-600">{selectedReceipt.reference || selectedReceipt.transactionRef || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-[#002147]">Amount Paid:</span>
                <span className="font-black text-emerald-700 text-sm">GHS {Number(selectedReceipt.amountPaid || selectedReceipt.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[10px] space-y-1">
              <p className="font-bold">Verification Seal: AUTHORITATIVE SETTLEMENT</p>
              <p>This transaction has been cryptographically recorded and verified by the EDUkenZA Paystack Financial Engine.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#002147] text-white font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Official Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
