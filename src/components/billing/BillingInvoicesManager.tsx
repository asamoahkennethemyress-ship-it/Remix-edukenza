import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Building2,
  Calendar,
  RefreshCw,
  Send
} from 'lucide-react';
import { BillingInvoice, InvoiceStatus, SchoolSubscription } from '../../types/billing';
import { 
  fetchAllInvoices, 
  generateInvoice, 
  updateInvoiceStatus, 
  fetchAllSchoolSubscriptions 
} from '../../services/billingService';
import { generateInvoicePDF, sendInvoiceEmailNotification } from '../../services/invoiceGeneratorService';
import { useAuth } from '../../context/AuthContext';

export const BillingInvoicesManager: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Generate Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('Aug 2026 - Sep 2026');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const [invList, subList] = await Promise.all([
      fetchAllInvoices(),
      fetchAllSchoolSubscriptions()
    ]);
    setInvoices(invList);
    setSubscriptions(subList);
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.schoolName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = (invoice: BillingInvoice) => {
    generateInvoicePDF(invoice);
    showToast?.(`Downloaded PDF for Invoice #${invoice.invoiceNumber}`, 'success');
  };

  const handleEmailInvoice = async (invoice: BillingInvoice) => {
    try {
      await sendInvoiceEmailNotification(invoice);
      showToast?.(`Email notification dispatched for Invoice #${invoice.invoiceNumber}`, 'success');
    } catch (err) {
      showToast?.('Failed to dispatch email invoice', 'error');
    }
  };

  const handleMarkAsPaid = async (invoice: BillingInvoice) => {
    try {
      await updateInvoiceStatus(invoice.id, 'paid', new Date().toISOString(), currentUser?.email);
      showToast?.(`Invoice #${invoice.invoiceNumber} marked as PAID`, 'success');
      loadInvoices();
    } catch (err) {
      showToast?.('Failed to update invoice status', 'error');
    }
  };

  const handleCancelInvoice = async (invoice: BillingInvoice) => {
    if (!window.confirm(`Are you sure you want to cancel Invoice #${invoice.invoiceNumber}?`)) return;
    try {
      await updateInvoiceStatus(invoice.id, 'cancelled', undefined, currentUser?.email);
      showToast?.(`Invoice #${invoice.invoiceNumber} cancelled`, 'success');
      loadInvoices();
    } catch (err) {
      showToast?.('Failed to cancel invoice', 'error');
    }
  };

  const handleGenerateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) {
      showToast?.('Please select a school', 'error');
      return;
    }

    const sub = subscriptions.find(s => s.schoolId === selectedSchoolId);
    if (!sub) {
      showToast?.('School subscription record not found', 'error');
      return;
    }

    try {
      const newInv = await generateInvoice(
        {
          schoolId: sub.schoolId,
          schoolName: sub.schoolName,
          planId: sub.planId,
          planName: sub.planName,
          billingPeriod,
          amount: sub.amount,
          taxAmount: Math.round(sub.amount * 0.05), // 5% SaaS tax/levy
          totalAmount: Math.round(sub.amount * 1.05),
          currency: sub.currency || 'GHS',
          status: 'pending',
          dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          notes: `Generated commercial billing invoice for ${sub.planName} tier.`
        },
        currentUser?.email
      );

      showToast?.(`Generated Invoice #${newInv.invoiceNumber}`, 'success');
      setShowGenerateModal(false);
      loadInvoices();
    } catch (err) {
      showToast?.('Failed to generate invoice', 'error');
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>;
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'overdue':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Overdue</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002147]">Commercial Billing & Invoices</h2>
          <p className="text-sm text-slate-500 mt-1">
            Generate, track, email, and download official PDF tax invoices for EDUkenZA school subscriptions.
          </p>
        </div>

        <button
          onClick={() => {
            setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
            setShowGenerateModal(true);
          }}
          className="px-4 py-2.5 bg-[#002147] hover:bg-[#001833] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Generate New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search invoice # or school name..."
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
            <option value="all">All Invoices</option>
            <option value="pending">Pending Only</option>
            <option value="paid">Paid Only</option>
            <option value="overdue">Overdue Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading billing invoices...</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No invoices found matching your query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">School & Plan</th>
                  <th className="p-4">Billing Period</th>
                  <th className="p-4">Amount Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-[#002147] font-mono">
                      {inv.invoiceNumber}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{inv.schoolName}</div>
                      <div className="text-slate-500 text-[11px]">Plan: {inv.planName}</div>
                    </td>

                    <td className="p-4 font-medium text-slate-700">
                      {inv.billingPeriod}
                    </td>

                    <td className="p-4">
                      <div className="font-black text-[#002147]">
                        {inv.currency || 'GHS'} {inv.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        (Tax: {inv.currency || 'GHS'} {inv.taxAmount || 0})
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(inv.status)}
                    </td>

                    <td className="p-4 font-semibold text-slate-700">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        title="Download PDF"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleEmailInvoice(inv)}
                        title="Email Invoice"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg cursor-pointer transition"
                      >
                        <Mail className="w-4 h-4" />
                      </button>

                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button
                          onClick={() => handleMarkAsPaid(inv)}
                          title="Mark as Paid"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition"
                        >
                          Mark Paid
                        </button>
                      )}

                      {inv.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelInvoice(inv)}
                          title="Cancel Invoice"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer transition"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERATE INVOICE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-[#002147]">
                Generate Commercial Billing Invoice
              </h3>
              <button 
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select School *</label>
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="">-- Choose School Account --</option>
                  {subscriptions.map((s) => (
                    <option key={s.id} value={s.schoolId}>
                      {s.schoolName} ({s.planName} - {s.currency || 'GHS'} {s.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Period</label>
                <input
                  type="text"
                  required
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="e.g. Aug 2026 - Sep 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
