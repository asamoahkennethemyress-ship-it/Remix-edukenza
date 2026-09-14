export interface CollectionDefinition {
  id: string;
  label: string;
  category: 'core' | 'academic' | 'finance' | 'system';
  description: string;
  allowedRoles: ('platform_owner' | 'school_admin')[];
  schoolFilterField?: string; // e.g. 'schoolId' or 'id' for schools collection
}

export const BACKUP_COLLECTIONS: CollectionDefinition[] = [
  // Core School Data
  { id: 'schools', label: 'Schools Registry', category: 'core', description: 'Platform schools accounts & configurations', allowedRoles: ['platform_owner'], schoolFilterField: 'id' },
  { id: 'users', label: 'User Accounts', category: 'core', description: 'User credentials, roles & profiles', allowedRoles: ['platform_owner'], schoolFilterField: 'schoolId' },
  { id: 'students', label: 'Students Roster', category: 'core', description: 'Student profiles, admission data & info', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'teachers', label: 'Teachers & Staff', category: 'core', description: 'Teacher profiles, employment & departments', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'parents', label: 'Parents Directory', category: 'core', description: 'Parent profiles & contact information', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'classes', label: 'Classes & Streams', category: 'core', description: 'Grade levels, streams & class rosters', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'subjects', label: 'Academic Subjects', description: 'Subject registry, codes & curriculum standards', category: 'academic', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },

  // Academic & Operational
  { id: 'timetables', label: 'Class Timetables', category: 'academic', description: 'Weekly schedules & room allocations', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'attendance', label: 'Attendance Records', category: 'academic', description: 'Daily student & teacher attendance logs', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'assignments', label: 'Assignments & Work', category: 'academic', description: 'Class assignments, homework & submissions', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'results', label: 'Exam Results & Marks', category: 'academic', description: 'Student assessment scores & grades', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'academicReports', label: 'Academic Report Cards', category: 'academic', description: 'Term report cards & teacher evaluations', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },

  // Financial & Administration
  { id: 'payments', label: 'Fee Transactions', category: 'finance', description: 'Tuition fees, payments & invoices', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },
  { id: 'paymentReceipts', label: 'Payment Receipts', category: 'finance', description: 'Issued payment receipts & transaction logs', allowedRoles: ['platform_owner'], schoolFilterField: 'schoolId' },
  { id: 'schoolSettings', label: 'School Preferences', category: 'system', description: 'School specific branding, terms & settings', allowedRoles: ['platform_owner', 'school_admin'], schoolFilterField: 'schoolId' },

  // Platform Level Only
  { id: 'analytics', label: 'Platform Analytics', category: 'system', description: 'System-wide metrics & performance logs', allowedRoles: ['platform_owner'], schoolFilterField: 'schoolId' },
  { id: 'auditLogs', label: 'Security Audit Logs', category: 'system', description: 'Platform execution & security audit trails', allowedRoles: ['platform_owner'], schoolFilterField: 'schoolId' },
  { id: 'marketing_site', label: 'Marketing Content', category: 'system', description: 'Website CMS content & landing page config', allowedRoles: ['platform_owner'] },
  { id: 'platformSettings', label: 'Global Platform Settings', category: 'system', description: 'EDUkenZA global configurations', allowedRoles: ['platform_owner'] },
  { id: 'subscriptionPlans', label: 'Subscription Plans', category: 'system', description: 'Platform pricing tiers & plan definitions', allowedRoles: ['platform_owner'] },
];

export function getCollectionsForRole(role: 'platform_owner' | 'school_admin'): CollectionDefinition[] {
  return BACKUP_COLLECTIONS.filter(c => c.allowedRoles.includes(role));
}
