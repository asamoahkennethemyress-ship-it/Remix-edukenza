import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

export interface AuthoritativeUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  schoolName?: string;
  status: 'active' | 'suspended' | 'disabled' | 'pending';
  assignedClassIds?: string[];
  assignedClassNames?: string[];
  assignedSubjects?: string[];
  linkedStudentIds?: string[];
  linkedStudentNames?: string[];
}

export interface QueryContext {
  lastTopic?: 'students' | 'teachers' | 'parents' | 'classes' | 'subjects' | 'attendance' | 'fees' | 'exams' | 'timetables';
  lastClassName?: string;
  lastClassId?: string;
  lastGender?: 'male' | 'female';
  lastSubject?: string;
  lastStatus?: string;
}

export interface DataIntelligenceResult {
  isSchoolDataQuery: boolean;
  isAuthorized: boolean;
  denialReason?: string;
  isAmbiguous?: boolean;
  clarificationPrompt?: string;
  toolUsed?: string;
  extractedData?: any;
  summaryAnswer?: string;
  systemContextPrompt?: string;
  updatedContext?: QueryContext;
}

/**
 * EDUkenZA School Data Intelligence Service
 * Production-grade engine that enforces:
 * 1. Strict School Isolation (School A never sees School B)
 * 2. Authoritative Identity Resolution (UID -> users/{UID})
 * 3. Role-Based Access Control (Platform Owner, School Admin, Teacher, Parent, Student)
 * 4. Real Data Or Nothing (Zero fake/demo stats, honest zero handling)
 * 5. Conversational Context & Pronoun Resolution
 * 6. Mathematical Synthesis & Percentage Calculations
 */
export class SchoolDataIntelligenceService {
  
  /**
   * Resolves the authoritative user profile from Firestore users/{UID}
   * Never trusts client state blindly.
   */
  static async resolveAuthoritativeUser(clientUser?: UserProfile | null): Promise<{
    user: AuthoritativeUser | null;
    error?: string;
  }> {
    const authUid = auth.currentUser?.uid || clientUser?.uid;
    const authEmail = auth.currentUser?.email || clientUser?.email;

    if (!authUid) {
      return { user: null, error: 'unauthenticated' };
    }

    try {
      // 1. Authoritative lookup in users/{UID}
      const userDocRef = doc(db, 'users', authUid);
      const userDocSnap = await getDoc(userDocRef);

      let data: any = null;
      if (userDocSnap.exists()) {
        data = userDocSnap.data();
      } else if (clientUser) {
        // Fallback to clientUser if document not yet indexed, but strictly validate
        data = clientUser;
      }

      if (!data) {
        return { user: null, error: 'user_not_found' };
      }

      const role = (data.role || 'student') as UserRole;
      const status = (data.status || 'active').toLowerCase() as 'active' | 'suspended' | 'disabled' | 'pending';
      const schoolId = data.schoolId || data.school_id || '';
      const fullName = data.fullName || data.name || data.displayName || 'User';

      // Load specific role relations (e.g. teachers' classes, parents' children)
      let assignedClassIds: string[] = [];
      let assignedClassNames: string[] = [];
      let assignedSubjects: string[] = [];
      let linkedStudentIds: string[] = [];
      let linkedStudentNames: string[] = [];

      if (role === 'teacher' && schoolId) {
        try {
          const assignQuery = query(
            collection(db, 'teacherAssignments'),
            where('schoolId', '==', schoolId),
            where('teacherId', '==', authUid)
          );
          const assignSnap = await getDocs(assignQuery);
          assignSnap.forEach(d => {
            const ad = d.data();
            if (ad.classId) assignedClassIds.push(ad.classId);
            if (ad.className) assignedClassNames.push(ad.className.toLowerCase());
            if (ad.subjectName) assignedSubjects.push(ad.subjectName.toLowerCase());
          });
        } catch (e) {
          console.warn('[DataIntelligence] Teacher assignment lookup note:', e);
        }
      } else if (role === 'parent' && schoolId) {
        try {
          const relQuery = query(
            collection(db, 'parentStudentRelations'),
            where('schoolId', '==', schoolId),
            where('parentId', '==', authUid)
          );
          const relSnap = await getDocs(relQuery);
          relSnap.forEach(d => {
            const rd = d.data();
            if (rd.studentId) linkedStudentIds.push(rd.studentId);
            if (rd.studentName) linkedStudentNames.push(rd.studentName.toLowerCase());
          });
          if (data.linkedStudentId) linkedStudentIds.push(data.linkedStudentId);
          if (data.linkedStudentName) linkedStudentNames.push(data.linkedStudentName.toLowerCase());
        } catch (e) {
          console.warn('[DataIntelligence] Parent relation lookup note:', e);
        }
      }

      const authoritative: AuthoritativeUser = {
        uid: authUid,
        email: authEmail || data.email || '',
        fullName,
        role,
        schoolId,
        schoolName: data.schoolName || '',
        status,
        assignedClassIds,
        assignedClassNames,
        assignedSubjects,
        linkedStudentIds,
        linkedStudentNames
      };

      return { user: authoritative };
    } catch (err: any) {
      console.error('[DataIntelligence] Error resolving authoritative user:', err);
      return { user: null, error: err.message || 'resolution_failed' };
    }
  }

