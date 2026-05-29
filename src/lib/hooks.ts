import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// Types
interface Debt {
  id: string;
  userId: string;
  name: string;
  type: string;
  dueDate: string;
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  interestRate: number;
  totalInstallments: number;
  paidInstallments: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Income {
  id: string;
  userId: string;
  name: string;
  frequency: string;
  amount: number;
  recurrenceDate: string;
  recurrenceDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Expense {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  recurrenceDate: string;
  recurrenceDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DailyExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

interface Budget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  isCompleted: boolean;
  completedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Query keys
export const queryKeys = {
  debts: ['debts'] as const,
  incomes: ['incomes'] as const,
  expenses: ['expenses'] as const,
  dailyExpenses: ['dailyExpenses'] as const,
  budgets: (month: number, year: number) => ['budgets', month, year] as const,
  goals: ['goals'] as const,
  aiPlans: ['aiPlans'] as const,
};

// Hooks for fetching data
export const useDebts = () => {
  return useQuery<Debt[]>({
    queryKey: queryKeys.debts,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('userId', user.id)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useIncomes = () => {
  return useQuery<Income[]>({
    queryKey: queryKeys.incomes,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('userId', user.id)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useExpenses = () => {
  return useQuery<Expense[]>({
    queryKey: queryKeys.expenses,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('userId', user.id)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useDailyExpenses = (startDate?: string, endDate?: string) => {
  return useQuery<DailyExpense[]>({
    queryKey: [...queryKeys.dailyExpenses, startDate, endDate],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      let query = supabase
        .from('daily_expenses')
        .select('*')
        .eq('userId', user.id);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useBudgets = (month: number, year: number) => {
  return useQuery<Budget[]>({
    queryKey: queryKeys.budgets(month, year),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('userId', user.id)
        .eq('month', month)
        .eq('year', year)
        .eq('isActive', true);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useGoals = () => {
  return useQuery<FinancialGoal[]>({
    queryKey: queryKeys.goals,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('userId', user.id)
        .eq('isActive', true)
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

// Mutation hooks
export const useCreateDebt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('debts')
        .insert([debt])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
    },
  });
};

export const useUpdateDebt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...debt }: Partial<Debt> & { id: string }) => {
      const { data, error } = await supabase
        .from('debts')
        .update(debt)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
    },
  });
};

export const useDeleteDebt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
    },
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goal: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .insert([goal])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...goal }: Partial<FinancialGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .update(goal)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
  });
};
