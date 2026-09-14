import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Calendar, 
  Clock, 
  BookOpen, 
  Users, 
  Link as LinkIcon, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Film,
  FileText,
  Globe,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut
} from 'lucide-react';
import { 
  GoogleMeetClass, 
  generateGoogleMeetLink, 
  createOnlineClassSession, 
  updateOnlineClassSession,
  getGoogleMeetAccessToken,
  getCachedGoogleMeetAuthStatus,
  clearGoogleMeetAccessToken,
  createGoogleCalendarMeetEvent
} from '../../services/googleMeetService';
import { useAuth } from '../../context/AuthContext';

interface ScheduleGoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  editingMeeting?: GoogleMeetClass | null;
  onSuccess: (message: string) => void;
}

const COMMON_TIMEZONES = [
  { label: 'Johannesburg, South Africa (GMT+2)', value: 'Africa/Johannesburg' },
  { label: 'Accra, Ghana (GMT+0)', value: 'Africa/Accra' },
  { label: 'Lagos, Nigeria (GMT+1)', value: 'Africa/Lagos' },
  { label: 'Nairobi, Kenya (GMT+3)', value: 'Africa/Nairobi' },
  { label: 'London, UK (GMT+0 / BST+1)', value: 'Europe/London' },
  { label: 'New York, USA (EST/EDT)', value: 'America/New_York' },
  { label: 'Coordinated Universal Time (UTC)', value: 'UTC' }
];

