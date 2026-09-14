import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  Sparkles, 
  User, 
  BookOpen, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  Film,
  Search,
  Filter,
  Play
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { GoogleMeetClass } from '../../services/googleMeetService';
import { GoogleMeetCard } from '../common/GoogleMeetCard';
import { VirtualClassroomRoomModal } from '../vle/VirtualClassroomRoomModal';

interface StudentGoogleMeetProps {
  schoolId: string;
  className: string;
  currentUserId?: string;
  currentUserName?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentGoogleMeet: React.FC<StudentGoogleMeetProps> = ({
  schoolId,
  className,
  currentUserId,
  currentUserName,
  showToast
}) => {
  const [meetings, setMeetings] = useState<GoogleMeetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recordings'>('upcoming');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [activeVleMeeting, setActiveVleMeeting] = useState<GoogleMeetClass | null>(null);

  // Subscribe to real-time Google Meet classes for student's school & class
  useEffect(() => {
    setLoading(true);

    let q;
    if (schoolId && className) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId),
        where('className', '==', className)
      );
    } else if (className) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('className', '==', className)
      );
    } else {
      q = query(collection(db, 'googleMeetClasses'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GoogleMeetClass[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as GoogleMeetClass);
      });

      // Filter out cancelled unless explicitly viewing history
      const activeList = list.filter(m => m.status !== 'cancelled');

      // Sort by date and start time
      activeList.sort((a, b) => {
        const timeA = `${a.date} ${a.startTime}`;
        const timeB = `${b.date} ${b.startTime}`;
        return timeA.localeCompare(timeB);
      });

      setMeetings(activeList);
      setLoading(false);
    }, (err) => {
      console.warn('Student Google Meet snapshot warning:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId, className]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingMeetings = meetings.filter(m => m.date >= todayStr);
  const liveMeetings = meetings.filter(m => m.status === 'active');
  const nextClass = liveMeetings.length > 0 ? liveMeetings[0] : upcomingMeetings[0];
  const recordingsList = meetings.filter(m => m.recordingUrl);

  const subjectsList = Array.from(new Set(meetings.map(m => m.subject)));

  const filteredMeetings = upcomingMeetings.filter(m => {
    return subjectFilter === 'All' || m.subject === subjectFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Virtual Google Meet Classroom</h1>
              <p className="text-slate-300 text-xs mt-0.5">
                Join live Google Meet lessons for <span className="text-[#D4AF37] font-bold">{className || 'Your Class'}</span> & access recorded lectures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Enrolled Class Security Active</span>
        </div>
      </div>

      {/* FEATURED NEXT ONLINE CLASS BANNER */}
      {nextClass && (
        <div className="bg-gradient-to-br from-[#002147] to-slate-900 border-2 border-[#D4AF37]/50 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] font-black text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow">
              <Sparkles className="w-3.5 h-3.5 fill-current" /> Next Scheduled Live Lesson
            </span>
            <span className="text-xs text-amber-300 font-extrabold">{nextClass.className}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white">{nextClass.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> {nextClass.subject}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4 text-slate-400" /> Teacher: {nextClass.teacherName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-4 h-4 text-emerald-400" /> {nextClass.date} ({nextClass.startTime} - {nextClass.endTime})
                </span>
              </div>
            </div>

            <div className="text-right">
              <GoogleMeetCard
                meeting={nextClass}
                userRole="student"
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                userClassName={className}
                showToast={showToast}
                onOpenVleRoom={(m) => setActiveVleMeeting(m)}
              />
            </div>
          </div>
        </div>
      )}

      {/* TABS & SUBJECT FILTER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upcoming' ? 'bg-[#002147] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled Classes ({upcomingMeetings.length})</span>
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

        {/* Filter by Subject */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Subject:</span>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Subjects</option>
            {subjectsList.map((sub, i) => (
              <option key={i} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'upcoming' && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading Google Meet classes...</div>
          ) : filteredMeetings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Video className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No scheduled Google Meet classes</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check back soon! Your teachers will schedule live virtual lessons here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeetings.map((meeting) => (
                <GoogleMeetCard
                  key={meeting.id || meeting.meetingId}
                  meeting={meeting}
                  userRole="student"
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  userClassName={className}
                  showToast={showToast}
                  onOpenVleRoom={(m) => setActiveVleMeeting(m)}
                />
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
              <Film className="w-5 h-5 text-purple-600" /> Google Meet Class Recordings
            </h2>
            <span className="text-xs text-slate-500 font-semibold">LMS Learning Archive</span>
          </div>

          {recordingsList.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              No recorded video lectures available yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recordingsList.map((rec) => (
                <div key={rec.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-[#002147] text-sm">{rec.title}</div>
                    <div className="text-xs text-slate-500 font-medium">
                      {rec.subject} • Teacher: {rec.teacherName} • Date: {rec.recordingDate || rec.date}
                    </div>
                  </div>
                  <a
                    href={rec.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Recording</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VLE ROOM MODAL */}
      {activeVleMeeting && (
        <VirtualClassroomRoomModal
          meeting={activeVleMeeting}
          isOpen={!!activeVleMeeting}
          onClose={() => setActiveVleMeeting(null)}
          currentUser={{ uid: currentUserId, displayName: currentUserName }}
          userRole="student"
          showToast={showToast}
        />
      )}

    </div>
  );
};
