import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PenTool, 
  Square, 
  Circle, 
  Triangle,
  Type, 
  Eraser, 
  Download, 
  Trash2, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Move, 
  MousePointer, 
  StickyNote, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  RotateCw, 
  ArrowRight, 
  Grid, 
  Layers, 
  Sliders, 
  Palette,
  Eye,
  X,
  FileSpreadsheet,
  Sigma,
  Atom,
  Flame,
  Plus
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  WhiteboardObject, 
  WhiteboardTool, 
  WhiteboardSessionDoc,
  WhiteboardSnapshotDoc,
  syncWhiteboardSession,
  saveWhiteboardSnapshot,
  renameWhiteboardSnapshot,
  deleteWhiteboardSnapshot
} from '../../services/googleMeetService';

// Import KaTeX for high-fidelity equation preview
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LiveVleWhiteboardProps {
  schoolId: string;
  meetingId: string;
  meetingTitle?: string;
  currentUser: {
    uid?: string;
    id?: string;
    displayName?: string;
    fullName?: string;
    name?: string;
    email?: string;
  };
  userRole: 'teacher' | 'student' | 'school_admin' | 'owner' | 'parent';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_COLORS = [
  '#002147', // Oxford Navy
  '#D4AF37', // Gold
  '#10B981', // Emerald
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#000000', // Black
  '#64748B', // Slate
  '#FFFFFF'  // White
];

const STICKY_COLORS = [
  { name: 'Yellow', bg: '#FEF08A', text: '#713F12', border: '#FDE047' },
  { name: 'Green', bg: '#BBF7D0', text: '#14532D', border: '#86EFAC' },
  { name: 'Pink', bg: '#FBCFE8', text: '#831843', border: '#F472B6' },
  { name: 'Blue', bg: '#BAE6FD', text: '#0C4A6E', border: '#7DD3FC' },
  { name: 'Purple', bg: '#DDD6FE', text: '#4C1D95', border: '#C4B5FD' },
  { name: 'Orange', bg: '#FED7AA', text: '#7C2D12', border: '#FDBA74' }
];

const MATH_SYMBOLS = [
  { label: '±', latex: '\\pm' },
  { label: '×', latex: '\\times' },
  { label: '÷', latex: '\\div' },
  { label: '≠', latex: '\\neq' },
  { label: '≈', latex: '\\approx' },
  { label: '≤', latex: '\\le' },
  { label: '≥', latex: '\\ge' },
  { label: '∞', latex: '\\infty' },
  { label: '√x', latex: '\\sqrt{x}' },
  { label: 'x²', latex: 'x^2' },
  { label: 'x/y', latex: '\\frac{x}{y}' },
  { label: '∫', latex: '\\int' },
  { label: '∑', latex: '\\sum' },
  { label: '∏', latex: '\\prod' },
  { label: 'π', latex: '\\pi' },
  { label: 'θ', latex: '\\theta' },
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'γ', latex: '\\gamma' },
  { label: 'λ', latex: '\\lambda' },
  { label: 'Δ', latex: '\\Delta' },
  { label: 'Ω', latex: '\\Omega' },
  { label: '°', latex: '^\\circ' },
  { label: '∠', latex: '\\angle' },
  { label: '△', latex: '\\triangle' },
  { label: '⊥', latex: '\\perp' },
  { label: '∥', latex: '\\parallel' },
  { label: 'H₂O', latex: '\\text{H}_2\\text{O}' },
  { label: 'CO₂', latex: '\\text{CO}_2' },
  { label: '→', latex: '\\rightarrow' },
  { label: '⇌', latex: '\\rightleftharpoons' }
];

