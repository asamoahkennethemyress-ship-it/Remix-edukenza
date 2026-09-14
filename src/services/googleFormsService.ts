import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export interface GoogleFormItem {
  id?: string;
  title: string;
  description?: string;
  type: 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROP_DOWN' | 'LINEAR_SCALE' | 'SECTION';
  options?: string[];
  required?: boolean;
  scaleLow?: number;
  scaleHigh?: number;
  scaleLowLabel?: string;
  scaleHighLabel?: string;
}

export interface GoogleFormRecord {
  id?: string;
  schoolId: string;
  schoolName?: string;
  formId: string;
  title: string;
  description?: string;
  responderUri: string;
  editUri?: string;
  category: 'quiz' | 'survey' | 'admission' | 'feedback' | 'assignment' | 'general';
  targetRole?: 'students' | 'teachers' | 'parents' | 'public' | 'all';
  status: 'draft' | 'published' | 'closed';
  published: boolean;
  acceptingResponses: boolean;
  createdByUid: string;
  createdByName: string;
  ownerUid: string;
  createdAt?: any;
  updatedAt?: any;
  lastSyncedAt?: any;
  responseCount?: number;
}

export interface GoogleFormAnswerDetail {
  questionId: string;
  questionTitle?: string;
  values: string[];
}

export interface GoogleFormResponseData {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, any>;
  parsedAnswers?: GoogleFormAnswerDetail[];
}

let inMemoryAccessToken: string | null = null;

export const FORMS_SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Obtain an OAuth access token for Google Forms & Drive APIs
 */
export async function getGoogleFormsAccessToken(forcePrompt = false): Promise<string> {
  if (!forcePrompt && inMemoryAccessToken) {
    return inMemoryAccessToken;
  }

  const savedToken = sessionStorage.getItem('edukenza_gforms_token');
  const tokenTimestamp = sessionStorage.getItem('edukenza_gforms_token_time');
  if (!forcePrompt && savedToken && tokenTimestamp) {
    const elapsedMinutes = (Date.now() - parseInt(tokenTimestamp, 10)) / (1000 * 60);
    if (elapsedMinutes < 50) {
      inMemoryAccessToken = savedToken;
      return savedToken;
    }
  }

  const provider = new GoogleAuthProvider();
  FORMS_SCOPES.forEach((scope) => provider.addScope(scope));

  if (forcePrompt) {
    provider.setCustomParameters({ prompt: 'select_account' });
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an OAuth access token for Google Forms.');
    }
    
    inMemoryAccessToken = credential.accessToken;
    sessionStorage.setItem('edukenza_gforms_token', credential.accessToken);
    sessionStorage.setItem('edukenza_gforms_token_time', Date.now().toString());

    return inMemoryAccessToken;
  } catch (error: any) {
    console.error('Error authenticating with Google for Forms:', error);
    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
      throw new Error('Google authorization popup was closed before completing. Please try again.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in window was opened. Please complete the authorization.');
    }
    throw new Error(error.message || 'Google Forms OAuth authorization failed.');
  }
}

export function setCachedAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  if (token) {
    sessionStorage.setItem('edukenza_gforms_token', token);
    sessionStorage.setItem('edukenza_gforms_token_time', Date.now().toString());
  } else {
    sessionStorage.removeItem('edukenza_gforms_token');
    sessionStorage.removeItem('edukenza_gforms_token_time');
  }
}

export function clearGoogleFormsAccessToken() {
  inMemoryAccessToken = null;
  sessionStorage.removeItem('edukenza_gforms_token');
  sessionStorage.removeItem('edukenza_gforms_token_time');
}

/**
 * Log Google Forms actions to the audit_logs collection in Firestore
 */
export async function logGoogleFormsAudit(params: {
  schoolId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'FORM_CREATED' | 'FORM_EDITED' | 'FORM_PUBLISHED' | 'FORM_CLOSED' | 'FORM_OPENED' | 'RESPONSES_FETCHED' | 'FORM_DELETED' | 'GOOGLE_AUTH_SUCCESS' | 'PERMISSION_DENIED';
  formId?: string;
  details: string;
}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      schoolId: params.schoolId,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      formId: params.formId || null,
      module: 'Google Forms Center',
      details: params.details,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not write to audit_logs:', err);
  }
}

