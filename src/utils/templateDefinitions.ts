import * as XLSX from 'xlsx';
import { ImportEntityType, ImportTemplateDefinition } from '../types/importExport';

export const IMPORT_TEMPLATES: Record<ImportEntityType, ImportTemplateDefinition> = {
  students: {
    type: 'students',
    title: 'Students Enrollment Import Template',
    description: 'Use this template to import new student records in bulk.',
    columns: [
      { key: 'studentId', label: 'Student ID', required: true, example: 'STD-2026-001', description: 'Unique identifier for the student' },
      { key: 'fullName', label: 'Full Name', required: true, example: 'Amina Nkosi', description: 'First name and last name' },
      { key: 'email', label: 'Email Address', required: true, example: 'amina.n@student.edukenza.edu', description: 'Valid email address for student login' },
      { key: 'gender', label: 'Gender', required: true, example: 'Female', description: 'Male, Female, or Other' },
      { key: 'dob', label: 'Date of Birth', required: true, example: '2010-05-14', description: 'YYYY-MM-DD format' },
      { key: 'phone', label: 'Phone Number', required: false, example: '+27 82 123 4567', description: 'Contact phone number' },
      { key: 'address', label: 'Address', required: false, example: '12 Mandela Way, Johannesburg', description: 'Residential address' },
      { key: 'className', label: 'Class Name', required: true, example: 'Grade 10A', description: 'Exact class title existing in school' },
      { key: 'parentEmail', label: 'Parent Email', required: false, example: 'joseph.nkosi@gmail.com', description: 'Linked parent user email address' }
    ]
  },
  teachers: {
    type: 'teachers',
    title: 'Teachers & Staff Import Template',
    description: 'Use this template to import educators and faculty staff.',
    columns: [
      { key: 'teacherId', label: 'Employee ID', required: true, example: 'EMP-T-042', description: 'Unique staff/employee ID' },
      { key: 'fullName', label: 'Full Name', required: true, example: 'Prof. David Okafor', description: 'Full academic title and name' },
      { key: 'email', label: 'Email Address', required: true, example: 'd.okafor@edukenza.edu', description: 'Official staff email' },
      { key: 'phone', label: 'Phone Number', required: true, example: '+27 83 987 6543', description: 'Mobile phone number' },
      { key: 'subject', label: 'Primary Subject', required: true, example: 'Mathematics', description: 'Main teaching subject' },
      { key: 'assignedClassName', label: 'Assigned Class', required: false, example: 'Grade 10A', description: 'Homeroom or lead class' }
    ]
  },
  parents: {
    type: 'parents',
    title: 'Parents & Guardians Import Template',
    description: 'Use this template to import parent accounts and link them to students.',
    columns: [
      { key: 'fullName', label: 'Full Name', required: true, example: 'Joseph Nkosi', description: 'Parent or legal guardian name' },
      { key: 'email', label: 'Email Address', required: true, example: 'joseph.nkosi@gmail.com', description: 'Parent login email address' },
      { key: 'phone', label: 'Phone Number', required: true, example: '+27 82 555 0192', description: 'Parent contact phone' },
      { key: 'address', label: 'Home Address', required: false, example: '12 Mandela Way, Johannesburg', description: 'Physical residential address' },
      { key: 'linkedStudentIds', label: 'Linked Student IDs', required: false, example: 'STD-2026-001, STD-2026-002', description: 'Comma-separated Student IDs' }
    ]
  },
  classes: {
    type: 'classes',
    title: 'School Classes Import Template',
    description: 'Import grade levels, arms, and class room structures.',
    columns: [
      { key: 'className', label: 'Class Name', required: true, example: 'Grade 10A', description: 'Name of the class/stream' },
      { key: 'gradeLevel', label: 'Grade Level', required: true, example: 'Grade 10', description: 'Numeric or standard grade indicator' },
      { key: 'roomNumber', label: 'Room Number', required: false, example: 'Room B-204', description: 'Physical classroom location' },
      { key: 'capacity', label: 'Max Capacity', required: false, example: '35', description: 'Maximum student limit' }
    ]
  },
  subjects: {
    type: 'subjects',
    title: 'Academic Subjects Import Template',
    description: 'Import curriculum subjects and subject codes.',
    columns: [
      { key: 'subjectName', label: 'Subject Name', required: true, example: 'Physical Sciences', description: 'Title of the academic subject' },
      { key: 'code', label: 'Subject Code', required: true, example: 'PHY-101', description: 'Unique subject code' },
      { key: 'department', label: 'Department', required: false, example: 'Sciences', description: 'Department or faculty' },
      { key: 'credits', label: 'Credits', required: false, example: '4', description: 'Academic credit weighting' }
    ]
  },
  timetables: {
    type: 'timetables',
    title: 'Class Timetable Schedule Import Template',
    description: 'Import weekly schedule slots for classes.',
    columns: [
      { key: 'className', label: 'Class Name', required: true, example: 'Grade 10A', description: 'Target class for schedule' },
      { key: 'subjectName', label: 'Subject Name', required: true, example: 'Mathematics', description: 'Scheduled subject' },
      { key: 'teacherEmail', label: 'Teacher Email', required: true, example: 'd.okafor@edukenza.edu', description: 'Assigned teacher email' },
      { key: 'dayOfWeek', label: 'Day of Week', required: true, example: 'Monday', description: 'Monday, Tuesday, Wednesday, Thursday, Friday' },
      { key: 'startTime', label: 'Start Time', required: true, example: '08:30', description: '24-hour format HH:MM' },
      { key: 'endTime', label: 'End Time', required: true, example: '09:30', description: '24-hour format HH:MM' },
      { key: 'room', label: 'Room', required: false, example: 'Lab 2', description: 'Location room code' }
    ]
  },
  'fee-structure': {
    type: 'fee-structure',
    title: 'Fee Structure & Invoices Import Template',
    description: 'Import term fees and tuition billing structures.',
    columns: [
      { key: 'academicYear', label: 'Academic Year', required: true, example: '2026', description: 'Academic year e.g. 2026' },
      { key: 'term', label: 'Term', required: true, example: 'Term 1', description: 'Term 1, Term 2, Term 3, or Term 4' },
      { key: 'className', label: 'Class Name', required: true, example: 'Grade 10A', description: 'Target class' },
      { key: 'feeTitle', label: 'Fee Title', required: true, example: 'Tuition & IT Lab Fee', description: 'Description of the fee item' },
      { key: 'amount', label: 'Amount (ZAR)', required: true, example: '12500', description: 'Monetary figure without symbols' },
      { key: 'dueDate', label: 'Due Date', required: true, example: '2026-02-15', description: 'YYYY-MM-DD deadline' }
    ]
  },
  'examination-results': {
    type: 'examination-results',
    title: 'Examination & Assessment Results Import Template',
    description: 'Import student test and examination scores in bulk.',
    columns: [
      { key: 'studentId', label: 'Student ID', required: true, example: 'STD-2026-001', description: 'Unique Student ID' },
      { key: 'examName', label: 'Exam Name', required: true, example: 'Mid-Year Exam 2026', description: 'Name of the assessment' },
      { key: 'subjectName', label: 'Subject Name', required: true, example: 'Mathematics', description: 'Target subject' },
      { key: 'marksObtained', label: 'Marks Obtained', required: true, example: '85', description: 'Numeric score achieved' },
      { key: 'maxMarks', label: 'Max Marks', required: true, example: '100', description: 'Maximum possible score' },
      { key: 'grade', label: 'Grade', required: false, example: 'A', description: 'Letter grade or code' },
      { key: 'remarks', label: 'Teacher Remarks', required: false, example: 'Excellent analytical skills.', description: 'Brief evaluation feedback' }
    ]
  }
};

/**
 * Generate and download Excel (.xlsx) or CSV (.csv) template for an entity
 */
export function downloadImportTemplate(entityType: ImportEntityType, format: 'xlsx' | 'csv' = 'xlsx') {
  const def = IMPORT_TEMPLATES[entityType];
  if (!def) return;

  // Build header row and example data rows
  const headers = def.columns.map(c => c.label);
  const exampleRow = def.columns.map(c => c.example);
  const instructionsRow = def.columns.map(c => `${c.required ? '[REQUIRED]' : '[OPTIONAL]'} ${c.description}`);

  const sheetData = [
    headers,
    exampleRow,
    instructionsRow
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  worksheet['!cols'] = def.columns.map(c => ({
    wch: Math.max(c.label.length, c.example.length, 18) + 4
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Template');

  const fileName = `EDUkenZA_${def.type}_Import_Template.${format}`;

  if (format === 'csv') {
    XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
  }
}