export const LiveVleWhiteboard: React.FC<LiveVleWhiteboardProps> = ({
  schoolId,
  meetingId,
  meetingTitle,
  currentUser,
  userRole,
  showToast
}) => {
  const isTeacher = userRole === 'teacher' || userRole === 'school_admin' || userRole === 'owner';
  const currentUid = currentUser.uid || currentUser.id || 'anonymous';
  const currentUserName = currentUser.displayName || currentUser.fullName || currentUser.name || (isTeacher ? 'Teacher' : 'Student');

  // Canvas Reference & Context
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Tool & Style State
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#002147');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [highlighterWidth, setHighlighterWidth] = useState<number>(20);
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [fontSize, setFontSize] = useState<number>(20);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [stickyColor, setStickyColor] = useState<string>('#FEF08A');
  const [boardBg, setBoardBg] = useState<'white' | 'grid' | 'dots' | 'lined' | 'blackboard' | 'greenboard'>('white');

  // Interactive Object State
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [allowStudentDrawing, setAllowStudentDrawing] = useState<boolean>(true);

  // Local Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<WhiteboardObject[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardObject[][]>([]);

  // Canvas Viewport & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Active Drawing / Interaction Flags
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<{ x: number; y: number }[]>([]);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [transformMode, setTransformMode] = useState<'move' | 'resize-se' | 'resize-e' | 'resize-s' | 'rotate' | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Text & Sticky Inline Editing
  const [editingObject, setEditingObject] = useState<WhiteboardObject | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  // Math Insertion Modal
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);
  const [mathLatexInput, setMathLatexInput] = useState<string>('E = mc^2');
  const [mathTitle, setMathTitle] = useState<string>('Einstein Energy-Mass Formula');

  // Saved Snapshots State
  const [savedSnapshots, setSavedSnapshots] = useState<WhiteboardSnapshotDoc[]>([]);
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);
  const [snapshotNameInput, setSnapshotNameInput] = useState<string>('');

  // Network & Sync State
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalUpdateRef = useRef<boolean>(false);

  // Hidden File Input for Image Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----------------------------------------------------
  // 1. ONLINE / OFFLINE CONNECTION MONITOR
  // ----------------------------------------------------
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ----------------------------------------------------
  // 2. REAL-TIME FIRESTORE LISTENER (WHITEBOARD SESSION)
  // ----------------------------------------------------
  useEffect(() => {
    if (!meetingId) return;

    const sessionRef = doc(db, 'virtualClassroomWhiteboardSessions', meetingId);
    setConnectionStatus('reconnecting');

    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      setConnectionStatus('connected');
      setLastSyncTime(new Date());

      if (snapshot.exists()) {
        const data = snapshot.data() as WhiteboardSessionDoc;
        
        // If update was remote, sync objects state
        if (!isLocalUpdateRef.current) {
          if (data.objects && Array.isArray(data.objects)) {
            setObjects(data.objects);
          }
          if (data.allowStudentDrawing !== undefined) {
            setAllowStudentDrawing(data.allowStudentDrawing);
          }
          if (data.background) {
            setBoardBg(data.background);
          }
        }
      }
      isLocalUpdateRef.current = false;
    }, (error) => {
      console.warn('Whiteboard real-time session listener error:', error);
      setConnectionStatus('offline');
    });

    return () => unsubscribe();
  }, [meetingId]);

  // ----------------------------------------------------
  // 3. REAL-TIME SAVED SNAPSHOTS LISTENER
  // ----------------------------------------------------
  useEffect(() => {
    if (!meetingId) return;

    const q = query(
      collection(db, 'virtualClassroomWhiteboards'),
      where('meetingId', '==', meetingId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: WhiteboardSnapshotDoc[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as WhiteboardSnapshotDoc);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setSavedSnapshots(list);
    }, (err) => {
      console.warn('Whiteboard snapshots listener error:', err);
    });

    return () => unsub();
  }, [meetingId]);

  // ----------------------------------------------------
  // 4. DEBOUNCED CLOUD SYNC TRIGGER
  // ----------------------------------------------------
  const pushToCloud = useCallback((newObjects: WhiteboardObject[], newBg = boardBg, studentDrawAllowed = allowStudentDrawing) => {
    isLocalUpdateRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await syncWhiteboardSession(
          meetingId,
          schoolId || '',
          newObjects,
          studentDrawAllowed,
          newBg,
          currentUid,
          currentUserName
        );
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('Failed to sync whiteboard to Firestore:', err);
        setConnectionStatus('reconnecting');
      }
    }, 400);
  }, [meetingId, schoolId, boardBg, allowStudentDrawing, currentUid, currentUserName]);

  // Helper to commit state with Undo History
  const commitObjectsState = (updater: (prev: WhiteboardObject[]) => WhiteboardObject[]) => {
    setObjects(prev => {
      const next = updater(prev);
      setUndoStack(u => [...u.slice(-30), prev]); // Max 30 undo steps
      setRedoStack([]); // Clear redo on new action
      pushToCloud(next);
      return next;
    });
  };

  // ----------------------------------------------------
  // 5. RENDER CANVAS (HIGH RESOLUTION & VECTOR ELEMENTS)
  // ----------------------------------------------------
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Background Pattern / Color
    drawBackground(ctx, canvas.width, canvas.height, boardBg);

    // Apply Viewport Zoom & Pan Transformation
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // Sort objects by zIndex & createdAt
    const sorted = [...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) || a.createdAt - b.createdAt);

    // Render each object
    sorted.forEach(obj => {
      drawWhiteboardObject(ctx, obj, obj.id === selectedObjectId, isTeacher);
    });

    // Render active drawing stroke in progress
    if (isDrawing && currentStrokePoints.length > 1) {
      ctx.save();
      if (activeTool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = highlighterWidth;
      } else if (activeTool === 'pencil') {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(1, strokeWidth - 1);
      } else {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentStrokePoints[0].x, currentStrokePoints[0].y);
      for (let i = 1; i < currentStrokePoints.length; i++) {
        ctx.lineTo(currentStrokePoints[i].x, currentStrokePoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Render Selection Bounding Box & Handles
    if (selectedObjectId) {
      const selected = objects.find(o => o.id === selectedObjectId);
      if (selected) {
        drawSelectionBox(ctx, selected, isTeacher);
      }
    }

    ctx.restore();
  }, [objects, selectedObjectId, activeTool, strokeColor, strokeWidth, highlighterWidth, currentStrokePoints, isDrawing, boardBg, zoomLevel, panOffset, isTeacher]);

  // Redraw when state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ----------------------------------------------------
  // 6. DRAWING HELPERS
  // ----------------------------------------------------
  const drawBackground = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    bgType: 'white' | 'grid' | 'dots' | 'lined' | 'blackboard' | 'greenboard'
  ) => {
    if (bgType === 'blackboard') {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    if (bgType === 'greenboard') {
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    if (bgType === 'grid') {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      const gridSize = 25 * zoomLevel;
      const startX = panOffset.x % gridSize;
      const startY = panOffset.y % gridSize;

      ctx.beginPath();
      for (let x = startX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (bgType === 'dots') {
      ctx.fillStyle = '#CBD5E1';
      const dotSize = 25 * zoomLevel;
      const startX = panOffset.x % dotSize;
      const startY = panOffset.y % dotSize;
      for (let x = startX; x < width; x += dotSize) {
        for (let y = startY; y < height; y += dotSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgType === 'lined') {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.2;
      const lineGap = 32 * zoomLevel;
      const startY = panOffset.y % lineGap;
      ctx.beginPath();
      for (let y = startY; y < height; y += lineGap) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawWhiteboardObject = (
    ctx: CanvasRenderingContext2D, 
    obj: WhiteboardObject, 
    isSelected: boolean,
    teacherRole: boolean
  ) => {
    ctx.save();
    
    // Apply Rotation if present
    if (obj.rotation) {
      const cx = obj.x + (obj.width || 0) / 2;
      const cy = obj.y + (obj.height || 0) / 2;
      ctx.translate(cx, cy);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (obj.type === 'pen' || obj.type === 'pencil' || obj.type === 'highlighter') {
      if (obj.points && obj.points.length > 0) {
        ctx.save();
        if (obj.type === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = obj.strokeWidth || 20;
        } else if (obj.type === 'pencil') {
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = Math.max(1, (obj.strokeWidth || 2) - 1);
        } else {
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = obj.strokeWidth || 3;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(obj.points[0].x, obj.points[0].y);
        for (let i = 1; i < obj.points.length; i++) {
          ctx.lineTo(obj.points[i].x, obj.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (obj.type === 'line') {
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y);
      ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
      ctx.stroke();
    } else if (obj.type === 'arrow') {
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth;
      ctx.fillStyle = obj.color;
      ctx.lineCap = 'round';

      const fromX = obj.x;
      const fromY = obj.y;
      const toX = obj.x + obj.width;
      const toY = obj.y + obj.height;

      // Draw Main Line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw Arrowhead
      const headLen = Math.max(12, obj.strokeWidth * 3.5);
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (obj.type === 'rect') {
      if (obj.fillColor && obj.fillColor !== 'transparent') {
        ctx.fillStyle = obj.fillColor;
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      }
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    } else if (obj.type === 'circle') {
      const rx = Math.abs(obj.width / 2);
      const ry = Math.abs(obj.height / 2);
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (obj.fillColor && obj.fillColor !== 'transparent') {
        ctx.fillStyle = obj.fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth;
      ctx.stroke();
    } else if (obj.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(obj.x + obj.width / 2, obj.y);
      ctx.lineTo(obj.x, obj.y + obj.height);
      ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
      ctx.closePath();

      if (obj.fillColor && obj.fillColor !== 'transparent') {
        ctx.fillStyle = obj.fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth;
      ctx.stroke();
    } else if (obj.type === 'sticky') {
      // Draw Sticky Note with soft drop shadow & folded corner
      ctx.fillStyle = obj.stickyColor || '#FEF08A';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 4;

      // Rounded Sticky Body
      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(obj.x, obj.y, obj.width, obj.height, [radius, radius, radius, radius]);
      ctx.fill();

      // Reset shadow for text & border
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render Sticky Text
      ctx.fillStyle = '#1E293B';
      ctx.font = `${obj.fontSize || 16}px ${obj.fontFamily || 'sans-serif'}`;
      ctx.textBaseline = 'top';

      const lines = (obj.text || 'Sticky Note').split('\n');
      const lineHeight = (obj.fontSize || 16) * 1.35;
      lines.forEach((line, index) => {
        ctx.fillText(line, obj.x + 12, obj.y + 14 + index * lineHeight, obj.width - 24);
      });
    } else if (obj.type === 'text') {
      ctx.fillStyle = obj.color;
      ctx.font = `${obj.fontSize || 20}px ${obj.fontFamily || 'sans-serif'}`;
      ctx.textBaseline = 'top';

      const lines = (obj.text || 'Double-click to edit text').split('\n');
      const lineHeight = (obj.fontSize || 20) * 1.35;
      lines.forEach((line, index) => {
        ctx.fillText(line, obj.x, obj.y + index * lineHeight);
      });
    } else if (obj.type === 'image' && obj.imageUrl) {
      const img = new Image();
      img.src = obj.imageUrl;
      if (img.complete) {
        ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
      }
    } else if (obj.type === 'math') {
      // Render Math Formula Block
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(obj.x, obj.y, obj.width, obj.height, [8, 8, 8, 8]);
      ctx.fill();
      ctx.stroke();

      // Math Title
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(obj.text || 'Mathematical Equation', obj.x + 12, obj.y + 12);

      // Equation Text
      ctx.fillStyle = '#002147';
      ctx.font = 'bold 18px "Cambria Math", "Times New Roman", serif';
      ctx.fillText(obj.mathFormula || 'E = mc²', obj.x + 12, obj.y + 36);
    }

    ctx.restore();
  };

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D, 
    obj: WhiteboardObject,
    teacherRole: boolean
  ) => {
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    const pad = 6;
    const x = obj.x - pad;
    const y = obj.y - pad;
    const w = obj.width + pad * 2;
    const h = obj.height + pad * 2;

    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Draw Corner & Edge Resize Handles
    ctx.fillStyle = '#3B82F6';
    const handleSize = 8;

    // SE handle
    ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
    // E handle
    ctx.fillRect(x + w - handleSize / 2, y + h / 2 - handleSize / 2, handleSize, handleSize);
    // S handle
    ctx.fillRect(x + w / 2 - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);

    // Rotation Handle at Top
    ctx.beginPath();
    ctx.arc(x + w / 2, y - 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y - 18);
    ctx.stroke();

    // User Attribution Badge
    ctx.fillStyle = obj.userRole === 'teacher' ? '#002147' : '#10B981';
    ctx.beginPath();
    ctx.roundRect(x, y - 26, 120, 20, [4, 4, 4, 4]);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${obj.userName} (${obj.userRole})`, x + 6, y - 12);

    ctx.restore();
  };

  // ----------------------------------------------------
  // 7. MOUSE & TOUCH EVENT HANDLERS
  // ----------------------------------------------------
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Convert Screen Coords to Zoomed / Panned Virtual Canvas Coords
    const virtualX = (screenX - panOffset.x) / zoomLevel;
    const virtualY = (screenY - panOffset.y) / zoomLevel;

    return { x: virtualX, y: virtualY, screenX, screenY };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Check Student Drawing Permission
    if (!isTeacher && !allowStudentDrawing) {
      showToast?.('Student drawing is currently paused by the teacher.', 'info');
      return;
    }

    const coords = getCanvasCoords(e);

    // Pan Tool
    if (activeTool === 'select' && (('buttons' in e && e.buttons === 4) || isPanning)) {
      setPanStart({ x: coords.screenX - panOffset.x, y: coords.screenY - panOffset.y });
      setIsPanning(true);
      return;
    }

    // Select Tool: Check Click on Object
    if (activeTool === 'select') {
      // Check handles on already selected object
      if (selectedObjectId) {
        const selObj = objects.find(o => o.id === selectedObjectId);
        if (selObj) {
          const pad = 6;
          const x = selObj.x - pad;
          const y = selObj.y - pad;
          const w = selObj.width + pad * 2;
          const h = selObj.height + pad * 2;

          // SE resize handle
          if (Math.abs(coords.x - (x + w)) < 12 && Math.abs(coords.y - (y + h)) < 12) {
            setTransformMode('resize-se');
            setDragStartPoint({ x: coords.x, y: coords.y });
            return;
          }
          // Rotate handle
          if (Math.abs(coords.x - (x + w / 2)) < 14 && Math.abs(coords.y - (y - 18)) < 14) {
            setTransformMode('rotate');
            setDragStartPoint({ x: coords.x, y: coords.y });
            return;
          }
        }
      }

      // Hit Test in reverse order (topmost first)
      const hit = [...objects].reverse().find(o => {
        return (
          coords.x >= o.x && 
          coords.x <= o.x + (o.width || 0) &&
          coords.y >= o.y && 
          coords.y <= o.y + (o.height || 0)
        );
      });

      if (hit) {
        setSelectedObjectId(hit.id);
        setTransformMode('move');
        setActiveDragOffset({ x: coords.x - hit.x, y: coords.y - hit.y });
        setDragStartPoint({ x: coords.x, y: coords.y });
      } else {
        setSelectedObjectId(null);
        setTransformMode(null);
      }
      return;
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      const hit = [...objects].reverse().find(o => {
        return (
          coords.x >= o.x - 10 && 
          coords.x <= o.x + (o.width || 0) + 10 &&
          coords.y >= o.y - 10 && 
          coords.y <= o.y + (o.height || 0) + 10
        );
      });

      if (hit) {
        if (!isTeacher && hit.userRole === 'teacher') {
          showToast?.('Students cannot erase teacher content.', 'error');
          return;
        }
        commitObjectsState(prev => prev.filter(o => o.id !== hit.id));
      }
      return;
    }

    // Freehand Drawing (Pen, Pencil, Highlighter)
    if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentStrokePoints([{ x: coords.x, y: coords.y }]);
      return;
    }

    // Shape Creation (Line, Arrow, Rect, Circle, Triangle, Sticky, Text)
    if (['line', 'arrow', 'rect', 'circle', 'triangle', 'sticky', 'text'].includes(activeTool)) {
      setIsDrawing(true);
      setDragStartPoint({ x: coords.x, y: coords.y });
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    // Pan Viewport
    if (isPanning) {
      setPanOffset({
        x: coords.screenX - panStart.x,
        y: coords.screenY - panStart.y
      });
      return;
    }

    // Transform Selected Object (Move, Resize, Rotate)
    if (transformMode && selectedObjectId && dragStartPoint) {
      const sel = objects.find(o => o.id === selectedObjectId);
      if (!sel || (sel.isLocked && !isTeacher)) return;

      if (transformMode === 'move' && activeDragOffset) {
        const newX = coords.x - activeDragOffset.x;
        const newY = coords.y - activeDragOffset.y;

        setObjects(prev => prev.map(o => {
          if (o.id === selectedObjectId) {
            // If freehand stroke, translate all points
            if (o.points) {
              const dx = newX - o.x;
              const dy = newY - o.y;
              return {
                ...o,
                x: newX,
                y: newY,
                points: o.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
                updatedAt: Date.now()
              };
            }
            return { ...o, x: newX, y: newY, updatedAt: Date.now() };
          }
          return o;
        }));
      } else if (transformMode === 'resize-se') {
        const newWidth = Math.max(20, coords.x - sel.x);
        const newHeight = Math.max(20, coords.y - sel.y);

        setObjects(prev => prev.map(o => {
          if (o.id === selectedObjectId) {
            return { ...o, width: newWidth, height: newHeight, updatedAt: Date.now() };
          }
          return o;
        }));
      } else if (transformMode === 'rotate') {
        const cx = sel.x + sel.width / 2;
        const cy = sel.y + sel.height / 2;
        const angle = Math.atan2(coords.y - cy, coords.x - cx) * (180 / Math.PI) + 90;

        setObjects(prev => prev.map(o => {
          if (o.id === selectedObjectId) {
            return { ...o, rotation: Math.round(angle), updatedAt: Date.now() };
          }
          return o;
        }));
      }
      return;
    }

    // Freehand Stroke Drawing
    if (isDrawing && (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter')) {
      setCurrentStrokePoints(prev => [...prev, { x: coords.x, y: coords.y }]);
      return;
    }
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (transformMode) {
      setTransformMode(null);
      pushToCloud(objects);
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoords(e);
    const id = 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Freehand Stroke Finish
    if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
      if (currentStrokePoints.length > 1) {
        // Calculate Bounding Box of Stroke
        const xs = currentStrokePoints.map(p => p.x);
        const ys = currentStrokePoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const newObj: WhiteboardObject = {
          id,
          type: activeTool,
          userId: currentUid,
          userName: currentUserName,
          userRole: isTeacher ? 'teacher' : 'student',
          points: currentStrokePoints,
          x: minX,
          y: minY,
          width: Math.max(10, maxX - minX),
          height: Math.max(10, maxY - minY),
          color: strokeColor,
          strokeWidth: activeTool === 'highlighter' ? highlighterWidth : strokeWidth,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zIndex: objects.length + 1
        };

        commitObjectsState(prev => [...prev, newObj]);
      }
      setIsDrawing(false);
      setCurrentStrokePoints([]);
      return;
    }

    // Shape / Text / Sticky Creation Finish
    if (dragStartPoint) {
      const width = Math.abs(coords.x - dragStartPoint.x) || (activeTool === 'sticky' ? 180 : activeTool === 'text' ? 220 : 100);
      const height = Math.abs(coords.y - dragStartPoint.y) || (activeTool === 'sticky' ? 180 : activeTool === 'text' ? 50 : 100);
      const x = Math.min(dragStartPoint.x, coords.x);
      const y = Math.min(dragStartPoint.y, coords.y);

      let newObj: WhiteboardObject | null = null;

      if (activeTool === 'sticky') {
        newObj = {
          id,
          type: 'sticky',
          userId: currentUid,
          userName: currentUserName,
          userRole: isTeacher ? 'teacher' : 'student',
          x,
          y,
          width: Math.max(140, width),
          height: Math.max(140, height),
          color: '#1E293B',
          strokeWidth: 1,
          stickyColor: stickyColor,
          text: 'Double click to write lesson notes...',
          fontSize: 16,
          fontFamily: 'sans-serif',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zIndex: objects.length + 1
        };
      } else if (activeTool === 'text') {
        newObj = {
          id,
          type: 'text',
          userId: currentUid,
          userName: currentUserName,
          userRole: isTeacher ? 'teacher' : 'student',
          x,
          y,
          width: Math.max(160, width),
          height: Math.max(40, height),
          color: strokeColor,
          strokeWidth: 1,
          text: 'Click here to type...',
          fontSize: fontSize,
          fontFamily: fontFamily,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zIndex: objects.length + 1
        };
      } else if (['line', 'arrow', 'rect', 'circle', 'triangle'].includes(activeTool)) {
        newObj = {
          id,
          type: activeTool,
          userId: currentUid,
          userName: currentUserName,
          userRole: isTeacher ? 'teacher' : 'student',
          x: activeTool === 'line' || activeTool === 'arrow' ? dragStartPoint.x : x,
          y: activeTool === 'line' || activeTool === 'arrow' ? dragStartPoint.y : y,
          width: activeTool === 'line' || activeTool === 'arrow' ? (coords.x - dragStartPoint.x) : width,
          height: activeTool === 'line' || activeTool === 'arrow' ? (coords.y - dragStartPoint.y) : height,
          color: strokeColor,
          strokeWidth: strokeWidth,
          fillColor: fillColor,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zIndex: objects.length + 1
        };
      }

      if (newObj) {
        commitObjectsState(prev => [...prev, newObj]);
        setSelectedObjectId(newObj.id);
      }
    }

    setIsDrawing(false);
    setDragStartPoint(null);
  };

  // Double Click / Tap to Edit Text or Sticky Notes
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const hit = [...objects].reverse().find(o => {
      return (
        coords.x >= o.x && 
        coords.x <= o.x + (o.width || 0) &&
        coords.y >= o.y && 
        coords.y <= o.y + (o.height || 0) &&
        (o.type === 'text' || o.type === 'sticky' || o.type === 'math')
      );
    });

    if (hit) {
      if (hit.isLocked && !isTeacher) {
        showToast?.('This element is locked by the teacher.', 'info');
        return;
      }
      setEditingObject(hit);
      setEditingTextValue(hit.text || hit.mathFormula || '');
    }
  };

  // ----------------------------------------------------
  // 8. IMAGE UPLOAD HANDLER
  // ----------------------------------------------------
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Please upload a valid image file (PNG, JPG, SVG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Compute scaled dimensions (max 400px width/height)
        let w = img.width;
        let h = img.height;
        const maxDim = 380;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
        }

        const id = 'img_' + Date.now();
        const newObj: WhiteboardObject = {
          id,
          type: 'image',
          userId: currentUid,
          userName: currentUserName,
          userRole: isTeacher ? 'teacher' : 'student',
          x: 100 - panOffset.x / zoomLevel,
          y: 100 - panOffset.y / zoomLevel,
          width: Math.round(w),
          height: Math.round(h),
          imageUrl: dataUrl,
          color: '#000000',
          strokeWidth: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zIndex: objects.length + 1
        };

        commitObjectsState(prev => [...prev, newObj]);
        setSelectedObjectId(newObj.id);
        showToast?.('Image added to whiteboard', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ----------------------------------------------------
  // 9. INSERT MATHEMATICAL FORMULA
  // ----------------------------------------------------
  const handleInsertMathFormula = () => {
    if (!mathLatexInput.trim()) return;

    const id = 'math_' + Date.now();
    const newObj: WhiteboardObject = {
      id,
      type: 'math',
      userId: currentUid,
      userName: currentUserName,
      userRole: isTeacher ? 'teacher' : 'student',
      x: 120 - panOffset.x / zoomLevel,
      y: 120 - panOffset.y / zoomLevel,
      width: 320,
      height: 75,
      text: mathTitle || 'Equation',
      mathFormula: mathLatexInput,
      color: '#002147',
      strokeWidth: 1,
      fontSize: 18,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      zIndex: objects.length + 1
    };

    commitObjectsState(prev => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    setIsMathModalOpen(false);
    showToast?.('Mathematical formula inserted onto board', 'success');
  };

  // ----------------------------------------------------
  // 10. OBJECT ACTIONS (LOCK, DELETE, DUPLICATE, LAYER)
  // ----------------------------------------------------
  const handleToggleLock = () => {
    if (!isTeacher || !selectedObjectId) return;
    commitObjectsState(prev => prev.map(o => {
      if (o.id === selectedObjectId) {
        return { ...o, isLocked: !o.isLocked, updatedAt: Date.now() };
      }
      return o;
    }));
  };

  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    const sel = objects.find(o => o.id === selectedObjectId);
    if (!sel) return;

    if (!isTeacher && sel.userRole === 'teacher') {
      showToast?.('Students cannot delete teacher content.', 'error');
      return;
    }

    commitObjectsState(prev => prev.filter(o => o.id !== selectedObjectId));
    setSelectedObjectId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedObjectId) return;
    const sel = objects.find(o => o.id === selectedObjectId);
    if (!sel) return;

    const dupId = 'wb_dup_' + Date.now();
    const duplicated: WhiteboardObject = {
      ...sel,
      id: dupId,
      x: sel.x + 25,
      y: sel.y + 25,
      userId: currentUid,
      userName: currentUserName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      zIndex: objects.length + 1
    };

    commitObjectsState(prev => [...prev, duplicated]);
    setSelectedObjectId(dupId);
  };

  const handleClearBoard = () => {
    if (!isTeacher) {
      showToast?.('Only teachers can clear the entire whiteboard.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to clear the entire whiteboard?')) return;

    commitObjectsState(() => []);
    setSelectedObjectId(null);
    showToast?.('Whiteboard cleared', 'info');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, -1));
    setRedoStack(r => [...r, objects]);
    setObjects(previous);
    pushToCloud(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(u => [...u, objects]);
    setObjects(next);
    pushToCloud(next);
  };

  // ----------------------------------------------------
  // 11. PERSISTENCE & SNAPSHOT SAVE / EXPORT
  // ----------------------------------------------------
  const handleSaveSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const title = snapshotNameInput.trim() || `Lesson Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const imageData = canvas.toDataURL('image/png');

    try {
      await saveWhiteboardSnapshot({
        schoolId: schoolId || '',
        meetingId,
        title,
        imageData,
        objectsJson: JSON.stringify(objects),
        savedBy: currentUserName
      });
      setSnapshotNameInput('');
      setIsSnapshotsModalOpen(false);
      showToast?.('Whiteboard snapshot saved to VLE Repository!', 'success');
    } catch (err) {
      showToast?.('Error saving whiteboard snapshot', 'error');
    }
  };

  const handleLoadSnapshot = (snapshot: WhiteboardSnapshotDoc) => {
    if (!snapshot.objectsJson) {
      showToast?.('No vector elements found in this snapshot.', 'info');
      return;
    }
    try {
      const parsed = JSON.parse(snapshot.objectsJson);
      if (Array.isArray(parsed)) {
        commitObjectsState(() => parsed);
        setIsSnapshotsModalOpen(false);
        showToast?.(`Loaded saved snapshot: "${snapshot.title}"`, 'success');
      }
    } catch (err) {
      showToast?.('Failed to load snapshot objects.', 'error');
    }
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `EDUkenZA_Whiteboard_${meetingId}_${new Date().toISOString().split('T')[0]}.png`;
    a.click();
    showToast?.('Whiteboard exported as PNG image', 'success');
  };

  // Keyboard Shortcuts (Delete, Undo, Redo, Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingObject) return; // Don't trigger shortcuts during text edit

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedObjectId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingObject, selectedObjectId, undoStack, redoStack, objects]);

  const selectedObj = objects.find(o => o.id === selectedObjectId);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-slate-100 rounded-3xl border border-slate-300 shadow-xl overflow-hidden relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'h-[750px] w-full'
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER STATUS & QUICK ACTIONS                */}
      {/* ---------------------------------------------------- */}
      <div className="bg-[#002147] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#D4AF37]/30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white uppercase">
                {meetingTitle || 'Live Teaching Whiteboard'}
              </span>
              {/* Connection Status Badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400' : connectionStatus === 'reconnecting' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block">
              {objects.length} elements • Synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Teacher Drawing Control Toggle */}
        <div className="flex items-center gap-2">
          {isTeacher && (
            <button
              onClick={() => {
                const next = !allowStudentDrawing;
                setAllowStudentDrawing(next);
                pushToCloud(objects, boardBg, next);
                showToast?.(next ? 'Student drawing enabled' : 'Student drawing disabled', 'info');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                allowStudentDrawing 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30'
              }`}
              title="Toggle whether enrolled students can draw on board"
            >
              {allowStudentDrawing ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{allowStudentDrawing ? 'Students: Drawing Allowed' : 'Students: View Only'}</span>
            </button>
          )}

          {/* Snapshots Repository */}
          <button
            onClick={() => setIsSnapshotsModalOpen(true)}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10"
            title="Saved Board Snapshots"
          >
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Snapshots ({savedSnapshots.length})</span>
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            title="Export full whiteboard as PNG image"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. TOOLBAR (MAIN TOOLS, STYLES, MATH, SHAPES)       */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm z-10">
        
        {/* PRIMARY DRAWING & SELECTION TOOLS */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'select' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Select & Transform Object (Move, Resize, Rotate)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Select</span>
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'pen' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Pen (Smooth Vector Drawing)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pen</span>
          </button>

          <button
            onClick={() => setActiveTool('pencil')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'pencil' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Pencil (Fine Vector Sketch)"
          >
            <PenTool className="w-3.5 h-3.5 opacity-60" />
            <span className="hidden md:inline">Pencil</span>
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'highlighter' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Highlighter (Semi-transparent)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Highlighter</span>
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'eraser' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Eraser (Click to delete or drag across strokes)"
          >
            <Eraser className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden md:inline">Eraser</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-300 mx-1" />

          {/* SHAPES */}
          <button
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'line' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Straight Line"
          >
            <span className="font-mono text-sm leading-none">╱</span>
          </button>

          <button
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'arrow' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Arrow"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'rect' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Rectangle"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'circle' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Circle / Ellipse"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('triangle')}
            className={`p-2 rounded-xl text-xs font-bold transition ${
              activeTool === 'triangle' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Triangle"
          >
            <Triangle className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-5 bg-slate-300 mx-1" />

          {/* TEXT & STICKY & MATH */}
          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'text' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Rich Text Box"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Text</span>
          </button>

          <button
            onClick={() => setActiveTool('sticky')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
              activeTool === 'sticky' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-700 hover:bg-white'
            }`}
            title="Sticky Note"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Sticky</span>
          </button>

          <button
            onClick={() => setIsMathModalOpen(true)}
            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 border border-amber-300 transition shadow-xs"
            title="Insert Mathematical & Scientific Formula"
          >
            <Sigma className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Insert Math</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition"
            title="Upload Image onto Whiteboard"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Image</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* STYLING CONTROLS (COLOR PALETTE, THICKNESS, BACKGROUND) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Color Palette */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-1 hidden sm:inline">Color:</span>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition transform ${
                  strokeColor === c ? 'border-amber-400 scale-125 shadow-sm ring-2 ring-amber-400/40' : 'border-slate-300 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
            <input 
              type="color" 
              value={strokeColor} 
              onChange={e => setStrokeColor(e.target.value)}
              className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0"
              title="Custom Color Picker"
            />
          </div>

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 hidden md:inline">
              {activeTool === 'highlighter' ? 'Highlight Size:' : 'Thickness:'}
            </span>
            <input 
              type="range" 
              min={activeTool === 'highlighter' ? 10 : 1} 
              max={activeTool === 'highlighter' ? 50 : 24} 
              value={activeTool === 'highlighter' ? highlighterWidth : strokeWidth} 
              onChange={e => {
                const val = Number(e.target.value);
                if (activeTool === 'highlighter') setHighlighterWidth(val);
                else setStrokeWidth(val);
              }}
              className="w-16 sm:w-20 cursor-pointer accent-[#002147]"
            />
            <span className="font-mono font-bold text-slate-700 w-5">
              {activeTool === 'highlighter' ? highlighterWidth : strokeWidth}px
            </span>
          </div>

          {/* Board Background Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-1 hidden lg:inline">Background:</span>
            <select
              value={boardBg}
              onChange={(e) => {
                const bg = e.target.value as any;
                setBoardBg(bg);
                pushToCloud(objects, bg);
              }}
              className="bg-white text-slate-800 font-bold text-xs py-1 px-2 rounded-xl border border-slate-200 cursor-pointer outline-none"
            >
              <option value="white">Plain White</option>
              <option value="grid">Math Graph Grid</option>
              <option value="dots">Dot Matrix</option>
              <option value="lined">Lined Notebook</option>
              <option value="blackboard">Dark Blackboard</option>
              <option value="greenboard">Emerald Greenboard</option>
            </select>
          </div>

          {/* Undo / Redo & Clear Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            {isTeacher && (
              <button
                onClick={handleClearBoard}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                title="Clear all whiteboard objects"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Board</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. MATHEMATICS QUICK SYMBOL BAR                      */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs z-10 scrollbar-thin">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
          <Atom className="w-3 h-3 text-indigo-600" /> Math & Science Palette:
        </span>
        {MATH_SYMBOLS.map((sym, idx) => (
          <button
            key={idx}
            onClick={() => {
              // If text or sticky is selected, append symbol
              if (selectedObjectId) {
                commitObjectsState(prev => prev.map(o => {
                  if (o.id === selectedObjectId && (o.type === 'text' || o.type === 'sticky')) {
                    return { ...o, text: (o.text || '') + sym.label, updatedAt: Date.now() };
                  }
                  return o;
                }));
                showToast?.(`Inserted ${sym.label} into selected text`, 'success');
              } else {
                // Insert new quick symbol text object
                const id = 'sym_' + Date.now() + '_' + idx;
                const newObj: WhiteboardObject = {
                  id,
                  type: 'text',
                  userId: currentUid,
                  userName: currentUserName,
                  userRole: isTeacher ? 'teacher' : 'student',
                  x: 150 - panOffset.x / zoomLevel,
                  y: 150 - panOffset.y / zoomLevel,
                  width: 60,
                  height: 40,
                  text: sym.label,
                  color: strokeColor,
                  strokeWidth: 1,
                  fontSize: 24,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  zIndex: objects.length + 1
                };
                commitObjectsState(prev => [...prev, newObj]);
                setSelectedObjectId(id);
              }
            }}
            className="px-2 py-0.5 bg-white hover:bg-amber-100 hover:text-amber-900 border border-slate-200 rounded-lg font-mono font-bold text-xs transition cursor-pointer whitespace-nowrap shadow-2xs"
            title={`Insert ${sym.label}`}
          >
            {sym.label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. CANVAS STAGE                                      */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={1800}
          height={1100}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onDoubleClick={handleCanvasDoubleClick}
          className={`w-full h-full touch-none ${
            activeTool === 'select' ? (isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') : 'cursor-crosshair'
          }`}
        />

        {/* FLOATING ACTION BAR FOR SELECTED OBJECT */}
        {selectedObj && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-2xl flex items-center gap-2 z-20 animate-fade-in">
            <span className="text-xs font-bold text-slate-700 pr-2 border-r border-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {selectedObj.type.toUpperCase()} • Created by {selectedObj.userName}
            </span>

            {/* Lock / Unlock Toggle (Teacher Only) */}
            {isTeacher && (
              <button
                onClick={handleToggleLock}
                className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  selectedObj.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={selectedObj.isLocked ? 'Unlock object' : 'Lock object (prevent student editing)'}
              >
                {selectedObj.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{selectedObj.isLocked ? 'Locked' : 'Lock'}</span>
              </button>
            )}

            {/* Edit Text if text/sticky */}
            {(selectedObj.type === 'text' || selectedObj.type === 'sticky' || selectedObj.type === 'math') && (
              <button
                onClick={() => {
                  setEditingObject(selectedObj);
                  setEditingTextValue(selectedObj.text || selectedObj.mathFormula || '');
                }}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition"
              >
                Edit Content
              </button>
            )}

            {/* Duplicate */}
            <button
              onClick={handleDuplicateSelected}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Duplicate Object"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteSelected}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
              title="Delete Object"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSelectedObjectId(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* FLOATING ZOOM & VIEW CONTROLS */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-1 z-20">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs rounded-xl transition"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            onClick={() => setZoomLevel(prev => Math.min(2.5, Number((prev + 0.15).toFixed(2))))}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. INLINE TEXT / STICKY NOTE EDITING MODAL           */}
      {/* ---------------------------------------------------- */}
      {editingObject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#002147] uppercase tracking-wide flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-500" />
                Edit {editingObject.type === 'sticky' ? 'Sticky Note' : 'Text Block'}
              </h3>
              <button onClick={() => setEditingObject(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={5}
              value={editingTextValue}
              onChange={e => setEditingTextValue(e.target.value)}
              placeholder="Type your lesson text or notes here..."
              className="w-full p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002147] text-sm text-slate-800 resize-none font-sans"
              autoFocus
            />

            {/* Quick Math Symbols in Text Editor */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <span className="text-[10px] font-bold text-slate-400">Symbols:</span>
              {['²', '³', '½', '√', 'π', 'θ', '±', '→', '⇌', '°', 'Δ', 'Σ'].map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEditingTextValue(prev => prev + s)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 rounded-lg text-xs font-bold font-mono"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingObject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  commitObjectsState(prev => prev.map(o => {
                    if (o.id === editingObject.id) {
                      return { ...o, text: editingTextValue, updatedAt: Date.now() };
                    }
                    return o;
                  }));
                  setEditingObject(null);
                  showToast?.('Text updated', 'success');
                }}
                className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white font-black rounded-xl text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. INSERT MATHEMATICAL FORMULA MODAL                 */}
      {/* ---------------------------------------------------- */}
      {isMathModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Sigma className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002147]">Insert Mathematical / Science Formula</h3>
                  <p className="text-xs text-slate-500">Insert LaTeX formatted equations, fractions, and scientific notation.</p>
                </div>
              </div>
              <button onClick={() => setIsMathModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Formula Name / Topic</label>
                <input
                  type="text"
                  value={mathTitle}
                  onChange={e => setMathTitle(e.target.value)}
                  placeholder="e.g. Quadratic Formula, Kinetic Energy"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#002147] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">LaTeX Equation Input</label>
                <input
                  type="text"
                  value={mathLatexInput}
                  onChange={e => setMathLatexInput(e.target.value)}
                  placeholder="e.g. x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#002147] outline-none"
                />
              </div>

              {/* Quick Math Presets */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Quadratic', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
                    { label: 'Kinetic Energy', latex: 'E_k = \\frac{1}{2}mv^2' },
                    { label: 'Pythagoras', latex: 'a^2 + b^2 = c^2' },
                    { label: 'Photosynthesis', latex: '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2' },
                    { label: 'Definite Integral', latex: '\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)' }
                  ].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setMathLatexInput(p.latex);
                        setMathTitle(p.label);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 text-[11px] font-bold rounded-lg transition border border-slate-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KaTeX Live Render Preview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Equation Preview</span>
                <div className="text-lg text-[#002147] font-semibold py-2">
                  <BlockMath math={mathLatexInput || 'E = mc^2'} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMathModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertMathFormula}
                className="px-5 py-2 bg-[#002147] hover:bg-[#001833] text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Insert Formula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. SAVED SNAPSHOTS & REPOSITORY MODAL                */}
      {/* ---------------------------------------------------- */}
      {isSnapshotsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#002147]/10 text-[#002147] rounded-xl">
                  <Layers className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002147]">Whiteboard Snapshot Repository</h3>
                  <p className="text-xs text-slate-500">Save current board state or reload previous lesson snapshots.</p>
                </div>
              </div>
              <button onClick={() => setIsSnapshotsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save Current Snapshot Form (Teacher) */}
            {isTeacher && (
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 flex items-center gap-2">
                <input
                  type="text"
                  value={snapshotNameInput}
                  onChange={e => setSnapshotNameInput(e.target.value)}
                  placeholder="Snapshot Title (e.g. Grade 10 Physics Motion Graphs)"
                  className="flex-1 p-2 bg-white rounded-xl border border-amber-200 text-xs font-medium outline-none focus:ring-2 focus:ring-[#002147]"
                />
                <button
                  onClick={handleSaveSnapshot}
                  className="px-4 py-2 bg-[#002147] hover:bg-[#001833] text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Save Snapshot
                </button>
              </div>
            )}

            {/* List of Saved Snapshots */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {savedSnapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No saved whiteboard snapshots for this session yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedSnapshots.map(snap => (
                    <div 
                      key={snap.id} 
                      className="bg-slate-50 border border-slate-200 hover:border-[#D4AF37] rounded-2xl p-3 space-y-2 transition flex flex-col justify-between shadow-xs"
                    >
                      <div className="space-y-1">
                        <img 
                          src={snap.imageData} 
                          alt={snap.title} 
                          className="w-full h-28 object-cover rounded-xl border border-slate-200 bg-white" 
                        />
                        <h4 className="text-xs font-black text-[#002147] truncate">{snap.title}</h4>
                        <p className="text-[10px] text-slate-400">
                          Saved by {snap.savedBy} • {snap.createdAt?.seconds ? new Date(snap.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        {isTeacher && (
                          <button
                            onClick={() => handleLoadSnapshot(snap)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-2xs"
                          >
                            <RefreshCw className="w-3 h-3" /> Load to Board
                          </button>
                        )}
                        <a
                          href={snap.imageData}
                          download={`${snap.title}.png`}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        {isTeacher && snap.id && (
                          <button
                            onClick={async () => {
                              if (confirm(`Delete snapshot "${snap.title}"?`)) {
                                await deleteWhiteboardSnapshot(snap.id!);
                                showToast?.('Snapshot deleted', 'info');
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSnapshotsModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
