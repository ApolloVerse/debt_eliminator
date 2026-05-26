import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { PaymentLog } from '../types';
import { Title, BrutalCard, BrutalButton } from '../components/BrutalUI';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Award, 
  Sparkles, 
  CheckCircle, 
  HelpCircle,
  Clock,
  Check,
  ChevronRight,
  TrendingDown,
  ChevronLeft
} from 'lucide-react';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

export const History = () => {
  const [, setLocation] = useLocation();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Listen to real payment logs
    const qLogs = query(
      collection(db, 'paymentLogs'), 
      where('userId', '==', user.uid),
      orderBy('paymentDate', 'desc')
    );
    return onSnapshot(qLogs, (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // Evolution chart data mimicking Image 2 curve (going down over months)
  const reductionData = [
    { name: 'Jan', Dívida: 25000 },
    { name: 'Fev', Dívida: 24700 },
    { name: 'Mar', Dívida: 22000 },
    { name: 'Abr', Dívida: 18500 },
    { name: 'Mai', Dívida: 15300 },
    { name: 'Jun', Dívida: 12550 },
  ];

  // Mock checklist payments matching image 2 exactly
  const mockRecentPayments = [
    {
      id: 'p1',
      title: 'Acordo Banco Itaú',
      subtitle: 'Parcela 04/12 • Ontem, 14:30',
      amount: 450.00,
      status: 'CONCLUÍDO',
      statusClass: 'bg-emerald-50 text-sp-mint border border-emerald-100',
      icon: CheckCircle,
      iconColor: 'text-sp-mint bg-emerald-50',
    },
    {
      id: 'p2',
      title: 'Cartão de Crédito - XP',
      subtitle: 'Quitação única • 12 Jun, 09:15',
      amount: 2120.50,
      status: 'QUITADO',
      statusClass: 'bg-emerald-50 text-sp-mint border border-emerald-100',
      icon: CheckCircle,
      iconColor: 'text-sp-mint bg-[#F4F0FF]',
    },
    {
      id: 'p3',
      title: 'Empréstimo Pessoal - Bradesco',
      subtitle: 'Parcela 08/24 • 05 Jun, 10:00',
      amount: 890.00,
      status: 'PROCESSADO',
      statusClass: 'bg-slate-100 text-sp-text-sec',
      icon: Clock,
      iconColor: 'text-indigo-500 bg-indigo-50',
    },
  ];

  const finalRecentPayments = logs.length > 0 
    ? logs.slice(0, 5).map((log, idx) => {
        const date = log.paymentDate ? (log.paymentDate.seconds ? new Date(log.paymentDate.seconds * 1000) : new Date(log.paymentDate)) : new Date();
        const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        return {
          id: log.id,
          title: log.debtName || 'Pagamento Dívida',
          subtitle: `Amortização • ${formattedDate}`,
          amount: log.amountPaid,
          status: 'CONCLUÍDO',
          statusClass: 'bg-emerald-50 text-sp-mint border border-emerald-100',
          icon: CheckCircle,
          iconColor: 'text-sp-mint bg-emerald-50',
        };
      })
    : mockRecentPayments;

  const handleMedalClick = () => {
    toast.success('🎉 Sensacional! Você possui 3 Medalhas Ativas nesta temporada: Foco Total, Exterminador de Juros, e Operador Responsável.');
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* 1. PAGE HEADER */}
      <div>
        <Title subtitle="HISTÓRICO">Minha Evolução</Title>
        <p className="text-sm font-semibold text-sp-text-sec mt-1">
          Veja como você está recuperando sua liberdade financeira.
        </p>
      </div>

      {/* 2. AREA GRAPH REDUÇÃO DA DÍVIDA (WHITE CARD) */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-sp-text-dark leading-tight">
              Redução da Dívida
            </h3>
            <span className="text-[10px] font-bold text-sp-text-subtle uppercase tracking-widest block mt-0.5">
              ÚLTIMOS 6 MESES
            </span>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-extrabold text-sp-red-text">
              -R$ 12.450
            </h2>
            <span className="text-[9px] font-bold bg-sp-mint-light text-sp-mint px-2 py-0.5 rounded-full uppercase tracking-wider block mt-1">
              QUITADO TOTAL
            </span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-44 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reductionData}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7F3DFF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#7F3DFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748B" 
                fontSize={11} 
                fontWeight="bold" 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} 
              />
              <Area 
                type="linear" 
                dataKey="Dívida" 
                stroke="#7F3DFF" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#purpleGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. CONQUISTAS DEEP PURPLE CARD */}
      <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
        {/* ribbon medal watermark icon on right background */}
        <div className="absolute right-0 bottom-0 text-white/5 -mb-6 -mr-6 select-none pointer-events-none">
          <Award className="w-48 h-48 stroke-[1]" />
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-sp-mint" />
            <h3 className="text-lg font-extrabold tracking-tight">Conquistas</h3>
          </div>

          <div className="space-y-3.5">
            {/* Achievement 1 */}
            <div className="flex items-center gap-3.5 bg-white/10 p-3 rounded-2xl border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-sp-mint stroke-[3.5]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Foco Total</h4>
                <p className="text-xs text-white/70">3 meses sem atrasos nos pagamentos</p>
              </div>
            </div>

            {/* Achievement 2 */}
            <div className="flex items-center gap-3.5 bg-white/10 p-3 rounded-2xl border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Primeira Dívida Quitada!</h4>
                <p className="text-xs text-white/70">Cartão Nubank liquidado inteiramente</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleMedalClick}
          className="w-full py-3 bg-white text-sp-purple font-extrabold text-xs rounded-xl uppercase tracking-wider hover:bg-slate-50 transition-colors"
        >
          Ver medalhas
        </button>
      </div>

      {/* 4. DICA DO ESPECIALISTA (LIGHT BLUE BOX) */}
      <div className="bg-[#EFF6FF] border border-blue-100 rounded-3xl p-5 shadow-sm flex gap-4 items-start">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
          <HelpCircle className="w-5.5 h-5.5" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-[#1E3A8A]">Dica do Especialista</h4>
          <p className="text-xs text-[#2563EB]/90 mt-1 leading-relaxed font-bold">
            Você reduziu 15% a mais este mês do que a média. Continue assim para quitar tudo 4 meses antes!
          </p>
        </div>
      </div>

      {/* 5. PAGAMENTOS RECENTES CHECKLIST LIST */}
      <div className="bg-white border border-sp-border rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-extrabold text-sp-text-dark">
            Pagamentos Recentes
          </h3>
          <Link href="/payments" className="text-xs font-bold text-sp-purple hover:underline">
            Ver extrato completo
          </Link>
        </div>

        <div className="space-y-4">
          {finalRecentPayments.map((pay) => {
            const IconComponent = pay.icon;
            return (
              <div 
                key={pay.id}
                className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-sp-border rounded-2xl transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", pay.iconColor)}>
                    <IconComponent className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-sp-text-dark leading-snug">
                      {pay.title}
                    </h4>
                    <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                      {pay.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-sp-text-dark">
                    {formatCurrency(pay.amount)}
                  </div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 mt-1 inline-block rounded-full uppercase tracking-wider", pay.statusClass)}>
                    {pay.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
