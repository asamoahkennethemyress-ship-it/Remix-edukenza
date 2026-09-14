import { FeatureItem, PricingPlan, FaqItem } from '../types';

export const CORE_FEATURES: FeatureItem[] = [
  {
    id: 'student-mgmt',
    title: 'Student Management',
    description: 'Centralized student records, enrollment tracking, medical logs, guardian relations, and academic history.',
    iconName: 'GraduationCap',
    category: 'Administration',
    benefits: ['Comprehensive student profiles', 'Digital admission forms', 'Batch enrollment processing']
  },
  {
    id: 'teacher-mgmt',
    title: 'Teacher Management',
    description: 'Manage staff profiles, subject allocations, class schedules, work logs, and performance evaluations.',
    iconName: 'UserCheck',
    category: 'Administration',
    benefits: ['Subject assignment matrix', 'Staff attendance & leave tracking', 'Payroll integration ready']
  },
  {
    id: 'parent-portal',
    title: 'Parent Portal',
    description: 'Empower parents with real-time access to child attendance, report cards, school notices, and fees.',
    iconName: 'Users',
    category: 'Portals',
    benefits: ['Multi-child single login', 'Instant SMS & push alerts', 'Direct teacher messaging']
  },
  {
    id: 'attendance-tracking',
    title: 'Attendance Tracking',
    description: 'Digital roll call for daily classes with automated SMS alerts to parents when students are absent.',
    iconName: 'CalendarCheck',
    category: 'Academics',
    benefits: ['Biometric & QR scan compatible', 'Real-time parent absence alerts', 'Monthly attendance percentage trends']
  },
  {
    id: 'exams-results',
    title: 'Exams and Results',
    description: 'Automated grade calculation, custom report card generation, class rankings, and academic trend analysis.',
    iconName: 'Award',
    category: 'Academics',
    benefits: ['Weighted term GPA calculations', 'One-click PDF report cards', 'Performance analytics by subject']
  },
  {
    id: 'fees-payments',
    title: 'Fees and Payments',
    description: 'Online tuition payment collection, automated invoice generation, payment receipts, and balance reminders.',
    iconName: 'CreditCard',
    category: 'Administration',
    benefits: ['Multiple online gateway options', 'Automated tuition reminder alerts', 'Audit-ready financial logs']
  },
  {
    id: 'timetable-mgmt',
    title: 'Timetable Management',
    description: 'Smart collision-free class schedule generator for rooms, teachers, subjects, and exam dates.',
    iconName: 'Clock',
    category: 'Academics',
    benefits: ['Conflict-free auto generator', 'Teacher substitute mapping', 'Exportable printable PDF schedules']
  },
  {
    id: 'assignments',
    title: 'Assignments',
    description: 'Teachers upload homework and study resources, while students submit solutions digitally before deadlines.',
    iconName: 'FileText',
    category: 'Academics',
    benefits: ['Digital document submissions', 'Rubric-based feedback', 'Deadline reminder notifications']
  },
  {
    id: 'reports-analytics',
    title: 'Reports and Analytics',
    description: 'Actionable institutional metrics on enrollment trends, financial revenue, staff efficiency, and pass rates.',
    iconName: 'BarChart3',
    category: 'Analytics',
    benefits: ['Custom executive dashboards', 'Ministry/board export compliance', 'Visual charts and PDF exports']
  },
  {
    id: 'ai-learning-assistant',
    title: 'AI Learning Assistant',
    description: 'Integrated Gemini-powered tutor providing 24/7 personalized study guidance, lesson planning, and instant Q&A.',
    iconName: 'Sparkles',
    category: 'AI Technology',
    benefits: ['Instant 24/7 homework helper', 'Teacher lesson plan auto-generator', 'Multilingual student explanations']
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    tagline: 'Experience complete multi-school control with zero risk.',
    priceMonthly: 0,
    priceAnnual: 0,
    features: [
      '30 days full platform access',
      'Basic school management features',
      'Up to 150 student profiles',
      'Teacher & Parent portals',
      'Attendance tracking & Report cards',
      'Community email support'
    ],
    ctaText: 'Start Free Trial'
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    tagline: 'Ideal for small primary & preparatory schools.',
    priceMonthly: 49,
    priceAnnual: 39,
    features: [
      'Up to 500 student profiles',
      'Full Student & Teacher management',
      'Parent & Student portals',
      'Attendance & Exam Gradebook',
      'Basic fee tracking & digital receipts',
      'Standard email & chat support'
    ],
    ctaText: 'Choose Basic Plan'
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    tagline: 'Designed for growing secondary & academy schools.',
    priceMonthly: 129,
    priceAnnual: 99,
    popular: true,
    features: [
      'Up to 2,000 student profiles',
      'All Basic Plan capabilities',
      'AI Learning Assistant for students & staff',
      'Automated Timetable generator',
      'Online fee payment portal integration',
      'Advanced reports & custom analytics',
      'Priority 24/7 dedicated support'
    ],
    ctaText: 'Get Started Now'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    tagline: 'Tailored for large school networks & multi-campus boards.',
    priceMonthly: 299,
    priceAnnual: 249,
    features: [
      'Unlimited student profiles & campuses',
      'Multi-school network administrative view',
      'Custom branding & white-label URL options',
      'Dedicated cloud server instance',
      'Custom API & SIS system integration',
      'SLA agreement & dedicated account manager'
    ],
    ctaText: 'Contact Enterprise Sales'
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: 'Step 1',
    number: '01',
    title: 'School Registers on EDUkenZA',
    description: 'Fill out the quick school registration form in 2 minutes to provision your institution\'s secure cloud environment.',
    icon: 'School'
  },
  {
    step: 'Step 2',
    number: '02',
    title: 'Admin Sets Up the School',
    description: 'Configure academic terms, grade levels, fee structures, and upload staff & student master lists effortlessly.',
    icon: 'Sliders'
  },
  {
    step: 'Step 3',
    number: '03',
    title: 'Teachers, Students & Parents Join',
    description: 'Automated invitations allow staff, students, and parents to access their personalized web & mobile portals.',
    icon: 'UserPlus'
  },
  {
    step: 'Step 4',
    number: '04',
    title: 'School Manages Everything From One Platform',
    description: 'Track attendance, publish exam results, collect fees, send broadcast notices, and monitor performance seamlessly.',
    icon: 'CheckCircle2'
  }
];

