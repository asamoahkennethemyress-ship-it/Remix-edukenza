import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Book,
  FileText,
  Save,
  CheckCircle2,
  List,
  Plus,
  Trash2,
  Tag,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
  FileUp,
  Users
} from 'lucide-react';
import { LibraryResource, LibraryCategory, LibraryFormat, TocItem } from '../../types/library';
import { LibraryService } from '../../services/libraryService';

interface LibraryResourceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'teacher' | 'school_admin' | 'librarian' | 'platform_owner';
  resourceToEdit?: LibraryResource | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LibraryResourceEditorModal: React.FC<LibraryResourceEditorModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  uploaderId,
  uploaderName,
  uploaderRole,
  resourceToEdit,
  showToast
}) => {
  const isEdit = !!resourceToEdit;

  const [title, setTitle] = useState(resourceToEdit?.title || '');
  const [author, setAuthor] = useState(resourceToEdit?.author || uploaderName);
  const [isbn, setIsbn] = useState(resourceToEdit?.isbn || '');
  const [publisher, setPublisher] = useState(resourceToEdit?.publisher || 'EDUkenZA Publishing');
  const [category, setCategory] = useState<LibraryCategory>(resourceToEdit?.category || 'Textbooks');
  const [format, setFormat] = useState<LibraryFormat>(resourceToEdit?.format || 'PDF');
  const [subject, setSubject] = useState(resourceToEdit?.subject || 'Mathematics');
  const [gradeClass, setGradeClass] = useState(resourceToEdit?.gradeClass || 'Grade 10');
  const [academicYear, setAcademicYear] = useState(resourceToEdit?.academicYear || '2026');
  const [term, setTerm] = useState(resourceToEdit?.term || 'Term 1-4');
  const [department, setDepartment] = useState(resourceToEdit?.department || 'Academic Department');
  const [description, setDescription] = useState(resourceToEdit?.description || '');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'teachers' | 'parents'>(
    resourceToEdit?.targetAudience || 'all'
  );

  // File and cover states
  const [fileUrl, setFileUrl] = useState(resourceToEdit?.fileUrl || '');
  const [storageFilePath, setStorageFilePath] = useState(resourceToEdit?.storageFilePath || '');
  const [fileSize, setFileSize] = useState(resourceToEdit?.fileSize || '');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [coverImage, setCoverImage] = useState(resourceToEdit?.coverImage || '');
  const [storageCoverPath, setStorageCoverPath] = useState(resourceToEdit?.storageCoverPath || '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const [pagesCount, setPagesCount] = useState(resourceToEdit?.pagesCount || 100);
  const [version, setVersion] = useState(resourceToEdit?.version || '1.0');
  const [isPhysical, setIsPhysical] = useState(resourceToEdit?.isPhysical || false);
  const [totalPhysicalCopies, setTotalPhysicalCopies] = useState(resourceToEdit?.totalPhysicalCopies || 20);
  const [shelfLocation, setShelfLocation] = useState(resourceToEdit?.shelfLocation || 'Shelf A1');
  const [downloadPermitted, setDownloadPermitted] = useState(resourceToEdit?.downloadPermitted ?? true);
  const [printPermitted, setPrintPermitted] = useState(resourceToEdit?.printPermitted ?? true);
  const [tagsInput, setTagsInput] = useState(resourceToEdit?.tags?.join(', ') || 'Textbook, CAPS, Grade 10');

  const [tocList, setTocList] = useState<TocItem[]>(resourceToEdit?.tableOfContents || [
    { id: '1', title: 'Chapter 1: Foundations & Definitions', page: 1 },
    { id: '2', title: 'Chapter 2: Worked Examples & Exercises', page: 25 },
  ]);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(resourceToEdit?.title || '');
      setAuthor(resourceToEdit?.author || uploaderName);
      setIsbn(resourceToEdit?.isbn || '');
      setPublisher(resourceToEdit?.publisher || 'EDUkenZA Publishing');
      setCategory(resourceToEdit?.category || 'Textbooks');
      setFormat(resourceToEdit?.format || 'PDF');
      setSubject(resourceToEdit?.subject || 'Mathematics');
      setGradeClass(resourceToEdit?.gradeClass || 'Grade 10');
      setAcademicYear(resourceToEdit?.academicYear || '2026');
      setTerm(resourceToEdit?.term || 'Term 1-4');
      setDepartment(resourceToEdit?.department || 'Academic Department');
      setDescription(resourceToEdit?.description || '');
      setTargetAudience(resourceToEdit?.targetAudience || 'all');
      setCoverImage(resourceToEdit?.coverImage || '');
      setStorageCoverPath(resourceToEdit?.storageCoverPath || '');
      setFileUrl(resourceToEdit?.fileUrl || '');
      setStorageFilePath(resourceToEdit?.storageFilePath || '');
      setFileSize(resourceToEdit?.fileSize || '');
      setPagesCount(resourceToEdit?.pagesCount || 100);
      setVersion(resourceToEdit?.version || '1.0');
      setIsPhysical(resourceToEdit?.isPhysical || false);
      setTotalPhysicalCopies(resourceToEdit?.totalPhysicalCopies || 20);
      setShelfLocation(resourceToEdit?.shelfLocation || 'Shelf A1');
      setDownloadPermitted(resourceToEdit?.downloadPermitted ?? true);
      setPrintPermitted(resourceToEdit?.printPermitted ?? true);
      setTagsInput(resourceToEdit?.tags?.join(', ') || '');
      setTocList(resourceToEdit?.tableOfContents || [
        { id: '1', title: 'Chapter 1: Foundations & Definitions', page: 1 },
        { id: '2', title: 'Chapter 2: Worked Examples & Exercises', page: 25 },
      ]);
      setUploadedFileName('');
      setFileUploadProgress(0);
      setCoverUploadProgress(0);
    }
  }, [isOpen, resourceToEdit, uploaderName]);

  if (!isOpen) return null;

  const categoriesList: LibraryCategory[] = [
    'Books', 'Textbooks', 'Story Books', 'Novels', 'Journals', 'Research Papers',
    'Magazines', 'Dictionaries', 'Encyclopedias', 'Curriculum', 'Syllabus',
    'Lesson Notes', 'Lecture Notes', 'Teacher Resources', 'Past Questions',
    'Marking Schemes', 'Practical Manuals', 'Videos', 'Audio Lessons', 'Podcasts',
    'Images', 'Infographics', 'Presentations', 'Laboratory Manuals',
    'School Policies', 'Student Handbooks', 'Parent Guides', 'Academic Documents'
  ];

  const formatsList: LibraryFormat[] = [
    'PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT', 'EPUB', 'ZIP', 'RAR', 'PNG', 'JPG', 'MP3', 'MP4'
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 150MB)
    if (file.size > 150 * 1024 * 1024) {
      if (showToast) showToast('File exceeds maximum size of 150MB', 'error');
      return;
    }

    setUploadingFile(true);
    setFileUploadProgress(1);
    setUploadedFileName(file.name);

    try {
      const result = await LibraryService.uploadResourceFile(
        schoolId,
        file,
        (percent) => setFileUploadProgress(percent)
      );

      setFileUrl(result.downloadUrl);
      setStorageFilePath(result.storagePath);
      setFileSize(result.fileSize);
      setFormat(result.format);

      if (!title.trim()) {
        const guessedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(guessedTitle);
      }

      if (showToast) showToast(`File uploaded successfully: ${file.name}`, 'success');
    } catch (err) {
      console.error('File upload failed:', err);
      if (showToast) showToast('Failed to upload file to storage', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Please select a valid image file', 'error');
      return;
    }

    setUploadingCover(true);
    setCoverUploadProgress(1);

    try {
      const result = await LibraryService.uploadCoverImage(
        schoolId,
        file,
        (percent) => setCoverUploadProgress(percent)
      );

      setCoverImage(result.downloadUrl);
      setStorageCoverPath(result.storagePath);
      if (showToast) showToast('Cover image uploaded successfully', 'success');
    } catch (err) {
      console.error('Cover upload failed:', err);
      if (showToast) showToast('Failed to upload cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddToc = () => {
    setTocList([...tocList, { id: `toc_${Date.now()}`, title: 'New Chapter Title', page: (tocList.length + 1) * 20 }]);
  };

  const handleRemoveToc = (id: string) => {
    setTocList(tocList.filter(t => t.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) {
      if (showToast) showToast('Please enter title and subject', 'error');
      return;
    }

    if (!fileUrl.trim()) {
      if (showToast) showToast('Please upload a file or enter a document URL', 'error');
      return;
    }

    setSaving(true);
    try {
      const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

      const payload: Omit<LibraryResource, 'id'> = {
        schoolId,
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        publisher: publisher.trim(),
        category,
        format,
        subject: subject.trim(),
        gradeClass: gradeClass.trim(),
        academicYear: academicYear.trim(),
        term: term.trim(),
        department: department.trim(),
        description: description.trim(),
        targetAudience,
        coverImage: coverImage.trim() || undefined,
        storageCoverPath: storageCoverPath || undefined,
        fileUrl: fileUrl.trim(),
        storageFilePath: storageFilePath || undefined,
        fileSize: fileSize.trim() || undefined,
        pagesCount: Number(pagesCount) || 1,
        uploaderId,
        uploaderName,
        uploaderRole,
        version: version.trim() || '1.0',
        status: 'published',
        publishedAt: resourceToEdit?.publishedAt || new Date().toISOString().split('T')[0],
        downloadsCount: resourceToEdit?.downloadsCount || 0,
        viewsCount: resourceToEdit?.viewsCount || 0,
        rating: resourceToEdit?.rating || 5.0,
        ratingsCount: resourceToEdit?.ratingsCount || 1,
        isPhysical,
        totalPhysicalCopies: isPhysical ? Number(totalPhysicalCopies) : 0,
        availablePhysicalCopies: isPhysical ? Number(totalPhysicalCopies) : 0,
        shelfLocation: isPhysical ? shelfLocation : undefined,
        downloadPermitted,
        printPermitted,
        tags: parsedTags,
        tableOfContents: tocList
      };

      if (isEdit && resourceToEdit) {
        await LibraryService.updateResource(resourceToEdit.id, payload);
        if (showToast) showToast('Resource updated successfully!', 'success');
      } else {
        await LibraryService.createResource(payload);
        if (showToast) showToast('New Digital Library Resource published to Firebase!', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save resource error:', err);
      if (showToast) showToast('Failed to save resource to Firebase', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#001c38] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#001529] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-[#002147] shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                EDUkenZA Digital Library • Production Management
              </p>
              <h2 className="text-base font-black text-white">
                {isEdit ? `Edit Resource: ${resourceToEdit.title}` : 'Upload & Publish New Library Resource'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] text-xs">
          
          {/* REAL FILE & COVER UPLOAD SECTION */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <FileUp className="w-4 h-4" /> Real File & Cover Upload (Firebase Storage)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DOCUMENT / MEDIA FILE UPLOAD */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold block">
                  Library Asset / Document File *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                    fileUrl
                      ? 'border-emerald-500/60 bg-emerald-950/20'
                      : 'border-slate-700 hover:border-amber-400/80 bg-slate-950/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.pptx,.xlsx,.txt,.epub,.zip,.rar,.mp3,.mp4,.png,.jpg"
                  />
                  {uploadingFile ? (
                    <div className="w-full space-y-2">
                      <div className="w-8 h-8 mx-auto border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold text-amber-300">Uploading to Firebase Storage ({fileUploadProgress}%)...</p>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full transition-all duration-200"
                          style={{ width: `${fileUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : fileUrl ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                      <p className="font-black text-white text-xs truncate max-w-xs">{uploadedFileName || 'Storage File Connected'}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">Format: {format} • Size: {fileSize || 'Standard'}</p>
                      <p className="text-[10px] text-slate-400 underline pt-1">Click to replace file</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-200">Click or drag file to upload</p>
                      <p className="text-[10px] text-slate-400">PDF, EPUB, DOCX, PPTX, MP3, MP4, ZIP (Max 150MB)</p>
                    </div>
                  )}
                </div>

                {/* Direct URL Fallback */}
                <div className="pt-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Or direct file URL (optional):</label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://... or uploaded file path"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* COVER IMAGE UPLOAD */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold block">
                  Cover Image / Thumbnail
                </label>
                <div className="flex gap-3 items-start">
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className={`w-28 h-36 rounded-2xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center cursor-pointer transition shrink-0 ${
                      coverImage ? 'border-amber-400 bg-slate-900' : 'border-slate-700 hover:border-amber-400 bg-slate-950'
                    }`}
                  >
                    <input
                      ref={coverInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleCoverUpload}
                      accept="image/*"
                    />
                    {uploadingCover ? (
                      <div className="p-2 text-center">
                        <div className="w-5 h-5 mx-auto border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-1" />
                        <span className="text-[9px] text-amber-300 font-bold">{coverUploadProgress}%</span>
                      </div>
                    ) : coverImage ? (
                      <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-2 text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-60" />
                        <span className="text-[9px] font-bold block">Upload Cover</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-slate-300">
                      Upload a textbook cover, book thumbnail, or course preview graphic.
                    </p>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                    </button>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Or image URL:</label>
                      <input
                        type="url"
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TARGET AUDIENCE & PERMISSIONS */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Target Audience & Role-Based Access Control
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'all', label: 'All Users', desc: 'Students, teachers, parents' },
                { id: 'students', label: 'Students & Staff', desc: 'Accessible to all learners' },
                { id: 'teachers', label: 'Teachers Only', desc: 'Confidential / Lesson plans' },
                { id: 'parents', label: 'Parents & Staff', desc: 'Parent guides & policy' }
              ].map((aud) => (
                <label
                  key={aud.id}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    targetAudience === aud.id
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetAudience"
                      value={aud.id}
                      checked={targetAudience === aud.id}
                      onChange={() => setTargetAudience(aud.id as any)}
                      className="accent-[#D4AF37]"
                    />
                    <span className="font-black text-xs text-white">{aud.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">{aud.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* BASIC INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Book className="w-4 h-4" /> Academic & Metadata Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grade 10 Mathematics Comprehensive CAPS Textbook"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Author / Creator *</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name or Department"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                >
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Format *</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                >
                  {formatsList.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Physical Sciences"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Grade / Class Target</label>
                <input
                  type="text"
                  value={gradeClass}
                  onChange={(e) => setGradeClass(e.target.value)}
                  placeholder="e.g. Grade 10, All Grades"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Pages Count</label>
                <input
                  type="number"
                  min={1}
                  value={pagesCount}
                  onChange={(e) => setPagesCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ISBN / Barcode</label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-0-xxx-xxxx-x"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Description & Learning Outcomes</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed summary of content covered, CAPS/IEB topics, and learning objectives..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Mathematics, Algebra, Grade 10, CAPS"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
              />
            </div>
          </div>

          {/* PHYSICAL INVENTORY & PERMISSIONS */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" /> Physical Inventory & Rights
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPhysical}
                  onChange={(e) => setIsPhysical(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <div>
                  <span className="font-black text-white text-xs">Has Physical Book / Hardcopy Copies</span>
                  <p className="text-[10px] text-slate-400">Enables shelf barcode checkout and physical copy tracking</p>
                </div>
              </label>

              {isPhysical && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Total Physical Copies</label>
                    <input
                      type="number"
                      min={1}
                      value={totalPhysicalCopies}
                      onChange={(e) => setTotalPhysicalCopies(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Shelf / Cabinet Location</label>
                    <input
                      type="text"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      placeholder="e.g. Shelf STEM-A4"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadPermitted}
                  onChange={(e) => setDownloadPermitted(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37]"
                />
                <span className="text-slate-200 font-bold">Allow Offline Download</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printPermitted}
                  onChange={(e) => setPrintPermitted(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37]"
                />
                <span className="text-slate-200 font-bold">Allow Printing</span>
              </label>
            </div>
          </div>

          {/* TABLE OF CONTENTS BUILDER */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <List className="w-4 h-4" /> Table of Contents Builder
              </h3>
              <button
                type="button"
                onClick={handleAddToc}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Chapter
              </button>
            </div>

            <div className="space-y-2">
              {tocList.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 font-bold text-xs">{index + 1}.</span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...tocList];
                      updated[index].title = e.target.value;
                      setTocList(updated);
                    }}
                    placeholder="Chapter Title"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <input
                    type="number"
                    value={item.page || 1}
                    onChange={(e) => {
                      const updated = [...tocList];
                      updated[index].page = Number(e.target.value);
                      setTocList(updated);
                    }}
                    placeholder="Page"
                    className="w-20 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveToc(item.id)}
                    className="p-2 rounded-xl bg-red-950 text-red-400 hover:bg-red-900 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingFile || uploadingCover}
              className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Changes' : 'Publish Resource'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
