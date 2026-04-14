import { SubscriptionPlan } from './types';

export interface PlanLimit {
  maxStudents: number;
  features: {
    whatsappNotifications: boolean;
    advancedReports: boolean;
    prioritySupport: boolean;
    exportData: boolean;
  };
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimit> = {
  Free: {
    maxStudents: 1,
    features: {
      whatsappNotifications: false,
      advancedReports: false,
      prioritySupport: false,
      exportData: false,
    },
  },
  Pro: {
    maxStudents: 5,
    features: {
      whatsappNotifications: true,
      advancedReports: true,
      prioritySupport: false,
      exportData: true,
    },
  },
  Enterprise: {
    maxStudents: 10,
    features: {
      whatsappNotifications: true,
      advancedReports: true,
      prioritySupport: true,
      exportData: true,
    },
  },
};