export const KEY_BENEFITS = [
  {
    title: 'Save Administrative Time',
    description: 'Automate tedious manual paper roll calls, grade aggregations, and fee accounting to free up 15+ staff hours weekly.',
    metric: '75%',
    metricLabel: 'Less Paperwork'
  },
  {
    title: 'Improve Communication',
    description: 'Bridge the gap between home and school with instant SMS notifications, direct teacher messaging, and digital circulars.',
    metric: '98%',
    metricLabel: 'Parent Engagement'
  },
  {
    title: 'Better Student Performance Tracking',
    description: 'Spot early warning academic trends, track attendance habits, and deploy targeted AI tutoring interventions.',
    metric: '3.5x',
    metricLabel: 'Faster Academic Review'
  },
  {
    title: 'Secure Cloud-Based Records',
    description: 'Enterprise-grade encryption and automated daily cloud backups ensure student records are safe and accessible 24/7.',
    metric: '99.9%',
    metricLabel: 'Uptime SLA'
  },
  {
    title: 'Easy Reporting',
    description: 'Generate compliance-ready report cards, financial audits, and ministry submissions in a single click.',
    metric: '1-Click',
    metricLabel: 'PDF Exports'
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What is EDUkenZA?',
    answer: 'EDUkenZA is a complete cloud-based multi-school management SaaS platform that unites students, teachers, parents, and school administrators in one unified ecosystem. It manages academics, admissions, attendance, fees, exams, timetables, and communication.',
    category: 'General'
  },
  {
    id: 'faq-2',
    question: 'How do schools register?',
    answer: 'School administrators can click "Start Free Trial" or "Create School Account" on our platform, enter their institution details and administrator information, and gain instant access to set up their school environment without needing a credit card.',
    category: 'Registration'
  },
  {
    id: 'faq-3',
    question: 'Can parents access student information?',
    answer: 'Yes! Parents receive secure credentials to log in to the dedicated Parent Portal from any smartphone or computer. They can view real-time attendance, test grades, fee statements, report cards, and send direct messages to teachers.',
    category: 'Portals'
  },
  {
    id: 'faq-4',
    question: 'Is data secure?',
    answer: 'Security is our highest priority. EDUkenZA uses enterprise-grade cloud encryption (in transit and at rest), strict Role-Based Access Control (RBAC), isolated multi-tenant database partitions, and automated daily backups to guarantee privacy and protection.',
    category: 'Security'
  },
  {
    id: 'faq-5',
    question: 'Can EDUkenZA handle multiple branches or school networks?',
    answer: 'Absolutely. The Platform Owner and Enterprise plans support multi-campus networks, enabling group directors to manage multiple school branches from a single unified master dashboard.',
    category: 'Enterprise'
  }
];
