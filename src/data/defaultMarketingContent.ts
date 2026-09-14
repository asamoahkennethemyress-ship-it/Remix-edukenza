import { MarketingSiteData } from '../types/marketing';
import { CORE_FEATURES, PRICING_PLANS, FAQ_ITEMS } from './landingData';

export const DEFAULT_MARKETING_CONTENT: MarketingSiteData = {
  websiteName: 'EDUkenZA',
  branding: {
    logoUrl: '',
    logoAlt: 'EDUkenZA Enterprise SaaS Logo',
    faviconUrl: '',
    primaryColor: '#002147',
    secondaryColor: '#D4AF37',
  },
  hero: {
    headline: 'Empowering Schools With Smarter Management',
    subtitle: 'EDUkenZA brings students, teachers, parents, and administrators together in one powerful multi-school SaaS platform for the modern education era.',
    heroImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    primaryCtaText: 'Explore Features',
    secondaryCtaText: 'Login Portal',
    badgeText: 'Next-Gen Multi-School SaaS Architecture',
    enabled: true,
  },
  about: {
    title: 'Next-Gen Multi-School SaaS Architecture',
    subtitle: 'Engineered for educational institutions across Africa and worldwide.',
    description: 'EDUkenZA was built from the ground up to empower African and global educational institutions. From kindergarten to secondary schools, high schools, and multi-campus academy networks, our cloud infrastructure guarantees enterprise data security, 99.9% uptime, and frictionless collaboration between teachers, parents, and administrative leadership.',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80',
    highlights: [
      'Engineered for single-campus schools & multi-campus institutional boards',
      'Strict multi-tenant security partition ensuring zero cross-school data leaks',
      'Unified cloud ecosystem uniting students, teachers, parents, and admins',
      'Offline-first synchronization layer resilient to internet interruptions'
    ],
    badgeText: 'About EDUkenZA',
    enabled: true,
  },
  features: {
    title: 'Everything Your School Needs In One SaaS Platform',
    subtitle: 'EDUkenZA replaces fragmented legacy spreadsheets and disconnected software with a unified, cloud-native school management solution.',
    badgeText: 'Comprehensive SaaS Modules',
    items: CORE_FEATURES,
    enabled: true,
  },
  benefits: {
    title: 'Why Schools Choose EDUkenZA',
    subtitle: 'Engineered to remove operational bottlenecks, improve parent trust, and boost student academic outcomes.',
    badgeText: 'Institutional Growth & Efficiency',
    items: [
      {
        id: 'ben-1',
        title: 'Save Administrative Time',
        description: 'Automate tedious manual paper roll calls, grade aggregations, and fee accounting to free up 15+ staff hours weekly.',
        metric: '75%',
        metricLabel: 'Less Paperwork',
        iconName: 'Clock'
      },
      {
        id: 'ben-2',
        title: 'Improve Parent Communication',
        description: 'Bridge the gap between home and school with instant SMS notifications, direct teacher messaging, and digital circulars.',
        metric: '98%',
        metricLabel: 'Parent Engagement',
        iconName: 'MessageSquare'
      },
      {
        id: 'ben-3',
        title: 'Better Student Performance Tracking',
        description: 'Spot early warning academic trends, track attendance habits, and deploy targeted AI tutoring interventions.',
        metric: '3.5x',
        metricLabel: 'Faster Academic Review',
        iconName: 'TrendingUp'
      },
      {
        id: 'ben-4',
        title: 'Secure Cloud-Based Records',
        description: 'Enterprise-grade encryption and automated daily cloud backups ensure student records are safe and accessible 24/7.',
        metric: '99.9%',
        metricLabel: 'Uptime SLA',
        iconName: 'ShieldCheck'
      },
      {
        id: 'ben-5',
        title: 'Easy 1-Click Reporting',
        description: 'Generate compliance-ready report cards, financial audits, and ministry submissions in a single click.',
        metric: '1-Click',
        metricLabel: 'PDF Exports',
        iconName: 'FileCheck'
      }
    ],
    enabled: true,
  },
  teacherSection: {
    title: 'Empowering Educators With Powerful Classroom Tools',
    subtitle: 'Simplify daily teaching workflows, grading, and parent communications.',
    description: 'Teachers manage gradebooks, lesson plans, class attendance, homework distributions, and parent inquiries from a dedicated portal designed for fast daily execution without administrative clutter.',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1000&auto=format&fit=crop&q=80',
    highlights: [
      'Digital gradebook with weighted GPA calculation and instant exam entry',
      'One-click daily classroom attendance with automated absence alerts',
      'Gemini AI Lesson Plan generator and automated rubric creator',
      'Direct parent messaging and classroom notice broadcasting'
    ],
    badgeText: 'Teacher Portal Showcase',
    enabled: true,
  },
  studentSection: {
    title: 'Inspiring Academic Excellence in Every Learner',
    subtitle: 'A centralized digital hub for schedules, assignments, grades, and tutoring.',
    description: 'Students access digital timetables, submit homework assignments digitally, track term grades, and study with our built-in 24/7 Gemini AI academic tutor tailored to their school curriculum.',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1000&auto=format&fit=crop&q=80',
    highlights: [
      'Collision-free digital timetables and subject room allocations',
      'Digital homework submissions with teacher rubric evaluations',
      '24/7 Gemini AI Tutor for instant homework explanations and study notes',
      'Interactive term report cards and historical performance tracking'
    ],
    badgeText: 'Student Portal Showcase',
    enabled: true,
  },
  parentSection: {
    title: 'Keeping Parents Connected to Student Progress',
    subtitle: 'Real-time visibility into attendance, exam marks, and tuition payments.',
    description: 'Parents enjoy total peace of mind with instant attendance alerts, digital report cards, mobile fee payment tracking with downloadable digital receipts, and direct teacher communication.',
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1000&auto=format&fit=crop&q=80',
    highlights: [
      'Instant notifications and SMS alerts when your child arrives or is absent',
      'Mobile tuition payments with MTN MoMo, Vodafone Cash, and digital receipts',
      'Direct messaging channels with homeroom and subject teachers',
      'Unified single login supporting multiple children across different classes'
    ],
    badgeText: 'Parent Network Showcase',
    enabled: true,
  },
  aiSection: {
    title: 'Gemini AI Intelligence Built Into Every Classroom',
    subtitle: 'Cutting-edge artificial intelligence assisting educators and inspiring students.',
    description: 'Harness the power of Google DeepMind Gemini models right within EDUkenZA: automated multilingual lesson planning, instant exam question generation, and 24/7 conversational tutoring for students.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    highlights: [
      '24/7 Conversational AI Tutor assisting students with difficult concepts',
      'Curriculum-aligned teacher lesson plan generator saving 5+ hours weekly',
      'Automated quiz and exam question generation with full rubric keys',
      'Strict educational guardrails ensuring safe, pedagogical AI assistance'
    ],
    capabilities: [
      '24/7 Conversational AI Tutor assisting students with difficult concepts',
      'Curriculum-aligned teacher lesson plan generator saving 5+ hours weekly',
      'Automated quiz and exam question generation with full rubric keys',
      'Strict educational guardrails ensuring safe, pedagogical AI assistance'
    ],
    badgeText: 'AI-Powered Education',
    enabled: true,
  },
  realtimeSection: {
    title: 'Real-Time School Management at Enterprise Scale',
    subtitle: 'Zero latency synchronization across web, mobile, and administrative dashboards.',
    description: 'All records update across classrooms, school offices, and parent devices with instantaneous synchronization. Seamless offline caching ensures continuous school operations even during internet dropouts.',
    metrics: [
      { label: 'Sync Latency', value: '< 150ms', desc: 'Instant multi-device updates' },
      { label: 'Platform SLA', value: '99.9%', desc: 'Cloud infrastructure reliability' },
      { label: 'Offline Resilience', value: '100%', desc: 'Local cache with auto-sync' },
      { label: 'Data Encryption', value: 'AES-256', desc: 'Encrypted storage and transit' }
    ],
    badgeText: 'Real-Time Operations',
    enabled: true,
  },
  securitySection: {
    title: 'Enterprise-Grade Security & Multi-Tenant Isolation',
    subtitle: 'Strict role-based access control protecting school and student records.',
    description: 'Every educational institution is strictly isolated in its own partition. School A can never access School B records. Authoritative Firestore and Firebase Storage rules guarantee tamper-proof security at every layer.',
    badges: [
      'Strict Multi-Tenant Isolation (No cross-school data visibility)',
      'Role-Based Access Control (RBAC) enforced at database rule layer',
      'Protected Firebase Storage for student passport photos, logos, and IDs',
      'Comprehensive audit logging for tuition payments and grade entries'
    ],
    badgeText: 'Security Architecture',
    enabled: true,
  },
  pricing: {
    title: 'Transparent & Flexible Pricing Plans',
    subtitle: 'Choose a subscription plan tailored to your school\'s size and operational needs. Upgrade, downgrade, or cancel anytime.',
    badgeText: 'Institutional Subscriptions',
    plans: PRICING_PLANS,
    enabled: true,
  },
  testimonials: {
    title: 'Trusted By Leading School Leaders',
    subtitle: 'Hear from real principals, administrators, and teachers who transformed their educational institutions with EDUkenZA.',
    badgeText: 'Verified Institutional Reviews',
    items: [
      {
        id: 'test-1',
        name: 'Dr. Sarah Ndlovu',
        role: 'Principal',
        schoolName: 'ARISING START Academy',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        content: 'EDUkenZA transformed our administrative efficiency. Grading, report cards, and parent notifications now take minutes instead of weeks!',
        rating: 5,
      },
      {
        id: 'test-2',
        name: 'Kofi Mensah',
        role: 'IT & Operations Director',
        schoolName: 'Accra Preparatory Network',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        content: 'Managing 3 campuses simultaneously was a nightmare until we deployed EDUkenZA. The multi-school architecture is phenomenal.',
        rating: 5,
      },
      {
        id: 'test-3',
        name: 'Grace Osei',
        role: 'Head Teacher',
        schoolName: 'Horizon High School',
        avatarUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200&auto=format&fit=crop&q=80',
        content: 'The Gemini AI Tutor integration gives our teachers lesson planning tools and helps students get instant homework assistance 24/7.',
        rating: 5,
      }
    ],
    enabled: true,
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Got questions? We have answers. Learn how EDUkenZA can streamline your school.',
    badgeText: 'Answers & Support',
    items: FAQ_ITEMS,
    enabled: true,
  },
  contactInfo: {
    email: 'support@edukenza.com',
    phone: '+27 (0) 11 980 4000 / +254 20 700 8000',
    address: 'Johannesburg • Nairobi • Global Cloud Hosting',
    supportHours: 'Mon - Fri: 8:00 AM - 6:00 PM GMT / EAT',
    emergencyHotline: '+27 (0) 11 980 4099 (24/7 Critical Helpline)',
    socialMedia: {
      facebook: 'https://facebook.com/edukenza',
      twitter: 'https://twitter.com/edukenza',
      linkedin: 'https://linkedin.com/company/edukenza',
      instagram: 'https://instagram.com/edukenza',
      youtube: 'https://youtube.com/@edukenza',
      github: 'https://github.com/edukenza',
    },
  },
  footer: {
    copyrightText: '© 2026 EDUkenZA SaaS Platform. All rights reserved.',
    disclaimer: 'EDUkenZA is an enterprise multi-school cloud management SaaS platform. All institutional records are protected under international data privacy standards.',
    quickLinks: [
      { id: 'ql-1', name: 'Home', url: 'home' },
      { id: 'ql-2', name: 'Features', url: 'features' },
      { id: 'ql-3', name: 'How It Works', url: 'how-it-works' },
      { id: 'ql-4', name: 'Benefits', url: 'benefits' },
      { id: 'ql-5', name: 'Pricing', url: 'pricing' },
      { id: 'ql-6', name: 'FAQ', url: 'faq' },
    ],
    privacyPolicyUrl: 'privacy',
    termsOfServiceUrl: 'terms',
  },
  navigation: {
    items: [
      { id: 'nav-home', label: 'Home', view: 'home', order: 1, enabled: true },
      { id: 'nav-features', label: 'Features', view: 'features', order: 2, enabled: true },
      { id: 'nav-how-it-works', label: 'How It Works', view: 'how-it-works', order: 3, enabled: true },
      { id: 'nav-benefits', label: 'Benefits', view: 'benefits', order: 4, enabled: true },
      { id: 'nav-pricing', label: 'Pricing', view: 'pricing', order: 5, enabled: true },
      { id: 'nav-faq', label: 'FAQ', view: 'faq', order: 6, enabled: true },
    ]
  },
  publishing: {
    status: 'published',
    publishedAt: new Date().toISOString(),
    draftSavedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};
