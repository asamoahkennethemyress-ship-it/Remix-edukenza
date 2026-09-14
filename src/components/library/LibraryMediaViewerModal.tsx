import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Maximize2,
  Download,
  Video,
  Music,
  Bookmark,
  Sparkles,
  List
} from 'lucide-react';
import { LibraryResource } from '../../types/library';
import { LibraryService } from '../../services/libraryService';

interface LibraryMediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: LibraryResource;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAiAssistant?: (prompt?: string) => void;
}

export const LibraryMediaViewerModal: React.FC<LibraryMediaViewerModalProps> = ({
  isOpen,
  onClose,
  resource,
  showToast,
  onOpenAiAssistant
}) => {
  const isVideo = resource?.format === 'MP4' || resource?.format === 'MOV' || resource?.category === 'Videos';
  const isAudio = resource?.format === 'MP3' || resource?.category === 'Audio Lessons' || resource?.category === 'Podcasts';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(resource?.durationSeconds || 1200);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Array<{ timestamp: number; title: string }>>([
    { timestamp: 60, title: 'Module Introduction & Key Principles' },
    { timestamp: 300, title: 'Detailed Practical Experiment Walkthrough' },
    { timestamp: 600, title: 'Summary & Revision Tips' }
  ]);

  useEffect(() => {
    if (isOpen && resource?.id) {
      LibraryService.trackView(resource.id);
    }
  }, [isOpen, resource?.id]);

  if (!isOpen || !resource) return null;

  const togglePlay = () => {
    const mediaEl = isVideo ? videoRef.current : audioRef.current;
    if (mediaEl) {
      if (isPlaying) {
        mediaEl.pause();
        setIsPlaying(false);
      } else {
        mediaEl.play();
        setIsPlaying(true);
      }
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    const mediaEl = isVideo ? videoRef.current : audioRef.current;
    if (mediaEl) mediaEl.playbackRate = rate;
  };

  const seek = (seconds: number) => {
    const mediaEl = isVideo ? videoRef.current : audioRef.current;
    if (mediaEl) {
      mediaEl.currentTime = Math.max(0, Math.min(mediaEl.duration || duration, mediaEl.currentTime + seconds));
    }
  };

  const addTimestampBookmark = () => {
    const newBm = {
      timestamp: Math.round(currentTime),
      title: `Timestamp Bookmark @ ${formatTime(currentTime)}`
    };
    setBookmarks([...bookmarks, newBm]);
    if (showToast) showToast(`Timestamp ${formatTime(currentTime)} saved!`, 'success');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#001c38] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#001529] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black">
              {isVideo ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-wider">
                EDUkenZA Digital Media Player • {resource.category}
              </span>
              <h2 className="text-sm font-black text-white truncate max-w-md">{resource.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MEDIA PLAYER AREA */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-y-auto">
          {isVideo ? (
            <div className="w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
              <video
                ref={videoRef}
                src={resource.fileUrl}
                poster={resource.coverImage}
                onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                className="w-full h-full object-contain"
                controls={false}
              />
            </div>
          ) : (
            <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
              <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]">
                <img
                  src={resource.coverImage || 'https://images.unsplash.com/photo-1474939557548-f842486be195?w=600&auto=format&fit=crop&q=80'}
                  alt={resource.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{resource.title}</h3>
                <p className="text-xs text-amber-400 font-bold mt-1">{resource.author} • {resource.subject}</p>
              </div>
              <audio
                ref={audioRef}
                src={resource.fileUrl}
                onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
                onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
              />
            </div>
          )}

          {/* PLAYER CONTROLS & TIMELINE */}
          <div className="w-full max-w-2xl mt-6 space-y-3 bg-[#001529] p-4 rounded-2xl border border-slate-800 shadow-xl">
            {/* Timeline Slider */}
            <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-300">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  const mediaEl = isVideo ? videoRef.current : audioRef.current;
                  if (mediaEl) mediaEl.currentTime = val;
                }}
                className="flex-1 accent-[#D4AF37] cursor-pointer"
              />
              <span>{formatTime(duration)}</span>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              {/* Playback Speeds */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changeRate(rate)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      playbackRate === rate ? 'bg-[#D4AF37] text-[#002147] font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Main Play/Pause & Skip */}
              <div className="flex items-center gap-3">
                <button onClick={() => seek(-10)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-[#002147] font-black flex items-center justify-center shadow-lg hover:scale-105 cursor-pointer">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5 fill-current" />}
                </button>
                <button onClick={() => seek(10)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Timestamp & AI Trigger & Download */}
              <div className="flex items-center gap-2">
                {resource.downloadPermitted && resource.fileUrl && (
                  <a
                    href={resource.fileUrl}
                    download={resource.title}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => LibraryService.trackDownload(resource.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Download Media File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={addTimestampBookmark}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                  title="Bookmark Timestamp"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                {onOpenAiAssistant && (
                  <button
                    onClick={() => onOpenAiAssistant(`Summarize audio/video lesson "${resource.title}" and explain key topics.`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Note</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOOKMARKS LIST */}
        {bookmarks.length > 0 && (
          <div className="p-4 bg-[#001529] border-t border-slate-800 space-y-2">
            <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
              <List className="w-3.5 h-3.5" /> Chapter Timestamps & Bookmarks
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {bookmarks.map((bm, i) => (
                <button
                  key={i}
                  onClick={() => seek(bm.timestamp - currentTime)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-mono text-amber-400 font-bold">{formatTime(bm.timestamp)}</span>
                  <span className="truncate max-w-xs">{bm.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
