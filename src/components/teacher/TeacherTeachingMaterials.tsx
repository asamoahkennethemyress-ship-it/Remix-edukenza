import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Upload, 
  Search, 
  Download, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Trash2, 
  Plus, 
  X, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

export interface TeacherTeachingMaterialsProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface MaterialDoc {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  fileType: 'PDF' | 'DOCX' | 'PPT' | 'Image' | 'Video' | 'Link';
  fileUrl: string;
  fileName: string;
  className: string;
  subjectName: string;
  description?: string;
  createdAt?: any;
}

export const TeacherTeachingMaterials: React.FC<TeacherTeachingMaterialsProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  currentUser,
  showToast
}) => {
  const [materials, setMaterials] = useState<MaterialDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    className: string;
    subjectName: string;
    fileType: 'PDF' | 'DOCX' | 'PPT' | 'Image' | 'Video' | 'Link';
    description: string;
    externalUrl: string;
  }>({
    title: '',
    className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
    subjectName: assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || assignedSubjects[0] || '',
    fileType: 'PDF',
    description: '',
    externalUrl: ''
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch Teaching Materials
  const fetchMaterials = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'lessonMaterials'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: MaterialDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MaterialDoc));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setMaterials(list);
    } catch (err) {
      console.error("Error fetching materials:", err);
      showToast("Failed to load teaching materials", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [schoolId]);

  // Upload & Save Material
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.className || !form.subjectName) {
      showToast("Please fill in required fields", "error");
      return;
    }

    setUploading(true);
    try {
      let fileUrl = form.externalUrl;
      let fileName = 'External Link / Attachment';

      if (uploadFile) {
        fileName = uploadFile.name;
        try {
          const storageRef = ref(storage, `teachingMaterials/${schoolId}/${Date.now()}_${uploadFile.name}`);
          const snapshot = await uploadBytes(storageRef, uploadFile);
          fileUrl = await getDownloadURL(snapshot.ref);
        } catch (e) {
          console.warn("Storage fallback:", e);
          fileUrl = URL.createObjectURL(uploadFile);
        }
      }

      const payload: MaterialDoc = {
        schoolId,
        teacherId: currentUser?.uid || '',
        teacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        title: form.title,
        fileType: form.fileType,
        fileUrl: fileUrl || '#',
        fileName,
        className: form.className,
        subjectName: form.subjectName,
        description: form.description,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'lessonMaterials'), payload);
      showToast("Teaching material uploaded & assigned!", "success");

      setIsModalOpen(false);
      setUploadFile(null);
      setForm({
        title: '',
        className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
        subjectName: assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || assignedSubjects[0] || '',
        fileType: 'PDF',
        description: '',
        externalUrl: ''
      });
      fetchMaterials();
    } catch (err) {
      console.error("Upload material error:", err);
      showToast("Failed to upload material", "error");
    } finally {
      setUploading(false);
    }
  };

  // Delete Material
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      await deleteDoc(doc(db, 'lessonMaterials', id));
      showToast("Material removed", "info");
      fetchMaterials();
    } catch (err) {
      showToast("Failed to delete material", "error");
    }
  };

  // Filtered list
  const filteredMaterials = materials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        m.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'All' || m.className === selectedClass;
    const matchSubject = selectedSubject === 'All' || m.subjectName === selectedSubject;
    return matchSearch && matchClass && matchSubject;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Image': return <ImageIcon className="w-6 h-6 text-emerald-600" />;
      case 'Video': return <Video className="w-6 h-6 text-purple-600" />;
      case 'PDF': return <FileText className="w-6 h-6 text-red-600" />;
      default: return <File className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Teaching Materials Library</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Upload and assign PDF notes, presentations, images, and instructional videos for your students.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search material title or file name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Classes</option>
            {assignedClasses.map((c, i) => (
              <option key={i} value={c.name || c.className || c}>
                {c.name || c.className || c}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Subjects</option>
            {assignedSubjects.map((s, i) => (
              <option key={i} value={s.name || s.subjectName || s}>
                {s.name || s.subjectName || s}
              </option>
            ))}
          </select>

          <button
            onClick={fetchMaterials}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MATERIALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No teaching materials found. Click "Upload Material" to upload notes.
          </div>
        ) : (
          filteredMaterials.map(m => (
            <div key={m.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(m.fileType)}
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      {m.fileType}
                    </span>
                  </div>
                  <button
                    onClick={() => m.id && handleDelete(m.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-sm font-black text-[#002147]">{m.title}</h3>
                
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <span>Class: {m.className}</span>
                  <span>•</span>
                  <span>Subject: {m.subjectName}</span>
                </div>

                {m.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {m.fileName}
                </span>

                <a
                  href={m.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Download / View</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#D4AF37]" />
                Upload Teaching Material
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 3 Lecture Slides & Worksheets"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    required
                    value={form.className}
                    onChange={e => setForm({ ...form, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {assignedClasses.map((c, i) => (
                      <option key={i} value={c.name || c.className || c}>
                        {c.name || c.className || c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={form.subjectName}
                    onChange={e => setForm({ ...form, subjectName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {assignedSubjects.map((s, i) => (
                      <option key={i} value={s.name || s.subjectName || s}>
                        {s.name || s.subjectName || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Material Format</label>
                <select
                  value={form.fileType}
                  onChange={e => setForm({ ...form, fileType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word Document (.docx)</option>
                  <option value="PPT">PowerPoint Presentation (.ppt)</option>
                  <option value="Image">Image / Diagram</option>
                  <option value="Video">Video Lesson</option>
                  <option value="Link">Web Link / Video URL</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Upload File (Firebase Storage)</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Or External URL / Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.externalUrl}
                  onChange={e => setForm({ ...form, externalUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes for students on how to use this material..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {uploading ? 'Uploading...' : 'Save & Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
