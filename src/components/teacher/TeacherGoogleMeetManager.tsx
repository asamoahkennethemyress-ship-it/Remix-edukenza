import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Play, 
  Copy, 
  Edit3, 
  XCircle, 
  Film, 
  Share2, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Eye
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  GoogleMeetClass, 
  OnlineClassAttendance,
  cancelOnlineClassSession, 
  startOnlineClassSession, 
  saveGoogleMeetRecording 
} from '../../services/googleMeetService';
import { GoogleMeetCard } from '../common/GoogleMeetCard';
import { ScheduleGoogleMeetModal } from '../common/ScheduleGoogleMeetModal';
import { VirtualClassroomRoomModal } from '../vle/VirtualClassroomRoomModal';

interface TeacherGoogleMeetManagerProps {
  schoolId: string;
  currentUser: any;
  assignedClasses: any[];
  assignedSubjects: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSendToAssignment?: (dictatedText: string) => void;
}

export const TeacherGoogleMeetManager: React.FC<TeacherGoogleMeetManagerProps> = ({
  schoolId,
  currentUser,
  assignedClasses,
  assignedSubjects,
  showToast
}) => {
  const [meetings, setMeetings] = useState<GoogleMeetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'recordings' | 'attendance'>('today');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  
  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<GoogleMeetClass | null>(null);
  
  // Attendance & Recording Modal
  const [viewingAttendanceMeeting, setViewingAttendanceMeeting] = useState<GoogleMeetClass | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<OnlineClassAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Recording Input State
  const [recordingUrlInput, setRecordingUrlInput] = useState('');
  const [recordingMeetingId, setRecordingMeetingId] = useState<string | null>(null);

  // VLE Active Room State
  const [activeVleMeeting, setActiveVleMeeting] = useState<GoogleMeetClass | null>(null);

  // Real-time listener for Google Meet classes
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);

    let q;
    if (schoolId) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId),
        where('teacherId', '==', currentUser.uid)
      );
    } else {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('teacherId', '==', currentUser.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GoogleMeetClass[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as GoogleMeetClass);
      });

      // Sort by date & start time
      list.sort((a, b) => {
        const timeA = `${a.date} ${a.startTime}`;
        const timeB = `${b.date} ${b.startTime}`;
        return timeA.localeCompare(timeB);
      });

      setMeetings(list);
      setLoading(false);
    }, (err) => {
      console.warn('Google Meet realtime listener warning:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId, currentUser]);

  // Fetch Attendance Logs for a selected meeting
  const handleViewAttendance = async (meeting: GoogleMeetClass) => {
    setViewingAttendanceMeeting(meeting);
    setLoadingAttendance(true);
    try {
      const q = query(
        collection(db, 'onlineClassAttendance'),
        where('meetingId', '==', meeting.id || meeting.meetingId)
      );
      const snap = await getDocs(q);
      const logs: OnlineClassAttendance[] = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data() } as OnlineClassAttendance));
      setAttendanceLogs(logs);
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
      setAttendanceLogs([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Start Meeting Handler
  const handleStartMeeting = async (meeting: GoogleMeetClass) => {
    try {
      if (meeting.id) {
        await startOnlineClassSession(meeting.id);
      }
      showToast(`Launching Google Meet for ${meeting.subject}...`, 'success');
      window.open(meeting.meetLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('Error launching meeting', 'error');
    }
  };

  // Cancel Meeting Handler
  const handleCancelMeeting = async (meeting: GoogleMeetClass) => {
    const reason = prompt(`Reason for cancelling ${meeting.subject} Google Meet session?`, 'Teacher unavailable');
    if (reason === null) return;

    try {
      if (meeting.id) {
        await cancelOnlineClassSession(meeting.id, schoolId || meeting.schoolId || '', meeting.className, meeting.subject, reason);
        showToast('Online class cancelled & students notified', 'info');
      }
    } catch (err) {
      showToast('Error cancelling meeting', 'error');
    }
  };

  // Save Recording URL Handler
  const handleSaveRecording = async (meetingId: string, subject: string) => {
    if (!recordingUrlInput || !recordingUrlInput.startsWith('http')) {
      showToast('Please enter a valid recording URL (e.g. Google Drive link or YouTube unlisted).', 'error');
      return;
    }

    try {
      await saveGoogleMeetRecording(meetingId, recordingUrlInput, currentUser?.displayName || 'Teacher', subject);
      showToast('Recording link saved and published to LMS history!', 'success');
      setRecordingMeetingId(null);
      setRecordingUrlInput('');
    } catch (err) {
      showToast('Error saving recording link', 'error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === todayStr);
  const activeMeetings = meetings.filter(m => m.status === 'active');
  const upcomingMeetings = meetings.filter(m => m.date >= todayStr && m.status !== 'cancelled' && m.status !== 'completed');
  const recordingsList = meetings.filter(m => m.recordingUrl);

  const filteredMeetings = (activeTab === 'today' ? todayMeetings : upcomingMeetings).filter(m => {
    return selectedClassFilter === 'All' || m.className === selectedClassFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Google Meet Virtual Classroom Hub</h1>
              <p className="text-slate-300 text-xs mt-0.5">
                Automated Google Meet links, real-time timetable sync, LMS materials & attendance tracking.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingMeeting(null);
            setIsScheduleModalOpen(true);
          }}
          className="px-5 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Online Class</span>
        </button>
      </div>

      {/* QUICK METRICS STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold">Today's Classes</div>
            <div className="text-xl font-black text-[#002147]">{todayMeetings.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
            <Video className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold">Active / Live</div>
            <div className="text-xl font-black text-emerald-600">{activeMeetings.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold">Total Scheduled</div>
            <div className="text-xl font-black text-[#002147]">{upcomingMeetings.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold">LMS Recordings</div>
            <div className="text-xl font-black text-purple-700">{recordingsList.length}</div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION & CLASS FILTER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'today' ? 'bg-[#002147] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today's Classes ({todayMeetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upcoming' ? 'bg-[#002147] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>All Scheduled ({upcomingMeetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'recordings' ? 'bg-[#002147] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Class Recordings ({recordingsList.length})</span>
          </button>
        </div>

        {/* Filter by class */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Filter Class:</span>
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Classes</option>
            {assignedClasses.map((c, i) => {
              const val = c.name || c.className || c;
              return <option key={i} value={val}>{val}</option>;
            })}
          </select>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab !== 'recordings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              Loading Google Meet sessions...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Video className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No Google Meet classes scheduled</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Schedule Online Class" above or set a timetable lesson to "Online Class = TRUE" to automatically generate Google Meet sessions.
              </p>
              <button
                onClick={() => {
                  setEditingMeeting(null);
                  setIsScheduleModalOpen(true);
                }}
                className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl hover:bg-[#0b3c5d] transition cursor-pointer"
              >
                Schedule First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeetings.map((meeting) => (
                <div key={meeting.id || meeting.meetingId} className="relative">
                  <GoogleMeetCard
                    meeting={meeting}
                    userRole="teacher"
                    showToast={showToast}
                    onOpenVleRoom={(m) => setActiveVleMeeting(m)}
                    onEdit={(m) => {
                      setEditingMeeting(m);
                      setIsScheduleModalOpen(true);
                    }}
                    onCancel={handleCancelMeeting}
                    onStart={handleStartMeeting}
                    onViewAttendance={handleViewAttendance}
                  />

                  {/* Add/Edit Recording Link Option */}
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => setRecordingMeetingId(meeting.id || meeting.meetingId)}
                      className="text-[11px] font-bold text-purple-700 hover:underline flex items-center justify-end gap-1 ml-auto cursor-pointer"
                    >
                      <Film className="w-3 h-3" />
                      {meeting.recordingUrl ? 'Update Recording Link' : '+ Add Recording Link for LMS'}
                    </button>
                  </div>

                  {/* Inline Recording Link Input */}
                  {recordingMeetingId === (meeting.id || meeting.meetingId) && (
                    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                      <div className="text-xs font-bold text-purple-900">
                        Enter Google Drive / YouTube Recording Link:
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={recordingUrlInput}
                          onChange={e => setRecordingUrlInput(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs outline-none"
                        />
                        <button
                          onClick={() => handleSaveRecording(meeting.id || meeting.meetingId, meeting.subject)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRecordingMeetingId(null)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECORDINGS TAB */}
      {activeTab === 'recordings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-[#002147] flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-600" /> Archived Google Meet Recordings
            </h2>
            <span className="text-xs text-slate-500 font-semibold">Available for Student LMS Review</span>
          </div>

          {recordingsList.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              No recorded sessions uploaded yet. You can attach recording links after ending classes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recordingsList.map((rec) => (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-extrabold text-[#002147] text-sm">{rec.title}</div>
                    <div className="text-xs text-slate-500 font-medium">
                      {rec.className} • {rec.subject} • Date: {rec.recordingDate || rec.date}
                    </div>
                  </div>
                  <a
                    href={rec.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>Play Recording</span>
                    <Film className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE / EDIT MODAL */}
      <ScheduleGoogleMeetModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schoolId={schoolId}
        teacherId={currentUser?.uid || ''}
        teacherName={currentUser?.displayName || 'Teacher'}
        assignedClasses={assignedClasses}
        assignedSubjects={assignedSubjects}
        editingMeeting={editingMeeting}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      {/* ATTENDANCE SUMMARY MODAL */}
      {viewingAttendanceMeeting && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#002147]">
                  Google Meet Attendance Log
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingAttendanceMeeting.subject} • {viewingAttendanceMeeting.className} ({viewingAttendanceMeeting.date})
                </p>
              </div>
              <button
                onClick={() => setViewingAttendanceMeeting(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {loadingAttendance ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading student attendance...</div>
            ) : attendanceLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students have joined this online meeting yet. Attendance is recorded automatically as soon as students click "Join Google Meet".
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {attendanceLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-[#002147]">{log.studentName}</div>
                      <div className="text-[11px] text-slate-500">Joined at: {log.joinTime}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      log.status === 'Present' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setViewingAttendanceMeeting(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VLE ROOM MODAL */}
      {activeVleMeeting && (
        <VirtualClassroomRoomModal
          meeting={activeVleMeeting}
          isOpen={!!activeVleMeeting}
          onClose={() => setActiveVleMeeting(null)}
          currentUser={currentUser}
          userRole="teacher"
          showToast={showToast}
        />
      )}

    </div>
  );
};
