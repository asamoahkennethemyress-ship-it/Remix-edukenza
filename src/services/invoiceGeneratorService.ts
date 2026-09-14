import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BillingInvoice, SchoolSubscription } from '../types/billing';
import { sendNotification } from './notificationService';

/**
 * Generates and downloads a commercial PDF invoice for EDUkenZA
 */
export function generateInvoicePDF(invoice: BillingInvoice, schoolDetails?: { email?: string; address?: string; phone?: string }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Header Bar
  doc.setFillColor('#002147'); // Navy
  doc.rect(0, 0, pageWidth, 90, 'F');

  doc.setFillColor('#D4AF37'); // Gold Accent Line
  doc.rect(0, 90, pageWidth, 5, 'F');

  // Header Title
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('EDUkenZA SaaS', 35, 45);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Commercial School Management Platform • Billing Invoice', 35, 65);

  // Invoice Number & Status Tag
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE: ${invoice.invoiceNumber}`, pageWidth - 35, 45, { align: 'right' });

  const statusColor = invoice.status === 'paid' ? '#166534' : invoice.status === 'overdue' ? '#991B1B' : '#92400E';
  doc.setFontSize(10);
  doc.setTextColor(statusColor);
  doc.text(`STATUS: ${invoice.status.toUpperCase()}`, pageWidth - 35, 65, { align: 'right' });

  // Bill To / Bill From Info Box
  doc.setTextColor('#1E293B');
  doc.setFontSize(10);

  // Left Column - Billed To
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 35, 125);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.schoolName, 35, 140);
  doc.setFont('helvetica', 'normal');
  doc.text(`Email: ${schoolDetails?.email || 'admin@school.edukenza.com'}`, 35, 155);
  doc.text(`School ID: ${invoice.schoolId}`, 35, 170);

  // Right Column - Invoice Dates
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', pageWidth - 200, 125);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, pageWidth - 200, 140);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - 200, 155);
  doc.text(`Billing Period: ${invoice.billingPeriod}`, pageWidth - 200, 170);

  const currStr = invoice.currency || 'GHS';
  const amtStr = (Number(invoice.amount) || 0).toLocaleString();
  const taxStr = (Number(invoice.taxAmount) || 0).toLocaleString();
  const totStr = (Number(invoice.totalAmount) || 0).toLocaleString();

  // Invoice Table
  const tableData = [
    [
      `EDUkenZA ${invoice.planName} Subscription Plan`,
      `Full access to school management features, student portals & gradebooks (${invoice.billingPeriod})`,
      `${currStr} ${amtStr}`,
      '1',
      `${currStr} ${amtStr}`
    ]
  ];

  if ((Number(invoice.taxAmount) || 0) > 0) {
    tableData.push([
      'SaaS Service Tax / Levy',
      'Applicable regional taxes and payment gateway levy',
      `${currStr} ${taxStr}`,
      '1',
      `${currStr} ${taxStr}`
    ]);
  }

  autoTable(doc, {
    startY: 200,
    head: [['Item Description', 'Details / SLA', 'Unit Price', 'Qty', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: '#002147',
      textColor: '#FFFFFF',
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: '#334155'
    },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 190 },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 80, halign: 'right' }
    },
    margin: { left: 35, right: 35 }
  });

  // Total Summary Block
  const finalY = (doc as any).lastAutoTable.finalY + 20;

  doc.setFillColor('#F8FAFC');
  doc.rect(pageWidth - 230, finalY, 195, 75, 'F');
  doc.setDrawColor('#E2E8F0');
  doc.rect(pageWidth - 230, finalY, 195, 75, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal:`, pageWidth - 220, finalY + 20);
  doc.text(`${currStr} ${amtStr}`, pageWidth - 45, finalY + 20, { align: 'right' });

  doc.text(`Tax / Fees:`, pageWidth - 220, finalY + 38);
  doc.text(`${currStr} ${taxStr}`, pageWidth - 45, finalY + 38, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor('#002147');
  doc.text(`Total Due:`, pageWidth - 220, finalY + 60);
  doc.text(`${currStr} ${totStr}`, pageWidth - 45, finalY + 60, { align: 'right' });

  // Payment Instructions
  doc.setFontSize(9);
  doc.setTextColor('#475569');
  doc.text('Payment Instructions & MoMo Gateway:', 35, finalY + 20);
  doc.setFontSize(8);
  doc.text('1. Mobile Money: Send to MTN MoMo Merchant 055-123-4567 (EDUkenZA SaaS).', 35, finalY + 35);
  doc.text('2. Telecel Cash / AirtelTigo: Pay via Merchant Till ID #987654.', 35, finalY + 48);
  doc.text('3. Bank Transfer: GCB Bank Ltd, Account: 1011122233344 (EDUkenZA Tech Ltd).', 35, finalY + 61);

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor('#94A3B8');
  doc.text('Thank you for choosing EDUkenZA. For billing inquiries, contact billing@edukenza.com.', pageWidth / 2, 790, { align: 'center' });

  doc.save(`EDUkenZA_Invoice_${invoice.invoiceNumber}.pdf`);
}

/**
 * Sends an in-app and email notification for invoice issuance
 */
export async function sendInvoiceEmailNotification(invoice: BillingInvoice, adminUserId?: string): Promise<void> {
  await sendNotification({
    recipientId: adminUserId || `SCHOOL:${invoice.schoolId}`,
    recipientRole: 'school_admin',
    schoolId: invoice.schoolId,
    title: `Invoice Generated: ${invoice.invoiceNumber}`,
    message: `Invoice #${invoice.invoiceNumber} for your ${invoice.planName} subscription (${invoice.currency} ${invoice.totalAmount}) is due on ${new Date(invoice.dueDate).toLocaleDateString()}.`,
    type: 'Payment',
    actionUrl: '/billing'
  });
}
