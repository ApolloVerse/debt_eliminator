export type DebtType = 'fixed' | 'variable' | 'overdraft';
export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'sporadic';
export type ExpenseCategory = 'housing' | 'food' | 'transport' | 'health' | 'education' | 'utilities' | 'entertainment' | 'other';
export type AIStrategy = 'snowball' | 'avalanche';
export type DailyExpenseCategory = 'alimentacao' | 'transporte' | 'saude' | 'lazer' | 'compras' | 'servicos' | 'outros' | 'educacao' | 'moradia';
export type BudgetCategory = DailyExpenseCategory;

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
  type: DebtType;
  interestRate: number;
  dueDate: string;
  totalInstallments: number;
  paidInstallments: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Income {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
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
  recurrenceDate?: string;
  recurrenceDay?: number;
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
