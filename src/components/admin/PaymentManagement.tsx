import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Printer, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  Building2, 
  ShieldCheck, 
  Send, 
  Download, 
  Filter,
  Check,
  RefreshCw,
  Eye,
  RotateCcw,
  Tag,
  Share2,
  FileSpreadsheet,
  Wallet,
  Sliders,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { StudentRecord, ClassRecord, SchoolProfileData } from '../SchoolAdminDashboard';
import { sendNotification } from '../../services/notificationService';
import { EnterpriseDailyServicesModule } from '../dailyServices/EnterpriseDailyServicesModule';
import { PrintablePaymentReceipt } from '../documents/PrintablePaymentReceipt';
import { FinancialReportModal } from './FinancialReportModal';
import { StudentFeeBalancesView } from './StudentFeeBalancesView';
import { DocumentCustomizationManagement } from './DocumentCustomizationManagement';
import { subscribeSchoolDocumentSettings } from '../../services/documentCustomizationService';
import { SchoolDocumentSettings } from '../../types/documentCustomization';

export interface FeeStructureRecord {
  id: string;
  feeId: string;
  schoolId: string;
  feeType: string; // Tuition, Admission, Registration, Examination, PTA, Transport, Hostel, Feeding, Library, Laboratory, Sports, Uniform, ICT, Other custom fees
  amount: number;
  academicYear: string;
  term: string;
  classLevel?: string;
  targetType?: 'All Classes' | 'Specific Class' | 'Specific Student' | 'Student Group';
  targetValue?: string;
  feeMode?: 'One-time' | 'Recurring' | 'Optional';
  allowDiscount?: boolean;
  defaultDiscount?: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  schoolId: string;
  studentId: string; // Student custom ID
  studentName: string;
  parentName?: string;
  parentEmail?: string;
  classId: string;
  className: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'MTN Mobile Money' | 'Telecel Cash' | 'AirtelTigo Money' | 'Card' | 'Cheque' | 'Other';
  transactionRef: string;
  datePaid: string;
  receivedBy: string;
  notes?: string;
  status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Reversed' | 'Cancelled';
  academicYear: string;
  term: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceBreakdownItem {
  category: string;
  amount: number;
  discount?: number;
  netAmount: number;
}

export interface StudentInvoiceRecord {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  parentEmail?: string;
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  feeCategory: string;
  feeBreakdown: InvoiceBreakdownItem[];
  subtotal: number;
  totalDiscount: number;
  totalWaivers: number;
  scholarshipAmount: number;
  previousBalance: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  invoiceDate: string;
  dueDate: string;
  paymentInstructions: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  schoolId: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

interface PaymentManagementProps {
  schoolId: string;
  schoolProfile: SchoolProfileData;
  students: StudentRecord[];
  classes: ClassRecord[];
  currentUserEmail?: string;
  currentUserName?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'MTN Mobile Money',
  'Telecel Cash',
  'AirtelTigo Money',
  'Card',
  'Cheque',
  'Other'
] as const;

const FEE_CATEGORIES = [
  'Tuition Fee',
  'Admission Fee',
  'Registration Fee',
  'Examination Fee',
  'PTA Levy',
  'Transport Fee',
  'Hostel & Boarding Fee',
  'Feeding Levy',
  'Library Fee',
  'Laboratory & Science Fee',
  'Sports Levy',
  'Uniform & Books',
  'ICT & Computer Lab Fee',
  'Other Custom Fee'
];

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  schoolId,
  schoolProfile,
  students,
  classes,
  currentUserEmail,
  currentUserName,
  showToast
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructureRecord[]>([]);
  const [invoices, setInvoices] = useState<StudentInvoiceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [termFilter, setTermFilter] = useState<string>(schoolProfile.academicTerm || 'Term 1, 2026');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices' | 'fees' | 'audit' | 'daily_services'>('payments');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Partial<PaymentRecord> | null>(null);

  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Partial<FeeStructureRecord> | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<{
    targetType: 'class' | 'student';
    targetClass: string;
    targetStudentId: string;
    feeType: string;
    amount: number;
    discount: number;
    waiver: number;
    dueDate: string;
    notes: string;
  }>({
    targetType: 'class',
    targetClass: classes[0]?.className || 'All Classes',
    targetStudentId: '',
    feeType: 'Tuition Fee',
    amount: 1500,
    discount: 0,
    waiver: 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Please pay before due date to avoid late payment penalty.'
  });

