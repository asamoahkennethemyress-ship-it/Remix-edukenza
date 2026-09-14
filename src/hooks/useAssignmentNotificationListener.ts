interface UserContext {
  uid: string;
  role: string;
  schoolId?: string;
  className?: string;
  studentClass?: string;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
}

export function useAssignmentNotificationListener(
  _currentUser: UserContext | null | undefined,
  _showToast?: (msg: string, type?: 'success' | 'error' | 'info', duration?: number) => void
) {
  // Listener system removed from platform per directive
  return;
}
