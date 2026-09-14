import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Clock, 
  Calendar, 
  User, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Play, 
  Edit3, 
  XCircle, 
  FileText, 
  Award, 
  ShieldCheck, 
  VideoOff,
  Users,
  Film,
  Sparkles
} from 'lucide-react';
import { 
  GoogleMeetClass, 
  getMeetingTimeStatus, 
  formatCountdown, 
  recordStudentMeetAttendance 
} from '../../services/googleMeetService';

interface GoogleMeetCardProps {
  meeting: GoogleMeetClass;
  userRole: 'teacher' | 'student' | 'parent' | 'admin' | 'school_admin' | 'platform_owner' | string;
  currentUserId?: string;
  currentUserName?: string;
  userClassName?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onEdit?: (meeting: GoogleMeetClass) => void;
  onCancel?: (meeting: GoogleMeetClass) => void;
  onStart?: (meeting: GoogleMeetClass) => void;
  onViewAttendance?: (meeting: GoogleMeetClass) => void;
  onOpenVleRoom?: (meeting: GoogleMeetClass) => void;
}

export const GoogleMeetCard: React.FC<GoogleMeetCardProps> = ({
  meeting,
  userRole,
  currentUserId,
  currentUserName,
  userClassName,
  showToast,
  onEdit,
  onCancel,
  onStart,
  onViewAttendance,
  onOpenVleRoom
}) => {
  const [copied, setCopied] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [timeStatus, setTimeStatus] = useState(getMeetingTimeStatus(meeting.date, meeting.startTime, meeting.endTime));

  // Countdown Timer Hook
  useEffect(() => {
    const updateTimer = () => {
      const status = getMeetingTimeStatus(meeting.date, meeting.startTime, meeting.endTime);
      setTimeStatus(status);
      if (status.isUpcoming && status.diffSeconds > 0) {
        setCountdownText(formatCountdown(status.diffSeconds));
      } else if (status.isLive || meeting.status === 'active') {
        setCountdownText('LIVE NOW');
      } else {
        setCountdownText('Class Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [meeting.date, meeting.startTime, meeting.endTime, meeting.status]);

  // Handle Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(meeting.meetLink);
    setCopied(true);
    if (showToast) showToast('Google Meet link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Security Check: Is user authorized for this class?
  const isSecurityAuthorized = () => {
    if (userRole === 'admin' || userRole === 'teacher') return true;
    if (!userClassName) return true; // If class not strictly specified, default allow
    return userClassName.toLowerCase() === meeting.className.toLowerCase();
  };

  // Student Join Meeting Handler with Attendance Recording
  const handleStudentJoin = async () => {
    if (!isSecurityAuthorized()) {
      if (showToast) showToast('Access Restricted: You are not assigned to this class.', 'error');
      return;
    }

    const joinTimeStr = new Date().toLocaleTimeString();
    // Calculate if late (if joined 10+ minutes after start time)
    const [startHour, startMinute] = meeting.startTime.split(':').map(Number);
    const now = new Date();
    const scheduledStart = new Date();
    scheduledStart.setHours(startHour, startMinute, 0);

    const isLate = (now.getTime() - scheduledStart.getTime()) > 10 * 60 * 1000;
    const attendanceStatus = isLate ? 'Late' : 'Present';

    // Log attendance to Firestore
    if (currentUserId && currentUserName) {
      await recordStudentMeetAttendance({
        schoolId: meeting.schoolId,
        meetingId: meeting.id || meeting.meetingId,
        className: meeting.className,
        subject: meeting.subject,
        studentId: currentUserId,
        studentName: currentUserName,
        joinTime: joinTimeStr,
        status: attendanceStatus
      });
      if (showToast) showToast(`Joined class as ${attendanceStatus}. Attendance logged automatically.`, 'success');
    }

    // Open Google Meet in new tab
    window.open(meeting.meetLink, '_blank', 'noopener,noreferrer');
  };

  const isLive = timeStatus.isLive || meeting.status === 'active';
  const isCancelled = meeting.status === 'cancelled';
  const canJoin = !isCancelled && (isLive || timeStatus.isUpcoming || meeting.allowEarlyJoin || userRole === 'teacher' || userRole === 'student' || userRole === 'parent');

  return (
    <div className={`p-5 rounded-3xl border transition-all duration-300 shadow-sm relative overflow-hidden ${
      isCancelled
        ? 'bg-slate-50 border-slate-200 opacity-75'
        : isLive
        ? 'bg-gradient-to-br from-emerald-950 via-[#002147] to-slate-900 border-emerald-400/50 text-white shadow-lg ring-2 ring-emerald-500/30'
        : 'bg-white hover:border-[#D4AF37]/50 border-slate-200 text-slate-800'
    }`}>
      {/* Background Accent Glow for Live Classes */}
      {isLive && !isCancelled && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* TOP BAR: Class Name & Status Badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
            isLive
              ? 'bg-emerald-500 text-white animate-pulse shadow-sm'
              : isCancelled
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {isCancelled ? 'Cancelled' : isLive ? '🟢 Live Class' : 'Scheduled'}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
            isLive ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {meeting.className}
          </span>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400" title="Restricted to enrolled school & class students">
          <ShieldCheck className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Protected</span>
        </div>
      </div>

      {/* TITLE & SUBJECT */}
      <div className="space-y-1 mb-4">
        <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isLive ? 'text-white' : 'text-[#002147]'}`}>
          <Video className={`w-5 h-5 ${isLive ? 'text-emerald-400' : 'text-blue-600'}`} />
          {meeting.title}
        </h3>
        <p className={`text-xs font-bold ${isLive ? 'text-amber-300' : 'text-amber-700'}`}>
          {meeting.subject} • Teacher: {meeting.teacherName}
        </p>
      </div>

      {/* DATE, TIME & COUNTDOWN ROW */}
      <div className={`grid grid-cols-2 gap-3 p-3 rounded-2xl mb-4 ${
        isLive ? 'bg-white/10 border border-white/10' : 'bg-slate-50 border border-slate-100'
      }`}>
        <div className="flex items-center gap-2 text-xs font-medium">
          <Calendar className={`w-4 h-4 ${isLive ? 'text-amber-300' : 'text-slate-400'}`} />
          <div>
            <div className={`text-[10px] uppercase font-bold ${isLive ? 'text-slate-300' : 'text-slate-400'}`}>Date</div>
            <div className={`font-bold ${isLive ? 'text-white' : 'text-slate-700'}`}>{meeting.date}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <Clock className={`w-4 h-4 ${isLive ? 'text-emerald-400' : 'text-slate-400'}`} />
          <div>
            <div className={`text-[10px] uppercase font-bold ${isLive ? 'text-slate-300' : 'text-slate-400'}`}>Time</div>
            <div className={`font-bold ${isLive ? 'text-white' : 'text-slate-700'}`}>{meeting.startTime} - {meeting.endTime}</div>
          </div>
        </div>
      </div>

      {/* COUNTDOWN BANNER IF UPCOMING */}
      {timeStatus.isUpcoming && !isCancelled && (
        <div className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
          <span className="font-semibold text-amber-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Starts in:
          </span>
          <span className="font-mono font-black text-amber-800 text-sm">{countdownText}</span>
        </div>
      )}

      {/* RECORDING BANNER IF ENABLED */}
      {meeting.recordingUrl && (
        <div className="mb-4 p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between text-xs">
          <span className="font-semibold text-purple-700 flex items-center gap-1.5">
            <Film className="w-4 h-4 text-purple-600" /> Class Recording Available
          </span>
          <a
            href={meeting.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1"
          >
            Watch <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* ACTION BUTTONS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/20">
        {/* Copy Meeting Link */}
        <button
          onClick={handleCopyLink}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            isLive 
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Copy Google Meet Link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>

        {/* User Role Specific Main Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenVleRoom && !isCancelled && (
            <button
              onClick={() => onOpenVleRoom(meeting)}
              className="px-3.5 py-2 bg-[#002147] hover:bg-[#001833] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Virtual Learning Environment Room"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>VLE Classroom</span>
            </button>
          )}

          {userRole === 'teacher' && (
            <>
              {onEdit && !isCancelled && (
                <button
                  onClick={() => onEdit(meeting)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                  title="Edit Meeting"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onCancel && !isCancelled && (
                <button
                  onClick={() => onCancel(meeting)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition cursor-pointer"
                  title="Cancel Meeting"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              {onViewAttendance && (
                <button
                  onClick={() => onViewAttendance(meeting)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="View Attendance Logs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Attendance</span>
                </button>
              )}
              {onStart && !isCancelled && (
                <button
                  onClick={() => onStart(meeting)}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Meet</span>
                </button>
              )}
            </>
          )}

          {(userRole === 'student' || userRole === 'parent') && (
            <button
              onClick={handleStudentJoin}
              disabled={!canJoin}
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
                canJoin
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-bounce'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{canJoin ? 'Join Google Meet' : 'Waiting for Start'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