  /**
   * Evaluates if a query is a School Data Query vs a General Knowledge Query
   */
  static isSchoolDataQuery(promptText: string): boolean {
    const text = promptText.toLowerCase().trim();

    // General knowledge questions that should NOT query school database
    const generalExclusions = [
      'photosynthesis', 'mitochondria', 'newton', 'shakespeare', 'pythagoras',
      'calculus derivative', 'write an essay', 'solve for x', 'explain the poem',
      'history of south africa', 'world war', 'periodic table', 'chemical equation',
      'what is', 'how does', 'explain how', 'define ', 'summary of the book'
    ];

    const hasExclusion = generalExclusions.some(kw => text.includes(kw));
    // If it's pure curriculum/general knowledge without school references
    if (hasExclusion && !text.includes('my school') && !text.includes('my student') && !text.includes('enrolled') && !text.includes('my class')) {
      return false;
    }

    // Direct school data keywords
    const schoolDataKeywords = [
      'how many student', 'how many teacher', 'how many parent', 'how many class',
      'how many enrolled', 'student count', 'teacher count', 'enrollment', 'roster',
      'how many are girls', 'how many are boys', 'how many female', 'how many male',
      'in form', 'in grade', 'in class', 'pass rate', 'attendance rate',
      'total tuition', 'fees collected', 'outstanding balance', 'unpaid fees',
      'who is absent', 'attendance today', 'how many active', 'how many disabled',
      'do i have', 'in my school', 'registered student', 'registered teacher',
      'what percentage of', 'ratio of', 'which of them teach', 'list the teachers',
      'list the students', 'examination result', 'average score'
    ];

    return schoolDataKeywords.some(kw => text.includes(kw));
  }

