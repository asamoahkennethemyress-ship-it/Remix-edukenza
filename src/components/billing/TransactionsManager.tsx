import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Plus, 
  Building2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { BillingTransaction, TransactionStatus, BillingInvoice } from '../../types/billing';
import { fetchAllTransactions, recordTransaction, fetchAllInvoices, updateInvoiceStatus } from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';

export const TransactionsManager: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Record Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money');
  const [reference, setReference] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [txnList, invList] = await Promise.all([
      fetchAllTransactions(),
      fetchAllInvoices()
    ]);
    setTransactions(txnList);
    setInvoices(invList);
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.transactionId.toLowerCase().includes(search.toLowerCase()) || 
                          t.schoolName.toLowerCase().includes(search.toLowerCase()) ||
                          t.transactionReference.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleRecordTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      showToast?.('Please select an invoice', 'error');
      return;
    }

    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (!inv) return;

    try {
      const txn = await recordTransaction(
        {
          schoolId: inv.schoolId,
          schoolName: inv.schoolName,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount,
          currency: inv.currency || 'GHS',
          paymentMethod,
          transactionReference: reference || `REF-${Date.now()}`,
          status: 'successful',
          date: new Date().toISOString(),
          processedBy: currentUser?.email || 'platform_owner'
        },
        currentUser?.email
      );

      // Also update invoice status to paid
      await updateInvoiceStatus(inv.id, 'paid', new Date().toISOString(), currentUser?.email);

      showToast?.(`Recorded payment ${txn.transactionId}`, 'success');
      setShowRecordModal(false);
      loadData();
    } catch (err) {
      showToast?.('Failed to record transaction', 'error');
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'successful':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Successful</span>;
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'failed':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
      case 'refunded':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-xs font-bold flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Refunded</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002147]">Commercial Payment Transactions Log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Audit-grade record of every Mobile Money, Card, or Bank payment reference received across EDUkenZA.
          </p>
        </div>

        <button
          onClick={() => setShowRecordModal(true)}
          className="px-4 py-2.5 bg-[#002147] hover:bg-[#001833] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Record Payment Transaction</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search txn ID, school or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
          >
            <option value="all">All Transactions</option>
            <option value="successful">Successful Only</option>
            <option value="pending">Pending Only</option>
            <option value="failed">Failed Only</option>
            <option value="refunded">Refunded Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading payment transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No transactions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">School & Invoice</th>
                  <th className="p-4">Method & Reference</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date / Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-[#002147]">
                      {t.transactionId}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{t.schoolName}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{t.invoiceNumber}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{t.paymentMethod}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{t.transactionReference}</div>
                    </td>

                    <td className="p-4 font-black text-[#002147]">
                      {t.currency || 'GHS'} {t.amount.toLocaleString()}
                    </td>

                    <td className="p-4">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="p-4">
                      <div className="font-medium text-slate-800">{new Date(t.date).toLocaleString()}</div>
                      <div className="text-slate-400 text-[10px]">{t.processedBy || 'System Gateway'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD TRANSACTION MODAL */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Record Manual Payment Transaction
              </h3>
              <button 
                onClick={() => setShowRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Invoice *</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="">-- Choose Pending Invoice --</option>
                  {invoices.filter(i => i.status !== 'paid').map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.schoolName} ({inv.currency || 'GHS'} {inv.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Telecel Cash">Telecel Cash (Vodafone Cash)</option>
                  <option value="AirtelTigo Money">AirtelTigo Money</option>
                  <option value="Visa / Mastercard">Visa / Mastercard (Paystack/Hubtel)</option>
                  <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Reference / MoMo ID *</label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 2026072810992384"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
