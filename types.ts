export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer' | 'Cheque' | 'Other';

export interface User {
  id?: number;
  username: string;
  password: string; // Hashed
}

export interface OwnerRecord {
  id?: number;
  businessName: string;
  address: string;
  proprietor: string;
  proprietorPhone?: string;
  proprietorEmail?: string;
  logo?: string; // Base64 string
  themeColor?: string; // Hex color
  reminderDaysBefore?: number; // Days before due date to show reminder
  reminderTemplate?: string; // Message template with placeholders
}

export interface BlockRecord {
  id?: number;
  blockId: string;
  description: string;
  rate: number;
}

export interface TenantRecord {
  id?: number;
  name: string;
  blockNumber: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd: string;
  leaseAmount: number;
  dueDay: number; // Day of the month (1-31)
}

export interface PaymentRecord {
  id?: number;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  blockNumber: string;
  paymentDate: string;
  coverageStart: string;
  coverageEnd: string;
  baseRent: number;
  additionalCharges: number;
  deductions: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  type: 'income';
}

export interface ExpenseRecord {
  id?: number;
  category: string;
  blockNumber?: string;
  date: string;
  amount: number;
  notes: string;
  type: 'expense';
}

export type Transaction = PaymentRecord | ExpenseRecord;

export interface MonthlyStats {
  month: string;
  income: number;
  expenses: number;
  net: number;
}
