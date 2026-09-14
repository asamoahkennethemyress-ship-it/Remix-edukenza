export type BackupScope = 'platform' | 'school';

export type BackupType = 'full' | 'partial';

export type BackupFormat = 'json' | 'zip';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'disabled';

export interface CollectionBackupMeta {
  collectionName: string;
  label: string;
  recordCount: number;
}

export interface BackupMetadata {
  backupId: string;
  schoolId: string;
  schoolName?: string;
  backupType: BackupType;
  scope: BackupScope;
  createdBy: string;
  createdByUid: string;
  role: string;
  dateCreated: string;
  edukenzaVersion: string;
  totalRecords: number;
  collectionsIncluded: string[];
  fileFormat: BackupFormat;
  scheduleFrequency?: ScheduleFrequency;
}

export interface BackupPackage {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

export interface BackupHistoryRecord {
  id: string;
  backupId: string;
  schoolId: string;
  schoolName?: string;
  createdBy: string;
  createdByUid: string;
  role: string;
  backupType: BackupType;
  collectionsIncluded: string[];
  totalRecords: number;
  fileSize: string;
  fileFormat: BackupFormat;
  storagePath: string;
  downloadUrl?: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'in_progress';
  errorMessage?: string;
}

export interface RestoreHistoryRecord {
  id: string;
  restoreId: string;
  backupId: string;
  restoredBy: string;
  restoredByUid: string;
  role: string;
  schoolId: string;
  restoredCollections: string[];
  totalRecords: number;
  restoredAt: string;
  status: 'completed' | 'failed' | 'partially_restored';
  impactSummary?: string;
  errorMessage?: string;
}

export interface AutomaticBackupSettings {
  enabled: boolean;
  frequency: ScheduleFrequency;
  timeOfDay: string; // e.g. "02:00"
  selectedCollections: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  notifyEmail: string;
  autoDeleteDays: number;
}

export interface SystemHealthCheckResult {
  firestoreConnected: boolean;
  storageConnected: boolean;
  availableStorageEstimatedMB: number;
  collectionAccessStatus: Record<string, boolean>;
  checkedAt: string;
}