/**
 * Create a new Google Form via Google Forms REST API with support for all question types
 */
export async function createGoogleFormViaApi(params: {
  title: string;
  description?: string;
  items?: GoogleFormItem[];
  accessToken?: string;
}): Promise<{ formId: string; responderUri: string; editUri: string; details: any }> {
  const token = params.accessToken || (await getGoogleFormsAccessToken());

  // STEP 1: Create base form (POST /v1/forms)
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: params.title.trim()
      }
    })
  });

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    const message = errJson.error?.message || `Google Forms API Error (${createRes.status})`;
    if (createRes.status === 401 || createRes.status === 403) {
      clearGoogleFormsAccessToken();
      throw new Error(`Google Forms authorization expired or invalid. Please re-authorize: ${message}`);
    }
    throw new Error(message);
  }

  const formMeta = await createRes.json();
  const formId = formMeta.formId;
  const responderUri = formMeta.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
  const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

  // STEP 2: Add description & questions/items via batchUpdate
  const requests: any[] = [];

  if (params.description && params.description.trim()) {
    requests.push({
      updateFormInfo: {
        info: {
          description: params.description.trim()
        },
        updateMask: 'description'
      }
    });
  }

  if (params.items && params.items.length > 0) {
    params.items.forEach((item, index) => {
      if (item.type === 'SECTION') {
        requests.push({
          createItem: {
            item: {
              title: item.title,
              description: item.description || '',
              pageBreakItem: {}
            },
            location: {
              index
            }
          }
        });
      } else if (item.type === 'LINEAR_SCALE') {
        requests.push({
          createItem: {
            item: {
              title: item.title,
              description: item.description || '',
              questionItem: {
                question: {
                  required: !!item.required,
                  scaleQuestion: {
                    low: item.scaleLow || 1,
                    high: item.scaleHigh || 5,
                    lowLabel: item.scaleLowLabel || '',
                    highLabel: item.scaleHighLabel || ''
                  }
                }
              }
            },
            location: {
              index
            }
          }
        });
      } else if (item.type === 'MULTIPLE_CHOICE' || item.type === 'CHECKBOXES' || item.type === 'DROP_DOWN') {
        const typeMap: Record<string, string> = {
          MULTIPLE_CHOICE: 'RADIO',
          CHECKBOXES: 'CHECKBOX',
          DROP_DOWN: 'DROP_DOWN'
        };
        const rawOptions = item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2'];
        const validOptions = rawOptions
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
          .map((opt) => ({ value: opt }));

        requests.push({
          createItem: {
            item: {
              title: item.title,
              description: item.description || '',
              questionItem: {
                question: {
                  required: !!item.required,
                  choiceQuestion: {
                    type: typeMap[item.type] || 'RADIO',
                    options: validOptions.length > 0 ? validOptions : [{ value: 'Option 1' }]
                  }
                }
              }
            },
            location: {
              index
            }
          }
        });
      } else {
        // Text questions (SHORT_ANSWER, PARAGRAPH)
        requests.push({
          createItem: {
            item: {
              title: item.title,
              description: item.description || '',
              questionItem: {
                question: {
                  required: !!item.required,
                  textQuestion: {
                    paragraph: item.type === 'PARAGRAPH'
                  }
                }
              }
            },
            location: {
              index
            }
          }
        });
      }
    });
  }

  if (requests.length > 0) {
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.warn('Batch update for form structure:', errText);
    }
  }

  // STEP 3: Make form accessible to respondents via Google Drive API
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${formId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (driveErr) {
    console.warn('Could not set public Drive permission on form:', driveErr);
  }

  return { 
    formId, 
    responderUri, 
    editUri, 
    details: formMeta 
  };
}

/**
 * Fetch Google Form structure and question metadata directly from API
 */
