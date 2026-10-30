export type DebtType = 'fixed' | 'variable' | 'overdraft' | 'monthly';
export type DebtCategory = 'credit_card' | 'loan' | 'overdraft' | 'monthly_bill' | 'other' | string;
export type PaymentStatus = 'paid' | 'pending';
export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'sporadic';
export type ExpenseCategory = 'housing' | 'food' | 'transport' | 'health' | 'education' | 'utilities' | 'entertainment' | 'other' | string;
export type AIStrategy = 'snowball' | 'avalanche';
export type DailyExpenseCategory = 'alimentacao' | 'transporte' | 'saude' | 'lazer' | 'compras' | 'servicos' | 'outros' | 'educacao' | 'moradia' | string;
export type BudgetCategory = DailyExpenseCategory;

export interface CustomCategory {
  id: string;
  userId: string;
  name: string;
  scope: 'expenses' | 'daily' | 'debts' | 'incomes';
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface User {
  id: string;
  openId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  type: DebtType | string;
  interestRate: number;
  dueDate: string;
  totalInstallments: number;
  paidInstallments: number;
  isActive: boolean;
  isPaid?: boolean;
  paymentDate?: string;
  category?: DebtCategory;
  createdAt: string;
  updatedAt?: string;
}

export interface Income {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  type?: 'fixed' | 'variable';
  category?: string;
  expectedDate?: string;
  isReceived?: boolean;
  recurrenceDate?: string;
  recurrenceDay?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  type?: 'fixed' | 'variable';
  dueDate?: string;
  isPaid?: boolean;
  paymentDate?: string;
  recurrenceDate?: string;
  recurrenceDay?: number;
  cardLimit?: number;
  bank?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentLog {
  id: string;
  userId: string;
  debtId: string;
  debtName?: string;
  amountPaid: number;
  paymentDate: string;
  note?: string;
  createdAt: string;
}

export interface AIPlan {
  id: string;
  userId: string;
  strategy: AIStrategy;
  planContent: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  freeCash: number;
  isActive: boolean;
  createdAt: string;
}

export interface DailyExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: DailyExpenseCategory;
  date: string;
  isScheduled?: boolean;
  type?: 'fixed' | 'variable';
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: BudgetCategory;
  limitAmount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt?: string;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
