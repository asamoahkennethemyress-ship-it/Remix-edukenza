import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RegistrationFormData } from '../types';
import { 
  GraduationCap, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  User, 
  CheckCircle2, 
  Shield, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const RegisterSchoolPage: React.FC = () => {
  const { registerSchool, setActiveView, setActiveModal } = useAuth();

  const [formData, setFormData] = useState<RegistrationFormData>({
    schoolName: '',
    educationCategory: 'BASIC',
    schoolEmail: '',
    phoneNumber: '',
    country: 'Ghana',
    address: '',
    adminName: '',
    agreeToTerms: true,
  });

  const [loading, setLoading] = useState(false);

  const countries = [
    'South Africa',
    'Kenya',
    'Nigeria',
    'Ghana',
    'Uganda',
    'Rwanda',
    'Zimbabwe',
    'Zambia',
    'Tanzania',
    'United Kingdom',
    'United States',
    'Other / International'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await registerSchool(formData);
    setLoading(false);
  };

  return (
    <div className="min-h-[85vh] bg-slate-100 text-slate-900 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="max-w-3xl w-full space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => setActiveView('home')}
            className="inline-flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-md bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md">
              <GraduationCap className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-3xl font-black text-[#002147] tracking-tight uppercase">
              EDU<span className="text-[#D4AF37]">kenZA</span>
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#002147] uppercase">
            Register Your Institution
          </h1>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            Provision your school's isolated cloud environment. Complete 30-day Free Trial with zero credit card requirements.
          </p>
        </div>

        {/* Form Box */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Section 1: School Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#002147]">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-xs font-black uppercase tracking-wider">1. School Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Education Category */}
              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  Select Education Category <span className="text-amber-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, educationCategory: 'BASIC' }))}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      (formData.educationCategory || 'BASIC') === 'BASIC'
                        ? 'border-[#002147] bg-blue-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                      (formData.educationCategory || 'BASIC') === 'BASIC' ? 'border-[#002147]' : 'border-slate-400'
                    }`}>
                      {(formData.educationCategory || 'BASIC') === 'BASIC' && (
                        <div className="w-2 h-2 rounded-full bg-[#002147]" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-xs text-[#002147] uppercase tracking-tight">1. BASIC SCHOOL</div>
                      <div className="text-[11px] text-slate-500 font-medium">Primary / Junior School (School Admin → Teachers → Students)</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, educationCategory: 'SENIOR_HIGH' }))}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      formData.educationCategory === 'SENIOR_HIGH'
                        ? 'border-[#002147] bg-amber-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                      formData.educationCategory === 'SENIOR_HIGH' ? 'border-[#002147]' : 'border-slate-400'
                    }`}>
                      {formData.educationCategory === 'SENIOR_HIGH' && (
                        <div className="w-2 h-2 rounded-full bg-[#002147]" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-xs text-[#002147] uppercase tracking-tight">2. SENIOR HIGH (SHS)</div>
                      <div className="text-[11px] text-slate-500 font-medium">Secondary School (School Head → Academics & Domestic Branches)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  School / Institutional Name <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="schoolName"
                    required
                    placeholder="e.g. ARISING START Academy"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* School Official Email */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  School Official Contact Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="schoolEmail"
                    placeholder="info@school.edu"
                    value={formData.schoolEmail}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="+27 11 458 9000"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  Country <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  School Physical Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <textarea
                    name="address"
                    rows={2}
                    placeholder="124 Academic Drive, Sandton, Johannesburg"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Administrator & Authentication Method */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#002147]">
              <User className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-xs font-black uppercase tracking-wider">2. Primary Administrator Account</h2>
            </div>

            <div className="space-y-4">
              
              {/* Administrator Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-[#002147] uppercase tracking-wider">
                  Administrator Full Name <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="adminName"
                    required
                    placeholder="e.g. Principal Sarah Jenkins"
                    value={formData.adminName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              {/* Google Account Authentication Banner */}
              <div className="p-4 bg-slate-50 border-2 border-[#002147]/20 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">
                      Authentication Method: Google Account
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      School Admin will sign in securely using their verified Google account. No separate EDUkenZA password is created or stored.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              name="agreeToTerms"
              id="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="mt-0.5 w-4 h-4 text-[#002147] bg-white border-slate-300 rounded focus:ring-[#002147] cursor-pointer"
            />
            <label htmlFor="agreeToTerms" className="text-xs text-slate-600 leading-normal">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="text-[#002147] underline font-extrabold cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="text-[#002147] underline font-extrabold cursor-pointer"
              >
                Privacy Policy
              </button>
              . EDUkenZA guarantees 100% data encryption and zero third-party selling.
            </label>
          </div>

          {/* Submit Button with Google Integration */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating with Google...' : 'Continue with Google & Register School'}</span>
          </button>

          <div className="text-center text-xs text-slate-600 font-medium">
            <span>Already have an authorized institutional account? </span>
            <button
              type="button"
              onClick={() => setActiveView('login')}
              className="text-[#002147] hover:underline font-extrabold cursor-pointer ml-1"
            >
              Sign In to Your Portal
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