export const ScheduleGoogleMeetModal: React.FC<ScheduleGoogleMeetModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  teacherId,
  teacherName,
  assignedClasses,
  assignedSubjects,
  editingMeeting,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg');
  const [meetLink, setMeetLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [allowEarlyJoin, setAllowEarlyJoin] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Google Account Connection State
  const [googleAuth, setGoogleAuth] = useState<{ isConnected: boolean; email?: string }>(getCachedGoogleMeetAuthStatus());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    setGoogleAuth(getCachedGoogleMeetAuthStatus());

    if (editingMeeting) {
      setTitle(editingMeeting.title);
      setSubject(editingMeeting.subject);
      setClassName(editingMeeting.className);
      setDescription(editingMeeting.description || '');
      setDate(editingMeeting.date);
      setStartTime(editingMeeting.startTime);
      setEndTime(editingMeeting.endTime);
      setTimeZone(editingMeeting.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg');
      setMeetLink(editingMeeting.meetLink);
      setMeetingId(editingMeeting.meetingId);
      setAllowEarlyJoin(!!editingMeeting.allowEarlyJoin);
      setIsRecordingEnabled(editingMeeting.isRecordingEnabled !== false);
    } else {
      // Generate new Google Meet link automatically
      handleGenerateNewLink();
      setTitle('Interactive Live Google Meet Lesson');
      setDescription('Join our live virtual classroom session with interactive whiteboard, shared teaching resources, and chat.');
      if (assignedClasses.length > 0) {
        setClassName(assignedClasses[0].name || assignedClasses[0].className || assignedClasses[0]);
      }
      if (assignedSubjects.length > 0) {
        setSubject(assignedSubjects[0].name || assignedSubjects[0].subjectName || assignedSubjects[0]);
      }
    }
  }, [editingMeeting, isOpen]);

  const handleGenerateNewLink = () => {
    const { meetLink: newLink, meetingId: newId } = generateGoogleMeetLink();
    setMeetLink(newLink);
    setMeetingId(newId);
  };

  const handleConnectGoogle = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await getGoogleMeetAccessToken(true);
      setGoogleAuth({ isConnected: true, email: res.email });
    } catch (err: any) {
      setAuthError(err.message || 'Google authorization failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnectGoogle = () => {
    clearGoogleMeetAccessToken();
    setGoogleAuth({ isConnected: false });
    setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !className || !date || !startTime || !endTime) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      let finalMeetLink = meetLink;
      let finalMeetingId = meetingId;
      let googleEventId: string | undefined = editingMeeting?.googleEventId;

      // If connected to Google Account, create/sync real Google Calendar & Meet event
      if (googleAuth.isConnected) {
        try {
          const authRes = await getGoogleMeetAccessToken(false);
          const eventResult = await createGoogleCalendarMeetEvent({
            title,
            subject,
            className,
            teacherName,
            date,
            startTime,
            endTime,
            timeZone,
            description,
            accessToken: authRes.accessToken
          });

          finalMeetLink = eventResult.meetLink;
          finalMeetingId = eventResult.meetingId;
          googleEventId = eventResult.eventId;
        } catch (apiErr: any) {
          console.warn('Google Calendar API creation fallback:', apiErr);
          // Fall back to generated link if calendar API had an issue
          if (!finalMeetLink) {
            const gen = generateGoogleMeetLink();
            finalMeetLink = gen.meetLink;
            finalMeetingId = gen.meetingId;
          }
        }
      }

      if (editingMeeting && editingMeeting.id) {
        await updateOnlineClassSession(editingMeeting.id, {
          title,
          subject,
          className,
          description,
          date,
          startTime,
          endTime,
          timeZone,
          meetLink: finalMeetLink,
          meetingId: finalMeetingId,
          googleEventId,
          allowEarlyJoin,
          isRecordingEnabled
        });
        onSuccess('Google Meet class session updated successfully!');
      } else {
        await createOnlineClassSession({
          schoolId,
          title,
          subject,
          className,
          description,
          teacherId,
          teacherName,
          meetLink: finalMeetLink || generateGoogleMeetLink().meetLink,
          meetingId: finalMeetingId || generateGoogleMeetLink().meetingId,
          googleEventId,
          date,
          startTime,
          endTime,
          timeZone,
          status: 'scheduled',
          isApproved: true,
          allowEarlyJoin,
          isRecordingEnabled
        });
        onSuccess('Google Meet class scheduled and synchronized with VLE Room!');
      }
      onClose();
    } catch (err: any) {
      showToast('Failed to save Google Meet class: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 text-white flex items-center justify-between border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {editingMeeting ? 'Edit Online Class Session' : 'Schedule Live Google Meet Class'}
              </h2>
              <p className="text-xs text-slate-300">
                Official Google Meet Integration • Live VLE Whiteboard & Class Roster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GOOGLE ACCOUNT CONNECTION BADGE / BANNER */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Google Calendar & Meet:</span>
            {googleAuth.isConnected ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected {googleAuth.email ? `(${googleAuth.email})` : ''}</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full font-medium">
                Standard Link Mode
              </span>
            )}
          </div>

          <div>
            {googleAuth.isConnected ? (
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={authLoading}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-[#002147] border border-slate-300 rounded-xl font-bold transition flex items-center gap-1.5 shadow-2xs text-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span>{authLoading ? 'Connecting...' : 'Authorize Google Account'}</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* MODAL FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* TITLE */}
          <div>
            <label className="block font-extrabold text-[#002147] mb-1">Session Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Quadratic Equations Live Review"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
            />
          </div>

          {/* CLASS & SUBJECT SELECTORS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-extrabold text-[#002147] mb-1">Assigned Class *</label>
              <select
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
              >
                <option value="">Select Class</option>
                {assignedClasses.map((c, i) => {
                  const val = c.name || c.className || c;
                  return <option key={i} value={val}>{val}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block font-extrabold text-[#002147] mb-1">Subject *</label>
              <select
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
              >
                <option value="">Select Subject</option>
                {assignedSubjects.map((s, i) => {
                  const val = s.name || s.subjectName || s;
                  return <option key={i} value={val}>{val}</option>;
                })}
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block font-extrabold text-[#002147] mb-1">Lesson Outline / Objectives</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Key concepts to cover, required textbooks, homework to review..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147] resize-none"
            />
          </div>

          {/* DATE, TIME & TIMEZONE */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-extrabold text-[#002147] mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
              >
              </input>
            </div>
            <div>
              <label className="block font-extrabold text-[#002147] mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
              />
            </div>
            <div>
              <label className="block font-extrabold text-[#002147] mb-1">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
              />
            </div>
          </div>

          {/* TIMEZONE SELECTOR */}
          <div>
            <label className="block font-extrabold text-[#002147] mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Timezone
            </label>
            <select
              value={timeZone}
              onChange={e => setTimeZone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-[#002147]"
            >
              {COMMON_TIMEZONES.map((tz, i) => (
                <option key={i} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* GOOGLE MEET LINK GENERATOR */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-600" /> Google Meet Video Room
              </span>
              <button
                type="button"
                onClick={handleGenerateNewLink}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate Code
              </button>
            </div>
            <input
              type="url"
              required
              value={meetLink}
              onChange={e => {
                setMeetLink(e.target.value);
                const parts = e.target.value.split('/');
                setMeetingId(parts[parts.length - 1] || '');
              }}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-emerald-900 font-bold outline-none"
            />
            <p className="text-[11px] text-emerald-800">
              Meeting ID: <span className="font-mono font-bold">{meetingId}</span> • Synced with Live VLE Room, Attendance Roster, & Student Timetable.
            </p>
          </div>

          {/* OPTIONS: EARLY JOIN & RECORDING */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEarlyJoin}
                onChange={e => setAllowEarlyJoin(e.target.checked)}
                className="w-4 h-4 text-[#002147] rounded"
              />
              <span className="font-bold text-slate-700">Allow students to join before teacher starts</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecordingEnabled}
                onChange={e => setIsRecordingEnabled(e.target.checked)}
                className="w-4 h-4 text-[#002147] rounded"
              />
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-purple-600" /> Enable Google Meet recording archiving for LMS course repository
              </span>
            </label>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Saving...' : editingMeeting ? 'Update Class Session' : 'Schedule & Broadcast'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
