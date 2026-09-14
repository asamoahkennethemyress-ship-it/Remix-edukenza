import { UserProfile, UserRole, EducationCategory } from '../types';

export const PRIMARY_PLATFORM_OWNER_EMAIL = 'asamoahkennethemyress@gmail.com';

export const OWNER_PERMISSIONS = {
  OWNER_DASHBOARD: 'Owner Dashboard',
  PLATFORM_SETTINGS: 'Platform Settings',
  SCHOOLS_MANAGEMENT: 'Schools Management',
  USERS_MANAGEMENT: 'Users Management',
  SUBSCRIPTION_MANAGEMENT: 'Subscription Management',
  REPORTS: 'Reports',
} as const;

export type OwnerPermission = typeof OWNER_PERMISSIONS[keyof typeof OWNER_PERMISSIONS];

export const OWNER_MODULES: OwnerPermission[] = [
  OWNER_PERMISSIONS.OWNER_DASHBOARD,
  OWNER_PERMISSIONS.PLATFORM_SETTINGS,
  OWNER_PERMISSIONS.SCHOOLS_MANAGEMENT,
  OWNER_PERMISSIONS.USERS_MANAGEMENT,
  OWNER_PERMISSIONS.SUBSCRIPTION_MANAGEMENT,
  OWNER_PERMISSIONS.REPORTS,
];

export const PLATFORM_OWNER_EMAILS = [
  'anastasiaappiahkwaa@gmail.com',
  'asamoahkennethemyress@gmail.com',
  'kennethasamoa@gmail.com',
  'owner@edukenza.com',
  'owner@test.com'
];

export function isPlatformOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  // Exclude non-owner role keywords and student domains unless explicitly in allowed list
  if (PLATFORM_OWNER_EMAILS.includes(clean)) {
    return true;
  }
  if (clean.endsWith('@edukenza.student') || clean.includes('student') || clean.includes('teacher') || clean.includes('parent') || clean.includes('admin')) {
    if (!clean.includes('owner') && !clean.includes('platform_owner')) {
      return false;
    }
  }
  return (
    clean === PRIMARY_PLATFORM_OWNER_EMAIL.toLowerCase() ||
    clean.startsWith('owner@') ||
    clean.includes('platform_owner')
  );
}

export function isSchoolAdminRole(roleString: any): boolean {
  if (!roleString) return false;
  const clean = String(roleString).trim().toLowerCase().replace(/[\s-_]+/g, '_');
  return clean === 'school_admin' || clean === 'schooladmin' || clean === 'school_administrator' || clean === 'admin';
}

export function isSeniorHighLeadership(roleString: any): boolean {
  if (!roleString) return false;
  const clean = String(roleString).trim().toLowerCase().replace(/[\s-_]+/g, '_');
  return clean === 'school_head' || clean === 'assistant_academics' || clean === 'assistant_domestic';
}

export function isSeniorHighDomesticStaff(roleString: any): boolean {
  if (!roleString) return false;
  const clean = String(roleString).trim().toLowerCase().replace(/[\s-_]+/g, '_');
  return (
    clean === 'house_master' ||
    clean === 'housemaster' ||
    clean === 'house_mistress' ||
    clean === 'housekeeping' ||
    clean === 'facilities' ||
    clean === 'general_services'
  );
}

export function isSeniorHighRole(roleString: any): boolean {
  return isSeniorHighLeadership(roleString) || isSeniorHighDomesticStaff(roleString);
}

/**
 * Validates role strings strictly against known system roles.
 * Returns null if the role string is missing, invalid, or cannot be verified.
 */
export function parseValidRole(roleString: any): UserRole | null {
  if (!roleString) return null;
  const clean = String(roleString).trim().toLowerCase().replace(/[\s-_]+/g, '_');

  // Platform Owner
  if (clean === 'platform_owner' || clean === 'platformowner' || clean === 'owner') {
    return 'platform_owner';
  }

  // BASIC School Admin
  if (clean === 'school_admin' || clean === 'schooladmin' || clean === 'school_administrator' || clean === 'admin') {
    return 'school_admin';
  }

  // SENIOR HIGH: School Head / Owner
  if (clean === 'school_head' || clean === 'schoolhead' || clean === 'headmaster' || clean === 'headmistress' || clean === 'principal') {
    return 'school_head';
  }

  // SENIOR HIGH Administration: Assistant Academics
  if (clean === 'assistant_academics' || clean === 'assistant_academic' || clean === 'asst_academics' || clean === 'academic_head') {
    return 'assistant_academics';
  }

  // SENIOR HIGH Administration: Assistant Domestic
  if (clean === 'assistant_domestic' || clean === 'asst_domestic' || clean === 'domestic_head') {
    return 'assistant_domestic';
  }

  // SENIOR HIGH Domestic: House Master / House Mistress
  if (clean === 'house_master' || clean === 'housemaster' || clean === 'house_mistress' || clean === 'housemistress') {
    return 'house_master';
  }

  // SENIOR HIGH Domestic: Housekeeping
  if (clean === 'housekeeping' || clean === 'matron' || clean === 'dining_hall') {
    return 'housekeeping';
  }

  // SENIOR HIGH Domestic: Facilities
  if (clean === 'facilities' || clean === 'estate' || clean === 'maintenance') {
    return 'facilities';
  }

  // SENIOR HIGH Domestic: General Services
  if (clean === 'general_services' || clean === 'generalservices' || clean === 'security_lead' || clean === 'transport') {
    return 'general_services';
  }

  // Academic & Community roles (Shared between Basic and Senior High)
  if (clean === 'teacher' || clean === 'instructor' || clean === 'tutor') {
    return 'teacher';
  }
  if (clean === 'student' || clean === 'learner' || clean === 'pupil') {
    return 'student';
  }
  if (clean === 'parent' || clean === 'guardian') {
    return 'parent';
  }

  return null;
}

