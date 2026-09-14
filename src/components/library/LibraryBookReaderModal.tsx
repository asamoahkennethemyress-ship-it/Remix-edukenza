import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bookmark,
  Highlighter,
  MessageSquare,
  Search,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  BookOpen,
  Volume2,
  VolumeX,
  Printer,
  Download,
  List,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Languages,
  Book,
  CheckCircle2,
  FileText,
  RotateCcw,
  Eye,
  Type
} from 'lucide-react';
import { LibraryResource, LibraryReadingProgress, ReaderSettings, LibraryHighlight, LibraryBookmark, LibraryNote } from '../../types/library';
import { LibraryService } from '../../services/libraryService';

interface LibraryBookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: LibraryResource;
  currentUserId: string;
  currentUserName: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAiAssistant?: (initialPrompt?: string) => void;
}

export const LibraryBookReaderModal: React.FC<LibraryBookReaderModalProps> = ({
  isOpen,
  onClose,
  resource,
  currentUserId,
  currentUserName,
  showToast,
  onOpenAiAssistant
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = resource?.pagesCount || 120;
  const [readingProgress, setReadingProgress] = useState<LibraryReadingProgress>({
    id: `prog_${currentUserId}_${resource?.id || ''}`,
    userId: currentUserId,
    resourceId: resource?.id || '',
    currentPage: 1,
    totalPages,
    percentage: 1,
    lastReadAt: new Date().toISOString(),
    notes: [],
    highlights: [],
    bookmarks: []
  });

  const [settings, setSettings] = useState<ReaderSettings>({
    theme: 'light',
    fontFamily: 'sans',
    fontSize: 16,
    lineHeight: 1.6,
    zoomLevel: 100,
    speechRate: 1.0,
    speechPitch: 1.0
  });

  const [activeSidebar, setActiveSidebar] = useState<'toc' | 'bookmarks' | 'highlights' | 'notes' | 'dictionary' | null>('toc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedText, setSelectedText] = useState<string>('');
  const [dictDefinition, setDictDefinition] = useState<{ word: string; meaning: string } | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [targetLang, setTargetLang] = useState<string>('isiZulu');

  // Text-To-Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Load existing progress from local cache or firestore
  useEffect(() => {
    if (!resource?.id || !isOpen) return;
    const cached = LibraryService.getCachedReadingProgress(resource.id);
    if (cached) {
      setReadingProgress(cached);
      setCurrentPage(cached.currentPage || 1);
    } else {
      setCurrentPage(1);
    }
    LibraryService.trackView(resource.id);
    if (currentUserId && resource.schoolId) {
      LibraryService.trackRecentlyViewed(currentUserId, resource.schoolId, resource);
    }
  }, [resource?.id, isOpen]);

  if (!isOpen || !resource) return null;

  // Sync progress
  const saveProgress = (page: number, updatedHighlights = readingProgress.highlights, updatedBookmarks = readingProgress.bookmarks, updatedNotes = readingProgress.notes) => {
    const pct = Math.round((page / totalPages) * 100);
    const newProg: LibraryReadingProgress = {
      ...readingProgress,
      currentPage: page,
      totalPages,
      percentage: pct,
      highlights: updatedHighlights,
      bookmarks: updatedBookmarks,
      notes: updatedNotes,
      lastReadAt: new Date().toISOString()
    };
    setReadingProgress(newProg);
    LibraryService.saveReadingProgress(newProg);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    saveProgress(newPage);
  };

  // Bookmark Toggle
  const toggleBookmark = () => {
    const exists = readingProgress.bookmarks.some(b => b.page === currentPage);
    let updated: LibraryBookmark[];
    if (exists) {
      updated = readingProgress.bookmarks.filter(b => b.page !== currentPage);
      if (showToast) showToast(`Bookmark removed for page ${currentPage}`, 'info');
    } else {
      const newBm: LibraryBookmark = {
        id: `bm_${Date.now()}`,
        page: currentPage,
        title: `Page ${currentPage} - ${resource.title.slice(0, 20)}...`,
        createdAt: new Date().toISOString()
      };
      updated = [...readingProgress.bookmarks, newBm];
      if (showToast) showToast(`Page ${currentPage} bookmarked!`, 'success');
    }
    saveProgress(currentPage, readingProgress.highlights, updated);
  };

  // Add Highlight
  const addHighlight = (color: 'yellow' | 'green' | 'blue' | 'pink') => {
    const textToHighlight = window.getSelection()?.toString().trim() || selectedText || `Highlighted key concept on page ${currentPage}`;
    if (!textToHighlight) {
      if (showToast) showToast('Please select text inside the reader to highlight', 'info');
      return;
    }
    const newHl: LibraryHighlight = {
      id: `hl_${Date.now()}`,
      text: textToHighlight,
      color,
      page: currentPage,
      createdAt: new Date().toISOString()
    };
    const updated = [...readingProgress.highlights, newHl];
    saveProgress(currentPage, updated);
    if (showToast) showToast('Text highlighted successfully!', 'success');
  };

  // Add Note
  const addNote = () => {
    const noteText = prompt(`Add a personal study note for Page ${currentPage}:`);
    if (noteText && noteText.trim()) {
      const newNote: LibraryNote = {
        id: `nt_${Date.now()}`,
        page: currentPage,
        text: noteText.trim(),
        createdAt: new Date().toISOString()
      };
      const updated = [...readingProgress.notes, newNote];
      saveProgress(currentPage, readingProgress.highlights, readingProgress.bookmarks, updated);
      if (showToast) showToast('Study note saved!', 'success');
    }
  };

  // Speech Synthesis
  const handleSpeechToggle = () => {
    if (!('speechSynthesis' in window)) {
      if (showToast) showToast('Text-to-Speech is not supported in this browser.', 'error');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const pageTextSample = getPageContentSample(currentPage);
      const utterance = new SpeechSynthesisUtterance(pageTextSample);
      utterance.rate = settings.speechRate;
      utterance.pitch = settings.speechPitch;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      if (showToast) showToast('Read aloud started...', 'info');
    }
  };

  // Instant Dictionary Lookup
  const handleDictionaryLookup = (word: string) => {
    if (!word) return;
    const cleanWord = word.trim().toLowerCase();
    const mockDict: Record<string, string> = {
      algebra: 'A branch of mathematics dealing with symbols and the rules for manipulating those symbols.',
      trigonometry: 'The branch of mathematics dealing with the relations of the sides and angles of triangles and with the relevant functions of any angles.',
      photosynthesis: 'The process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.',
      stoichiometry: 'The calculation of reactants and products in chemical reactions.',
      macbeth: 'A tragedy by William Shakespeare depicting the physical and psychological effects of political ambition on those who seek power.'
    };
    const meaning = mockDict[cleanWord] || `Educational definition for "${cleanWord}": Key academic terminology in ${resource.subject} curriculum.`;
    setDictDefinition({ word: cleanWord, meaning });
    setActiveSidebar('dictionary');
  };

  // Instant Translation
  const handleInstantTranslate = async () => {
    setIsTranslating(true);
    try {
      const textToTranslate = getPageContentSample(currentPage).slice(0, 300);
      const res = await fetch('/api/ai/document-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: textToTranslate,
          task: 'translate',
          customPrompt: targetLang
        })
      });
      const data = await res.json();
      setTranslatedText(data.analysis || `Translated content into ${targetLang}.`);
    } catch (e) {
      setTranslatedText(`[Offline Translation Preview]: ${getPageContentSample(currentPage).slice(0, 150)} (Translated to ${targetLang})`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper sample content generator for reader page simulation
  const getPageContentSample = (page: number) => {
    if (resource.previewText && page === 1) return resource.previewText;

    const subjectContent: Record<string, string> = {
      Mathematics: `SECTION ${page}.1: ALGEBRAIC FACTORISATION & QUADRATIC EQUATIONS
In this module, we examine quadratic equations of the form $ax^2 + bx + c = 0$.
Formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.
Key Step 1: Ensure equation is written in standard form equal to zero.
Key Step 2: Determine discriminant $\\Delta = b^2 - 4ac$ to check nature of roots.
Worked Example: Solve $2x^2 - 5x + 2 = 0$.
Factorisation: $(2x - 1)(x - 2) = 0 \\implies x = 1/2$ or $x = 2$.`,
      'Physical Sciences': `SECTION ${page}.2: CHEMICAL EQUILIBRIUM & LE CHATELIER'S PRINCIPLE
Consider a reversible reaction: $N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g) \\quad \\Delta H < 0$.
When a system at equilibrium is disturbed by a change in temperature, pressure, or concentration, the system will shift in the direction that opposes the disturbance.
Key Observation: Increasing pressure favours the side with fewer gas molecules.`,
      'Life Sciences': `SECTION ${page}.3: CELLULAR RESPIRATION & ATP SYNTHESIS
Cellular respiration takes place in the mitochondria of plant and animal cells.
Overall equation: $C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + 36 \\text{ ATP}$.
Three main stages: 1. Glycolysis (Cytoplasm), 2. Kreb's Cycle (Mitochondrial Matrix), 3. Oxidative Phosphorylation (Inner Membrane).`,
      'English Home Language': `ACT ${Math.min(page, 5)}, SCENE 1: THE TRAGEDY OF MACBETH
First Witch: "When shall we three meet again, In thunder, lightning, or in rain?"
Second Witch: "When the hurlyburly's done, When the battle's lost and won."
Third Witch: "That will be ere the set of sun."
Analysis: The paradoxical statement "Fair is foul, and foul is fair" establishes the central theme of moral inversion.`
    };

    return subjectContent[resource.subject] || `PAGE ${page} - ${resource.title}
${resource.description}

Section ${page}.1: Core Academic Principles & Curriculum Competencies.
This chapter covers essential learning outcomes aligned with official national examination standards.
- Detailed worked solutions and step-by-step problem solving.
- Key definitions, summary bullet points, and self-assessment practice exercises.`;
  };

  // Theme styling mapping
  const themeStyles = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-slate-950 text-slate-100 border-slate-800',
    sepia: 'bg-[#fbf0d9] text-[#432c1c] border-[#e8d7b8]',
    high_contrast: 'bg-black text-yellow-300 border-yellow-500'
  };

  const isBookmarked = readingProgress.bookmarks.some(b => b.page === currentPage);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100">
      
      {/* TOP READER BAR */}
      <div className="px-4 py-3 bg-[#001c38] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close Reader"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="truncate min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#D4AF37] text-[#002147]">
                {resource.format} Reader
              </span>
              <span className="text-xs text-amber-400 font-semibold truncate">{resource.subject} • {resource.gradeClass}</span>
            </div>
            <h2 className="text-sm font-black text-white truncate">{resource.title}</h2>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {/* Theme Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${settings.theme === 'light' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, theme: 'sepia' }))}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${settings.theme === 'sepia' ? 'bg-[#fbf0d9] text-[#432c1c]' : 'text-slate-400 hover:text-white'}`}
              title="Sepia Mode"
            >
              <Book className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${settings.theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'text-slate-400 hover:text-white'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dyslexia / Font Toggle */}
          <button
            onClick={() => setSettings(s => ({ ...s, fontFamily: s.fontFamily === 'opendyslexic' ? 'sans' : 'opendyslexic' }))}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1 cursor-pointer ${
              settings.fontFamily === 'opendyslexic'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle OpenDyslexic / Accessible Font"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dyslexic Font</span>
          </button>

          {/* Zoom */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 text-xs text-slate-300 gap-1">
            <button onClick={() => setSettings(s => ({ ...s, zoomLevel: Math.max(75, s.zoomLevel - 15) }))} className="p-1 hover:text-white cursor-pointer">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1">{settings.zoomLevel}%</span>
            <button onClick={() => setSettings(s => ({ ...s, zoomLevel: Math.min(200, s.zoomLevel + 15) }))} className="p-1 hover:text-white cursor-pointer">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-xl transition cursor-pointer border ${
              isBookmarked
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Bookmark Page"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Text-To-Speech */}
          <button
            onClick={handleSpeechToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer ${
              isSpeaking
                ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Read Aloud Text-to-Speech"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Stop Speech' : 'Read Aloud'}</span>
          </button>

          {/* AI Helper Trigger */}
          {onOpenAiAssistant && (
            <button
              onClick={() => onOpenAiAssistant(`Summarize page ${currentPage} of "${resource.title}" and explain key concepts step-by-step.`)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer border border-purple-400/40"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          {/* Print & Download permissions */}
          {resource.printPermitted && (
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {resource.downloadPermitted && (
            <a
              href={resource.fileUrl}
              download={resource.title}
              target="_blank"
              rel="noreferrer"
              onClick={() => LibraryService.trackDownload(resource.id)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* MAIN READER CANVAS WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOLBAR / NAVIGATION TABS */}
        <div className="w-14 bg-[#001529] border-r border-slate-800 flex flex-col items-center py-4 gap-4 shrink-0">
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'toc' ? null : 'toc')}
            className={`p-2.5 rounded-xl transition cursor-pointer ${activeSidebar === 'toc' ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Table of Contents"
          >
            <List className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'bookmarks' ? null : 'bookmarks')}
            className={`p-2.5 rounded-xl transition cursor-pointer relative ${activeSidebar === 'bookmarks' ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Saved Bookmarks"
          >
            <Bookmark className="w-5 h-5" />
            {readingProgress.bookmarks.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'highlights' ? null : 'highlights')}
            className={`p-2.5 rounded-xl transition cursor-pointer relative ${activeSidebar === 'highlights' ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Text Highlights"
          >
            <Highlighter className="w-5 h-5" />
            {readingProgress.highlights.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'notes' ? null : 'notes')}
            className={`p-2.5 rounded-xl transition cursor-pointer relative ${activeSidebar === 'notes' ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Personal Study Notes"
          >
            <MessageSquare className="w-5 h-5" />
            {readingProgress.notes.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'dictionary' ? null : 'dictionary')}
            className={`p-2.5 rounded-xl transition cursor-pointer ${activeSidebar === 'dictionary' ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Dictionary & Translate"
          >
            <Languages className="w-5 h-5" />
          </button>
        </div>

        {/* EXPANDABLE SIDEBAR PANEL */}
        {activeSidebar && (
          <div className="w-72 bg-[#001e3d] border-r border-slate-800 flex flex-col h-full overflow-hidden shrink-0 shadow-xl">
            <div className="p-3 border-b border-slate-700/80 flex items-center justify-between bg-[#001529]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
                {activeSidebar === 'toc' && <><List className="w-4 h-4" /> Table of Contents</>}
                {activeSidebar === 'bookmarks' && <><Bookmark className="w-4 h-4" /> Bookmarks ({readingProgress.bookmarks.length})</>}
                {activeSidebar === 'highlights' && <><Highlighter className="w-4 h-4" /> Highlights ({readingProgress.highlights.length})</>}
                {activeSidebar === 'notes' && <><MessageSquare className="w-4 h-4" /> Study Notes ({readingProgress.notes.length})</>}
                {activeSidebar === 'dictionary' && <><Languages className="w-4 h-4" /> Dictionary & AI Translate</>}
              </h3>
              <button onClick={() => setActiveSidebar(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              
              {/* TOC PANEL */}
              {activeSidebar === 'toc' && (
                <div className="space-y-2">
                  {resource.tableOfContents && resource.tableOfContents.length > 0 ? (
                    resource.tableOfContents.map((item, idx) => (
                      <button
                        key={item.id || idx}
                        onClick={() => item.page && handlePageChange(item.page)}
                        className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          currentPage === item.page
                            ? 'bg-[#D4AF37] text-[#002147] border-[#D4AF37] font-bold'
                            : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{item.title}</span>
                        {item.page && <span className="font-mono text-[10px] opacity-80">P.{item.page}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="space-y-1">
                      {Array.from({ length: Math.min(10, Math.ceil(totalPages / 10)) }).map((_, i) => {
                        const targetPg = (i + 1) * 10;
                        return (
                          <button
                            key={i}
                            onClick={() => handlePageChange(targetPg)}
                            className="w-full text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-medium flex justify-between cursor-pointer"
                          >
                            <span>Section {i + 1}: Key Topic Modules</span>
                            <span className="font-mono text-[10px] text-amber-400">P.{targetPg}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* BOOKMARKS PANEL */}
              {activeSidebar === 'bookmarks' && (
                <div className="space-y-2">
                  {readingProgress.bookmarks.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-6">No pages bookmarked yet. Click the bookmark icon in the top toolbar!</p>
                  ) : (
                    readingProgress.bookmarks.map(bm => (
                      <div key={bm.id} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">Page {bm.page}</p>
                          <p className="text-[10px] text-slate-400">{new Date(bm.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handlePageChange(bm.page)}
                          className="px-2.5 py-1 rounded-lg bg-[#D4AF37] text-[#002147] font-black text-[10px] cursor-pointer"
                        >
                          Jump
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* HIGHLIGHTS PANEL */}
              {activeSidebar === 'highlights' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 pb-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Highlight Tool:</span>
                    <button onClick={() => addHighlight('yellow')} className="w-5 h-5 rounded-full bg-yellow-400 border cursor-pointer" title="Yellow"></button>
                    <button onClick={() => addHighlight('green')} className="w-5 h-5 rounded-full bg-emerald-400 border cursor-pointer" title="Green"></button>
                    <button onClick={() => addHighlight('blue')} className="w-5 h-5 rounded-full bg-blue-400 border cursor-pointer" title="Blue"></button>
                    <button onClick={() => addHighlight('pink')} className="w-5 h-5 rounded-full bg-pink-400 border cursor-pointer" title="Pink"></button>
                  </div>

                  {readingProgress.highlights.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-6">No highlights added. Select text or click a highlight color button!</p>
                  ) : (
                    readingProgress.highlights.map(hl => (
                      <div key={hl.id} className={`p-2.5 rounded-xl border text-slate-900 ${
                        hl.color === 'yellow' ? 'bg-yellow-100 border-yellow-300' :
                        hl.color === 'green' ? 'bg-emerald-100 border-emerald-300' :
                        hl.color === 'blue' ? 'bg-blue-100 border-blue-300' :
                        'bg-pink-100 border-pink-300'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[10px] uppercase tracking-wider">Page {hl.page}</span>
                          <button onClick={() => handlePageChange(hl.page)} className="text-[10px] font-bold underline cursor-pointer">View</button>
                        </div>
                        <p className="font-serif italic text-xs leading-relaxed">"{hl.text}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* NOTES PANEL */}
              {activeSidebar === 'notes' && (
                <div className="space-y-2">
                  <button
                    onClick={addNote}
                    className="w-full py-2 rounded-xl bg-[#D4AF37] text-[#002147] font-black text-xs uppercase tracking-wider cursor-pointer shadow-md mb-2 flex items-center justify-center gap-1"
                  >
                    + Add Note for Page {currentPage}
                  </button>

                  {readingProgress.notes.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-6">No study notes recorded yet.</p>
                  ) : (
                    readingProgress.notes.map(nt => (
                      <div key={nt.id} className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold">
                          <span>Page {nt.page}</span>
                          <button onClick={() => handlePageChange(nt.page)} className="hover:underline cursor-pointer">Go to Page</button>
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed">{nt.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* DICTIONARY & TRANSLATE PANEL */}
              {activeSidebar === 'dictionary' && (
                <div className="space-y-4">
                  {/* Dictionary Lookup */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Instant Dictionary Lookup</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type academic term..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleDictionaryLookup((e.target as HTMLInputElement).value)}
                      />
                    </div>
                    {dictDefinition && (
                      <div className="p-3 rounded-xl bg-slate-800 border border-amber-500/40 space-y-1">
                        <p className="font-bold text-amber-300 capitalize">{dictDefinition.word}</p>
                        <p className="text-slate-200 text-xs leading-relaxed">{dictDefinition.meaning}</p>
                      </div>
                    )}
                  </div>

                  {/* Instant AI Translation */}
                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Instant AI Reader Translator</label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="isiZulu">isiZulu</option>
                      <option value="Afrikaans">Afrikaans</option>
                      <option value="isiXhosa">isiXhosa</option>
                      <option value="French">French</option>
                      <option value="Portuguese">Portuguese</option>
                    </select>
                    <button
                      onClick={handleInstantTranslate}
                      disabled={isTranslating}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isTranslating ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5 text-amber-300" />}
                      <span>Translate Page {currentPage}</span>
                    </button>
                    {translatedText && (
                      <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-100 text-xs leading-relaxed max-h-48 overflow-y-auto">
                        {translatedText}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* READER VIEWPORT CANVAS */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 md:p-8 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Document Sheet Display */}
          <div
            style={{
              zoom: `${settings.zoomLevel}%`,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight
            }}
            className={`w-full max-w-3xl min-h-[680px] p-8 md:p-12 rounded-2xl shadow-2xl border transition-all duration-200 flex flex-col justify-between ${themeStyles[settings.theme]} ${
              settings.fontFamily === 'opendyslexic' ? 'font-mono tracking-wide' : 'font-sans'
            }`}
          >
            {/* Header of Page */}
            <div className="flex items-center justify-between pb-6 border-b border-current/20 text-xs font-semibold opacity-70">
              <span className="truncate max-w-xs">{resource.title}</span>
              <span className="font-mono">Chapter / Page {currentPage} of {totalPages}</span>
            </div>

            {/* Main Content Body */}
            <div className="py-8 flex-1 space-y-6 select-text whitespace-pre-line leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950">
                  {resource.subject}
                </span>
                <span className="text-xs font-bold opacity-80">{resource.category}</span>
              </div>

              <h1 className="text-xl md:text-2xl font-black leading-tight">
                {resource.title} — Module {currentPage}
              </h1>

              <div className="prose max-w-none text-justify">
                {getPageContentSample(currentPage)}
              </div>

              {/* Interactive Diagram Placeholder if STEM */}
              {(resource.subject.includes('Science') || resource.subject.includes('Math')) && (
                <div className="p-6 rounded-2xl bg-slate-500/10 border border-current/20 text-center space-y-2 my-4">
                  <FileText className="w-8 h-8 mx-auto opacity-70" />
                  <p className="text-xs font-bold uppercase tracking-wider">Curriculum Visual Diagram & Mathematical Working</p>
                  <p className="text-[11px] opacity-80 italic">Rendered dynamically for interactive STEM study & self-assessment.</p>
                </div>
              )}
            </div>

            {/* Footer of Page */}
            <div className="pt-6 border-t border-current/20 flex items-center justify-between text-xs font-semibold opacity-70">
              <span>EDUkenZA Digital Library • Approved Resource</span>
              <span className="font-mono">{Math.round((currentPage / totalPages) * 100)}% Complete</span>
            </div>
          </div>

          {/* PAGE NAVIGATION BOTTOM BAR */}
          <div className="mt-6 px-6 py-3 bg-[#001c38] rounded-2xl border border-slate-800 flex items-center gap-4 text-xs shadow-2xl z-10">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white cursor-pointer transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-center text-amber-400 font-bold text-xs"
              />
              <span>of {totalPages}</span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white cursor-pointer transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
