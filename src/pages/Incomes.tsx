import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Income } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Incomes = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, setValue } = useForm<Partial<Income>>();

  const fetchIncomes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    const { data } = await supabase
      .from('incomes')
      .select('*')
      .eq('userId', user.id)
      .eq('isActive', true);
      
    if (data) setIncomes(data as Income[]);
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const openAdd = () => {
    setEditingIncome(null);
    reset({ name: '', amount: 0, frequency: 'monthly', recurrenceDate: '', recurrenceDay: 1 });
    setIsModalOpen(true);
  };

  const openEdit = (income: Income) => {
    setEditingIncome(income);
    setValue('name', income.name);
    setValue('amount', income.amount);
    setValue('frequency', income.frequency);
    setValue('recurrenceDate', income.recurrenceDate || '');
    setValue('recurrenceDay', income.recurrenceDay || 1);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: Partial<Income>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: data.name,
        frequency: data.frequency,
        amount: Number(data.amount),
        recurrenceDate: data.recurrenceDate,
        recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingIncome) {
        await supabase.from('incomes').update(payload).eq('id', editingIncome.id).throwOnError();
        toast.success('Receita atualizada');
      } else {
        await supabase.from('incomes').insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success('Receita cadastrada');
      }
      setIsModalOpen(false);
      await fetchIncomes();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteIncome = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta receita?')) return;
    try {
      await supabase.from('incomes').update({ isActive: false }).eq('id', id);
      toast.success('Receita removida');
      fetchIncomes();
    } catch (error) {
      toast.error('Erro ao remover receita');
    }
  };

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case 'monthly': return 'Mensal';
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quinzenal';
      case 'annual': return 'Anual';
      default: return 'Esporádico';
    }
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORÇAMENTO">Minhas Receitas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Gestão simplificada de suas fontes de renda recorrentes ou variáveis.
          </p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Receita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incomes.map(income => (
          <div 
            key={income.id} 
            className="bg-white border border-sp-border rounded-3xl p-5 hover:border-sp-purple/35 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-0.5 border border-sp-border shadow-sm">
                <button 
                  onClick={() => openEdit(income)} 
                  className="p-1 text-sp-text-sec hover:text-sp-purple hover:bg-slate-50 rounded"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteIncome(income.id)} 
                  className="p-1 text-sp-red-text hover:bg-sp-red-bg rounded"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-11 h-11 bg-emerald-50 text-sp-mint rounded-2xl flex items-center justify-center mb-4 shrink-0">
                <DollarSign className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-extrabold text-base text-sp-text-dark leading-tight mt-1 truncate max-w-[80%]">
                {income.name}
              </h3>
            </div>

            <div className="mt-4">
              <p className="text-2xl font-black text-indigo-950">
                {formatCurrency(income.amount)}
              </p>
              
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-sp-text-sec mt-3 bg-slate-50 w-max px-2.5 py-0.5 rounded-full border border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-sp-purple" />
                <span className="tracking-wider">{frequencyLabel(income.frequency)}</span>
              </div>
            </div>
          </div>
        ))}

        {incomes.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-sp-text-dark">Nenhuma receita ativa</h4>
            <p className="text-xs text-sp-text-sec mt-1 mb-6">Cadastre seus ganhos mensais para otimizar os cálculos do plano de eliminação de dívidas.</p>
            <BrutalButton onClick={openAdd} className="mx-auto w-max py-2 px-6">
              Adicionar Receita
            </BrutalButton>
          </div>
        )}
      </div>

      {/* Modal update/add forms */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingIncome ? 'Editar Receita Ativa' : 'Cadastrar Nova Receita'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Nome da Fonte / Empresa</BrutalLabel>
            <BrutalInput {...register('name', { required: true })} placeholder="Ex: Salário Mensal" />
          </div>
          <div>
            <BrutalLabel>Valor Mensal (R$)</BrutalLabel>
            <BrutalInput type="number" step="0.01" {...register('amount', { required: true })} placeholder="R$ 3.500,00" />
          </div>
          <div>
            <BrutalLabel>Periodicidade / Freqüência</BrutalLabel>
            <BrutalSelect {...register('frequency')}>
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="annual">Anual</option>
              <option value="sporadic">Renda Variável / Esporádico</option>
            </BrutalSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <BrutalLabel>Data de Recorrência</BrutalLabel>
              <BrutalInput type="date" {...register('recurrenceDate')} />
            </div>
            <div>
              <BrutalLabel>Dia de Recorrência</BrutalLabel>
              <BrutalInput type="number" min="1" max="31" {...register('recurrenceDay')} placeholder="Ex: 5" />
            </div>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingIncome ? 'Salvar Alterações' : 'Salvar Receita'}
          </BrutalButton>
        </form>
      </Modal>

    </div>
  );
};
