import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  BookOpen, 
  Building2, 
  ShieldCheck, 
  Lock, 
  Save, 
  Camera, 
  CheckCircle2, 
  X,
  FileText
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { PersonalDataExportCard } from '../profile/PersonalDataExportCard';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { uploadProfilePhoto } from '../../services/imageStorageService';
import { updateTeacherProfilePhoto } from '../../services/schoolBrandingService';
import { useSchoolBranding } from '../../context/SchoolBrandingContext';

export interface TeacherProfileViewProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  assignedClasses: any[];
  assignedSubjects: any[];
}

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({
  currentUser,
  showToast,
  assignedClasses,
  assignedSubjects
}) => {
  const [saving, setSaving] = useState(false);
  const { schoolId, schoolName, primaryColor, secondaryColor } = useSchoolBranding();

  // Editable Profile Form
  const [formData, setFormData] = useState({
    name: currentUser?.fullName || currentUser?.name || '',
    phone: currentUser?.phone || currentUser?.phoneNumber || '',
    address: currentUser?.address || '',
    qualification: currentUser?.qualification || 'Bachelor of Education (B.Ed)',
    bio: currentUser?.bio || '',
    photoUrl: currentUser?.avatarUrl || currentUser?.photoUrl || ''
  });

  // Submit profile updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const payload = {
        name: formData.name,
        fullName: formData.name,
        phone: formData.phone,
        address: formData.address,
        qualification: formData.qualification,
        bio: formData.bio,
        avatarUrl: formData.photoUrl,
        photoUrl: formData.photoUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, payload);

      // Also update in teachers collection if entry exists
      try {
        const teacherRef = doc(db, 'teachers', currentUser.uid);
        await updateDoc(teacherRef, payload);
      } catch (e) {
        // Teacher doc might use auto-generated id
      }

      showToast("Profile updated successfully!", "success");
    } catch (err) {
      console.error("Profile update error:", err);
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER BANNER */}
      <div 
        className="p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center gap-6 border"
        style={{
          backgroundColor: primaryColor || '#002147',
          borderColor: 'rgba(255,255,255,0.15)'
        }}
      >
        <div className="shrink-0">
          <ProfilePhotoUploader
            currentPhotoUrl={formData.photoUrl}
            displayName={formData.name || 'Teacher'}
            subtitle={currentUser?.teacherId ? `Faculty ID: ${currentUser.teacherId}` : 'Digital Faculty Photo'}
            shape="circle"
            size="lg"
            onUpload={async (file, onProgress) => {
              const activeSchoolId = schoolId || currentUser?.schoolId;
              const entityKey = currentUser?.teacherId || currentUser?.uid || 'teacher';
              const url = await uploadProfilePhoto(activeSchoolId, 'teachers', entityKey, file, onProgress);
              setFormData(prev => ({ ...prev, photoUrl: url }));
              await updateTeacherProfilePhoto(activeSchoolId, currentUser?.uid, currentUser?.teacherId || '', url, {
                email: currentUser?.email,
                name: formData.name
              });
              showToast("Passport photo updated across portals!", "success");
              return url;
            }}
            onRemove={async () => {
              const activeSchoolId = schoolId || currentUser?.schoolId;
              setFormData(prev => ({ ...prev, photoUrl: '' }));
              await updateTeacherProfilePhoto(activeSchoolId, currentUser?.uid, currentUser?.teacherId || '', '', {
                email: currentUser?.email,
                name: formData.name
              });
              showToast("Passport photo removed", "info");
            }}
          />
        </div>

        <div className="space-y-1.5 text-center md:text-left flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Certified Teacher Profile
          </div>
          <h1 className="text-2xl font-black truncate">{formData.name || 'Teacher Profile'}</h1>
          <p className="text-xs text-slate-200">{formData.qualification} • {schoolName || currentUser?.schoolName || 'EDUkenZA Academy'}</p>
          <p className="text-[11px] text-slate-300 font-mono truncate">{currentUser?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* EDITABLE SECTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-[#002147]" />
            <h2 className="text-sm font-black text-[#002147] uppercase tracking-wide">
              Personal & Professional Information (Editable)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+27 82 123 4567"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Qualifications & Degrees</label>
              <input
                type="text"
                placeholder="e.g. B.Ed in Mathematics, PGCE"
                value={formData.qualification}
                onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
              <input
                type="text"
                placeholder="Residential Address..."
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Professional Bio / Teacher Profile</label>
              <textarea
                rows={3}
                placeholder="Brief summary of teaching experience, specializations, and goals..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>{saving ? 'Saving Changes...' : 'Update Profile'}</span>
            </button>
          </div>
        </div>

        {/* LOCKED READ-ONLY SYSTEM DATA */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-black text-[#002147] uppercase tracking-wide">
                System Account Attributes (Locked - Admin Managed Only)
              </h2>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              Read-Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Account Email</span>
              <p className="font-bold text-[#002147] mt-0.5">{currentUser?.email}</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">User Role</span>
              <p className="font-bold text-emerald-700 mt-0.5 uppercase tracking-wide">Teacher (Educator)</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">School Institution</span>
              <p className="font-bold text-[#002147] mt-0.5">{currentUser?.schoolName || 'Not Assigned'}</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">School ID</span>
              <p className="font-mono text-slate-600 mt-0.5 truncate">{currentUser?.schoolId || 'N/A'}</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 md:col-span-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Classes</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {assignedClasses.length === 0 ? (
                  <span className="text-slate-400 italic">No classes explicitly assigned yet</span>
                ) : (
                  assignedClasses.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[#002147] text-white rounded-lg font-bold text-[11px]">
                      {c.name || c.className || c}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 md:col-span-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Subjects</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {assignedSubjects.length === 0 ? (
                  <span className="text-slate-400 italic">No subjects explicitly assigned yet</span>
                ) : (
                  assignedSubjects.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-500/20 text-[#002147] border border-amber-500/30 rounded-lg font-bold text-[11px]">
                      {s.name || s.subjectName || s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </form>

      {/* DATA PRIVACY & DOWNLOAD PERSONAL DATA */}
      <PersonalDataExportCard
        currentUser={currentUser}
        customTitle="Download Teacher Personal Data"
        customDescription="Export a machine-readable JSON file containing your teacher profile, assigned subjects and classes, credentials, and notification preferences."
      />
    </div>
  );
};