export async function getGoogleFormDetailsFromApi(formId: string, accessToken?: string): Promise<any> {
  const token = accessToken || (await getGoogleFormsAccessToken());
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearGoogleFormsAccessToken();
      throw new Error('Google Forms authorization expired. Please reconnect Google Forms.');
    }
    if (res.status === 404) {
      throw new Error('Form not found or has been removed from Google Drive.');
    }
    throw new Error(err.error?.message || `Failed to fetch form details (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch Google Form Responses directly from Google Forms REST API
 */
export async function getGoogleFormResponsesFromApi(
  formId: string, 
  accessToken?: string
): Promise<{ responses: GoogleFormResponseData[]; formMeta?: any }> {
  const token = accessToken || (await getGoogleFormsAccessToken());

  // 1. Fetch form questions to map questionId -> question title
  let formStructure: any = null;
  const questionTitleMap: Record<string, string> = {};

  try {
    formStructure = await getGoogleFormDetailsFromApi(formId, token);
    if (formStructure?.items) {
      formStructure.items.forEach((item: any) => {
        if (item.questionItem?.question?.questionId) {
          questionTitleMap[item.questionItem.question.questionId] = item.title;
        }
      });
    }
  } catch (e) {
    console.warn('Could not fetch question title mappings:', e);
  }

  // 2. Fetch responses
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearGoogleFormsAccessToken();
      throw new Error('Google Forms authorization expired. Please reconnect Google Forms.');
    }
    if (res.status === 404) {
      throw new Error('Google Form not found.');
    }
    throw new Error(err.error?.message || `Failed to fetch form responses (${res.status})`);
  }

  const data = await res.json();
  const rawResponses = data.responses || [];

  const parsedList: GoogleFormResponseData[] = rawResponses.map((r: any) => {
    const parsedAnswers: GoogleFormAnswerDetail[] = [];
    const answersObj = r.answers || {};

    Object.keys(answersObj).forEach((qId) => {
      const ansData = answersObj[qId];
      const vals: string[] = [];
      if (ansData.textAnswers?.answers) {
        ansData.textAnswers.answers.forEach((a: any) => {
          if (a.value) vals.push(a.value);
        });
      }
      parsedAnswers.push({
        questionId: qId,
        questionTitle: questionTitleMap[qId] || `Question (${qId.substring(0, 6)})`,
        values: vals.length > 0 ? vals : ['(No answer provided)']
      });
    });

    return {
      responseId: r.responseId,
      createTime: r.createTime,
      lastSubmittedTime: r.lastSubmittedTime || r.createTime,
      respondentEmail: r.respondentEmail || 'Anonymous Respondent',
      answers: answersObj,
      parsedAnswers
    };
  });

  return { responses: parsedList, formMeta: formStructure };
}

/**
 * Trash/Remove the actual Google Form file in Google Drive via Drive API
 */
export async function trashOrDeleteGoogleFormInDrive(formId: string, accessToken?: string): Promise<boolean> {
  try {
    const token = accessToken || (await getGoogleFormsAccessToken());
    // Move file to trash in Google Drive
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${formId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trashed: true
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not trash Google Form in Drive:', err);
    return false;
  }
}

/**
 * Save Google Form reference to Firestore with strict school isolation
 */
export async function saveGoogleFormToFirestore(record: Omit<GoogleFormRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!record.schoolId) {
    throw new Error('Cannot save Google Form without an authorized schoolId.');
  }

  const docRef = await addDoc(collection(db, 'googleForms'), {
    ...record,
    status: record.status || 'published',
    published: record.published !== undefined ? record.published : true,
    acceptingResponses: record.acceptingResponses !== undefined ? record.acceptingResponses : true,
    responseCount: record.responseCount || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSyncedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update Google Form reference in Firestore
 */
export async function updateGoogleFormInFirestore(id: string, updates: Partial<GoogleFormRecord>): Promise<void> {
  const formRef = doc(db, 'googleForms', id);
  await updateDoc(formRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete Google Form reference from Firestore
 */
export async function deleteGoogleFormFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'googleForms', id));
}

/**
 * Extract Form ID from full Google Form URL or raw ID string
 */
export function extractGoogleFormId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  // e.g. https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform or /forms/d/1FAIpQLSc.../edit
  const match = trimmed.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/) || 
                trimmed.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
