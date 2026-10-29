import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Income, Expense, DailyExpense, AIPlan as AIPlanType, AIStrategy } from '../types';
import { Title, BrutalButton } from '../components/BrutalUI';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Calendar,
  Zap,
  Flame,
  Award,
  CheckCircle,
  Clock,
  TrendingDown,
  ArrowRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';

export const AIPlan = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [latestPlan, setLatestPlan] = useState<AIPlanType | null>(null);
  const [strategy, setStrategy] = useState<AIStrategy>('snowball');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedReport, setShowDetailedReport] = useState(false);

  const fetchAIPlanData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: plans } = await supabase
      .from('ai_plans')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (plans && plans.length > 0) {
      setLatestPlan(plans[0] as AIPlanType);
      setStrategy(plans[0].strategy as AIStrategy);
    }

    const [debtsData, incomesData, expensesData, dailyData] = await Promise.all([
      supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('incomes').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('expenses').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('daily_expenses').select('*').eq('userId', user.id),
    ]);
      
    if (debtsData.data) setDebts(debtsData.data as Debt[]);
    if (incomesData.data) setIncomes(incomesData.data as Income[]);
    if (expensesData.data) setExpenses(expensesData.data as Expense[]);
    if (dailyData.data) setDailyExpenses(dailyData.data as DailyExpense[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAIPlanData();
  }, []);

  // Financial calculations
  const totalDebt = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const monthlyIncome = incomes.reduce((acc, i) => {
    switch (i.frequency) {
      case 'weekly': return acc + (i.amount * 4.33);
      case 'biweekly': return acc + (i.amount * 2);
      case 'annual': return acc + (i.amount / 12);
      default: return acc + i.amount;
    }
  }, 0);
  const monthlyExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const monthlyDebtPayments = debts.reduce((acc, d) => acc + d.installmentAmount, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const fullMonthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const monthlyDailyTotal = dailyExpenses
    .filter(de => {
      const d = new Date(de.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, de) => acc + de.amount, 0);

  const freeCash = monthlyIncome - monthlyExpenses - monthlyDebtPayments - monthlyDailyTotal;

  // Calculate debt payoff simulation
  const simulatePayoff = () => {
    if (debts.length === 0 || freeCash <= 0) return [];

    const sortedDebts = [...debts].sort((a, b) => {
      if (strategy === 'snowball') return a.remainingAmount - b.remainingAmount;
      return b.interestRate - a.interestRate;
    });

    const simulation = sortedDebts.map(d => ({
      ...d,
      currentBalance: d.remainingAmount,
      monthsToPayoff: 0,
      totalInterest: 0,
      payoffDate: '',
    }));

    let availableExtra = freeCash;
    let monthCount = 0;
    const maxMonths = 360;

    while (simulation.some(d => d.currentBalance > 0) && monthCount < maxMonths) {
      monthCount++;

      for (const debt of simulation) {
        if (debt.currentBalance <= 0) continue;

        const interest = debt.currentBalance * (debt.interestRate / 100);
        debt.totalInterest += interest;
        debt.currentBalance += interest;

        const payment = Math.min(debt.installmentAmount + availableExtra, debt.currentBalance);
        debt.currentBalance -= payment;
        debt.currentBalance = Math.max(0, debt.currentBalance);

        if (debt.currentBalance <= 0) {
          debt.monthsToPayoff = monthCount;
          const payDate = new Date(currentYear, currentMonth + monthCount, 1);
          debt.payoffDate = `${monthNames[payDate.getMonth()]} ${payDate.getFullYear()}`;
          availableExtra += debt.installmentAmount;
        }
      }
    }

    return simulation;
  };

  const payoffSimulation = simulatePayoff();
  const totalInterest = payoffSimulation.reduce((acc, d) => acc + d.totalInterest, 0);
  const totalMonths = payoffSimulation.length > 0 ? Math.max(...payoffSimulation.map(d => d.monthsToPayoff)) : 0;

  const getFreedomDate = () => {
    if (debts.length === 0 || totalDebt <= 0) return 'Sem dívidas';
    if (freeCash <= 0) return 'Saldo insuficiente';
    const freedomDate = new Date(currentYear, currentMonth + totalMonths, 1);
    return `${fullMonthNames[freedomDate.getMonth()]} de ${freedomDate.getFullYear()}`;
  };

  const prioritizedQueue = [...debts].sort((a, b) => {
    if (strategy === 'snowball') return a.remainingAmount - b.remainingAmount;
    return b.interestRate - a.interestRate;
  });

  const generatePlan = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    setIsGenerating(true);
    const toastId = toast.loading('Calculando seu plano personalizado...');

    try {
      const [debtSnap, incomeSnap, expenseSnap, dailySnap] = await Promise.all([
        supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('incomes').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('expenses').select('*').eq('userId', user.id).eq('isActive', true),
        supabase.from('daily_expenses').select('*').eq('userId', user.id)
      ]);

      const debtsList = debtSnap.data as Debt[] || [];
      const incomesList = incomeSnap.data as Income[] || [];
      const expensesList = expenseSnap.data as Expense[] || [];
      const dailyList = dailySnap.data as DailyExpense[] || [];

      if (debtsList.length === 0 && incomesList.length === 0) {
        toast.error('Cadastre pelo menos uma receita ou dívida para calcular o plano.', { id: toastId });
        setIsGenerating(false);
        return;
      }

      const dayOfMonth = now.getDate();
      const avgDailySpend = dayOfMonth > 0 ? monthlyDailyTotal / dayOfMonth : 0;
      const projectedDailyExpenses = avgDailySpend * new Date(currentYear, currentMonth + 1, 0).getDate();

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          debts: debtsList,
          incomes: incomesList,
          expenses: expensesList,
          dailyExpenses: {
            monthlyTotal: monthlyDailyTotal,
            projectedMonthly: projectedDailyExpenses,
            avgDaily: avgDailySpend,
            entries: dailyList.slice(0, 30)
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor.');
      }

      const responseData = await response.json();

      await supabase.from('ai_plans').insert([{
        userId: user.id,
        strategy,
        planContent: responseData.planContent,
        monthlyIncome: responseData.monthlyIncome,
        monthlyExpenses: responseData.monthlyExpenses,
        freeCash: responseData.freeCash,
        isActive: true,
        createdAt: new Date().toISOString(),
      }]);

      toast.success('Plano gerado com sucesso!', { id: toastId });
      setShowDetailedReport(true);
      fetchAIPlanData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar plano.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-sp-purple border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      <div>
        <Title subtitle="PLANO DE ELIMINAÇÃO">Caminho para a Liberdade</Title>
      </div>

      {/* 1. RESUMO GERAL */}
      <div className="bg-gradient-to-br from-sp-purple to-indigo-600 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />
        
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Libertação Total em</p>
          <p className="text-2xl sm:text-3xl font-black mb-4">{getFreedomDate()}</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-white/60 uppercase">Total Dívidas</p>
              <p className="text-lg font-black">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-white/60 uppercase">Saldo Livre</p>
              <p className={cn("text-lg font-black", freeCash >= 0 ? "text-sp-mint" : "text-red-300")}>{formatCurrency(freeCash)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-white/60 uppercase">Juros Estimados</p>
              <p className="text-lg font-black text-amber-300">{formatCurrency(totalInterest)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-white/60 uppercase">Meses Restantes</p>
              <p className="text-lg font-black">{totalMonths > 0 ? `${totalMonths} meses` : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SELETOR DE ESTRATÉGIA */}
      <div className="bg-white border border-sp-border rounded-3xl p-4 shadow-sm">
        <p className="text-[10px] font-bold text-sp-text-subtle uppercase tracking-widest mb-3 px-1">Estratégia de Pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setStrategy('snowball')}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left",
              strategy === 'snowball'
                ? "border-sp-purple bg-sp-purple-light"
                : "border-sp-border hover:border-sp-purple/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className={cn("w-4 h-4", strategy === 'snowball' ? "text-sp-purple" : "text-sp-text-subtle")} />
              <span className="font-bold text-sm">Bola de Neve</span>
            </div>
            <p className="text-[11px] text-sp-text-sec">Menor saldo primeiro</p>
          </button>
          <button
            onClick={() => setStrategy('avalanche')}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left",
              strategy === 'avalanche'
                ? "border-sp-purple bg-sp-purple-light"
                : "border-sp-border hover:border-sp-purple/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame className={cn("w-4 h-4", strategy === 'avalanche' ? "text-sp-purple" : "text-sp-text-subtle")} />
              <span className="font-bold text-sm">Avalanche</span>
            </div>
            <p className="text-[11px] text-sp-text-sec">Maior juros primeiro</p>
          </button>
        </div>
      </div>

      {/* 3. PLANO DETALHADO POR DÍVIDA */}
      {payoffSimulation.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-sp-purple" />
            <h3 className="font-extrabold text-base text-sp-text-dark">Plano de Eliminação</h3>
          </div>

          {payoffSimulation.map((debt, idx) => {
            const progress = debt.remainingAmount > 0 
              ? ((debt.remainingAmount - debt.currentBalance) / debt.remainingAmount) * 100 
              : 100;
            const isCompleted = debt.currentBalance <= 0;
            
            return (
              <div key={debt.id} className={cn(
                "bg-white border rounded-3xl p-5 shadow-sm transition-all",
                isCompleted ? "border-sp-mint/30 bg-sp-mint/5" : "border-sp-border"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm",
                      isCompleted ? "bg-sp-mint" : "bg-sp-purple"
                    )}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-sp-text-dark">{debt.name}</h4>
                      <p className="text-[11px] text-sp-text-sec">Juros: {debt.interestRate}% a.m.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-sp-text-dark">{formatCurrency(debt.remainingAmount)}</p>
                    {isCompleted && (
                      <span className="text-[9px] font-bold text-sp-mint bg-sp-mint-light px-2 py-0.5 rounded-full">QUITADA</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", isCompleted ? "bg-sp-mint" : "bg-sp-purple")}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-text-subtle uppercase">Parcela</p>
                    <p className="text-xs font-bold text-sp-text-dark">{formatCurrency(debt.installmentAmount)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-text-subtle uppercase">Meses</p>
                    <p className="text-xs font-bold text-sp-text-dark">{debt.monthsToPayoff > 0 ? debt.monthsToPayoff : '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-text-subtle uppercase">Quitação</p>
                    <p className="text-xs font-bold text-sp-purple">{debt.payoffDate || '—'}</p>
                  </div>
                </div>

                {!isCompleted && freeCash > 0 && idx === 0 && (
                  <div className="mt-3 p-3 bg-sp-purple-light rounded-xl flex items-start gap-2">
                    <Zap className="w-4 h-4 text-sp-purple shrink-0 mt-0.5" />
                    <p className="text-[11px] text-sp-purple font-semibold leading-relaxed">
                      Foque toda a sua energia nesta dívida. Ao quitá-la, o valor da parcela ({formatCurrency(debt.installmentAmount)}) será redirecionado para a próxima.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. CRONOGRAMA MENSAL */}
      {payoffSimulation.length > 0 && totalMonths > 0 && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
          <h3 className="font-extrabold text-base text-sp-text-dark mb-4">Cronograma de Pagamento</h3>
          
          <div className="space-y-2">
            {Array.from({ length: Math.min(totalMonths, 12) }, (_, i) => {
              const monthDate = new Date(currentYear, currentMonth + i, 1);
              const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
              const isActive = i === 0;
              const isLast = i === Math.min(totalMonths, 12) - 1;
              
              const debtsThisMonth = payoffSimulation.filter(d => {
                const startMonth = currentMonth;
                const endMonth = d.monthsToPayoff;
                return i >= 0 && i < endMonth;
              });

              return (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  isActive ? "bg-sp-purple-light border border-sp-purple/20" : "bg-slate-50"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    isActive ? "bg-sp-purple text-white" : "bg-slate-200 text-sp-text-sec"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-sp-text-dark">{monthLabel}</p>
                    <p className="text-[10px] text-sp-text-sec truncate">
                      {debtsThisMonth.map(d => d.name).join(', ') || 'Sem pagamentos'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-sp-text-dark">
                      {formatCurrency(debtsThisMonth.reduce((acc, d) => acc + d.installmentAmount, 0))}
                    </p>
                  </div>
                </div>
              );
            })}
            {totalMonths > 12 && (
              <div className="text-center py-2">
                <span className="text-xs font-bold text-sp-text-subtle">+ {totalMonths - 12} meses restantes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DICAS RÁPIDAS */}
      {freeCash > 0 && debts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-extrabold text-sm text-amber-900">Dicas para Acelerar</h4>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">Reduza gastos diários em 10% e direcione o excedente para a dívida prioritária.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">Negocie taxas de juros com seus credores. Uma redução de 2% pode economizar {formatCurrency(totalDebt * 0.02)}.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">Busque renda extra para acelerar ainda mais a quitação.</p>
            </li>
          </ul>
        </div>
      )}

      {/* 6. GERAR RELATÓRIO IA */}
      <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6" />
        <div className="relative z-10 space-y-3 mb-5">
          <h3 className="text-lg font-extrabold">Relatório Completo com IA</h3>
          <p className="text-xs text-white/80 leading-relaxed">
            Nossa inteligência artificial analisa seus dados e cria um plano personalizado com ações específicas para cada dívida.
          </p>
        </div>
        <BrutalButton 
          onClick={generatePlan}
          className="w-full h-12 font-extrabold text-sp-purple bg-white border-transparent hover:bg-slate-50 shadow-md"
          isLoading={isGenerating}
        >
          <Sparkles className="w-5 h-5 mr-1" />
          Gerar Plano IA
        </BrutalButton>
      </div>

      {/* 7. RELATÓRIO DA IA */}
      {latestPlan && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sp-mint" />
              <h4 className="font-extrabold text-sm text-sp-text-dark">Relatório IA</h4>
            </div>
            <button 
              onClick={() => setShowDetailedReport(!showDetailedReport)}
              className="text-xs font-bold text-sp-purple hover:underline"
            >
              {showDetailedReport ? 'Ocultar' : 'Ver relatório'}
            </button>
          </div>

          {showDetailedReport && (
            <div className="custom-markdown bg-sp-bg p-4 rounded-2xl border border-sp-border max-h-[500px] overflow-y-auto">
              <ReactMarkdown>{latestPlan.planContent}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
