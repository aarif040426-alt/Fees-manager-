export type Board = 'SSC' | 'ICSE' | 'CBSE' | 'Other';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';
export type PaymentMethod = 'Cash' | 'Online';
export type SubscriptionPlan = 'Free' | 'Pro' | 'Enterprise';
export type Theme = 'light' | 'dark' | 'blue' | 'purple';

export interface Teacher {
  uid: string;
  name: string | null;
  email: string | null;
  mobile?: string;
  role: 'admin' | 'teacher';
  plan: SubscriptionPlan;
  planStartDate: string;
  theme: Theme;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    paymentReminders: boolean;
  };
  createdAt: string;
}

export interface Student {
  id: string;
  teacherId: string;
  name: string;
  parentName?: string;
  mobile?: string;
  board: Board;
  standard?: string;
  feeAmount: number;
  joiningDate?: string;
}

export interface Payment {
  id: string;
  teacherId: string;
  studentId: string;
  month: string; // YYYY-MM
  amount?: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  paidAt?: string;
}
