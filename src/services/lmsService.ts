/**
 * EDUkenZA Enterprise LMS Service
 * Real-time, multi-tenant Firestore LMS data layer with Storage media streaming.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { resolveApiUrl } from '../config/api';
import { 
  LmsCourse, 
  LmsLesson, 
  LmsQuiz, 
  LmsQuizAttempt, 
  LmsAssignment, 
  LmsAssignmentSubmission, 
  LmsDiscussion, 
  LmsReply, 
  LmsProgress, 
  LmsMaterial, 
  LmsOfflineCachedLesson 
} from '../types/lms';

// Local storage fallback keys for offline capability
const STORAGE_KEYS = {
  COURSES: 'edukenza_lms_courses',
  LESSONS: 'edukenza_lms_lessons',
  QUIZZES: 'edukenza_lms_quizzes',
  ATTEMPTS: 'edukenza_lms_quiz_attempts',
  ASSIGNMENTS: 'edukenza_lms_assignments',
  SUBMISSIONS: 'edukenza_lms_submissions',
  DISCUSSIONS: 'edukenza_lms_discussions',
  PROGRESS: 'edukenza_lms_progress',
  MATERIALS: 'edukenza_lms_materials',
  OFFLINE_CACHE: 'edukenza_lms_offline_cache'
};

function getStoredItems<T>(key: string, defaultItems: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`[LMS Service] Error reading ${key} from storage:`, err);
  }
  return defaultItems;
}

function saveStoredItems<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn(`[LMS Service] Error saving ${key} to storage:`, err);
  }
}

export class LmsService {
  // ==========================================
  // 1. COURSES
  // ==========================================

  static subscribeToCourses(schoolId: string, callback: (courses: LmsCourse[]) => void): () => void {
    if (!schoolId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'lmsCourses'), 
        where('schoolId', '==', schoolId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsCourse));
        // Cache locally for offline resilience
        saveStoredItems(STORAGE_KEYS.COURSES, courses);
        callback(courses);
      }, (err) => {
        console.warn('[LMS Service] onSnapshot error in subscribeToCourses:', err);
        const cached = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
        callback(cached.filter(c => c.schoolId === schoolId));
      });

      return unsubscribe;
    } catch (err) {
      console.warn('[LMS Service] Error setting up course listener:', err);
      const cached = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
      callback(cached.filter(c => c.schoolId === schoolId));
      return () => {};
    }
  }

  static async getCourses(schoolId: string): Promise<LmsCourse[]> {
    try {
      const q = query(
        collection(db, 'lmsCourses'), 
        where('schoolId', '==', schoolId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LmsCourse));
        saveStoredItems(STORAGE_KEYS.COURSES, courses);
        return courses;
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getCourses offline fallback:', err);
    }
    const local = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
    return local.filter(c => c.schoolId === schoolId || schoolId === 'global' || !c.schoolId);
  }

  static async createCourse(courseData: Omit<LmsCourse, 'id' | 'createdAt' | 'updatedAt'>): Promise<LmsCourse> {
    const newId = `course_${Date.now()}`;
    const newCourse: LmsCourse = {
      ...courseData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalLessons: 0,
      totalQuizzes: 0,
      totalAssignments: 0
    };

    try {
      await setDoc(doc(db, 'lmsCourses', newId), newCourse);
    } catch (err) {
      console.warn('[LMS Service] Firestore createCourse local fallback:', err);
    }

    const current = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
    saveStoredItems(STORAGE_KEYS.COURSES, [newCourse, ...current]);
    return newCourse;
  }

  static async updateCourse(courseId: string, updates: Partial<LmsCourse>): Promise<void> {
    const updatedWithTime = { ...updates, updatedAt: new Date().toISOString() };
    try {
      await updateDoc(doc(db, 'lmsCourses', courseId), updatedWithTime);
    } catch (err) {
      console.warn('[LMS Service] Firestore updateCourse fallback:', err);
    }

    const current = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
    const updated = current.map(c => c.id === courseId ? { ...c, ...updatedWithTime } : c);
    saveStoredItems(STORAGE_KEYS.COURSES, updated);
  }

  static async deleteCourse(courseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'lmsCourses', courseId));
    } catch (err) {
      console.warn('[LMS Service] Firestore deleteCourse error:', err);
    }
    const current = getStoredItems<LmsCourse>(STORAGE_KEYS.COURSES, []);
    saveStoredItems(STORAGE_KEYS.COURSES, current.filter(c => c.id !== courseId));
  }

  // ==========================================
  // 2. LESSONS
  // ==========================================

  static subscribeToLessons(courseId: string, callback: (lessons: LmsLesson[]) => void): () => void {
    if (!courseId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'lmsLessons'),
        where('courseId', '==', courseId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lessons = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as LmsLesson))
          .sort((a, b) => a.order - b.order);
        
        // Update local cache
        const allLocal = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
        const other = allLocal.filter(l => l.courseId !== courseId);
        saveStoredItems(STORAGE_KEYS.LESSONS, [...other, ...lessons]);

        callback(lessons);
      }, (err) => {
        console.warn('[LMS Service] onSnapshot error in subscribeToLessons:', err);
        const local = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
        callback(local.filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order));
      });

      return unsubscribe;
    } catch (err) {
      console.warn('[LMS Service] Error setting up lessons listener:', err);
      const local = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
      callback(local.filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order));
      return () => {};
    }
  }

  static async getLessons(courseId: string): Promise<LmsLesson[]> {
    try {
      const q = query(
        collection(db, 'lmsLessons'),
        where('courseId', '==', courseId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const lessons = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as LmsLesson))
          .sort((a, b) => a.order - b.order);
        return lessons;
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getLessons fallback:', err);
    }

    const local = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
    return local.filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order);
  }

  static async saveLesson(lesson: Omit<LmsLesson, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<LmsLesson> {
    const lessonId = lesson.id || `lesson_${Date.now()}`;
    const fullLesson: LmsLesson = {
      ...lesson,
      id: lessonId,
      createdAt: lesson.id ? (lesson as LmsLesson).createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'lmsLessons', lessonId), fullLesson);
      
      // Update course lesson count in Firestore
      const lessonsInCourse = await this.getLessons(lesson.courseId);
      await updateDoc(doc(db, 'lmsCourses', lesson.courseId), {
        totalLessons: lessonsInCourse.length
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore saveLesson fallback:', err);
    }

    const current = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
    const index = current.findIndex(l => l.id === lessonId);
    let updated: LmsLesson[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = fullLesson;
    } else {
      updated = [...current, fullLesson];
    }
    saveStoredItems(STORAGE_KEYS.LESSONS, updated);
    return fullLesson;
  }

  static async deleteLesson(lessonId: string, courseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'lmsLessons', lessonId));
      const lessonsInCourse = await this.getLessons(courseId);
      await updateDoc(doc(db, 'lmsCourses', courseId), {
        totalLessons: Math.max(0, lessonsInCourse.length - 1)
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore deleteLesson error:', err);
    }
    const current = getStoredItems<LmsLesson>(STORAGE_KEYS.LESSONS, []);
    saveStoredItems(STORAGE_KEYS.LESSONS, current.filter(l => l.id !== lessonId));
  }

  // ==========================================
  // 3. QUIZZES & ATTEMPTS
  // ==========================================

  static subscribeToQuizzes(courseId: string, callback: (quizzes: LmsQuiz[]) => void): () => void {
    if (!courseId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(collection(db, 'lmsQuizzes'), where('courseId', '==', courseId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const quizzes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsQuiz));
        callback(quizzes);
      }, (err) => {
        console.warn('[LMS Service] onSnapshot error in subscribeToQuizzes:', err);
        const local = getStoredItems<LmsQuiz>(STORAGE_KEYS.QUIZZES, []);
        callback(local.filter(q => q.courseId === courseId));
      });
      return unsubscribe;
    } catch (err) {
      console.warn('[LMS Service] Error setting up quiz listener:', err);
      const local = getStoredItems<LmsQuiz>(STORAGE_KEYS.QUIZZES, []);
      callback(local.filter(q => q.courseId === courseId));
      return () => {};
    }
  }

  static async getQuizzes(courseId: string): Promise<LmsQuiz[]> {
    try {
      const q = query(collection(db, 'lmsQuizzes'), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsQuiz));
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getQuizzes fallback:', err);
    }
    const local = getStoredItems<LmsQuiz>(STORAGE_KEYS.QUIZZES, []);
    return local.filter(q => q.courseId === courseId);
  }

  static async createQuiz(quiz: Omit<LmsQuiz, 'id' | 'createdAt'>): Promise<LmsQuiz> {
    const newId = `quiz_${Date.now()}`;
    const newQuiz: LmsQuiz = {
      ...quiz,
      id: newId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'lmsQuizzes', newId), newQuiz);
      // Increment course total quizzes
      const quizzes = await this.getQuizzes(quiz.courseId);
      await updateDoc(doc(db, 'lmsCourses', quiz.courseId), {
        totalQuizzes: quizzes.length + 1
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore createQuiz fallback:', err);
    }

    const local = getStoredItems<LmsQuiz>(STORAGE_KEYS.QUIZZES, []);
    saveStoredItems(STORAGE_KEYS.QUIZZES, [newQuiz, ...local]);
    return newQuiz;
  }

  static async deleteQuiz(quizId: string, courseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'lmsQuizzes', quizId));
      const quizzes = await this.getQuizzes(courseId);
      await updateDoc(doc(db, 'lmsCourses', courseId), {
        totalQuizzes: Math.max(0, quizzes.length - 1)
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore deleteQuiz error:', err);
    }
    const local = getStoredItems<LmsQuiz>(STORAGE_KEYS.QUIZZES, []);
    saveStoredItems(STORAGE_KEYS.QUIZZES, local.filter(q => q.id !== quizId));
  }

  static async submitQuizAttempt(attemptData: Omit<LmsQuizAttempt, 'id'>): Promise<LmsQuizAttempt> {
    const attemptId = `attempt_${Date.now()}`;
    const fullAttempt: LmsQuizAttempt = {
      ...attemptData,
      id: attemptId
    };

    try {
      await setDoc(doc(db, 'lmsQuizAttempts', attemptId), fullAttempt);
    } catch (err) {
      console.warn('[LMS Service] Firestore submitQuizAttempt fallback:', err);
    }

    const local = getStoredItems<LmsQuizAttempt>(STORAGE_KEYS.ATTEMPTS, []);
    saveStoredItems(STORAGE_KEYS.ATTEMPTS, [fullAttempt, ...local]);

    // Automatically update student progress
    await this.updateStudentProgress(attemptData.studentId, attemptData.courseId, attemptData.schoolId, {
      quizScore: {
        quizId: attemptData.quizId,
        attemptId: attemptId,
        score: attemptData.score,
        percentage: attemptData.percentage,
        passed: attemptData.passed
      }
    });

    return fullAttempt;
  }

  static subscribeToQuizAttempts(courseId: string, studentId?: string, callback?: (attempts: LmsQuizAttempt[]) => void): () => void {
    if (!callback) return () => {};

    try {
      let q = query(
        collection(db, 'lmsQuizAttempts'),
        where('courseId', '==', courseId)
      );
      if (studentId) {
        q = query(
          collection(db, 'lmsQuizAttempts'),
          where('courseId', '==', courseId),
          where('studentId', '==', studentId)
        );
      }

      return onSnapshot(q, (snapshot) => {
        const attempts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsQuizAttempt));
        callback(attempts);
      }, (err) => {
        console.warn('[LMS Service] Error listening to quiz attempts:', err);
      });
    } catch (err) {
      console.warn('[LMS Service] listener setup error for quiz attempts:', err);
      return () => {};
    }
  }

  // ==========================================
  // 4. ASSIGNMENTS & SUBMISSIONS
  // ==========================================

  static subscribeToAssignments(courseId: string, callback: (assignments: LmsAssignment[]) => void): () => void {
    if (!courseId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'assignments'),
        where('courseId', '==', courseId)
      );

      return onSnapshot(q, (snapshot) => {
        const assignments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsAssignment));
        saveStoredItems(STORAGE_KEYS.ASSIGNMENTS, assignments);
        callback(assignments);
      }, (err) => {
        console.warn('[LMS Service] Error in subscribeToAssignments:', err);
        const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
        callback(local.filter(a => a.courseId === courseId));
      });
    } catch (err) {
      console.warn('[LMS Service] Error setting up assignments listener:', err);
      const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
      callback(local.filter(a => a.courseId === courseId));
      return () => {};
    }
  }

  static async createAssignment(assignment: Omit<LmsAssignment, 'id' | 'createdAt'>): Promise<LmsAssignment> {
    const newId = `assignment_${Date.now()}`;
    const newAssignment: LmsAssignment = {
      ...assignment,
      id: newId,
      status: assignment.status || 'published',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'assignments', newId), newAssignment);
      // Increment course total assignments
      await updateDoc(doc(db, 'lmsCourses', assignment.courseId), {
        totalAssignments: ((await this.getAssignments(assignment.courseId)).length + 1)
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore createAssignment fallback:', err);
    }

    const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
    saveStoredItems(STORAGE_KEYS.ASSIGNMENTS, [newAssignment, ...local]);
    return newAssignment;
  }

  static async getAssignments(courseId: string): Promise<LmsAssignment[]> {
    try {
      const q = query(collection(db, 'assignments'), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as LmsAssignment));
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getAssignments fallback:', err);
    }
    const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
    return local.filter(a => a.courseId === courseId);
  }

  static async updateAssignment(assignmentId: string, updates: Partial<LmsAssignment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), updates);
    } catch (err) {
      console.warn('[LMS Service] Firestore updateAssignment fallback:', err);
    }

    const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
    const updated = local.map(a => a.id === assignmentId ? { ...a, ...updates } : a);
    saveStoredItems(STORAGE_KEYS.ASSIGNMENTS, updated);
  }

  static async deleteAssignment(assignmentId: string, courseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
      const assignments = await this.getAssignments(courseId);
      await updateDoc(doc(db, 'lmsCourses', courseId), {
        totalAssignments: Math.max(0, assignments.length - 1)
      }).catch(() => {});
    } catch (err) {
      console.warn('[LMS Service] Firestore deleteAssignment error:', err);
    }
    const local = getStoredItems<LmsAssignment>(STORAGE_KEYS.ASSIGNMENTS, []);
    saveStoredItems(STORAGE_KEYS.ASSIGNMENTS, local.filter(a => a.id !== assignmentId));
  }

  static subscribeToSubmissions(
    courseId: string, 
    assignmentId?: string, 
    studentId?: string, 
    callback?: (submissions: LmsAssignmentSubmission[]) => void
  ): () => void {
    if (!callback) return () => {};

    try {
      let q = query(collection(db, 'assignmentSubmissions'), where('courseId', '==', courseId));
      if (assignmentId && studentId) {
        q = query(
          collection(db, 'assignmentSubmissions'),
          where('courseId', '==', courseId),
          where('assignmentId', '==', assignmentId),
          where('studentId', '==', studentId)
        );
      } else if (assignmentId) {
        q = query(
          collection(db, 'assignmentSubmissions'),
          where('courseId', '==', courseId),
          where('assignmentId', '==', assignmentId)
        );
      } else if (studentId) {
        q = query(
          collection(db, 'assignmentSubmissions'),
          where('courseId', '==', courseId),
          where('studentId', '==', studentId)
        );
      }

      return onSnapshot(q, (snapshot) => {
        const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsAssignmentSubmission));
        saveStoredItems(STORAGE_KEYS.SUBMISSIONS, subs);
        callback(subs);
      }, (err) => {
        console.warn('[LMS Service] Error in subscribeToSubmissions:', err);
        const local = getStoredItems<LmsAssignmentSubmission>(STORAGE_KEYS.SUBMISSIONS, []);
        callback(local.filter(s => s.courseId === courseId));
      });
    } catch (err) {
      console.warn('[LMS Service] Error setting up submissions listener:', err);
      return () => {};
    }
  }

  static async submitAssignment(
    submissionData: Omit<LmsAssignmentSubmission, 'id' | 'submittedAt'>
  ): Promise<LmsAssignmentSubmission> {
    const submissionId = `${submissionData.studentId}_${submissionData.assignmentId}`;
    const newSubmission: LmsAssignmentSubmission = {
      ...submissionData,
      id: submissionId,
      submittedAt: new Date().toISOString(),
      status: submissionData.status || 'submitted'
    };

    try {
      await setDoc(doc(db, 'assignmentSubmissions', submissionId), newSubmission);
    } catch (err) {
      console.warn('[LMS Service] Firestore submitAssignment fallback:', err);
    }

    const local = getStoredItems<LmsAssignmentSubmission>(STORAGE_KEYS.SUBMISSIONS, []);
    const filtered = local.filter(s => s.id !== submissionId);
    saveStoredItems(STORAGE_KEYS.SUBMISSIONS, [newSubmission, ...filtered]);

    // Update progress assignment status
    await this.updateStudentProgress(submissionData.studentId, submissionData.courseId, submissionData.schoolId, {
      assignmentSubmittedId: submissionData.assignmentId
    });

    return newSubmission;
  }

  static async gradeSubmission(
    submissionId: string, 
    grade: number, 
    feedback: string, 
    teacherName: string
  ): Promise<void> {
    const updates = {
      grade,
      feedback,
      status: 'graded' as const,
      gradedBy: teacherName,
      gradedAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'assignmentSubmissions', submissionId), updates);
    } catch (err) {
      console.warn('[LMS Service] Firestore gradeSubmission fallback:', err);
    }

    const local = getStoredItems<LmsAssignmentSubmission>(STORAGE_KEYS.SUBMISSIONS, []);
    const updated = local.map(s => s.id === submissionId ? { ...s, ...updates } : s);
    saveStoredItems(STORAGE_KEYS.SUBMISSIONS, updated);
  }

  // ==========================================
  // 5. MATERIALS & MEDIA
  // ==========================================

  static subscribeToMaterials(courseId: string, callback: (materials: LmsMaterial[]) => void): () => void {
    if (!courseId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(collection(db, 'lmsMaterials'), where('courseId', '==', courseId));
      return onSnapshot(q, (snapshot) => {
        const materials = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsMaterial));
        callback(materials);
      }, (err) => {
        console.warn('[LMS Service] onSnapshot error in subscribeToMaterials:', err);
        const local = getStoredItems<LmsMaterial>(STORAGE_KEYS.MATERIALS, []);
        callback(local.filter(m => m.courseId === courseId));
      });
    } catch (err) {
      console.warn('[LMS Service] Error setting up materials listener:', err);
      const local = getStoredItems<LmsMaterial>(STORAGE_KEYS.MATERIALS, []);
      callback(local.filter(m => m.courseId === courseId));
      return () => {};
    }
  }

  static async getMaterials(courseId: string): Promise<LmsMaterial[]> {
    try {
      const q = query(collection(db, 'lmsMaterials'), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsMaterial));
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getMaterials fallback:', err);
    }
    const local = getStoredItems<LmsMaterial>(STORAGE_KEYS.MATERIALS, []);
    return local.filter(m => m.courseId === courseId);
  }

  static async uploadMaterial(material: Omit<LmsMaterial, 'id' | 'createdAt' | 'downloadsCount'>): Promise<LmsMaterial> {
    const newId = `mat_${Date.now()}`;
    const newMat: LmsMaterial = {
      ...material,
      id: newId,
      createdAt: new Date().toISOString(),
      downloadsCount: 0
    };

    try {
      await setDoc(doc(db, 'lmsMaterials', newId), newMat);
    } catch (err) {
      console.warn('[LMS Service] Firestore uploadMaterial fallback:', err);
    }

    const local = getStoredItems<LmsMaterial>(STORAGE_KEYS.MATERIALS, []);
    saveStoredItems(STORAGE_KEYS.MATERIALS, [newMat, ...local]);
    return newMat;
  }

  static async deleteMaterial(materialId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'lmsMaterials', materialId));
    } catch (err) {
      console.warn('[LMS Service] Firestore deleteMaterial error:', err);
    }
    const local = getStoredItems<LmsMaterial>(STORAGE_KEYS.MATERIALS, []);
    saveStoredItems(STORAGE_KEYS.MATERIALS, local.filter(m => m.id !== materialId));
  }

  // ==========================================
  // 6. DISCUSSIONS
  // ==========================================

  static subscribeToDiscussions(courseId: string, callback: (discussions: LmsDiscussion[]) => void): () => void {
    if (!courseId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(collection(db, 'lmsDiscussions'), where('courseId', '==', courseId));
      return onSnapshot(q, (snapshot) => {
        const discussions = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as LmsDiscussion))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        callback(discussions);
      }, (err) => {
        console.warn('[LMS Service] onSnapshot error in subscribeToDiscussions:', err);
        const local = getStoredItems<LmsDiscussion>(STORAGE_KEYS.DISCUSSIONS, []);
        callback(local.filter(d => d.courseId === courseId).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      });
    } catch (err) {
      console.warn('[LMS Service] Error setting up discussions listener:', err);
      const local = getStoredItems<LmsDiscussion>(STORAGE_KEYS.DISCUSSIONS, []);
      callback(local.filter(d => d.courseId === courseId).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      return () => {};
    }
  }

  static async getDiscussions(courseId: string): Promise<LmsDiscussion[]> {
    try {
      const q = query(collection(db, 'lmsDiscussions'), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LmsDiscussion))
                            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getDiscussions fallback:', err);
    }
    const local = getStoredItems<LmsDiscussion>(STORAGE_KEYS.DISCUSSIONS, []);
    return local.filter(d => d.courseId === courseId).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }

  static async createDiscussion(discussion: Omit<LmsDiscussion, 'id' | 'createdAt' | 'replies' | 'likes'>): Promise<LmsDiscussion> {
    const newId = `disc_${Date.now()}`;
    const newDisc: LmsDiscussion = {
      ...discussion,
      id: newId,
      createdAt: new Date().toISOString(),
      likes: [],
      replies: []
    };

    try {
      await setDoc(doc(db, 'lmsDiscussions', newId), newDisc);
    } catch (err) {
      console.warn('[LMS Service] Firestore createDiscussion fallback:', err);
    }

    const local = getStoredItems<LmsDiscussion>(STORAGE_KEYS.DISCUSSIONS, []);
    saveStoredItems(STORAGE_KEYS.DISCUSSIONS, [newDisc, ...local]);
    return newDisc;
  }

  static async addReply(discussionId: string, reply: Omit<LmsReply, 'id' | 'createdAt' | 'likes'>): Promise<LmsReply> {
    const replyId = `rep_${Date.now()}`;
    const fullReply: LmsReply = {
      ...reply,
      id: replyId,
      createdAt: new Date().toISOString(),
      likes: []
    };

    try {
      const discRef = doc(db, 'lmsDiscussions', discussionId);
      const snap = await getDoc(discRef);
      if (snap.exists()) {
        const currentReplies = snap.data()?.replies || [];
        await updateDoc(discRef, {
          replies: [...currentReplies, fullReply]
        });
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore addReply fallback:', err);
    }

    const currentDiscs = getStoredItems<LmsDiscussion>(STORAGE_KEYS.DISCUSSIONS, []);
    const disc = currentDiscs.find(d => d.id === discussionId);
    if (disc) {
      disc.replies.push(fullReply);
      saveStoredItems(STORAGE_KEYS.DISCUSSIONS, currentDiscs);
    }
    return fullReply;
  }

  // ==========================================
  // 7. REAL PROGRESS TRACKING (Calculated directly)
  // ==========================================

  static subscribeToStudentProgress(
    studentId: string, 
    courseId: string, 
    callback: (progress: LmsProgress) => void
  ): () => void {
    const defaultProgress: LmsProgress = {
      id: `prog_${studentId}_${courseId}`,
      studentId,
      courseId,
      schoolId: '',
      completedLessonIds: [],
      videoWatchSeconds: {},
      quizScores: {},
      assignmentStatus: {},
      overallPercentage: 0,
      lastAccessedAt: new Date().toISOString(),
      attendanceCount: 1,
      bookmarkedLessonIds: []
    };

    if (!studentId || !courseId) {
      callback(defaultProgress);
      return () => {};
    }

    try {
      const docRef = doc(db, 'lmsProgress', `${studentId}_${courseId}`);
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...snap.data() } as LmsProgress);
        } else {
          callback(defaultProgress);
        }
      }, (err) => {
        console.warn('[LMS Service] Error listening to student progress:', err);
        callback(defaultProgress);
      });
    } catch (err) {
      console.warn('[LMS Service] Error setting up progress listener:', err);
      callback(defaultProgress);
      return () => {};
    }
  }

  static subscribeAllStudentProgress(
    studentId: string, 
    callback: (map: Record<string, LmsProgress>) => void
  ): () => void {
    if (!studentId) {
      callback({});
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'lmsProgress'),
        where('studentId', '==', studentId)
      );

      return onSnapshot(q, (snapshot) => {
        const map: Record<string, LmsProgress> = {};
        snapshot.docs.forEach(d => {
          const data = d.data() as LmsProgress;
          if (data.courseId) {
            map[data.courseId] = { id: d.id, ...data };
          }
        });
        callback(map);
      }, (err) => {
        console.warn('[LMS Service] Error listening to all student progress:', err);
        callback({});
      });
    } catch (err) {
      console.warn('[LMS Service] listener setup error in all student progress:', err);
      callback({});
      return () => {};
    }
  }

  static async getStudentProgress(studentId: string, courseId: string): Promise<LmsProgress> {
    const defaultProgress: LmsProgress = {
      id: `prog_${studentId}_${courseId}`,
      studentId,
      courseId,
      schoolId: '',
      completedLessonIds: [],
      videoWatchSeconds: {},
      quizScores: {},
      assignmentStatus: {},
      overallPercentage: 0,
      lastAccessedAt: new Date().toISOString(),
      attendanceCount: 1,
      bookmarkedLessonIds: []
    };

    try {
      const docRef = doc(db, 'lmsProgress', `${studentId}_${courseId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as LmsProgress;
      }
    } catch (err) {
      console.warn('[LMS Service] Firestore getStudentProgress fallback:', err);
    }

    const allProg = getStoredItems<LmsProgress>(STORAGE_KEYS.PROGRESS, []);
    const found = allProg.find(p => p.studentId === studentId && p.courseId === courseId);
    return found || defaultProgress;
  }

  static async updateStudentProgress(
    studentId: string, 
    courseId: string, 
    schoolId: string,
    updates: {
      completedLessonId?: string;
      videoProgress?: { lessonId: string; seconds: number };
      quizScore?: { quizId: string; attemptId: string; score: number; percentage: number; passed: boolean };
      assignmentSubmittedId?: string;
      bookmarkLessonId?: string;
    }
  ): Promise<LmsProgress> {
    const currentProg = await this.getStudentProgress(studentId, courseId);
    currentProg.schoolId = schoolId || currentProg.schoolId;

    if (updates.completedLessonId && !currentProg.completedLessonIds.includes(updates.completedLessonId)) {
      currentProg.completedLessonIds.push(updates.completedLessonId);
    }

    if (updates.videoProgress) {
      currentProg.videoWatchSeconds[updates.videoProgress.lessonId] = updates.videoProgress.seconds;
    }

    if (updates.quizScore) {
      currentProg.quizScores[updates.quizScore.quizId] = {
        attemptId: updates.quizScore.attemptId,
        score: updates.quizScore.score,
        percentage: updates.quizScore.percentage,
        passed: updates.quizScore.passed
      };
    }

    if (updates.assignmentSubmittedId) {
      currentProg.assignmentStatus[updates.assignmentSubmittedId] = {
        submissionId: updates.assignmentSubmittedId,
        status: 'submitted'
      };
    }

    if (updates.bookmarkLessonId) {
      if (currentProg.bookmarkedLessonIds.includes(updates.bookmarkLessonId)) {
        currentProg.bookmarkedLessonIds = currentProg.bookmarkedLessonIds.filter(id => id !== updates.bookmarkLessonId);
      } else {
        currentProg.bookmarkedLessonIds.push(updates.bookmarkLessonId);
      }
    }

    // Calculate real mathematical completion % based on lessons & assignments
    const lessons = await this.getLessons(courseId);
    const assignments = await this.getAssignments(courseId);
    const totalItems = lessons.length + assignments.length;

    if (totalItems === 0) {
      currentProg.overallPercentage = 0;
    } else {
      const completedLessons = currentProg.completedLessonIds.length;
      const submittedAssignments = Object.keys(currentProg.assignmentStatus).length;
      const progressRatio = (completedLessons + submittedAssignments) / totalItems;
      currentProg.overallPercentage = Math.min(100, Math.round(progressRatio * 100));
    }
    
    currentProg.lastAccessedAt = new Date().toISOString();

    try {
      await setDoc(doc(db, 'lmsProgress', `${studentId}_${courseId}`), currentProg);
    } catch (err) {
      console.warn('[LMS Service] Firestore updateStudentProgress fallback:', err);
    }

    const allProg = getStoredItems<LmsProgress>(STORAGE_KEYS.PROGRESS, []);
    const idx = allProg.findIndex(p => p.studentId === studentId && p.courseId === courseId);
    if (idx >= 0) {
      allProg[idx] = currentProg;
    } else {
      allProg.push(currentProg);
    }
    saveStoredItems(STORAGE_KEYS.PROGRESS, allProg);
    return currentProg;
  }

  // ==========================================
  // 8. FIREBASE STORAGE MEDIA STREAMING
  // ==========================================

  static async uploadLmsFile(
    schoolId: string, 
    folder: 'covers' | 'lessons' | 'materials' | 'submissions', 
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<{ downloadUrl: string; storagePath: string; fileSize: string; fileName: string }> {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `schools/${schoolId}/lms/${folder}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        customMetadata: {
          schoolId,
          originalName: file.name
        }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.error('[LMS Service] File upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            const formattedSize = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`;
            resolve({
              downloadUrl,
              storagePath,
              fileSize: formattedSize,
              fileName: file.name
            });
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });
  }

  // ==========================================
  // 9. OFFLINE CACHED LESSONS
  // ==========================================

  static saveLessonOffline(lesson: LmsLesson, courseName: string): boolean {
    try {
      const cached = getStoredItems<LmsOfflineCachedLesson>(STORAGE_KEYS.OFFLINE_CACHE, []);
      const exists = cached.find(item => item.lesson.id === lesson.id);
      if (!exists) {
        cached.push({
          lesson,
          courseName,
          cachedAt: new Date().toISOString()
        });
        saveStoredItems(STORAGE_KEYS.OFFLINE_CACHE, cached);
      }
      return true;
    } catch (err) {
      console.error('[LMS Service] Error saving lesson offline:', err);
      return false;
    }
  }

  static getOfflineCachedLessons(): LmsOfflineCachedLesson[] {
    return getStoredItems<LmsOfflineCachedLesson>(STORAGE_KEYS.OFFLINE_CACHE, []);
  }

  static removeOfflineLesson(lessonId: string): void {
    const cached = getStoredItems<LmsOfflineCachedLesson>(STORAGE_KEYS.OFFLINE_CACHE, []);
    const updated = cached.filter(i => i.lesson.id !== lessonId);
    saveStoredItems(STORAGE_KEYS.OFFLINE_CACHE, updated);
  }

  // ==========================================
  // 10. AI STUDY ASSISTANT
  // ==========================================

  static async generateAiResponse(
    prompt: string, 
    mode: 'tutor' | 'math' | 'summary' | 'teacher_quiz' | 'lesson_plan'
  ): Promise<string> {
    const res = await fetch(resolveApiUrl('/api/ai/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode,
        role: mode === 'teacher_quiz' || mode === 'lesson_plan' ? 'teacher' : 'student'
      })
    });

    if (!res.ok) {
      let errorMsg = 'Failed to generate AI response';
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (data && data.text) {
      return data.text;
    }

    throw new Error('AI returned an empty response. Please try rephrasing your prompt.');
  }
}
