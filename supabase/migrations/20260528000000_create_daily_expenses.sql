-- Daily Expenses table for tracking day-to-day spending
CREATE TABLE IF NOT EXISTS public.daily_expenses (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outros',
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/modify their own daily expenses
CREATE POLICY "Users can manage their own daily expenses" ON public.daily_expenses
    FOR ALL USING (auth.uid() = "userId");

-- Index for fast monthly queries
CREATE INDEX idx_daily_expenses_user_date ON public.daily_expenses ("userId", "date");