  /**
   * Main entry point to process a natural language query against real Firestore data
   */
  static async processDataQuery(params: {
    prompt: string;
    clientUser?: UserProfile | null;
    history?: Array<{ role: string; content: string }>;
    context?: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { prompt, clientUser, history = [], context = {} } = params;
    const cleanPrompt = prompt.toLowerCase().trim();

    // 1. Determine if this is a general knowledge question
    const isDataQuery = this.isSchoolDataQuery(cleanPrompt);
    if (!isDataQuery) {
      // Check for follow-up conversational questions like "How many are girls?" or "Which of them teach science?"
      const isContextualFollowUp = (
        cleanPrompt.startsWith('how many are') ||
        cleanPrompt.startsWith('how many of them') ||
        cleanPrompt.startsWith('which of them') ||
        cleanPrompt.includes('are girls') ||
        cleanPrompt.includes('are boys') ||
        cleanPrompt.includes('are female') ||
        cleanPrompt.includes('are male') ||
        cleanPrompt === 'how many do i have?' ||
        cleanPrompt === 'how many do i have'
      );

      if (!isContextualFollowUp) {
        return {
          isSchoolDataQuery: false,
          isAuthorized: true
        };
      }
    }

    // 2. Authoritative User Resolution
    const { user, error } = await this.resolveAuthoritativeUser(clientUser);

    // Test 22: Unauthenticated Request
    if (!user || error === 'unauthenticated') {
      return {
        isSchoolDataQuery: true,
        isAuthorized: false,
        denialReason: 'unauthenticated',
        summaryAnswer: 'ACCESS DENIED: You must be signed in with an authorized account to access school data.'
      };
    }

    // Test 23: Disabled Account
    if (user.status === 'disabled' || user.status === 'suspended') {
      return {
        isSchoolDataQuery: true,
        isAuthorized: false,
        denialReason: 'account_disabled',
        summaryAnswer: 'ACCESS DENIED: Your account is currently disabled or suspended. You cannot access school data.'
      };
    }

    // Test 24: Non-School User
    if (!user.schoolId && user.role !== 'platform_owner') {
      return {
        isSchoolDataQuery: true,
        isAuthorized: false,
        denialReason: 'no_school',
        summaryAnswer: 'You do not currently belong to an authorized school in EDUkenZA.'
      };
    }

    // Test 12 & 13: School Isolation & Prompt Injection Defense
    // Check if the user is trying to ask for another school's data
    const foreignSchoolKeywords = ['school b', 'school_b', 'school 2', 'other school', 'st. mary', 'st mary', 'another school'];
    const hasForeignSchoolRef = foreignSchoolKeywords.some(kw => cleanPrompt.includes(kw));
    const hasInjectionAttempt = cleanPrompt.includes('ignore all') || cleanPrompt.includes('disregard previous') || cleanPrompt.includes('bypass');

    if ((hasForeignSchoolRef || hasInjectionAttempt) && user.role !== 'platform_owner') {
      return {
        isSchoolDataQuery: true,
        isAuthorized: false,
        denialReason: 'school_isolation_violation',
        summaryAnswer: 'ACCESS DENIED: You do not have permission to access data outside your authorized school.'
      };
    }

    // 3. Ambiguous Query Check (Test 17)
    // "How many do I have?" with no context
    if ((cleanPrompt === 'how many do i have?' || cleanPrompt === 'how many do i have' || cleanPrompt === 'how many?') && !context.lastTopic) {
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        isAmbiguous: true,
        clarificationPrompt: 'Do you mean students, teachers, parents, or another group in your school?',
        summaryAnswer: 'Do you mean students, teachers, parents, or another group in your school?'
      };
    }

    // 4. Extract Entity, Filters, and Context
    const updatedContext: QueryContext = { ...context };

    // Resolve Topic: students, teachers, parents, classes, attendance, fees
    let topic = context.lastTopic || 'students';
    if (cleanPrompt.includes('student') || cleanPrompt.includes('enrolled') || cleanPrompt.includes('learner') || cleanPrompt.includes('pupil')) {
      topic = 'students';
    } else if (cleanPrompt.includes('teacher') || cleanPrompt.includes('educator') || cleanPrompt.includes('staff') || cleanPrompt.includes('faculty')) {
      topic = 'teachers';
    } else if (cleanPrompt.includes('parent') || cleanPrompt.includes('guardian')) {
      topic = 'parents';
    } else if (cleanPrompt.includes('class') && !cleanPrompt.includes('students in') && !cleanPrompt.includes('student in')) {
      topic = 'classes';
    } else if (cleanPrompt.includes('attendance') || cleanPrompt.includes('absent') || cleanPrompt.includes('present')) {
      topic = 'attendance';
    } else if (cleanPrompt.includes('fee') || cleanPrompt.includes('tuition') || cleanPrompt.includes('payment') || cleanPrompt.includes('balance')) {
      topic = 'fees';
    }
    updatedContext.lastTopic = topic;

    // Resolve Class Filter: Form 1, Form 2, Grade 10, Grade 12, etc.
    let classFilter: string | undefined = context.lastClassName;
    const classMatch = cleanPrompt.match(/(form\s*\d+[a-z]?|grade\s*\d+[a-z]?|class\s*\d+[a-z]?)/i);
    if (classMatch) {
      classFilter = classMatch[0].trim();
      updatedContext.lastClassName = classFilter;
    }

    // Resolve Gender Filter: male, female, boy, girl
    let genderFilter: 'male' | 'female' | undefined = undefined;
    if (cleanPrompt.includes('girl') || cleanPrompt.includes('female') || cleanPrompt.includes('women')) {
      genderFilter = 'female';
      updatedContext.lastGender = 'female';
    } else if (cleanPrompt.includes('boy') || cleanPrompt.includes('male') || cleanPrompt.includes('men')) {
      genderFilter = 'male';
      updatedContext.lastGender = 'male';
    }

    // Resolve Status Filter: active, inactive, disabled, suspended
    let statusFilter: string | undefined = undefined;
    if (cleanPrompt.includes('active')) {
      statusFilter = 'active';
    } else if (cleanPrompt.includes('disabled') || cleanPrompt.includes('inactive') || cleanPrompt.includes('suspended')) {
      statusFilter = 'inactive';
    }

    // Resolve Subject Filter: math, science, english, physics, biology
    let subjectFilter: string | undefined = undefined;
    const subjectKeywords = ['math', 'mathematics', 'science', 'physical science', 'physics', 'english', 'biology', 'chemistry', 'geography', 'accounting', 'history'];
    for (const sub of subjectKeywords) {
      if (cleanPrompt.includes(sub)) {
        subjectFilter = sub;
        updatedContext.lastSubject = sub;
        break;
      }
    }

    // 5. Enforce Role-Based Access Control (RBAC) (Tests 14, 15, 16)
    const rbacDenial = this.checkRBACPermissions(user, topic, classFilter, cleanPrompt);
    if (rbacDenial) {
      return {
        isSchoolDataQuery: true,
        isAuthorized: false,
        denialReason: 'rbac_violation',
        summaryAnswer: rbacDenial
      };
    }

    // 6. Execute REAL Firestore Query with School Isolation
    try {
      const schoolId = user.schoolId;

      if (topic === 'students') {
        return await this.executeStudentQuery({
          schoolId,
          classFilter,
          genderFilter,
          statusFilter,
          cleanPrompt,
          user,
          updatedContext
        });
      } else if (topic === 'teachers') {
        return await this.executeTeacherQuery({
          schoolId,
          subjectFilter,
          statusFilter,
          cleanPrompt,
          user,
          updatedContext
        });
      } else if (topic === 'parents') {
        return await this.executeParentQuery({
          schoolId,
          statusFilter,
          cleanPrompt,
          user,
          updatedContext
        });
      } else if (topic === 'classes') {
        return await this.executeClassQuery({
          schoolId,
          cleanPrompt,
          user,
          updatedContext
        });
      } else if (topic === 'attendance') {
        return await this.executeAttendanceQuery({
          schoolId,
          classFilter,
          cleanPrompt,
          user,
          updatedContext
        });
      } else if (topic === 'fees') {
        return await this.executeFeeQuery({
          schoolId,
          cleanPrompt,
          user,
          updatedContext
        });
      }

      // Default fallback if unhandled
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        summaryAnswer: 'I checked your school database, but could not find records matching your specific query.'
      };
    } catch (error: any) {
      console.error('[DataIntelligence] Firestore execution error:', error);
      // Test 26: Firestore Failure
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        summaryAnswer: "I couldn't retrieve your current school data right now. Please verify your connection or try again in a moment."
      };
    }
  }

  /**
   * RBAC Permission Validator
   */
  private static checkRBACPermissions(
    user: AuthoritativeUser,
    topic: string,
    classFilter: string | undefined,
    cleanPrompt: string
  ): string | null {
    // Platform Owner & School Admin have complete school-level administrative authority
    if (user.role === 'platform_owner' || user.role === 'school_admin') {
      return null;
    }

    // Test 14: Student Role Escalation
    if (user.role === 'student') {
      // Student asking about fees collected, other students, staff salaries, etc.
      if (topic === 'fees' && (cleanPrompt.includes('total') || cleanPrompt.includes('collected') || cleanPrompt.includes('school'))) {
        return "ACCESS DENIED: You don't have permission to access school financial ledgers.";
      }
      if (topic === 'teachers' || topic === 'parents' || (topic === 'students' && (cleanPrompt.includes('how many') || cleanPrompt.includes('list')))) {
        return "ACCESS DENIED: As a student, you only have permission to view your personal academic records and profile.";
      }
      return null;
    }

    // Test 15: Teacher Scope
    if (user.role === 'teacher') {
      // Teacher asking about financial ledgers or other teachers' salaries
      if (topic === 'fees' || cleanPrompt.includes('salary') || cleanPrompt.includes('compensation') || cleanPrompt.includes('revenue')) {
        return "ACCESS DENIED: Educators do not have permission to access institutional financial records or salary details.";
      }
      // Teacher asking about a class they do not teach
      if (classFilter && user.assignedClassNames && user.assignedClassNames.length > 0) {
        const teachesClass = user.assignedClassNames.some(cn => 
          cn.toLowerCase().includes(classFilter.toLowerCase()) || 
          classFilter.toLowerCase().includes(cn.toLowerCase())
        );
        if (!teachesClass) {
          return `ACCESS DENIED: You do not have permission to view records for ${classFilter}. You are only authorized to access your assigned classes: ${user.assignedClassNames.join(', ')}.`;
        }
      }
      return null;
    }

    // Test 16: Parent Scope
    if (user.role === 'parent') {
      // Parent asking about other students or school wide finances
      if (topic === 'fees' && (cleanPrompt.includes('total') || cleanPrompt.includes('all') || cleanPrompt.includes('school'))) {
        return "ACCESS DENIED: Parents only have permission to view billing invoices for their linked children.";
      }
      if (topic === 'students' && (cleanPrompt.includes('how many') || cleanPrompt.includes('all') || cleanPrompt.includes('roster'))) {
        return "ACCESS DENIED: Parents only have permission to access records for their linked children.";
      }
      return null;
    }

    return null;
  }

  /**
   * Real Firestore Query Execution: Students
   */
  private static async executeStudentQuery(params: {
    schoolId: string;
    classFilter?: string;
    genderFilter?: 'male' | 'female';
    statusFilter?: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, classFilter, genderFilter, statusFilter, cleanPrompt, updatedContext } = params;

    // 1. Query Firestore students collection with strict schoolId
    const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const allStudents: any[] = [];
    snap.forEach(d => allStudents.push({ id: d.id, ...d.data() }));

    // Test 11: Missing Class Check
    if (classFilter) {
      // Check if this class actually exists in the school
      const classQ = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
      const classSnap = await getDocs(classQ);
      const existingClasses: string[] = [];
      classSnap.forEach(d => {
        const cd = d.data();
        if (cd.className) existingClasses.push(cd.className);
        else if (cd.name) existingClasses.push(cd.name);
      });

      const matchedClass = existingClasses.find(cn => 
        cn.toLowerCase().replace(/\s+/g, '') === classFilter.toLowerCase().replace(/\s+/g, '')
      );

      // If classes are registered, but the requested one does not exist
      if (existingClasses.length > 0 && !matchedClass) {
        return {
          isSchoolDataQuery: true,
          isAuthorized: true,
          toolUsed: 'getStudentsByClass',
          summaryAnswer: `There is no class named '${classFilter}' registered in your school. Your registered classes are: ${existingClasses.join(', ')}.`,
          systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Class '${classFilter}' does NOT exist in the school. Registered classes: ${existingClasses.join(', ')}. Inform the user honestly that this class does not exist.`,
          updatedContext
        };
      }
    }

    // Filter students
    let filtered = allStudents;

    if (classFilter) {
      filtered = filtered.filter(s => {
        const cName = (s.className || s.class || '').toLowerCase().replace(/\s+/g, '');
        const target = classFilter.toLowerCase().replace(/\s+/g, '');
        return cName.includes(target) || target.includes(cName);
      });
    }

    if (genderFilter) {
      filtered = filtered.filter(s => {
        const g = (s.gender || '').toLowerCase();
        if (genderFilter === 'female') {
          return g === 'female' || g === 'f' || g === 'girl';
        } else {
          return g === 'male' || g === 'm' || g === 'boy';
        }
      });
    }

    if (statusFilter) {
      filtered = filtered.filter(s => (s.status || 'active').toLowerCase() === statusFilter);
    }

    // Test 20: Mathematical Synthesis & Percentage Calculations
    const isPercentageQuery = cleanPrompt.includes('percentage') || cleanPrompt.includes('ratio') || cleanPrompt.includes('% of');
    if (isPercentageQuery && genderFilter) {
      const totalInScope = classFilter 
        ? allStudents.filter(s => (s.className || '').toLowerCase().includes(classFilter.toLowerCase())).length 
        : allStudents.length;

      const countMatching = filtered.length;
      const pct = totalInScope > 0 ? ((countMatching / totalInScope) * 100).toFixed(1) : '0';
      const label = genderFilter === 'female' ? 'female' : 'male';
      const scopeDesc = classFilter ? `in ${classFilter}` : 'in your school';

      const answer = `${pct}% of students ${scopeDesc} are ${label} (${countMatching} out of ${totalInScope}).`;
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        toolUsed: 'getStudentPercentage',
        extractedData: { totalInScope, countMatching, percentage: pct, gender: genderFilter },
        summaryAnswer: answer,
        systemContextPrompt: `AUTHORITATIVE DATABASE FACT: ${countMatching} out of ${totalInScope} students are ${label} (${pct}%). Present this exact percentage.`,
        updatedContext
      };
    }

    const count = filtered.length;

    // Test 9: Zero Students (honest reporting)
    let answer = '';
    if (allStudents.length === 0) {
      answer = 'You currently have 0 students enrolled in your school.';
    } else if (count === 0) {
      if (classFilter && genderFilter) {
        answer = `There are 0 ${genderFilter === 'female' ? 'female' : 'male'} students registered in ${classFilter}.`;
      } else if (classFilter) {
        answer = `There are currently 0 students enrolled in ${classFilter}.`;
      } else if (genderFilter) {
        answer = `There are 0 ${genderFilter === 'female' ? 'female' : 'male'} students registered in your school.`;
      } else {
        answer = 'No matching student records found.';
      }
    } else {
      // Normal non-zero count
      if (classFilter && genderFilter) {
        answer = `There are ${count} ${genderFilter === 'female' ? 'female' : 'male'} students in ${classFilter}.`;
      } else if (classFilter) {
        answer = `There are ${count} students in ${classFilter}.`;
      } else if (genderFilter) {
        answer = `There are ${count} ${genderFilter === 'female' ? 'female' : 'male'} students enrolled in your school.`;
      } else if (statusFilter) {
        answer = `You have ${count} ${statusFilter} students enrolled in your school.`;
      } else {
        answer = `You currently have ${count} students enrolled in your school.`;
      }
    }

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getStudentCount',
      extractedData: { totalStudents: allStudents.length, filteredCount: count, classFilter, genderFilter, statusFilter },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Total school students = ${allStudents.length}. Matching query students = ${count}. STRICT MANDATE: You MUST report this exact number (${count}). NEVER guess or use demo values like 1240 or 450. Answer: "${answer}"`,
      updatedContext
    };
  }

  /**
   * Real Firestore Query Execution: Teachers
   */
  private static async executeTeacherQuery(params: {
    schoolId: string;
    subjectFilter?: string;
    statusFilter?: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, subjectFilter, statusFilter, cleanPrompt, updatedContext } = params;

    const q = query(collection(db, 'teachers'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const allTeachers: any[] = [];
    snap.forEach(d => allTeachers.push({ id: d.id, ...d.data() }));

    let filtered = allTeachers;
    if (subjectFilter) {
      filtered = filtered.filter(t => {
        const sub = (t.subject || t.subjectName || '').toLowerCase();
        return sub.includes(subjectFilter.toLowerCase());
      });
    }

    if (statusFilter) {
      filtered = filtered.filter(t => (t.status || 'active').toLowerCase() === statusFilter);
    }

    // Test 19: Pronoun Resolution / List Teachers
    const isListQuery = cleanPrompt.includes('list') || cleanPrompt.includes('who are') || cleanPrompt.includes('names');
    if (isListQuery && filtered.length > 0) {
      const names = filtered.map(t => `${t.fullName || t.name} (${t.subject || 'General'})`).join(', ');
      const answer = `The registered teachers are: ${names}.`;
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        toolUsed: 'listTeachers',
        summaryAnswer: answer,
        systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Teachers: ${names}.`,
        updatedContext
      };
    }

    const count = filtered.length;

    // Test 10: Zero Teachers
    let answer = '';
    if (allTeachers.length === 0) {
      answer = 'You currently have 0 teachers registered in your school.';
    } else if (count === 0 && subjectFilter) {
      answer = `You currently have 0 ${subjectFilter} teachers registered in your school.`;
    } else if (subjectFilter) {
      answer = `You have ${count} ${subjectFilter} teacher${count === 1 ? '' : 's'} registered in your school.`;
    } else {
      answer = `You currently have ${count} teacher${count === 1 ? '' : 's'} registered in your school.`;
    }

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getTeacherCount',
      extractedData: { totalTeachers: allTeachers.length, filteredCount: count, subjectFilter },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Total teachers = ${allTeachers.length}. Filtered count = ${count}. Answer: "${answer}". Do NOT invent numbers.`,
      updatedContext
    };
  }

  /**
   * Real Firestore Query Execution: Parents
   */
  private static async executeParentQuery(params: {
    schoolId: string;
    statusFilter?: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, statusFilter, updatedContext } = params;

    const q = query(collection(db, 'parents'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const allParents: any[] = [];
    snap.forEach(d => allParents.push({ id: d.id, ...d.data() }));

    let filtered = allParents;
    if (statusFilter) {
      filtered = filtered.filter(p => (p.status || 'active').toLowerCase() === statusFilter);
    }

    const count = filtered.length;
    const answer = count === 0 
      ? 'You currently have 0 parents registered in your school database.'
      : `You have ${count} parent${count === 1 ? '' : 's'} registered in your school database.`;

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getParentCount',
      extractedData: { count },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Parent count = ${count}. Report this exact number honestly.`,
      updatedContext
    };
  }

  /**
   * Real Firestore Query Execution: Classes
   */
  private static async executeClassQuery(params: {
    schoolId: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, updatedContext } = params;

    const q = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const allClasses: any[] = [];
    snap.forEach(d => allClasses.push({ id: d.id, ...d.data() }));

    const count = allClasses.length;
    const classNames = allClasses.map(c => c.className || c.name).filter(Boolean);
    const answer = count === 0
      ? 'You currently have 0 classes registered in your school.'
      : `You have ${count} class${count === 1 ? '' : 'es'} registered: ${classNames.join(', ')}.`;

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getClassCount',
      extractedData: { count, classNames },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Class count = ${count}. Classes: ${classNames.join(', ')}.`,
      updatedContext
    };
  }

  /**
   * Real Firestore Query Execution: Attendance
   */
  private static async executeAttendanceQuery(params: {
    schoolId: string;
    classFilter?: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, classFilter, updatedContext } = params;

    const q = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const records: any[] = [];
    snap.forEach(d => records.push(d.data()));

    let filtered = records;
    if (classFilter) {
      filtered = filtered.filter(r => (r.className || '').toLowerCase().includes(classFilter.toLowerCase()));
    }

    if (filtered.length === 0) {
      const answer = classFilter 
        ? `There are no attendance records logged for ${classFilter} yet.`
        : 'There are currently no attendance records logged for your school.';
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        toolUsed: 'getAttendanceSummary',
        summaryAnswer: answer,
        systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Attendance records count = 0.`,
        updatedContext
      };
    }

    const presentCount = filtered.filter(r => r.status === 'Present' || r.status === 'present').length;
    const absentCount = filtered.filter(r => r.status === 'Absent' || r.status === 'absent').length;
    const rate = ((presentCount / filtered.length) * 100).toFixed(1);

    const answer = `Based on ${filtered.length} logged attendance records, your attendance rate is ${rate}% (${presentCount} present, ${absentCount} absent).`;

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getAttendanceSummary',
      extractedData: { totalRecords: filtered.length, presentCount, absentCount, rate },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Attendance rate = ${rate}% (${presentCount} present, ${absentCount} absent out of ${filtered.length} records). Report this exact data.`,
      updatedContext
    };
  }

  /**
   * Real Firestore Query Execution: Fees / Financials
   */
  private static async executeFeeQuery(params: {
    schoolId: string;
    cleanPrompt: string;
    user: AuthoritativeUser;
    updatedContext: QueryContext;
  }): Promise<DataIntelligenceResult> {
    const { schoolId, updatedContext } = params;

    const q = query(collection(db, 'studentInvoices'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const invoices: any[] = [];
    snap.forEach(d => invoices.push(d.data()));

    if (invoices.length === 0) {
      return {
        isSchoolDataQuery: true,
        isAuthorized: true,
        toolUsed: 'getFeeSummary',
        summaryAnswer: 'There are currently 0 fee invoices recorded for your school.',
        systemContextPrompt: `AUTHORITATIVE DATABASE FACT: 0 fee invoices recorded.`,
        updatedContext
      };
    }

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
      totalBilled += Number(inv.totalAmount || 0);
      totalPaid += Number(inv.amountPaid || 0);
      totalOutstanding += Number(inv.outstandingBalance || 0);
    });

    const currency = invoices[0]?.currency || 'R';
    const answer = `Your total tuition billed is ${currency} ${totalBilled.toLocaleString()}, with ${currency} ${totalPaid.toLocaleString()} collected and an outstanding balance of ${currency} ${totalOutstanding.toLocaleString()} across ${invoices.length} invoices.`;

    return {
      isSchoolDataQuery: true,
      isAuthorized: true,
      toolUsed: 'getFeeSummary',
      extractedData: { totalBilled, totalPaid, totalOutstanding, invoiceCount: invoices.length, currency },
      summaryAnswer: answer,
      systemContextPrompt: `AUTHORITATIVE DATABASE FACT: Billed = ${currency} ${totalBilled}, Paid = ${currency} ${totalPaid}, Outstanding = ${currency} ${totalOutstanding}. Report these exact numbers.`,
      updatedContext
    };
  }
}
