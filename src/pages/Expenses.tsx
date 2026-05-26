import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Expense, ExpenseCategory } from '../types';
import { Title, BrutalButton, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, ShoppingCart, Home, Car, Heart, GraduationCap, Zap, Tv, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const categoryIcons: Record<ExpenseCategory, any> = {
  housing: Home,
  food: ShoppingCart,
  transport: Car,
  health: Heart,
  education: GraduationCap,
  utilities: Zap,
  entertainment: Tv,
  other: MoreHorizontal,
};

const categoryNames: Record<ExpenseCategory, string> = {
  housing: 'Moradia',
  food: 'Alimentação',
  transport: 'Transporte',
  health: 'Saúde',
  education: 'Educação',
  utilities: 'Contas básicas',
  entertainment: 'Lazer',
  other: 'Outros',
};

const categoryColors: Record<ExpenseCategory, string> = {
  housing: 'bg-blue-50 text-blue-600',
  food: 'bg-emerald-50 text-sp-mint',
  transport: 'bg-amber-50 text-amber-600',
  health: 'bg-rose-50 text-rose-600',
  education: 'bg-indigo-50 text-indigo-600',
  utilities: 'bg-purple-50 text-sp-purple',
  entertainment: 'bg-fuchsia-50 text-fuchsia-600',
  other: 'bg-slate-100 text-slate-600',
};

export const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, setValue } = useForm<Partial<Expense>>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('isActive', '==', true));
    return onSnapshot(q, (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))));
  }, []);

  const openAdd = () => {
    setEditingExpense(null);
    reset({ name: '', amount: 0, category: 'housing' });
    setIsModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setValue('name', expense.name);
    setValue('amount', expense.amount);
    setValue('category', expense.category);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: Partial<Expense>) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        userId: user.uid,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), payload);
        toast.success('Despesa atualizada');
      } else {
        await addDoc(collection(db, 'expenses'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Despesa cadastrada');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente remover esta despesa?')) return;
    await updateDoc(doc(db, 'expenses', id), { isActive: false });
    toast.success('Despesa removida');
  };

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORÇAMENTO">Despesas Fixas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Controle e registre seus custos operacionais mensais indispensáveis.
          </p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.map(expense => {
          const IconComp = categoryIcons[expense.category] || MoreHorizontal;
          const bgClassName = categoryColors[expense.category] || 'bg-slate-100 text-slate-600';
          
          return (
            <div 
              key={expense.id} 
              className="bg-white border border-sp-border rounded-3xl p-5 hover:border-sp-purple/35 transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-0.5 border border-sp-border shadow-sm">
                  <button 
                    onClick={() => openEdit(expense)} 
                    className="p-1 text-sp-text-sec hover:text-sp-purple hover:bg-slate-50 rounded"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteExpense(expense.id)} 
                    className="p-1 text-sp-red-text hover:bg-sp-red-bg rounded-md"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center mb-4 shrink-0", bgClassName)}>
                  <IconComp className="w-5.5 h-5.5" />
                </div>
                <h3 className="font-extrabold text-base text-sp-text-dark leading-tight mt-1 truncate max-w-[80%]">
                  {expense.name}
                </h3>
              </div>

              <div className="mt-4">
                <p className="text-2xl font-black text-indigo-950">
                  {formatCurrency(expense.amount)}
                </p>
                
                <span className="text-[10px] uppercase font-bold text-sp-text-subtle mt-3 block tracking-wider">
                  {categoryNames[expense.category]}
                </span>
              </div>
            </div>
          );
        })}

        {expenses.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-sp-text-dark">Sua lista de despesas está vazia</h4>
            <p className="text-xs text-sp-text-sec mt-1 mb-6">Insira gastos como aluguel, energia e alimentação para permitir avaliações exatas das suas finanças.</p>
            <BrutalButton onClick={openAdd} className="mx-auto w-max py-2 px-6">
              Adicionar Despesa
            </BrutalButton>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gerir Custo Fixo">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Nome da Despesa</BrutalLabel>
            <BrutalInput {...register('name', { required: true })} placeholder="Ex: Aluguel da Casa" />
          </div>
          <div>
            <BrutalLabel>Valor Mensal (R$)</BrutalLabel>
            <BrutalInput type="number" step="0.01" {...register('amount', { required: true })} placeholder="R$ 1.200,00" />
          </div>
          <div>
            <BrutalLabel>Categoria de Custos</BrutalLabel>
            <BrutalSelect {...register('category')}>
              {Object.entries(categoryNames).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </BrutalSelect>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingExpense ? 'Salvar Alterações' : 'Adicionar Despesa'}
          </BrutalButton>
        </form>
      </Modal>

    </div>
  );
};
