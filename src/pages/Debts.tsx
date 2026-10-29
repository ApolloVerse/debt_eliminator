import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Debt } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import {
  Plus, Pencil, Trash2, Landmark, CreditCard,
  AlertTriangle, CheckCircle2, Clock, Zap, ReceiptText,
  WalletCards, BadgeCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { cn, parseCurrency, getDebtBaseType, getFutureBills } from '../lib/utils';

// ─── Category labels ────────────────────────────────────────────────────────
const DEBT_CATEGORIES = [
  { value: 'credit_card',   label: 'Cartão de Crédito' },
  { value: 'loan',          label: 'Empréstimo / Financiamento' },
  { value: 'overdraft',     label: 'Cheque Especial' },
  { value: 'monthly_bill',  label: 'Dívida Mensal (Luz, Água, Internet…)' },
  { value: 'other',         label: 'Outros' },
];

const getCategoryLabel = (cat?: string) =>
  DEBT_CATEGORIES.find(c => c.value === cat)?.label ?? 'Dívida';

const getCategoryIcon = (cat?: string, debtName?: string) => {
  const n = (debtName ?? '').toLowerCase();
  if (n.includes('nubank') || cat === 'credit_card') return CreditCard;
  if (cat === 'monthly_bill') return ReceiptText;
  if (cat === 'overdraft') return AlertTriangle;
  if (cat === 'loan') return Landmark;
  return WalletCards;
};

const getCategoryColor = (cat?: string, isPaid?: boolean) => {
  if (isPaid) return 'bg-emerald-50 text-emerald-600';
  if (cat === 'monthly_bill') return 'bg-blue-50 text-blue-600';
  if (cat === 'overdraft')    return 'bg-orange-100 text-orange-600';
  if (cat === 'credit_card')  return 'bg-purple-50 text-sp-purple';
  return 'bg-slate-100 text-slate-600';
};

export const Debts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Pagos' | 'Pendentes' | 'Mensais' | 'Valor'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, control } = useForm<any>();
  const { fields: futureBillsFields, append, remove } = useFieldArray({ control, name: 'futureBills' });

  const rawDebtType = watch('type');
  const watchedCategory = watch('category');
  const debtType = getDebtBaseType(rawDebtType);

  const fetchDebts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data } = await supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true);
    if (data) setDebts(data as Debt[]);
  };

  useEffect(() => {
    fetchDebts();
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      openAdd();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ── Toggle paid/pending without opening the modal ──────────────────────
  const togglePaid = async (debt: Debt) => {
    setTogglingId(debt.id);
    try {
      const nowPaid = !debt.isPaid;
      const update: any = {
        isPaid: nowPaid,
        paymentDate: nowPaid ? new Date().toISOString().split('T')[0] : null,
        paidInstallments: nowPaid
          ? Math.min(debt.paidInstallments + 1, debt.totalInstallments)
          : Math.max(0, debt.paidInstallments - 1),
        updatedAt: new Date().toISOString(),
      };
      await supabase.from('debts').update(update).eq('id', debt.id);
      toast.success(nowPaid ? '✅ Marcado como pago!' : '⏳ Marcado como pendente');
      await fetchDebts();
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setTogglingId(null);
    }
  };

  const openAdd = () => {
    setEditingDebt(null);
    reset({
      name: '',
      category: 'monthly_bill',
      totalAmount: '',
      remainingAmount: '',
      installmentAmount: '',
      futureBills: [],
      remainingInstallments: 12,
      type: 'variable',
      interestRate: 0,
      dueDate: new Date().toISOString().split('T')[0],
      totalInstallments: 12,
      paidInstallments: 0,
      isPaid: false,
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
        let sumFuture = 0;
        if (data.futureBills && Array.isArray(data.futureBills)) {
          sumFuture = data.futureBills.reduce((acc: number, bill: any) => acc + parseCurrency(bill.amount), 0);
        }
        finalRemaining = finalInstallmentAmt + sumFuture;
        finalTotalAmount = Math.max(finalRemaining, finalTotalAmount);
        finalTotalInst = 1;
        dbType = JSON.stringify({ baseType: 'fixed', futureBills: data.futureBills || [] });
      } else if (data.type === 'overdraft') {
        finalRemaining = parseCurrency(data.remainingAmount);
        finalTotalAmount = parseCurrency(data.totalAmount) || finalRemaining;
        finalInstallmentAmt = parseCurrency(data.installmentAmount) || 0;
        finalTotalInst = 1;
      } else {
        // variable or monthly
        finalRemaining = parseCurrency(data.remainingInstallments) * finalInstallmentAmt;
        finalTotalInst = parseCurrency(data.remainingInstallments) + parseCurrency(data.paidInstallments);
        finalTotalAmount = finalTotalAmount || finalRemaining;
      }

      const isPaid = data.isPaid === true || data.isPaid === 'true';

      const payload = {
        name: data.name,
        type: dbType,
        category: data.category || 'other',
        dueDate: data.dueDate,
        totalAmount: finalTotalAmount,
        remainingAmount: finalRemaining,
        installmentAmount: finalInstallmentAmt,
        interestRate: parseCurrency(data.interestRate),
        totalInstallments: finalTotalInst,
        paidInstallments: parseCurrency(data.paidInstallments),
        isPaid,
        paymentDate: isPaid ? (data.paymentDate || new Date().toISOString().split('T')[0]) : null,
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
    } catch {
      toast.error('Erro ao remover');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalDebtBalance = debts.reduce((acc, d) => acc + (d.isPaid ? 0 : d.remainingAmount), 0);
  const paidCount   = debts.filter(d => d.isPaid).length;
  const pendingCount = debts.filter(d => !d.isPaid).length;

  // ── Filter / sort ─────────────────────────────────────────────────────────
  const filteredDebts = debts
    .filter(d => {
      if (filter === 'Pagos')    return d.isPaid === true;
      if (filter === 'Pendentes') return !d.isPaid;
      if (filter === 'Mensais')  return d.category === 'monthly_bill';
      return true;
    })
    .sort((a, b) => {
      if (filter === 'Valor') return b.remainingAmount - a.remainingAmount;
      // Pending first, paid last
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return 0;
    });

  const formatDueDate = (dueDate: string) => {
    try {
      const parts = dueDate.split('-');
      if (parts.length >= 3) {
        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `Venc: ${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
      }
      return `Venc: ${dueDate}`;
    } catch { return 'Venc: -'; }
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">

      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <Title subtitle="GESTÃO DE DÍVIDAS">Dívidas Ativas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Controle e organize seus pagamentos pendentes.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total em aberto */}
        <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden md:col-span-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">TOTAL EM ABERTO</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{formatCurrency(totalDebtBalance)}</h2>
        </div>

        {/* Pendentes */}
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-text-sec">Pendentes</p>
            <p className="text-2xl font-black text-amber-500">{pendingCount < 10 ? `0${pendingCount}` : pendingCount}</p>
          </div>
        </div>

        {/* Pagas */}
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
            <BadgeCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-text-sec">Pagas</p>
            <p className="text-2xl font-black text-emerald-500">{paidCount < 10 ? `0${paidCount}` : paidCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar">
        {[
          { key: 'Todos',     label: 'Todos' },
          { key: 'Pendentes', label: '⏳ A Pagar' },
          { key: 'Pagos',     label: '✅ Pagos' },
          { key: 'Mensais',   label: '📅 Mensais' },
          { key: 'Valor',     label: 'Por Valor' },
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

      {/* Debt Cards */}
      <div className="space-y-3">
        {filteredDebts.length > 0 ? (
          filteredDebts.map(debt => {
            const baseType = getDebtBaseType(debt.type);
            const isPaid   = debt.isPaid === true;
            const progress = baseType === 'overdraft'
              ? Math.round((debt.remainingAmount / (debt.totalAmount || 1)) * 100)
              : Math.round(((debt.totalAmount - debt.remainingAmount) / (debt.totalAmount || 1)) * 100) || 0;
            const isUrg = debt.interestRate >= 3 && !isPaid;
            const IconComp = getCategoryIcon(debt.category, debt.name);
            const iconColor = getCategoryColor(debt.category, isPaid);

            return (
              <div
                key={debt.id}
                className={cn(
                  "bg-white border rounded-3xl p-5 transition-all duration-300 relative group flex flex-col",
                  isPaid
                    ? "border-emerald-200 bg-emerald-50/30 opacity-80"
                    : "border-sp-border hover:border-sp-purple/35"
                )}
              >
                {/* Paid ribbon */}
                {isPaid && (
                  <div className="absolute top-4 right-16 flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> PAGO
                    {debt.paymentDate && (
                      <span className="text-emerald-500 font-semibold ml-1">
                        {new Date(debt.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                )}

                {/* Main row */}
                <div className="flex gap-4 items-center mb-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", iconColor)}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h3 className={cn("font-extrabold text-base truncate", isPaid ? 'text-sp-text-sec line-through decoration-emerald-400' : 'text-sp-text-dark')}>
                          {debt.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-sp-text-sec mt-0.5">
                          {getCategoryLabel(debt.category)} · {formatDueDate(debt.dueDate)}
                        </p>
                      </div>
                      <span className={cn("font-extrabold text-base shrink-0 ml-2", isPaid ? 'text-emerald-500' : 'text-sp-purple')}>
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges row */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {debt.category === 'monthly_bill' && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-wider">
                      Mensal
                    </span>
                  )}
                  {isUrg && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sp-red-bg text-sp-red-text uppercase tracking-wider flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Alta Prioridade
                    </span>
                  )}
                  {debt.interestRate > 0 && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                      {debt.interestRate}% a.m.
                    </span>
                  )}
                  {debt.totalInstallments > 1 && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                      {debt.paidInstallments}/{debt.totalInstallments} parcelas
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {!isPaid && debt.totalInstallments > 1 && (
                  <div className="space-y-1.5 mt-auto mb-3">
                    <div className="flex justify-between text-xs font-bold text-sp-text-sec">
                      <span>Pago: {formatCurrency(Math.max(0, debt.totalAmount - debt.remainingAmount))}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-300", progress > 50 ? 'bg-emerald-500' : 'bg-sp-purple')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Toggle Paid Button + actions */}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-sp-border/50">
                  {/* Toggle button */}
                  <button
                    onClick={() => togglePaid(debt)}
                    disabled={togglingId === debt.id}
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer",
                      isPaid
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-white hover:border-amber-300 hover:text-amber-600"
                        : "bg-white border-sp-border text-sp-text-sec hover:bg-sp-purple hover:border-sp-purple hover:text-white"
                    )}
                  >
                    {togglingId === debt.id ? (
                      <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                    ) : isPaid ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                  </button>

                  {/* Edit / Delete */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(debt)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-sp-text-sec hover:text-sp-purple transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDebt(debt.id)}
                      className="p-2 rounded-xl hover:bg-sp-red-bg text-sp-red-text transition-all"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
            <p className="text-sm font-semibold text-sp-text-sec">
              {filter === 'Pagos' ? 'Nenhuma dívida paga ainda.' :
               filter === 'Pendentes' ? 'Nenhuma dívida pendente! 🎉' :
               filter === 'Mensais' ? 'Nenhuma dívida mensal cadastrada.' :
               'Nenhuma dívida encontrada.'}
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDebt ? 'Editar Dívida' : 'Cadastrar Nova Dívida'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Name */}
          <div>
            <BrutalLabel>Nome do Credor / Descrição</BrutalLabel>
            <BrutalInput {...register('name', { required: true })} placeholder="Ex: Conta de Luz Novembro" />
          </div>

          {/* Category + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <BrutalLabel>Categoria</BrutalLabel>
              <BrutalSelect {...register('category')}>
                {DEBT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </BrutalSelect>
            </div>
            <div>
              <BrutalLabel>Data de Vencimento</BrutalLabel>
              <BrutalInput type="date" {...register('dueDate', { required: true })} />
            </div>
          </div>

          {/* Credit Type (for calculation) — only shown for non-monthly */}
          {watchedCategory !== 'monthly_bill' && (
            <div>
              <BrutalLabel>Tipo de Crédito</BrutalLabel>
              <BrutalSelect {...register('type')}>
                <option value="fixed">Cartão de Crédito / Fatura Mensal</option>
                <option value="variable">Empréstimo / Financiamento</option>
                <option value="overdraft">Cheque Especial / Limite da Conta</option>
              </BrutalSelect>
            </div>
          )}

          {/* Monthly Bill fields */}
          {watchedCategory === 'monthly_bill' ? (
            <div className="space-y-4 bg-blue-50/50 border border-blue-200 p-4 rounded-2xl">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Dívida Mensal Recorrente</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BrutalLabel>Valor desta Conta</BrutalLabel>
                  <BrutalInput type="text" {...register('installmentAmount', { required: true })} placeholder="Ex: 260,00" />
                </div>
                <div>
                  <BrutalLabel>Taxa de Juros / Multa (% a.m.)</BrutalLabel>
                  <BrutalInput type="text" {...register('interestRate')} placeholder="Ex: 1,0 (Opcional)" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <BrutalLabel>Parcelas Pagas (meses já pagos)</BrutalLabel>
                  <BrutalInput type="number" {...register('paidInstallments')} defaultValue={0} />
                </div>
                <div>
                  <BrutalLabel>Total de Parcelas / Meses</BrutalLabel>
                  <BrutalInput type="number" {...register('totalInstallments')} defaultValue={12} />
                </div>
              </div>
            </div>
          ) : debtType === 'fixed' ? (
            <div className="space-y-4 bg-sp-purple/5 border border-sp-purple/20 p-4 rounded-2xl">
              <div>
                <BrutalLabel>Valor da Fatura Atual</BrutalLabel>
                <BrutalInput type="text" {...register('installmentAmount', { required: true })} placeholder="Ex: 1500,20" />
              </div>
              <div className="pt-2 border-t border-sp-purple/10">
                <div className="flex justify-between items-center mb-3">
                  <BrutalLabel>Próximas Faturas (Opcional)</BrutalLabel>
                  <button type="button" onClick={() => append({ amount: '' })} className="text-[10px] font-bold text-sp-purple hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar Mês
                  </button>
                </div>
                <div className="space-y-2">
                  {futureBillsFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <BrutalInput type="text" {...register(`futureBills.${index}.amount` as const)} placeholder={`Fatura ${index + 1} (Ex: 350,00)`} />
                      </div>
                      <button type="button" onClick={() => remove(index)} className="w-10 h-10 flex items-center justify-center text-sp-red-text hover:bg-sp-red-bg rounded-xl">
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
                  <BrutalLabel>Limite Concedido</BrutalLabel>
                  <BrutalInput type="text" {...register('totalAmount', { required: true })} placeholder="Ex: 5000,00" />
                </div>
                <div>
                  <BrutalLabel>Saldo Negativo</BrutalLabel>
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
                  <BrutalInput type="text" {...register('installmentAmount')} placeholder="Ex: 120,00" />
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

          {/* Payment Status Toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-sp-border rounded-2xl p-4">
            <div>
              <p className="text-sm font-bold text-sp-text-dark">Status do Pagamento</p>
              <p className="text-xs text-sp-text-sec mt-0.5">Esta conta já foi paga?</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" {...register('isPaid')} className="sr-only peer" />
              <div className="relative w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors duration-200">
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-6" />
              </div>
              <span className="text-sm font-bold text-sp-text-sec peer-checked:text-emerald-600 transition-colors">
                {watch('isPaid') ? '✅ Paga' : '⏳ Pendente'}
              </span>
            </label>
          </div>

          {/* Payment date (shown when marked paid) */}
          {watch('isPaid') && (
            <div>
              <BrutalLabel>Data do Pagamento</BrutalLabel>
              <BrutalInput type="date" {...register('paymentDate')} defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          )}

          <BrutalButton type="submit" className="w-full mt-2" isLoading={isSubmitting}>
            {editingDebt ? 'Salvar Alterações' : 'Adicionar à Carteira'}
          </BrutalButton>
        </form>
      </Modal>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

    </div>
  );
};