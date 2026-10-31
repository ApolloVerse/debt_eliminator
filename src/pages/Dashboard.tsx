import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Income, Expense, DailyExpense } from '../types';
import { Title, BrutalCard, BrutalButton } from '../components/BrutalUI';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { 
  Zap,
  Calendar,
  Car,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  CreditCard,
  Map,
  DollarSign,
  AlertCircle,
  Landmark,
  ReceiptText,
  Wallet
} from 'lucide-react';
import { 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Link, useLocation } from 'wouter';
import { cleanBaseName, extractExpenseMeta } from './Expenses';

// Helper: is this expense a card/loan/overdraft?
const isCreditExpense = (e: Expense) =>
  e.category === 'credit_card' || e.category === 'loan' || e.category === 'overdraft';

export const Dashboard = () => {
  const [, setLocation] = useLocation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [debtsRes, incomesRes, expensesRes, dailyExpensesRes] = await Promise.all([
        supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('incomes').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('expenses').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('daily_expenses').select('*').eq('userId', user.id)
      ]);

      if (debtsRes.data) setDebts(debtsRes.data as Debt[]);
      if (incomesRes.data) setIncomes(incomesRes.data as Income[]);
      if (expensesRes.data) setExpenses(expensesRes.data as Expense[]);
      if (dailyExpensesRes.data) setDailyExpenses(dailyExpensesRes.data as DailyExpense[]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ── Debts balance (from Debts page) ────────────────────────────────────────
  const totalDebtBalance = debts.reduce((acc, d) => acc + (d.isPaid ? 0 : (Number(d.remainingAmount) || 0)), 0);
  const totalOriginalDebt = debts.reduce((acc, d) => acc + (Number(d.totalAmount) || 0), 0);
  const monthlyDebtPayments = debts.reduce((acc, d) => acc + (d.isPaid ? 0 : (Number(d.installmentAmount || d.remainingAmount) || 0)), 0);

  // ── Card/Loan expenses balance (from Expenses page) ─────────────────────────
  // Group credit card expenses by name+bank key to get committed (unpaid) sum per card
  const creditExpenses = expenses.filter(isCreditExpense);
  const unpaidCreditExpenses = creditExpenses.filter(e => !e.isPaid);
  const totalCardBalance = unpaidCreditExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  // Card expense monthly payments: sum of unpaid card/loan invoices this month
  const monthlyCardPayments = totalCardBalance; // already grouped as monthly invoices

  // ── Combined totals ─────────────────────────────────────────────────────────
  const totalCombinedBalance = totalDebtBalance + totalCardBalance;
  const totalOriginalCombined = totalOriginalDebt + creditExpenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const overallProgress = totalOriginalCombined > 0
    ? Math.min(100, ((totalOriginalCombined - totalCombinedBalance) / totalOriginalCombined) * 100)
    : 0;

  const monthlyIncome = incomes
    .filter(i => i.category !== 'bank_box')
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const monthlyExpenses = expenses
    .filter(e => !isCreditExpense(e))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const freeCash = monthlyIncome - monthlyExpenses - monthlyDebtPayments - monthlyCardPayments;

  // Calculate current month daily expenses using month string prefix to avoid timezone offsets
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());
  const currentMonthKey = `${currentYearStr}-${currentMonthStr}`;

  const monthlyDailyExpenses = dailyExpenses
    .filter(de => {
      if (!de.date) return false;
      const datePart = de.date.split('T')[0];
      return datePart.startsWith(currentMonthKey);
    })
    .reduce((acc, de) => acc + (Number(de.amount) || 0), 0);

  // Real free cash
  const realFreeCash = monthlyIncome - monthlyExpenses - monthlyDebtPayments - monthlyCardPayments - monthlyDailyExpenses;

  // Financial health analysis
  const totalMonthlyObligations = monthlyDebtPayments + monthlyCardPayments + monthlyExpenses + monthlyDailyExpenses;
  const debtToIncomeRatio = monthlyIncome > 0 ? ((monthlyDebtPayments + monthlyCardPayments) / monthlyIncome) * 100 : 0;
  const expenseToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyObligations / monthlyIncome) * 100 : 0;

  const getFinancialHealth = () => {
    if (debts.length === 0 && incomes.length === 0) return { label: 'Preencha seus dados', color: 'text-sp-text-subtle', bg: 'bg-slate-50' };
    if (realFreeCash < 0) return { label: 'Alerta: Saldo Negativo', color: 'text-sp-red-text', bg: 'bg-sp-red-bg' };
    if (debtToIncomeRatio > 50) return { label: 'Endividamento Alto', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (expenseToIncomeRatio > 80) return { label: 'Gastos Elevados', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (overallProgress > 50) return { label: 'Bom Progresso', color: 'text-sp-mint', bg: 'bg-emerald-50' };
    return { label: 'Saudável', color: 'text-sp-mint', bg: 'bg-emerald-50' };
  };
  const financialHealth = getFinancialHealth();

  // Daily expenses by category for current month
  const dailyByCategory = dailyExpenses
    .filter(de => {
      if (!de.date) return false;
      const datePart = de.date.split('T')[0];
      return datePart.startsWith(currentMonthKey);
    })
    .reduce((acc, de) => {
      acc[de.category] = (acc[de.category] || 0) + (Number(de.amount) || 0);
      return acc;
    }, {} as Record<string, number>);

  // Cash Flow chart data
  const cashFlowData = [
    { name: 'Semana 1', Saídas: 0, Entradas: 0 },
    { name: 'Semana 2', Saídas: 0, Entradas: 0 },
    { name: 'Semana 3', Saídas: 0, Entradas: 0 },
    { name: 'Semana 4', Saídas: 0, Entradas: 0 },
  ];

  incomes.filter(i => i.category !== 'bank_box').forEach(i => {
    let weekIndex = 0;
    if (i.recurrenceDay) {
      if (i.recurrenceDay >= 22) weekIndex = 3;
      else if (i.recurrenceDay >= 15) weekIndex = 2;
      else if (i.recurrenceDay >= 8) weekIndex = 1;
    }
    cashFlowData[weekIndex].Entradas += (Number(i.amount) || 0);
  });

  expenses.filter(e => !isCreditExpense(e)).forEach(e => {
    let weekIndex = 0;
    const dueDay = e.dueDate ? parseInt(e.dueDate.split('-')[2] || '0', 10) : (e.recurrenceDay || 0);
    if (dueDay >= 22) weekIndex = 3;
    else if (dueDay >= 15) weekIndex = 2;
    else if (dueDay >= 8) weekIndex = 1;
    cashFlowData[weekIndex].Saídas += (Number(e.amount) || 0);
  });

  debts.forEach(d => {
    if (d.isPaid) return;
    let weekIndex = 0;
    if (d.dueDate) {
      const parts = d.dueDate.split('-');
      const dueDay = parseInt(parts[2] || '0', 10);
      if (dueDay >= 22) weekIndex = 3;
      else if (dueDay >= 15) weekIndex = 2;
      else if (dueDay >= 8) weekIndex = 1;
    }
    cashFlowData[weekIndex].Saídas += (Number(d.installmentAmount || d.remainingAmount) || 0);
  });

  unpaidCreditExpenses.forEach(e => {
    let weekIndex = 0;
    const dueDay = e.dueDate ? parseInt(e.dueDate.split('-')[2] || '0', 10) : (e.recurrenceDay || 0);
    if (dueDay >= 22) weekIndex = 3;
    else if (dueDay >= 15) weekIndex = 2;
    else if (dueDay >= 8) weekIndex = 1;
    cashFlowData[weekIndex].Saídas += (Number(e.amount) || 0);
  });

  // ── UPCOMING DUE DATES: combine debts + unpaid card expenses ───────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type VencItem = {
    id: string;
    title: string;
    dueText: string;
    daysUntil: number;
    amount: number;
    status: string;
    statusClass: string;
    type: 'debt' | 'card' | 'loan';
    icon: any;
    iconBg: string;
  };

  const buildVencItem = (
    id: string,
    name: string,
    dueDateStr: string | undefined,
    amount: number,
    type: VencItem['type']
  ): VencItem => {
    let daysUntil = 999;
    let dueDateLabel = 'Sem data';

    if (dueDateStr) {
      const parts = dueDateStr.split('-');
      const dueDay = parseInt(parts[2] || '1', 10);
      const dueMonth = parseInt(parts[1] || '1', 10) - 1;
      const dueYear = parseInt(parts[0] || String(today.getFullYear()), 10);

      // If date is in the future, use it directly; else compute next occurrence
      const exactDate = new Date(dueYear, dueMonth, dueDay);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);

      // Use the exact stored date if it's future; otherwise rolling monthly calc
      let nextDue: Date;
      if (exactDate > today) {
        nextDue = exactDate;
      } else {
        nextDue = thisMonth >= today ? thisMonth : nextMonth;
      }

      daysUntil = Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      dueDateLabel = daysUntil === 0
        ? 'Vence hoje!'
        : daysUntil === 1
        ? 'Vence amanhã'
        : `Vence em ${daysUntil} dias (dia ${dueDay} ${monthNames[nextDue.getMonth()]})`;
    }

    const status = daysUntil <= 3 ? 'URGENTE' : daysUntil <= 10 ? 'PENDENTE' : 'AGENDADO';
    const sClass = status === 'URGENTE'
      ? 'bg-sp-red-bg text-sp-red-text'
      : status === 'PENDENTE'
        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
        : 'bg-sp-mint-light text-sp-mint border border-emerald-100';

    const icon = type === 'card' ? CreditCard : type === 'loan' ? Landmark : Zap;
    const iconBg = status === 'URGENTE'
      ? 'bg-red-50 text-sp-red-text'
      : status === 'PENDENTE'
        ? type === 'card' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'
        : 'bg-emerald-50 text-sp-mint';

    return { id, title: name, dueText: dueDateLabel, daysUntil, amount, status, statusClass: sClass, type, icon, iconBg };
  };

  // From debts
  const debtVencItems: VencItem[] = debts
    .filter(d => !d.isPaid)
    .map(d => buildVencItem(
      d.id,
      d.name,
      d.dueDate,
      Number(d.installmentAmount || d.remainingAmount) || 0,
      'debt'
    ));

  // From credit card / loan expenses — group by card key to avoid duplicates
  const cardGroupMap: Record<string, { name: string; dueDate: string; amount: number; category: string }> = {};
  unpaidCreditExpenses.forEach(e => {
    const bank = e.bank || 'outro';
    const baseName = cleanBaseName(e.name) || 'Fatura';
    const key = `${bank}__${baseName.toLowerCase()}`;
    const existing = cardGroupMap[key];
    if (!existing) {
      cardGroupMap[key] = { name: baseName, dueDate: e.dueDate || '', amount: Number(e.amount) || 0, category: e.category };
    } else {
      // accumulate unpaid
      existing.amount += Number(e.amount) || 0;
      // take earliest due date
      if (e.dueDate && e.dueDate < existing.dueDate) existing.dueDate = e.dueDate;
    }
  });

  const cardVencItems: VencItem[] = Object.entries(cardGroupMap).map(([key, grp]) =>
    buildVencItem(key, grp.name, grp.dueDate, grp.amount, grp.category === 'loan' ? 'loan' : 'card')
  );

  const activeVencimentos: VencItem[] = [...debtVencItems, ...cardVencItems]
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-sp-purple border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* 1. PURPLE MAIN DEBT HEADER CARD */}
      <div className="bg-sp-purple text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 pointer-events-none" />
        
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
          TOTAL EM ABERTO
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
          {formatCurrency(totalCombinedBalance)}
        </h2>

        {/* breakdown mini row */}
        {(totalDebtBalance > 0 || totalCardBalance > 0) && (
          <div className="flex gap-4 mb-4 text-white/80">
            {totalDebtBalance > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Wallet className="w-3 h-3" />
                <span>Dívidas: {formatCurrency(totalDebtBalance)}</span>
              </div>
            )}
            {totalCardBalance > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <CreditCard className="w-3 h-3" />
                <span>Cartões/Emprést.: {formatCurrency(totalCardBalance)}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-white/80">Progresso de Quitação</span>
            <span className="text-lg font-bold">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-white/15 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-sp-mint h-full rounded-full transition-all duration-1000" 
              style={{ width: `${overallProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 1.5. ANÁLISE FINANCEIRA AUTOMÁTICA */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
            Análise Financeira
          </h3>
          <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider", financialHealth.bg, financialHealth.color)}>
            {financialHealth.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Receitas</p>
            <p className="text-lg font-black text-sp-mint">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Despesas</p>
            <p className="text-lg font-black text-sp-text-dark">{formatCurrency(monthlyExpenses)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Dívidas/Cartões</p>
            <p className="text-lg font-black text-sp-red-text">{formatCurrency(monthlyDebtPayments + monthlyCardPayments)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Gastos Diários</p>
            <p className="text-lg font-black text-orange-600">{formatCurrency(monthlyDailyExpenses)}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-sp-purple/5 border border-sp-purple/10 rounded-2xl">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-sp-text-dark">Saldo Livre Estimado</span>
            <span className={cn("text-xl font-black", realFreeCash >= 0 ? "text-sp-mint" : "text-sp-red-text")}>
              {formatCurrency(realFreeCash)}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className={cn("h-full rounded-full transition-all", realFreeCash >= 0 ? "bg-sp-mint" : "bg-sp-red-text")}
              style={{ width: `${Math.min(100, expenseToIncomeRatio)}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-sp-text-subtle mt-1 uppercase tracking-wider">
            Comprometimento: {Math.round(expenseToIncomeRatio)}% da renda
          </p>
        </div>

        {realFreeCash < 0 && monthlyIncome > 0 && (
          <div className="mt-3 p-3 bg-sp-red-bg border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sp-red-text shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-sp-red-text leading-relaxed">
              Seus gastos totais (despesas + parcelas + cartões + diários) ultrapassam sua receita cadastrada. Reduza despesas ou gere um Plano IA para otimizar.
            </p>
          </div>
        )}
      </div>

      {/* 2. QUICK ACTIONS */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/debts?add=true">
          <div className="bg-white border border-sp-border rounded-2xl p-5 hover:border-sp-purple/40 hover:shadow-sm transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer select-none">
            <div className="w-12 h-12 rounded-full bg-sp-purple-light text-sp-purple flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="font-bold text-sp-text-dark text-sm">Nova Dívida</span>
          </div>
        </Link>

        <Link href="/ai-plan">
          <div className="bg-white border border-sp-border rounded-2xl p-5 hover:border-sp-purple/40 hover:shadow-sm transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer select-none">
            <div className="w-12 h-12 rounded-full bg-sp-purple-light text-sp-purple flex items-center justify-center mb-3">
              <Map className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-bold text-sp-text-dark text-sm">Ver Plano</span>
          </div>
        </Link>
      </div>

      {/* 2.5. GASTOS DIÁRIOS DO MÊS */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
              Gastos Diários
            </h3>
            <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
              Mês de {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/daily-expenses" className="text-xs font-bold text-sp-purple hover:underline flex items-center gap-1">
            Ver todos
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">
              Total Gasto
            </p>
            <p className="text-2xl font-black text-orange-700">
              {formatCurrency(monthlyDailyExpenses)}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-mint mb-1">
              Lançamentos
            </p>
            <p className="text-2xl font-black text-sp-mint">
              {dailyExpenses.filter(de => {
                if (!de.date) return false;
                return de.date.split('T')[0].startsWith(currentMonthKey);
              }).length}
            </p>
          </div>
        </div>

        {Object.keys(dailyByCategory).length > 0 && (
          <div className="space-y-2">
            {Object.entries(dailyByCategory)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([cat, amount]) => {
                const catNames: Record<string, string> = {
                  alimentacao: 'Alimentação', transporte: 'Transporte', saude: 'Saúde',
                  lazer: 'Lazer', compras: 'Compras', servicos: 'Serviços', outros: 'Outros'
                };
                const catColors: Record<string, string> = {
                  alimentacao: 'bg-emerald-500', transporte: 'bg-amber-500', saude: 'bg-rose-500',
                  lazer: 'bg-fuchsia-500', compras: 'bg-blue-500', servicos: 'bg-indigo-500', outros: 'bg-slate-500'
                };
                const pct = monthlyDailyExpenses > 0 ? (amount / monthlyDailyExpenses) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", catColors[cat] || 'bg-slate-400')} />
                    <span className="text-xs font-semibold text-sp-text-sec flex-1">{catNames[cat] || cat}</span>
                    <span className="text-xs font-bold text-sp-text-dark">{formatCurrency(amount)}</span>
                    <span className="text-[10px] font-bold text-sp-text-subtle">{Math.round(pct)}%</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 3. FLUXO DE CAIXA WEEKLY CHART */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
          <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
            Fluxo de Caixa
          </h3>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 text-xs font-bold text-sp-text-sec">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sp-purple inline-block" />
              Saídas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sp-mint inline-block" />
              Entradas
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} barGap={6}>
              <XAxis 
                dataKey="name" 
                stroke="#94A3B8" 
                fontSize={11} 
                fontFamily="Inter"
                fontWeight="bold"
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', fontFamily: 'Inter' }} 
              />
              <Bar dataKey="Saídas" fill="#7F3DFF" radius={0} barSize={12} />
              <Bar dataKey="Entradas" fill="#10B981" radius={0} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. UPCOMING DUE DATES (PRÓXIMOS VENCIMENTOS) */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm relative">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
              Próximos Vencimentos
            </h3>
            <p className="text-xs font-semibold text-sp-text-sec mt-0.5">Dívidas e faturas de cartões</p>
          </div>
          <Link href="/debts" className="text-xs font-bold text-sp-purple hover:underline flex items-center gap-1">
            Ver todos
          </Link>
        </div>

        {activeVencimentos.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-sp-border rounded-2xl">
            <p className="text-sm font-semibold text-sp-text-sec">Nenhum vencimento próximo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeVencimentos.map((venc) => {
              const IconComponent = venc.icon;
              return (
                <div 
                  key={venc.id} 
                  className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-sp-border rounded-2xl transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", venc.iconBg)}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-sp-text-dark leading-snug truncate">
                          {venc.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-sp-text-subtle border border-sp-border rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                          {venc.type === 'card' ? 'Cartão' : venc.type === 'loan' ? 'Emprést.' : 'Dívida'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                        {venc.dueText}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div className="font-extrabold text-sm text-sp-text-dark">
                      {formatCurrency(venc.amount)}
                    </div>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 mt-1 inline-block rounded-full uppercase tracking-wider", venc.statusClass)}>
                      {venc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING ACTION PLUS BUTTON */}
      <button 
        onClick={() => setLocation('/debts?add=true')}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-11 h-11 md:w-14 md:h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer"
      >
        <Plus className="w-5 h-5 md:w-7 md:h-7 stroke-[3]" />
      </button>

    </div>
  );
};
