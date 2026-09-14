import { fetchSchoolSubscription } from '../services/billingService';
import { SchoolSubscription } from '../types/billing';

export interface PlanLimitCheckResult {
  allowed: boolean;
  limitName: 'students' | 'teachers' | 'parents' | 'classes' | 'storage' | 'ai';
  currentCount: number;
  maxLimit: number; // -1 or 0 for unlimited
  message: string;
}

/**
 * Checks if a school is allowed to create a new record (student, teacher, class, etc.) based on active subscription limits
 */
export async function verifySchoolPlanLimit(
  schoolId: string,
  limitType: 'students' | 'teachers' | 'parents' | 'classes' | 'storage' | 'ai',
  currentCount: number,
  additionalCount: number = 1
): Promise<PlanLimitCheckResult> {
  if (!schoolId || schoolId === 'global' || schoolId === 'global_edukenza') {
    return {
      allowed: true,
      limitName: limitType,
      currentCount,
      maxLimit: -1,
      message: 'Global Platform Admin bypass'
    };
  }

  const subscription = await fetchSchoolSubscription(schoolId);

  // Default fallback if no subscription record found
  if (!subscription) {
    return {
      allowed: true, // Default allow during setup
      limitName: limitType,
      currentCount,
      maxLimit: 150,
      message: 'Trial Starter Plan Limits'
    };
  }

  // If subscription is expired or suspended
  if (subscription.status === 'expired' || subscription.status === 'suspended') {
    return {
      allowed: false,
      limitName: limitType,
      currentCount,
      maxLimit: 0,
      message: `Your school subscription is currently ${subscription.status.toUpperCase()}. Please renew your plan to continue adding records.`
    };
  }

  let maxLimit = -1;
  let label = limitType.charAt(0).toUpperCase() + limitType.slice(1);

  switch (limitType) {
    case 'students':
      maxLimit = subscription.maxStudents;
      break;
    case 'teachers':
      maxLimit = subscription.maxTeachers;
      break;
    case 'parents':
      maxLimit = subscription.maxParents;
      break;
    case 'classes':
      maxLimit = subscription.maxClasses;
      break;
    case 'storage':
      maxLimit = subscription.maxStorageGB;
      break;
    case 'ai':
      if (!subscription.aiFeaturesEnabled) {
        return {
          allowed: false,
          limitName: 'ai',
          currentCount,
          maxLimit: 0,
          message: `AI Features are disabled on your current "${subscription.planName}" plan. Please upgrade to Standard or Professional plan.`
        };
      }
      return { allowed: true, limitName: 'ai', currentCount, maxLimit: -1, message: 'AI features enabled' };
  }

  // -1 or 0 means unlimited
  if (maxLimit <= -1 || maxLimit === 0) {
    return {
      allowed: true,
      limitName: limitType,
      currentCount,
      maxLimit,
      message: `Unlimited ${label} allowed on ${subscription.planName} plan.`
    };
  }

  const nextTotal = currentCount + additionalCount;

  if (nextTotal > maxLimit) {
    return {
      allowed: false,
      limitName: limitType,
      currentCount,
      maxLimit,
      message: `Plan Limit Exceeded! Your current ${subscription.planName} plan allows a maximum of ${maxLimit} ${label}. You currently have ${currentCount}. Upgrade your subscription plan to add more.`
    };
  }

  return {
    allowed: true,
    limitName: limitType,
    currentCount,
    maxLimit,
    message: `${nextTotal} of ${maxLimit} ${label} used.`
  };
}
