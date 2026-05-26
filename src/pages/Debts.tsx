import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Debt } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, Calendar, Percent, Landmark, CreditCard, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Debts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Valor' | 'Juros' | 'Instituicao'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, setValue } = useForm<Partial<Debt>>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'debts'), where('userId', '==', user.uid), where('isActive', '==', true));
    const unsub = onSnapshot(q, (s) => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() } as Debt))));

    // Auto-open new debt registration if "?add=true" is passed in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      openAdd();
      // clean url query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return unsub;
  }, []);

  const openAdd = () => {
    setEditingDebt(null);
    reset({
      name: '',
      totalAmount: 0,
      remainingAmount: 0,
      installmentAmount: 0,
      type: 'fixed',
      interestRate: 0,
      dueDate: new Date().toISOString().split('T')[0],
      totalInstallments: 12,
      paidInstallments: 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt);
    Object.keys(debt).forEach(key => setValue(key as any, (debt as any)[key]));
    setIsModalOpen(true);
  };

  const onSubmit = async (data: Partial<Debt>) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...data,
        totalAmount: Number(data.totalAmount),
        remainingAmount: Number(data.remainingAmount),
        installmentAmount: Number(data.installmentAmount),
        interestRate: Number(data.interestRate),
        totalInstallments: Number(data.totalInstallments),
        paidInstallments: Number(data.paidInstallments),
        userId: user.uid,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingDebt) {
        await updateDoc(doc(db, 'debts', editingDebt.id), payload);
        toast.success('Dívida atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'debts'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Dívida cadastrada com sucesso');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar dívida');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDebt = async (id: string) => {
    if (!confirm('Deseja realmente remover esta dívida?')) return;
    try {
      await updateDoc(doc(db, 'debts', id), { isActive: false });
      toast.success('Dívida removida');
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

  // Fallback items if database is freshly cleared
  const demoDebts = [
    {
      id: 'd1',
      name: 'Crédito Itaú',
      dueDate: '2026-10-15',
      remainingAmount: 5400,
      totalAmount: 8100,
      interestRate: 3.2,
      progress: 33,
      paidText: 'R$ 1.800,00',
      icon: Landmark,
      iconClass: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'd2',
      name: 'Nubank Platinum',
      dueDate: '2026-10-22',
      remainingAmount: 2850,
      totalAmount: 9500,
      interestRate: 5.8,
      progress: 70,
      paidText: 'R$ 2.000,00',
      icon: CreditCard,
      iconClass: 'bg-[#F4F0FF] text-sp-purple',
    },
    {
      id: 'd3',
      name: 'Empréstimo Caixa',
      dueDate: '2026-11-05',
      remainingAmount: 6000,
      totalAmount: 6660,
      interestRate: 1.9,
      progress: 10,
      paidText: 'R$ 600,00',
      icon: Landmark,
      iconClass: 'bg-indigo-50 text-indigo-600',
    }
  ];

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
            {formatCurrency(totalDebtBalance > 0 ? totalDebtBalance : 14250.00)}
          </h2>
          <span className="text-xs font-bold text-sp-mint flex items-center gap-1">
            ↘ -12% em relação ao mês anterior
          </span>
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

      {/* Debts list layout matching image 3 style */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          /* Fallback view utilizing elegant simulated data if user has not entered database data */
          demoDebts.map(d => (
            <div 
              key={d.id} 
              className="bg-white border border-sp-border rounded-3xl p-5 hover:border-sp-purple/35 transition-all duration-300 relative group flex flex-col"
            >
              <div className="flex gap-4 items-center mb-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", d.iconClass)}>
                  <d.icon className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-base text-sp-text-dark truncate">
                      {d.name}
                    </h3>
                    <span className="font-extrabold text-[#7F3DFF] text-base shrink-0 ml-1">
                      {formatCurrency(d.remainingAmount)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                    {formatDueDateText(d.dueDate)}
                  </p>
                </div>
              </div>

              {/* Badges row */}
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                  d.interestRate >= 3 ? "bg-sp-red-bg text-sp-red-text" : "bg-slate-100 text-sp-text-sec"
                )}>
                  {d.interestRate}% a.m.
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                  Garantia Ativa
                </span>
              </div>

              {/* Progress Tracker */}
              <div className="space-y-1.5 mt-auto">
                <div className="flex justify-between text-xs font-bold text-sp-text-sec">
                  <span>Pago: {d.paidText}</span>
                  <span className="text-sp-text-dark">{d.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#7F3DFF] h-full transition-all duration-300" 
                    style={{ width: `${d.progress}%` }} 
                  />
                </div>
              </div>

              {/* Admin Actions */}
              <div className="absolute bottom-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openAdd()} 
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-sp-border rounded-lg text-sp-text-sec hover:text-sp-purple"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          filteredDebts.map(debt => {
            const progress = Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100);
            const isUrg = debt.interestRate >= 3;
            // Determine dynamic custom icon based on keywords
            const IsNubank = debt.name.toLowerCase().includes('nubank');
            const IsIta = debt.name.toLowerCase().includes('ita');
            
            const IconComp = IsNubank ? CreditCard : Landmark;
            const iconBgClass = IsNubank 
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
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    isUrg ? "bg-sp-red-bg text-sp-red-text" : "bg-slate-100 text-sp-text-sec"
                  )}>
                    {debt.interestRate}% a.m.
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                    {debt.paidInstallments}/{debt.totalInstallments} parcelas
                  </span>
                </div>

                {/* Progress Tracking Bar */}
                <div className="space-y-1.5 mt-auto">
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
            <BrutalLabel>Nome do Credor/Instituição</BrutalLabel>
            <BrutalInput {...register('name', { required: true })} placeholder="Ex: Nubank Platinum" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <BrutalLabel>Valor Total Original</BrutalLabel>
              <BrutalInput type="number" step="0.01" {...register('totalAmount', { required: true })} placeholder="R$ 9.500,00" />
            </div>
            <div>
              <BrutalLabel>Valor Aberto Atual</BrutalLabel>
              <BrutalInput type="number" step="0.01" {...register('remainingAmount', { required: true })} placeholder="R$ 2.850,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <BrutalLabel>Monto da Parcela</BrutalLabel>
              <BrutalInput type="number" step="0.01" {...register('installmentAmount', { required: true })} placeholder="R$ 450,00" />
            </div>
            <div>
              <BrutalLabel>Taxa Juros (% ao mês)</BrutalLabel>
              <BrutalInput type="number" step="0.01" {...register('interestRate', { required: true })} placeholder="5.8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <BrutalLabel>Vencimento Parcelas</BrutalLabel>
              <BrutalInput type="date" {...register('dueDate', { required: true })} />
            </div>
            <div>
              <BrutalLabel>Tipo de Crédito</BrutalLabel>
              <BrutalSelect {...register('type')}>
                <option value="fixed">Cartão de Crédito / Fixo</option>
                <option value="variable">Empréstimo / Variável</option>
              </BrutalSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mr-1">
            <div>
              <BrutalLabel>Parcelas Totais</BrutalLabel>
              <BrutalInput type="number" defaultValue={12} {...register('totalInstallments')} />
            </div>
            <div>
              <BrutalLabel>Parcelas Quitadas</BrutalLabel>
              <BrutalInput type="number" defaultValue={0} {...register('paidInstallments')} />
            </div>
          </div>

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
