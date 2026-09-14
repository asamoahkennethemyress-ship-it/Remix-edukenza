import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useMarketing } from '../context/MarketingContext';
import { PricingPlanDoc } from '../types';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  Shield, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

export const PricingSection: React.FC = () => {
  const { setActiveModal } = useAuth();
  const { marketingContent } = useMarketing();
  const { pricing } = marketingContent;

  const [activePlans, setActivePlans] = useState<PricingPlanDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  if (pricing?.enabled === false) return null;

  // Real-time subscription to Firestore pricingPlans
  useEffect(() => {
    setLoading(true);
    setError(null);

    const plansRef = collection(db, 'pricingPlans');

    const unsubscribe = onSnapshot(
      plansRef,
      (snapshot) => {
        try {
          const plansList: PricingPlanDoc[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              docId: d.id,
              id: d.id,
              planName: data.planName || 'Unnamed Plan',
              price: data.price !== undefined ? data.price : '0',
              currency: data.currency || '',
              billingPeriod: data.billingPeriod || '/ month',
              description: data.description || '',
              features: Array.isArray(data.features) ? data.features : [],
              buttonText: data.buttonText || 'Select Plan',
              status: data.status || 'active',
              order: typeof data.order === 'number' ? data.order : 1,
              popular: !!data.popular,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
          });

          // Filter only active plans
          const filteredActive = plansList.filter((p) => p.status === 'active');

          // Sort by order ascending
          filteredActive.sort((a, b) => (a.order || 0) - (b.order || 0));

          setActivePlans(filteredActive);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error('[PRICING SECTION] Error parsing pricing plans:', err);
          setError('Unable to load pricing options.');
          setLoading(false);
        }
      },
      (err) => {
        const fsError = handleFirestoreError(err, OperationType.LIST, 'pricingPlans');
        console.warn('[PRICING SECTION] Snapshot error, serving fallback plans:', fsError);
        // Fallback default plans
        setActivePlans([
          {
            docId: 'starter',
            id: 'starter',
            planName: 'Basic / Starter Plan',
            price: '$299',
            currency: 'USD',
            billingPeriod: '/ term',
            description: 'Essential management suite for small schools and nurseries.',
            features: ['Up to 250 Students', 'Core Attendance & Grading', 'CBT Exam Portal', 'Basic Financial Tracking'],
            buttonText: 'Get Started',
            status: 'active',
            order: 1,
            popular: false
          },
          {
            docId: 'pro',
            id: 'pro',
            planName: 'Professional / Standard',
            price: '$599',
            currency: 'USD',
            billingPeriod: '/ term',
            description: 'Full virtual classroom, Google Meet integration, and parent app.',
            features: ['Up to 1,000 Students', 'Live Virtual Classroom & VLE', 'Library & LMS Portal', 'Automated Report Cards', 'Parent & Student App'],
            buttonText: 'Choose Professional',
            status: 'active',
            order: 2,
            popular: true
          },
          {
            docId: 'enterprise',
            id: 'enterprise',
            planName: 'Enterprise / Custom',
            price: 'Custom',
            currency: '',
            billingPeriod: '',
            description: 'Unlimited capacity for multi-campus networks and state boards.',
            features: ['Unlimited Students', 'Multi-Campus Administration', 'Custom Domain & Branding', 'Dedicated Support Account Manager', '24/7 SLA Guarantee'],
            buttonText: 'Contact Sales',
            status: 'active',
            order: 3,
            popular: false
          }
        ]);
        setError(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <section id="pricing" className="py-16 bg-slate-100 text-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            Transparent SaaS Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            {pricing?.title || 'Flexible Plans for Schools of Every Size'}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            {pricing?.subtitle || 'Choose a subscription plan tailored to your institution’s student capacity, academic features, and administrative goals.'}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#002147] mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading Live Pricing Plans...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="max-w-lg mx-auto bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <div className="font-bold uppercase">Pricing Error</div>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && activePlans.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl max-w-lg mx-auto p-8 space-y-3 shadow-sm">
            <p className="text-sm font-bold text-slate-700">No active pricing plans are currently published.</p>
            <p className="text-xs text-slate-500">Please contact our sales team directly for custom institutional quotes.</p>
            <button
              onClick={() => setActiveModal('contact')}
              className="mt-2 px-5 py-2.5 rounded-lg bg-[#002147] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#003366] transition cursor-pointer"
            >
              Contact Sales Team
            </button>
          </div>
        )}

        {/* Pricing Cards Grid */}
        {!loading && !error && activePlans.length > 0 && (
          <div className={`grid grid-cols-1 ${
            activePlans.length === 1 
              ? 'max-w-md mx-auto' 
              : activePlans.length === 2 
                ? 'md:grid-cols-2 max-w-3xl mx-auto' 
                : activePlans.length === 3 
                  ? 'md:grid-cols-3 max-w-5xl mx-auto' 
                  : 'md:grid-cols-2 lg:grid-cols-4'
          } gap-6`}>
            {activePlans.map((plan) => (
              <div
                key={plan.docId || plan.planName}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  plan.popular
                    ? 'bg-[#002147] text-white border-2 border-[#D4AF37] shadow-xl scale-[1.02]'
                    : 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Popular Ribbon */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#002147] px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Most Popular Choice</span>
                  </div>
                )}

                <div className="space-y-5">
                  
                  {/* Plan Name & Description */}
                  <div>
                    <h3 className={`text-xl font-black uppercase tracking-tight ${plan.popular ? 'text-white' : 'text-[#002147]'}`}>
                      {plan.planName}
                    </h3>
                    <p className={`text-xs mt-1.5 leading-relaxed min-h-[36px] ${plan.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className={`py-3.5 border-y ${plan.popular ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black ${plan.popular ? 'text-[#D4AF37]' : 'text-[#002147]'}`}>
                        {plan.currency}{plan.price}
                      </span>
                      <span className={`text-xs font-semibold ${plan.popular ? 'text-slate-300' : 'text-slate-500'}`}>
                        {plan.billingPeriod}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${plan.popular ? 'text-[#D4AF37]' : 'text-[#002147]'}`}>
                      Included Capabilities:
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className={`flex items-start gap-2 text-xs font-medium ${plan.popular ? 'text-slate-200' : 'text-slate-700'}`}>
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-[#D4AF37]' : 'text-emerald-600'}`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* CTA Button */}
                <div className="pt-6">
                  <button
                    onClick={() => setActiveModal('contact')}
                    className={`w-full py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      plan.popular
                        ? 'bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] shadow-md'
                        : 'bg-[#002147] hover:bg-[#003366] text-white shadow-sm'
                    }`}
                  >
                    <span>{plan.buttonText || 'Select Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Security & Guarantee Footer */}
        <div className="mt-12 bg-white border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#002147] shrink-0" />
            <span>Need custom features or a specific payment schedule? We offer custom government & NGO education grants.</span>
          </div>
          <button
            onClick={() => setActiveModal('contact')}
            className="text-[#002147] hover:text-[#003366] font-bold uppercase underline whitespace-nowrap cursor-pointer"
          >
            Speak with an EdTech Advisor &rarr;
          </button>
        </div>

      </div>
    </section>
  );
};
