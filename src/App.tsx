import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { User } from '@supabase/supabase-js';
import { supabase, isMisconfigured } from './lib/supabase';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Debts } from './pages/Debts';
import { Incomes } from './pages/Incomes';
import { Expenses } from './pages/Expenses';
import { DailyExpenses } from './pages/DailyExpenses';
import { Payments } from './pages/Payments';
import { AIPlan } from './pages/AIPlan';
import { History } from './pages/History';
import { Budget } from './pages/Budget';
import { Goals } from './pages/Goals';
import { Toaster } from 'sonner';
import { ThemeProvider } from './lib/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #7F3DFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (isMisconfigured) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#fff', border: '2px solid #EF4444', borderRadius: '24px', padding: '32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontWeight: 900, fontSize: '20px', color: '#0F172A', marginBottom: '8px' }}>Variaveis de ambiente ausentes</h1>
          <p style={{ fontSize: '13px', color: '#64748B' }}>Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Login />
          <Toaster position="bottom-right" theme="dark" />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/debts" component={Debts} />
            <Route path="/incomes" component={Incomes} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/daily-expenses" component={DailyExpenses} />
            <Route path="/payments" component={Payments} />
            <Route path="/ai-plan" component={AIPlan} />
            <Route path="/history" component={History} />
            <Route path="/budget" component={Budget} />
            <Route path="/goals" component={Goals} />
            <Route>
              <div className="p-8">
                <h1 className="text-4xl font-black uppercase text-sp-red-text">404 - Not Found</h1>
              </div>
            </Route>
          </Switch>
        </AppLayout>
        <Toaster position="bottom-right" theme="dark" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
