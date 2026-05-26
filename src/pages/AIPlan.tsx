import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Debt, Income, Expense, AIPlan as AIPlanType, AIStrategy } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel } from '../components/BrutalUI';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  ChevronRight, 
  Calendar,
  Zap,
  Flame,
  Award,
  Lightbulb,
  ArrowRight,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

export const AIPlan = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [latestPlan, setLatestPlan] = useState<AIPlanType | null>(null);
  const [strategy, setStrategy] = useState<AIStrategy>('snowball');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedReport, setShowDetailedReport] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Listen for latest saved plan
    const qPlan = query(
      collection(db, 'aiPlans'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubPlan = onSnapshot(qPlan, (s) => {
      if (!s.empty) {
        setLatestPlan({ id: s.docs[0].id, ...s.docs[0].data() } as AIPlanType);
        setStrategy(s.docs[0].data().strategy as AIStrategy);
      }
      setIsLoading(false);
    });

    // 2. Fetch debts for the dynamic priority queue
    const qDebts = query(
      collection(db, 'debts'), 
      where('userId', '==', user.uid), 
      where('isActive', '==', true)
    );
    const unsubDebts = onSnapshot(qDebts, (s) => {
      setDebts(s.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    });

    return () => {
      unsubPlan();
      unsubDebts();
    };
  }, []);

  const generatePlan = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setIsGenerating(true);
    const toastId = toast.loading('Sua IA está calculando estratégias financeiras...');

    try {
      // Gather dynamic data records
      const qDebts = query(collection(db, 'debts'), where('userId', '==', user.uid), where('isActive', '==', true));
      const qIncomes = query(collection(db, 'incomes'), where('userId', '==', user.uid), where('isActive', '==', true));
      const qExpenses = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('isActive', '==', true));

      const [debtSnap, incomeSnap, expenseSnap] = await Promise.all([
        getDocs(qDebts), getDocs(qIncomes), getDocs(qExpenses)
      ]);

      const debtsList = debtSnap.docs.map(d => ({ id: d.id, ...d.data() } as Debt));
      const incomesList = incomeSnap.docs.map(d => d.data() as Income);
      const expensesList = expenseSnap.docs.map(d => d.data() as Expense);

      if (debtsList.length === 0) {
        toast.error('Cadastre pelo menos uma dívida para calcular o plano.', { id: toastId });
        setIsGenerating(false);
        return;
      }

      // Secure backend call
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategy,
          debts: debtsList,
          incomes: incomesList,
          expenses: expensesList
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no processamento do servidor de inteligência artificial.');
      }

      const responseData = await response.json();
      const planContent = responseData.planContent;

      const planPayload = {
        userId: user.uid,
        strategy,
        planContent,
        monthlyIncome: responseData.monthlyIncome,
        monthlyExpenses: responseData.monthlyExpenses,
        freeCash: responseData.freeCash,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'aiPlans'), planPayload);
      toast.success('Seu caminho estratégico com IA foi gerado com sucesso!', { id: toastId });
      setShowDetailedReport(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao acionar motor de inteligência artificial.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate strategic priority order lists based on chosen strategy
  const prioritizedQueue = [...debts].sort((a, b) => {
    if (strategy === 'snowball') {
      return a.remainingAmount - b.remainingAmount; // low to high (Snowball)
    } else {
      return b.interestRate - a.interestRate; // high to low interest (Avalanche)
    }
  });

  // Mock initial priority list matching mockup Image 4 precisely if none in database
  const demoPriorities = [
    {
      id: 'p1',
      name: 'Nubank Platinum',
      amount: 1240.00,
      detail: 'Juros: 14.5% a.m.',
      badge: 'Alvo Atual',
      badgeClass: 'bg-sp-purple-light text-sp-purple border border-purple-100',
    },
    {
      id: 'p2',
      name: 'Financiamento Auto',
      amount: 22400.00,
      detail: 'Próximo na fila • 1.9% a.m.',
      badge: 'Aguardando',
      badgeClass: 'bg-slate-100 text-sp-text-sec',
    },
    {
      id: 'p3',
      name: 'Crédito Educativo',
      amount: 8900.00,
      detail: 'Longo prazo • 0.8% a.m.',
      badge: 'Longo Prazo',
      badgeClass: 'bg-slate-100 text-sp-text-subtle',
    },
  ];

  const finalPriorityList = prioritizedQueue.length > 0 
    ? prioritizedQueue.map((d, idx) => ({
        id: d.id,
        name: d.name,
        amount: d.remainingAmount,
        detail: `Taxa Juros: ${d.interestRate}% a.m.`,
        badge: idx === 0 ? 'Alvo Atual' : 'Aguardando',
        badgeClass: idx === 0 
          ? 'bg-sp-purple-light text-sp-purple border border-purple-100' 
          : 'bg-slate-100 text-sp-text-sec',
      }))
    : demoPriorities;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-sp-purple border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* Page header */}
      <div>
        <Title subtitle="ESTRATÉGIA">Caminho para a Liberdade</Title>
      </div>

      {/* 1. LIBERDADE FINANCEIRA EM CARD */}
      <div className="bg-white border-2 border-sp-purple rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold text-sp-text-sec uppercase tracking-widest block mb-1">
            LIBERDADE FINANCEIRA EM
          </span>
          <p className="text-xl sm:text-2xl font-black text-sp-purple leading-tight">
            Março de 2026
          </p>
        </div>
        <div className="w-12 h-12 bg-sp-purple-light text-sp-purple rounded-2xl flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6 stroke-[2]" />
        </div>
      </div>

      {/* 2. DUAL STRATEGY SELECTORS */}
      <div className="space-y-3.5">
        
        {/* bola de neve selector */}
        <div 
          onClick={() => setStrategy('snowball')}
          className={cn(
            "p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none flex items-center justify-between",
            strategy === 'snowball' 
              ? "bg-white border-sp-purple shadow-md shadow-sp-purple/5" 
              : "bg-white border-sp-border opacity-75 hover:opacity-100"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center",
              strategy === 'snowball' ? "bg-sp-purple text-white" : "bg-slate-100 text-sp-text-sec"
            )}>
              <Award className="w-5.5 h-5.5" />
            </div>
            <div className="pr-4">
              <h3 className="font-extrabold text-sm text-sp-text-dark">Bola de Neve</h3>
              <p className="text-xs text-sp-text-sec mt-0.5 leading-relaxed max-w-xs sm:max-w-md">
                Pague a menor dívida primeiro. Ganhe motivação psicológica com vitórias rápidas.
              </p>
            </div>
          </div>
          <div className={cn(
            "w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0",
            strategy === 'snowball' ? "border-sp-purple" : "border-slate-300"
          )}>
            {strategy === 'snowball' && <span className="w-3 h-3 bg-sp-purple rounded-full" />}
          </div>
        </div>

        {/* avalanche selector */}
        <div 
          onClick={() => setStrategy('avalanche')}
          className={cn(
            "p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none flex items-center justify-between",
            strategy === 'avalanche' 
              ? "bg-white border-sp-purple shadow-md shadow-sp-purple/5" 
              : "bg-white border-sp-border opacity-75 hover:opacity-100"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center",
              strategy === 'avalanche' ? "bg-sp-purple text-white" : "bg-slate-100 text-sp-text-sec"
            )}>
              <Flame className="w-5.5 h-5.5" />
            </div>
            <div className="pr-4">
              <h3 className="font-extrabold text-sm text-sp-text-dark">Avalanche</h3>
              <p className="text-xs text-sp-text-sec mt-0.5 leading-relaxed max-w-xs sm:max-w-md">
                Pague a dívida com maior juros primeiro. Economize o máximo de dinheiro a longo prazo.
              </p>
            </div>
          </div>
          <div className={cn(
            "w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0",
            strategy === 'avalanche' ? "border-sp-purple" : "border-slate-300"
          )}>
            {strategy === 'avalanche' && <span className="w-3 h-3 bg-sp-purple rounded-full" />}
          </div>
        </div>

      </div>

      {/* 3. OTIMIZAÇÃO POR IA PURPLE INSIGHT PANEL */}
      <div className="bg-gradient-to-br from-[#7F3DFF]/10 to-indigo-50 border border-purple-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5.5 h-5.5 text-sp-purple fill-current" />
          <h4 className="font-extrabold text-sm text-sp-purple uppercase tracking-wider">
            Otimização por IA
          </h4>
        </div>
        <div className="space-y-3.5">
          <h3 className="text-lg font-extrabold text-sp-text-dark">
            Como a IA trabalha por você?
          </h3>
          <p className="text-sm text-sp-text-sec leading-relaxed">
            Nossa inteligência analisa as taxas de juros flutuantes e prazos de carência para sugerir o momento exato de negociar. No modo atual, estamos priorizando sua <span className="font-bold text-sp-purple">saúde emocional</span>.
          </p>

          {/* Sparkles quote card underneath */}
          <div className="p-4 bg-white/95 rounded-2xl border border-purple-100 shadow-sm flex items-start gap-3">
            <Lightbulb className="w-5.5 h-5.5 text-sp-purple shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 leading-relaxed font-bold">
              IA sugere: Antecipar a parcela do Cartão Nubank economiza R$ 42,00 em juros este mês.
            </p>
          </div>
        </div>
      </div>

      {/* 4. DRAGGABLE OR PRIORITY ORDER QUEUE LIST */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-sp-text-dark">
              Ordem de Prioridade
            </h3>
            <p className="text-xs text-sp-text-sec mt-0.5 font-medium">
              Lista ordenada conforme a estratégia ativa
            </p>
          </div>
          <span className="text-[10px] font-bold py-1 px-3 bg-sp-mint-light text-sp-mint rounded-full uppercase tracking-wider border border-emerald-100">
            Gerado pela IA
          </span>
        </div>

        <div className="relative pl-6 space-y-4 border-l-2 border-sp-purple/20">
          {finalPriorityList.map((item, idx) => (
            <div key={item.id} className="relative flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-sp-border rounded-2xl transition-all duration-200">
              
              {/* Floating number indices */}
              <div className="absolute left-0 -translate-x-[35px] top-1/2 -translate-y-1/2 w-7.5 h-7.5 rounded-full bg-sp-purple text-white border-4 border-white flex items-center justify-center font-bold text-xs shadow-sm">
                {idx + 1}
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-sp-text-dark leading-snug">
                  {item.name}
                </h4>
                <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                  {item.detail}
                </p>
              </div>

              <div className="text-right">
                <div className="font-extrabold text-sm text-sp-text-dark">
                  {formatCurrency(item.amount)}
                </div>
                <span className={cn("text-[9px] font-bold px-2 py-0.5 mt-1 inline-block rounded-full uppercase tracking-wider", item.badgeClass)}>
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. QUOTE BOTTOM ACTION CARD */}
      <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
        <div className="space-y-3 mb-6">
          <blockquote className="text-base sm:text-lg font-extrabold leading-snug">
            "O sucesso financeiro não é sobre o quanto você ganha, mas sobre o quanto você domina."
          </blockquote>
          <p className="text-xs text-white/80 leading-relaxed font-semibold">
            Você já reduziu seu endividamento em 12% nos últimos 3 meses. Continue seguindo o plano e em breve o seu dinheiro trabalhará para você, não contra você.
          </p>
        </div>

        <BrutalButton 
          onClick={generatePlan}
          className="w-full h-14 font-extrabold text-[#7F3DFF] bg-white border-transparent hover:bg-slate-50 relative overflow-hidden group shadow-md"
          isLoading={isGenerating}
        >
          <Sparkles className="w-5 h-5 mr-1 text-[#7F3DFF]" />
          Recalcular com IA
        </BrutalButton>
      </div>

      {/* AI GENERATED MARKOVN BODY ACCORDION DISPLAY */}
      {latestPlan && (
        <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-sp-border">
            <div className="flex gap-2 items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sp-mint" />
              <h4 className="font-extrabold text-sm text-sp-text-dark uppercase tracking-wider">
                Relatório Geral IA Ativo
              </h4>
            </div>
            <button 
              onClick={() => setShowDetailedReport(!showDetailedReport)}
              className="text-xs font-bold text-sp-purple hover:underline"
            >
              {showDetailedReport ? 'Esconder' : 'Exibir Relatório'}
            </button>
          </div>

          {showDetailedReport && (
            <div className="prose max-w-none custom-markdown bg-sp-bg p-5 rounded-2xl border border-sp-border">
              <ReactMarkdown>{latestPlan.planContent}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
