export type UserContentType = 
  | 'voice_dictation'
  | 'ai_resource'
  | 'assignment_draft'
  | 'notes'
  | 'document'
  | 'learning_resource'
  | 'draft'
  | 'personal_saved';

export type UserShareScope = 'private' | 'class' | 'school' | 'public';

export interface UserContentItem {
  id: string;
  // Security & Ownership
  ownerUid: string;           // Authenticated Firebase Auth UID
  createdBy: string;          // Authenticated Firebase Auth UID (synonymous for backward compatibility)
  creatorName: string;
  creatorEmail?: string;
  ownerRole: string;
  schoolId: string;

  // Content Data
  title: string;
  content: string;
  type: UserContentType;
  category: string;
  tags?: string[];

  // Target Class / Subject (for school & classroom context)
  targetClass?: string;
  className?: string;
  subjectName?: string;
  studentId?: string;
  studentName?: string;

  // Sharing Settings
  isShared: boolean;
  shareScope: UserShareScope;
  sharedWithClasses?: string[];
  sharedWithRoles?: string[];
  sharedAt?: any;

  // Metadata
  metadata?: Record<string, any>;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
  dateFormatted?: string;
}

export interface ContentPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canCopy: boolean;
  canShare: boolean;
  canDownload: boolean;
  canReuse: boolean;
  isOwner: boolean;
}

export function evaluateContentPermissions(
  content: UserContentItem | any,
  currentUser: any
): ContentPermissions {
  if (!currentUser) {
    return {
      canEdit: false,
      canDelete: false,
      canCopy: false,
      canShare: false,
      canDownload: false,
      canReuse: false,
      isOwner: false,
    };
  }

  const currentUid = currentUser.uid || currentUser.id;
  const currentRole = (currentUser.role || '').toLowerCase();
  
  // Platform Owner has full administrative control
  const isPlatformOwner = 
    currentRole === 'platform_owner' ||
    currentUser.email === 'anastasiaappiahkwaa@gmail.com' ||
    currentUser.email === 'asamoahkennethemyress@gmail.com' ||
    currentUser.email === 'kennethasamoa@gmail.com';

  // Ownership check
  const isOwner = 
    content.ownerUid === currentUid || 
    content.createdBy === currentUid ||
    content.teacherId === currentUid ||
    content.userId === currentUid;

  // School Admin permissions: Can manage school-owned content within their school
  const isSchoolAdminOfContent = 
    (currentRole === 'school_admin' || currentRole === 'schooladmin') &&
    currentUser.schoolId &&
    content.schoolId &&
    currentUser.schoolId === content.schoolId;

  // Teacher permissions: Can share teaching content with authorized classes
  const isTeacher = currentRole === 'teacher';

  const canEdit = isOwner || isPlatformOwner || (isSchoolAdminOfContent && content.ownerRole !== 'platform_owner');
  const canDelete = isOwner || isPlatformOwner || (isSchoolAdminOfContent && content.ownerRole !== 'platform_owner');
  const canCopy = true; // Any accessible content can be copied or duplicated into user's own space
  const canDownload = true; // Any accessible content can be downloaded
  const canReuse = true; // Content can be reloaded into dictation, AI workspace, or editor
  
  // Sharing permission: Owner, Platform Owner, or School Admin. Teachers can share teaching content.
  const canShare = isOwner || isPlatformOwner || isSchoolAdminOfContent;

  return {
    canEdit,
    canDelete,
    canCopy,
    canShare,
    canDownload,
    canReuse,
    isOwner
  };
}
