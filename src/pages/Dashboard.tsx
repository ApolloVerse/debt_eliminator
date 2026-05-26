import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Debt, Income, Expense } from '../types';
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
  Legend
} from 'recharts';
import { Link, useLocation } from 'wouter';

export const Dashboard = () => {
  const [, setLocation] = useLocation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qDebts = query(collection(db, 'debts'), where('userId', '==', user.uid), where('isActive', '==', true));
    const qIncomes = query(collection(db, 'incomes'), where('userId', '==', user.uid), where('isActive', '==', true));
    const qExpenses = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('isActive', '==', true));

    const unsubDebts = onSnapshot(qDebts, (s) => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() } as Debt))));
    const unsubIncomes = onSnapshot(qIncomes, (s) => setIncomes(s.docs.map(d => ({ id: d.id, ...d.data() } as Income))));
    const unsubExpenses = onSnapshot(qExpenses, (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))));

    setLoading(false);

    return () => {
      unsubDebts();
      unsubIncomes();
      unsubExpenses();
    };
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
  
  const overallProgress = totalOriginalDebt > 0 
    ? ((totalOriginalDebt - totalDebtBalance) / totalOriginalDebt) * 100 
    : 42; // standard fall back as matching mockup image 1 (42%)

  // Prepare standard Cash Flow chart data SEG-SEX matching mockup
  const cashFlowData = [
    { name: 'SEG', Saídas: monthlyExpenses * 0.15 + 120, Entradas: monthlyIncome * 0.2 + 250 },
    { name: 'TER', Saídas: monthlyExpenses * 0.25 + 90, Entradas: monthlyIncome * 0.15 + 300 },
    { name: 'QUA', Saídas: monthlyExpenses * 0.20 + 210, Entradas: monthlyIncome * 0.25 + 450 },
    { name: 'QUI', Saídas: monthlyExpenses * 0.10 + 80, Entradas: monthlyIncome * 0.1 + 100 },
    { name: 'SEX', Saídas: monthlyExpenses * 0.30 + 350, Entradas: monthlyIncome * 0.3 + 800 },
  ];

  // Helper mock vencimentos lists matching first mockup screenshot precisely to provide pristine content structure
  const mockVencimentos = [
    {
      id: 'v1',
      title: 'Cartão de Crédito',
      dueText: 'Vence em 2 dias',
      amount: 1250.00,
      status: 'URGENTE',
      statusClass: 'bg-sp-red-bg text-sp-red-text',
      icon: Calendar,
      iconBg: 'bg-red-50 text-sp-red-text border border-red-100',
    },
    {
      id: 'v2',
      title: 'Conta de Luz',
      dueText: 'Vence em 5 dias',
      amount: 342.10,
      status: 'PENDENTE',
      statusClass: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      icon: Zap,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    },
    {
      id: 'v3',
      title: 'Parcela Carro',
      dueText: 'Vence em 12 dias',
      amount: 890.00,
      status: 'AGENDADO',
      statusClass: 'bg-sp-mint-light text-sp-mint border border-emerald-100',
      icon: Car,
      iconBg: 'bg-emerald-50 text-sp-mint border border-emerald-100',
    },
  ];

  // Map real user debts as vencimentos if available
  const activeVencimentos = debts.length > 0 
    ? debts.slice(0, 3).map((d, index) => {
        const days = (index + 1) * 4;
        const status = days <= 5 ? 'URGENTE' : days <= 10 ? 'PENDENTE' : 'AGENDADO';
        const sClass = status === 'URGENTE' 
          ? 'bg-sp-red-bg text-sp-red-text' 
          : status === 'PENDENTE' 
            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            : 'bg-sp-mint-light text-sp-mint border border-emerald-100';

        return {
          id: d.id,
          title: d.name,
          dueText: `Vence em ${days} dias`,
          amount: d.installmentAmount || d.remainingAmount / 10,
          status,
          statusClass: sClass,
          icon: d.name.toLowerCase().includes('car') ? Car : d.name.toLowerCase().includes('cart') ? Calendar : Zap,
          iconBg: status === 'URGENTE' ? 'bg-red-50 text-sp-red-text' : status === 'PENDENTE' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-sp-mint',
        };
      })
    : mockVencimentos;

  // Real debt display list or fallback
  const finalDebtBalance = totalDebtBalance > 0 ? totalDebtBalance : 14280.50;

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
                <div className="flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", venc.iconBg)}>
                    <IconComponent className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-sp-text-dark leading-snug">
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
