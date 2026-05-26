import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Debt } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { formatCurrency } from '../lib/utils';
import { CheckCircle2, Wallet, Info, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const Payments = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    debtId: string;
    amountPaid: number;
    note: string;
  }>({
    defaultValues: {
      amountPaid: 0,
      note: ''
    }
  });

  const selectedDebtId = watch('debtId');
  const selectedDebt = debts.find(d => d.id === selectedDebtId);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'debts'), where('userId', '==', user.uid), where('isActive', '==', true));
    return onSnapshot(q, (s) => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() } as Debt))));
  }, []);

  // Autofill installment value if debt is selected
  useEffect(() => {
    if (selectedDebt) {
      setValue('amountPaid', selectedDebt.installmentAmount);
    } else {
      setValue('amountPaid', 0);
    }
  }, [selectedDebtId]);

  const onSubmit = async (data: any) => {
    const user = auth.currentUser;
    if (!user || !selectedDebt) return;
    setIsSubmitting(true);
    
    try {
      await runTransaction(db, async (transaction) => {
        const debtRef = doc(db, 'debts', selectedDebt.id);
        const debtSnap = await transaction.get(debtRef);
        if (!debtSnap.exists()) throw "Dívida não encontrada";
        
        const debtData = debtSnap.data() as Debt;
        const newRemaining = Math.max(0, debtData.remainingAmount - data.amountPaid);
        const newPaidInstallments = debtData.paidInstallments + 1;
        
        // Update debt
        transaction.update(debtRef, {
          remainingAmount: newRemaining,
          paidInstallments: newPaidInstallments,
          updatedAt: serverTimestamp()
        });

        // Add log
        const logRef = doc(collection(db, 'paymentLogs'));
        transaction.set(logRef, {
          userId: user.uid,
          debtId: selectedDebt.id,
          amountPaid: Number(data.amountPaid),
          paymentDate: serverTimestamp(),
          note: data.note,
          debtName: selectedDebt.name,
          createdAt: serverTimestamp()
        });
      });

      toast.success('Amortização registrada com sucesso!');
      reset({ debtId: '', amountPaid: 0, note: '' });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* Header */}
      <div>
        <Title subtitle="AMORTIZAÇÃO">Quitar Parcelas</Title>
        <p className="text-sm font-semibold text-sp-text-sec mt-1">
          Abata saldos abertos e registre novas amortizações em sua jornada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Form panel */}
        <div className="bg-white border border-sp-border rounded-4xl p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <BrutalLabel>Selecione a Dívida Alvo</BrutalLabel>
              <BrutalSelect {...register('debtId', { required: true })}>
                <option value="">Escolha qual dívida abater...</option>
                {debts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({formatCurrency(d.remainingAmount)})
                  </option>
                ))}
              </BrutalSelect>
            </div>

            <div>
              <BrutalLabel>Valor da Amortização (R$)</BrutalLabel>
              <BrutalInput 
                type="number" 
                step="0.01" 
                {...register('amountPaid', { required: true })} 
                placeholder="R$ 0,00"
              />
              <p className="text-[10px] text-sp-text-sec mt-1.5 font-bold uppercase tracking-wider">
                Sugestão: Parcela de {selectedDebt ? formatCurrency(selectedDebt.installmentAmount) : 'R$ 0,00'}
              </p>
            </div>

            <div>
              <BrutalLabel>Notas / Observações (Opcional)</BrutalLabel>
              <BrutalInput {...register('note')} placeholder="Ex: Pagamento da prestação regular" />
            </div>

            <BrutalButton type="submit" className="w-full h-14 text-base font-extrabold" isLoading={isSubmitting}>
              <CheckCircle2 className="w-5.5 h-5.5 mr-2" />
              Confirmar Pagamento
            </BrutalButton>
          </form>
        </div>

        {/* Selected debt information panel */}
        {selectedDebt ? (
          <div className="space-y-4">
            {/* Status overview card */}
            <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 mb-4">
                Status Consolidado
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-semibold text-white/80">Saldo Remanescente</span>
                  <span className="text-lg font-black">{formatCurrency(selectedDebt.remainingAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-semibold text-white/80">Credor / Instituição</span>
                  <span className="text-sm font-extrabold truncate max-w-[50%]">{selectedDebt.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-white/80">Parcelas Liquidadas</span>
                  <span className="text-sm font-extrabold">{selectedDebt.paidInstallments} / {selectedDebt.totalInstallments}</span>
                </div>
              </div>
            </div>

            {/* Specialist advice summary card */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
              <Info className="w-5.5 h-5.5 text-sp-mint shrink-0 mt-0.5" />
              <p className="text-xs text-[#065F46] font-bold leading-relaxed">
                Ao registrar, o saldo remanescente será subtraído de imediato. Uma nova conquista de evolução será logada na sua linha do tempo.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-sp-border rounded-4xl flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50">
            <Wallet className="w-12 h-12 text-slate-300 mb-4 animate-pulse" />
            <h4 className="font-extrabold text-sm text-sp-text-dark">Aguardando seleção</h4>
            <p className="text-xs text-sp-text-sec mt-1 max-w-xs font-medium">Selecione uma conta ou credor na lista à esquerda para carregar o balanço atual do credor.</p>
          </div>
        )}
      </div>

    </div>
  );
};
