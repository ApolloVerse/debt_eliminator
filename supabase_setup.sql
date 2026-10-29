-- Saldo Positivo: Supabase Setup Script (COMPLETE & UPDATED v1.1)
-- Run this script in the Supabase SQL Editor to create or update ALL tables,
-- columns, indexes, and Row Level Security (RLS) policies.

-- ============================================================
-- 1. DEBTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.debts (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "category" TEXT DEFAULT 'other',
    "dueDate" TEXT,
    "totalAmount" NUMERIC NOT NULL,
    "remainingAmount" NUMERIC NOT NULL,
    "installmentAmount" NUMERIC NOT NULL,
    "interestRate" NUMERIC NOT NULL,
    "totalInstallments" INTEGER,
    "paidInstallments" INTEGER,
    "isPaid" BOOLEAN DEFAULT false,
    "paymentDate" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INCOMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incomes (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "frequency" TEXT,
    "type" TEXT DEFAULT 'fixed',
    "category" TEXT,
    "amount" NUMERIC NOT NULL,
    "expectedDate" TEXT,
    "recurrenceDate" TEXT,
    "recurrenceDay" INTEGER,
    "isReceived" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. EXPENSES TABLE (Fixed & Variable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "type" TEXT DEFAULT 'fixed',
    "amount" NUMERIC NOT NULL,
    "dueDate" TEXT,
    "recurrenceDate" TEXT,
    "recurrenceDay" INTEGER,
    "isPaid" BOOLEAN DEFAULT false,
    "paymentDate" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DAILY EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_expenses (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outros',
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "type" TEXT DEFAULT 'variable',
    "isScheduled" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. PAYMENT LOGS TABLE
-- ============================================================
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

-- ============================================================
-- 6. AI PLANS TABLE
-- ============================================================
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

-- ============================================================
-- 7. BUDGETS TABLE (Monthly Budget Tracking)
-- ============================================================
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

-- ============================================================
-- 8. FINANCIAL GOALS TABLE (Savings Goals)
-- ============================================================
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
-- 9. CUSTOM CATEGORIES TABLE (User-created categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_categories (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL CHECK ("scope" IN ('expenses', 'daily', 'debts', 'incomes')),
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. SAFE COLUMN MIGRATIONS (For existing databases)
-- ============================================================
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'other';
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT false;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;

ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'fixed';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS "expectedDate" TEXT;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS "isReceived" BOOLEAN DEFAULT false;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'fixed';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;

ALTER TABLE public.daily_expenses ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'variable';
ALTER TABLE public.daily_expenses ADD COLUMN IF NOT EXISTS "isScheduled" BOOLEAN DEFAULT false;

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
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE RLS POLICIES (Users can only see/modify their own data)
-- ============================================================

-- Debts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own debts' AND tablename = 'debts') THEN
        CREATE POLICY "Users can manage their own debts" ON public.debts FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Incomes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own incomes' AND tablename = 'incomes') THEN
        CREATE POLICY "Users can manage their own incomes" ON public.incomes FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Expenses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own expenses' AND tablename = 'expenses') THEN
        CREATE POLICY "Users can manage their own expenses" ON public.expenses FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Daily Expenses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own daily expenses' AND tablename = 'daily_expenses') THEN
        CREATE POLICY "Users can manage their own daily expenses" ON public.daily_expenses FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Payment Logs
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own payment logs' AND tablename = 'payment_logs') THEN
        CREATE POLICY "Users can manage their own payment logs" ON public.payment_logs FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- AI Plans
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own AI plans' AND tablename = 'ai_plans') THEN
        CREATE POLICY "Users can manage their own AI plans" ON public.ai_plans FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Budgets
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own budgets' AND tablename = 'budgets') THEN
        CREATE POLICY "Users can manage their own budgets" ON public.budgets FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Financial Goals
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own goals' AND tablename = 'financial_goals') THEN
        CREATE POLICY "Users can manage their own goals" ON public.financial_goals FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- Custom Categories
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own custom categories' AND tablename = 'custom_categories') THEN
        CREATE POLICY "Users can manage their own custom categories" ON public.custom_categories FOR ALL USING (auth.uid() = "userId");
    END IF;
END $$;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts ("userId", "isActive");
CREATE INDEX IF NOT EXISTS idx_incomes_user ON public.incomes ("userId", "isActive");
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses ("userId", "isActive");
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_date ON public.daily_expenses ("userId", "date");
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets ("userId", "month", "year");
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON public.financial_goals ("userId", "isActive");
CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON public.custom_categories ("userId", "scope");
