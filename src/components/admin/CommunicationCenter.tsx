import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { 
  Megaphone, 
  Bell, 
  Calendar, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Paperclip, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock, 
  Users, 
  UserCheck, 
  Building2, 
  Upload, 
  Download, 
  Eye, 
  Archive, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  X,
  FileCheck,
  Tag,
  Share2
} from 'lucide-react';

import { 
  triggerSchoolAnnouncementNotification, 
  triggerSchoolEventNotification 
} from '../../services/notificationService';

export interface CommunicationCenterProps {
  schoolId: string;
  schoolProfile?: any;
  students: any[];
  teachers: any[];
  parents: any[];
  classes: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type AudienceType = 'All Users' | 'Teachers' | 'Students' | 'Parents' | 'Specific Class';
export type PriorityType = 'Low' | 'Medium' | 'High' | 'Urgent';
export type AnnouncementStatus = 'Draft' | 'Published' | 'Archived';

export interface Announcement {
  id?: string;
  schoolId: string;
  title: string;
  message: string;
  audience: AudienceType;
  classId?: string;
  className?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  publishDate: string;
  expiryDate?: string;
  priority: PriorityType;
  status: AnnouncementStatus;
  createdAt?: any;
  updatedAt?: any;
}

export type NotificationRecipientType = 'Entire School' | 'Teachers' | 'Students' | 'Parents' | 'Class' | 'Individual';
export type NotificationType = 'Information' | 'Reminder' | 'Warning' | 'Emergency';

export interface SystemNotification {
  id?: string;
  schoolId: string;
  title: string;
  message: string;
  recipientType: NotificationRecipientType;
  targetId?: string; // classId or userId
  targetName?: string;
  type: NotificationType;
  deliveryMethods: {
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
  sentAt?: any;
  createdBy?: string;
}

export type EventCategory = 'Academic' | 'PTA Meeting' | 'Sports' | 'Examination' | 'Holiday' | 'General';

export interface SchoolEvent {
  id?: string;
  schoolId: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  audience: AudienceType;
  createdAt?: any;
}

export type DocumentCategory = 'Circular' | 'Policy' | 'Handbook' | 'Timetable' | 'Academic Calendar' | 'Form' | 'Other';

export interface SchoolDocument {
  id?: string;
  schoolId: string;
  title: string;
  description: string;
  category: DocumentCategory;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  targetAudience: AudienceType;
  uploadedAt?: any;
}

export function CommunicationCenter({
  schoolId,
  schoolProfile,
  students,
  teachers,
  parents,
  classes,
  showToast
}: CommunicationCenterProps) {
  // Main Tab Selection
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications' | 'events' | 'documents'>('announcements');

  // Firestore Data State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Announcement Modal State
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<Partial<Announcement>>({
    title: '',
    message: '',
    audience: 'All Users',
    classId: '',
    priority: 'Medium',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'Published'
  });
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);

