import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Copy, 
  Share2, 
  Download, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Mic, 
  BookOpen, 
  Lock, 
  Globe, 
  Users, 
  FolderDown, 
  Tag, 
  Layers, 
  Eye, 
  X, 
  Save, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  UserContentItem, 
  UserContentType, 
  UserShareScope, 
  evaluateContentPermissions 
} from '../../types/userContent';
import { 
  createUserContent, 
  updateUserContent, 
  deleteUserContent, 
  duplicateUserContent, 
  setContentSharing, 
  subscribeUserOwnedContent, 
  subscribeSharedContentForClass,
  downloadContentFile, 
  copyToClipboard 
} from '../../services/userContentService';

export interface UserContentHubProps {
  currentUser: any;
  userRole?: string;
  schoolId?: string;
  defaultTypeFilter?: UserContentType | 'all';
  availableClasses?: string[];
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onReuseContent?: (content: string, item: UserContentItem) => void;
  titleOverride?: string;
  descriptionOverride?: string;
}

export const UserContentHub: React.FC<UserContentHubProps> = ({
  currentUser,
  userRole = currentUser?.role || 'user',
  schoolId = currentUser?.schoolId || '',
  defaultTypeFilter = 'all',
  availableClasses = [],
  showToast,
  onReuseContent,
  titleOverride,
  descriptionOverride
}) => {
  const currentUid = currentUser?.uid || currentUser?.id || '';
  const isStudent = userRole === 'student';
  const isParent = userRole === 'parent';
  const isTeacher = userRole === 'teacher';
  const isAdmin = userRole === 'school_admin' || userRole === 'platform_owner';

  // Content state
  const [myItems, setMyItems] = useState<UserContentItem[]>([]);
  const [sharedItems, setSharedItems] = useState<UserContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'my_content' | 'shared_with_me'>('my_content');
  const [typeFilter, setTypeFilter] = useState<string>(defaultTypeFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Action state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserContentItem | null>(null);
  const [viewingItem, setViewingItem] = useState<UserContentItem | null>(null);
  const [sharingItem, setSharingItem] = useState<UserContentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    type: UserContentType;
    category: string;
    targetClass: string;
    tags: string;
    isShared: boolean;
    shareScope: UserShareScope;
  }>({
    title: '',
    content: '',
    type: 'notes',
    category: 'Personal',
    targetClass: '',
    tags: '',
    isShared: false,
    shareScope: 'private'
  });

  // Sharing Modal state
  const [shareConfig, setShareConfig] = useState<{
    isShared: boolean;
    shareScope: UserShareScope;
    targetClass: string;
  }>({
    isShared: false,
    shareScope: 'private',
    targetClass: ''
  });

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to User's OWN content
    const unsubOwned = subscribeUserOwnedContent(
      currentUid,
      (items) => {
        setMyItems(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Error syncing owned content:', err);
        setLoading(false);
      }
    );

    // 2. Subscribe to Shared Class/School content if student or member
    let unsubShared = () => {};
    const studentClass = currentUser?.className || '';
    if (schoolId) {
      unsubShared = subscribeSharedContentForClass(
        schoolId,
        studentClass,
        (shared) => {
          // Filter out items that are actually owned by the current user to avoid duplicates in the shared view
          const nonOwned = shared.filter(item => item.ownerUid !== currentUid);
          setSharedItems(nonOwned);
        }
      );
    }

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [currentUid, schoolId, currentUser?.className]);

  // Open Create Modal
  const handleOpenCreate = (presetType?: UserContentType) => {
    setEditingItem(null);
    setFormData({
      title: '',
      content: '',
      type: presetType || (typeFilter !== 'all' ? (typeFilter as UserContentType) : 'notes'),
      category: isStudent ? 'Study Notes' : isTeacher ? 'Lesson Note' : isParent ? 'Personal Note' : 'General',
      targetClass: availableClasses[0] || currentUser?.className || '',
      tags: '',
      isShared: false,
      shareScope: 'private'
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: UserContentItem) => {
    const perms = evaluateContentPermissions(item, currentUser);
    if (!perms.canEdit) {
      if (showToast) showToast('You do not have permission to edit this content.', 'error');
      return;
    }

    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      category: item.category,
      targetClass: item.targetClass || '',
      tags: (item.tags || []).join(', '),
      isShared: item.isShared,
      shareScope: item.shareScope
    });
    setIsCreateModalOpen(true);
  };

  // Save / Update Handler
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      if (showToast) showToast('Please provide a title for your content.', 'warning');
      return;
    }
    if (!formData.content.trim()) {
      if (showToast) showToast('Please enter some content before saving.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const parsedTags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingItem) {
        // UPDATE existing content
        await updateUserContent(
          editingItem.id,
          {
            title: formData.title.trim(),
            content: formData.content,
            type: formData.type,
            category: formData.category,
            targetClass: formData.targetClass,
            className: formData.targetClass,
            tags: parsedTags,
            isShared: formData.isShared,
            shareScope: formData.shareScope
          },
          currentUser
        );
        if (showToast) showToast('Content updated successfully!', 'success');
      } else {
        // CREATE new content
        await createUserContent(
          {
            title: formData.title.trim(),
            content: formData.content,
            type: formData.type,
            category: formData.category,
            targetClass: formData.targetClass,
            className: formData.targetClass,
            tags: parsedTags,
            isShared: formData.isShared,
            shareScope: formData.shareScope
          },
          currentUser
        );
        if (showToast) showToast('Content saved to your dashboard!', 'success');
      }

      setIsCreateModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error('Error saving user content:', err);
      if (showToast) showToast(err.message || 'Failed to save content.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (item: UserContentItem) => {
    const perms = evaluateContentPermissions(item, currentUser);
    if (!perms.canDelete) {
      if (showToast) showToast('Permission denied: You cannot delete this item.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
      return;
    }

    try {
      await deleteUserContent(item.id, currentUser);
      if (showToast) showToast('Content deleted.', 'info');
      if (viewingItem?.id === item.id) setViewingItem(null);
    } catch (err: any) {
      console.error('Error deleting content:', err);
      if (showToast) showToast(err.message || 'Failed to delete content.', 'error');
    }
  };

  // Copy / Duplicate Handler
  const handleDuplicate = async (item: UserContentItem) => {
    try {
      await duplicateUserContent(item, currentUser);
      if (showToast) showToast(`Created a copy: "${item.title} (Copy)"`, 'success');
    } catch (err: any) {
      console.error('Error duplicating content:', err);
      if (showToast) showToast('Failed to duplicate content.', 'error');
    }
  };

  // Copy Text Handler
  const handleCopyText = async (item: UserContentItem) => {
    const success = await copyToClipboard(item.content);
    if (success) {
      setCopiedId(item.id);
      if (showToast) showToast('Content copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      if (showToast) showToast('Failed to copy to clipboard.', 'error');
    }
  };

  // Open Share Dialog
  const handleOpenShare = (item: UserContentItem) => {
    const perms = evaluateContentPermissions(item, currentUser);
    if (!perms.canShare) {
      if (showToast) showToast('You cannot manage sharing for this content.', 'error');
      return;
    }

    setSharingItem(item);
    setShareConfig({
      isShared: item.isShared,
      shareScope: item.shareScope,
      targetClass: item.targetClass || availableClasses[0] || ''
    });
  };

  // Apply Share Settings
  const handleSaveSharing = async () => {
    if (!sharingItem) return;
    try {
      await setContentSharing(
        sharingItem.id,
        {
          isShared: shareConfig.isShared,
          shareScope: shareConfig.shareScope,
          targetClass: shareConfig.targetClass,
          sharedWithClasses: shareConfig.targetClass ? [shareConfig.targetClass] : []
        },
        currentUser
      );

      if (showToast) {
        if (shareConfig.isShared) {
          showToast(
            shareConfig.shareScope === 'class'
              ? `Shared with class: ${shareConfig.targetClass}`
              : 'Shared with school community!',
            'success'
          );
        } else {
          showToast('Content set to Private.', 'info');
        }
      }
      setSharingItem(null);
    } catch (err: any) {
      console.error('Error saving sharing:', err);
      if (showToast) showToast(err.message || 'Failed to update sharing.', 'error');
    }
  };

  // Download Handler
  const handleDownload = (item: UserContentItem, format: 'txt' | 'md' | 'json') => {
    downloadContentFile(item.title, item.content, format);
    if (showToast) showToast(`Downloaded "${item.title}" as .${format}`, 'info');
  };

  // Reuse Handler
  const handleReuse = (item: UserContentItem) => {
    if (onReuseContent) {
      onReuseContent(item.content, item);
      if (showToast) showToast(`Loaded "${item.title}" into active workspace!`, 'success');
    } else {
      handleOpenCreate();
      setFormData(prev => ({
        ...prev,
        title: `${item.title} (Reused)`,
        content: item.content,
        type: item.type,
        category: item.category
      }));
    }
  };

  // Current list to display
  const currentList = activeTab === 'my_content' ? myItems : sharedItems;

  // Filter items
  const filteredList = currentList.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (item.creatorName && item.creatorName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesType && matchesCategory && matchesSearch;
  });

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(currentList.map(i => i.category || 'General')))];

  const getTypeIcon = (type: UserContentType) => {
    switch (type) {
      case 'voice_dictation': return <Mic className="w-4 h-4 text-rose-500" />;
      case 'ai_resource': return <Sparkles className="w-4 h-4 text-[#D4AF37]" />;
      case 'learning_resource': return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'assignment_draft': return <Edit3 className="w-4 h-4 text-emerald-500" />;
      case 'document': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'draft': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTypeLabel = (type: UserContentType) => {
    switch (type) {
      case 'voice_dictation': return 'Voice Dictation';
      case 'ai_resource': return 'AI Resource';
      case 'learning_resource': return 'Learning Resource';
      case 'assignment_draft': return 'Assignment Draft';
      case 'document': return 'Document';
      case 'draft': return 'Draft';
      case 'personal_saved': return 'Saved Content';
      default: return 'Personal Note';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#093560] to-[#002147] p-6 rounded-3xl text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-[#D4AF37] text-[#002147] rounded-2xl font-black shadow-inner">
              <FolderDown className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {titleOverride || 'User Content Ownership & Content Hub'}
              </h2>
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Full Lifecycle Control: Create • Edit • Save • Copy • Delete • Share • Download • Reuse
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {descriptionOverride || 'Create, organize, and manage your private educational notes, voice recordings, AI generations, drafts, and resources. You retain complete ownership over everything you create.'}
          </p>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={() => handleOpenCreate()}
          className="px-5 py-3 rounded-2xl bg-[#D4AF37] text-[#002147] font-black text-xs hover:bg-amber-400 transition shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Content</span>
        </button>
      </div>

      {/* TABS: MY CONTENT VS SHARED WITH ME */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('my_content')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'my_content'
                ? 'bg-white text-[#002147] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>My Content ({myItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shared_with_me')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'shared_with_me'
                ? 'bg-white text-[#002147] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Shared with Me ({sharedItems.length})</span>
          </button>
        </div>

        {/* Real-time Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title, tag, or content snippet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Type Filter */}
        <div className="md:col-span-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Content Types</option>
            <option value="voice_dictation">🎤 Voice Dictation</option>
            <option value="ai_resource">✨ AI Resources</option>
            <option value="learning_resource">📚 Learning Resources</option>
            <option value="notes">📝 Personal Notes</option>
            <option value="document">📄 Documents</option>
            <option value="draft">⏳ Drafts</option>
            <option value="personal_saved">💾 Saved Items</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTENT LISTING / CARDS */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Syncing content repository in real time...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">
            {activeTab === 'my_content' ? 'No Personal Content Found' : 'No Shared Content Available'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'my_content'
              ? 'You have not created or saved any content yet in this category. Click "Create New Content" above to save your first note, dictation, or AI resource.'
              : 'No teachers or classmates have shared content with your class or school yet.'}
          </p>
          {activeTab === 'my_content' && (
            <button
              onClick={() => handleOpenCreate()}
              className="px-4 py-2 bg-[#002147] text-[#D4AF37] text-xs font-black rounded-xl hover:bg-slate-900 transition shadow cursor-pointer mt-2"
            >
              + Create First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const perms = evaluateContentPermissions(item, currentUser);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition p-5 flex flex-col justify-between space-y-4 group relative"
              >
                <div className="space-y-3">
                  
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider border border-slate-200">
                        {getTypeIcon(item.type)}
                        <span>{formatTypeLabel(item.type)}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase">
                        {item.category || 'General'}
                      </span>
                    </div>

                    {/* Sharing Pill */}
                    {item.isShared ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-full border border-emerald-200">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{item.shareScope === 'class' ? `Class: ${item.targetClass || 'All'}` : 'School'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-extrabold rounded-full">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 
                      onClick={() => setViewingItem(item)}
                      className="text-sm font-black text-slate-900 line-clamp-2 hover:text-indigo-600 transition cursor-pointer"
                    >
                      {item.title}
                    </h3>

                    {/* Class & Subject Tag */}
                    {(item.targetClass || item.subjectName) && (
                      <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
                        {item.targetClass ? `Class ${item.targetClass}` : ''} {item.subjectName ? `• ${item.subjectName}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Content Excerpt */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                    {item.content}
                  </p>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer / Controls Toolbar */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>By: {item.creatorName || 'You'}</span>
                    <span>{item.dateFormatted || 'Recently'}</span>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    
                    {/* Left Actions: Read / Reuse */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Full Content"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReuse(item)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Reuse / Load into Editor"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(item)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Copy text to clipboard"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(item)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Duplicate as my own copy"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Right Actions: Edit / Share / Delete / Download */}
                    <div className="flex items-center gap-1">
                      
                      {/* Download Menu */}
                      <button
                        type="button"
                        onClick={() => handleDownload(item, 'txt')}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Download as .txt"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Share (Only Owner or Admin) */}
                      {perms.canShare && (
                        <button
                          type="button"
                          onClick={() => handleOpenShare(item)}
                          className={`p-1.5 rounded-lg transition ${
                            item.isShared 
                              ? 'text-emerald-600 bg-emerald-50' 
                              : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="Share with Class or School"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit (Strictly Owner/Authorized) */}
                      {perms.canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Content"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span 
                          className="p-1.5 text-slate-300 cursor-not-allowed" 
                          title="Read-only: You cannot edit another user's content"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {/* Delete (Strictly Owner/Authorized) */}
                      {perms.canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Content"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}

                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT CONTENT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {editingItem ? 'Edit Content' : 'Create New User Content'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="space-y-4">
              
              {/* Type and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Content Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="notes">Personal Notes</option>
                    <option value="voice_dictation">Voice Dictation Note</option>
                    <option value="ai_resource">AI Generated Resource</option>
                    <option value="learning_resource">Learning Material</option>
                    <option value="assignment_draft">Assignment Draft</option>
                    <option value="document">Personal Document</option>
                    <option value="draft">Quick Draft</option>
                    <option value="personal_saved">Saved Content</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science Revision, Meeting Note, Math"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Title / Subject Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Bonding Revision Notes & Formulas"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Class (Optional)
                  </label>
                  {availableClasses.length > 0 ? (
                    <select
                      value={formData.targetClass}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetClass: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- None / General --</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Grade 10A"
                      value={formData.targetClass}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetClass: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="exam, term2, formulas"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Content Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Content Body *
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Type, paste, or format your content here..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y font-mono"
                />
              </div>

              {/* Sharing Checkbox (If Teacher or Admin) */}
              {(isTeacher || isAdmin) && (
                <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-indigo-950">Share with Students/Class</span>
                    <p className="text-[11px] text-slate-500">Allow authorized students in your target class to view this content.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isShared}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isShared: e.target.checked,
                      shareScope: e.target.checked ? 'class' : 'private'
                    }))}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-black text-[#002147] bg-[#D4AF37] hover:bg-amber-400 rounded-xl transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingItem ? 'Save Changes' : 'Save to My Content'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: FULL VIEW / PREVIEW & ACTIONS */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                    {getTypeIcon(viewingItem.type)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {formatTypeLabel(viewingItem.type)} • {viewingItem.category}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{viewingItem.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span>Owner: <strong className="text-slate-900">{viewingItem.creatorName}</strong></span>
              <span>Class: <strong className="text-slate-900">{viewingItem.targetClass || 'All'}</strong></span>
              <span>Status: <strong className="text-slate-900">{viewingItem.isShared ? 'Shared' : 'Private'}</strong></span>
            </div>

            {/* Content Preformatted Body */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-[350px] overflow-y-auto">
              {viewingItem.content}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(viewingItem)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(viewingItem, 'txt')}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(viewingItem, 'md')}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleReuse(viewingItem);
                    setViewingItem(null);
                  }}
                  className="px-4 py-2 bg-[#002147] text-[#D4AF37] text-xs font-black rounded-xl hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reuse Content</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SHARING SETTINGS */}
      {sharingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                  <Share2 className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-black text-slate-900">Share Content Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setSharingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                Configure sharing permissions for <strong>"{sharingItem.title}"</strong>.
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="sharingScope"
                    checked={!shareConfig.isShared}
                    onChange={() => setShareConfig(prev => ({ ...prev, isShared: false, shareScope: 'private' }))}
                    className="text-indigo-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Private (Only You)</span>
                    <span className="text-[11px] text-slate-500">Only you and authorized administrators can view this.</span>
                  </div>
                </label>

                {(isTeacher || isAdmin) && (
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="sharingScope"
                      checked={shareConfig.isShared && shareConfig.shareScope === 'class'}
                      onChange={() => setShareConfig(prev => ({ ...prev, isShared: true, shareScope: 'class' }))}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Share with Specific Class</span>
                      <span className="text-[11px] text-slate-500">Students in this class can view and download.</span>
                    </div>
                  </label>
                )}

                {isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="sharingScope"
                      checked={shareConfig.isShared && shareConfig.shareScope === 'school'}
                      onChange={() => setShareConfig(prev => ({ ...prev, isShared: true, shareScope: 'school' }))}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">School-Wide Community</span>
                      <span className="text-[11px] text-slate-500">All registered members of this school can access.</span>
                    </div>
                  </label>
                )}
              </div>

              {shareConfig.isShared && shareConfig.shareScope === 'class' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Target Class *
                  </label>
                  {availableClasses.length > 0 ? (
                    <select
                      value={shareConfig.targetClass}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, targetClass: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    >
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Grade 10A"
                      value={shareConfig.targetClass}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, targetClass: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSharingItem(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSharing}
                className="px-4 py-2 text-xs font-black text-[#002147] bg-[#D4AF37] hover:bg-amber-400 rounded-xl transition shadow cursor-pointer"
              >
                Update Sharing
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
