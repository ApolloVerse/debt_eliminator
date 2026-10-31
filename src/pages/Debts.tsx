import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpRight, ArrowDownRight, Scale, Home, Lightbulb
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
  { value: 'monthly_bill',  label: 'Conta Fixa / Mensal (Luz, Água, Net…)' },
  { value: 'utilities',     label: 'Contas Básicas (Água, Luz, Internet)' },
  { value: 'housing',       label: 'Moradia / Aluguel / Condomínio' },
  { value: 'food',          label: 'Alimentação' },
  { value: 'transport',     label: 'Transporte' },
  { value: 'health',        label: 'Saúde' },
  { value: 'education',     label: 'Educação' },
  { value: 'other',         label: 'Outros' },
];

const getCategoryLabel = (cat?: string) =>
  DEBT_CATEGORIES.find(c => c.value === cat)?.label ??
  (cat === 'housing' ? 'Moradia / Aluguel' :
   cat === 'utilities' ? 'Contas (Água/Luz/Net)' :
   cat === 'monthly_bill' ? 'Conta Mensal' :
   cat === 'food' ? 'Alimentação' :
   cat === 'transport' ? 'Transporte' :
   cat === 'health' ? 'Saúde' :
   cat === 'education' ? 'Educação' : 'Dívida / Conta');

const getCategoryIcon = (cat?: string, debtName?: string) => {
  const n = (debtName ?? '').toLowerCase();
  if (n.includes('nubank') || cat === 'credit_card') return CreditCard;
  if (n.includes('luz') || n.includes('energia')) return Zap;
  if (cat === 'monthly_bill' || cat === 'utilities') return ReceiptText;
  if (cat === 'housing') return Home;
  if (cat === 'overdraft') return AlertTriangle;
  if (cat === 'loan') return Landmark;
  return WalletCards;
};

const getCategoryColor = (cat?: string, isPaid?: boolean) => {
  if (isPaid) return 'bg-emerald-50 text-emerald-600';
  if (cat === 'monthly_bill' || cat === 'utilities') return 'bg-blue-50 text-blue-600';
  if (cat === 'housing')      return 'bg-amber-50 text-amber-600';
  if (cat === 'overdraft')    return 'bg-orange-100 text-orange-600';
  if (cat === 'credit_card')  return 'bg-purple-50 text-sp-purple';
  if (cat === 'loan')         return 'bg-indigo-50 text-indigo-600';
  return 'bg-slate-100 text-slate-600';
};

const isCreditCategory = (cat?: string) =>
  cat === 'credit_card' || cat === 'loan' || cat === 'overdraft';

const getMonthKeyFromDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }
  return '';
};

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

  // Generate full range of months: from January of current year (and past months) through all 12 months + next year
  const currentYear = now.getFullYear();
  const monthOptions: { value: string; label: string; isCurrent: boolean }[] = [];

  // All 12 months of current year
  for (let m = 0; m < 12; m++) {
    const d = new Date(currentYear, m, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rawLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    monthOptions.push({
      value,
      label,
      isCurrent: value === currentMonthKey,
    });
  }

  // Next year first 6 months
  for (let m = 0; m < 6; m++) {
    const d = new Date(currentYear + 1, m, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rawLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    monthOptions.push({
      value,
      label,
      isCurrent: false,
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

  const monthScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Auto-scroll the active pill into view whenever selectedMonth changes
  useEffect(() => {
    if (!monthScrollRef.current) return;
    const activeEl = monthScrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedMonth]);

  const scrollMonths = (direction: 'left' | 'right') => {
    if (monthScrollRef.current) {
      monthScrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
    }
    scrollMonths('left');
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(year, month, 1);
      setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
    }
    scrollMonths('right');
  };

  const onMouseDownMonthBar = (e: React.MouseEvent) => {
    if (!monthScrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - monthScrollRef.current.offsetLeft;
    scrollLeftRef.current = monthScrollRef.current.scrollLeft;
  };

  const onMouseLeaveOrUpMonthBar = () => {
    isDraggingRef.current = false;
  };

  const onMouseMoveMonthBar = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !monthScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - monthScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    monthScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
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

  // ── Toggle paid/pending for card & loan & other expenses ───────────────────
  const toggleExpensePaid = async (expense: Expense) => {
    setTogglingExpenseId(expense.id);
    try {
      const nowPaid = !expense.isPaid;
      await supabase.from('expenses').update({
        isPaid: nowPaid,
        paymentDate: nowPaid ? new Date().toISOString().split('T')[0] : null,
        updatedAt: new Date().toISOString(),
      }).eq('id', expense.id);
      toast.success(nowPaid ? '✅ Conta marcada como paga!' : '⏳ Conta marcada como pendente');
      await fetchDebts();
    } catch {
      toast.error('Erro ao atualizar status da conta');
    } finally {
      setTogglingExpenseId(null);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente remover esta conta/despesa?')) return;
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

  // ── Derived stats (ALL debts + ALL expenses) ──────────────────────────────
  const unpaidDebts = debts.filter(d => !d.isPaid);
  const paidDebts = debts.filter(d => d.isPaid);

  const unpaidExpenses = expenses.filter(e => !e.isPaid);
  const paidExpenses = expenses.filter(e => e.isPaid);

  const totalDebtBalance = unpaidDebts.reduce((acc, d) => acc + (Number(d.remainingAmount) || 0), 0);
  const totalExpensesUnpaid = unpaidExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalCombinedDebt = totalDebtBalance + totalExpensesUnpaid;

  const totalCardUnpaid = unpaidExpenses
    .filter(e => isCreditCategory(e.category))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const totalBillsUnpaid = totalDebtBalance + unpaidExpenses
    .filter(e => !isCreditCategory(e.category))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const pendingCount = unpaidDebts.length + unpaidExpenses.length;
  const paidCount = paidDebts.length + paidExpenses.length;

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

  // ── Unified items for Main List & Upcoming ───────────────────────────────
  type UnifiedListItem = {
    id: string;
    itemType: 'debt' | 'card_expense' | 'bill_expense';
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
    monthKey: getMonthKeyFromDate(d.dueDate || d.paymentDate),
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

  // ALL expenses (credit cards, loans, AND basic bills like agua, luz, internet, moradia)
  const expenseItems: UnifiedListItem[] = expenses.map(e => {
    const meta = extractExpenseMeta(e);
    const isCredit = isCreditCategory(e.category);
    return {
      id: `exp-${e.id}`,
      itemType: isCredit ? 'card_expense' : 'bill_expense',
      name: e.name,
      category: e.category,
      bank: e.bank,
      dueDate: e.dueDate || '',
      monthKey: getMonthKeyFromDate(e.dueDate || e.paymentDate),
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

  const allItems: UnifiedListItem[] = [...debtItems, ...expenseItems];

  // ── Helper to match an item to a target month (e.g. "2026-10") ────────────
  const itemMatchesMonth = (item: UnifiedListItem, targetMonthKey: string): boolean => {
    // 1. Exact match on dueDate (e.g. '2026-10-15')
    if (item.dueDate && getMonthKeyFromDate(item.dueDate) === targetMonthKey) {
      return true;
    }

    // 2. Exact match on paymentDate (e.g. paid on '2026-10-10')
    if (item.paymentDate && getMonthKeyFromDate(item.paymentDate) === targetMonthKey) {
      return true;
    }

    // 3. Recurring monthly bills in debts table (category: monthly_bill)
    // If a monthly bill repeats for X installments (e.g. 12 months from Jan to Dec):
    if (item.rawDebt && (item.category === 'monthly_bill' || (item.totalInstallments && item.totalInstallments > 1))) {
      const d = item.rawDebt;
      const baseDueDate = d.dueDate || d.createdAt;
      const baseMonthKey = getMonthKeyFromDate(baseDueDate);
      if (!baseMonthKey) return true;

      const [baseYear, baseMonth] = baseMonthKey.split('-').map(Number);
      const [targetYear, targetMonth] = targetMonthKey.split('-').map(Number);
      const monthDiff = (targetYear - baseYear) * 12 + (targetMonth - baseMonth);

      const totalInst = d.totalInstallments || 12;
      const paidInst = d.paidInstallments || 0;
      const minMonthDiff = -paidInst;
      const maxMonthDiff = totalInst - paidInst;

      if (monthDiff >= minMonthDiff && monthDiff <= maxMonthDiff) {
        return true;
      }
    }

    // 4. Recurring expenses with recurrenceDay or type === fixed without multiple entries
    if (item.rawExpense && !item.dueDate && item.rawExpense.recurrenceDay) {
      return true;
    }

    return false;
  };

  // Helper to determine if an item is considered paid in the context of the viewed month
  const isItemPaidInMonth = (item: UnifiedListItem, targetMonthKey: string): boolean => {
    // If it was paid on this exact month
    if (item.paymentDate && getMonthKeyFromDate(item.paymentDate) === targetMonthKey) {
      return true;
    }
    // If direct item is paid and dueDate is on or before this month
    if (item.isPaid) {
      if (item.dueDate && getMonthKeyFromDate(item.dueDate) <= targetMonthKey) {
        return true;
      }
      return true;
    }
    // For debts with paid installments: past months before current unpaid were paid
    if (item.rawDebt && (item.category === 'monthly_bill' || (item.totalInstallments && item.totalInstallments > 1))) {
      const d = item.rawDebt;
      const baseMonthKey = getMonthKeyFromDate(d.dueDate || d.createdAt);
      if (baseMonthKey && targetMonthKey < baseMonthKey) {
        return true; // past month in the installment chain
      }
    }
    return false;
  };

  // ── Próximos a Vencer (Dívidas, Contas Básicas e Faturas do Mês Selecionado / Vigente) ──
  const targetMonthForUpcoming = selectedMonth === 'all' ? currentMonthKey : selectedMonth;

  const getEffectiveDueDateForMonth = (item: UnifiedListItem, targetMonthKey: string): string => {
    // 1. If item has dueDate exactly in targetMonthKey:
    if (item.dueDate && getMonthKeyFromDate(item.dueDate) === targetMonthKey) {
      return item.dueDate;
    }

    // 2. If it matches target month via recurrence/installments:
    if (itemMatchesMonth(item, targetMonthKey)) {
      if (item.rawExpense?.recurrenceDay) {
        return `${targetMonthKey}-${String(item.rawExpense.recurrenceDay).padStart(2, '0')}`;
      }
      if (item.dueDate) {
        const parts = item.dueDate.split('T')[0].split('-');
        if (parts.length >= 3) {
          return `${targetMonthKey}-${parts[2].padStart(2, '0')}`;
        }
      }
    }

    // 3. Fallback to existing dueDate
    return item.dueDate || '';
  };

  // Filter all items that must be paid in this month (or are overdue unpaid)
  const unpaidItemsForUpcoming = allItems.filter(item => {
    // If already paid for this target month, do not show in upcoming pending
    if (isItemPaidInMonth(item, targetMonthForUpcoming)) {
      return false;
    }

    // Matches the researched month (includes basic utilities, bills, cards, loans, debts)
    if (itemMatchesMonth(item, targetMonthForUpcoming)) {
      return true;
    }

    // Overdue from a past month and completely unpaid
    if (item.dueDate && getMonthKeyFromDate(item.dueDate) < targetMonthForUpcoming && !item.isPaid) {
      return true;
    }

    return false;
  });

  const upcomingList: UpcomingItem[] = unpaidItemsForUpcoming.map(item => {
    const effectiveDueDate = getEffectiveDueDateForMonth(item, targetMonthForUpcoming);
    const info = parseDueDateInfo(effectiveDueDate);
    const isExpense = item.itemType === 'bill_expense' || item.itemType === 'card_expense';
    const isCredit = isCreditCategory(item.category);
    const bankInfo = item.bank ? getBankInfo(item.bank) : null;

    let subTitle = getCategoryLabel(item.category);
    if (isExpense && isCredit && bankInfo) {
      subTitle = item.category === 'loan' ? `Empréstimo · ${bankInfo.name}` : `Cartão · ${bankInfo.name}`;
    } else if (item.itemType === 'debt') {
      subTitle = item.category === 'monthly_bill' ? 'Conta Fixa Mensal' : getCategoryLabel(item.category);
    }

    const itemAmount = item.itemType === 'debt'
      ? (Number(item.installmentAmount || item.amount) || 0)
      : (Number(item.amount) || 0);

    return {
      id: item.id,
      sourceType: isExpense ? 'expense' : 'debt',
      title: item.name,
      subTitle,
      amount: itemAmount,
      dueDate: effectiveDueDate,
      daysUntil: info.daysUntil,
      statusText: info.statusText,
      statusBadgeClass: info.badgeClass,
      category: item.category,
      bank: item.bank,
      rawDebt: item.rawDebt,
      rawExpense: item.rawExpense,
    };
  });

  // Sort upcoming: overdue first (< 0), then today (0), then chronological soonest
  upcomingList.sort((a, b) => a.daysUntil - b.daysUntil);

  // Show all items to be paid for the selected month (no .slice(0, 4) limit!)
  const activeUpcoming = upcomingList;

  // ── Monthly metrics calculation (Dívidas/Contas + Receitas) ───────────────
  const monthForMetrics = selectedMonth === 'all' ? currentMonthKey : selectedMonth;
  const monthItems = allItems.filter(item => itemMatchesMonth(item, monthForMetrics));

  const monthTotalAmount = monthItems.reduce((acc, it) => {
    const amt = it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount;
    return acc + (Number(amt) || 0);
  }, 0);

  const monthPendingAmount = monthItems
    .filter(it => !isItemPaidInMonth(it, monthForMetrics))
    .reduce((acc, it) => {
      const amt = it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount;
      return acc + (Number(amt) || 0);
    }, 0);

  const monthPaidAmount = monthItems
    .filter(it => isItemPaidInMonth(it, monthForMetrics))
    .reduce((acc, it) => {
      const amt = it.itemType === 'debt' ? (it.installmentAmount || it.amount) : it.amount;
      return acc + (Number(amt) || 0);
    }, 0);

  const monthPendingCount = monthItems.filter(it => !isItemPaidInMonth(it, monthForMetrics)).length;
  const monthPaidCount = monthItems.filter(it => isItemPaidInMonth(it, monthForMetrics)).length;

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
    return itemMatchesMonth(item, selectedMonth);
  });

  // Then filter by Category / Tab
  const filteredItems = monthFilteredItems
    .filter(item => {
      const isPaidForView = selectedMonth !== 'all' ? isItemPaidInMonth(item, selectedMonth) : item.isPaid;
      if (filter === 'Cartões') return isCreditCategory(item.category);
      if (filter === 'Mensais') return !isCreditCategory(item.category);
      if (filter === 'Pagos') return isPaidForView === true;
      if (filter === 'Pendentes') return !isPaidForView;
      return true;
    })
    .sort((a, b) => {
      const isPaidA = selectedMonth !== 'all' ? isItemPaidInMonth(a, selectedMonth) : a.isPaid;
      const isPaidB = selectedMonth !== 'all' ? isItemPaidInMonth(b, selectedMonth) : b.isPaid;
      if (filter === 'Valor') return b.amount - a.amount;
      // Pending first, paid last
      if (isPaidA !== isPaidB) return isPaidA ? 1 : -1;
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
            Controle unificado de dívidas, contas fixas (água, luz, net), cartões e relação com receitas por mês.
          </p>
        </div>
      </div>

      {/* Stats Cards (Totais Gerais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total em aberto (Dívidas + Contas + Cartões) */}
        <div className="bg-sp-purple text-white rounded-3xl p-6 shadow-md relative overflow-hidden md:col-span-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">TOTAL GERAL EM ABERTO</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{formatCurrency(totalCombinedDebt)}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/15 text-[11px] font-semibold text-white/90">
            <span>Contas/Dívidas: {formatCurrency(totalBillsUnpaid)}</span>
            <span>•</span>
            <span>Cartões: {formatCurrency(totalCardUnpaid)}</span>
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
            <p className="text-[10px] font-semibold text-sp-text-subtle mt-0.5">Dívidas, contas e faturas a pagar</p>
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
            <p className="text-[10px] font-semibold text-sp-text-subtle mt-0.5">Contas e dívidas quitadas</p>
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

          {/* 2. Dívidas / Contas a Pagar */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sp-text-subtle">
                  Total Contas/Dívidas
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
                <span className="text-emerald-600 font-bold">Tudo quitado este mês! ({formatCurrency(monthPaidAmount)}) 🎉</span>
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
              <span>Dívidas/Contas do Mês: <strong className="text-sp-text-dark">{formatCurrency(monthTotalAmount)}</strong></span>
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
                  Sua receita cobre todas as dívidas e contas deste mês, sobrando {formatCurrency(monthBalance)} livres.
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

      {/* 🗓️ SELETOR DE MÊS (FILTRO POR MÊS - DESDE JANEIRO) */}
      <div className="space-y-2 bg-white/70 backdrop-blur-xs p-3 rounded-2xl border border-sp-border shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sp-text-sec flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sp-purple" /> Filtrar Dívidas e Contas por Mês
            </span>
            {selectedMonth !== 'all' && (
              <span className="text-[10px] font-bold text-sp-purple bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {getMonthName(selectedMonth)}
              </span>
            )}
          </div>

          {/* Quick Dropdown Selector for immediate jump without scrolling */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-sp-text-sec font-medium hidden sm:inline">Pular para:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold bg-white border border-sp-border rounded-xl px-2.5 py-1 text-sp-text-dark hover:border-sp-purple focus:outline-none focus:ring-2 focus:ring-sp-purple/20 transition-all cursor-pointer shadow-xs"
              aria-label="Selecionar mês diretamente"
            >
              <option value="all">Todos os Meses</option>
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.isCurrent ? '(Atual)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous month button */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-full border border-sp-border bg-white hover:bg-slate-100 flex items-center justify-center text-sp-text-sec hover:text-sp-purple shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Mês anterior / Rolar esquerda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={monthScrollRef}
            onMouseDown={onMouseDownMonthBar}
            onMouseLeave={onMouseLeaveOrUpMonthBar}
            onMouseUp={onMouseLeaveOrUpMonthBar}
            onMouseMove={onMouseMoveMonthBar}
            onWheel={(e) => {
              if (monthScrollRef.current && e.deltaY !== 0) {
                monthScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex gap-2 overflow-x-auto py-1.5 scroll-smooth flex-1 select-none month-scrollbar cursor-grab active:cursor-grabbing"
          >
            {/* Todos os Meses */}
            <button
              type="button"
              data-active={selectedMonth === 'all'}
              onClick={() => setSelectedMonth('all')}
              className={cn(
                "font-bold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap",
                selectedMonth === 'all'
                  ? "bg-slate-900 border-transparent text-white shadow-sm ring-2 ring-slate-900/20"
                  : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
              )}
            >
              Todos os Meses
            </button>

            {monthOptions.map(opt => (
              <button
                type="button"
                key={opt.value}
                data-active={selectedMonth === opt.value}
                onClick={() => setSelectedMonth(opt.value)}
                className={cn(
                  "font-semibold text-xs py-2 px-3.5 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap flex items-center gap-1.5",
                  selectedMonth === opt.value
                    ? "bg-sp-purple border-transparent text-white shadow-sm font-bold ring-2 ring-sp-purple/20"
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
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-full border border-sp-border bg-white hover:bg-slate-100 flex items-center justify-center text-sp-text-sec hover:text-sp-purple shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Próximo mês / Rolar direita"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🚨 PRÓXIMOS A VENCER (Dívidas, Contas e Faturas do Mês) */}
      <div className="bg-white border border-sp-border rounded-3xl p-5 sm:p-6 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <h3 className="text-base sm:text-lg font-extrabold text-sp-text-dark leading-tight">
                Próximos a Vencer
              </h3>
              <span className="text-[10px] font-bold text-sp-purple bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                {selectedMonth !== 'all' ? getMonthName(selectedMonth) : 'Mês Vigente'}
              </span>
            </div>
            <p className="text-xs font-semibold text-sp-text-sec mt-0.5">
              Dívidas, contas básicas e faturas com vencimento {selectedMonth === 'all' ? 'no mês vigente' : `em ${getMonthName(selectedMonth)}`} ou em atraso
            </p>
          </div>
          <span className="text-xs font-bold text-sp-purple bg-sp-purple/10 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
            {activeUpcoming.length} {activeUpcoming.length === 1 ? 'item a pagar' : 'itens a pagar'}
          </span>
        </div>

        {activeUpcoming.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-sp-border rounded-2xl bg-slate-50/50">
            <p className="text-xs font-semibold text-sp-text-sec">
              Nenhuma conta pendente para {selectedMonth === 'all' ? 'o mês vigente' : getMonthName(selectedMonth)}! 🎉
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeUpcoming.map((item) => {
              const isExpense = item.sourceType === 'expense';
              const IconComponent = getCategoryIcon(item.category, item.title);

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-sp-border rounded-2xl flex flex-col justify-between transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isCreditCategory(item.category) ? "bg-purple-100 text-sp-purple" : "bg-blue-100 text-blue-600"
                      )}>
                        <IconComponent className="w-4 h-4" />
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
          { key: 'Pagos',     label: selectedMonth === 'all' ? '✅ Pagos' : '✅ Pagos no Mês' },
          { key: 'Mensais',   label: '💡 Contas Fixas (Água/Luz/Net)' },
          { key: 'Cartões',   label: '💳 Cartões & Emprést.' },
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

      {/* Debt, Bill & Card Items List */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const isDebt = item.itemType === 'debt';
            const isPaid = selectedMonth !== 'all' ? isItemPaidInMonth(item, selectedMonth) : item.isPaid;

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
                              {debt.category === 'monthly_bill' ? 'Conta Fixa' : 'Dívida'}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-sp-text-sec mt-0.5">
                            {getCategoryLabel(debt.category)} · {formatDueDate(debt.dueDate)}
                          </p>
                        </div>
                        <span className={cn("font-extrabold text-base shrink-0 ml-2", isPaid ? 'text-emerald-500' : 'text-sp-purple')}>
                          {formatCurrency(selectedMonth !== 'all' && debt.installmentAmount ? debt.installmentAmount : debt.remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {debt.category === 'monthly_bill' && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-wider">
                        Conta Mensal
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

            // Render Expense Item (Credit Card, Loan OR Basic Bills like Agua, Luz, Internet)
            if (item.rawExpense) {
              const exp = item.rawExpense;
              const isCredit = isCreditCategory(exp.category);
              const bankInfo = isCredit ? getBankInfo(exp.bank) : null;
              const meta = extractExpenseMeta(exp);
              const IconComp = getCategoryIcon(exp.category, exp.name);
              const colorClass = getCategoryColor(exp.category, isPaid);

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
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", colorClass)}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-extrabold text-base truncate", isPaid ? 'text-sp-text-sec line-through decoration-emerald-400' : 'text-sp-text-dark')}>
                              {exp.name}
                            </h3>
                            {bankInfo && (
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider", bankInfo.badge)}>
                                {bankInfo.name}
                              </span>
                            )}
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap",
                              isCredit ? "text-sp-purple bg-purple-50 border border-purple-100" : "text-blue-700 bg-blue-50 border border-blue-100"
                            )}>
                              {exp.category === 'loan' ? 'Empréstimo' :
                               exp.category === 'overdraft' ? 'Cheque Especial' :
                               exp.category === 'credit_card' ? 'Cartão' :
                               getCategoryLabel(exp.category)}
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
                        title="Ver em Despesas"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Despesas
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
               filter === 'Mensais' ? `Nenhuma conta fixa ou mensal encontrada para ${selectedMonth === 'all' ? 'o período' : getMonthName(selectedMonth)}.` :
               `Nenhuma dívida ou conta encontrada para ${selectedMonth === 'all' ? 'o filtro atual' : getMonthName(selectedMonth)}.`}
            </p>
            {selectedMonth !== 'all' && (
              <button
                onClick={() => setSelectedMonth('all')}
                className="text-xs font-bold text-sp-purple bg-white border border-sp-purple/30 hover:bg-sp-purple/5 px-4 py-2 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Ver todas as contas e meses
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
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Conta Fixa Recorrente</p>
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