  // Notification Modal / Direct Send State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState<Partial<SystemNotification>>({
    title: '',
    message: '',
    recipientType: 'Entire School',
    targetId: '',
    type: 'Information',
    deliveryMethods: {
      inApp: true,
      push: true,
      email: false
    }
  });

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [eventForm, setEventForm] = useState<Partial<SchoolEvent>>({
    title: '',
    description: '',
    category: 'Academic',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    venue: 'Main Assembly Hall',
    audience: 'All Users'
  });

  // Document Modal State
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState<Partial<SchoolDocument>>({
    title: '',
    description: '',
    category: 'Circular',
    targetAudience: 'All Users'
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  // Delete Confirm Modal State
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: 'announcement' | 'notification' | 'event' | 'document';
    item: any;
  }>({ open: false, type: 'announcement', item: null });

  // Load Firestore Data
  const fetchAllData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Announcements
      const qAnn = query(collection(db, 'announcements'), where('schoolId', '==', schoolId));
      const snapAnn = await getDocs(qAnn);
      const annList: Announcement[] = [];
      snapAnn.forEach(d => annList.push({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(annList);

      // 2. Notifications
      const qNot = query(collection(db, 'notifications'), where('schoolId', '==', schoolId));
      const snapNot = await getDocs(qNot);
      const notList: SystemNotification[] = [];
      snapNot.forEach(d => notList.push({ id: d.id, ...d.data() } as SystemNotification));
      setNotifications(notList);

      // 3. Events
      const qEve = query(collection(db, 'events'), where('schoolId', '==', schoolId));
      const snapEve = await getDocs(qEve);
      const eveList: SchoolEvent[] = [];
      snapEve.forEach(d => eveList.push({ id: d.id, ...d.data() } as SchoolEvent));
      setEvents(eveList);

      // 4. Documents
      const qDoc = query(collection(db, 'documents'), where('schoolId', '==', schoolId));
      const snapDoc = await getDocs(qDoc);
      const docList: SchoolDocument[] = [];
      snapDoc.forEach(d => docList.push({ id: d.id, ...d.data() } as SchoolDocument));
      setDocuments(docList);
    } catch (err) {
      console.error("Error fetching communication data:", err);
      showToast("Error loading communication center items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [schoolId]);

  // Helper file upload to Firebase Storage
  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    try {
      const storageRef = ref(storage, `${folder}/${schoolId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn("Storage upload failed, fallback to Object URL:", err);
      return URL.createObjectURL(file);
    }
  };

  // 1. ANNOUNCEMENT ACTIONS
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) {
      showToast("Title and Message are required", "error");
      return;
    }

    setSaving(true);
    try {
      let attachmentUrl = announcementForm.attachmentUrl || '';
      let attachmentName = announcementForm.attachmentName || '';

      if (announcementFile) {
        setUploadingFile(true);
        attachmentUrl = await uploadFileToStorage(announcementFile, 'announcements');
        attachmentName = announcementFile.name;
        setUploadingFile(false);
      }

      const className = announcementForm.audience === 'Specific Class' && announcementForm.classId
        ? classes.find(c => c.id === announcementForm.classId)?.name || ''
        : '';

      const payload = {
        schoolId,
        title: announcementForm.title,
        message: announcementForm.message,
        audience: announcementForm.audience || 'All Users',
        classId: announcementForm.classId || '',
        className,
        attachmentUrl,
        attachmentName,
        publishDate: announcementForm.publishDate || new Date().toISOString().split('T')[0],
        expiryDate: announcementForm.expiryDate || '',
        priority: announcementForm.priority || 'Medium',
        status: announcementForm.status || 'Published',
        updatedAt: serverTimestamp()
      };

      if (editingAnnouncement?.id) {
        await updateDoc(doc(db, 'announcements', editingAnnouncement.id), payload);
        showToast("Announcement updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...payload,
          createdAt: serverTimestamp()
        });

        // Trigger real-time Firestore notification to target audience
        await triggerSchoolAnnouncementNotification({
          title: announcementForm.title || 'Official Notice',
          audience: announcementForm.audience || 'All Users',
          schoolId,
          targetClass: className
        });

        showToast("Announcement published & broadcasted successfully!", "success");
      }

      setIsAnnouncementModalOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementFile(null);
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast("Failed to save announcement", "error");
    } finally {
      setSaving(false);
    }
  };

  // 2. SEND NOTIFICATION ACTION
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      showToast("Title and Notification Message are required", "error");
      return;
    }

    setSaving(true);
    try {
      let targetName = 'Entire School';
      if (notificationForm.recipientType === 'Class' && notificationForm.targetId) {
        targetName = classes.find(c => c.id === notificationForm.targetId)?.name || 'Class';
      } else if (notificationForm.recipientType === 'Individual' && notificationForm.targetId) {
        const found = [...students, ...teachers, ...parents].find(u => u.id === notificationForm.targetId || u.uid === notificationForm.targetId);
        targetName = found?.name || `${found?.firstName || ''} ${found?.lastName || ''}`.trim() || 'User';
      } else {
        targetName = notificationForm.recipientType || 'Entire School';
      }

      const payload = {
        schoolId,
        title: notificationForm.title,
        message: notificationForm.message,
        recipientType: notificationForm.recipientType || 'Entire School',
        targetId: notificationForm.targetId || '',
        targetName,
        type: notificationForm.type || 'Information',
        deliveryMethods: {
          inApp: notificationForm.deliveryMethods?.inApp ?? true,
          push: notificationForm.deliveryMethods?.push ?? true,
          email: notificationForm.deliveryMethods?.email ?? false
        },
        sentAt: serverTimestamp()
      };

      await addDoc(collection(db, 'notifications'), payload);
      showToast(`Notification sent successfully to ${targetName}!`, "success");

      setIsNotificationModalOpen(false);
      setNotificationForm({
        title: '',
        message: '',
        recipientType: 'Entire School',
        targetId: '',
        type: 'Information',
        deliveryMethods: { inApp: true, push: true, email: false }
      });
      fetchAllData();
    } catch (err) {
      showToast("Failed to send notification", "error");
    } finally {
      setSaving(false);
    }
  };

  // 3. SCHOOL EVENT ACTION
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      showToast("Event title and date are required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId,
        title: eventForm.title,
        description: eventForm.description || '',
        category: eventForm.category || 'Academic',
        date: eventForm.date,
        time: eventForm.time || '09:00',
        venue: eventForm.venue || 'School Grounds',
        audience: eventForm.audience || 'All Users',
        createdAt: serverTimestamp()
      };

      if (editingEvent?.id) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
        showToast("School Event updated successfully", "success");
      } else {
        await addDoc(collection(db, 'events'), payload);
        showToast("New School Event scheduled!", "success");
      }

      setIsEventModalOpen(false);
      setEditingEvent(null);
      fetchAllData();
    } catch (err) {
      showToast("Failed to save event", "error");
    } finally {
      setSaving(false);
    }
  };

  // 4. DOCUMENT ACTION
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.title || (!docFile && !documentForm.fileUrl)) {
      showToast("Title and Document File are required", "error");
      return;
    }

    setSaving(true);
    try {
      let fileUrl = documentForm.fileUrl || '';
      let fileName = documentForm.fileName || 'document.pdf';
      let fileSize = documentForm.fileSize || '1.2 MB';

      if (docFile) {
        setUploadingFile(true);
        fileUrl = await uploadFileToStorage(docFile, 'documents');
        fileName = docFile.name;
        fileSize = `${(docFile.size / (1024 * 1024)).toFixed(2)} MB`;
        setUploadingFile(false);
      }

      const payload = {
        schoolId,
        title: documentForm.title,
        description: documentForm.description || '',
        category: documentForm.category || 'Circular',
        fileUrl,
        fileName,
        fileSize,
        targetAudience: documentForm.targetAudience || 'All Users',
        uploadedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'documents'), payload);
      showToast("Document uploaded and shared successfully!", "success");

      setIsDocumentModalOpen(false);
      setDocFile(null);
      setDocumentForm({
        title: '',
        description: '',
        category: 'Circular',
        targetAudience: 'All Users'
      });
      fetchAllData();
    } catch (err) {
      showToast("Failed to upload document", "error");
    } finally {
      setSaving(false);
    }
  };

  // DELETE CONFIRMED ITEM
  const handleConfirmDelete = async () => {
    if (!deleteModal.item?.id) return;
    setSaving(true);
    try {
      const colMap = {
        announcement: 'announcements',
        notification: 'notifications',
        event: 'events',
        document: 'documents'
      };

      await deleteDoc(doc(db, colMap[deleteModal.type], deleteModal.item.id));
      showToast("Item deleted successfully", "success");
      setDeleteModal({ open: false, type: 'announcement', item: null });
      fetchAllData();
    } catch (err) {
      showToast("Failed to delete item", "error");
    } finally {
      setSaving(false);
    }
  };

  // FILTERED LISTS
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAudience = selectedAudienceFilter === 'All' || a.audience === selectedAudienceFilter;
      return matchSearch && matchAudience;
    });
  }, [announcements, searchTerm, selectedAudienceFilter]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      return n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             n.message.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [notifications, searchTerm]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategoryFilter === 'All' || e.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [events, searchTerm, selectedCategoryFilter]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategoryFilter === 'All' || d.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [documents, searchTerm, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-amber-400 animate-bounce" />
            <h1 className="text-2xl font-black tracking-tight">School Communication Center</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Broadcast announcements, dispatch instant notifications, organize school calendar events, and distribute official documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'announcements' && (
            <button
              onClick={() => {
                setEditingAnnouncement(null);
                setAnnouncementForm({
                  title: '',
                  message: '',
                  audience: 'All Users',
                  priority: 'Medium',
                  publishDate: new Date().toISOString().split('T')[0],
                  status: 'Published'
                });
                setIsAnnouncementModalOpen(true);
              }}
              className="bg-amber-400 hover:bg-amber-500 text-[#002147] font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          )}

          {activeTab === 'notifications' && (
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" />
              Dispatch Notification
            </button>
          )}

          {activeTab === 'events' && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setEventForm({
                  title: '',
                  description: '',
                  category: 'Academic',
                  date: new Date().toISOString().split('T')[0],
                  time: '09:00',
                  venue: 'School Grounds',
                  audience: 'All Users'
                });
                setIsEventModalOpen(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Calendar className="w-4 h-4" />
              Schedule Event
            </button>
          )}

          {activeTab === 'documents' && (
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>
      </div>

      {/* TOP MODULE TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'announcements'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          Announcements ({announcements.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'notifications'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-400" />
          Notifications & Alerts ({notifications.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'events'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-400" />
          School Events ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'documents'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          Documents & Policies ({documents.length})
        </button>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {activeTab === 'announcements' && (
            <select
              value={selectedAudienceFilter}
              onChange={e => setSelectedAudienceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium"
            >
              <option value="All">All Audiences</option>
              <option value="All Users">All Users</option>
              <option value="Teachers">Teachers</option>
              <option value="Students">Students</option>
              <option value="Parents">Parents</option>
              <option value="Specific Class">Specific Class</option>
            </select>
          )}

          {(activeTab === 'events' || activeTab === 'documents') && (
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium"
            >
              <option value="All">All Categories</option>
              {activeTab === 'events' ? (
                <>
                  <option value="Academic">Academic</option>
                  <option value="PTA Meeting">PTA Meeting</option>
                  <option value="Sports">Sports</option>
                  <option value="Examination">Examination</option>
                  <option value="Holiday">Holiday</option>
                  <option value="General">General</option>
                </>
              ) : (
                <>
                  <option value="Circular">Circular</option>
                  <option value="Policy">Policy</option>
                  <option value="Handbook">Handbook</option>
                  <option value="Timetable">Timetable</option>
                  <option value="Academic Calendar">Academic Calendar</option>
                  <option value="Form">Form</option>
                </>
              )}
            </select>
          )}

          <button
            onClick={fetchAllData}
            title="Refresh list"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION 1: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
              <p className="text-xs">Loading announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No Announcements Found</p>
              <p className="text-xs text-slate-400">Click "New Announcement" to publish school updates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAnnouncements.map(ann => {
                const getPriorityBadge = (p: PriorityType) => {
                  switch (p) {
                    case 'Urgent': return 'bg-red-100 text-red-800 border-red-200 font-bold';
                    case 'High': return 'bg-amber-100 text-amber-800 border-amber-200';
                    case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200';
                    default: return 'bg-slate-100 text-slate-700 border-slate-200';
                  }
                };

                return (
                  <div key={ann.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityBadge(ann.priority)}`}>
                          {ann.priority} Priority
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ann.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ann.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-[#002147] line-clamp-2">
                        {ann.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {ann.message}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-md">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Audience: {ann.audience} {ann.className ? `(${ann.className})` : ''}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          Published: {ann.publishDate}
                        </span>
                      </div>

                      {ann.attachmentUrl && (
                        <a
                          href={ann.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#002147] font-bold bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                          {ann.attachmentName || 'Download Attachment'}
                        </a>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingAnnouncement(ann);
                            setAnnouncementForm({ ...ann });
                            setIsAnnouncementModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, type: 'announcement', item: ann })}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-black text-[#002147] flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                Dispatched Real-Time Notifications History
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Bell className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No Sent Notifications</p>
                <p className="text-xs text-slate-400">Click "Dispatch Notification" to broadcast alerts.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100/70 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Notification Title</th>
                      <th className="p-3.5">Message</th>
                      <th className="p-3.5">Recipient</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Delivery Channels</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredNotifications.map(not => (
                      <tr key={not.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-[#002147]">
                          {not.title}
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">
                          {not.message}
                        </td>
                        <td className="p-3.5 font-medium">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                            {not.targetName || not.recipientType}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            not.type === 'Emergency' ? 'bg-red-100 text-red-800' :
                            not.type === 'Warning' ? 'bg-amber-100 text-amber-800' :
                            not.type === 'Reminder' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {not.type}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex gap-1 text-[10px]">
                            {not.deliveryMethods?.inApp && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">In-App</span>}
                            {not.deliveryMethods?.push && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold">Push FCM</span>}
                            {not.deliveryMethods?.email && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">Email</span>}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'notification', item: not })}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: SCHOOL EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
              <p className="text-xs">Loading school events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No Scheduled Events</p>
              <p className="text-xs text-slate-400">Click "Schedule Event" to add items to the academic calendar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredEvents.map(evt => (
                <div key={evt.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-200 uppercase">
                        {evt.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {evt.time}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-[#002147]">{evt.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3">{evt.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#002147]">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Date: {evt.date}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Venue: {evt.venue}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Audience: {evt.audience}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEditingEvent(evt);
                          setEventForm({ ...evt });
                          setIsEventModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, type: 'event', item: evt })}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
              <p className="text-xs">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No Documents Uploaded</p>
              <p className="text-xs text-slate-400">Click "Upload Document" to share circulars, handbooks, or forms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map(docItem => (
                <div key={docItem.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-full border border-indigo-200">
                        {docItem.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Audience: {docItem.targetAudience}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-[#002147]">{docItem.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{docItem.description}</p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{docItem.fileName}</span>
                      <span>•</span>
                      <span>{docItem.fileSize || 'File'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={docItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition flex items-center gap-1 font-bold text-xs"
                      title="Download / View Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setDeleteModal({ open: true, type: 'document', item: docItem })}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODALS -------------------- */}

      {/* 1. ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                {editingAnnouncement ? 'Edit Announcement' : 'Publish New Announcement'}
              </h3>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Resumption Notice"
                  value={announcementForm.title}
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the full announcement text..."
                  value={announcementForm.message}
                  onChange={e => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audience</label>
                  <select
                    value={announcementForm.audience}
                    onChange={e => setAnnouncementForm({ ...announcementForm, audience: e.target.value as AudienceType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="All Users">All Users</option>
                    <option value="Teachers">Teachers Only</option>
                    <option value="Students">Students Only</option>
                    <option value="Parents">Parents Only</option>
                    <option value="Specific Class">Specific Class</option>
                  </select>
                </div>

                {announcementForm.audience === 'Specific Class' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Class</label>
                    <select
                      value={announcementForm.classId}
                      onChange={e => setAnnouncementForm({ ...announcementForm, classId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="">-- Select Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={announcementForm.priority}
                    onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value as PriorityType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent / Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Publish Date</label>
                  <input
                    type="date"
                    value={announcementForm.publishDate}
                    onChange={e => setAnnouncementForm({ ...announcementForm, publishDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Optional Attachment (PDF, Image, Doc)</label>
                <input
                  type="file"
                  onChange={e => setAnnouncementFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#0d3b66] text-white font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  {saving ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. NOTIFICATION DISPATCH MODAL */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500" />
                Dispatch Real-Time Notification
              </h3>
              <button
                onClick={() => setIsNotificationModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notification Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fee Payment Reminder"
                  value={notificationForm.title}
                  onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write message to send instantly..."
                  value={notificationForm.message}
                  onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recipients</label>
                  <select
                    value={notificationForm.recipientType}
                    onChange={e => setNotificationForm({ ...notificationForm, recipientType: e.target.value as NotificationRecipientType, targetId: '' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Entire School">Entire School</option>
                    <option value="Teachers">All Teachers</option>
                    <option value="Students">All Students</option>
                    <option value="Parents">All Parents</option>
                    <option value="Class">Specific Class</option>
                    <option value="Individual">Individual User</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notification Type</label>
                  <select
                    value={notificationForm.type}
                    onChange={e => setNotificationForm({ ...notificationForm, type: e.target.value as NotificationType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Information">Information</option>
                    <option value="Reminder">Reminder</option>
                    <option value="Warning">Warning</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {notificationForm.recipientType === 'Class' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Target Class</label>
                  <select
                    value={notificationForm.targetId}
                    onChange={e => setNotificationForm({ ...notificationForm, targetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {notificationForm.recipientType === 'Individual' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Recipient User</label>
                  <select
                    value={notificationForm.targetId}
                    onChange={e => setNotificationForm({ ...notificationForm, targetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Select User --</option>
                    <optgroup label="Teachers">
                      {teachers.map(t => (
                        <option key={t.id || t.uid} value={t.id || t.uid}>Teacher: {t.name || `${t.firstName} ${t.lastName}`}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Parents">
                      {parents.map(p => (
                        <option key={p.id || p.uid} value={p.id || p.uid}>Parent: {p.name || `${p.firstName} ${p.lastName}`}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Students">
                      {students.map(s => (
                        <option key={s.id || s.uid} value={s.id || s.uid}>Student: {s.name || `${s.firstName} ${s.lastName}`}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <label className="block font-bold text-slate-700">Delivery Channels</label>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationForm.deliveryMethods?.inApp}
                      onChange={e => setNotificationForm({
                        ...notificationForm,
                        deliveryMethods: { ...notificationForm.deliveryMethods!, inApp: e.target.checked }
                      })}
                      className="rounded text-[#002147]"
                    />
                    In-App Bell
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationForm.deliveryMethods?.push}
                      onChange={e => setNotificationForm({
                        ...notificationForm,
                        deliveryMethods: { ...notificationForm.deliveryMethods!, push: e.target.checked }
                      })}
                      className="rounded text-[#002147]"
                    />
                    Push Notification (FCM)
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationForm.deliveryMethods?.email}
                      onChange={e => setNotificationForm({
                        ...notificationForm,
                        deliveryMethods: { ...notificationForm.deliveryMethods!, email: e.target.checked }
                      })}
                      className="rounded text-[#002147]"
                    />
                    Email Broadcast
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {saving ? "Sending..." : "Dispatch Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                {editingEvent ? 'Edit School Event' : 'Schedule New School Event'}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Inter-House Sports Competition"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details about venue, schedule, rules..."
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Event Category</label>
                  <select
                    value={eventForm.category}
                    onChange={e => setEventForm({ ...eventForm, category: e.target.value as EventCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Academic">Academic</option>
                    <option value="PTA Meeting">PTA Meeting</option>
                    <option value="Sports">Sports</option>
                    <option value="Examination">Examination</option>
                    <option value="Holiday">Holiday</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={eventForm.audience}
                    onChange={e => setEventForm({ ...eventForm, audience: e.target.value as AudienceType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="All Users">All Users</option>
                    <option value="Teachers">Teachers Only</option>
                    <option value="Students">Students Only</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium"
                  value={eventForm.venue}
                  onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DOCUMENT MODAL */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Upload Official School Document
              </h3>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Academic Code of Conduct"
                  value={documentForm.title}
                  onChange={e => setDocumentForm({ ...documentForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of document content..."
                  value={documentForm.description}
                  onChange={e => setDocumentForm({ ...documentForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={documentForm.category}
                    onChange={e => setDocumentForm({ ...documentForm, category: e.target.value as DocumentCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Circular">Circular</option>
                    <option value="Policy">Policy</option>
                    <option value="Handbook">Handbook</option>
                    <option value="Timetable">Timetable</option>
                    <option value="Academic Calendar">Academic Calendar</option>
                    <option value="Form">Form</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={documentForm.targetAudience}
                    onChange={e => setDocumentForm({ ...documentForm, targetAudience: e.target.value as AudienceType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="All Users">All Users</option>
                    <option value="Teachers">Teachers Only</option>
                    <option value="Students">Students Only</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File (PDF, DOC, Images) *</label>
                <input
                  type="file"
                  required
                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDocumentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {saving || uploadingFile ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-base font-black text-[#002147]">Confirm Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this {deleteModal.type}? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModal({ open: false, type: 'announcement', item: null })}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition"
              >
                {saving ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
