import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  CbtQuestion, 
  CbtExamConfig, 
  CbtAttempt, 
  CbtCertificate, 
  CbtStudentAnswer,
  CbtBloomTaxonomy,
  CbtDifficulty
} from '../types/cbt';
import { enqueueCbtAttempt } from './offlineSyncService';
import { resolveApiUrl } from '../config/api';

export class CbtService {
  // Subscribe to Questions
  static subscribeToQuestions(schoolId: string, callback: (questions: CbtQuestion[]) => void) {
    if (!schoolId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'cbtQuestions'),
        where('schoolId', '==', schoolId)
      );

      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }
        const list: CbtQuestion[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as CbtQuestion));
        callback(list);
      }, (err) => {
        console.warn('[CbtService] Firestore questions snapshot notice:', err);
        callback([]);
      });
    } catch (e) {
      console.warn('[CbtService] Firestore subscribe error:', e);
      callback([]);
      return () => {};
    }
  }

  // Create Question
  static async createQuestion(data: Partial<CbtQuestion>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'cbtQuestions'), {
        ...data,
        isArchived: false,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.warn('[CbtService] Firestore add question failed:', err);
      return `q_local_${Date.now()}`;
    }
  }

  // Update Question
  static async updateQuestion(questionId: string, updates: Partial<CbtQuestion>): Promise<void> {
    try {
      if (questionId.startsWith('q_sample') || questionId.startsWith('q_local')) return;
      const docRef = doc(db, 'cbtQuestions', questionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('[CbtService] Firestore update question failed:', err);
    }
  }

  // Delete Question
  static async deleteQuestion(questionId: string): Promise<void> {
    try {
      if (questionId.startsWith('q_sample')) return;
      await deleteDoc(doc(db, 'cbtQuestions', questionId));
    } catch (err) {
      console.warn('[CbtService] Firestore delete question failed:', err);
    }
  }

  // Duplicate Question
  static async duplicateQuestion(question: CbtQuestion, newAuthorName: string, newAuthorId: string): Promise<string> {
    const copyData: Partial<CbtQuestion> = {
      ...question,
      id: undefined,
      title: `${question.title} (Copy)`,
      version: 1,
      authorName: newAuthorName,
      authorId: newAuthorId,
      createdAt: serverTimestamp()
    };
    return await this.createQuestion(copyData);
  }

  // Import JSON Questions
  static async importQuestionsJSON(schoolId: string, jsonContent: string, authorId: string, authorName: string): Promise<number> {
    const parsed = JSON.parse(jsonContent);
    const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
    let count = 0;
    for (const item of items) {
      await this.createQuestion({
        schoolId,
        subjectId: item.subjectId || 'sub_general',
        subjectName: item.subjectName || 'General Studies',
        classGrade: item.classGrade || 'Grade 10',
        title: item.title || item.questionText || 'Untitled Imported Question',
        type: item.type || 'mcq',
        difficulty: item.difficulty || 'Medium',
        bloomLevel: item.bloomLevel || 'Understanding',
        points: Number(item.points) || 2,
        options: item.options || [],
        matchingPairs: item.matchingPairs || [],
        correctAnswer: item.correctAnswer,
        explanation: item.explanation || '',
        markingScheme: item.markingScheme || '',
        tags: item.tags || ['Imported'],
        latexFormula: item.latexFormula || '',
        version: 1,
        authorId,
        authorName
      });
      count++;
    }
    return count;
  }

  // Subscribe to Exams
  static subscribeToExams(schoolId: string, callback: (exams: CbtExamConfig[]) => void) {
    if (!schoolId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'cbtExams'),
        where('schoolId', '==', schoolId)
      );

      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }
        const list: CbtExamConfig[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as CbtExamConfig));
        callback(list);
      }, (err) => {
        console.warn('[CbtService] Firestore exams snapshot notice:', err);
        callback([]);
      });
    } catch (e) {
      console.warn('[CbtService] Firestore subscribe exams error:', e);
      callback([]);
      return () => {};
    }
  }

  // Create Exam
  static async createExam(data: Partial<CbtExamConfig>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'cbtExams'), {
        ...data,
        status: data.status || 'Live',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.warn('[CbtService] Firestore add exam error:', err);
      return `exam_local_${Date.now()}`;
    }
  }

  // Update Exam
  static async updateExam(examId: string, updates: Partial<CbtExamConfig>): Promise<void> {
    try {
      if (examId.startsWith('exam_sample') || examId.startsWith('exam_local')) return;
      const docRef = doc(db, 'cbtExams', examId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('[CbtService] Firestore update exam error:', err);
    }
  }

  // Delete Exam
  static async deleteExam(examId: string): Promise<void> {
    try {
      if (examId.startsWith('exam_sample')) return;
      await deleteDoc(doc(db, 'cbtExams', examId));
    } catch (err) {
      console.warn('[CbtService] Firestore delete exam error:', err);
    }
  }

  // Subscribe to Attempts
  static subscribeToAttempts(schoolId: string, callback: (attempts: CbtAttempt[]) => void) {
    try {
      const q = query(
        collection(db, 'cbtAttempts'),
        where('schoolId', '==', schoolId)
      );

      return onSnapshot(q, (snapshot) => {
        const list: CbtAttempt[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as CbtAttempt));
        callback(list);
      }, (err) => {
        console.warn('[CbtService] Firestore subscribe attempts error:', err);
        callback([]);
      });
    } catch (e) {
      console.warn('[CbtService] Attempts query failed:', e);
      callback([]);
      return () => {};
    }
  }

  // Auto-grading and Submission Processor
  static calculateAutoGrading(
    exam: CbtExamConfig,
    questions: CbtQuestion[],
    studentAnswers: Record<string, CbtStudentAnswer>
  ) {
    let totalScoreObtained = 0;
    let maxPossibleScore = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const gradedAnswers: Record<string, CbtStudentAnswer> = {};

    questions.forEach(q => {
      if (!q.id) return;
      const points = q.points || 2;
      maxPossibleScore += points;

      const ans = studentAnswers[q.id] || { questionId: q.id };
      let scoreAwarded = 0;
      let isAutograded = false;

      if (q.type === 'mcq' || q.type === 'true_false') {
        isAutograded = true;
        const selected = ans.selectedOptionIds?.[0];
        const correctOpt = q.options?.find(o => o.isCorrect);
        if (selected && correctOpt && selected === correctOpt.id) {
          scoreAwarded = points;
          if (q.tags?.[0] && !strengths.includes(q.tags[0])) strengths.push(q.tags[0]);
        } else {
          if (exam.negativeMarking && exam.negativeMarkingFactor) {
            scoreAwarded = -1 * (points * exam.negativeMarkingFactor);
          } else {
            scoreAwarded = 0;
          }
          if (q.tags?.[0] && !weaknesses.includes(q.tags[0])) weaknesses.push(q.tags[0]);
        }
      } else if (q.type === 'multi_select') {
        isAutograded = true;
        const selected = ans.selectedOptionIds || [];
        const correctOptIds = q.options?.filter(o => o.isCorrect).map(o => o.id) || [];
        const isExactMatch = selected.length === correctOptIds.length && 
          selected.every(id => correctOptIds.includes(id));
        if (isExactMatch) {
          scoreAwarded = points;
          if (q.tags?.[0] && !strengths.includes(q.tags[0])) strengths.push(q.tags[0]);
        } else {
          scoreAwarded = 0;
          if (q.tags?.[0] && !weaknesses.includes(q.tags[0])) weaknesses.push(q.tags[0]);
        }
      } else if (q.type === 'numeric' || q.type === 'short_answer') {
        isAutograded = true;
        const respText = String(ans.textResponse || ans.numericResponse || '').trim().toLowerCase();
        const correctText = String(q.correctAnswer || '').trim().toLowerCase();
        if (respText && correctText && respText === correctText) {
          scoreAwarded = points;
          if (q.tags?.[0] && !strengths.includes(q.tags[0])) strengths.push(q.tags[0]);
        } else {
          scoreAwarded = 0;
          if (q.tags?.[0] && !weaknesses.includes(q.tags[0])) weaknesses.push(q.tags[0]);
        }
      } else {
        // Essay or non-objective: requires manual grading by teacher
        isAutograded = false;
        scoreAwarded = 0;
      }

      totalScoreObtained += Math.max(0, scoreAwarded);

      gradedAnswers[q.id] = {
        ...ans,
        isAutograded,
        scoreAwarded,
        maxScore: points
      };
    });

    const percentageScore = maxPossibleScore > 0 ? Math.round((totalScoreObtained / maxPossibleScore) * 100) : 0;
    const passed = percentageScore >= (exam.passingScorePercentage || 50);

    let grade = 'F';
    if (percentageScore >= 80) grade = 'A';
    else if (percentageScore >= 70) grade = 'B';
    else if (percentageScore >= 60) grade = 'C';
    else if (percentageScore >= 50) grade = 'D';

    return {
      totalScoreObtained,
      maxPossibleScore,
      percentageScore,
      passed,
      grade,
      strengths: strengths.length ? strengths : [exam.subjectName],
      weaknesses: weaknesses.length ? weaknesses : ['Further Revision Suggested'],
      gradedAnswers
    };
  }

  // Submit Attempt
  static async submitAttempt(
    exam: CbtExamConfig,
    questions: CbtQuestion[],
    studentId: string,
    studentName: string,
    className: string,
    answers: Record<string, CbtStudentAnswer>,
    securityViolations: any[],
    timeSpentSeconds: number,
    status: 'submitted' | 'auto_submitted' = 'submitted'
  ): Promise<CbtAttempt> {
    const calc = this.calculateAutoGrading(exam, questions, answers);
    
    const attempt: Partial<CbtAttempt> = {
      examId: exam.id || 'exam_01',
      examTitle: exam.title,
      schoolId: exam.schoolId,
      studentId,
      studentName,
      className: className || exam.className,
      subjectName: exam.subjectName,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeSpentSeconds,
      status,
      answers: calc.gradedAnswers,
      securityViolations: securityViolations || [],
      violationCount: (securityViolations || []).length,
      totalScoreObtained: calc.totalScoreObtained,
      maxPossibleScore: calc.maxPossibleScore,
      percentageScore: calc.percentageScore,
      passed: calc.passed,
      grade: calc.grade,
      strengths: calc.strengths,
      weaknesses: calc.weaknesses,
      teacherComments: calc.passed ? 'Excellent performance in objective section!' : 'Needs focused review on key concepts.',
      aiStudyPlan: `Focus review on ${calc.weaknesses.join(', ')}. Re-read textbook chapters and attempt practice quizzes.`,
      certificateIssued: calc.passed
    };

    if (!navigator.onLine) {
      console.log('[CbtService] Offline detected! Enqueuing CBT attempt into Service Worker Background Sync queue');
      const queueId = await enqueueCbtAttempt(attempt);
      attempt.id = queueId;
      (attempt as any).isOfflineQueued = true;
      return attempt as CbtAttempt;
    }

    try {
      const docRef = await addDoc(collection(db, 'cbtAttempts'), {
        ...attempt,
        createdAt: serverTimestamp()
      });
      attempt.id = docRef.id;

      // Automatically issue certificate if passed
      if (calc.passed) {
        await this.issueCertificate({
          schoolId: exam.schoolId,
          schoolName: 'EDUkenZA Academy',
          studentId,
          studentName,
          examId: exam.id || 'exam_01',
          examTitle: exam.title,
          subjectName: exam.subjectName,
          scorePercentage: calc.percentageScore,
          grade: calc.grade,
          issuedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          certificateCode: `EDUK-CBT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        });
      }

    } catch (err) {
      console.warn('[CbtService] Firestore submit attempt error, enqueuing for Background Sync:', err);
      const queueId = await enqueueCbtAttempt(attempt);
      attempt.id = queueId;
      (attempt as any).isOfflineQueued = true;
    }

    return attempt as CbtAttempt;

  }

  // Issue Certificate
  static async issueCertificate(certData: Omit<CbtCertificate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'cbtCertificates'), {
        ...certData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.warn('[CbtService] Certificate issue error:', err);
      return `cert_local_${Date.now()}`;
    }
  }

  // AI Question Generator using Gemini API
  static async generateAiQuestions(
    subject: string,
    topic: string,
    classGrade: string,
    count: number = 3,
    difficulty: CbtDifficulty = 'Medium',
    bloomLevel: CbtBloomTaxonomy = 'Applying'
  ): Promise<Partial<CbtQuestion>[]> {
    try {
      const prompt = `Generate ${count} valid JSON CBT exam questions for ${subject}, Topic: "${topic}", Grade: ${classGrade}, Difficulty: ${difficulty}, Bloom's Taxonomy Level: ${bloomLevel}.
Return ONLY a JSON array of objects with the following schema:
[
  {
    "title": "Question prompt text (can include LaTeX formulas with $ or $$)",
    "type": "mcq",
    "difficulty": "${difficulty}",
    "bloomLevel": "${bloomLevel}",
    "points": 5,
    "options": [
      { "id": "opt_1", "text": "Option A text", "isCorrect": true, "explanation": "Why correct" },
      { "id": "opt_2", "text": "Option B text", "isCorrect": false, "explanation": "Why incorrect" },
      { "id": "opt_3", "text": "Option C text", "isCorrect": false, "explanation": "Why incorrect" },
      { "id": "opt_4", "text": "Option D text", "isCorrect": false, "explanation": "Why incorrect" }
    ],
    "explanation": "Step by step solution explanation",
    "markingScheme": "Scoring rubric details",
    "tags": ["${subject}", "${topic}"]
  }
]`;

      const res = await fetch(resolveApiUrl('/api/ai/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: 'teacher_quiz',
          role: 'teacher'
        })
      });

      if (!res.ok) {
        let errorMsg = 'Failed to generate questions via AI service.';
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data && data.text) {
        const cleanedText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        if (Array.isArray(parsed)) return parsed;
      }

      throw new Error('AI response could not be parsed into curriculum questions. Please try again with a refined topic.');
    } catch (err: any) {
      console.error('[CbtService] AI question generation error:', err);
      throw err;
    }
  }
}
