import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Income, Expense, DailyExpense, AIPlan as AIPlanType, AIStrategy } from '../types';
import { generateEliminationPlan, getFinancialSnapshot, type DebtEliminationPlan, type FinancialSnapshot } from '../lib/aiEngine';
import { Title, BrutalButton } from '../components/BrutalUI';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  Zap,
  Flame,
  Award,
  CheckCircle,
  TrendingDown,
  Target,
  AlertCircle,
  FileText,
  BarChart3,
  Calendar,
  ArrowRight,
  DollarSign,
  Shield,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Heart,
  CircleDollarSign,
  Gauge,
  Copy,
  Check,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';

export const AIPlan = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [strategy, setStrategy] = useState<AIStrategy>('snowball');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullReport, setShowFullReport] = useState(false);
  const [savedPlanContent, setSavedPlanContent] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(0);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [showAllTimelineMonths, setShowAllTimelineMonths] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const [debtsData, incomesData, expensesData, dailyData, plansData] = await Promise.all([
      supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('incomes').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('expenses').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('daily_expenses').select('*').eq('userId', user.id),
      supabase.from('ai_plans').select('*').eq('userId', user.id).order('createdAt', { ascending: false }).limit(1),
    ]);

    if (debtsData.data) setDebts(debtsData.data as Debt[]);
    if (incomesData.data) setIncomes(incomesData.data as Income[]);
    if (expensesData.data) setExpenses(expensesData.data as Expense[]);
    if (dailyData.data) setDailyExpenses(dailyData.data as DailyExpense[]);
    if (plansData.data && plansData.data.length > 0) {
      const plan = plansData.data[0] as AIPlanType;
      setSavedPlanContent(plan.planContent);
      setStrategy(plan.strategy as AIStrategy);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Generate real-time elimination plan
  // Generate real-time elimination plan
  const plan: DebtEliminationPlan | null = useMemo(() => {
    if (debts.length === 0 && incomes.length === 0 && expenses.length === 0) return null;
    return generateEliminationPlan(debts, incomes, expenses, dailyExpenses, strategy);
  }, [debts, incomes, expenses, dailyExpenses, strategy]);

  const snapshot: FinancialSnapshot | null = useMemo(() => {
    if (debts.length === 0 && incomes.length === 0 && expenses.length === 0) return null;
    return getFinancialSnapshot(debts, incomes, expenses, dailyExpenses);
  }, [debts, incomes, expenses, dailyExpenses]);

  const handleCopyReport = () => {
    if (!savedPlanContent) return;
    navigator.clipboard.writeText(savedPlanContent);
    setCopied(true);
    toast.success('Relatório copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const generateAndSavePlan = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      toast.error('Você precisa estar autenticado para gerar o relatório.');
      return;
    }
    if (!plan && debts.length === 0 && incomes.length === 0) {
      toast.error('Cadastre receitas, despesas ou dívidas para gerar a análise.');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Gerando análise financeira e estratégias de eliminação...');

    try {
      // Try the Groq API first, fallback to comprehensive client-side engine
      let planContent = plan?.monthlyReport || '';

      try {
        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strategy,
            debts: debts.filter(d => d.isActive),
            incomes: incomes.filter(i => i.isActive),
            expenses: expenses.filter(e => e.isActive),
            dailyExpenses: {
              monthlyTotal: snapshot?.monthlyDailyExpenses || 0,
              projectedMonthly: snapshot?.monthlyDailyExpenses || 0,
              avgDaily: (snapshot?.monthlyDailyExpenses || 0) / 30,
              entries: dailyExpenses.slice(0, 30),
            }
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.planContent && data.planContent.length > 100) {
            planContent = data.planContent;
          }
        }
      } catch {
        // Fallback to client-side engine (already generated in planContent)
      }

      if (!planContent && plan) {
        planContent = plan.monthlyReport;
      }

      await supabase.from('ai_plans').insert([{
        userId: user.id,
        strategy,
        planContent,
        monthlyIncome: snapshot?.monthlyIncome || 0,
        monthlyExpenses: snapshot?.monthlyFixedExpenses || 0,
        freeCash: snapshot?.freeCash || 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      }]);

      setSavedPlanContent(planContent);
      setShowFullReport(true);
      toast.success('Relatório completo e estratégias geradas com sucesso!', { id: toastId });

      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
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

  if (!snapshot && debts.length === 0 && incomes.length === 0) return (
    <div className="space-y-5 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <Title subtitle="CONSULTOR FINANCEIRO IA">Plano de Eliminação</Title>
      <div className="bg-white border border-sp-border rounded-3xl p-8 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-sp-text-subtle mx-auto mb-4" />
        <h3 className="text-lg font-extrabold text-sp-text-dark mb-2">Sem dados suficientes</h3>
        <p className="text-sm text-sp-text-sec leading-relaxed max-w-sm mx-auto">
          Cadastre suas <strong>receitas</strong>, <strong>dívidas</strong> e <strong>despesas</strong> para que a IA possa gerar um plano personalizado de eliminação de dívidas.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <Title subtitle="CONSULTOR FINANCEIRO IA">Plano de Eliminação</Title>

      {/* ═══════════════════════════════════════════ */}
      {/* 1. HEALTH SCORE CARD */}
      {/* ═══════════════════════════════════════════ */}
      {snapshot && (
        <div className={cn(
          "rounded-3xl p-6 shadow-lg relative overflow-hidden text-white",
          snapshot.healthStatus === 'critical' ? "bg-gradient-to-br from-red-600 to-red-800" :
          snapshot.healthStatus === 'danger' ? "bg-gradient-to-br from-orange-600 to-red-700" :
          snapshot.healthStatus === 'warning' ? "bg-gradient-to-br from-amber-600 to-orange-700" :
          snapshot.healthStatus === 'caution' ? "bg-gradient-to-br from-yellow-600 to-amber-700" :
          "bg-gradient-to-br from-emerald-600 to-green-700"
        )}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full -ml-10 -mb-10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Diagnóstico Financeiro</p>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-1">{snapshot.healthLabel}</h2>
            <p className="text-xs text-white/70 mb-4">
              Comprometimento: {snapshot.commitmentPercentage.toFixed(1)}% da renda
            </p>

            {/* Health bar */}
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden mb-5">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-1000"
                style={{ width: `${Math.min(100, snapshot.commitmentPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-[10px] font-bold text-white/60 uppercase">Total Dívidas</p>
                <p className="text-lg font-black">{formatCurrency(snapshot.totalDebt)}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-[10px] font-bold text-white/60 uppercase">Receita</p>
                <p className="text-lg font-black">{formatCurrency(snapshot.monthlyIncome)}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-[10px] font-bold text-white/60 uppercase">Saldo Livre</p>
                <p className={cn("text-lg font-black", snapshot.freeCash >= 0 ? "text-emerald-200" : "text-red-200")}>
                  {formatCurrency(snapshot.freeCash)}
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-[10px] font-bold text-white/60 uppercase">Meses p/ Liberdade</p>
                <p className="text-lg font-black">{plan?.totalMonths || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 2. FREEDOM DATE */}
      {/* ═══════════════════════════════════════════ */}
      {plan && plan.totalMonths > 0 && (
        <div className="bg-gradient-to-br from-sp-purple to-indigo-600 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Liberdade Financeira em</p>
              <p className="text-2xl sm:text-3xl font-black">{plan.freedomDate}</p>
              <p className="text-xs text-white/70 mt-0.5">{plan.totalMonths} meses seguindo o plano com disciplina</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 3. STRATEGY SELECTOR */}
      {/* ═══════════════════════════════════════════ */}
      <div className="bg-white border border-sp-border rounded-3xl p-4 shadow-sm">
        <p className="text-[10px] font-bold text-sp-text-subtle uppercase tracking-widest mb-3 px-1">Estratégia de Pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setStrategy('snowball')}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left cursor-pointer",
              strategy === 'snowball'
                ? "border-sp-purple bg-sp-purple-light"
                : "border-sp-border hover:border-sp-purple/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className={cn("w-4 h-4", strategy === 'snowball' ? "text-sp-purple" : "text-sp-text-subtle")} />
              <span className="font-bold text-sm">Bola de Neve</span>
            </div>
            <p className="text-[11px] text-sp-text-sec">Menor saldo primeiro — vitórias rápidas</p>
          </button>
          <button
            onClick={() => setStrategy('avalanche')}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left cursor-pointer",
              strategy === 'avalanche'
                ? "border-sp-purple bg-sp-purple-light"
                : "border-sp-border hover:border-sp-purple/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame className={cn("w-4 h-4", strategy === 'avalanche' ? "text-sp-purple" : "text-sp-text-subtle")} />
              <span className="font-bold text-sm">Avalanche</span>
            </div>
            <p className="text-[11px] text-sp-text-sec">Maior juros primeiro — economia máxima</p>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 4. DEBT ELIMINATION QUEUE */}
      {/* ═══════════════════════════════════════════ */}
      {plan && plan.payoffQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Target className="w-5 h-5 text-sp-purple" />
            <h3 className="font-extrabold text-base text-sp-text-dark">Ordem de Eliminação</h3>
          </div>

          {plan.payoffQueue.map((debt, idx) => {
            const progress = debt.originalBalance > 0
              ? ((debt.totalPaid - debt.totalInterestPaid) / debt.originalBalance) * 100
              : 0;

            return (
              <div key={debt.id} className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm",
                      idx === 0 ? "bg-sp-purple" : "bg-slate-400"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-sp-text-dark">{debt.name}</h4>
                      <p className="text-[11px] text-sp-text-sec">Juros: {debt.interestRate}% a.m.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-sp-text-dark">{formatCurrency(debt.originalBalance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-text-subtle uppercase">Parcela</p>
                    <p className="text-xs font-bold text-sp-text-dark">{formatCurrency(debt.installmentAmount)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-text-subtle uppercase">Tempo</p>
                    <p className="text-xs font-bold text-sp-text-dark">{debt.monthsToPayoff > 0 ? `${debt.monthsToPayoff} meses` : '—'}</p>
                  </div>
                  <div className="bg-sp-purple-light rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-sp-purple uppercase">Quitação</p>
                    <p className="text-xs font-bold text-sp-purple">{debt.payoffDate}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-sp-text-sec font-semibold">Juros que serão pagos:</span>
                  <span className="font-bold text-amber-600">{formatCurrency(debt.totalInterestPaid)}</span>
                </div>

                {idx === 0 && snapshot && snapshot.freeCash > 0 && (
                  <div className="mt-3 p-3 bg-sp-purple-light rounded-xl flex items-start gap-2">
                    <Zap className="w-4 h-4 text-sp-purple shrink-0 mt-0.5" />
                    <p className="text-[11px] text-sp-purple font-semibold leading-relaxed">
                      <strong>FOCO AQUI!</strong> Direcione todo saldo livre ({formatCurrency(snapshot.freeCash)}/mês) para esta dívida. Ao quitá-la, a parcela de {formatCurrency(debt.installmentAmount)} será redirecionada para a próxima.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 5. MONTHLY ACTION TIMELINE */}
      {/* ═══════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════ */}
      {/* 5. MONTHLY ACTION TIMELINE */}
      {/* ═══════════════════════════════════════════ */}
      {plan && plan.monthlyActions.length > 0 && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 sm:p-6 shadow-sm">
          {/* Header with Title and Open/Close Mechanism */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-sp-purple flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-sp-text-dark">O Que Fazer a Cada Mês</h3>
                  <span className="px-2 py-0.5 rounded-full bg-sp-purple/10 text-sp-purple text-[10px] font-extrabold">
                    {plan.monthlyActions.length} {plan.monthlyActions.length === 1 ? 'mês' : 'meses'}
                  </span>
                </div>
                <p className="text-[11px] text-sp-text-sec">
                  Mecanismo: Receita ➔ (-) Desp. Fixas ➔ Disp. p/ Dívidas ➔ Quitação
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isTimelineOpen && plan.monthlyActions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllTimelineMonths(!showAllTimelineMonths)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-sp-text-sec bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  {showAllTimelineMonths ? 'Ver 3 Primeiros' : `Ver Todos (${plan.monthlyActions.length})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sp-purple/20 text-xs font-bold text-sp-purple bg-sp-purple-light hover:bg-sp-purple/15 transition-all cursor-pointer"
              >
                <span>{isTimelineOpen ? 'Recolher' : 'Visualizar'}</span>
                {isTimelineOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Timeline Body when open */}
          {isTimelineOpen ? (
            <div className="space-y-3">
              {/* Educational Rule Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-sp-text-sec">
                  <span className="font-extrabold text-sp-text-dark">Regra de Ouro Mensal:</span>
                  <span>Receita entra ➔ Separa despesas fixas de sobrevivência ➔ Sobra vai para dívidas</span>
                </div>
                <div className="text-[10px] text-sp-purple font-black uppercase tracking-wider">
                  {strategy === 'snowball' ? 'Método Bola de Neve' : 'Método Avalanche'}
                </div>
              </div>

              {/* Month Cards */}
              <div className="space-y-2.5">
                {(showAllTimelineMonths ? plan.monthlyActions : plan.monthlyActions.slice(0, 3)).map((action, i) => {
                  const isExpanded = expandedMonth === i;
                  const hasPaidOff = action.debtsPaidOff.length > 0;
                  const isFirst = i === 0;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-2xl transition-all border",
                        isExpanded ? "border-sp-purple/30 shadow-2xs bg-white" : "border-slate-100 bg-slate-50/70 hover:bg-slate-50"
                      )}
                    >
                      <button
                        onClick={() => setExpandedMonth(isExpanded ? null : i)}
                        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                          hasPaidOff ? "bg-emerald-500 text-white" :
                          isFirst ? "bg-sp-purple text-white" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {hasPaidOff ? <CheckCircle className="w-4 h-4" /> : action.month}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-extrabold text-sp-text-dark">{action.monthLabel}</p>
                            {hasPaidOff && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                🎉 Quita {action.debtsPaidOff[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="text-emerald-700 font-bold">+{formatCurrency(action.monthlyIncome)}</span>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">-{formatCurrency(action.monthlyFixedExpenses)} fixas</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-bold">Disp: {formatCurrency(action.netAfterFixed)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <p className="text-xs font-black text-sp-text-dark">{formatCurrency(action.totalPayment)}</p>
                            <p className="text-[10px] text-slate-400">pago no mês</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-sp-purple" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 pt-0 border-t border-slate-100/80 text-[11px] space-y-3 mt-1">
                          {/* 3 Step Waterfall Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">1. Receita Prevista</span>
                              <p className="text-xs font-black text-emerald-600">+{formatCurrency(action.monthlyIncome)}</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">2. (-) Despesas Fixas</span>
                              <p className="text-xs font-black text-rose-500">-{formatCurrency(action.monthlyFixedExpenses)}</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">3. (=) Disp. p/ Dívidas</span>
                              <p className="text-xs font-black text-indigo-600">={formatCurrency(action.netAfterFixed)}</p>
                            </div>
                          </div>

                          {/* Breakdown of Payments */}
                          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">💳 Total Pago em Dívidas no Mês:</span>
                              <span className="font-black text-slate-900">{formatCurrency(action.totalPayment)}</span>
                            </div>
                            {action.extraPayment > 0 && (
                              <div className="flex justify-between items-center text-sp-purple font-bold">
                                <span>⚡ Acelerador Extra (Amortização Prioritária):</span>
                                <span>+{formatCurrency(action.extraPayment)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-emerald-700 font-bold">
                              <span>💰 Saldo Livre Restante de Caixa:</span>
                              <span>+{formatCurrency(action.netSavings)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                              <span className="text-slate-600">📉 Dívida Restante Acumulada:</span>
                              <span className="font-black text-rose-600">{formatCurrency(action.remainingDebt)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>💵 Total Acumulado Pago até aqui:</span>
                              <span className="font-bold">{formatCurrency(action.cumulativePaid)}</span>
                            </div>
                          </div>

                          {/* Celebratory badge if debt paid off */}
                          {action.debtsPaidOff.length > 0 && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>🎉 Dívida Eliminada neste mês: {action.debtsPaidOff.join(', ')}! A parcela liberada acelerará a próxima dívida.</span>
                            </div>
                          )}

                          {action.debtsActive.length > 0 && (
                            <p className="text-[10px] text-slate-500">
                              📋 Dívidas ativas sendo pagas: {action.debtsActive.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Toggle to show more or less months */}
              {plan.monthlyActions.length > 3 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllTimelineMonths(!showAllTimelineMonths)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sp-text-dark rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-98"
                  >
                    {showAllTimelineMonths ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-sp-purple" />
                        <span>Recolher para os 3 primeiros meses</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-sp-purple" />
                        <span>Visualizar todos os {plan.monthlyActions.length} meses do cronograma</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs font-medium text-sp-text-sec mb-2">
                O cronograma contém {plan.monthlyActions.length} meses de execução calculados mês a mês.
              </p>
              <button
                type="button"
                onClick={() => setIsTimelineOpen(true)}
                className="px-4 py-2 bg-sp-purple text-white rounded-xl text-xs font-bold hover:bg-sp-purple-dark transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Visualizar Cronograma Completo</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 6. QUICK RECOMMENDATIONS */}
      {/* ═══════════════════════════════════════════ */}
      {snapshot && snapshot.freeCash > 0 && debts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-extrabold text-sm text-amber-900">Ações Imediatas para Acelerar</h4>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Pague as parcelas mínimas de todas as dívidas</strong> para evitar atrasos e juros extras.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Todo saldo livre ({formatCurrency(snapshot.freeCash)})</strong> deve ir para a 1ª dívida prioritária: <strong>{plan?.payoffQueue[0]?.name || 'dívida principal'}</strong>.
              </p>
            </li>
            {snapshot.monthlyDailyExpenses > 0 && (
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Corte 15% dos gastos diários</strong> e economize {formatCurrency(snapshot.monthlyDailyExpenses * 0.15)}/mês extra para as dívidas.
                </p>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{snapshot.monthlyDailyExpenses > 0 ? '4' : '3'}</span>
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Ao quitar cada dívida</strong>, redirecione a parcela liberada para a próxima dívida na fila — efeito {strategy === 'snowball' ? 'bola de neve' : 'avalanche'}.
              </p>
            </li>
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 7. GENERATE FULL AI REPORT */}
      {/* ═══════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-sp-purple via-indigo-700 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden border border-purple-400/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 space-y-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-white fill-current" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">Gerar Relatório Completo com IA</h3>
              <p className="text-xs text-white/80 font-medium">Diagnóstico financeiro profundo, fontes de renda, despesas futuras e plano de quitação</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed max-w-2xl">
            Clique no botão abaixo para gerar uma análise completa: detalhamento das receitas atuais e futuras (de onde está vindo o dinheiro), raio-x de todas as despesas e parcelas de dívidas futuras, manual de postura comportamental personalizada para o seu cenário e estratégias simples e sofisticadas para eliminar suas dívidas o mais rápido possível.
          </p>
        </div>
        <BrutalButton
          onClick={generateAndSavePlan}
          className="w-full h-13 font-black text-sm uppercase tracking-wider text-sp-purple bg-white hover:bg-slate-50 border-transparent shadow-xl transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
          isLoading={isGenerating}
        >
          <FileText className="w-5 h-5 mr-1" />
          Gerar Relatório Completo
        </BrutalButton>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 8. SAVED AI REPORT */}
      {/* ═══════════════════════════════════════════ */}
      {savedPlanContent && (
        <div ref={reportRef} id="relatorio-completo" className="bg-white border border-sp-border rounded-3xl p-5 sm:p-7 shadow-sm scroll-mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sp-border pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h4 className="font-extrabold text-base sm:text-lg text-sp-text-dark leading-tight">
                  Relatório Financeiro Completo & Estratégia de Eliminação
                </h4>
                <p className="text-[11px] text-sp-text-sec">
                  Documento analítico gerado sob medida para o seu orçamento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sp-border text-xs font-bold text-sp-text-dark bg-white hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Copiar relatório em texto Markdown"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-sp-purple" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sp-border text-xs font-bold text-sp-text-dark bg-white hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Imprimir ou Salvar como PDF"
              >
                <Printer className="w-3.5 h-3.5 text-sp-purple" />
                <span className="hidden sm:inline">Imprimir / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFullReport(!showFullReport)}
                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-sp-purple text-xs font-extrabold transition-all cursor-pointer"
              >
                {showFullReport ? 'Recolher' : 'Expandir Relatório'}
              </button>
            </div>
          </div>

          {/* KPI Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-sp-text-sec block">Receitas Atuais</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                {formatCurrency(snapshot?.monthlyIncome || 0)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-sp-text-sec block">Despesas Fixas</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800">
                {formatCurrency(snapshot?.monthlyFixedExpenses || 0)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-sp-text-sec block">Total em Dívidas</span>
              <span className="text-sm sm:text-base font-extrabold text-sp-red-text">
                {formatCurrency(snapshot?.totalDebt || 0)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-sp-text-sec block">Saldo Livre Líquido</span>
              <span className={cn(
                "text-sm sm:text-base font-extrabold",
                (snapshot?.freeCash || 0) >= 0 ? "text-sp-purple" : "text-rose-600"
              )}>
                {formatCurrency(snapshot?.freeCash || 0)}
              </span>
            </div>
          </div>

          {showFullReport && (
            <div className="custom-markdown bg-sp-bg p-5 sm:p-8 rounded-2xl border border-sp-border max-h-[800px] overflow-y-auto leading-relaxed shadow-inner">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-5 rounded-2xl border border-sp-border shadow-2xs bg-white">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-slate-100/90 text-slate-900 font-extrabold border-b border-sp-border" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-slate-800 whitespace-nowrap" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium text-xs sm:text-sm" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-purple-50/30 transition-colors" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-xl sm:text-2xl font-black text-sp-purple border-b-2 border-purple-200 pb-3 mt-8 mb-5 flex items-center gap-2" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-base sm:text-lg font-black text-slate-900 border-b border-sp-border pb-2.5 mt-8 mb-4 flex items-center gap-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 mt-6 mb-3" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-xs sm:text-sm text-sp-text-sec leading-relaxed mb-4 font-normal" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside space-y-2 mb-5 text-xs sm:text-sm text-sp-text-sec pl-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-5 text-xs sm:text-sm text-sp-text-sec pl-2" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-sp-purple bg-purple-50/70 p-4 my-5 rounded-r-2xl text-xs sm:text-sm text-purple-950 font-medium shadow-2xs leading-relaxed" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-6 border-sp-border" {...props} />
                  ),
                }}
              >
                {savedPlanContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
