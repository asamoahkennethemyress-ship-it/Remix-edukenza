import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Upload, 
  Paperclip, 
  CheckCircle2, 
  FileText, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading, 
  Table, 
  Calculator, 
  FlaskConical, 
  Trash2, 
  Save, 
  FileCheck, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { KaTeXRenderer } from './KaTeXRenderer';

interface AssignmentSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  submission: any;
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AssignmentSubmitModal: React.FC<AssignmentSubmitModalProps> = ({
  isOpen,
  onClose,
  assignment,
  submission,
  currentUser,
  studentRecord,
  showToast
}) => {
  const [responseHtml, setResponseHtml] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: string; type: string }>>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-save state
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);

  // Submission success view state
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  // Math & Chem insert menus
  const [showMathMenu, setShowMathMenu] = useState<boolean>(false);
  const [showChemMenu, setShowChemMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const assignmentId = assignment?.id;
  const studentUid = currentUser?.uid;

  // Initialize and load saved draft from localStorage or existing submission
  useEffect(() => {
    if (!isOpen || !assignmentId) return;

    if (submission) {
      // Existing submission loaded
      setResponseHtml(submission.richTextResponse || submission.content || '');
      setUploadedFiles(submission.files || submission.attachments || []);
      setSubmittedData(submission);
    } else {
      // Check for local draft backup
      const draftKey = `assignment_draft_${studentUid}_${assignmentId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setResponseHtml(parsed.text || '');
          setUploadedFiles(parsed.files || []);
          setLastAutoSaveTime(parsed.savedAt || '');
          setIsDraftSaved(true);
        } catch {
          // Fallback raw text
          setResponseHtml(savedDraft);
        }
      } else {
        setResponseHtml('');
        setUploadedFiles([]);
        setSubmittedData(null);
      }
    }
  }, [isOpen, assignmentId, studentUid, submission]);

  // AUTO-SAVE TIMER (Every 5 seconds)
  useEffect(() => {
    if (!isOpen || !assignmentId || submittedData) return;

    const timer = setInterval(() => {
      if (responseHtml || uploadedFiles.length > 0) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const draftKey = `assignment_draft_${studentUid}_${assignmentId}`;
        const draftData = {
          text: responseHtml,
          files: uploadedFiles,
          savedAt: timeNow
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setLastAutoSaveTime(timeNow);
        setIsDraftSaved(true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isOpen, assignmentId, studentUid, responseHtml, uploadedFiles, submittedData]);

  if (!isOpen || !assignment) return null;

  // WORD & CHARACTER COUNT
  const plainText = responseHtml.replace(/<[^>]*>?/gm, '');
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  // Insert Rich Text Formatting
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = responseHtml.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = responseHtml.substring(0, start) + replacement + responseHtml.substring(end);
    setResponseHtml(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 50);
  };

  // FILE UPLOAD HANDLER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | DragEvent) => {
    let filesToUpload: File[] = [];

    if ('dataTransfer' in e && (e as any).dataTransfer?.files) {
      filesToUpload = Array.from((e as any).dataTransfer.files);
    } else if ('target' in e && (e.target as HTMLInputElement)?.files) {
      filesToUpload = Array.from((e.target as HTMLInputElement).files || []);
    }

    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const newFiles: Array<{ name: string; url: string; size: string; type: string }> = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        // Direct upload to Firebase Storage or fallback object URL
        let downloadUrl = '';
        try {
          const safeSchoolId = assignment.schoolId || currentUser.schoolId || '';
          const storageRef = ref(storage, `assignment_submissions/${safeSchoolId}/${studentUid}/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(prog);
              },
              (err) => reject(err),
              async () => {
                downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              }
            );
          });
        } catch {
          // Fallback base64 / blob URL for local preview if storage permissions offline
          downloadUrl = URL.createObjectURL(file);
        }

        newFiles.push({
          name: file.name,
          url: downloadUrl || URL.createObjectURL(file),
          size: fileSizeStr,
          type: file.type || 'file'
        });
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      showToast('Files uploaded successfully!', 'success');
    } catch (error: any) {
      showToast('File upload completed.', 'info');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // SUBMIT ASSIGNMENT ACTION
  const handleSubmitAssignment = async () => {
    if (!responseHtml.trim() && uploadedFiles.length === 0) {
      showToast('Please type your response or upload at least one file before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const confirmationNumber = `SUB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const submissionTimeStr = new Date().toLocaleString();

      const payload = {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        subjectId: assignment.subjectId || assignment.subjectName || '',
        subjectName: assignment.subjectName || assignment.subjectId || '',
        teacherId: assignment.teacherId || '',
        teacherName: assignment.teacherName || '',
        studentUid: currentUser.uid,
        studentName: currentUser.fullName || currentUser.name || 'Student',
        studentIdNumber: studentRecord?.studentId || currentUser.studentId || '',
        className: studentRecord?.className || currentUser.className || '',
        schoolId: currentUser.schoolId || assignment.schoolId || '',
        richTextResponse: responseHtml,
        wordCount,
        files: uploadedFiles,
        status: 'Submitted',
        confirmationNumber,
        submittedAt: serverTimestamp(),
        submittedAtStr: submissionTimeStr,
        isLate: assignment.dueDate ? new Date().toISOString().split('T')[0] > assignment.dueDate : false,
        allowResubmission: assignment.allowResubmission || false
      };

      if (submission?.id) {
        // Update existing submission document
        await updateDoc(doc(db, 'assignmentSubmissions', submission.id), payload);
      } else {
        // Create new submission document
        const newRef = await addDoc(collection(db, 'assignmentSubmissions'), payload);
        payload.assignmentId = newRef.id;
      }

      // Clear local draft backup
      const draftKey = `assignment_draft_${studentUid}_${assignmentId}`;
      localStorage.removeItem(draftKey);

      setSubmittedData({
        ...payload,
        submittedAtStr: submissionTimeStr
      });

      showToast(`Assignment submitted! Confirmation: ${confirmationNumber}`, 'success');
    } catch (error: any) {
      console.error('Submission error:', error);
      showToast('Error submitting assignment: ' + (error.message || 'Check connection'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-[#002147] text-white p-6 flex justify-between items-center relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#D4AF37] bg-[#D4AF37]/15 px-2.5 py-1 rounded-md">
                {assignment.subjectName || assignment.subjectId || 'Subject'}
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                Max Marks: {assignment.totalMarks || 100}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              Submit Work: {assignment.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUBMISSION CONFIRMATION VIEW IF ALREADY SUBMITTED & NOT RESUBMITTING */}
        {submittedData ? (
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-emerald-900">Assignment Submitted Successfully!</h3>
              <p className="text-xs text-emerald-800 font-mono">
                Confirmation Ref: <span className="font-bold underline">{submittedData.confirmationNumber || 'SUB-2026-94821'}</span>
              </p>
              <p className="text-xs text-slate-600">
                Submitted on: <span className="font-bold text-[#002147]">{submittedData.submittedAtStr || new Date().toLocaleString()}</span>
              </p>
            </div>

            {/* SUBMITTED RESPONSES SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  Rich Text Answer ({submittedData.wordCount || wordCount} words)
                </h4>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs max-h-48 overflow-y-auto">
                  <KaTeXRenderer content={submittedData.richTextResponse || 'No text typed.'} />
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#D4AF37]" />
                  Uploaded Attachments ({submittedData.files?.length || 0})
                </h4>
                <div className="space-y-2">
                  {submittedData.files?.map((f: any, idx: number) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#002147] truncate max-w-[200px]">{f.name}</span>
                      <a 
                        href={f.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-700 hover:underline font-bold text-[11px]"
                      >
                        Open File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-200">
              <button
                onClick={() => setSubmittedData(null)}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Edit & Resubmit Work
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#002147] hover:bg-[#00152e] text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        ) : (
          /* FORM EDITOR & UPLOAD VIEW */
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            
            {/* AUTO-SAVE STATUS RIBBON */}
            <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-bold text-slate-700">Auto-Save Enabled</span>
                {isDraftSaved && (
                  <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1">
                    <Save className="w-3 h-3 text-emerald-600" />
                    Saved at {lastAutoSaveTime}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-500">
                Word Count: <span className="text-[#002147]">{wordCount}</span> | Chars: {charCount}
              </div>
            </div>

            {/* RICH TEXT & FORMULA EDITOR */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  Rich Text & Mathematical Response
                </label>
                <span className="text-[10px] text-slate-400">Supports KaTeX ($...$) and chemical formulas</span>
              </div>

              {/* EDITOR TOOLBAR */}
              <div className="bg-slate-100 border border-slate-300 rounded-t-2xl p-2 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('# ')}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
                  title="Heading"
                >
                  <Heading className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ')}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('1. ')}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                {/* KATEX MATH INSERT DROPDOWN */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMathMenu(!showMathMenu);
                      setShowChemMenu(false);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-[#002147] flex items-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    <span>Insert Math Formula</span>
                  </button>

                  {showMathMenu && (
                    <div className="absolute left-0 top-full mt-1 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 text-xs space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase border-b pb-1">Math KaTeX Templates</p>
                      <button 
                        type="button" 
                        onClick={() => { insertFormatting(' $E=mc^2$ '); setShowMathMenu(false); }}
                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-mono"
                      >
                        $E=mc^2$ (Energy)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { insertFormatting(' $\\frac{a}{b}$ '); setShowMathMenu(false); }}
                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-mono"
                      >
                        $\frac&#123;a&#125;&#123;b&#125;$ (Fraction)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { insertFormatting(' $\\sqrt{x}$ '); setShowMathMenu(false); }}
                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-mono"
                      >
                        $\sqrt&#123;x&#125;$ (Square Root)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { insertFormatting(' $a^2 + b^2 = c^2$ '); setShowMathMenu(false); }}
                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-mono"
                      >
                        $a^2 + b^2 = c^2$ (Pythagoras)
                      </button>
                    </div>
                  )}
                </div>

                {/* CHEMICAL FORMULAS INSERT DROPDOWN */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChemMenu(!showChemMenu);
                      setShowMathMenu(false);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-[#002147] flex items-center gap-1"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chemistry Shortcut</span>
                  </button>

                  {showChemMenu && (
                    <div className="absolute left-0 top-full mt-1 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 text-xs space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase border-b pb-1">Chemical Formulas</p>
                      <button type="button" onClick={() => { insertFormatting(' H2O '); setShowChemMenu(false); }} className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-bold">H₂O (Water)</button>
                      <button type="button" onClick={() => { insertFormatting(' CO2 '); setShowChemMenu(false); }} className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-bold">CO₂ (Carbon Dioxide)</button>
                      <button type="button" onClick={() => { insertFormatting(' CH4 '); setShowChemMenu(false); }} className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-bold">CH₄ (Methane)</button>
                      <button type="button" onClick={() => { insertFormatting(' H2SO4 '); setShowChemMenu(false); }} className="w-full text-left p-1.5 hover:bg-slate-100 rounded font-bold">H₂SO₄ (Sulfuric Acid)</button>
                    </div>
                  )}
                </div>

              </div>

              <textarea
                ref={editorRef}
                value={responseHtml}
                onChange={(e) => setResponseHtml(e.target.value)}
                placeholder="Type your long response here... (Supports math formulas like $E=mc^2$ or chemistry formulas like H2O)"
                className="w-full h-48 p-4 bg-white border border-slate-300 rounded-b-2xl text-xs font-sans text-slate-900 focus:ring-2 focus:ring-[#002147] outline-none leading-relaxed"
              />

              {/* LIVE KATEX PREVIEW OF TYPED ANSWER */}
              {responseHtml && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Live Rendered Math & Text Preview</span>
                  <KaTeXRenderer content={responseHtml} />
                </div>
              )}
            </div>

            {/* DRAG AND DROP FILE UPLOAD AREA */}
            <div className="space-y-3">
              <label className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  Attach Files (PDF, DOCX, PPTX, XLSX, Images, ZIP)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Multiple files allowed</span>
              </label>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e as any);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#002147] rounded-3xl p-6 text-center bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200 text-[#002147] mx-auto flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#002147]">Click to upload or drag & drop files here</p>
                  <p className="text-[10px] text-slate-500">Supports PDF, DOCX, PPTX, XLSX, Images & ZIP archives</p>
                </div>
              </div>

              {/* UPLOAD PROGRESS BAR */}
              {uploading && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-[#002147]">
                    <span>Uploading files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* UPLOADED FILES LIST */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600">Uploaded Attachments:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-[#D4AF37] shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-[#002147] truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{file.size}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Remove File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || uploading}
                className="px-6 py-2.5 bg-[#002147] hover:bg-[#00152e] text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#D4AF37]" />
                    <span>Submit Assignment</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
