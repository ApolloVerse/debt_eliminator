-- Create financial goals table
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  targetAmount NUMERIC NOT NULL,
  currentAmount NUMERIC DEFAULT 0,
  deadline DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT DEFAULT 'other' CHECK (category IN ('emergency', 'travel', 'education', 'vehicle', 'home', 'retirement', 'other')),
  isCompleted BOOLEAN DEFAULT false,
  completedAt TIMESTAMPTZ,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own goals" 
  ON financial_goals FOR SELECT 
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own goals" 
  ON financial_goals FOR INSERT 
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own goals" 
  ON financial_goals FOR UPDATE 
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete own goals" 
  ON financial_goals FOR DELETE 
  USING (auth.uid() = userId);

-- Create index for faster queries
CREATE INDEX idx_financial_goals_user ON financial_goals(userId, isActive);
