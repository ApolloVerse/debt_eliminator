import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Debt } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, Calendar, Percent, Landmark, CreditCard, ChevronDown, AlertTriangle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { cn, parseCurrency, getDebtBaseType, getFutureBills } from '../lib/utils';

export const Debts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Valor' | 'Juros' | 'Instituicao'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch, control } = useForm<any>();
  const { fields: futureBillsFields, append, remove } = useFieldArray({
    control,
    name: 'futureBills'
  });
  const rawDebtType = watch('type');
  const debtType = getDebtBaseType(rawDebtType);

  const fetchDebts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('userId', user.id)
      .eq('isActive', true);
      
    if (data) setDebts(data as Debt[]);
  };

  useEffect(() => {
    fetchDebts();

    // Auto-open new debt registration if "?add=true" is passed in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      openAdd();
      // clean url query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Auto-correct "divina" typo in debts
    const correctTypos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const { data: mistakenDebts } = await supabase
        .from('debts')
        .select('id, name')
        .eq('userId', session.user.id)
        .ilike('name', 'divina');
        
      if (mistakenDebts && mistakenDebts.length > 0) {
        for (const md of mistakenDebts) {
          await supabase.from('debts').update({ name: 'Dívida' }).eq('id', md.id);
        }
        fetchDebts();
      }
    };
    correctTypos();
  }, []);

  const openAdd = () => {
    setEditingDebt(null);
    reset({
      name: '',
      totalAmount: '',
      remainingAmount: '',
      installmentAmount: '',
      futureBills: [],
      remainingInstallments: 12,
      type: 'fixed', // Cartão de Crédito
      interestRate: 0,
      dueDate: new Date().toISOString().split('T')[0],
      totalInstallments: 12,
      paidInstallments: 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt);
    const data: any = { ...debt };
    const baseType = getDebtBaseType(debt.type);
    data.type = baseType;
    if (baseType === 'fixed') {
      const savedBills = getFutureBills(debt.type);
      data.futureBills = savedBills.length > 0 ? savedBills : [];
    } else {
      data.remainingInstallments = Math.max(0, debt.totalInstallments - debt.paidInstallments);
    }
    reset(data);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      let finalRemaining = parseCurrency(data.remainingAmount);
      let finalTotalInst = parseCurrency(data.totalInstallments) || 1;
      let finalInstallmentAmt = parseCurrency(data.installmentAmount);
      let finalTotalAmount = parseCurrency(data.totalAmount);
      let dbType = data.type;

      if (data.type === 'fixed') {
        // Cartão de Crédito: Sum future bills
        let sumFuture = 0;
        if (data.futureBills && Array.isArray(data.futureBills)) {
          sumFuture = data.futureBills.reduce((acc: number, bill: any) => acc + parseCurrency(bill.amount), 0);
        }
        finalRemaining = finalInstallmentAmt + sumFuture;
        finalTotalAmount = Math.max(finalRemaining, finalTotalAmount); // Limit or used
        finalTotalInst = 1;
        // Serialize future bills into type
        dbType = JSON.stringify({ baseType: 'fixed', futureBills: data.futureBills || [] });
      } else if (data.type === 'overdraft') {
        // Cheque Especial
        finalRemaining = parseCurrency(data.remainingAmount);
        finalTotalAmount = parseCurrency(data.totalAmount) || finalRemaining;
        finalInstallmentAmt = parseCurrency(data.installmentAmount) || 0;
        finalTotalInst = 1;
      } else {
        // Empréstimo
        finalRemaining = parseCurrency(data.remainingInstallments) * finalInstallmentAmt;
        finalTotalInst = parseCurrency(data.remainingInstallments) + parseCurrency(data.paidInstallments);
        finalTotalAmount = finalTotalAmount || finalRemaining;
      }

      const payload = {
        name: data.name,
        type: dbType,
        dueDate: data.dueDate,
        totalAmount: finalTotalAmount,
        remainingAmount: finalRemaining,
        installmentAmount: finalInstallmentAmt,
        interestRate: parseCurrency(data.interestRate),
        totalInstallments: finalTotalInst,
        paidInstallments: parseCurrency(data.paidInstallments),
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingDebt) {
        await supabase.from('debts').update(payload).eq('id', editingDebt.id).throwOnError();
        toast.success('Dívida atualizada com sucesso');
      } else {
        await supabase.from('debts').insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success('Dívida cadastrada com sucesso');
      }
      setIsModalOpen(false);
      await fetchDebts();
    } catch (error: any) {
      console.error('Supabase error:', error);
      toast.error(`Erro ao salvar: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDebt = async (id: string) => {
    if (!confirm('Deseja realmente remover esta dívida?')) return;
    try {
      await supabase.from('debts').update({ isActive: false }).eq('id', id);
      toast.success('Dívida removida');
      fetchDebts();
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const totalDebtBalance = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalDebtCount = debts.length;

  // Sorting and filtering logic
  const filteredDebts = [...debts].sort((a, b) => {
    if (filter === 'Valor') {
      return b.remainingAmount - a.remainingAmount;
    }
    if (filter === 'Juros') {
      return b.interestRate - a.interestRate;
    }
    if (filter === 'Instituicao') {
      return a.name.localeCompare(b.name);
    }
    return 0; // default order
  });

  const formatDueDateText = (dateString: string) => {
    try {
      const parts = dateString.split('-');
      if (parts.length >= 3) {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const day = parts[2];
        const monthIdx = parseInt(parts[1]) - 1;
        return `Vencimento: ${day} ${monthNames[monthIdx] || 'Out'}`;
      }
      return `Vencimento: ${dateString}`;
    } catch {
      return 'Vencimento: 15 Out';
    }
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      {/* Page Title & Add Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="GESTÃO DE DÍVIDAS">Dívidas Ativas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Controle e organize seus pagamentos pendentes.
          </p>
        </div>
      </div>

      {/* Grid of Two Overview Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOTAL EM ABERTO */}
        <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
            TOTAL EM ABERTO
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">
            {formatCurrency(totalDebtBalance)}
          </h2>
        </div>

        {/* Dívidas Ativas Count */}
        <div className="bg-white border border-sp-border text-sp-text-dark rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sp-text-sec mb-1">
              Dívidas Ativas
            </p>
            <h2 className="text-4xl font-black text-sp-purple tracking-tight">
              {totalDebtCount < 10 ? `0${totalDebtCount}` : totalDebtCount}
            </h2>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-sp-mint h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, (totalDebtCount / 6) * 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Rounded Bubble Filters Category Selection */}
      <div className="flex gap-2.5 overflow-x-auto py-2 no-scrollbar">
        {[
          { key: 'Todos', label: 'Todos' },
          { key: 'Valor', label: 'Por Valor' },
          { key: 'Juros', label: 'Por Juros' },
          { key: 'Instituicao', label: 'Instituição' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key as any)}
            className={cn(
              "font-semibold text-xs py-2 px-5 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none",
              filter === opt.key 
                ? "bg-sp-purple border-transparent text-white shadow-sm" 
                : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Debts list layout */}
      <div className="space-y-4">
        {filteredDebts.length > 0 ? (
          filteredDebts.map(debt => {
            const baseType = getDebtBaseType(debt.type);
            const progress = baseType === 'overdraft'
              ? Math.round((debt.remainingAmount / (debt.totalAmount || 1)) * 100)
              : Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100) || 0;
            const isUrg = debt.interestRate >= 3;
            const isOverdraft = baseType === 'overdraft';
            // Determine dynamic custom icon based on keywords
            const IsNubank = debt.name.toLowerCase().includes('nubank');
            const IsIta = debt.name.toLowerCase().includes('ita');
            
            const IconComp = isOverdraft ? AlertTriangle : IsNubank ? CreditCard : Landmark;
            const iconBgClass = isOverdraft
              ? 'bg-orange-100 text-orange-600'
              : IsNubank 
                ? 'bg-[#F4F0FF] text-sp-purple' 
                : IsIta 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-emerald-50 text-emerald-600';

            return (
              <div 
                key={debt.id} 
                className="bg-white border border-sp-border rounded-3xl p-5 hover:border-sp-purple/35 transition-all duration-300 relative group flex flex-col"
              >
                <div className="flex gap-4 items-center mb-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", iconBgClass)}>
                    <IconComp className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-base text-sp-text-dark truncate">
                        {debt.name}
                      </h3>
                      <span className="font-extrabold text-[#7F3DFF] text-base shrink-0 ml-1">
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                      {formatDueDateText(debt.dueDate)}
                    </p>
                  </div>
                </div>

                {/* Interest Rates & Quick Details Badges */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {isOverdraft && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
                      Cheque Especial
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    isUrg ? "bg-sp-red-bg text-sp-red-text" : "bg-slate-100 text-sp-text-sec"
                  )}>
                    {debt.interestRate}% a.m.
                  </span>
                  {isOverdraft ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 uppercase tracking-wider">
                      Limite: {formatCurrency(debt.totalAmount)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                      {debt.paidInstallments}/{debt.totalInstallments} parcelas
                    </span>
                  )}
                </div>

                {/* Progress Tracking Bar */}
                <div className="space-y-1.5 mt-auto">
                  {isOverdraft ? (
                    <>
                      <div className="flex justify-between text-xs font-bold text-sp-text-sec">
                        <span>Saldo negativo: {formatCurrency(debt.remainingAmount)}</span>
                        <span className="text-orange-600">{progress}% do limite</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, progress)}%` }} 
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs font-bold text-sp-text-sec">
                        <span>Pago: {formatCurrency(Math.max(0, debt.totalAmount - debt.remainingAmount))}</span>
                        <span className="text-sp-text-dark">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-300", progress > 50 ? 'bg-emerald-500' : 'bg-[#7F3DFF]')} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Hover Overlays */}
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 rounded-lg border border-sp-border p-1 shadow-sm">
                  <button 
                    onClick={() => openEdit(debt)} 
                    className="p-1.5 rounded-md hover:bg-slate-50 text-sp-text-sec hover:text-sp-purple transition-all"
                    title="Editar dívida"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteDebt(debt.id)} 
                    className="p-1.5 rounded-md hover:bg-sp-red-bg text-sp-red-text transition-all"
                    title="Remover dívida"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
            <p className="text-sm font-semibold text-sp-text-sec">Nenhuma dívida encontrada.</p>
          </div>
        )}
      </div>

      {/* Modal form to add or edit debt */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingDebt ? 'Editar Dívida' : 'Cadastrar Nova Dívida'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>
              {debtType === 'overdraft' ? 'Nome do Banco' : 'Nome do Credor/Instituição'}
            </BrutalLabel>
            <BrutalInput {...register('name', { required: true })} placeholder={debtType === 'overdraft' ? "Ex: Itaú, Santander" : "Ex: Nubank Platinum"} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <BrutalLabel>Tipo de Crédito</BrutalLabel>
              <BrutalSelect {...register('type')}>
                <option value="fixed">Cartão de Crédito / Fatura Mensal</option>
                <option value="variable">Empréstimo / Financiamento</option>
                <option value="overdraft">Cheque Especial / Limite da Conta</option>
              </BrutalSelect>
            </div>
            <div>
              <BrutalLabel>Vencimento (Dia/Mês)</BrutalLabel>
              <BrutalInput type="date" {...register('dueDate', { required: true })} />
            </div>
          </div>

          {debtType === 'fixed' ? (
            <div className="space-y-4 bg-sp-purple/5 border border-sp-purple/20 p-4 rounded-2xl">
              <div>
                <BrutalLabel>Valor da Fatura Atual</BrutalLabel>
                <BrutalInput type="text" {...register('installmentAmount', { required: true })} placeholder="Ex: 1500,20" />
              </div>
              
              <div className="pt-2 border-t border-sp-purple/10">
                <div className="flex justify-between items-center mb-3">
                  <BrutalLabel>Próximas Faturas (Opcional)</BrutalLabel>
                  <button 
                    type="button" 
                    onClick={() => append({ amount: '' })} 
                    className="text-[10px] font-bold text-sp-purple hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Mês
                  </button>
                </div>
                
                {futureBillsFields.length === 0 && (
                  <p className="text-[10px] text-sp-text-sec">Nenhuma fatura futura adicionada.</p>
                )}
                
                <div className="space-y-2">
                  {futureBillsFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <BrutalInput type="text" {...register(`futureBills.${index}.amount` as const)} placeholder={`Fatura ${index + 1} (Ex: 350,00)`} />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="w-10 h-10 flex items-center justify-center shrink-0 text-sp-red-text hover:bg-sp-red-bg rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : debtType === 'overdraft' ? (
            <div className="space-y-4 bg-orange-50/50 border border-orange-200 p-4 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BrutalLabel>Limite Concedido pelo Banco</BrutalLabel>
                  <BrutalInput type="text" {...register('totalAmount', { required: true })} placeholder="Ex: 5000,00" />
                </div>
                <div>
                  <BrutalLabel>Valor com Saldo Negativo</BrutalLabel>
                  <BrutalInput type="text" {...register('remainingAmount', { required: true })} placeholder="Ex: 1500,00" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BrutalLabel>Taxa de Juros (% a.m.)</BrutalLabel>
                  <BrutalInput type="text" {...register('interestRate')} placeholder="Ex: 8,0" />
                </div>
                <div>
                  <BrutalLabel>Pagamento Mensal Estimado</BrutalLabel>
                  <BrutalInput type="text" {...register('installmentAmount')} placeholder="Ex: 120,00 (Opcional)" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BrutalLabel>Valor da Parcela</BrutalLabel>
                  <BrutalInput type="text" {...register('installmentAmount', { required: true })} placeholder="Ex: 450,00" />
                </div>
                <div>
                  <BrutalLabel>Parcelas Restantes</BrutalLabel>
                  <BrutalInput type="number" {...register('remainingInstallments')} placeholder="Ex: 24" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <BrutalLabel>Parcelas já Pagas</BrutalLabel>
                  <BrutalInput type="number" {...register('paidInstallments')} />
                </div>
                <div>
                  <BrutalLabel>Taxa Juros (% a.m.)</BrutalLabel>
                  <BrutalInput type="text" {...register('interestRate')} placeholder="Ex: 5,8" />
                </div>
                <div>
                  <BrutalLabel>Valor Total (Opcional)</BrutalLabel>
                  <BrutalInput type="text" {...register('totalAmount')} placeholder="Ex: 10000,00" />
                </div>
              </div>
            </div>
          )}

          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingDebt ? 'Salvar Alterações' : 'Adicionar à Carteira'}
          </BrutalButton>
        </form>
      </Modal>

      {/* Floating Action Add Button matching bottom right purples circle plus FAB */}
      <button 
        onClick={openAdd}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

    </div>
  );
};
