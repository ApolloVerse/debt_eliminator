import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Title, BrutalButton, BrutalCard, BrutalInput, BrutalLabel, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { 
  Plus, 
  Target, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  DollarSign,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  isCompleted: boolean;
  completedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const GOAL_CATEGORIES = [
  { value: 'emergency', label: 'Reserva de Emergência', icon: '🛡️', color: 'bg-blue-100 text-blue-600' },
  { value: 'travel', label: 'Viagem', icon: '✈️', color: 'bg-purple-100 text-purple-600' },
  { value: 'education', label: 'Educação', icon: '📚', color: 'bg-green-100 text-green-600' },
  { value: 'vehicle', label: 'Veículo', icon: '🚗', color: 'bg-orange-100 text-orange-600' },
  { value: 'home', label: 'Casa/Imóvel', icon: '🏠', color: 'bg-pink-100 text-pink-600' },
  { value: 'retirement', label: 'Aposentadoria', icon: '🏖️', color: 'bg-indigo-100 text-indigo-600' },
  { value: 'other', label: 'Outro', icon: '🎯', color: 'bg-gray-100 text-gray-600' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-600' }
];

export const Goals = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    deadline: '',
    priority: 'medium',
    category: 'other'
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: goalsData } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('userId', user.id)
      .eq('isActive', true)
      .order('deadline', { ascending: true });

    if (goalsData) {
      setGoals(goalsData as FinancialGoal[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    if (!formData.name || !formData.targetAmount || !formData.deadline) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const goalData = {
      userId: user.id,
      name: formData.name,
      description: formData.description,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: editingGoal?.currentAmount || 0,
      deadline: formData.deadline,
      priority: formData.priority,
      category: formData.category,
      isCompleted: editingGoal?.isCompleted || false,
      completedAt: editingGoal?.completedAt || null,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    if (editingGoal) {
      const { error } = await supabase
        .from('financial_goals')
        .update(goalData)
        .eq('id', editingGoal.id);

      if (error) {
        toast.error('Erro ao atualizar meta');
        return;
      }
      toast.success('Meta atualizada com sucesso!');
    } else {
      const { error } = await supabase
        .from('financial_goals')
        .insert([goalData]);

      if (error) {
        toast.error('Erro ao criar meta');
        return;
      }
      toast.success('Meta criada com sucesso!');
    }

    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      deadline: '',
      priority: 'medium',
      category: 'other'
    });
    fetchGoals();
  };

  const handleAddMoney = async () => {
    if (!selectedGoal || !addAmount) return;

    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Insira um valor válido');
      return;
    }

    const newAmount = selectedGoal.currentAmount + amount;
    const isCompleted = newAmount >= selectedGoal.targetAmount;

    const { error } = await supabase
      .from('financial_goals')
      .update({
        currentAmount: newAmount,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', selectedGoal.id);

    if (error) {
      toast.error('Erro ao adicionar valor');
      return;
    }

    toast.success(isCompleted 
      ? 'Parabéns! Meta alcançada! 🎉' 
      : `R$ ${amount.toFixed(2)} adicionado à meta`
    );
    
    setShowAddMoneyModal(false);
    setSelectedGoal(null);
    setAddAmount('');
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir meta');
      return;
    }

    toast.success('Meta excluída com sucesso!');
    fetchGoals();
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline,
      priority: goal.priority,
      category: goal.category
    });
    setShowModal(true);
  };

  const openAddMoneyModal = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setAddAmount('');
    setShowAddMoneyModal(true);
  };

  const getCategoryInfo = (category: string) => {
    return GOAL_CATEGORIES.find(c => c.value === category) || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Sort goals: incomplete first, then by priority (high > medium > low), then by deadline
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const activeGoals = sortedGoals.filter(g => !g.isCompleted);
  const completedGoals = sortedGoals.filter(g => g.isCompleted);

  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);

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
        <Title subtitle="METAS">Objetivos Financeiros</Title>
        <BrutalButton 
          onClick={() => {
            setEditingGoal(null);
            setFormData({
              name: '',
              description: '',
              targetAmount: '',
              deadline: '',
              priority: 'medium',
              category: 'other'
            });
            setShowModal(true);
          }}
          className="h-10 px-4"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Meta
        </BrutalButton>
      </div>

      {/* Overall Progress Card */}
      <BrutalCard highlight>
        <div className="flex items-center justify-between mb-4">
          <div>
            <BrutalLabel>PROGRESSO GERAL</BrutalLabel>
            <h3 className="text-2xl font-black text-sp-text-dark mt-1">
              {formatCurrency(totalSaved)}
            </h3>
            <p className="text-xs text-sp-text-sec">
              de {formatCurrency(totalTarget)} total planejado
            </p>
          </div>
          <div className="w-16 h-16 bg-sp-purple-light text-sp-purple rounded-2xl flex items-center justify-center">
            <Target className="w-8 h-8" />
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sp-purple rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage(totalSaved, totalTarget)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] font-bold text-sp-text-subtle uppercase">
            {getProgressPercentage(totalSaved, totalTarget).toFixed(0)}% concluído
          </span>
          <span className="text-[10px] font-bold text-sp-text-subtle uppercase">
            {activeGoals.length} metas ativas
          </span>
        </div>
      </BrutalCard>

      {/* Active Goals */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-sp-text-dark uppercase tracking-wider">
          Metas Ativas
        </h3>

        {activeGoals.length === 0 ? (
          <div className="bg-white border border-sp-border rounded-3xl p-8 text-center">
            <Target className="w-12 h-12 text-sp-text-subtle mx-auto mb-3" />
            <p className="text-sm text-sp-text-sec">
              Nenhuma meta financeira ativa
            </p>
            <p className="text-xs text-sp-text-subtle mt-1">
              Crie uma meta para começar a poupar
            </p>
          </div>
        ) : (
          activeGoals.map(goal => {
            const catInfo = getCategoryInfo(goal.category);
            const priorityInfo = getPriorityInfo(goal.priority);
            const daysRemaining = getDaysRemaining(goal.deadline);
            const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
            const monthlyNeeded = daysRemaining > 0 
              ? (goal.targetAmount - goal.currentAmount) / (daysRemaining / 30)
              : goal.targetAmount - goal.currentAmount;

            return (
              <div 
                key={goal.id}
                className="bg-white border border-sp-border rounded-2xl p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl", catInfo.color)}>
                      {catInfo.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-sp-text-dark">{goal.name}</h4>
                      {goal.description && (
                        <p className="text-xs text-sp-text-sec mt-0.5">{goal.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-sp-text-subtle hover:text-sp-purple transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 rounded-lg hover:bg-sp-red-bg text-sp-text-subtle hover:text-sp-red-text transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-lg font-black text-sp-text-dark">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-xs text-sp-text-sec">
                      de {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sp-mint rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-sp-text-subtle" />
                      <span className={cn(
                        "font-medium",
                        daysRemaining < 0 ? "text-sp-red-text" : 
                        daysRemaining < 30 ? "text-yellow-600" : "text-sp-text-sec"
                      )}>
                        {daysRemaining < 0 
                          ? `${Math.abs(daysRemaining)} dias atrasada`
                          : `${daysRemaining} dias restantes`
                        }
                      </span>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      priorityInfo.color
                    )}>
                      {priorityInfo.label}
                    </span>
                  </div>

                  <button
                    onClick={() => openAddMoneyModal(goal)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-sp-purple-light text-sp-purple rounded-lg font-bold text-xs hover:bg-sp-purple hover:text-white transition-all"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                {/* Monthly needed alert */}
                {monthlyNeeded > 0 && daysRemaining > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-[10px] text-yellow-700 font-medium">
                      💡 Você precisa poupar <span className="font-bold">{formatCurrency(monthlyNeeded)}/mês</span> para atingir esta meta
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-sp-text-dark uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-sp-mint" />
            Metas Alcançadas
          </h3>

          {completedGoals.map(goal => {
            const catInfo = getCategoryInfo(goal.category);

            return (
              <div 
                key={goal.id}
                className="bg-sp-mint-light/30 border border-sp-mint/20 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sp-mint-light flex items-center justify-center text-lg">
                      {catInfo.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-sp-text-dark flex items-center gap-2">
                        {goal.name}
                        <CheckCircle className="w-4 h-4 text-sp-mint" />
                      </h4>
                      <p className="text-xs text-sp-text-sec">
                        {formatCurrency(goal.targetAmount)} • Alcançada em {new Date(goal.completedAt!).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips Card */}
      <div className="bg-gradient-to-br from-sp-mint/10 to-emerald-50 border border-emerald-100 rounded-3xl p-6">
        <h4 className="font-extrabold text-sm text-sp-mint uppercase tracking-wider mb-3">
          💡 Dica de Poupança
        </h4>
        <p className="text-sm text-sp-text-sec leading-relaxed">
          Automatize sua poupança! Configure uma transferência automática para o dia do seu salário. 
          <span className="font-bold"> Pague a si mesmo primeiro</span> antes de pagar contas.
        </p>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingGoal ? 'Editar Meta' : 'Nova Meta Financeira'}>
        <div className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <BrutalLabel>NOME DA META</BrutalLabel>
              <BrutalInput
                placeholder="Ex: Reserva de Emergência"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <BrutalLabel>DESCRIÇÃO (OPCIONAL)</BrutalLabel>
              <BrutalInput
                placeholder="Ex: 6 meses de despesas"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <BrutalLabel>VALOR ALVO (R$)</BrutalLabel>
                <BrutalInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                />
              </div>

              <div>
                <BrutalLabel>PRAZO</BrutalLabel>
                <BrutalInput
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <BrutalLabel>CATEGORIA</BrutalLabel>
                <BrutalSelect
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {GOAL_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </BrutalSelect>
              </div>

              <div>
                <BrutalLabel>PRIORIDADE</BrutalLabel>
                <BrutalSelect
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </BrutalSelect>
              </div>
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
                {editingGoal ? 'Atualizar' : 'Criar Meta'}
              </BrutalButton>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add Money Modal */}
      <Modal isOpen={showAddMoneyModal} onClose={() => setShowAddMoneyModal(false)} title="Adicionar à Meta">
        <div className="p-0">
          {selectedGoal && (
            <p className="text-sm text-sp-text-sec mb-4">
              {selectedGoal.name} • {formatCurrency(selectedGoal.currentAmount)} de {formatCurrency(selectedGoal.targetAmount)}
            </p>
          )}
          
          <div className="space-y-4">
            <div>
              <BrutalLabel>VALOR (R$)</BrutalLabel>
              <BrutalInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <BrutalButton 
                type="button" 
                variant="secondary" 
                onClick={() => setShowAddMoneyModal(false)}
                className="flex-1"
              >
                Cancelar
              </BrutalButton>
              <BrutalButton 
                onClick={handleAddMoney}
                className="flex-1"
              >
                Adicionar
              </BrutalButton>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
