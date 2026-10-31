import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Expense, Income } from '../types';
import { Title, BrutalButton, BrutalCard, BrutalLabel, BrutalInput, BrutalSelect } from '../components/BrutalUI';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../lib/utils';
import {
  Plus, Pencil, Trash2, Landmark, CreditCard,
  AlertTriangle, CheckCircle2, Clock, Zap, ReceiptText,
  WalletCards, BadgeCheck, ExternalLink, Calendar, AlertCircle,
  ChevronLeft, ChevronRight, Filter, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Scale
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { cn, parseCurrency, getDebtBaseType, getFutureBills } from '../lib/utils';
import { cleanBaseName, extractExpenseMeta, getBankInfo } from './Expenses';
import { Link } from 'wouter';

// ─── Category labels ────────────────────────────────────────────────────────
const DEBT_CATEGORIES = [
  { value: 'credit_card',   label: 'Cartão de Crédito' },
  { value: 'loan',          label: 'Empréstimo / Financiamento' },
  { value: 'overdraft',     label: 'Cheque Especial' },
  { value: 'monthly_bill',  label: 'Dívida Mensal (Luz, Água, Internet…)' },
  { value: 'other',         label: 'Outros' },
];

const getCategoryLabel = (cat?: string) =>
  DEBT_CATEGORIES.find(c => c.value === cat)?.label ?? (cat === 'housing' ? 'Moradia' : cat === 'utilities' ? 'Contas' : 'Dívida');

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
  if (cat === 'loan')         return 'bg-indigo-50 text-indigo-600';
  return 'bg-slate-100 text-slate-600';
};

const isCreditExpense = (e: Expense) =>
  e.category === 'credit_card' || e.category === 'loan' || e.category === 'overdraft';

