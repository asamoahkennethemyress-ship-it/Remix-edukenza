import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  Plus,
  Sparkles,
  QrCode,
  Video,
  Music,
  FileText,
  BarChart,
  Download,
  Eye,
  Star,
  Bookmark,
  Share2,
  CheckCircle2,
  Lock,
  RefreshCw,
  Folder,
  Tag,
  GraduationCap,
  Layers,
  Printer,
  Edit,
  Trash2,
  Book,
  FileSpreadsheet,
  Clock,
  ExternalLink
} from 'lucide-react';
import { LibraryResource, LibraryCategory, LibraryFormat } from '../../types/library';
import { LibraryService } from '../../services/libraryService';
import { LibraryBookReaderModal } from './LibraryBookReaderModal';
import { LibraryMediaViewerModal } from './LibraryMediaViewerModal';
import { LibraryAiWorkspaceModal } from './LibraryAiWorkspaceModal';
import { LibraryResourceEditorModal } from './LibraryResourceEditorModal';
import { LibraryBorrowingModal } from './LibraryBorrowingModal';
import { LibraryAnalyticsView } from './LibraryAnalyticsView';

interface DigitalLibraryDashboardProps {
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'student' | 'teacher' | 'school_admin' | 'owner' | 'parent';
  currentUserGrade?: string;
  schoolName?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DigitalLibraryDashboard: React.FC<DigitalLibraryDashboardProps> = ({
  schoolId,
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserGrade = 'Grade 10',
  schoolName = 'EDUkenZA Academy',
  showToast
}) => {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [activeViewTab, setActiveViewTab] = useState<'catalog' | 'bookmarks' | 'history' | 'media' | 'analytics' | 'offline'>('catalog');

  // Modal States
  const [readerResource, setReaderResource] = useState<LibraryResource | null>(null);
  const [mediaResource, setMediaResource] = useState<LibraryResource | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiResource, setAiResource] = useState<LibraryResource | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [resourceToEdit, setResourceToEdit] = useState<LibraryResource | null>(null);

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState<boolean>(false);
  const [resourceToBorrow, setResourceToBorrow] = useState<LibraryResource | null>(null);

  // Real-time Firestore Subscription for Library Resources with Role-Based Access
  useEffect(() => {
    setLoading(true);
    const unsub = LibraryService.subscribeToResources(
      schoolId,
      (data) => {
        setResources(data);
        setLoading(false);
      },
      { userRole: currentUserRole, userId: currentUserId }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [schoolId, currentUserRole, currentUserId]);

  // Real-time User Bookmarks Subscription
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = LibraryService.subscribeToBookmarks(currentUserId, (bookmarks) => {
      setBookmarkedIds(bookmarks.map(b => b.resourceId));
    });

    return () => {
      if (unsub) unsub();
    };
  }, [currentUserId]);

