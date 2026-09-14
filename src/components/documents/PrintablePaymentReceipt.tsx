import React from 'react';
import { 
  Printer, 
  X, 
  Download, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Share2, 
  FileText,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';
import { SchoolDocumentSettings, DEFAULT_DOCUMENT_SETTINGS } from '../../types/documentCustomization';
import { numberToWords } from '../../utils/numberToWords';

export interface PaymentReceiptData {
  id?: string;
  receiptNumber: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  classId?: string;
  className: string;
  feeType: string;
  amountDue?: number;
  amountPaid: number;
  previousBalance?: number;
  balance?: number;
  paymentMethod: string;
  transactionRef?: string;
  datePaid: string;
  receivedBy?: string;
  notes?: string;
  status?: string;
  academicYear?: string;
  term?: string;
}

interface PrintablePaymentReceiptProps {
  receipt: PaymentReceiptData;
  settings?: SchoolDocumentSettings;
  onClose?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrintablePaymentReceipt: React.FC<PrintablePaymentReceiptProps> = ({
  receipt,
  settings = DEFAULT_DOCUMENT_SETTINGS,
  onClose,
  showToast
}) => {
  const primaryColor = settings.primaryColor || '#002147';
  const accentColor = settings.accentColor || '#D4AF37';
  const currency = settings.currencySymbol || 'GHS';

  const amountInWords = numberToWords(
    receipt.amountPaid, 
    currency === 'GHS' ? 'Ghana Cedis' : currency === '$' ? 'US Dollars' : `${currency} Units`,
    currency === 'GHS' ? 'Pesewas' : 'Cents'
  );

  const prevBalance = receipt.previousBalance ?? ((receipt.amountDue || receipt.amountPaid) + (receipt.balance || 0) - receipt.amountPaid);
  const remainingBalance = receipt.balance ?? Math.max(0, (receipt.amountDue || receipt.amountPaid) - receipt.amountPaid);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReceiptNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(receipt.receiptNumber);
      showToast?.(`Receipt number ${receipt.receiptNumber} copied!`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-modal, #printable-receipt-modal * {
            visibility: visible;
          }
          #printable-receipt-modal {
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
          .print-full-page {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div 
        id="printable-receipt-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Top Action Bar (hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Official Payment Receipt • {receipt.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReceiptNumber}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
              title="Copy Receipt #"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy #</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Receipt</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 sm:p-10 overflow-y-auto print-full-page bg-white text-slate-900 space-y-6">
          {/* RECEIPT HEADER */}
          <div className="border-b-2 pb-6 border-slate-200" style={{ borderBottomColor: primaryColor }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={settings.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl}
                  alt={settings.schoolName}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-xs"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 
                    className="text-xl sm:text-2xl font-black tracking-tight uppercase"
                    style={{ color: primaryColor }}
                  >
                    {settings.schoolName}
                  </h1>
                  {settings.tagline && (
                    <p className="text-xs font-bold tracking-wide italic" style={{ color: accentColor }}>
                      "{settings.tagline}"
                    </p>
                  )}
                  <div className="text-[11px] text-slate-500 font-medium space-y-0.5 mt-1">
                    <p>{settings.address}</p>
                    <p>Tel: {settings.phone} • Email: {settings.email}</p>
                    {settings.website && <p>Web: {settings.website}</p>}
                  </div>
                </div>
              </div>

              {/* Receipt Badge and Metadata */}
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div 
                  className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Official Payment Receipt
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs font-mono font-black text-slate-900">
                    No: <span className="font-mono" style={{ color: primaryColor }}>{receipt.receiptNumber}</span>
                  </p>
                  <p className="text-xs text-slate-600 font-bold">
                    Date: <span className="text-slate-800">{receipt.datePaid}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Term: <span className="font-bold text-slate-800">{receipt.term || settings.academicTerm || 'Term 1'}</span> ({receipt.academicYear || settings.academicYear || '2026'})
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {receipt.status || 'Verified & Cleared'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STUDENT & PAYER DETAILS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                Student Details
              </span>
              <p className="text-base font-black text-slate-900">{receipt.studentName}</p>
              <p className="text-slate-600 font-semibold">
                Student ID: <span className="font-mono font-black text-slate-900">{receipt.studentId}</span>
              </p>
              <p className="text-slate-600 font-semibold">
                Class / Form: <span className="font-bold text-slate-900">{receipt.className}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                Payer & Payment Mode
              </span>
              <p className="text-slate-900 font-bold">
                Payer: <span className="font-extrabold">{receipt.parentName || 'Self / Registered Guardian'}</span>
              </p>
              <p className="text-slate-700 font-semibold">
                Payment Channel: <span className="font-black text-slate-900">{receipt.paymentMethod}</span>
              </p>
              <p className="text-slate-700 font-semibold">
                Transaction / Ref: <span className="font-mono font-bold text-slate-900">{receipt.transactionRef || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* ITEMIZED PAYMENT BREAKDOWN TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                  <th className="p-3 uppercase font-black text-[11px] tracking-wider">Fee Description</th>
                  <th className="p-3 uppercase font-black text-[11px] tracking-wider text-right">Amount Invoiced</th>
                  <th className="p-3 uppercase font-black text-[11px] tracking-wider text-right">Amount Paid</th>
                  {settings.showPreviousBalance && (
                    <th className="p-3 uppercase font-black text-[11px] tracking-wider text-right">Remaining Balance</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-black text-slate-900">
                    {receipt.feeType}
                    {receipt.notes && (
                      <span className="block text-[10px] text-slate-500 font-normal italic mt-0.5">
                        Note: {receipt.notes}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-700">
                    {currency} {(receipt.amountDue ?? receipt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right font-black text-emerald-700 text-sm">
                    {currency} {receipt.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {settings.showPreviousBalance && (
                    <td className="p-3.5 text-right font-black text-slate-800">
                      {remainingBalance <= 0 ? (
                        <span className="text-emerald-600 font-bold">NIL (Fully Paid)</span>
                      ) : (
                        <span className="text-amber-700">
                          {currency} {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* AMOUNT IN WORDS & TOTAL HIGHLIGHT BOX */}
          <div 
            className="p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="space-y-1">
              {settings.showAmountInWords && (
                <>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                    Amount Received in Words:
                  </span>
                  <p className="text-xs sm:text-sm font-bold capitalize text-slate-100 italic">
                    "{amountInWords}"
                  </p>
                </>
              )}
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Amount Paid</span>
              <span className="text-2xl sm:text-3xl font-black" style={{ color: accentColor }}>
                {currency} {receipt.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SIGNATURES & STAMP AREA */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
            <div className="space-y-4">
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                Received By: <span className="font-black text-slate-900">{receipt.receivedBy || settings.cashierTitle}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Authorized Signature & Date
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              {settings.showOfficialStamp ? (
                <div 
                  className="w-24 h-24 border-2 border-dashed rounded-full flex flex-col items-center justify-center text-center p-1.5 bg-slate-50 shadow-inner"
                  style={{ borderColor: primaryColor }}
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mb-0.5" />
                  <span className="text-[8px] font-black uppercase leading-tight" style={{ color: primaryColor }}>
                    {settings.schoolName?.slice(0, 18)}
                  </span>
                  <span className="text-[7px] font-bold text-slate-600 mt-0.5">OFFICIAL SEAL</span>
                  <span className="text-[6px] text-emerald-700 font-black">VERIFIED</span>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium text-right">
                    Official Approval
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-right">
                    Finance Controller
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER NOTICE */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-medium space-y-0.5">
            <p>{settings.footerText || DEFAULT_DOCUMENT_SETTINGS.footerText}</p>
            <p className="text-[9px] text-slate-400 font-mono">
              Generated securely on {new Date().toLocaleDateString()} • Reference: {receipt.receiptNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
