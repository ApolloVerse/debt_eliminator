-- Saldo Positivo: Supabase Setup Script (COMPLETE)
-- Run this script in the Supabase SQL Editor to create ALL tables and configure Row Level Security (RLS)

-- 1. DEBTS TABLE
CREATE TABLE IF NOT EXISTS public.debts (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "dueDate" TEXT,
    "totalAmount" NUMERIC NOT NULL,
    "remainingAmount" NUMERIC NOT NULL,
    "installmentAmount" NUMERIC NOT NULL,
    "interestRate" NUMERIC NOT NULL,
    "totalInstallments" INTEGER,
    "paidInstallments" INTEGER,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. INCOMES TABLE
CREATE TABLE IF NOT EXISTS public.incomes (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "frequency" TEXT,
    "amount" NUMERIC NOT NULL,
    "recurrenceDate" TEXT,
    "recurrenceDay" INTEGER,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. EXPENSES TABLE (Fixed Monthly)
CREATE TABLE IF NOT EXISTS public.expenses (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "amount" NUMERIC NOT NULL,
    "recurrenceDate" TEXT,
    "recurrenceDay" INTEGER,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 4. DAILY EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.daily_expenses (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outros',
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 5. PAYMENT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.payment_logs (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "debtId" UUID REFERENCES public.debts(id) ON DELETE CASCADE,
    "amountPaid" NUMERIC NOT NULL,
    "paymentDate" TIMESTAMPTZ NOT NULL,
    "note" TEXT,
    "debtName" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 6. AI PLANS TABLE
CREATE TABLE IF NOT EXISTS public.ai_plans (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "strategy" TEXT,
    "planContent" TEXT,
    "monthlyIncome" NUMERIC,
    "monthlyExpenses" NUMERIC,
    "freeCash" NUMERIC,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 7. BUDGETS TABLE (NEW - Monthly Budget Tracking)
CREATE TABLE IF NOT EXISTS public.budgets (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyLimit" NUMERIC NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("userId", "category", "month", "year")
);

-- 8. FINANCIAL GOALS TABLE (NEW - Savings Goals)
CREATE TABLE IF NOT EXISTS public.financial_goals (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" NUMERIC NOT NULL,
    "currentAmount" NUMERIC DEFAULT 0,
    "deadline" DATE NOT NULL,
    "priority" TEXT DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high')),
    "category" TEXT DEFAULT 'other' CHECK ("category" IN ('emergency', 'travel', 'education', 'vehicle', 'home', 'retirement', 'other')),
    "isCompleted" BOOLEAN DEFAULT false,
    "completedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE RLS POLICIES (Users can only see/modify their own data)
-- ============================================================

-- Debts
CREATE POLICY "Users can manage their own debts" ON public.debts
    FOR ALL USING (auth.uid() = "userId");

-- Incomes
CREATE POLICY "Users can manage their own incomes" ON public.incomes
    FOR ALL USING (auth.uid() = "userId");

-- Expenses (Fixed)
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = "userId");

-- Daily Expenses
CREATE POLICY "Users can manage their own daily expenses" ON public.daily_expenses
    FOR ALL USING (auth.uid() = "userId");

-- Payment Logs
CREATE POLICY "Users can manage their own payment logs" ON public.payment_logs
    FOR ALL USING (auth.uid() = "userId");

-- AI Plans
CREATE POLICY "Users can manage their own AI plans" ON public.ai_plans
    FOR ALL USING (auth.uid() = "userId");

-- Budgets
CREATE POLICY "Users can view own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "Users can insert own budgets" ON public.budgets
    FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Users can update own budgets" ON public.budgets
    FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "Users can delete own budgets" ON public.budgets
    FOR DELETE USING (auth.uid() = "userId");

-- Financial Goals
CREATE POLICY "Users can view own goals" ON public.financial_goals
    FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "Users can insert own goals" ON public.financial_goals
    FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Users can update own goals" ON public.financial_goals
    FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "Users can delete own goals" ON public.financial_goals
    FOR DELETE USING (auth.uid() = "userId");

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_date ON public.daily_expenses ("userId", "date");
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets ("userId", "month", "year");
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON public.financial_goals ("userId", "isActive");
