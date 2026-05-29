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
  AlertCircle
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

  const totalDebtBalance = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalOriginalDebt = debts.reduce((acc, d) => acc + d.totalAmount, 0);
  const monthlyIncome = incomes.reduce((acc, i) => {
    switch (i.frequency) {
      case 'monthly': return acc + i.amount;
      case 'weekly': return acc + (i.amount * 4.33);
      case 'biweekly': return acc + (i.amount * 2);
      case 'annual': return acc + (i.amount / 12);
      default: return acc + i.amount;
    }
  }, 0);
  const monthlyExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const monthlyDebtPayments = debts.reduce((acc, d) => acc + d.installmentAmount, 0);
  const freeCash = Math.max(0, monthlyIncome - monthlyExpenses - monthlyDebtPayments);

  // Calculate current month daily expenses
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyDailyExpenses = dailyExpenses
    .filter(de => {
      const d = new Date(de.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, de) => acc + de.amount, 0);

  // Real free cash - use actual daily expenses entered, not projection
  const realFreeCash = Math.max(0, monthlyIncome - monthlyExpenses - monthlyDebtPayments - monthlyDailyExpenses);
  
  const overallProgress = totalOriginalDebt > 0 
    ? ((totalOriginalDebt - totalDebtBalance) / totalOriginalDebt) * 100 
    : 0;

  // Financial health analysis
  const debtToIncomeRatio = monthlyIncome > 0 ? ((monthlyDebtPayments / monthlyIncome) * 100) : 0;
  const expenseToIncomeRatio = monthlyIncome > 0 ? (((monthlyExpenses + monthlyDailyExpenses) / monthlyIncome) * 100) : 0;
  
  const getFinancialHealth = () => {
    if (debts.length === 0 && monthlyIncome === 0) return { label: 'Preencha seus dados', color: 'text-sp-text-subtle', bg: 'bg-slate-50' };
    if (realFreeCash <= 0) return { label: 'Alerta: Saldo Negativo', color: 'text-sp-red-text', bg: 'bg-sp-red-bg' };
    if (debtToIncomeRatio > 50) return { label: 'Endividamento Alto', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (expenseToIncomeRatio > 80) return { label: 'Gastos Elevados', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (overallProgress > 50) return { label: 'Bom Progresso', color: 'text-sp-mint', bg: 'bg-emerald-50' };
    return { label: 'Saudável', color: 'text-sp-mint', bg: 'bg-emerald-50' };
  };
  const financialHealth = getFinancialHealth();

  // Daily expenses by category for current month
  const dailyByCategory = dailyExpenses
    .filter(de => {
      const d = new Date(de.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, de) => {
      acc[de.category] = (acc[de.category] || 0) + de.amount;
      return acc;
    }, {} as Record<string, number>);

  // Real Cash Flow chart data mapped to weeks of the month
  const cashFlowData = [
    { name: 'Semana 1', Saídas: 0, Entradas: 0 },
    { name: 'Semana 2', Saídas: 0, Entradas: 0 },
    { name: 'Semana 3', Saídas: 0, Entradas: 0 },
    { name: 'Semana 4', Saídas: 0, Entradas: 0 },
  ];

  incomes.forEach(i => {
    let weekIndex = 0;
    if (i.recurrenceDay) {
      if (i.recurrenceDay >= 22) weekIndex = 3;
      else if (i.recurrenceDay >= 15) weekIndex = 2;
      else if (i.recurrenceDay >= 8) weekIndex = 1;
    }
    
    let normalizedAmount = i.amount;
    if (i.frequency === 'weekly') normalizedAmount = i.amount * 4.33 / 4;
    else if (i.frequency === 'biweekly') normalizedAmount = i.amount * 2 / 2;
    else if (i.frequency === 'annual') normalizedAmount = i.amount / 12;

    cashFlowData[weekIndex].Entradas += normalizedAmount;
  });

  expenses.forEach(e => {
    let weekIndex = 0;
    if (e.recurrenceDay) {
      if (e.recurrenceDay >= 22) weekIndex = 3;
      else if (e.recurrenceDay >= 15) weekIndex = 2;
      else if (e.recurrenceDay >= 8) weekIndex = 1;
    }
    cashFlowData[weekIndex].Saídas += e.amount;
  });

  debts.forEach(d => {
    let weekIndex = 0;
    if (d.dueDate) {
      const day = new Date(d.dueDate).getDate();
      if (!isNaN(day)) {
        if (day >= 22) weekIndex = 3;
        else if (day >= 15) weekIndex = 2;
        else if (day >= 8) weekIndex = 1;
      }
    }
    cashFlowData[weekIndex].Saídas += d.installmentAmount;
  });

  // Calculate real due dates — debts recur monthly, so find the next occurrence of their due day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeVencimentos = debts.length > 0
    ? debts
        .map((d) => {
          // Parse the stored dueDate to extract the day-of-month
          let daysUntil = 999;
          let dueDateLabel = 'Sem data';

          if (d.dueDate) {
            const parts = d.dueDate.split('-');
            const dueDay = parseInt(parts[2] || '1', 10);

            // Build next due date: try this month, if already passed use next month
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
            const nextDue = thisMonth >= today ? thisMonth : nextMonth;

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

          return {
            id: d.id,
            title: d.name,
            dueText: dueDateLabel,
            daysUntil,
            amount: d.installmentAmount || d.remainingAmount,
            status,
            statusClass: sClass,
            icon: d.name.toLowerCase().includes('car') ? Car : d.name.toLowerCase().includes('cart') ? Calendar : Zap,
            iconBg: status === 'URGENTE' ? 'bg-red-50 text-sp-red-text' : status === 'PENDENTE' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-sp-mint',
          };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil) // sort by soonest due
        .slice(0, 3)
    : [];

  // Real debt display list or fallback
  const finalDebtBalance = totalDebtBalance;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-sp-purple border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* 1. PURPLE MAIN DEBT HEADER CARD */}
      <div className="bg-sp-purple text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        {/* Abstract vector dots background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 pointer-events-none" />
        
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
          TOTAL EM ABERTO
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">
          {formatCurrency(finalDebtBalance)}
        </h2>

        {/* Live progress section */}
        <div className="space-y-2 mt-4">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Receita</p>
            <p className="text-lg font-black text-sp-mint">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Despesas Fixas</p>
            <p className="text-lg font-black text-sp-text-dark">{formatCurrency(monthlyExpenses)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Parcelas</p>
            <p className="text-lg font-black text-sp-red-text">{formatCurrency(monthlyDebtPayments)}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle mb-1">Gastos Diarios</p>
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

        {realFreeCash <= 0 && monthlyIncome > 0 && (
          <div className="mt-3 p-3 bg-sp-red-bg border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sp-red-text shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-sp-red-text leading-relaxed">
              Seus gastos totais (fixas + dívidas + diários projetados) ultrapassam sua renda. Reduza despesas ou gere um Plano IA para otimizar.
            </p>
          </div>
        )}
      </div>

      {/* 2. QUICK ACTIONS ROWS: TWO CARDS */}
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
                const d = new Date(de.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
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
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
            Próximos Vencimentos
          </h3>
          <Link href="/debts" className="text-xs font-bold text-sp-purple hover:underline flex items-center gap-1">
            Ver todos
          </Link>
        </div>

        <div className="space-y-3">
          {activeVencimentos.map((venc) => {
            const IconComponent = venc.icon;
            return (
              <div 
                key={venc.id} 
                className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-sp-border rounded-2xl transition-all duration-200"
              >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", venc.iconBg)}>
                    <IconComponent className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-sm text-sp-text-dark leading-snug truncate">
                      {venc.title}
                    </h4>
                    <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                      {venc.dueText}
                    </p>
                  </div>
                </div>

                <div className="text-right">
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
      </div>

      {/* FLOATING ACTION PLUS BUTTON */}
      <button 
        onClick={() => setLocation('/debts?add=true')}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

    </div>
  );
};
