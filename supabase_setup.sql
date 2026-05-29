-- Debt Eliminator: Supabase Setup Script
-- Run this script in the Supabase SQL Editor to create tables and configure Row Level Security (RLS)

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

-- 3. EXPENSES TABLE
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

-- 4. PAYMENT LOGS TABLE
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

-- 5. AI PLANS TABLE
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

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES FOR ALL TABLES (Users can only see/modify their own data)
CREATE POLICY "Users can manage their own debts" ON public.debts
    FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Users can manage their own incomes" ON public.incomes
    FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Users can manage their own payment logs" ON public.payment_logs
    FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Users can manage their own AI plans" ON public.ai_plans
    FOR ALL USING (auth.uid() = "userId");