  // Real-time User Recently Viewed Subscription
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = LibraryService.subscribeToRecentlyViewed(currentUserId, (history) => {
      setRecentlyViewed(history);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [currentUserId]);

  // Derived Filters
  const categoriesList = ['All', 'Books', 'Textbooks', 'Novels', 'Journals', 'Curriculum', 'Lesson Notes', 'Past Questions', 'Videos', 'Audio Lessons', 'Laboratory Manuals', 'School Policies', 'Student Handbooks', 'Parent Guides'];
  const formatsList = ['All', 'PDF', 'DOCX', 'PPTX', 'ZIP', 'MP3', 'MP4'];
  const subjectsList = ['All', ...Array.from(new Set(resources.map(r => r.subject))).filter(Boolean)];
  const gradesList = ['All', ...Array.from(new Set(resources.map(r => r.gradeClass))).filter(Boolean)];

  const filteredResources = resources.filter(r => {
    // Tab filtering
    if (activeViewTab === 'bookmarks' && !bookmarkedIds.includes(r.id)) {
      return false;
    }
    if (activeViewTab === 'media') {
      const isMedia = r.format === 'MP3' || r.format === 'MP4' || r.category === 'Videos' || r.category === 'Audio Lessons';
      if (!isMedia) return false;
    }
    if (activeViewTab === 'offline') {
      const offlineIds = LibraryService.getOfflineCachedResources().map(o => o.id);
      if (!offlineIds.includes(r.id)) return false;
    }

    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const matchesFormat = selectedFormat === 'All' || r.format === selectedFormat;
    const matchesSubject = selectedSubject === 'All' || r.subject === selectedSubject;
    const matchesGrade = selectedGrade === 'All' || r.gradeClass === selectedGrade || r.gradeClass === 'All Grades';

    return matchesSearch && matchesCategory && matchesFormat && matchesSubject && matchesGrade;
  });

  const featuredResources = resources.filter(r => r.isFeatured || r.isRecommended);

  // Helper triggers
  const openReader = (resource: LibraryResource) => {
    // Record recently viewed in user state
    LibraryService.trackRecentlyViewed(currentUserId, schoolId, resource);

    if (resource.format === 'MP3' || resource.format === 'MP4' || resource.category === 'Videos' || resource.category === 'Audio Lessons') {
      setMediaResource(resource);
    } else {
      setReaderResource(resource);
    }
  };

  const handleToggleBookmark = async (resource: LibraryResource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isNowBookmarked = await LibraryService.toggleBookmark(currentUserId, schoolId, resource);
      if (showToast) {
        showToast(
          isNowBookmarked ? 'Added to your Library Bookmarks' : 'Removed from your Library Bookmarks',
          'info'
        );
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    }
  };

  const openAiHelper = (resource?: LibraryResource, promptText?: string) => {
    setAiResource(resource || null);
    setAiPrompt(promptText || '');
    setIsAiModalOpen(true);
  };

  const openEditor = (resource?: LibraryResource) => {
    setResourceToEdit(resource || null);
    setIsEditorOpen(true);
  };

  const openBorrowing = (resource?: LibraryResource) => {
    setResourceToBorrow(resource || null);
    setIsBorrowModalOpen(true);
  };

  const handleDeleteResource = async (resource: LibraryResource) => {
    if (confirm(`Are you sure you want to remove "${resource.title}" from the Digital Library? Any uploaded files in Storage will be deleted.`)) {
      await LibraryService.deleteResource(resource.id, resource.storageFilePath, resource.storageCoverPath);
      if (showToast) showToast('Resource and associated storage files deleted', 'info');
    }
  };

  const handleCacheOffline = async (resource: LibraryResource) => {
    const success = await LibraryService.cacheResourceOffline(resource);
    if (success) {
      if (showToast) showToast(`"${resource.title}" saved for offline reading!`, 'success');
    } else {
      if (showToast) showToast('Failed to save resource offline', 'error');
    }
  };

  const canManage = currentUserRole === 'teacher' || currentUserRole === 'school_admin' || currentUserRole === 'owner';

  return (
    <div className="space-y-6 font-sans text-slate-900">
      
      {/* TOP BRAND BANNER */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#002147] via-[#001738] to-[#001026] text-white border border-[#D4AF37]/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-[#002147]">
              EDUkenZA Enterprise Module
            </span>
            <span className="text-xs text-amber-300 font-bold">• {schoolName}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
            Production Digital Library & Learning Hub
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Secure, centralized digital curriculum, e-textbooks, research journals, multi-format media, past exam papers, and physical inventory circulation for {schoolName}.
          </p>
        </div>

        {/* TOP CONTROLS & MANAGEMENT */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => openAiHelper()}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer border border-purple-400/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Research Assistant</span>
          </button>

          {canManage && (
            <button
              onClick={() => openEditor()}
              className="px-5 py-2.5 rounded-2xl bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* RECENTLY READ BANNER FOR ACTIVE USER */}
      {recentlyViewed.length > 0 && activeViewTab === 'catalog' && (
        <div className="p-4 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pick Up Where You Left Off ({recentlyViewed.length})
            </h3>
            <button
              onClick={() => setActiveViewTab('history')}
              className="text-[11px] text-slate-400 hover:text-white underline font-medium cursor-pointer"
            >
              View Full History
            </button>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {recentlyViewed.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  const targetRes = resources.find(r => r.id === item.resourceId);
                  if (targetRes) openReader(targetRes);
                }}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 cursor-pointer transition shrink-0 min-w-[240px]"
              >
                {item.coverImage ? (
                  <img src={item.coverImage} alt={item.title} className="w-10 h-14 object-cover rounded-lg border border-slate-600 shrink-0" />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                    <Book className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate max-w-[170px]">{item.title}</p>
                  <p className="text-[10px] text-slate-300 truncate">{item.author || item.subject}</p>
                  <span className="text-[9px] text-amber-400 font-mono">
                    {new Date(item.lastViewedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveViewTab('catalog')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'catalog' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Catalog ({resources.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('bookmarks')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'bookmarks' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>My Bookmarks ({bookmarkedIds.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'history' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Reading History ({recentlyViewed.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('media')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'media' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Audio & Video</span>
          </button>

          {(currentUserRole === 'school_admin' || currentUserRole === 'owner') && (
            <button
              onClick={() => setActiveViewTab('analytics')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'analytics' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <BarChart className="w-4 h-4" />
              <span>Library Analytics</span>
            </button>
          )}

          <button
            onClick={() => setActiveViewTab('offline')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'offline' ? 'bg-[#002147] text-[#D4AF37] font-black shadow' : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Offline Saved ({LibraryService.getOfflineCachedResources().length})</span>
          </button>
        </div>
      </div>

      {/* ANALYTICS VIEW TAB */}
      {activeViewTab === 'analytics' && (
        <LibraryAnalyticsView resources={resources} schoolName={schoolName} />
      )}

      {/* READING HISTORY TAB */}
      {activeViewTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002147] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" /> Your Personal Reading & Study History
            </h3>
          </div>

          {recentlyViewed.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Clock className="w-10 h-10 mx-auto text-slate-400" />
              <h4 className="text-sm font-black text-slate-700">No reading history recorded yet</h4>
              <p className="text-xs text-slate-500">Resources you read or listen to will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentlyViewed.map((item) => {
                const targetRes = resources.find(r => r.id === item.resourceId);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#D4AF37] transition flex items-start gap-4"
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="w-16 h-22 object-cover rounded-xl border border-slate-100 shrink-0" />
                    ) : (
                      <div className="w-16 h-22 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shrink-0">
                        <Book className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-black text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{item.author}</p>
                      <p className="text-[10px] text-amber-600 font-bold">{item.subject}</p>
                      <p className="text-[10px] text-slate-400">Viewed: {new Date(item.lastViewedAt).toLocaleString()}</p>
                      {targetRes && (
                        <button
                          onClick={() => openReader(targetRes)}
                          className="mt-2 px-3 py-1 rounded-lg bg-[#002147] text-[#D4AF37] font-bold text-[10px] hover:bg-[#001733] cursor-pointer"
                        >
                          Resume Reading
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CATALOG / BOOKMARKS / MEDIA / OFFLINE TABS */}
      {activeViewTab !== 'analytics' && activeViewTab !== 'history' && (
        <div className="space-y-6">
          
          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="w-full flex-1 relative">
                <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books, authors, subjects, past papers, CAPS topics..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#002147]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                >
                  <option value="All">Category: All</option>
                  {categoriesList.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                >
                  <option value="All">Subject: All</option>
                  {subjectsList.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                >
                  <option value="All">Grade: All</option>
                  {gradesList.filter(g => g !== 'All').map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* FEATURED / CAROUSEL CORNER */}
          {featuredResources.length > 0 && searchQuery === '' && selectedCategory === 'All' && activeViewTab === 'catalog' && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002147] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Featured & Recommended Reading
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredResources.slice(0, 4).map(res => (
                  <div key={res.id} className="p-4 rounded-3xl bg-gradient-to-br from-[#002147] to-[#00152e] text-white border border-[#D4AF37]/30 shadow-lg space-y-3 flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      {res.coverImage ? (
                        <img
                          src={res.coverImage}
                          alt={res.title}
                          className="w-16 h-22 object-cover rounded-xl shadow border border-amber-400/40 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-22 rounded-xl bg-slate-900 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                          <Book className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#D4AF37] text-[#002147]">
                          {res.category}
                        </span>
                        <h4 className="text-xs font-black text-white mt-1 line-clamp-2">{res.title}</h4>
                        <p className="text-[10px] text-slate-300 truncate mt-0.5">{res.author}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
                      <button
                        onClick={() => openReader(res)}
                        className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#002147] font-black text-[11px] hover:bg-amber-400 cursor-pointer"
                      >
                        Read / Open
                      </button>
                      <button
                        onClick={() => openAiHelper(res)}
                        className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
                        title="AI Assist"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002147] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                {activeViewTab === 'bookmarks'
                  ? `My Bookmarked Resources (${filteredResources.length})`
                  : activeViewTab === 'media'
                  ? `Audio & Video Media Hub (${filteredResources.length})`
                  : activeViewTab === 'offline'
                  ? `Offline Cached Resources (${filteredResources.length})`
                  : `Digital Library Catalog (${filteredResources.length})`}
              </h3>
            </div>

            {loading ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <RefreshCw className="w-8 h-8 mx-auto text-[#002147] animate-spin" />
                <p className="text-xs font-bold text-slate-500">Connecting to Firebase Digital Library...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <Book className="w-12 h-12 mx-auto text-slate-400" />
                <h4 className="text-sm font-black text-slate-700">
                  {activeViewTab === 'bookmarks'
                    ? 'You have not bookmarked any resources yet'
                    : 'No library resources found'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeViewTab === 'bookmarks'
                    ? 'Click the bookmark icon on any textbook, past paper, or document to keep it in your personal bookmarks.'
                    : canManage
                    ? 'Click "Upload Resource" above to upload curriculum textbooks, past papers, notes, or media files directly into Firebase.'
                    : 'No learning materials are currently available in this filter. Check back once your teachers publish resources.'}
                </p>
                {canManage && activeViewTab !== 'bookmarks' && (
                  <button
                    onClick={() => openEditor()}
                    className="mt-2 px-5 py-2.5 rounded-2xl bg-[#002147] text-[#D4AF37] font-black text-xs uppercase tracking-wider shadow hover:bg-[#001733] cursor-pointer"
                  >
                    Upload First Resource
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(res => {
                  const isBookmarked = bookmarkedIds.includes(res.id);
                  return (
                    <div
                      key={res.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-[#D4AF37] shadow-sm hover:shadow-xl transition duration-300 flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex gap-4">
                          {res.coverImage ? (
                            <img
                              src={res.coverImage}
                              alt={res.title}
                              className="w-20 h-28 object-cover rounded-2xl shadow-md border border-slate-100 group-hover:scale-105 transition duration-300 shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-28 rounded-2xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                              <Book className="w-8 h-8" />
                            </div>
                          )}
                          <div className="truncate min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#002147] text-[#D4AF37]">
                                {res.category}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 font-mono">
                                {res.format}
                              </span>
                              {res.targetAudience && res.targetAudience !== 'all' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  {res.targetAudience}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight group-hover:text-[#002147] transition">
                              {res.title}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 truncate">{res.author}</p>
                            <p className="text-[11px] text-amber-600 font-semibold">{res.subject} • {res.gradeClass}</p>
                          </div>
                        </div>

                        {res.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {res.description}
                          </p>
                        )}

                        {/* STATS & METADATA BADGES */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" /> {res.rating || 5.0} ({res.ratingsCount || 1})
                          </span>
                          <span>{res.downloadsCount || 0} Downloads</span>
                          <span>{res.viewsCount || 0} Views</span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS BAR */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openReader(res)}
                          className="flex-1 py-2.5 rounded-xl bg-[#002147] hover:bg-[#001733] text-[#D4AF37] font-black text-xs uppercase tracking-wider shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read / Play</span>
                        </button>

                        <button
                          onClick={(e) => handleToggleBookmark(res, e)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            isBookmarked
                              ? 'bg-[#D4AF37] text-[#002147] border-[#D4AF37]'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Resource'}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => openAiHelper(res)}
                          className="p-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 cursor-pointer"
                          title="AI Study Helper"
                        >
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        </button>

                        <button
                          onClick={() => openBorrowing(res)}
                          className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                          title="Circulation Checkout"
                        >
                          <QrCode className="w-4 h-4 text-amber-800" />
                        </button>

                        <button
                          onClick={() => handleCacheOffline(res)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Save Offline"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditor(res)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="Edit Resource"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteResource(res)}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer"
                              title="Delete Resource"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ALL MODALS */}
      {readerResource && (
        <LibraryBookReaderModal
          isOpen={!!readerResource}
          onClose={() => setReaderResource(null)}
          resource={readerResource}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          showToast={showToast}
          onOpenAiAssistant={(promptText) => openAiHelper(readerResource, promptText)}
        />
      )}

      {mediaResource && (
        <LibraryMediaViewerModal
          isOpen={!!mediaResource}
          onClose={() => setMediaResource(null)}
          resource={mediaResource}
          showToast={showToast}
          onOpenAiAssistant={(promptText) => openAiHelper(mediaResource, promptText)}
        />
      )}

      {isAiModalOpen && (
        <LibraryAiWorkspaceModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          resource={aiResource}
          initialPrompt={aiPrompt}
          userRole={currentUserRole}
          showToast={showToast}
        />
      )}

      {isEditorOpen && (
        <LibraryResourceEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          schoolId={schoolId}
          uploaderId={currentUserId}
          uploaderName={currentUserName}
          uploaderRole={currentUserRole === 'teacher' ? 'teacher' : 'school_admin'}
          resourceToEdit={resourceToEdit}
          showToast={showToast}
        />
      )}

      {isBorrowModalOpen && (
        <LibraryBorrowingModal
          isOpen={isBorrowModalOpen}
          onClose={() => setIsBorrowModalOpen(false)}
          schoolId={schoolId}
          resourceToBorrow={resourceToBorrow}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserGrade={currentUserGrade}
          userRole={currentUserRole}
          showToast={showToast}
        />
      )}

    </div>
  );
};