export const Debts = () => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [filter, setFilter] = useState<'Todos' | 'Pendentes' | 'Cartões' | 'Pagos' | 'Mensais' | 'Valor'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingExpenseId, setTogglingExpenseId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<any>();
  const { fields: futureBillsFields, append, remove } = useFieldArray({ control, name: 'futureBills' });

  const rawDebtType = watch('type');
  const watchedCategory = watch('category');
  const debtType = getDebtBaseType(rawDebtType);

  // Month navigation options: past 2 months, current, and next 10 months
  const monthOptions: { value: string; label: string; isCurrent: boolean }[] = [];
  for (let i = -2; i <= 10; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rawLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    monthOptions.push({
      value,
      label,
      isCurrent: value === currentMonthKey,
    });
  }

  const getMonthName = (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return monthKey;
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const fetchDebts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const [debtsRes, expensesRes, incomesRes] = await Promise.all([
      supabase.from('debts').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('expenses').select('*').eq('userId', user.id).eq('isActive', true),
      supabase.from('incomes').select('*').eq('userId', user.id).eq('isActive', true),
    ]);
    if (debtsRes.data) setDebts(debtsRes.data as Debt[]);
    if (expensesRes.data) setExpenses(expensesRes.data as Expense[]);
    if (incomesRes.data) setIncomes(incomesRes.data as Income[]);
  };

  useEffect(() => {
    fetchDebts();
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      openAdd();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ── Toggle paid/pending for debts ──────────────────────────────────────────
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

  // ── Toggle paid/pending for card & loan expenses ───────────────────────────
  const toggleExpensePaid = async (expense: Expense) => {
    setTogglingExpenseId(expense.id);
    try {
      const nowPaid = !expense.isPaid;
      await supabase.from('expenses').update({
        isPaid: nowPaid,
        paymentDate: nowPaid ? new Date().toISOString().split('T')[0] : null,
        updatedAt: new Date().toISOString(),
      }).eq('id', expense.id);
      toast.success(nowPaid ? '✅ Fatura marcada como paga!' : '⏳ Fatura marcada como pendente');
      await fetchDebts();
    } catch {
      toast.error('Erro ao atualizar status da fatura');
    } finally {
      setTogglingExpenseId(null);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente remover esta fatura/despesa?')) return;
    try {
      await supabase.from('expenses').update({ isActive: false }).eq('id', id);
      toast.success('Removido com sucesso');
      await fetchDebts();
    } catch {
      toast.error('Erro ao remover');
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
        const paidInst = parseCurrency(data.paidInstallments) || 0;
        let remInst = parseCurrency(data.remainingInstallments);
        let totInst = parseCurrency(data.totalInstallments);

        if (!remInst && totInst) {
          remInst = Math.max(0, totInst - paidInst);
        } else if (remInst && !totInst) {
          totInst = remInst + paidInst;
        } else if (!remInst && !totInst) {
          totInst = 12;
          remInst = 12;
        }

        finalTotalInst = Math.max(1, totInst || (remInst + paidInst));
        finalRemaining = remInst * finalInstallmentAmt;
        finalTotalAmount = finalTotalAmount || (finalTotalInst * finalInstallmentAmt) || finalRemaining;
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

  // ── Derived stats (debts + credit expenses) ───────────────────────────────
  const creditExpenses = expenses.filter(isCreditExpense);
  const unpaidCreditExpenses = creditExpenses.filter(e => !e.isPaid);
  const paidCreditExpenses = creditExpenses.filter(e => e.isPaid);

  const totalDebtBalance = debts.reduce((acc, d) => acc + (d.isPaid ? 0 : d.remainingAmount), 0);
  const totalCardBalance = unpaidCreditExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalCombinedDebt = totalDebtBalance + totalCardBalance;

  const pendingCount = debts.filter(d => !d.isPaid).length + unpaidCreditExpenses.length;
  const paidCount = debts.filter(d => d.isPaid).length + paidCreditExpenses.length;

  // ── Upcoming due dates calculation ────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type UpcomingItem = {
    id: string;
    sourceType: 'debt' | 'expense';
    title: string;
    subTitle: string;
    amount: number;
    dueDate: string;
    daysUntil: number;
    statusText: string;
    statusBadgeClass: string;
    category: string;
    bank?: string;
    rawDebt?: Debt;
    rawExpense?: Expense;
  };

  const parseDueDateInfo = (dueDateStr?: string) => {
    if (!dueDateStr) return { daysUntil: 999, label: 'Sem data', statusText: 'A Vencer', badgeClass: 'bg-slate-100 text-slate-600' };

    const parts = dueDateStr.split('-');
    const dueDay = parseInt(parts[2] || '1', 10);
    const dueMonth = parseInt(parts[1] || '1', 10) - 1;
    const dueYear = parseInt(parts[0] || String(today.getFullYear()), 10);

    const exactDate = new Date(dueYear, dueMonth, dueDay);
    exactDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((exactDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const formattedDate = `${parts[2]} ${months[dueMonth]}`;

    if (diffDays < 0) {
      return {
        daysUntil: diffDays,
        label: formattedDate,
        statusText: `Atrasada (${Math.abs(diffDays)}d)`,
        badgeClass: 'bg-red-50 text-red-600 border border-red-200 font-bold',
      };
    }
    if (diffDays === 0) {
      return {
        daysUntil: 0,
        label: formattedDate,
        statusText: 'Vence Hoje!',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold animate-pulse',
      };
    }
    if (diffDays <= 3) {
      return {
        daysUntil: diffDays,
        label: formattedDate,
        statusText: `Vence em ${diffDays}d`,
        badgeClass: 'bg-orange-50 text-orange-600 border border-orange-200 font-bold',
      };
    }
    if (diffDays <= 7) {
      return {
        daysUntil: diffDays,
        label: formattedDate,
        statusText: `Em ${diffDays} dias`,
        badgeClass: 'bg-purple-50 text-sp-purple font-semibold',
      };
    }
    return {
      daysUntil: diffDays,
      label: formattedDate,
      statusText: `Venc: ${formattedDate}`,
      badgeClass: 'bg-slate-100 text-sp-text-sec',
    };
  };

  const upcomingList: UpcomingItem[] = [];

  // Add unpaid debts with dueDate
  debts.filter(d => !d.isPaid).forEach(d => {
    const info = parseDueDateInfo(d.dueDate);
    upcomingList.push({
      id: `debt-${d.id}`,
      sourceType: 'debt',
      title: d.name,
      subTitle: getCategoryLabel(d.category),
      amount: Number(d.installmentAmount || d.remainingAmount) || 0,
      dueDate: d.dueDate,
      daysUntil: info.daysUntil,
      statusText: info.statusText,
      statusBadgeClass: info.badgeClass,
      category: d.category || 'other',
      rawDebt: d,
    });
  });

  // Add unpaid credit card / loan expenses
  unpaidCreditExpenses.forEach(e => {
    const info = parseDueDateInfo(e.dueDate);
    const bankInfo = getBankInfo(e.bank);
    upcomingList.push({
      id: `exp-${e.id}`,
      sourceType: 'expense',
      title: e.name,
      subTitle: e.category === 'loan' ? `Empréstimo · ${bankInfo.name}` : `Cartão · ${bankInfo.name}`,
      amount: Number(e.amount) || 0,
      dueDate: e.dueDate || '',
      daysUntil: info.daysUntil,
      statusText: info.statusText,
      statusBadgeClass: info.badgeClass,
      category: e.category,
      bank: e.bank,
      rawExpense: e,
    });
  });

  // Sort upcoming: overdue first, then today, then soonest
  upcomingList.sort((a, b) => a.daysUntil - b.daysUntil);
  const activeUpcoming = upcomingList.slice(0, 4);

  // ── Unified items for Main List ───────────────────────────────────────────
  type UnifiedListItem = {
    id: string;
    itemType: 'debt' | 'card_expense';
    name: string;
    category: string;
    bank?: string;
    dueDate: string;
    monthKey: string;
    amount: number;
    installmentAmount: number;
    totalAmount?: number;
    interestRate?: number;
    isPaid: boolean;
    paymentDate?: string;
    totalInstallments?: number;
    paidInstallments?: number;
    cardLimit?: number;
    rawDebt?: Debt;
    rawExpense?: Expense;
  };

  const debtItems: UnifiedListItem[] = debts.map(d => ({
    id: `debt-${d.id}`,
    itemType: 'debt',
    name: d.name,
    category: d.category || 'other',
    dueDate: d.dueDate || '',
    monthKey: d.dueDate ? d.dueDate.slice(0, 7) : '',
    amount: d.remainingAmount,
    installmentAmount: Number(d.installmentAmount || d.remainingAmount) || 0,
    totalAmount: d.totalAmount,
    interestRate: d.interestRate,
    isPaid: d.isPaid === true,
    paymentDate: d.paymentDate,
    totalInstallments: d.totalInstallments,
    paidInstallments: d.paidInstallments,
    rawDebt: d,
  }));

  const cardItems: UnifiedListItem[] = creditExpenses.map(e => {
    const meta = extractExpenseMeta(e);
    return {
      id: `exp-${e.id}`,
      itemType: 'card_expense',
      name: e.name,
      category: e.category,
      bank: e.bank,
      dueDate: e.dueDate || '',
      monthKey: e.dueDate ? e.dueDate.slice(0, 7) : '',
      amount: Number(e.amount) || 0,
      installmentAmount: Number(e.amount) || 0,
      totalAmount: Number(e.amount) || 0,
      interestRate: meta.interestRate,
      isPaid: e.isPaid === true,
      paymentDate: e.paymentDate,
      totalInstallments: meta.totalInstallments,
      cardLimit: e.cardLimit,
      rawExpense: e,
    };
  });

  const allItems: UnifiedListItem[] = [...debtItems, ...cardItems];

  // ── Monthly metrics calculation (Dívidas + Receitas) ──────────────────────
  const monthForMetrics = selectedMonth === 'all' ? currentMonthKey : selectedMonth;

  const monthItems = allItems.filter(item => {
    if (item.category === 'monthly_bill') {
      return !item.dueDate || item.dueDate.startsWith(monthForMetrics);
    }
    return item.dueDate && item.dueDate.startsWith(monthForMetrics);
  });

  const monthTotalAmount = monthItems.reduce(
    (acc, it) => acc + (it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount),
    0
  );
  const monthPendingAmount = monthItems
    .filter(it => !it.isPaid)
    .reduce((acc, it) => acc + (it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount), 0);
  const monthPaidAmount = monthItems
    .filter(it => it.isPaid)
    .reduce((acc, it) => acc + (it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount), 0);
  const monthPendingCount = monthItems.filter(it => !it.isPaid).length;
  const monthPaidCount = monthItems.filter(it => it.isPaid).length;

  // Monthly Income Calculation for target month
  const getMonthlyIncomeForMonth = (targetMonthKey: string) => {
    return incomes
      .filter(i => {
        // Exclude blocked bank boxes (they cannot be used to pay current obligations)
        if (i.category === 'bank_box' && i.boxStatus === 'blocked') return false;
        if (i.expectedDate) {
          return i.expectedDate.startsWith(targetMonthKey);
        }
        return i.frequency === 'monthly' || i.frequency === 'weekly' || i.frequency === 'biweekly';
      })
      .reduce((acc, i) => {
        const amt = Number(i.amount) || 0;
        if (i.frequency === 'weekly' && !i.expectedDate) return acc + (amt * 4);
        if (i.frequency === 'biweekly' && !i.expectedDate) return acc + (amt * 2);
        return acc + amt;
      }, 0);
  };

  const getMonthlyIncomeReceived = (targetMonthKey: string) => {
    return incomes
      .filter(i => {
        if (i.category === 'bank_box' && i.boxStatus === 'blocked') return false;
        if (!i.isReceived) return false;
        if (i.expectedDate) {
          return i.expectedDate.startsWith(targetMonthKey);
        }
        return i.frequency === 'monthly' || i.frequency === 'weekly' || i.frequency === 'biweekly';
      })
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  };

  const monthIncome = getMonthlyIncomeForMonth(monthForMetrics);
  const monthIncomeReceived = getMonthlyIncomeReceived(monthForMetrics);
  const monthIncomePending = Math.max(0, monthIncome - monthIncomeReceived);

  // Balance between income and debt in that month
  const monthBalance = monthIncome - monthTotalAmount;
  // Debt commitment ratio (% of income that goes to debts)
  const debtCommitmentPct = monthIncome > 0 ? (monthTotalAmount / monthIncome) * 100 : 0;

  // Filter items by Month first
  const monthFilteredItems = allItems.filter(item => {
    if (selectedMonth === 'all') return true;
    if (item.category === 'monthly_bill') {
      return !item.dueDate || item.dueDate.startsWith(selectedMonth);
    }
    return item.dueDate && item.dueDate.startsWith(selectedMonth);
  });

  // Then filter by Category / Tab
  const filteredItems = monthFilteredItems
    .filter(item => {
      if (filter === 'Cartões') return item.itemType === 'card_expense';
      if (filter === 'Mensais') return item.category === 'monthly_bill';
      if (filter === 'Pagos') return item.isPaid === true;
      if (filter === 'Pendentes') return !item.isPaid;
      return true;
    })
    .sort((a, b) => {
      if (filter === 'Valor') return b.amount - a.amount;
      // Pending first, paid last
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      // Sort chronologically by due date
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return 'Venc: -';
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
            Controle unificado de dívidas, faturas de cartões e relação com receitas por mês.
          </p>
        </div>
      </div>

      {/* Stats Cards (Totais Gerais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total em aberto (Dívidas + Cartões) */}
        <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden md:col-span-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">TOTAL GERAL EM ABERTO</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{formatCurrency(totalCombinedDebt)}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/15 text-[11px] font-semibold text-white/90">
            <span>Dívidas: {formatCurrency(totalDebtBalance)}</span>
            <span>•</span>
            <span>Cartões: {formatCurrency(totalCardBalance)}</span>
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-text-sec">Pendentes (Geral)</p>
            <p className="text-2xl font-black text-amber-500">{pendingCount < 10 ? `0${pendingCount}` : pendingCount}</p>
            <p className="text-[10px] font-semibold text-sp-text-subtle mt-0.5">Dívidas e faturas a pagar</p>
          </div>
        </div>

        {/* Pagas */}
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
            <BadgeCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-text-sec">Pagas / Liquidadas</p>
            <p className="text-2xl font-black text-emerald-500">{paidCount < 10 ? `0${paidCount}` : paidCount}</p>
            <p className="text-[10px] font-semibold text-sp-text-subtle mt-0.5">Quitadas este ciclo</p>
          </div>
        </div>
      </div>

      {/* 📅 VALORES DO MÊS: RELAÇÃO RECEITAS X DÍVIDAS */}
      <div className="bg-white border border-sp-border rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Header of the Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sp-purple/10 text-sp-purple flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-sp-text-dark leading-tight">
                  Balanço em {selectedMonth === 'all' ? `${getMonthName(currentMonthKey)} (Mês Atual)` : getMonthName(selectedMonth)}
                </h3>
                {selectedMonth === 'all' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                    Visão Mês Atual
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
                Relação entre o total que você vai receber e as dívidas a pagar no mês
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/incomes"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Receitas
            </Link>

            {selectedMonth !== 'all' ? (
              <button
                onClick={() => setSelectedMonth('all')}
                className="text-xs font-bold text-sp-purple bg-sp-purple/10 hover:bg-sp-purple/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Ver Todos os Meses
              </button>
            ) : (
              <button
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="text-xs font-bold text-sp-purple bg-sp-purple/10 hover:bg-sp-purple/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Filtrar Mês Atual
              </button>
            )}
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Receita a Receber */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  A Receber (Receita)
                </p>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">
                {formatCurrency(monthIncome)}
              </p>
            </div>
            <p className="text-[10px] font-semibold text-emerald-700/80 mt-2 pt-2 border-t border-emerald-100">
              {monthIncomeReceived > 0 ? (
                <span>Já recebido: <strong>{formatCurrency(monthIncomeReceived)}</strong></span>
              ) : (
                <span>{monthIncome > 0 ? 'Aguardando recebimento' : 'Nenhuma receita'}</span>
              )}
            </p>
          </div>

          {/* 2. Dívidas a Pagar */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sp-text-subtle">
                  A Pagar (Dívidas)
                </p>
                <ReceiptText className="w-3.5 h-3.5 text-sp-purple" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-sp-text-dark">
                {formatCurrency(monthTotalAmount)}
              </p>
            </div>
            <p className="text-[10px] font-semibold text-sp-text-sec mt-2 pt-2 border-t border-slate-200/60">
              {monthPendingAmount > 0 ? (
                <span>Pendente: <strong className="text-amber-600">{formatCurrency(monthPendingAmount)}</strong> ({monthPendingCount})</span>
              ) : monthTotalAmount > 0 ? (
                <span className="text-emerald-600 font-bold">Tudo quitado este mês! 🎉</span>
              ) : (
                <span>Nenhuma conta no mês</span>
              )}
            </p>
          </div>

          {/* 3. Saldo / Balanço do Mês */}
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col justify-between transition-all",
            monthBalance >= 0
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : "bg-sp-red-bg border-red-200 text-sp-red-text"
          )}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", monthBalance >= 0 ? "text-emerald-700" : "text-sp-red-text")}>
                  {monthBalance >= 0 ? 'Saldo Livre (Sobra)' : 'Déficit (Falta)'}
                </p>
                {monthBalance >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-sp-red-text" />
                )}
              </div>
              <p className={cn("text-xl sm:text-2xl font-black", monthBalance >= 0 ? "text-emerald-700" : "text-sp-red-text")}>
                {monthBalance >= 0 ? `+ ${formatCurrency(monthBalance)}` : `- ${formatCurrency(Math.abs(monthBalance))}`}
              </p>
            </div>
            <p className={cn("text-[10px] font-semibold mt-2 pt-2 border-t", monthBalance >= 0 ? "border-emerald-200/60 text-emerald-700/90" : "border-red-200 text-sp-red-text")}>
              {monthBalance >= 0 ? 'Sobra após pagar dívidas' : 'Falta para cobrir dívidas'}
            </p>
          </div>

          {/* 4. Comprometimento da Renda */}
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sp-purple">
                  Comprometimento
                </p>
                <Zap className="w-3.5 h-3.5 text-sp-purple" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-xl sm:text-2xl font-black text-sp-purple">
                  {monthIncome > 0 ? `${Math.round(debtCommitmentPct)}%` : '—'}
                </p>
                {monthIncome > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                    debtCommitmentPct <= 30
                      ? "bg-emerald-100 text-emerald-800"
                      : debtCommitmentPct <= 60
                      ? "bg-blue-100 text-blue-800"
                      : debtCommitmentPct <= 100
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800 font-extrabold"
                  )}>
                    {debtCommitmentPct <= 30 ? 'Ótimo' : debtCommitmentPct <= 60 ? 'Saudável' : debtCommitmentPct <= 100 ? 'Atenção' : 'Déficit'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] font-semibold text-sp-purple/80 mt-2 pt-2 border-t border-purple-100">
              {monthIncome > 0 ? 'Da receita vai para dívidas' : 'Cadastre sua receita'}
            </p>
          </div>
        </div>

        {/* Barra comparativa de Relação Receita vs Dívidas */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="flex justify-between items-center text-xs font-bold text-sp-text-sec mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sp-purple inline-block" />
              <span>Dívidas a Pagar: <strong className="text-sp-text-dark">{formatCurrency(monthTotalAmount)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Receita Prevista: <strong className="text-emerald-600">{formatCurrency(monthIncome)}</strong></span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                debtCommitmentPct > 100
                  ? "bg-sp-red-text"
                  : debtCommitmentPct > 70
                  ? "bg-amber-500"
                  : "bg-sp-purple"
              )}
              style={{ width: `${Math.min(100, Math.round(debtCommitmentPct))}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mt-2 text-[11px] font-semibold">
            <div>
              {monthIncome === 0 ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Nenhuma receita cadastrada para este mês. Cadastre receitas para acompanhar o saldo restante.
                </span>
              ) : monthBalance >= 0 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Sua receita cobre todas as dívidas deste mês, sobrando {formatCurrency(monthBalance)} livres.
                </span>
              ) : (
                <span className="text-sp-red-text font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-sp-red-text" />
                  Suas dívidas deste mês superam sua receita prevista em {formatCurrency(Math.abs(monthBalance))}.
                </span>
              )}
            </div>
            {monthIncome > 0 && (
              <span className="text-sp-text-subtle shrink-0">
                {Math.round(debtCommitmentPct)}% da renda comprometida
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🗓️ SELETOR DE MÊS (FILTRO POR MÊS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sp-text-sec flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sp-purple" /> Filtrar Dívidas por Mês de Vencimento
          </span>
          {selectedMonth !== 'all' && (
            <span className="text-[10px] font-bold text-sp-purple">
              Mês selecionado: {getMonthName(selectedMonth)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Previous month button */}
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-full border border-sp-border bg-white hover:bg-slate-50 flex items-center justify-center text-sp-text-sec hover:text-sp-purple shrink-0 transition-all cursor-pointer shadow-xs"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar flex-1">
            {/* Todos os Meses */}
            <button
              onClick={() => setSelectedMonth('all')}
              className={cn(
                "font-bold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap",
                selectedMonth === 'all'
                  ? "bg-slate-900 border-transparent text-white shadow-sm"
                  : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
              )}
            >
              Todos os Meses
            </button>

            {monthOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedMonth(opt.value)}
                className={cn(
                  "font-semibold text-xs py-2 px-3.5 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap flex items-center gap-1.5",
                  selectedMonth === opt.value
                    ? "bg-sp-purple border-transparent text-white shadow-sm font-bold"
                    : opt.isCurrent
                    ? "bg-purple-50 border-purple-200 text-sp-purple hover:bg-purple-100"
                    : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
                )}
              >
                <span>{opt.label}</span>
                {opt.isCurrent && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-extrabold",
                    selectedMonth === opt.value ? "bg-white/20 text-white" : "bg-purple-200 text-purple-800"
                  )}>
                    Atual
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Next month button */}
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-full border border-sp-border bg-white hover:bg-slate-50 flex items-center justify-center text-sp-text-sec hover:text-sp-purple shrink-0 transition-all cursor-pointer shadow-xs"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🚨 PRÓXIMOS A VENCER (Dívidas e Faturas próximas) */}
      <div className="bg-white border border-sp-border rounded-3xl p-5 sm:p-6 shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <h3 className="text-base sm:text-lg font-extrabold text-sp-text-dark leading-tight">
                Próximos a Vencer
              </h3>
            </div>
            <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
              Dívidas e faturas com vencimento iminente ou em atraso
            </p>
          </div>
          <span className="text-xs font-bold text-sp-purple bg-sp-purple/10 px-2.5 py-1 rounded-full">
            {activeUpcoming.length} {activeUpcoming.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {activeUpcoming.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-sp-border rounded-2xl bg-slate-50/50">
            <p className="text-xs font-semibold text-sp-text-sec">Nenhuma dívida ou fatura pendente próxima! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeUpcoming.map((item) => {
              const isExpense = item.sourceType === 'expense';

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-sp-border rounded-2xl flex flex-col justify-between transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isExpense ? "bg-purple-100 text-sp-purple" : "bg-blue-100 text-blue-600"
                      )}>
                        {isExpense ? <CreditCard className="w-4 h-4" /> : <ReceiptText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-sp-text-dark truncate">
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] font-semibold text-sp-text-sec truncate">
                          {item.subTitle}
                        </p>
                      </div>
                    </div>

                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider", item.statusBadgeClass)}>
                      {item.statusText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-sp-text-subtle">Valor</span>
                      <p className="text-sm font-extrabold text-sp-text-dark">{formatCurrency(item.amount)}</p>
                    </div>

                    {isExpense && item.rawExpense ? (
                      <button
                        onClick={() => toggleExpensePaid(item.rawExpense!)}
                        disabled={togglingExpenseId === item.rawExpense.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sp-purple text-white hover:bg-sp-purple-hover active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {togglingExpenseId === item.rawExpense.id ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Pagar
                      </button>
                    ) : item.rawDebt ? (
                      <button
                        onClick={() => togglePaid(item.rawDebt!)}
                        disabled={togglingId === item.rawDebt.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sp-purple text-white hover:bg-sp-purple-hover active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {togglingId === item.rawDebt.id ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Pagar
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Tabs (Categoria / Status) */}
      <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar">
        {[
          { key: 'Todos',     label: selectedMonth === 'all' ? 'Todos' : 'Todos do Mês' },
          { key: 'Pendentes', label: selectedMonth === 'all' ? '⏳ A Pagar' : '⏳ A Pagar no Mês' },
          { key: 'Cartões',   label: '💳 Cartões & Emprést.' },
          { key: 'Pagos',     label: selectedMonth === 'all' ? '✅ Pagos' : '✅ Pagos no Mês' },
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

      {/* Debt & Card Items List */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const isDebt = item.itemType === 'debt';
            const isPaid = item.isPaid === true;

            // Render Debt Item
            if (isDebt && item.rawDebt) {
              const debt = item.rawDebt;
              const baseType = getDebtBaseType(debt.type);
              const progress = baseType === 'overdraft'
                ? Math.round((debt.remainingAmount / (debt.totalAmount || 1)) * 100)
                : Math.round(((debt.totalAmount - debt.remainingAmount) / (debt.totalAmount || 1)) * 100) || 0;
              const isUrg = debt.interestRate >= 3 && !isPaid;
              const IconComp = getCategoryIcon(debt.category, debt.name);
              const iconColor = getCategoryColor(debt.category, isPaid);

              return (
                <div
                  key={item.id}
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
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-extrabold text-base truncate", isPaid ? 'text-sp-text-sec line-through decoration-emerald-400' : 'text-sp-text-dark')}>
                              {debt.name}
                            </h3>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-sp-text-subtle border border-sp-border rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                              Dívida
                            </span>
                          </div>
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
                    {debt.installmentAmount > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-sp-purple uppercase tracking-wider">
                        Parcela: {formatCurrency(debt.installmentAmount)}
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
            }

            // Render Card / Loan Expense Item
            if (item.rawExpense) {
              const exp = item.rawExpense;
              const bankInfo = getBankInfo(exp.bank);
              const meta = extractExpenseMeta(exp);

              return (
                <div
                  key={item.id}
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
                      {exp.paymentDate && (
                        <span className="text-emerald-500 font-semibold ml-1">
                          {new Date(exp.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main row */}
                  <div className="flex gap-4 items-center mb-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", isPaid ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-sp-purple")}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-extrabold text-base truncate", isPaid ? 'text-sp-text-sec line-through decoration-emerald-400' : 'text-sp-text-dark')}>
                              {exp.name}
                            </h3>
                            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider", bankInfo.badge)}>
                              {bankInfo.name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-sp-purple bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                              {exp.category === 'loan' ? 'Empréstimo' : exp.category === 'overdraft' ? 'Cheque Especial' : 'Cartão'}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-sp-text-sec mt-0.5">
                            {formatDueDate(exp.dueDate)}
                          </p>
                        </div>
                        <span className={cn("font-extrabold text-base shrink-0 ml-2", isPaid ? 'text-emerald-500' : 'text-sp-purple')}>
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {exp.cardLimit && exp.cardLimit > 0 ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                        Limite: {formatCurrency(exp.cardLimit)}
                      </span>
                    ) : null}
                    {meta.interestRate > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                        {meta.interestRate}% a.m.
                      </span>
                    )}
                    {meta.totalInstallments > 1 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-sp-text-sec uppercase tracking-wider">
                        {meta.installmentNumber || 1}/{meta.totalInstallments} parcelas
                      </span>
                    )}
                  </div>

                  {/* Toggle Paid Button + actions */}
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-sp-border/50">
                    <button
                      onClick={() => toggleExpensePaid(exp)}
                      disabled={togglingExpenseId === exp.id}
                      className={cn(
                        "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer",
                        isPaid
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-white hover:border-amber-300 hover:text-amber-600"
                          : "bg-white border-sp-border text-sp-text-sec hover:bg-sp-purple hover:border-sp-purple hover:text-white"
                      )}
                    >
                      {togglingExpenseId === exp.id ? (
                        <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      ) : isPaid ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/expenses"
                        className="text-xs font-semibold text-sp-purple hover:underline flex items-center gap-1"
                        title="Ver nos Cartões"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Cartões
                      </Link>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-2 rounded-xl hover:bg-sp-red-bg text-sp-red-text transition-all"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-3">
            <p className="text-sm font-semibold text-sp-text-sec">
              {filter === 'Pagos' ? `Nenhum pagamento registrado para ${selectedMonth === 'all' ? 'o período geral' : getMonthName(selectedMonth)}.` :
               filter === 'Pendentes' ? `Nenhuma pendência encontrada para ${selectedMonth === 'all' ? 'o período geral' : getMonthName(selectedMonth)}! 🎉` :
               filter === 'Cartões' ? `Nenhum cartão ou empréstimo encontrado para ${selectedMonth === 'all' ? 'o período' : getMonthName(selectedMonth)}.` :
               filter === 'Mensais' ? `Nenhuma dívida mensal encontrada para ${selectedMonth === 'all' ? 'o período' : getMonthName(selectedMonth)}.` :
               `Nenhuma dívida ou fatura encontrada para ${selectedMonth === 'all' ? 'o filtro atual' : getMonthName(selectedMonth)}.`}
            </p>
            {selectedMonth !== 'all' && (
              <button
                onClick={() => setSelectedMonth('all')}
                className="text-xs font-bold text-sp-purple bg-white border border-sp-purple/30 hover:bg-sp-purple/5 px-4 py-2 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Ver todas as dívidas e meses
              </button>
            )}
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
                  <BrutalInput type="number" min="0" {...register('paidInstallments')} defaultValue={0} />
                </div>
                <div>
                  <BrutalLabel>Total de Parcelas / Meses a Repetir</BrutalLabel>
                  <BrutalInput type="number" min="1" max="120" {...register('totalInstallments')} defaultValue={12} />
                  <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar">
                    {[1, 3, 6, 12, 24, 36].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setValue('totalInstallments', m)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 bg-white text-blue-700 hover:bg-blue-600 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
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