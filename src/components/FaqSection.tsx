import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarketing } from '../context/MarketingContext';
import { 
  ChevronDown, 
  HelpCircle, 
  MessageCircle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export const FaqSection: React.FC = () => {
  const { setActiveModal } = useAuth();
  const { marketingContent } = useMarketing();
  const { faq } = marketingContent;
  const shouldReduceMotion = useReducedMotion();
  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (faq?.enabled === false) return null;

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? '' : id));
  };

  const faqItems = faq.items || [];

  const filteredFaqs = faqItems.filter((item) =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-16 bg-slate-50 text-slate-900 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="scroll-reveal text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            {faq.badgeText || 'Frequently Asked Questions'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            {faq.title}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            {faq.subtitle}
          </p>

          {/* FAQ Search bar */}
          <div className="pt-4 max-w-md mx-auto relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search questions (e.g., parents, security, fees)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-animated w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147] shadow-sm transition-all"
            />
          </div>

        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faqItem, idx) => {
            const isOpen = openFaqId === faqItem.id;
            const stagger = idx % 2 === 0 ? '' : 'delay-75';

            return (
              <div
                key={faqItem.id}
                className={`scroll-reveal ${stagger} border rounded-xl transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white border-[#002147] shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleFaq(faqItem.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-[#002147] flex items-center gap-2.5">
                    <HelpCircle className="w-5 h-5 text-[#D4AF37] shrink-0" />
                    <span>{faqItem.question}</span>
                  </span>
                  <div className={`p-1.5 rounded bg-slate-100 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#002147] bg-[#002147]/10' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="animate-fade-in-down overflow-hidden border-t border-slate-100 bg-slate-50/50">
                    <div className="px-5 pb-5 pt-3 text-xs text-slate-600 leading-relaxed">
                      <p>{faqItem.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Help Callout */}
        <div className="scroll-reveal delay-150 card-hover-lift mt-12 text-center bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
          <h3 className="text-base font-bold text-[#002147]">Have a specific question not listed here?</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our education support specialists are available 24/7 to help onboard your school team.
          </p>
          <button
            onClick={() => setActiveModal('contact')}
            className="btn-interactive px-5 py-2.5 rounded bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 mx-auto cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>Contact EDUkenZA Support Team</span>
          </button>
        </div>

      </div>
    </section>
  );
};
