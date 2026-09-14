import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  SubscriptionPlan, 
  SchoolSubscription, 
  PaymentMethodConfig, 
  BillingInvoice, 
  BillingTransaction, 
  BillingSettings, 
  RevenueAnalytics,
  SubscriptionStatus,
  InvoiceStatus,
  TransactionStatus
} from '../types/billing';
import { logSecurityEvent } from './securityAuditService';

// Default Suggested Plans if Firestore collection is empty
export const DEFAULT_SUBSCRIPTION_PLANS: Omit<SubscriptionPlan, 'id'>[] = [
  {
    name: 'Starter',
    description: 'Essential school management for small private schools and academies.',
    monthlyPrice: 150,
    annualPrice: 1500,
    currency: 'GHS',
    trialDays: 14,
    maxStudents: 150,
    maxTeachers: 10,
    maxParents: 300,
    maxClasses: 10,
    maxStorageGB: 5,
    aiFeaturesEnabled: false,
    customBrandingEnabled: false,
    prioritySupportEnabled: false,
    status: 'active',
    displayOrder: 1,
  },
  {
    name: 'Standard',
    description: 'Complete management suite with SMS alerts and student report cards.',
    monthlyPrice: 350,
    annualPrice: 3500,
    currency: 'GHS',
    trialDays: 14,
    maxStudents: 500,
    maxTeachers: 35,
    maxParents: 1000,
    maxClasses: 30,
    maxStorageGB: 25,
    aiFeaturesEnabled: true,
    customBrandingEnabled: true,
    prioritySupportEnabled: false,
    status: 'active',
    displayOrder: 2,
  },
  {
    name: 'Professional',
    description: 'High-performance SaaS setup with AI grading, mobile money auto-reconciliation, and multi-term analytics.',
    monthlyPrice: 750,
    annualPrice: 7500,
    currency: 'GHS',
    trialDays: 14,
    maxStudents: 1500,
    maxTeachers: 100,
    maxParents: 3000,
    maxClasses: 80,
    maxStorageGB: 100,
    aiFeaturesEnabled: true,
    customBrandingEnabled: true,
    prioritySupportEnabled: true,
    status: 'active',
    displayOrder: 3,
  },
  {
    name: 'Enterprise',
    description: 'Unlimited students, custom domains, dedicated Cloud SQL isolation, and priority 24/7 SLA.',
    monthlyPrice: 1500,
    annualPrice: 15000,
    currency: 'GHS',
    trialDays: 30,
    maxStudents: -1, // Unlimited
    maxTeachers: -1,
    maxParents: -1,
    maxClasses: -1,
    maxStorageGB: 500,
    aiFeaturesEnabled: true,
    customBrandingEnabled: true,
    prioritySupportEnabled: true,
    status: 'active',
    displayOrder: 4,
  }
];

// Default Payment Methods
export const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethodConfig, 'id'>[] = [
  {
    code: 'mtn_momo',
    name: 'MTN Mobile Money',
    category: 'mobile_money',
    enabled: true,
    instructions: 'Send MoMo to Merchant Number 055-123-4567 (EDUkenZA SaaS) and enter Reference.',
    processingFeePercent: 1.0,
    processingFeeFlat: 0,
    iconName: 'Smartphone'
  },
  {
    code: 'telecel_cash',
    name: 'Telecel Cash (Vodafone Cash)',
    category: 'mobile_money',
    enabled: true,
    instructions: 'Send payment to Telecel Cash Till #987654 (EDUkenZA).',
    processingFeePercent: 1.0,
    processingFeeFlat: 0,
    iconName: 'Smartphone'
  },
  {
    code: 'airteltigo_money',
    name: 'AirtelTigo Money',
    category: 'mobile_money',
    enabled: true,
    instructions: 'Pay directly via AirtelTigo Pay Merchant ID 443322.',
    processingFeePercent: 1.0,
    processingFeeFlat: 0,
    iconName: 'Smartphone'
  },
  {
    code: 'card_visa_mc',
    name: 'Visa & Mastercard (Paystack/Hubtel)',
    category: 'card',
    enabled: true,
    instructions: 'Secure online card payment processed via Hubtel / Paystack Gateway.',
    processingFeePercent: 1.95,
    processingFeeFlat: 0,
    iconName: 'CreditCard'
  },
  {
    code: 'bank_transfer',
    name: 'Direct Bank Transfer',
    category: 'bank_transfer',
    enabled: true,
    instructions: 'Bank: GCB Bank Ghana Ltd. Account Name: EDUkenZA Tech Ltd. Account Number: 1011122233344.',
    processingFeePercent: 0,
    processingFeeFlat: 0,
    iconName: 'Building'
  }
];

