import { FeatureItem, PricingPlan, FaqItem } from './index';

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  schoolName: string;
  avatarUrl?: string;
  content: string;
  rating: number;
}

export interface QuickLinkItem {
  id: string;
  name: string;
  url: string;
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  view: string;
  order: number;
  enabled: boolean;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  iconName?: string;
}

export interface HeroSectionContent {
  headline: string;
  subtitle: string;
  heroImageUrl: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  badgeText?: string;
  enabled?: boolean;
}

export interface FeaturesSectionContent {
  title: string;
  subtitle: string;
  badgeText?: string;
  items: FeatureItem[];
  enabled?: boolean;
}

export interface BenefitsSectionContent {
  title: string;
  subtitle: string;
  badgeText?: string;
  items: BenefitItem[];
  enabled?: boolean;
}

export interface AboutSectionContent {
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  highlights?: string[];
  enabled?: boolean;
  badgeText?: string;
}

export interface SectionShowcaseContent {
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  highlights: string[];
  capabilities?: string[];
  enabled?: boolean;
  badgeText?: string;
}

export interface RealtimeMetric {
  label: string;
  value: string;
  desc: string;
}

export interface RealtimeSectionContent {
  title: string;
  subtitle: string;
  description: string;
  metrics: RealtimeMetric[];
  enabled?: boolean;
  badgeText?: string;
}

export interface SecuritySectionContent {
  title: string;
  subtitle: string;
  description: string;
  badges: string[];
  enabled?: boolean;
  badgeText?: string;
}

export interface PricingSectionContent {
  title: string;
  subtitle: string;
  badgeText?: string;
  plans: PricingPlan[];
  enabled?: boolean;
}

export interface TestimonialsSectionContent {
  title: string;
  subtitle: string;
  badgeText?: string;
  items: TestimonialItem[];
  enabled?: boolean;
}

export interface FaqSectionContent {
  title: string;
  subtitle: string;
  badgeText?: string;
  items: FaqItem[];
  enabled?: boolean;
}

export interface ContactInfoContent {
  email: string;
  phone: string;
  address: string;
  supportHours?: string;
  emergencyHotline?: string;
  socialMedia: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
    youtube?: string;
    github?: string;
  };
}

export interface FooterContent {
  copyrightText: string;
  disclaimer?: string;
  quickLinks: QuickLinkItem[];
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export interface BrandingContent {
  logoUrl: string;
  logoAlt?: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface PublishingMetadata {
  status: 'draft' | 'published';
  publishedAt?: string;
  draftSavedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MarketingSiteData {
  websiteName: string;
  hero: HeroSectionContent;
  about: AboutSectionContent;
  features: FeaturesSectionContent;
  benefits: BenefitsSectionContent;
  teacherSection: SectionShowcaseContent;
  studentSection: SectionShowcaseContent;
  parentSection: SectionShowcaseContent;
  aiSection: SectionShowcaseContent;
  realtimeSection: RealtimeSectionContent;
  securitySection: SecuritySectionContent;
  pricing: PricingSectionContent;
  testimonials: TestimonialsSectionContent;
  faq: FaqSectionContent;
  contactInfo: ContactInfoContent;
  footer: FooterContent;
  branding: BrandingContent;
  navigation: {
    items: NavigationMenuItem[];
  };
  publishing?: PublishingMetadata;
  updatedAt?: string;
  updatedBy?: string;
}

