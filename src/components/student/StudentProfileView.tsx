import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart, 
  Camera, 
  Save, 
  CheckCircle2, 
  GraduationCap, 
  Lock,
  Upload
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { PersonalDataExportCard } from '../profile/PersonalDataExportCard';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { uploadProfilePhoto } from '../../services/imageStorageService';
import { updateStudentProfilePhoto } from '../../services/schoolBrandingService';
import { useSchoolBranding } from '../../context/SchoolBrandingContext';

export interface StudentProfileViewProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onProfileUpdated?: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  currentUser,
  studentRecord,
  showToast,
  onProfileUpdated
}) => {
  const { schoolId, schoolName, primaryColor, secondaryColor } = useSchoolBranding();
  const [form, setForm] = useState({
    phone: currentUser?.phone || studentRecord?.phone || '',
    address: currentUser?.address || studentRecord?.address || '',
    emergencyContact: currentUser?.emergencyContact || studentRecord?.emergencyContact || '',
    bio: currentUser?.bio || studentRecord?.bio || '',
    photoUrl: currentUser?.photoUrl || currentUser?.avatarUrl || studentRecord?.photoUrl || ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      phone: currentUser?.phone || studentRecord?.phone || '',
      address: currentUser?.address || studentRecord?.address || '',
      emergencyContact: currentUser?.emergencyContact || studentRecord?.emergencyContact || '',
      bio: currentUser?.bio || studentRecord?.bio || '',
      photoUrl: currentUser?.photoUrl || currentUser?.avatarUrl || studentRecord?.photoUrl || ''
    });
  }, [currentUser, studentRecord]);

  // Handle Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = {
        phone: form.phone,
        address: form.address,
        emergencyContact: form.emergencyContact,
        bio: form.bio,
        photoUrl: form.photoUrl,
        avatarUrl: form.photoUrl,
        updatedAt: new Date().toISOString()
      };

      // 1. Update user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, updates);

      // 2. Update student record if student doc exists
      const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
      const studentIdNumber = studentRecord?.studentId || currentUser?.studentId;

      if (studentIdNumber) {
        const q = query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId),
          where('studentId', '==', studentIdNumber)
        );
        const snap = await getDocs(q);
        snap.forEach(async (d) => {
          await updateDoc(doc(db, 'students', d.id), updates);
        });
      }

      showToast("Personal profile updated successfully!", "success");
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error("Error saving profile:", err);
      showToast("Failed to save profile updates", "error");
    } finally {
      setSaving(false);
    }
  };

  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const fullName = studentRecord?.fullName || currentUser?.fullName || currentUser?.name || 'Student';
  const className = studentRecord?.className || currentUser?.className || '';
  const dob = studentRecord?.dob || currentUser?.dob || '';
  const gender = studentRecord?.gender || currentUser?.gender || 'Not Specified';
  const parentName = studentRecord?.parentName || studentRecord?.parentInfo || currentUser?.parentName || '';
  const parentPhone = studentRecord?.parentPhone || '';

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div 
        className="p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border"
        style={{
          backgroundColor: primaryColor || '#002147',
          borderColor: 'rgba(255,255,255,0.15)'
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <User className="w-8 h-8 text-amber-300" />
            <h1 className="text-2xl font-black tracking-tight">Student Profile Portal</h1>
          </div>
          <p className="text-slate-200 text-xs mt-1">
            Official student record & identity management.
          </p>
        </div>

        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-full text-xs font-black uppercase tracking-wider">
          Official Student File
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: AVATAR & READ-ONLY ADMIN DATA */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 text-center">
          
          <div className="flex justify-center">
            <ProfilePhotoUploader
              currentPhotoUrl={form.photoUrl}
              displayName={fullName}
              subtitle={`Student ID: ${studentIdNumber}`}
              shape="rounded"
              size="lg"
              onUpload={async (file, onProgress) => {
                const activeSchoolId = schoolId || currentUser?.schoolId || studentRecord?.schoolId;
                const entityKey = studentIdNumber || currentUser?.uid || 'student';
                const url = await uploadProfilePhoto(activeSchoolId, 'students', entityKey, file, onProgress);
                setForm(prev => ({ ...prev, photoUrl: url }));
                const studentDocId = studentRecord?.id || currentUser?.id;
                await updateStudentProfilePhoto(activeSchoolId, studentDocId, studentIdNumber, url, {
                  email: currentUser?.email,
                  name: fullName
                });
                showToast("Official student passport photo updated!", "success");
                onProfileUpdated?.();
                return url;
              }}
              onRemove={async () => {
                const activeSchoolId = schoolId || currentUser?.schoolId || studentRecord?.schoolId;
                setForm(prev => ({ ...prev, photoUrl: '' }));
                const studentDocId = studentRecord?.id || currentUser?.id;
                await updateStudentProfilePhoto(activeSchoolId, studentDocId, studentIdNumber, '', {
                  email: currentUser?.email,
                  name: fullName
                });
                showToast("Photo removed", "info");
                onProfileUpdated?.();
              }}
            />
          </div>

          <div>
            <h2 className="text-lg font-black text-[#002147]">{fullName}</h2>
            <p className="text-xs font-mono font-bold text-amber-600">ID: {studentIdNumber}</p>
            <p className="text-xs text-slate-500 mt-1">{schoolName || currentUser.schoolName || 'EDUkenZA Academy'}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-left space-y-3 text-xs">
            
            <div className="flex items-center gap-2.5 text-slate-700">
              <GraduationCap className="w-4 h-4 text-[#002147] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Enrolled Class</span>
                <span className="font-bold text-[#002147]">{className}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-[#002147] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Date of Birth</span>
                <span className="font-medium">{dob}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <User className="w-4 h-4 text-[#002147] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Gender</span>
                <span className="font-medium">{gender}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Heart className="w-4 h-4 text-[#002147] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Parent / Guardian</span>
                <span className="font-medium">{parentName} {parentPhone !== 'N/A' ? `(${parentPhone})` : ''}</span>
              </div>
            </div>

          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 text-left flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Administrative records (Full Name, DOB, Gender, Assigned Class) are managed strictly by School Administration.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: PERMITTED EDITABLE DETAILS FORM */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-[#002147]">Editable Personal Information</h2>
            <p className="text-xs text-slate-500">Keep your contact number, home address, and emergency contacts updated.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Personal Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. +27 82 123 4567"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Emergency Contact Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. +27 83 999 8888 (Parent/Guardian)"
                    value={form.emergencyContact}
                    onChange={e => setForm({ ...form, emergencyContact: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Home Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  placeholder="Street address, suburb, city, postal code..."
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Bio / Personal Statement</label>
              <textarea
                rows={3}
                placeholder="Brief summary of your academic interests and career goals..."
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#D4AF37]" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* DATA PRIVACY & DOWNLOAD PERSONAL DATA */}
      <PersonalDataExportCard
        currentUser={currentUser}
        customTitle="Download Student Personal Data"
        customDescription="Export a machine-readable JSON file of your official student record, attendance history, academic marks, emergency contacts, and account security data."
      />

    </div>
  );
};
