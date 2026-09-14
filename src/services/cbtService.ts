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

const SAMPLE_QUESTIONS: CbtQuestion[] = [
  {
    id: 'q_sample_01',
    schoolId: '',
    subjectId: 'sub_math_01',
    subjectName: 'Mathematics',
    classGrade: 'Grade 10',
    title: 'Solve the quadratic equation $2x^2 + 5x - 3 = 0$ for $x$.',
    type: 'mcq',
    difficulty: 'Medium',
    bloomLevel: 'Applying',
    points: 5,
    options: [
      { id: 'opt_a', text: '$x = 0.5$ or $x = -3$', isCorrect: true, explanation: 'Factoring: $(2x - 1)(x + 3) = 0 \\implies x = 0.5$ or $x = -3$.' },
      { id: 'opt_b', text: '$x = -0.5$ or $x = 3$', isCorrect: false, explanation: 'Incorrect sign allocation.' },
      { id: 'opt_c', text: '$x = 1$ or $x = -6$', isCorrect: false, explanation: 'Check roots in original equation.' },
      { id: 'opt_d', text: '$x = 2$ or $x = -1.5$', isCorrect: false, explanation: 'Incorrect factorization.' }
    ],
    explanation: 'Using the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ with $a=2, b=5, c=-3$ yields $x = 0.5$ and $x = -3$.',
    markingScheme: '1 mark for identifying formula, 2 marks for discriminant calculation, 2 marks for final roots.',
    tags: ['Algebra', 'Quadratic Equations', 'CAPS'],
    latexFormula: '2x^2 + 5x - 3 = 0',
    isArchived: false,
    version: 1,
    authorName: 'Dr. Evelyn Reed',
    authorId: 'tch_01',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q_sample_02',
    schoolId: '',
    subjectId: 'sub_phys_01',
    subjectName: 'Physical Sciences',
    classGrade: 'Grade 11',
    title: 'Which of the following statements correctly describe Newton\'s Third Law of Motion?',
    type: 'multi_select',
    difficulty: 'Hard',
    bloomLevel: 'Understanding',
    points: 4,
    options: [
      { id: 'opt_1', text: 'Action and reaction forces act on different bodies.', isCorrect: true },
      { id: 'opt_2', text: 'Action and reaction forces are equal in magnitude.', isCorrect: true },
      { id: 'opt_3', text: 'Action and reaction forces cancel each other out to produce zero net force.', isCorrect: false },
      { id: 'opt_4', text: 'Action and reaction forces act simultaneously in opposite directions.', isCorrect: true }
    ],
    explanation: 'Newton\'s 3rd Law pairs act on separate objects simultaneously with equal magnitude and opposite directions, so they never cancel each other on a single object.',
    tags: ['Physics', 'Mechanics', 'Newton Laws'],
    isArchived: false,
    version: 1,
    authorName: 'Prof. Alan Thorne',
    authorId: 'tch_02',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q_sample_03',
    schoolId: '',
    subjectId: 'sub_chem_01',
    subjectName: 'Chemistry',
    classGrade: 'Grade 12',
    title: 'Is the neutralization reaction between hydrochloric acid (HCl) and sodium hydroxide (NaOH) exothermic?',
    type: 'true_false',
    difficulty: 'Easy',
    bloomLevel: 'Remembering',
    points: 2,
    options: [
      { id: 'opt_tf_true', text: 'True', isCorrect: true, explanation: 'Neutralization releases heat enthalpy (approx. -57.1 kJ/mol).' },
      { id: 'opt_tf_false', text: 'False', isCorrect: false }
    ],
    explanation: 'Strong acid-base reactions are exothermic because bond formation in water molecules releases energy.',
    tags: ['Chemistry', 'Thermodynamics'],
    isArchived: false,
    version: 1,
    authorName: 'Mrs. Sarah Connor',
    authorId: 'tch_03',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q_sample_04',
    schoolId: '',
    subjectId: 'sub_bio_01',
    subjectName: 'Life Sciences',
    classGrade: 'Grade 10',
    title: 'Explain the process of photosynthesis in green plant cells, detailing the role of chlorophyll and light-dependent reactions.',
    type: 'essay',
    difficulty: 'Hard',
    bloomLevel: 'Creating',
    points: 10,
    explanation: 'Expected key terms: Chloroplasts, thylakoid membrane, photon absorption, photolysis of water ($2H_2O \\to 4H^+ + 4e^- + O_2$), ATP and NADPH production, Calvin cycle.',
    markingScheme: '2 marks for location, 3 marks for light-dependent reactions, 3 marks for light-independent Calvin cycle, 2 marks for chemical equation.',
    tags: ['Biology', 'Photosynthesis', 'Cellular Process'],
    isArchived: false,
    version: 1,
    authorName: 'Dr. Evelyn Reed',
    authorId: 'tch_01',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q_sample_05',
    schoolId: '',
    subjectId: 'sub_math_01',
    subjectName: 'Mathematics',
    classGrade: 'Grade 10',
    title: 'Calculate the derivative $f\'(x)$ of $f(x) = 3x^4 - 5x^2 + 7$ at $x = 2$. Enter the final numerical answer.',
    type: 'numeric',
    difficulty: 'Medium',
    bloomLevel: 'Applying',
    points: 5,
    correctAnswer: 76,
    explanation: '$f\'(x) = 12x^3 - 10x$. Substituting $x = 2$: $12(8) - 10(2) = 96 - 20 = 76$.',
    tags: ['Calculus', 'Derivatives'],
    isArchived: false,
    version: 1,
    authorName: 'Dr. Evelyn Reed',
    authorId: 'tch_01',
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_EXAMS: CbtExamConfig[] = [
  {
    id: 'exam_sample_01',
    schoolId: '',
    title: 'Grade 10 Mathematics Term 1 Mid-Term Examination',
    subjectId: 'sub_math_01',
    subjectName: 'Mathematics',
    classId: 'cls_grade_10a',
    className: 'Grade 10A',
    teacherId: 'tch_01',
    teacherName: 'Dr. Evelyn Reed',
    academicYear: '2026',
    term: 'Term 1',
    examType: 'Mid-Term Exam',
    durationMinutes: 45,
    totalPoints: 20,
    passingScorePercentage: 50,
    startDate: new Date(Date.now() - 3600000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    instructions: 'Ensure you maintain full screen mode. Tab switching, copying, or leaving the window will log a security violation. Autosave is active continuously.',
    randomizeQuestions: true,
    randomizeOptions: true,
    negativeMarking: false,
    maxAttempts: 2,
    autoSubmitOnTimeExpire: true,
    showResultsImmediately: true,
    showExplanationsAfterExam: true,
    secureExamMode: true,
    allowOneQuestionAtATime: false,
    status: 'Live',
    questionIds: ['q_sample_01', 'q_sample_02', 'q_sample_03', 'q_sample_05'],
    questionsCount: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'exam_sample_02',
    schoolId: '',
    title: 'Grade 11 & 12 Physical Sciences National Mock CBT',
    subjectId: 'sub_phys_01',
    subjectName: 'Physical Sciences',
    classId: 'cls_grade_11b',
    className: 'Grade 11 B',
    teacherId: 'tch_02',
    teacherName: 'Prof. Alan Thorne',
    academicYear: '2026',
    term: 'Term 1',
    examType: 'National Exam Prep',
    durationMinutes: 60,
    totalPoints: 25,
    passingScorePercentage: 60,
    startDate: new Date(Date.now() - 7200000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    instructions: 'Comprehensive Mechanics, Thermodynamics, and Chemical Reactions Mock Test. High vigilance security profile active.',
    randomizeQuestions: true,
    randomizeOptions: true,
    negativeMarking: true,
    negativeMarkingFactor: 0.25,
    maxAttempts: 1,
    autoSubmitOnTimeExpire: true,
    showResultsImmediately: true,
    showExplanationsAfterExam: true,
    secureExamMode: true,
    allowOneQuestionAtATime: true,
    status: 'Live',
    questionIds: ['q_sample_01', 'q_sample_02', 'q_sample_03', 'q_sample_04', 'q_sample_05'],
    questionsCount: 5,
    createdAt: new Date().toISOString()
  }
];

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

      const res = await fetch('/api/ai/ask', {
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
