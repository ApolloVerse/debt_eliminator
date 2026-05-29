import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DailyExpense, DailyExpenseCategory } from '../types';
import { Title, BrutalButton, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Pencil, Trash2, ShoppingCart, Car, Heart, Tv, Wrench, Package, MoreHorizontal, Calendar, TrendingDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const categoryIcons: Record<DailyExpenseCategory, any> = {
  alimentacao: ShoppingCart,
  transporte: Car,
  saude: Heart,
  lazer: Tv,
  compras: Package,
  servicos: Wrench,
  outros: MoreHorizontal,
};

const categoryNames: Record<DailyExpenseCategory, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  lazer: 'Lazer',
  compras: 'Compras',
  servicos: 'Serviços',
  outros: 'Outros',
};

const categoryColors: Record<DailyExpenseCategory, string> = {
  alimentacao: 'bg-emerald-50 text-sp-mint',
  transporte: 'bg-amber-50 text-amber-600',
  saude: 'bg-rose-50 text-rose-600',
  lazer: 'bg-fuchsia-50 text-fuchsia-600',
  compras: 'bg-blue-50 text-blue-600',
  servicos: 'bg-indigo-50 text-indigo-600',
  outros: 'bg-slate-100 text-slate-600',
};

export const DailyExpenses = () => {
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const { register, handleSubmit, reset, setValue } = useForm<Partial<DailyExpense>>();

  const fetchDailyExpenses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from('daily_expenses')
      .select('*')
      .eq('userId', user.id)
      .order('date', { ascending: false });

    if (data) setDailyExpenses(data as DailyExpense[]);
  };

  useEffect(() => {
    fetchDailyExpenses();
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    reset({
      description: '',
      amount: 0,
      category: 'outros',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: DailyExpense) => {
    setEditingItem(item);
    setValue('description', item.description);
    setValue('amount', item.amount);
    setValue('category', item.category);
    setValue('date', item.date);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: Partial<DailyExpense>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);

    try {
      const payload = {
        description: data.description,
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        userId: user.id,
      };

      if (editingItem) {
        await supabase.from('daily_expenses').update(payload).eq('id', editingItem.id).throwOnError();
        toast.success('Gasto atualizado');
      } else {
        await supabase.from('daily_expenses').insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success('Gasto registrado');
      }
      setIsModalOpen(false);
      await fetchDailyExpenses();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Deseja realmente excluir este gasto?')) return;
    try {
      await supabase.from('daily_expenses').delete().eq('id', id);
      toast.success('Gasto removido');
      fetchDailyExpenses();
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  // Filter by selected month
  const filteredExpenses = dailyExpenses.filter(de => {
    const d = new Date(de.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return monthKey === selectedMonth;
  });

  const totalFiltered = filteredExpenses.reduce((acc, de) => acc + de.amount, 0);

  // Group by category
  const byCategory = filteredExpenses.reduce((acc, de) => {
    acc[de.category] = (acc[de.category] || 0) + de.amount;
    return acc;
  }, {} as Record<string, number>);

  // Group by day
  const byDay = filteredExpenses.reduce((acc, de) => {
    const day = de.date.split('T')[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(de);
    return acc;
  }, {} as Record<string, DailyExpense[]>);

  // Generate month options (last 12 months)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="CONTROLE DIÁRIO">Gastos Diários</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Registre seus gastos do dia a dia e acompanhe para onde seu dinheiro vai.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Novo Gasto
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
        {monthOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelectedMonth(opt.value)}
            className={cn(
              "font-semibold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap",
              selectedMonth === opt.value
                ? "bg-sp-purple border-transparent text-white shadow-sm"
                : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">
            Total do Mês
          </p>
          <p className="text-3xl font-black text-orange-700">
            {formatCurrency(totalFiltered)}
          </p>
        </div>
        <div className="bg-white border border-sp-border rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-sec mb-1">
            Média Diária
          </p>
          <p className="text-3xl font-black text-sp-text-dark">
            {formatCurrency(Object.keys(byDay).length > 0 ? totalFiltered / Object.keys(byDay).length : 0)}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-sp-text-dark mb-4 uppercase tracking-wider">
            Por Categoria
          </h3>
          <div className="space-y-3">
            {Object.entries(byCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([cat, amount]) => {
                const IconComp = categoryIcons[cat as DailyExpenseCategory] || MoreHorizontal;
                const bgClass = categoryColors[cat as DailyExpenseCategory] || 'bg-slate-100 text-slate-600';
                const pct = totalFiltered > 0 ? (amount / totalFiltered) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-sp-text-dark flex-1">{categoryNames[cat as DailyExpenseCategory]}</span>
                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-sp-purple rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-sp-text-dark w-20 text-right">{formatCurrency(amount)}</span>
                    <span className="text-[10px] font-bold text-sp-text-subtle w-10 text-right">{Math.round(pct)}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Expenses List Grouped by Day */}
      <div className="space-y-4">
        {Object.entries(byDay)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([day, items]) => {
            const dayTotal = items.reduce((acc, i) => acc + i.amount, 0);
            const d = new Date(day + 'T12:00:00');
            const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

            return (
              <div key={day} className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-sp-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sp-purple" />
                    <span className="text-sm font-extrabold text-sp-text-dark capitalize">{dayLabel}</span>
                  </div>
                  <span className="text-sm font-black text-sp-red-text">{formatCurrency(dayTotal)}</span>
                </div>

                <div className="space-y-3">
                  {items.map(item => {
                    const IconComp = categoryIcons[item.category] || MoreHorizontal;
                    const bgClass = categoryColors[item.category] || 'bg-slate-100 text-slate-600';
                    return (
                      <div key={item.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-sp-text-dark truncate">{item.description}</p>
                            <p className="text-[10px] font-semibold text-sp-text-subtle uppercase tracking-wider">
                              {categoryNames[item.category]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-sp-text-dark">{formatCurrency(item.amount)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1 text-sp-text-sec hover:text-sp-purple hover:bg-slate-50 rounded"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-1 text-sp-red-text hover:bg-sp-red-bg rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 bg-white border border-dashed border-sp-border rounded-3xl">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sp-text-dark">Nenhum gasto registrado</p>
            <p className="text-xs text-sp-text-sec mt-1">Toque em "Novo Gasto" para começar a registrar seus gastos diários.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Gasto' : 'Registrar Gasto Diário'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Descrição</BrutalLabel>
            <BrutalInput {...register('description', { required: true })} placeholder="Ex: Almoço, Uber, Farmácia" />
          </div>
          <div>
            <BrutalLabel>Valor (R$)</BrutalLabel>
            <BrutalInput type="number" step="0.01" {...register('amount', { required: true })} placeholder="Ex: 45,90" />
          </div>
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <BrutalSelect {...register('category')}>
              {Object.entries(categoryNames).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </BrutalSelect>
          </div>
          <div>
            <BrutalLabel>Data</BrutalLabel>
            <BrutalInput type="date" {...register('date', { required: true })} />
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingItem ? 'Salvar Alterações' : 'Registrar Gasto'}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
