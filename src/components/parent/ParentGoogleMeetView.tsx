import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Users,
  Search,
  Filter
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { GoogleMeetClass } from '../../services/googleMeetService';
import { GoogleMeetCard } from '../common/GoogleMeetCard';
import { VirtualClassroomRoomModal } from '../vle/VirtualClassroomRoomModal';

interface ParentGoogleMeetViewProps {
  schoolId: string;
  linkedStudents: any[];
  selectedStudent: any | null;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentGoogleMeetView: React.FC<ParentGoogleMeetViewProps> = ({
  schoolId,
  linkedStudents,
  selectedStudent,
  showToast
}) => {
  const [meetings, setMeetings] = useState<GoogleMeetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVleMeeting, setActiveVleMeeting] = useState<GoogleMeetClass | null>(null);

  const currentClassName = selectedStudent?.class || selectedStudent?.className || (linkedStudents.length > 0 ? (linkedStudents[0].class || linkedStudents[0].className) : '');

  useEffect(() => {
    if (!currentClassName) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let q;
    if (schoolId) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId),
        where('className', '==', currentClassName)
      );
    } else {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('className', '==', currentClassName)
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
      console.warn('Parent Google Meet snapshot warning:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId, currentClassName]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingMeetings = meetings.filter(m => m.date >= todayStr);

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
              <h1 className="text-2xl font-black tracking-tight">Parent Online Class Schedule</h1>
              <p className="text-slate-300 text-xs mt-0.5">
                Monitor live Google Meet sessions & class schedules for{' '}
                <span className="text-[#D4AF37] font-bold">
                  {selectedStudent?.name || selectedStudent?.studentName || 'Your Child'} ({currentClassName || 'N/A'})
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold text-slate-200">
          <Users className="w-4 h-4 text-[#D4AF37]" />
          <span>Real-time Parent Portal Sync</span>
        </div>
      </div>

      {/* MEETINGS LIST */}
      <div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading child's Google Meet schedule...</div>
        ) : !currentClassName ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 text-xs">
            Please select a student profile to view their Google Meet schedule.
          </div>
        ) : upcomingMeetings.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <Video className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No upcoming online classes</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no scheduled Google Meet lessons for class {currentClassName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((meeting) => (
              <GoogleMeetCard
                key={meeting.id || meeting.meetingId}
                meeting={meeting}
                userRole="parent"
                userClassName={currentClassName}
                showToast={showToast}
                onOpenVleRoom={(m) => setActiveVleMeeting(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* VLE ROOM MODAL */}
      {activeVleMeeting && (
        <VirtualClassroomRoomModal
          meeting={activeVleMeeting}
          isOpen={!!activeVleMeeting}
          onClose={() => setActiveVleMeeting(null)}
          currentUser={{ uid: 'parent', displayName: 'Parent Observer' }}
          userRole="parent"
          showToast={showToast}
        />
      )}

    </div>
  );
};
