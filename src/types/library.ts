/**
 * EDUkenZA Enterprise Digital Library & AI Learning Resource Center Types
 */

export type LibraryCategory =
  | 'Books'
  | 'Textbooks'
  | 'Story Books'
  | 'Novels'
  | 'Journals'
  | 'Research Papers'
  | 'Magazines'
  | 'Dictionaries'
  | 'Encyclopedias'
  | 'Curriculum'
  | 'Syllabus'
  | 'Lesson Notes'
  | 'Lecture Notes'
  | 'Teacher Resources'
  | 'Past Questions'
  | 'Marking Schemes'
  | 'Practical Manuals'
  | 'Videos'
  | 'Audio Lessons'
  | 'Podcasts'
  | 'Images'
  | 'Infographics'
  | 'Presentations'
  | 'Laboratory Manuals'
  | 'School Policies'
  | 'Student Handbooks'
  | 'Parent Guides'
  | 'Academic Documents';

export type LibraryFormat =
  | 'PDF'
  | 'DOCX'
  | 'PPTX'
  | 'XLSX'
  | 'TXT'
  | 'EPUB'
  | 'ZIP'
  | 'RAR'
  | 'PNG'
  | 'JPG'
  | 'MP3'
  | 'MP4'
  | 'MOV'
  | 'HTML';

export interface TocItem {
  id: string;
  title: string;
  page?: number;
  timestamp?: number;
}

export interface LibraryResource {
  id: string;
  schoolId: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  category: LibraryCategory;
  format: LibraryFormat;
  subject: string;
  gradeClass: string; // e.g. "Grade 10", "Grade 10-12", "All Grades"
  academicYear: string;
  term: string;
  department?: string;
  description: string;
  coverImage?: string;
  fileUrl: string;
  fileSize?: string;
  pagesCount?: number;
  durationSeconds?: number;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'teacher' | 'school_admin' | 'librarian' | 'platform_owner';
  assignedGrades?: string[];
  
  // Physical & Inventory
  isPhysical?: boolean;
  totalPhysicalCopies?: number;
  availablePhysicalCopies?: number;
  damagedCopies?: number;
  lostCopies?: number;
  shelfLocation?: string;

  // Metadata & Status
  version: string;
  status: 'published' | 'draft' | 'archived';
  publishedAt: string;
  updatedAt?: string;
  downloadsCount: number;
  viewsCount: number;
  rating: number; // 0 to 5
  ratingsCount: number;
  isFeatured?: boolean;
  isRecommended?: boolean;
  tags?: string[];
  tableOfContents?: TocItem[];
  previewText?: string;

  // Media Specifics
  videoSource?: 'direct' | 'youtube' | 'drive' | 'recorded_class';
  audioSource?: 'direct' | 'podcast' | 'voice_note';
  downloadPermitted?: boolean;
  printPermitted?: boolean;
  targetAudience?: 'all' | 'teachers' | 'students' | 'parents';
  storageFilePath?: string;
  storageCoverPath?: string;
}

export interface UserLibraryBookmark {
  id: string;
  userId: string;
  schoolId: string;
  resourceId: string;
  resourceTitle: string;
  author: string;
  subject: string;
  category: LibraryCategory;
  format: LibraryFormat;
  coverImage?: string;
  fileUrl: string;
  createdAt: string;
}

export interface UserRecentlyViewed {
  id: string;
  userId: string;
  schoolId: string;
  resourceId: string;
  resourceTitle: string;
  author: string;
  subject: string;
  category: LibraryCategory;
  format: LibraryFormat;
  coverImage?: string;
  fileUrl: string;
  viewedAt: string;
}

export interface LibraryBorrowRecord {
  id: string;
  schoolId: string;
  resourceId: string;
  resourceTitle: string;
  coverImage?: string;
  format: LibraryFormat;
  studentId: string;
  studentName: string;
  studentGrade: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'borrowed' | 'returned' | 'overdue' | 'reserved';
  renewalsCount: number;
  qrCode: string;
  isbnBarcode: string;
  librarianApprovedBy?: string;
}

export interface LibraryHighlight {
  id: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  page: number;
  note?: string;
  createdAt: string;
}

export interface LibraryBookmark {
  id: string;
  page: number;
  title: string;
  createdAt: string;
}

export interface LibraryNote {
  id: string;
  page: number;
  text: string;
  createdAt: string;
}

export interface LibraryReadingProgress {
  id: string;
  userId: string;
  resourceId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastReadAt: string;
  notes: LibraryNote[];
  highlights: LibraryHighlight[];
  bookmarks: LibraryBookmark[];
  audioVideoProgress?: number; // seconds
  isOfflineCached?: boolean;
}

export interface LibraryReview {
  id: string;
  resourceId: string;
  schoolId: string;
  userId: string;
  userName: string;
  userRole: string;
  rating: number; // 1-5
  reviewText: string;
  createdAt: string;
  helpfulCount: number;
}

export interface LibraryDiscussionReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export interface LibraryDiscussion {
  id: string;
  resourceId: string;
  schoolId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  replies: LibraryDiscussionReply[];
}

export interface LibraryAnalyticsData {
  totalResources: number;
  totalDownloads: number;
  totalViews: number;
  totalReadingHours: number;
  popularCategories: Array<{ name: string; count: number }>;
  popularSubjects: Array<{ name: string; count: number }>;
  topReaders: Array<{ name: string; grade: string; booksRead: number; hoursSpent: number }>;
  recentUploadsCount: number;
  physicalBorrowedCount: number;
  digitalActiveReaders: number;
}

export interface ReaderSettings {
  theme: 'light' | 'dark' | 'sepia' | 'high_contrast';
  fontFamily: 'sans' | 'serif' | 'mono' | 'opendyslexic';
  fontSize: number; // 14 to 28
  lineHeight: number; // 1.2 to 2.0
  zoomLevel: number; // 75 to 200
  speechRate: number; // 0.75 to 1.75
  speechPitch: number; // 0.8 to 1.2
}
