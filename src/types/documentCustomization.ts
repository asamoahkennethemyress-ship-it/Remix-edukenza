export interface GradeRule {
  minMark: number;
  maxMark: number;
  grade: string;
  remark: string;
}

export interface SchoolDocumentSettings {
  schoolId: string;
  schoolName: string;
  tagline?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  academicYear?: string;
  academicTerm?: string;
  currencySymbol?: string; // e.g. 'GHS', '$', 'R'
  
  // Styling & Theme
  primaryColor: string; // e.g. '#002147'
  accentColor: string;  // e.g. '#D4AF37'
  headerText?: string;
  footerText?: string;
  
  // Layout styles
  receiptLayout: 'standard_a4' | 'compact_dual';
  reportCardLayout: 'modern_executive' | 'classic_bordered' | 'minimal_clean';
  
  // Field visibility toggles
  showPosition: boolean;
  showAttendance: boolean;
  showConduct: boolean;
  showPreviousBalance: boolean;
  showAmountInWords: boolean;
  showOfficialStamp: boolean;
  showWatermark: boolean;
  showGradeLegend: boolean;
  
  // Signature authorities
  principalName: string;
  principalTitle: string;
  cashierTitle: string;
  classTeacherTitle: string;
  
  // Grading scale rules
  gradeRules: GradeRule[];
  
  updatedAt?: string;
}

export const DEFAULT_GRADE_RULES: GradeRule[] = [
  { minMark: 80, maxMark: 100, grade: 'A', remark: 'Excellent' },
  { minMark: 70, maxMark: 79, grade: 'B', remark: 'Very Good' },
  { minMark: 60, maxMark: 69, grade: 'C', remark: 'Good' },
  { minMark: 50, maxMark: 59, grade: 'D', remark: 'Credit / Pass' },
  { minMark: 0, maxMark: 49, grade: 'F', remark: 'Fail / Needs Improvement' }
];

export const DEFAULT_DOCUMENT_SETTINGS: SchoolDocumentSettings = {
  schoolId: '',
  schoolName: 'EDUkenZA Academy',
  tagline: 'Excellence in Education & Character Development',
  logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
  phone: '+233 24 000 0000 / +27 11 000 0000',
  email: 'admin@edukenza.edu',
  address: 'P.O. Box 450, Education Ridge, Accra / Sandton',
  website: 'www.edukenza.edu',
  academicYear: '2026',
  academicTerm: 'Term 1, 2026',
  currencySymbol: 'GHS',
  
  primaryColor: '#002147', // Oxford Navy
  accentColor: '#D4AF37',  // Warm Gold
  headerText: 'Official School Administrative Record',
  footerText: 'This is an authentic computer-generated record from the EDUkenZA School Management System. Valid with official seal.',
  
  receiptLayout: 'standard_a4',
  reportCardLayout: 'modern_executive',
  
  showPosition: true,
  showAttendance: true,
  showConduct: true,
  showPreviousBalance: true,
  showAmountInWords: true,
  showOfficialStamp: true,
  showWatermark: true,
  showGradeLegend: true,
  
  principalName: 'Dr. Kenneth Asamoah',
  principalTitle: 'Head of School & Principal',
  cashierTitle: 'Senior Bursar / Accounts Officer',
  classTeacherTitle: 'Class Tutor / Form Master',
  
  gradeRules: DEFAULT_GRADE_RULES
};