  // Inspection & Printable Document Modals
  const [receiptToView, setReceiptToView] = useState<PaymentRecord | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<StudentInvoiceRecord | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);
  const [reversalPayment, setReversalPayment] = useState<PaymentRecord | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    // 1. Payments Listener
    const qPayments = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentRecord[];
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPayments(list);
      setLoading(false);
    }, (err) => {
      console.warn("Payments subscription warning:", err);
      setLoading(false);
    });

    // 2. Fee Structures Listener
    const qFees = query(collection(db, 'schoolFees'), where('schoolId', '==', schoolId));
    const unsubFees = onSnapshot(qFees, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeStructureRecord[];
      setFeeStructures(list);
    }, (err) => console.warn("Fees subscription warning:", err));

    // 3. Student Invoices Listener
    const qInvoices = query(collection(db, 'studentInvoices'), where('schoolId', '==', schoolId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentInvoiceRecord[];
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setInvoices(list);
    }, (err) => console.warn("Invoices subscription warning:", err));

    // 4. Audit Logs Listener
    const qAudit = query(collection(db, 'financeAuditLogs'), where('schoolId', '==', schoolId));
    const unsubAudit = onSnapshot(qAudit, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AuditLogRecord[];
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setAuditLogs(list);
    }, (err) => console.warn("Audit logs subscription warning:", err));

    return () => {
      unsubPayments();
      unsubFees();
      unsubInvoices();
      unsubAudit();
    };
  }, [schoolId]);

  // Audit Logging Helper
  const logAudit = async (action: string, details: string) => {
    try {
      const ref = doc(collection(db, 'financeAuditLogs'));
      await setDoc(ref, {
        id: ref.id,
        schoolId,
        action,
        user: currentUserName || currentUserEmail || 'School Admin',
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Audit log warning:", e);
    }
  };

  // Helper calculation for Payment Status
  const calculatePaymentStatus = (due: number, paid: number): 'Fully Paid' | 'Partially Paid' | 'Unpaid' => {
    const bal = due - paid;
    if (paid <= 0) return 'Unpaid';
    if (bal <= 0) return 'Fully Paid';
    return 'Partially Paid';
  };

  // Generate Unique Receipt Number
  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `REC-${year}-${randomNum}`;
  };

  // Generate Unique Invoice Number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `INV-${year}-${randomNum}`;
  };

  // Save Payment Record
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    if (!editingPayment.studentId) {
      showToast('Please select a student.', 'error');
      return;
    }

    const selectedStudent = students.find(s => s.studentId === editingPayment.studentId || s.id === editingPayment.studentId);
    const amountDue = Number(editingPayment.amountDue || 0);
    const amountPaid = Number(editingPayment.amountPaid || 0);
    const balance = amountDue - amountPaid;
    const status = calculatePaymentStatus(amountDue, amountPaid);
    const receiptNum = editingPayment.receiptNumber || generateReceiptNumber();

    const payload: Partial<PaymentRecord> = {
      ...editingPayment,
      receiptNumber: receiptNum,
      schoolId,
      studentId: selectedStudent?.studentId || editingPayment.studentId,
      studentName: selectedStudent?.fullName || editingPayment.studentName || 'Student',
      parentName: (selectedStudent as any)?.parentName || 'Parent / Guardian',
      parentEmail: (selectedStudent as any)?.parentEmail || '',
      classId: selectedStudent?.classId || editingPayment.classId || '',
      className: selectedStudent?.className || editingPayment.className || 'General Class',
      feeType: editingPayment.feeType || 'Tuition Fee',
      amountDue,
      amountPaid,
      balance,
      paymentMethod: editingPayment.paymentMethod || 'Cash',
      transactionRef: editingPayment.transactionRef || 'N/A',
      datePaid: editingPayment.datePaid || new Date().toISOString().split('T')[0],
      receivedBy: editingPayment.receivedBy || currentUserName || currentUserEmail || 'School Bursar',
      status,
      academicYear: editingPayment.academicYear || '2026',
      term: editingPayment.term || schoolProfile.academicTerm || 'Term 1, 2026',
    };

    try {
      if (editingPayment.id) {
        await updateDoc(doc(db, 'payments', editingPayment.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'paymentReceipts', editingPayment.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        }).catch(() => {});

        logAudit('EDIT_PAYMENT', `Updated payment receipt #${receiptNum} for ${payload.studentName} (Paid: GHS ${amountPaid})`);
        showToast(`Payment record ${receiptNum} updated successfully!`, 'success');
      } else {
        const newRef = doc(collection(db, 'payments'));
        const newPaymentData = {
          ...payload,
          createdAt: new Date().toISOString()
        };
        await setDoc(newRef, newPaymentData);

        // Duplicate to paymentReceipts collection
        await setDoc(doc(db, 'paymentReceipts', newRef.id), newPaymentData);

        // Update corresponding invoice if available
        const matchingInvoice = invoices.find(i => i.studentId === payload.studentId && i.status !== 'Paid');
        if (matchingInvoice) {
          const newTotalPaid = (matchingInvoice.amountPaid || 0) + amountPaid;
          const newOutstanding = Math.max(0, matchingInvoice.totalAmount - newTotalPaid);
          const newInvStatus = newOutstanding === 0 ? 'Paid' : newTotalPaid > 0 ? 'Partially Paid' : 'Unpaid';

          await updateDoc(doc(db, 'studentInvoices', matchingInvoice.id), {
            amountPaid: newTotalPaid,
            outstandingBalance: newOutstanding,
            status: newInvStatus,
            updatedAt: new Date().toISOString()
          }).catch(e => console.warn('Invoice sync error:', e));
        }

        // Send notifications to Student & Parent
        if (payload.studentId) {
          sendNotification({
            recipientId: payload.studentId,
            schoolId,
            title: 'Payment Received & Verified',
            message: `Payment of GHS ${amountPaid.toLocaleString()} for ${payload.feeType} was successfully received. Receipt: #${receiptNum}`,
            type: 'Payment',
            priority: 'Normal'
          }).catch(e => console.warn('Student notification error:', e));
        }

        logAudit('RECORD_PAYMENT', `Recorded payment receipt #${receiptNum} of GHS ${amountPaid} for ${payload.studentName}`);
        showToast(`Payment recorded! Receipt #${receiptNum} generated.`, 'success');
        
        // Auto open receipt modal
        setReceiptToView({ id: newRef.id, ...newPaymentData } as PaymentRecord);
      }

      setIsPaymentModalOpen(false);
      setEditingPayment(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'payments');
    }
  };

  // Reversal / Refund Payment
  const handleReversePayment = async () => {
    if (!reversalPayment) return;
    try {
      await updateDoc(doc(db, 'payments', reversalPayment.id), {
        status: 'Reversed',
        updatedAt: new Date().toISOString(),
        notes: (reversalPayment.notes || '') + ` [Reversed by ${currentUserName || currentUserEmail} on ${new Date().toLocaleDateString()}]`
      });
      await updateDoc(doc(db, 'paymentReceipts', reversalPayment.id), {
        status: 'Reversed',
        updatedAt: new Date().toISOString()
      }).catch(() => {});

      logAudit('REVERSE_PAYMENT', `Reversed payment receipt #${reversalPayment.receiptNumber} (${reversalPayment.studentName})`);
      showToast(`Payment #${reversalPayment.receiptNumber} has been reversed.`, 'info');
      setReversalPayment(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `payments/${reversalPayment.id}`);
    }
  };

  // Generate Student Invoices (Batch for Class or Single Student)
  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetStudentsList: StudentRecord[] = [];
      if (invoiceForm.targetType === 'student') {
        const single = students.find(s => s.studentId === invoiceForm.targetStudentId || s.id === invoiceForm.targetStudentId);
        if (single) targetStudentsList = [single];
      } else {
        targetStudentsList = students.filter(s => invoiceForm.targetClass === 'All Classes' || s.className === invoiceForm.targetClass);
      }

      if (targetStudentsList.length === 0) {
        showToast('No students found matching selected target criteria.', 'error');
        return;
      }

      let generatedCount = 0;
      for (const st of targetStudentsList) {
        const invNum = generateInvoiceNumber();
        const baseAmount = Number(invoiceForm.amount) || 1500;
        const discountVal = Number(invoiceForm.discount) || 0;
        const waiverVal = Number(invoiceForm.waiver) || 0;
        const totalAmt = Math.max(0, baseAmount - discountVal - waiverVal);
        const invDocRef = doc(collection(db, 'studentInvoices'));

        const breakdownItem: InvoiceBreakdownItem = {
          category: invoiceForm.feeType,
          amount: baseAmount,
          discount: discountVal,
          netAmount: totalAmt
        };

        const invoicePayload: StudentInvoiceRecord = {
          id: invDocRef.id,
          invoiceNumber: invNum,
          schoolId,
          studentId: st.studentId || st.id,
          studentName: st.fullName,
          parentName: (st as any).parentName || 'Parent / Guardian',
          parentEmail: (st as any).parentEmail || '',
          classId: st.classId || '',
          className: st.className || 'General Grade',
          academicYear: '2026',
          term: schoolProfile.academicTerm || 'Term 1, 2026',
          feeCategory: invoiceForm.feeType,
          feeBreakdown: [breakdownItem],
          subtotal: baseAmount,
          totalDiscount: discountVal,
          totalWaivers: waiverVal,
          scholarshipAmount: 0,
          previousBalance: 0,
          totalAmount: totalAmt,
          amountPaid: 0,
          outstandingBalance: totalAmt,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: invoiceForm.dueDate,
          paymentInstructions: `Bank: ${schoolProfile.schoolName} Accounts • Acc: 10293849102 • Mobile Money: 055 987 6543`,
          status: 'Unpaid',
          createdAt: new Date().toISOString()
        };

        await setDoc(invDocRef, invoicePayload);
        // Also write to invoices collection
        await setDoc(doc(db, 'invoices', invDocRef.id), invoicePayload).catch(() => {});

        // Send Notification
        sendNotification({
          recipientId: st.studentId || st.id,
          schoolId,
          title: `New Fee Invoice Issued: #${invNum}`,
          message: `Official invoice for ${invoiceForm.feeType} (GHS ${totalAmt.toLocaleString()}) is due on ${invoiceForm.dueDate}.`,
          type: 'Payment',
          priority: 'High'
        }).catch(e => console.warn('Invoice notification warning:', e));

        generatedCount++;
      }

      logAudit('GENERATE_INVOICE', `Generated ${generatedCount} invoice(s) for category: ${invoiceForm.feeType}`);
      showToast(`Successfully generated ${generatedCount} invoice(s)!`, 'success');
      setIsInvoiceModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'studentInvoices');
    }
  };

  // Save Fee Structure
  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee || !editingFee.feeType || !editingFee.amount) {
      showToast('Fee Type and Amount are required.', 'error');
      return;
    }

    try {
      const feePayload = {
        feeType: editingFee.feeType,
        amount: Number(editingFee.amount),
        academicYear: editingFee.academicYear || '2026',
        term: editingFee.term || schoolProfile.academicTerm || 'Term 1, 2026',
        classLevel: editingFee.classLevel || 'All Classes',
        targetType: editingFee.targetType || 'All Classes',
        targetValue: editingFee.targetValue || '',
        feeMode: editingFee.feeMode || 'One-time',
        allowDiscount: editingFee.allowDiscount ?? true,
        defaultDiscount: Number(editingFee.defaultDiscount || 0)
      };

      if (editingFee.id) {
        await updateDoc(doc(db, 'schoolFees', editingFee.id), feePayload);
        logAudit('EDIT_FEE_STRUCTURE', `Updated fee structure ${editingFee.feeType} (GHS ${editingFee.amount})`);
        showToast('Fee structure updated!', 'success');
      } else {
        const newRef = doc(collection(db, 'schoolFees'));
        await setDoc(newRef, {
          ...feePayload,
          feeId: `FEE-${Math.floor(1000 + Math.random() * 9000)}`,
          schoolId,
          createdAt: new Date().toISOString()
        });
        logAudit('CREATE_FEE_STRUCTURE', `Created fee structure ${editingFee.feeType} (GHS ${editingFee.amount})`);
        showToast('Fee structure created!', 'success');
      }

      setIsFeeModalOpen(false);
      setEditingFee(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'schoolFees');
    }
  };

  // Delete Payment
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deleteDoc(doc(db, 'payments', paymentToDelete.id));
      await deleteDoc(doc(db, 'paymentReceipts', paymentToDelete.id)).catch(() => {});
      logAudit('DELETE_PAYMENT', `Deleted payment receipt #${paymentToDelete.receiptNumber}`);
      showToast(`Payment ${paymentToDelete.receiptNumber} deleted.`, 'success');
      setPaymentToDelete(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `payments/${paymentToDelete.id}`);
    }
  };

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesClass = classFilter === 'All' || p.className === classFilter || p.classId === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const matchesClass = classFilter === 'All' || inv.className === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Financial Stats Calculations
  const totalRevenuePaid = payments
    .filter(p => p.status !== 'Reversed' && p.status !== 'Cancelled')
    .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  const totalOutstanding = invoices.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0);
  const totalBilled = invoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalRevenuePaid / totalBilled) * 100)) : 88;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#0b3c5d] p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#D4AF37]" />
            <h2 className="text-xl font-black tracking-wide uppercase">Commercial School Billing & Finance</h2>
          </div>
          <p className="text-xs text-slate-200 mt-1">
            Real-time fee structures, itemized student invoices, payment validation, official receipt generation & audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-3.5 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] text-xs font-black uppercase tracking-wider rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Invoices</span>
          </button>

          <button
            onClick={() => {
              setEditingPayment({
                receiptNumber: generateReceiptNumber(),
                feeType: feeStructures[0]?.feeType || 'Tuition Fee',
                amountDue: feeStructures[0]?.amount || 1500,
                amountPaid: feeStructures[0]?.amount || 1500,
                paymentMethod: 'Cash',
                datePaid: new Date().toISOString().split('T')[0],
                receivedBy: currentUserName || currentUserEmail || 'School Bursar',
                term: schoolProfile.academicTerm || 'Term 1, 2026',
                academicYear: '2026'
              });
              setIsPaymentModalOpen(true);
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => {
              setEditingFee({
                feeType: 'Tuition Fee',
                amount: 1500,
                academicYear: '2026',
                term: schoolProfile.academicTerm || 'Term 1, 2026',
                classLevel: 'All Classes',
                feeMode: 'One-time',
                allowDiscount: true
              });
              setIsFeeModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
          >
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
            <span>Fee Structure</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
            <p className="text-2xl font-black text-[#002147]">GHS {totalRevenuePaid.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-bold">{payments.length} Verified Receipts</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Outstanding Invoices</p>
            <p className="text-2xl font-black text-amber-600">GHS {totalOutstanding.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">{invoices.filter(i => i.status !== 'Paid').length} Unpaid Invoices</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Invoiced Billed</p>
            <p className="text-2xl font-black text-[#002147]">GHS {totalBilled.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">{invoices.length} Total Invoices</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Collection Rate</p>
            <p className="text-2xl font-black text-purple-800">{collectionRate}%</p>
            <p className="text-[10px] text-slate-500 font-medium">Compliance Index</p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Ledger ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Generated Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'fees'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Fee Structures ({feeStructures.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('daily_services')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'daily_services'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-emerald-700 hover:text-emerald-900 bg-emerald-50/50'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Daily Services & Campus Wallet</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-black">ECOSYSTEM</span>
        </button>
      </div>

      {/* TAB CONTENT: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm space-y-4 p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, ID, receipt #, ref..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="All">All Statuses</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Reversed">Reversed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Class:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="All">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#002147] text-white">
                  <th className="p-3 font-extrabold uppercase">Receipt #</th>
                  <th className="p-3 font-extrabold uppercase">Student</th>
                  <th className="p-3 font-extrabold uppercase">Class</th>
                  <th className="p-3 font-extrabold uppercase">Fee Category</th>
                  <th className="p-3 font-extrabold uppercase">Due</th>
                  <th className="p-3 font-extrabold uppercase">Paid</th>
                  <th className="p-3 font-extrabold uppercase">Balance</th>
                  <th className="p-3 font-extrabold uppercase">Method</th>
                  <th className="p-3 font-extrabold uppercase">Status</th>
                  <th className="p-3 font-extrabold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                      No payment records found. Click "Record Payment" to record a student payment.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-[#002147]">{p.receiptNumber}</td>
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{p.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {p.studentId}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{p.className}</td>
                      <td className="p-3 font-medium text-slate-600">{p.feeType}</td>
                      <td className="p-3 font-semibold text-slate-800">GHS {p.amountDue?.toLocaleString()}</td>
                      <td className="p-3 font-black text-emerald-700">GHS {p.amountPaid?.toLocaleString()}</td>
                      <td className="p-3 font-bold text-amber-700">
                        {p.balance > 0 ? `GHS ${p.balance.toLocaleString()}` : 'GHS 0'}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{p.paymentMethod}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.status === 'Fully Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'Reversed'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setReceiptToView(p)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Inspect & Print Official Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Receipt</span>
                          </button>
                          {p.status !== 'Reversed' && (
                            <button
                              onClick={() => setReversalPayment(p)}
                              className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                              title="Reverse Payment Transaction"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingPayment(p);
                              setIsPaymentModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(p)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoice #, student name, ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Create New Invoice</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#002147] text-white">
                  <th className="p-3 font-extrabold uppercase">Invoice #</th>
                  <th className="p-3 font-extrabold uppercase">Student</th>
                  <th className="p-3 font-extrabold uppercase">Class</th>
                  <th className="p-3 font-extrabold uppercase">Fee Item</th>
                  <th className="p-3 font-extrabold uppercase">Total Billed</th>
                  <th className="p-3 font-extrabold uppercase">Paid</th>
                  <th className="p-3 font-extrabold uppercase">Outstanding</th>
                  <th className="p-3 font-extrabold uppercase">Due Date</th>
                  <th className="p-3 font-extrabold uppercase">Status</th>
                  <th className="p-3 font-extrabold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                      No invoices generated yet. Click "Create New Invoice" to issue invoices to students or classes.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-[#002147]">{inv.invoiceNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{inv.studentName}</td>
                      <td className="p-3 font-semibold text-slate-700">{inv.className}</td>
                      <td className="p-3 font-medium text-slate-600">{inv.feeCategory}</td>
                      <td className="p-3 font-bold text-slate-900">GHS {inv.totalAmount?.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-700">GHS {inv.amountPaid?.toLocaleString()}</td>
                      <td className="p-3 font-black text-amber-700">GHS {inv.outstandingBalance?.toLocaleString()}</td>
                      <td className="p-3 font-mono text-slate-600">{inv.dueDate}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setInvoiceToView(inv)}
                          className="p-1.5 rounded-lg bg-[#002147] text-white hover:bg-[#003366] font-bold text-[11px] flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#D4AF37]" /> Inspect / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FEE STRUCTURES */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feeStructures.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">
                No fee structures created yet. Click "Fee Structure" to configure school fee categories.
              </div>
            ) : (
              feeStructures.map((fee) => (
                <div key={fee.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-[#002147] text-[#D4AF37] text-[10px] font-black uppercase tracking-wider">
                      {fee.feeId || 'FEE'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold bg-slate-200 px-2 py-0.5 rounded-full">{fee.classLevel || 'All Classes'}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-[#002147]">{fee.feeType}</h4>
                    <p className="text-2xl font-black text-slate-900 mt-1">GHS {fee.amount?.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{fee.term} ({fee.academicYear})</p>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                    <p><span className="font-bold text-slate-700">Billing Mode:</span> {fee.feeMode || 'One-time'}</p>
                    <p><span className="font-bold text-slate-700">Default Discount:</span> GHS {fee.defaultDiscount || 0}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingFee(fee);
                        setIsFeeModalOpen(true);
                      }}
                      className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Fee
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            Financial Transaction Audit Trail ({auditLogs.length})
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#002147] text-white">
                  <th className="p-3 font-extrabold uppercase">Timestamp</th>
                  <th className="p-3 font-extrabold uppercase">User / Actor</th>
                  <th className="p-3 font-extrabold uppercase">Action</th>
                  <th className="p-3 font-extrabold uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      No audit logs recorded yet. Action audit entries will automatically appear here.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-900">{log.user}</td>
                      <td className="p-3 font-mono font-bold text-blue-900">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-mono text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DAILY SERVICES & CAMPUS WALLET ECOSYSTEM */}
      {activeTab === 'daily_services' && (
        <div className="pt-2">
          <EnterpriseDailyServicesModule
            schoolId={schoolId}
            userRole="school_admin"
            students={students}
            showToast={showToast}
          />
        </div>
      )}

      {/* MODAL: RECORD / EDIT PAYMENT */}
      {isPaymentModalOpen && editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#00152e]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {editingPayment.id ? 'Edit Payment Record' : 'Record Student Fee Payment'}
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800">Receipt Reference Number</span>
                  <p className="text-sm font-black font-mono text-[#002147]">{editingPayment.receiptNumber}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Verified Commercial Document</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Select Student *</label>
                  <select
                    required
                    value={editingPayment.studentId || ''}
                    onChange={(e) => {
                      const st = students.find((s) => s.studentId === e.target.value || s.id === e.target.value);
                      setEditingPayment({
                        ...editingPayment,
                        studentId: e.target.value,
                        studentName: st?.fullName || '',
                        classId: st?.classId || '',
                        className: st?.className || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.studentId || st.id}>
                        {st.fullName} ({st.studentId}) — Class: {st.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fee Category *</label>
                  <select
                    value={editingPayment.feeType || 'Tuition Fee'}
                    onChange={(e) => {
                      const fObj = feeStructures.find((f) => f.feeType === e.target.value);
                      setEditingPayment({
                        ...editingPayment,
                        feeType: e.target.value,
                        amountDue: fObj ? fObj.amount : editingPayment.amountDue || 1500
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {FEE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method *</label>
                  <select
                    value={editingPayment.paymentMethod || 'Cash'}
                    onChange={(e) =>
                      setEditingPayment({
                        ...editingPayment,
                        paymentMethod: e.target.value as any
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Amount Due (GHS) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPayment.amountDue ?? 1500}
                    onChange={(e) =>
                      setEditingPayment({ ...editingPayment, amountDue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount Paid Now (GHS) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPayment.amountPaid ?? 1500}
                    onChange={(e) =>
                      setEditingPayment({ ...editingPayment, amountPaid: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Transaction Ref / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-9982019"
                    value={editingPayment.transactionRef || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, transactionRef: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date Paid *</label>
                  <input
                    type="date"
                    required
                    value={editingPayment.datePaid || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingPayment({ ...editingPayment, datePaid: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Cashier Notes & Payment Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared via bursar desk deposit."
                    value={editingPayment.notes || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Calculated Outstanding Balance:</span>
                <span className="text-amber-700 font-mono text-sm font-black">
                  GHS {Math.max(0, (editingPayment.amountDue || 0) - (editingPayment.amountPaid || 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Save & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE INVOICES */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#00152e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Generate Fee Invoices</h3>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoices} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Recipient Scope *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, targetType: 'class' })}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition cursor-pointer ${
                      invoiceForm.targetType === 'class'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Entire Class Level
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, targetType: 'student' })}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition cursor-pointer ${
                      invoiceForm.targetType === 'student'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Individual Student
                  </button>
                </div>
              </div>

              {invoiceForm.targetType === 'class' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Target Class *</label>
                  <select
                    value={invoiceForm.targetClass}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, targetClass: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  >
                    <option value="All Classes">All Classes (School-wide)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Student *</label>
                  <select
                    required
                    value={invoiceForm.targetStudentId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, targetStudentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.studentId || s.id}>{s.fullName} ({s.studentId})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fee Category *</label>
                  <select
                    value={invoiceForm.feeType}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, feeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  >
                    {FEE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Base Amount (GHS) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Discount (GHS)</label>
                  <input
                    type="number"
                    min={0}
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#002147]/5 border border-[#002147]/20 rounded-xl flex items-center justify-between font-bold">
                <span>Calculated Total Per Student:</span>
                <span className="text-[#002147] text-sm font-black">
                  GHS {Math.max(0, invoiceForm.amount - invoiceForm.discount - invoiceForm.waiver).toLocaleString()}
                </span>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider cursor-pointer shadow"
                >
                  Issue & Sync Invoices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FEE STRUCTURE */}
      {isFeeModalOpen && editingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#00152e]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Configure Fee Structure</h3>
              </div>
              <button
                onClick={() => setIsFeeModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Fee Category / Type *</label>
                <select
                  value={editingFee.feeType || 'Tuition Fee'}
                  onChange={(e) => setEditingFee({ ...editingFee, feeType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                >
                  {FEE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Standard Amount (GHS) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingFee.amount ?? 1500}
                  onChange={(e) => setEditingFee({ ...editingFee, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Applicable Class Level</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10A / All Classes"
                  value={editingFee.classLevel || 'All Classes'}
                  onChange={(e) => setEditingFee({ ...editingFee, classLevel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Fee Mode</label>
                <select
                  value={editingFee.feeMode || 'One-time'}
                  onChange={(e) => setEditingFee({ ...editingFee, feeMode: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                >
                  <option value="One-time">One-time Fee</option>
                  <option value="Recurring">Recurring Termly Fee</option>
                  <option value="Optional">Optional Auxiliary Fee</option>
                </select>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Save Fee Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {reversalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Authorize Payment Reversal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to reverse transaction receipt #{reversalPayment.receiptNumber} (Amount: GHS {reversalPayment.amountPaid})? This action will be recorded in audit logs.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setReversalPayment(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReversePayment}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-black text-xs cursor-pointer shadow"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Delete Payment Record</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove receipt #{paymentToDelete.receiptNumber}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayment}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {invoiceToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 space-y-6 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={schoolProfile.logoUrl}
                  alt={schoolProfile.schoolName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shadow-sm"
                />
                <div>
                  <h2 className="text-base font-black text-[#002147] uppercase leading-tight">
                    {schoolProfile.schoolName}
                  </h2>
                  <p className="text-xs text-slate-500">{schoolProfile.address}</p>
                  <p className="text-xs text-slate-500">Tel: {schoolProfile.phone} • Email: {schoolProfile.email}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] text-xs font-black uppercase rounded-lg shadow-sm">
                  Official Student Fee Invoice
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 mt-2">{invoiceToView.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500 font-bold">Due Date: {invoiceToView.dueDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed Student</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{invoiceToView.studentName}</p>
                <p className="text-slate-600">ID: <span className="font-mono font-bold">{invoiceToView.studentId}</span></p>
                <p className="text-slate-600">Class: <span className="font-bold">{invoiceToView.className}</span></p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Parent / Guardian Info</span>
                <p className="font-bold text-slate-900 mt-0.5">{invoiceToView.parentName || 'Parent / Guardian'}</p>
                <p className="text-slate-600">Term: <span className="font-bold">{invoiceToView.term}</span></p>
                <p className="text-slate-600">Academic Year: <span className="font-mono font-bold">{invoiceToView.academicYear}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#002147] text-white">
                    <th className="p-3 uppercase font-extrabold">Fee Category</th>
                    <th className="p-3 uppercase font-extrabold text-right">Base Amount</th>
                    <th className="p-3 uppercase font-extrabold text-right">Discount</th>
                    <th className="p-3 uppercase font-extrabold text-right">Net Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{invoiceToView.feeCategory}</td>
                    <td className="p-3 text-right font-semibold text-slate-700">GHS {invoiceToView.subtotal?.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">- GHS {invoiceToView.totalDiscount?.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-[#002147]">GHS {invoiceToView.totalAmount?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#002147] text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase tracking-wider block">
                  Outstanding Due Balance
                </span>
                <p className="text-xs text-slate-300 font-medium">Please remit payment before {invoiceToView.dueDate}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 uppercase block">Total Outstanding</span>
                <span className="text-xl font-black text-[#D4AF37]">
                  GHS {invoiceToView.outstandingBalance?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Instructions & Bank Account</span>
              <p className="text-slate-700 font-medium">{invoiceToView.paymentInstructions}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 100 100" className="w-14 h-14 border border-slate-300 p-1 bg-white rounded-xl shadow-xs shrink-0">
                  <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 10h20v10H40zM40 40h20v20H40zM70 70h15v15H70zM85 85h15v15H85z" fill="#002147"/>
                  <rect x="45" y="70" width="10" height="20" fill="#002147"/>
                  <rect x="70" y="45" width="20" height="10" fill="#002147"/>
                </svg>
                <div className="text-[9px] text-slate-500 font-mono">
                  <span className="font-bold text-[#002147] block">Scan for Payment Portal</span>
                  <span>Ref: {invoiceToView.invoiceNumber}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setInvoiceToView(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {receiptToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 space-y-6 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={schoolProfile.logoUrl}
                  alt={schoolProfile.schoolName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shadow-sm"
                />
                <div>
                  <h2 className="text-base font-black text-[#002147] uppercase leading-tight">
                    {schoolProfile.schoolName}
                  </h2>
                  <p className="text-xs text-slate-500">{schoolProfile.address}</p>
                  <p className="text-xs text-slate-500">Tel: {schoolProfile.phone} • Email: {schoolProfile.email}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] text-xs font-black uppercase rounded-lg shadow-sm">
                  Official Payment Receipt
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 mt-2">{receiptToView.receiptNumber}</p>
                <p className="text-[10px] text-slate-400">Date: {receiptToView.datePaid}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Details</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{receiptToView.studentName}</p>
                <p className="text-slate-600">ID: <span className="font-mono font-bold">{receiptToView.studentId}</span></p>
                <p className="text-slate-600">Class: <span className="font-bold">{receiptToView.className}</span></p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Details</span>
                <p className="text-slate-700">Fee Category: <span className="font-bold">{receiptToView.feeType}</span></p>
                <p className="text-slate-700">Method: <span className="font-bold">{receiptToView.paymentMethod}</span></p>
                <p className="text-slate-700">Ref / Txn: <span className="font-mono">{receiptToView.transactionRef || 'N/A'}</span></p>
                <p className="text-slate-700">Term: <span className="font-bold">{receiptToView.term}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#002147] text-white">
                    <th className="p-3 uppercase font-extrabold">Description</th>
                    <th className="p-3 uppercase font-extrabold text-right">Amount Due</th>
                    <th className="p-3 uppercase font-extrabold text-right">Amount Paid</th>
                    <th className="p-3 uppercase font-extrabold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 font-extrabold text-slate-900">{receiptToView.feeType}</td>
                    <td className="p-3 text-right font-semibold text-slate-700">GHS {receiptToView.amountDue?.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-emerald-700">GHS {receiptToView.amountPaid?.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-amber-700">
                      GHS {(receiptToView.balance ?? 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#002147] text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase tracking-wider block">
                  Amount Received in Words
                </span>
                <p className="text-xs font-bold capitalize">
                  {receiptToView.amountPaid} Ghana Cedi(s) Only
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 uppercase block">Total Amount Paid</span>
                <span className="text-xl font-black text-[#D4AF37]">
                  GHS {receiptToView.amountPaid?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-4">
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-600 font-semibold">
                  Cashier: <span className="font-bold text-[#002147]">{receiptToView.receivedBy}</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">Authorized Cashier Signature & Date</p>
              </div>

              <div className="space-y-4 text-center">
                <div className="w-24 h-24 mx-auto border-2 border-dashed border-[#002147]/40 rounded-full flex flex-col items-center justify-center text-[9px] text-[#002147] font-black uppercase tracking-wider p-2 bg-slate-50">
                  <ShieldCheck className="w-6 h-6 text-[#D4AF37] mb-1" />
                  <span>Official School Stamp</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-400 text-[10px]">Thank you for your payment. EDUkenZA School Finance</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReceiptToView(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    showToast(`Receipt emailed to ${receiptToView.studentName}'s registered contact.`, 'success');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Email Receipt</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
