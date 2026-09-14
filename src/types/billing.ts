export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  trialDays: number;
  maxStudents: number; // 0 or -1 for unlimited
  maxTeachers: number;
  maxParents: number;
  maxClasses: number;
  maxStorageGB: number;
  aiFeaturesEnabled: boolean;
  customBrandingEnabled: boolean;
  prioritySupportEnabled: boolean;
  status: 'active' | 'inactive';
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'failed';

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  expirationDate: string;
  autoRenew: boolean;
  paymentStatus: PaymentStatus;
  maxStudents: number;
  maxTeachers: number;
  maxParents: number;
  maxClasses: number;
  maxStorageGB: number;
  aiFeaturesEnabled: boolean;
  customBrandingEnabled: boolean;
  prioritySupportEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethodCategory = 'mobile_money' | 'card' | 'bank_transfer' | 'gateway';

export interface PaymentMethodConfig {
  id: string;
  code: string; // e.g., 'mtn_momo', 'telecel_cash', 'airteltigo_money', 'card_visa_mc', 'bank_transfer', 'paystack'
  name: string;
  category: PaymentMethodCategory;
  enabled: boolean;
  instructions: string;
  processingFeePercent: number;
  processingFeeFlat: number;
  iconName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  billingPeriod: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidDate?: string;
  pdfUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionStatus = 'pending' | 'successful' | 'failed' | 'refunded';

export interface BillingTransaction {
  id: string;
  transactionId: string;
  schoolId: string;
  schoolName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  status: TransactionStatus;
  date: string;
  processedBy?: string;
  gatewayResponse?: string;
  createdAt?: string;
}

export interface BillingSettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  taxRatePercent: number;
  currencySymbol: string;
  currencyCode: string;
  reminderScheduleDays: number[];
  autoSuspendOnExpiry: boolean;
  gracePeriodDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevenueAnalytics {
  monthlyRevenue: number;
  annualRevenue: number;
  activeSchoolsCount: number;
  trialSchoolsCount: number;
  expiredCount: number;
  totalTransactionsCount: number;
  arpu: number;
  monthlyRevenueTrend: Array<{ month: string; revenue: number; count: number }>;
  planDistribution: Array<{ planName: string; count: number; percentage: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; totalAmount: number }>;
  renewalRatePercent: number;
  churnRatePercent: number;
}