/**
 * Normalizes role strings to handle spelling/casing variations.
 * Returns null if the role is unrecognized.
 */
export function normalizeRole(roleString: string | undefined | null): UserRole | null {
  return parseValidRole(roleString);
}

/**
 * Enforces role assignment based on requested role and email.
 * Returns null if the role cannot be verified or is invalid.
 */
export function enforceProtectedRole(email: string | null | undefined, requestedRole: any, educationCategory?: EducationCategory): UserRole | null {
  const parsed = parseValidRole(requestedRole);
  if (!parsed) return null;
  // A user can ONLY have the platform_owner role if their explicit role is platform_owner AND their email is authorized
  if (parsed === 'platform_owner') {
    if (!isPlatformOwnerEmail(email)) {
      return educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin';
    }
    return 'platform_owner';
  }
  // All other legitimate roles (school_admin, teacher, student, parent, etc.) must remain strictly unchanged
  return parsed;
}

/**
 * Checks if a user has platform_owner role strictly based on user profile role
 */
export function isPlatformOwner(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'platform_owner';
}

/**
 * Validates whether the user is authorized to access Platform Owner features
 */
export function canAccessOwnerFeature(user: UserProfile | null, feature?: OwnerPermission): boolean {
  if (!isPlatformOwner(user)) {
    return false;
  }
  if (feature && !OWNER_MODULES.includes(feature)) {
    return false;
  }
  return true;
}

/**
 * Returns allowed modules for a given role and education category
 */
export function getAllowedModulesForRole(role: UserRole, educationCategory?: EducationCategory): string[] {
  switch (role) {
    case 'platform_owner':
      return [...OWNER_MODULES];

    // BASIC:
    case 'school_admin':
      return [
        'School Admin Dashboard',
        'Teacher Management',
        'Student Directory',
        'Classes & Streams',
        'Fee Management',
        'Attendance',
        'Assessments & Exams',
        'School Settings & Branding',
        'Digital Library',
        'LMS'
      ];

    // SENIOR HIGH: School Head / Owner
    case 'school_head':
      return [
        'School Head Overview',
        'Academics Administration',
        'Domestic & Boarding Administration',
        'Faculty & Staff Directory',
        'SHS Student Roster',
        'Programmes & Tracks',
        'Financial Oversight',
        'Executive Reports',
        'School Settings'
      ];

    // SENIOR HIGH: Assistant Academics
    case 'assistant_academics':
      return [
        'Academic Administration',
        'SHS Departments & Teachers',
        'Students & Class Stream Placement',
        'Programmes (Science/Arts/Business)',
        'Master Timetable',
        'WASSCE / Exam Management',
        'LMS & Curriculum Delivery',
        'Digital Library'
      ];

    // SENIOR HIGH: Assistant Domestic
    case 'assistant_domestic':
      return [
        'Domestic Administration',
        'Boarding Houses Management',
        'House Masters / Mistresses Roster',
        'Exeat Approvals & Tracking',
        'Housekeeping & Dining Hall',
        'Facilities & Maintenance',
        'General Services'
      ];

    // SENIOR HIGH: House Master / House Mistress
    case 'house_master':
      return [
        'House Master Dashboard',
        'House Roster & Roll Call',
        'Dormitory Allocations',
        'Exeat Management',
        'Student Conduct & Welfare'
      ];

    // SENIOR HIGH: Housekeeping
    case 'housekeeping':
      return [
        'Housekeeping Operations',
        'Dining & Meal Tracking',
        'Sanitation Logs',
        'Linen & Stores'
      ];

    // SENIOR HIGH: Facilities
    case 'facilities':
      return [
        'Facilities & Estate Work Orders',
        'Campus Infrastructure',
        'Repairs & Maintenance',
        'Safety Inspections'
      ];

    // SENIOR HIGH: General Services
    case 'general_services':
      return [
        'General Services',
        'Campus Security Logs',
        'Transport & Fleet',
        'Utility Oversight'
      ];

    // ACADEMIC & COMMUNITY ROLES (Both Basic and Senior High):
    case 'teacher':
      return [
        'Teacher Portal',
        'Class Attendance',
        'Subject Gradebook',
        'Assignments & Quizzes',
        'LMS Lessons',
        'Digital Library'
      ];

    case 'student':
      return [
        'Student Portal',
        'Enrolled Courses & Lessons',
        'Assignments & CBT',
        'Class Timetable',
        'My Grades & Reports',
        'Digital Library',
        ...(educationCategory === 'SENIOR_HIGH' ? ['Boarding House & Exeat Requests'] : [])
      ];

    case 'parent':
      return [
        'Parent Portal',
        'Ward Academic Progress',
        'Attendance Tracking',
        'Fee Statements & Payments',
        'School Notices',
        ...(educationCategory === 'SENIOR_HIGH' ? ['Boarding & Exeat Status'] : [])
      ];

    default:
      return [];
  }
}

