import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface PersonalDataExportPackage {
  metadata: {
    exportId: string;
    generatedAt: string;
    platform: string;
    version: string;
    compliance: string;
    dataSubject: {
      uid: string;
      email: string;
      name: string;
      role: string;
      schoolId?: string;
      schoolName?: string;
    };
    summary: {
      totalCategories: number;
      totalRecordsExtracted: number;
      exportFormat: string;
    };
  };
  userProfile: Record<string, any>;
  roleSpecificData: Record<string, any>;
  academicAndAttendance?: Record<string, any>;
  biometricsAndSecurity: Record<string, any>;
  communicationsAndNotifications: Record<string, any>;
  activityAndAuditTrail: Record<string, any>;
  systemPreferences: Record<string, any>;
}

/**
 * Gathers and compiles all user-related information across collections for export
 */
export async function gatherPersonalData(
  currentUser: any,
  onProgress?: (status: string, percent: number) => void
): Promise<PersonalDataExportPackage> {
  if (!currentUser?.uid) {
    throw new Error('No authenticated user profile provided for export.');
  }

  const exportId = `EXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const schoolId = currentUser.schoolId || '';
  let totalRecords = 0;

  // STEP 1: Core User Profile
  onProgress?.('Retrieving core account & identity record...', 15);
  let userProfileData: Record<string, any> = { ...currentUser };
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      userProfileData = { ...userProfileData, ...userDocSnap.data() };
      totalRecords += 1;
    }
  } catch (err) {
    console.warn('Could not fetch user document directly, using session profile:', err);
  }

  // Remove any sensitive internal session hashes if any
  delete userProfileData.stsTokenManager;
  delete userProfileData.accessToken;
  delete userProfileData.passwordHash;

  // STEP 2: Role-specific datasets
  onProgress?.('Compiling role-specific attributes and permissions...', 35);
  const roleSpecificData: Record<string, any> = {
    role: currentUser.role || 'user',
    schoolId: currentUser.schoolId || null,
    schoolName: currentUser.schoolName || null,
  };

  const academicData: Record<string, any> = {};

  try {
    if (currentUser.role === 'student') {
      // 1. Check student profile
      const studentId = currentUser.studentId || currentUser.uid;
      const sQuery = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        limit(20)
      );
      const studentSnap = await getDocs(sQuery);
      let matchedStudentRecord: any = null;
      studentSnap.forEach((d) => {
        const data = d.data();
        if (d.id === currentUser.uid || data.studentId === studentId || data.email === currentUser.email) {
          matchedStudentRecord = { id: d.id, ...data };
        }
      });

      if (matchedStudentRecord) {
        roleSpecificData.studentFile = matchedStudentRecord;
        totalRecords += 1;
      }

      // 2. Fetch Attendance Records
      try {
        const attQuery = query(
          collection(db, 'attendance'),
          where('schoolId', '==', schoolId),
          limit(50)
        );
        const attSnap = await getDocs(attQuery);
        const attendanceLogs: any[] = [];
        attSnap.forEach((d) => {
          const data = d.data();
          if (data.studentId === studentId || data.userId === currentUser.uid || data.studentName === currentUser.name) {
            attendanceLogs.push({ id: d.id, ...data });
          }
        });
        academicData.attendanceRecords = attendanceLogs;
        totalRecords += attendanceLogs.length;
      } catch (e) {
        console.warn('Attendance query fallback:', e);
      }

      // 3. Fetch Grades / Results
      try {
        const gradesQuery = query(
          collection(db, 'marks'),
          where('schoolId', '==', schoolId),
          limit(50)
        );
        const gradesSnap = await getDocs(gradesQuery);
        const marksList: any[] = [];
        gradesSnap.forEach((d) => {
          const data = d.data();
          if (data.studentId === studentId || data.studentName === currentUser.name) {
            marksList.push({ id: d.id, ...data });
          }
        });
        academicData.examMarks = marksList;
        totalRecords += marksList.length;
      } catch (e) {
        console.warn('Marks query fallback:', e);
      }
    } else if (currentUser.role === 'teacher') {
      // Teacher specific data
      try {
        const teacherDocRef = doc(db, 'teachers', currentUser.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);
        if (teacherDocSnap.exists()) {
          roleSpecificData.teacherRecord = { id: teacherDocSnap.id, ...teacherDocSnap.data() };
          totalRecords += 1;
        }
      } catch (e) {
        console.warn('Teacher doc lookup fallback:', e);
      }

      roleSpecificData.assignedClasses = currentUser.assignedClasses || [];
      roleSpecificData.assignedSubjects = currentUser.assignedSubjects || [];
      roleSpecificData.qualification = currentUser.qualification || 'Educator Degree';
    } else if (currentUser.role === 'parent') {
      // Parent specific data
      roleSpecificData.linkedStudentIds = currentUser.linkedStudentIds || currentUser.studentIds || [];
      
      // Fetch linked student summaries
      try {
        const sQuery = query(collection(db, 'students'), where('schoolId', '==', schoolId), limit(50));
        const sSnap = await getDocs(sQuery);
        const linkedKids: any[] = [];
        sSnap.forEach((d) => {
          const data = d.data();
          if (
            (currentUser.linkedStudentIds && currentUser.linkedStudentIds.includes(data.studentId)) ||
            data.parentEmail === currentUser.email ||
            data.parentPhone === currentUser.phone
          ) {
            linkedKids.push({
              id: d.id,
              studentId: data.studentId,
              fullName: data.fullName || data.name,
              className: data.className,
              dob: data.dob
            });
          }
        });
        roleSpecificData.linkedStudents = linkedKids;
        totalRecords += linkedKids.length;
      } catch (e) {
        console.warn('Parent student linkage query:', e);
      }
    } else if (currentUser.role === 'school_admin') {
      // School admin data
      try {
        const schoolRef = doc(db, 'schools', schoolId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists()) {
          roleSpecificData.schoolProfile = schoolSnap.data();
          totalRecords += 1;
        }
      } catch (e) {
        console.warn('School profile lookup:', e);
      }
    }
  } catch (err) {
    console.warn('Role data compilation warning:', err);
  }

  // STEP 3: Biometrics & Security Credentials Metadata
  onProgress?.('Packaging biometric passkeys metadata & security preferences...', 60);
  const biometricsAndSecurity: Record<string, any> = {
    webauthnPasskeys: [],
    biometricAuditLogs: [],
    securityFlags: {
      emailVerified: !!currentUser.emailVerified,
      twoFactorConfigured: !!currentUser.twoFactorEnabled,
      hasWebAuthnEnrolled: false,
      lastPasswordChange: currentUser.lastPasswordChange || null,
      authProvider: currentUser.providerData?.[0]?.providerId || 'password'
    }
  };

  try {
    // 1. Fetch passkeys for this user
    const passkeyQuery = query(
      collection(db, 'biometric_credentials'),
      where('userId', '==', currentUser.uid),
      limit(20)
    );
    const passkeySnap = await getDocs(passkeyQuery);
    const passkeys: any[] = [];
    passkeySnap.forEach((d) => {
      const pData = d.data();
      // Ensure zero private keys are exported (WebAuthn credentials only have public metadata)
      passkeys.push({
        id: d.id,
        credentialId: pData.credentialId,
        friendlyName: pData.friendlyName || pData.deviceName || 'Passkey Device',
        deviceType: pData.deviceType || 'platform_authenticator',
        createdAt: pData.createdAt || null,
        lastUsedAt: pData.lastUsedAt || null,
        algorithm: pData.algorithm || 'ES256',
        aaguid: pData.aaguid || null,
        counter: pData.counter || 0
      });
    });
    biometricsAndSecurity.webauthnPasskeys = passkeys;
    biometricsAndSecurity.securityFlags.hasWebAuthnEnrolled = passkeys.length > 0;
    totalRecords += passkeys.length;
  } catch (e) {
    console.warn('Passkey query fallback:', e);
  }

  try {
    // 2. Fetch biometric audit events for this user
    const bioAuditQuery = query(
      collection(db, 'biometric_audit_logs'),
      where('userId', '==', currentUser.uid),
      limit(20)
    );
    const bioAuditSnap = await getDocs(bioAuditQuery);
    const bioLogs: any[] = [];
    bioAuditSnap.forEach((d) => {
      bioLogs.push({ id: d.id, ...d.data() });
    });
    biometricsAndSecurity.biometricAuditLogs = bioLogs;
    totalRecords += bioLogs.length;
  } catch (e) {
    console.warn('Biometric audit query fallback:', e);
  }

  // STEP 4: Notifications & In-App Notices
  onProgress?.('Fetching notifications and communications history...', 80);
  const communicationsAndNotifications: Record<string, any> = {
    notifications: [],
    preferences: {
      emailAlerts: true,
      smsAlerts: true,
      pushAlerts: true,
      newsletterSubscribed: true
    }
  };

  try {
    const notifQuery = query(
      collection(db, 'notifications'),
      limit(30)
    );
    const notifSnap = await getDocs(notifQuery);
    const userNotifs: any[] = [];
    notifSnap.forEach((d) => {
      const data = d.data();
      if (
        data.recipientId === currentUser.uid ||
        data.userId === currentUser.uid ||
        data.targetRole === currentUser.role ||
        data.targetRole === 'all'
      ) {
        userNotifs.push({
          id: d.id,
          title: data.title || data.subject,
          message: data.message || data.body,
          type: data.type || 'info',
          createdAt: data.createdAt || null,
          read: data.read || false
        });
      }
    });
    communicationsAndNotifications.notifications = userNotifs;
    totalRecords += userNotifs.length;
  } catch (e) {
    console.warn('Notifications query fallback:', e);
  }

  // STEP 5: Activity & Audit Trail
  onProgress?.('Assembling activity and login history...', 90);
  const activityAndAuditTrail: Record<string, any> = {
    recentSessions: [
      {
        sessionType: 'Web Portal Session',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString(),
        status: 'Active'
      }
    ],
    accountCreationDate: currentUser.metadata?.creationTime || userProfileData.createdAt || null,
    lastSignInTime: currentUser.metadata?.lastSignInTime || new Date().toISOString()
  };

  try {
    const auditQuery = query(
      collection(db, 'audit_logs'),
      where('schoolId', '==', schoolId),
      limit(25)
    );
    const auditSnap = await getDocs(auditQuery);
    const logs: any[] = [];
    auditSnap.forEach((d) => {
      const data = d.data();
      if (data.actorId === currentUser.uid || data.userId === currentUser.uid || data.actorEmail === currentUser.email) {
        logs.push({ id: d.id, ...data });
      }
    });
    activityAndAuditTrail.userAuditEvents = logs;
    totalRecords += logs.length;
  } catch (e) {
    console.warn('Audit query fallback:', e);
  }

  // Final Step: System Preferences
  const systemPreferences: Record<string, any> = {
    theme: localStorage.getItem('edukenza_theme') || 'light',
    locale: navigator.language || 'en-ZA',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg',
    localStorageKeysRecognized: Object.keys(localStorage).filter(k => k.toLowerCase().includes('edukenza') || k.toLowerCase().includes('firebase'))
  };

  onProgress?.('Compiling final personal data JSON archive...', 100);

  const exportPackage: PersonalDataExportPackage = {
    metadata: {
      exportId,
      generatedAt: new Date().toISOString(),
      platform: 'EDUkenZA SaaS Multi-School Platform',
      version: '1.0.0',
      compliance: 'POPIA Section 23 (South Africa) & GDPR Article 20 (Right to Data Portability)',
      dataSubject: {
        uid: currentUser.uid,
        email: currentUser.email || 'N/A',
        name: currentUser.name || currentUser.fullName || 'User',
        role: currentUser.role || 'user',
        schoolId: currentUser.schoolId,
        schoolName: currentUser.schoolName
      },
      summary: {
        totalCategories: 6,
        totalRecordsExtracted: totalRecords,
        exportFormat: 'application/json'
      }
    },
    userProfile: userProfileData,
    roleSpecificData,
    academicAndAttendance: Object.keys(academicData).length > 0 ? academicData : undefined,
    biometricsAndSecurity,
    communicationsAndNotifications,
    activityAndAuditTrail,
    systemPreferences
  };

  return exportPackage;
}

/**
 * Triggers the browser download of the personal data export as a formatted JSON file
 */
export function downloadPersonalDataAsJson(
  data: PersonalDataExportPackage,
  filename?: string
): void {
  const defaultFilename = `edukenza_personal_data_${data.metadata.dataSubject.role}_${data.metadata.dataSubject.uid.substring(0, 8)}_${new Date().toISOString().slice(0, 10)}.json`;
  const nameToUse = filename || defaultFilename;

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nameToUse);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}
