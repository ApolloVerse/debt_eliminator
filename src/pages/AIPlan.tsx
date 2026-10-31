import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Income, Expense, DailyExpense, AIPlan as AIPlanType, AIStrategy } from '../types';
import { generateEliminationPlan, getFinancialSnapshot, type DebtEliminationPlan, type FinancialSnapshot } from '../lib/aiEngine';
import { Title, BrutalButton } from '../components/BrutalUI';
import ReactMarkdown from 'react-markdown';
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
      {plan && plan.monthlyActions.length > 0 && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-sp-purple" />
            <h3 className="font-extrabold text-base text-sp-text-dark">O Que Fazer a Cada Mês</h3>
          </div>

          <div className="space-y-2">
            {plan.monthlyActions.slice(0, 18).map((action, i) => {
              const isExpanded = expandedMonth === i;
              const hasPaidOff = action.debtsPaidOff.length > 0;
              const isFirst = i === 0;

              return (
                <div key={i}>
                  <button
                    onClick={() => setExpandedMonth(isExpanded ? null : i)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer",
                      isFirst ? "bg-sp-purple-light border border-sp-purple/20" :
                      hasPaidOff ? "bg-emerald-50 border border-emerald-200" :
                      "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                      isFirst ? "bg-sp-purple text-white" :
                      hasPaidOff ? "bg-emerald-500 text-white" :
                      "bg-slate-200 text-sp-text-sec"
                    )}>
                      {hasPaidOff ? <CheckCircle className="w-4 h-4" /> : action.month}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-sp-text-dark">{action.monthLabel}</p>
                      <p className="text-[10px] text-sp-text-sec truncate">
                        {hasPaidOff
                          ? `🎉 Quita: ${action.debtsPaidOff.join(', ')}`
                          : `Pagando: ${action.debtsActive.slice(0, 2).join(', ')}${action.debtsActive.length > 2 ? '...' : ''}`
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <p className="text-xs font-bold text-sp-text-dark">{formatCurrency(action.totalPayment)}</p>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-sp-text-subtle" /> : <ChevronDown className="w-4 h-4 text-sp-text-subtle" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ml-11 mt-1 mb-2 p-3 bg-slate-50 rounded-xl text-[11px] space-y-1.5 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-sp-text-sec">💰 Pagamento total:</span>
                        <span className="font-bold">{formatCurrency(action.totalPayment)}</span>
                      </div>
                      {action.extraPayment > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sp-text-sec">⚡ Pagamento extra:</span>
                          <span className="font-bold text-sp-purple">{formatCurrency(action.extraPayment)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sp-text-sec">📉 Dívida restante:</span>
                        <span className="font-bold">{formatCurrency(action.remainingDebt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sp-text-sec">💵 Total pago até aqui:</span>
                        <span className="font-bold">{formatCurrency(action.cumulativePaid)}</span>
                      </div>
                      {action.debtsPaidOff.length > 0 && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-emerald-700 font-bold">
                          🎉 Dívida(s) eliminada(s): {action.debtsPaidOff.join(', ')}
                        </div>
                      )}
                      {action.debtsActive.length > 0 && (
                        <div className="text-sp-text-sec">
                          📋 Dívidas ativas: {action.debtsActive.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {plan.monthlyActions.length > 18 && (
              <div className="text-center py-2">
                <span className="text-xs font-bold text-sp-text-subtle">+ {plan.monthlyActions.length - 18} meses restantes</span>
              </div>
            )}
          </div>
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
            <div className="custom-markdown bg-sp-bg p-5 sm:p-7 rounded-2xl border border-sp-border max-h-[750px] overflow-y-auto leading-relaxed shadow-inner">
              <ReactMarkdown>{savedPlanContent}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
