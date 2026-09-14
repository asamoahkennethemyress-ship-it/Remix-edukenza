export * from './billing';

export type EducationCategory = 'BASIC' | 'SENIOR_HIGH';

export type UserRole = 
  | 'platform_owner'
  // BASIC School Admin:
  | 'school_admin'
  // SENIOR HIGH School Leadership & Administration:
  | 'school_head'
  | 'assistant_academics'
  | 'assistant_domestic'
  // SENIOR HIGH Domestic Sub-roles:
  | 'house_master'
  | 'housekeeping'
  | 'facilities'
  | 'general_services'
  // Academic & Community roles (Shared between Basic and Senior High):
  | 'teacher'
  | 'student'
  | 'parent';

export type PlanType = 'free_trial' | 'basic' | 'professional' | 'enterprise';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  educationCategory?: EducationCategory;
  status: 'active' | 'pending' | 'suspended' | 'disabled' | 'pending_password_setup';
  firstLogin?: boolean;
  schoolId?: string;
  schoolName?: string;
  avatarUrl?: string;
  permissions?: string[];
  department?: 'academics' | 'domestic' | 'administration';
  
  // Senior High Boarding & Domestic details:
  assignedHouseId?: string;
  assignedHouseName?: string;
  dormRoomNumber?: string;
  isBoarder?: boolean;
  programme?: string; // e.g. General Science, General Arts, Business, Visual Arts, Home Economics, Technical, Agricultural Science

  studentId?: string;
  classId?: string;
  className?: string;
  dob?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  parentInfo?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  photoUrl?: string;
  academicYear?: string;
  currentTerm?: string;
  createdAt: string;
  [key: string]: any;
}

export interface SchoolAccount {
  id: string;
  schoolId?: string;
  schoolName: string;
  educationCategory: EducationCategory;
  schoolEmail: string;
  phoneNumber: string;
  country: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminId?: string;
  logoUrl?: string;
  plan: PlanType | string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  programmesOffered?: string[];
  boardingAvailable?: boolean;
  totalHouses?: number;
}

export interface BoardingHouse {
  id: string;
  schoolId: string;
  name: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  capacity: number;
  currentOccupancy: number;
  houseMasterId?: string;
  houseMasterName?: string;
  houseMasterPhone?: string;
  description?: string;
  createdAt: string;
}

export interface ExeatRequest {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  houseId: string;
  houseName: string;
  reason: string;
  category: 'Medical' | 'Weekend' | 'Emergency' | 'Official';
  departureDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'pending' | 'approved_by_house_master' | 'approved_by_domestic' | 'denied' | 'returned';
  approvedBy?: string;
  parentContactPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  schoolId: string;
  title: string;
  facilityLocation: string; // e.g. Science Lab 2, Dorm Block B, Dining Hall
  category: 'Electrical' | 'Plumbing' | 'Carpentry' | 'Structural' | 'Sanitation' | 'General';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'reported' | 'in_progress' | 'completed' | 'on_hold';
  reportedBy: string;
  reportedByRole: string;
  assignedTo?: string;
  costEstimate?: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'Administration' | 'Academics' | 'Portals' | 'Analytics' | 'AI Technology';
  benefits: string[];
}

export interface PricingPlan {
  id: PlanType;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  features: string[];
  ctaText: string;
}

export interface PricingPlanDoc {
  id?: string;
  docId?: string;
  planName: string;
  price: string | number;
  currency: string;
  billingPeriod: string;
  description: string;
  features: string[];
  buttonText: string;
  status: 'active' | 'inactive';
  order: number;
  popular?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlanConfig {
  planId: string;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'annual';
  features: string[];
  status: 'active' | 'inactive';
}

export interface PlatformSettingsData {
  appName: string;
  logoUrl: string;
  themeColor: string;
  contactEmail: string;
  contactPhone: string;
  enableRegistrations: boolean;
  maintenanceMode: boolean;
  platformStatus: 'operational' | 'degraded' | 'maintenance';
}

export interface AuditLogItem {
  logId: string;
  action: string;
  performedBy: string;
  performedByEmail: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export type PaymentMethodType = 'mtn_momo' | 'vodafone_cash' | 'airteltigo_money' | 'bank_transfer' | 'card';

export interface PaymentMethod {
  id: string;
  methodName: string;
  type: PaymentMethodType | string;
  providerName: string;
  accountName: string;
  mobileMoneyNumber?: string;
  merchantNumber?: string;
  bankAccountDetails?: string;
  instructions: string;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'failed';

export interface PaymentRecord {
  paymentId: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  paymentProofUrl?: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  submittedByEmail?: string;
}

export interface SubscriptionRecord {
  subscriptionId: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  lastPaymentId?: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export type ActiveView = 
  | 'home' 
  | 'features' 
  | 'about'
  | 'how-it-works' 
  | 'benefits' 
  | 'pricing' 
  | 'faq' 
  | 'login' 
  | 'register-school' 
  | 'role-preview'
  | 'owner-dashboard'
  | 'school-admin-dashboard'
  | 'senior-high-dashboard'
  | 'senior-high-head-dashboard'
  | 'senior-high-academics-dashboard'
  | 'senior-high-domestic-dashboard'
  | 'senior-high-services-dashboard'
  | 'teacher-dashboard'
  | 'student-dashboard'
  | 'parent-dashboard';

export interface RegistrationFormData {
  schoolName: string;
  educationCategory?: EducationCategory;
  schoolEmail: string;
  phoneNumber: string;
  country: string;
  address: string;
  adminName: string;
  agreeToTerms: boolean;
  adminEmail?: string;
  password?: string;
  confirmPassword?: string;
}

export * from './userContent';