// ==========================================
// 1. SUBSCRIPTION PLANS SERVICE
// ==========================================

export async function fetchAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const colRef = collection(db, 'subscriptionPlans');
    const q = query(colRef, orderBy('displayOrder', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed default plans automatically if collection is empty
      console.log('[Billing Service] Seeding default subscription plans to Firestore...');
      const seededPlans: SubscriptionPlan[] = [];
      for (const p of DEFAULT_SUBSCRIPTION_PLANS) {
        const docRef = await addDoc(colRef, {
          ...p,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        seededPlans.push({ id: docRef.id, ...p });
      }
      return seededPlans;
    }

    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPlan));
  } catch (err) {
    console.error('Error fetching subscription plans:', err);
    return [];
  }
}

export async function createSubscriptionPlan(planData: Omit<SubscriptionPlan, 'id'>, userEmail?: string): Promise<string> {
  const colRef = collection(db, 'subscriptionPlans');
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...planData,
    createdAt: now,
    updatedAt: now
  });

  await logSecurityEvent({
    eventType: 'SETTINGS_CHANGED',
    action: 'CREATE_SUBSCRIPTION_PLAN',
    userEmail: userEmail || 'platform_owner',
    details: `Created subscription plan "${planData.name}" (${planData.currency} ${planData.monthlyPrice}/mo)`,
    severity: 'medium'
  });

  return docRef.id;
}

export async function updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>, userEmail?: string): Promise<void> {
  const docRef = doc(db, 'subscriptionPlans', planId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  await logSecurityEvent({
    eventType: 'SETTINGS_CHANGED',
    action: 'UPDATE_SUBSCRIPTION_PLAN',
    userEmail: userEmail || 'platform_owner',
    details: `Updated subscription plan ID ${planId}`,
    severity: 'medium'
  });
}

export async function deleteSubscriptionPlan(planId: string, planName: string, userEmail?: string): Promise<void> {
  const docRef = doc(db, 'subscriptionPlans', planId);
  await deleteDoc(docRef);

  await logSecurityEvent({
    eventType: 'SETTINGS_CHANGED',
    action: 'DELETE_SUBSCRIPTION_PLAN',
    userEmail: userEmail || 'platform_owner',
    details: `Deleted subscription plan "${planName}" (ID: ${planId})`,
    severity: 'high'
  });
}

// ==========================================
// 2. SCHOOL SUBSCRIPTIONS SERVICE
// ==========================================

export async function fetchSchoolSubscription(schoolId: string): Promise<SchoolSubscription | null> {
  try {
    const colRef = collection(db, 'schoolSubscriptions');
    const q = query(colRef, where('schoolId', '==', schoolId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as SchoolSubscription;
  } catch (err) {
    console.error('Error fetching school subscription:', err);
    return null;
  }
}

export async function fetchAllSchoolSubscriptions(): Promise<SchoolSubscription[]> {
  try {
    const colRef = collection(db, 'schoolSubscriptions');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolSubscription));
  } catch (err) {
    console.error('Error fetching all school subscriptions:', err);
    return [];
  }
}

export async function createOrUpdateSchoolSubscription(
  subData: Omit<SchoolSubscription, 'id'>,
  userEmail?: string
): Promise<string> {
  const colRef = collection(db, 'schoolSubscriptions');
  const existing = await fetchSchoolSubscription(subData.schoolId);

  const now = new Date().toISOString();

  if (existing) {
    const docRef = doc(db, 'schoolSubscriptions', existing.id);
    await updateDoc(docRef, {
      ...subData,
      updatedAt: now
    });

    await logSecurityEvent({
      eventType: 'ROLE_CHANGE',
      action: 'UPDATE_SCHOOL_SUBSCRIPTION',
      userEmail: userEmail || 'system',
      schoolId: subData.schoolId,
      details: `Updated subscription for ${subData.schoolName} to plan ${subData.planName} (${subData.status})`,
      severity: 'medium'
    });

    return existing.id;
  } else {
    const docRef = await addDoc(colRef, {
      ...subData,
      createdAt: now,
      updatedAt: now
    });

    await logSecurityEvent({
      eventType: 'ROLE_CHANGE',
      action: 'CREATE_SCHOOL_SUBSCRIPTION',
      userEmail: userEmail || 'system',
      schoolId: subData.schoolId,
      details: `Created new ${subData.status} subscription for ${subData.schoolName} on plan ${subData.planName}`,
      severity: 'medium'
    });

    return docRef.id;
  }
}

// ==========================================
// 3. PAYMENT METHODS SERVICE
// ==========================================

export async function fetchAllPaymentMethods(): Promise<PaymentMethodConfig[]> {
  try {
    const colRef = collection(db, 'paymentMethods');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.log('[Billing Service] Seeding default payment methods to Firestore...');
      const seeded: PaymentMethodConfig[] = [];
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        const docRef = await addDoc(colRef, {
          ...pm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        seeded.push({ id: docRef.id, ...pm });
      }
      return seeded;
    }

    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethodConfig));
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    return [];
  }
}

