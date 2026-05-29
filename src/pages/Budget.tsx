import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Title, BrutalButton, BrutalCard, BrutalInput, BrutalLabel, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { 
  Plus, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface Budget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategorySpending {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

const CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação', icon: '🍔', color: 'bg-orange-100 text-orange-600' },
  { value: 'transporte', label: 'Transporte', icon: '🚗', color: 'bg-blue-100 text-blue-600' },
  { value: 'saude', label: 'Saúde', icon: '🏥', color: 'bg-red-100 text-red-600' },
  { value: 'lazer', label: 'Lazer', icon: '🎮', color: 'bg-purple-100 text-purple-600' },
  { value: 'compras', label: 'Compras', icon: '🛒', color: 'bg-green-100 text-green-600' },
  { value: 'servicos', label: 'Serviços', icon: '⚡', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'educacao', label: 'Educação', icon: '📚', color: 'bg-indigo-100 text-indigo-600' },
  { value: 'moradia', label: 'Moradia', icon: '🏠', color: 'bg-pink-100 text-pink-600' },
  { value: 'outros', label: 'Outros', icon: '📦', color: 'bg-gray-100 text-gray-600' }
];

export const Budget = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    category: '',
    monthlyLimit: ''
  });

  useEffect(() => {
    fetchBudgetsAndSpending();
  }, [selectedMonth, selectedYear]);

  const fetchBudgetsAndSpending = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // Fetch budgets for selected month/year
    const { data: budgetsData } = await supabase
      .from('budgets')
      .select('*')
      .eq('userId', user.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .eq('isActive', true);

    if (budgetsData) {
      setBudgets(budgetsData as Budget[]);
    }

    // Fetch daily expenses for the month
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data: expensesData } = await supabase
      .from('daily_expenses')
      .select('*')
      .eq('userId', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    // Calculate spending by category
    const spendingByCategory: { [key: string]: number } = {};
    if (expensesData) {
      expensesData.forEach((expense: any) => {
        const category = expense.category || 'outros';
        spendingByCategory[category] = (spendingByCategory[category] || 0) + expense.amount;
      });
    }

    // Merge budgets with spending
    const categorySpending: CategorySpending[] = CATEGORIES.map(cat => {
      const budget = budgetsData?.find(b => b.category === cat.value);
      const spent = spendingByCategory[cat.value] || 0;
      const limit = budget?.monthlyLimit || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        category: cat.value,
        spent,
        limit,
        percentage
      };
    }).filter(item => item.limit > 0 || item.spent > 0);

    setSpending(categorySpending);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    if (!formData.category || !formData.monthlyLimit) {
      toast.error('Preencha todos os campos');
      return;
    }

    const budgetData = {
      userId: user.id,
      category: formData.category,
      monthlyLimit: parseFloat(formData.monthlyLimit),
      month: selectedMonth,
      year: selectedYear,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    if (editingBudget) {
      const { error } = await supabase
        .from('budgets')
        .update(budgetData)
        .eq('id', editingBudget.id);

      if (error) {
        toast.error('Erro ao atualizar orçamento');
        return;
      }
      toast.success('Orçamento atualizado com sucesso!');
    } else {
      const { error } = await supabase
        .from('budgets')
        .insert([budgetData]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um orçamento para esta categoria neste mês');
        } else {
          toast.error('Erro ao criar orçamento');
        }
        return;
      }
      toast.success('Orçamento criado com sucesso!');
    }

    setShowModal(false);
    setEditingBudget(null);
    setFormData({ category: '', monthlyLimit: '' });
    fetchBudgetsAndSpending();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir orçamento');
      return;
    }

    toast.success('Orçamento excluído com sucesso!');
    fetchBudgetsAndSpending();
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      monthlyLimit: budget.monthlyLimit.toString()
    });
    setShowModal(true);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  const totalSpent = spending.reduce((acc, item) => acc + item.spent, 0);
  const totalBudget = spending.reduce((acc, item) => acc + item.limit, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-sp-purple border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex items-center justify-between">
        <Title subtitle="ORÇAMENTO">Controle Mensal</Title>
        <BrutalButton 
          onClick={() => {
            setEditingBudget(null);
            setFormData({ category: '', monthlyLimit: '' });
            setShowModal(true);
          }}
          className="h-10 px-4"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo
        </BrutalButton>
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              selectedMonth === month
                ? "bg-sp-purple text-white"
                : "bg-white border border-sp-border text-sp-text-sec hover:border-sp-purple"
            )}
          >
            {months[month - 1].slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Overall Budget Card */}
      <BrutalCard highlight>
        <div className="flex items-center justify-between mb-4">
          <div>
            <BrutalLabel>RESUMO DO MÊS</BrutalLabel>
            <h3 className="text-2xl font-black text-sp-text-dark mt-1">
              {formatCurrency(totalSpent)}
            </h3>
            <p className="text-xs text-sp-text-sec">
              de {formatCurrency(totalBudget)} planejado
            </p>
          </div>
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            overallPercentage > 100 
              ? "bg-sp-red-bg text-sp-red-text" 
              : overallPercentage > 80 
                ? "bg-yellow-100 text-yellow-600"
                : "bg-sp-mint-light text-sp-mint"
          )}>
            {overallPercentage > 100 ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <CheckCircle className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              overallPercentage > 100 
                ? "bg-sp-red-text" 
                : overallPercentage > 80 
                  ? "bg-yellow-500"
                  : "bg-sp-purple"
            )}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] font-bold text-sp-text-subtle uppercase">
            {overallPercentage.toFixed(0)}% utilizado
          </span>
          <span className="text-[10px] font-bold text-sp-text-subtle uppercase">
            {formatCurrency(totalBudget - totalSpent)} restante
          </span>
        </div>
      </BrutalCard>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-sp-text-dark uppercase tracking-wider">
          Por Categoria
        </h3>

        {spending.length === 0 ? (
          <div className="bg-white border border-sp-border rounded-3xl p-8 text-center">
            <TrendingDown className="w-12 h-12 text-sp-text-subtle mx-auto mb-3" />
            <p className="text-sm text-sp-text-sec">
              Nenhum orçamento definido para este mês
            </p>
            <p className="text-xs text-sp-text-subtle mt-1">
              Crie um orçamento para começar a controlar seus gastos
            </p>
          </div>
        ) : (
          spending.map(item => {
            const catInfo = getCategoryInfo(item.category);
            const isOverBudget = item.percentage > 100;
            const isNearLimit = item.percentage > 80 && item.percentage <= 100;

            return (
              <div 
                key={item.category}
                className={cn(
                  "bg-white border rounded-2xl p-4 transition-all",
                  isOverBudget ? "border-sp-red-text/30 bg-sp-red-bg/30" : "border-sp-border"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", catInfo.color)}>
                      {catInfo.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-sp-text-dark">{catInfo.label}</h4>
                      <p className="text-[10px] text-sp-text-subtle uppercase">
                        {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOverBudget && (
                      <span className="text-[9px] font-bold px-2 py-1 bg-sp-red-bg text-sp-red-text rounded-full uppercase">
                        Estourado
                      </span>
                    )}
                    {isNearLimit && (
                      <span className="text-[9px] font-bold px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full uppercase">
                        Alerta
                      </span>
                    )}
                    <button
                      onClick={() => openEditModal(budgets.find(b => b.category === item.category) || {
                        id: '',
                        userId: '',
                        category: item.category,
                        monthlyLimit: item.limit,
                        month: selectedMonth,
                        year: selectedYear,
                        isActive: true,
                        createdAt: '',
                        updatedAt: ''
                      })}
                      className="p-2 rounded-lg hover:bg-slate-100 text-sp-text-subtle hover:text-sp-purple transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {budgets.find(b => b.category === item.category) && (
                      <button
                        onClick={() => handleDelete(budgets.find(b => b.category === item.category)!.id)}
                        className="p-2 rounded-lg hover:bg-sp-red-bg text-sp-text-subtle hover:text-sp-red-text transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isOverBudget 
                        ? "bg-sp-red-text" 
                        : isNearLimit 
                          ? "bg-yellow-500"
                          : "bg-sp-mint"
                    )}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-bold text-sp-text-subtle">
                    {item.percentage.toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-bold text-sp-text-subtle">
                    {isOverBudget 
                      ? `${formatCurrency(item.spent - item.limit)} acima`
                      : `${formatCurrency(item.limit - item.spent)} restante`
                    }
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tips Card */}
      <div className="bg-gradient-to-br from-sp-purple/10 to-indigo-50 border border-purple-100 rounded-3xl p-6">
        <h4 className="font-extrabold text-sm text-sp-purple uppercase tracking-wider mb-3">
          💡 Dica de Orçamento
        </h4>
        <p className="text-sm text-sp-text-sec leading-relaxed">
          A regra 50-30-20 sugere: <span className="font-bold">50%</span> para necessidades (moradia, alimentação), 
          <span className="font-bold"> 30%</span> para desejos (lazer, compras) e <span className="font-bold">20%</span> para 
          economia e pagamento de dívidas.
        </p>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}>
        <div className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <BrutalLabel>CATEGORIA</BrutalLabel>
              <BrutalSelect
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={!!editingBudget}
              >
                <option value="">Selecione uma categoria</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </BrutalSelect>
            </div>

            <div>
              <BrutalLabel>LIMITE MENSAL (R$)</BrutalLabel>
              <BrutalInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <BrutalButton 
                type="button" 
                variant="secondary" 
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </BrutalButton>
              <BrutalButton type="submit" className="flex-1">
                {editingBudget ? 'Atualizar' : 'Criar'}
              </BrutalButton>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
