import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Debts } from './pages/Debts';
import { Incomes } from './pages/Incomes';
import { Expenses } from './pages/Expenses';
import { Payments } from './pages/Payments';
import { AIPlan } from './pages/AIPlan';
import { History } from './pages/History';
import { Toaster } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brutal-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster position="bottom-right" theme="dark" />
      </>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/debts" component={Debts} />
        <Route path="/incomes" component={Incomes} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/payments" component={Payments} />
        <Route path="/ai-plan" component={AIPlan} />
        <Route path="/history" component={History} />
        <Route>
            <div className="p-8">
                <h1 className="text-4xl font-black uppercase text-brutal-red">404 - Not Found</h1>
            </div>
        </Route>
      </Switch>
      <Toaster position="bottom-right" theme="dark" />
    </AppLayout>
  );
}