export async function updatePaymentMethodConfig(methodId: string, updates: Partial<PaymentMethodConfig>, userEmail?: string): Promise<void> {
  const docRef = doc(db, 'paymentMethods', methodId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  await logSecurityEvent({
    eventType: 'SETTINGS_CHANGED',
    action: 'UPDATE_PAYMENT_METHOD',
    userEmail: userEmail || 'platform_owner',
    details: `Updated payment method configuration ID ${methodId}`,
    severity: 'low'
  });
}

// ==========================================
// 4. BILLING INVOICES SERVICE
// ==========================================

export async function fetchAllInvoices(): Promise<BillingInvoice[]> {
  try {
    const colRef = collection(db, 'billingInvoices');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BillingInvoice));
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return [];
  }
}

export async function fetchSchoolInvoices(schoolId: string): Promise<BillingInvoice[]> {
  try {
    const colRef = collection(db, 'billingInvoices');
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BillingInvoice));
  } catch (err) {
    console.error('Error fetching school invoices:', err);
    return [];
  }
}

export async function generateInvoice(invoiceData: Omit<BillingInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>, userEmail?: string): Promise<BillingInvoice> {
  const colRef = collection(db, 'billingInvoices');
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();

  const newInvoiceRecord = {
    ...invoiceData,
    invoiceNumber,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await addDoc(colRef, newInvoiceRecord);

  await logSecurityEvent({
    eventType: 'SENSITIVE_DATA_ACCESS',
    action: 'GENERATE_INVOICE',
    userEmail: userEmail || 'system',
    schoolId: invoiceData.schoolId,
    details: `Generated Invoice #${invoiceNumber} for ${invoiceData.schoolName} (${invoiceData.currency} ${invoiceData.totalAmount})`,
    severity: 'medium'
  });

  return {
    id: docRef.id,
    ...newInvoiceRecord
  };
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus, paidDate?: string, userEmail?: string): Promise<void> {
  const docRef = doc(db, 'billingInvoices', invoiceId);
  const updates: any = {
    status,
    updatedAt: new Date().toISOString()
  };
  if (paidDate) updates.paidDate = paidDate;

  await updateDoc(docRef, updates);

  await logSecurityEvent({
    eventType: 'SETTINGS_CHANGED',
    action: 'UPDATE_INVOICE_STATUS',
    userEmail: userEmail || 'system',
    details: `Invoice ID ${invoiceId} status updated to "${status}"`,
    severity: 'medium'
  });
}

// ==========================================
// 5. TRANSACTIONS SERVICE
// ==========================================

export async function fetchAllTransactions(): Promise<BillingTransaction[]> {
  try {
    const colRef = collection(db, 'transactions');
    const q = query(colRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BillingTransaction));
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return [];
  }
}

