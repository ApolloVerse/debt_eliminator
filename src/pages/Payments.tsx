import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Debt } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { formatCurrency, getDebtBaseType } from '../lib/utils';
import { CheckCircle2, Wallet, Info, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const Payments = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: {
      amountPaid: 0,
      note: '',
      isEarlyPayment: false,
      installmentsReduced: 1
    }
  });

  const selectedDebtId = watch('debtId');
  const selectedDebt = debts.find(d => d.id === selectedDebtId);

  const fetchDebts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('userId', user.id)
      .eq('isActive', true);
      
    if (data) setDebts(data as Debt[]);
  };

  useEffect(() => {
    fetchDebts();
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !selectedDebt) return;
    setIsSubmitting(true);
    
    try {
      const newRemaining = Math.max(0, selectedDebt.remainingAmount - data.amountPaid);
      
      let newPaidInstallments = selectedDebt.paidInstallments;
      const baseType = getDebtBaseType(selectedDebt.type);
      if (baseType === 'variable' && data.isEarlyPayment) {
        newPaidInstallments += Number(data.installmentsReduced || 0);
      } else {
        newPaidInstallments += 1;
      }
      
      // Update debt
      const { error: err1 } = await supabase.from('debts').update({
        remainingAmount: newRemaining,
        paidInstallments: newPaidInstallments,
        updatedAt: new Date().toISOString()
      }).eq('id', selectedDebt.id);

      if (err1) throw err1;

      // Add log
      const { error: err2 } = await supabase.from('payment_logs').insert([{
        userId: user.id,
        debtId: selectedDebt.id,
        amountPaid: Number(data.amountPaid),
        paymentDate: new Date().toISOString(),
        note: data.note,
        debtName: selectedDebt.name,
        createdAt: new Date().toISOString()
      }]);

      if (err2) throw err2;

      toast.success('Amortização registrada com sucesso!');
      reset({ debtId: '', amountPaid: 0, note: '', isEarlyPayment: false, installmentsReduced: 1 });
      await fetchDebts();
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

            {getDebtBaseType(selectedDebt?.type || '') === 'variable' && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-sp-purple rounded" {...register('isEarlyPayment')} />
                  <span className="font-bold text-sm text-sp-text-dark">Amortização Antecipada / Quitação Parcial?</span>
                </label>
                
                {watch('isEarlyPayment') && (
                  <div>
                    <BrutalLabel>Quantas parcelas foram eliminadas?</BrutalLabel>
                    <BrutalInput type="number" {...register('installmentsReduced')} placeholder="Ex: 3" />
                    <p className="text-[10px] text-sp-text-sec mt-1">Estas parcelas serão marcadas como pagas no seu progresso total.</p>
                  </div>
                )}
              </div>
            )}

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