export async function fetchSchoolTransactions(schoolId: string): Promise<BillingTransaction[]> {
  try {
    const colRef = collection(db, 'transactions');
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BillingTransaction));
  } catch (err) {
    console.error('Error fetching school transactions:', err);
    return [];
  }
}

export async function recordTransaction(txnData: Omit<BillingTransaction, 'id' | 'transactionId' | 'createdAt'>, userEmail?: string): Promise<BillingTransaction> {
  const colRef = collection(db, 'transactions');
  const transactionId = `TXN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const record = {
    ...txnData,
    transactionId,
    createdAt: now
  };

  const docRef = await addDoc(colRef, record);

  await logSecurityEvent({
    eventType: 'SENSITIVE_DATA_ACCESS',
    action: 'RECORD_BILLING_TRANSACTION',
    userEmail: userEmail || 'system',
    schoolId: txnData.schoolId,
    details: `Recorded transaction ${transactionId} (${txnData.currency} ${txnData.amount}) for ${txnData.schoolName}`,
    severity: 'medium'
  });

  return { id: docRef.id, ...record };
}

// ==========================================
// 6. REVENUE ANALYTICS ENGINE
// ==========================================

export async function calculateRevenueAnalytics(): Promise<RevenueAnalytics> {
  const invoices = await fetchAllInvoices();
  const subscriptions = await fetchAllSchoolSubscriptions();
  const transactions = await fetchAllTransactions();

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const successfulTxns = transactions.filter(t => t.status === 'successful');

  const totalRevenue = paidInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  
  const activeSchools = subscriptions.filter(s => s.status === 'active');
  const trialSchools = subscriptions.filter(s => s.status === 'trial');
  const expiredSchools = subscriptions.filter(s => s.status === 'expired');

  const activeCount = activeSchools.length;
  const arpu = activeCount > 0 ? Math.round(totalRevenue / activeCount) : 0;

  // Plan Distribution Map
  const planMap: Record<string, number> = {};
  subscriptions.forEach(s => {
    planMap[s.planName] = (planMap[s.planName] || 0) + 1;
  });

  const planDistribution = Object.keys(planMap).map(planName => ({
    planName,
    count: planMap[planName],
    percentage: Math.round((planMap[planName] / Math.max(1, subscriptions.length)) * 100)
  }));

  // Payment Method Distribution Map
  const methodMap: Record<string, { count: number; totalAmount: number }> = {};
  successfulTxns.forEach(t => {
    const m = t.paymentMethod || 'Direct MoMo / Bank';
    if (!methodMap[m]) methodMap[m] = { count: 0, totalAmount: 0 };
    methodMap[m].count += 1;
    methodMap[m].totalAmount += t.amount;
  });

  const paymentMethodDistribution = Object.keys(methodMap).map(method => ({
    method,
    count: methodMap[method].count,
    totalAmount: methodMap[method].totalAmount
  }));

  // Monthly Revenue Trend (Last 6 Months)
  const monthlyRevenueTrend: Array<{ month: string; revenue: number; count: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    const monthPaidInvoices = paidInvoices.filter(inv => {
      if (!inv.paidDate) return false;
      const invDate = new Date(inv.paidDate);
      return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
    });

    const rev = monthPaidInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
    monthlyRevenueTrend.push({
      month: monthLabel,
      revenue: rev,
      count: monthPaidInvoices.length
    });
  }

  const renewalRate = subscriptions.length > 0 ? Math.round((activeCount / subscriptions.length) * 100) : 100;
  const churnRate = 100 - renewalRate;

  return {
    monthlyRevenue: Math.round(totalRevenue * 0.8), // Est. monthly
    annualRevenue: totalRevenue,
    activeSchoolsCount: activeCount,
    trialSchoolsCount: trialSchools.length,
    expiredCount: expiredSchools.length,
    totalTransactionsCount: transactions.length,
    arpu,
    monthlyRevenueTrend,
    planDistribution,
    paymentMethodDistribution,
    renewalRatePercent: renewalRate,
    churnRatePercent: churnRate
  };
}
