import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Expense } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, parseCurrency, addMonthsToDate, cn } from "../lib/utils";
import { 
  Plus, Pencil, Trash2, ShoppingCart, Home, Car, Heart, GraduationCap, 
  Zap, Tv, MoreHorizontal, Calendar, CheckCircle2, Clock, TrendingDown, 
  Repeat, CreditCard, Landmark, ChevronDown, ChevronUp, Percent, ChevronRight,
  ChevronLeft, Filter, AlertTriangle
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "loan", label: "Empréstimo / Financiamento" },
  { value: "overdraft", label: "Cheque Especial / Limite Conta" },
  { value: "housing", label: "Moradia" },
  { value: "food", label: "Alimentação" },
  { value: "transport", label: "Transporte" },
  { value: "health", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "utilities", label: "Contas básicas" },
  { value: "entertainment", label: "Lazer" },
  { value: "other", label: "Outros" },
];

export const BANK_OPTIONS = [
  { id: "nubank", name: "Nubank", bg: "bg-purple-600 text-white", badge: "bg-purple-100 text-purple-700", border: "border-purple-300", accent: "#9333ea" },
  { id: "itau", name: "Itaú", bg: "bg-orange-600 text-white", badge: "bg-orange-100 text-orange-700", border: "border-orange-300", accent: "#ea580c" },
  { id: "bb", name: "Banco do Brasil", bg: "bg-yellow-400 text-blue-950", badge: "bg-yellow-100 text-blue-900", border: "border-yellow-300", accent: "#eab308" },
  { id: "santander", name: "Santander", bg: "bg-red-600 text-white", badge: "bg-red-100 text-red-700", border: "border-red-300", accent: "#dc2626" },
  { id: "bradesco", name: "Bradesco", bg: "bg-rose-700 text-white", badge: "bg-rose-100 text-rose-800", border: "border-rose-300", accent: "#be123c" },
  { id: "inter", name: "Inter", bg: "bg-orange-500 text-white", badge: "bg-orange-50 text-orange-600", border: "border-orange-200", accent: "#f97316" },
  { id: "c6", name: "C6 Bank", bg: "bg-slate-900 text-white", badge: "bg-slate-100 text-slate-900", border: "border-slate-400", accent: "#0f172a" },
  { id: "caixa", name: "Caixa", bg: "bg-blue-600 text-white", badge: "bg-blue-100 text-blue-700", border: "border-blue-300", accent: "#2563eb" },
  { id: "outro", name: "Outro", bg: "bg-slate-700 text-white", badge: "bg-slate-100 text-slate-700", border: "border-slate-300", accent: "#475569" },
];

export const getBankInfo = (bankId?: string) =>
  BANK_OPTIONS.find(b => b.id === bankId || b.name.toLowerCase() === (bankId || "").toLowerCase()) || {
    id: "outro", name: bankId || "Outro", bg: "bg-slate-800 text-white", badge: "bg-slate-100 text-slate-700", border: "border-slate-300", accent: "#475569"
  };

const catIcon = (cat: string) => {
  switch (cat) {
    case "credit_card": return CreditCard;
    case "loan": return Landmark;
    case "overdraft": return Landmark;
    case "housing": return Home;
    case "food": return ShoppingCart;
    case "transport": return Car;
    case "health": return Heart;
    case "education": return GraduationCap;
    case "utilities": return Zap;
    case "entertainment": return Tv;
    default: return MoreHorizontal;
  }
};

const catColor = (cat: string) => {
  switch (cat) {
    case "credit_card": return "bg-purple-50 text-purple-600";
    case "loan": return "bg-indigo-50 text-indigo-600";
    case "overdraft": return "bg-orange-50 text-orange-600";
    case "housing": return "bg-blue-50 text-blue-600";
    case "food": return "bg-emerald-50 text-sp-mint";
    case "transport": return "bg-amber-50 text-amber-600";
    case "health": return "bg-rose-50 text-rose-600";
    case "education": return "bg-indigo-50 text-indigo-600";
    case "utilities": return "bg-purple-50 text-sp-purple";
    case "entertainment": return "bg-fuchsia-50 text-fuchsia-600";
    default: return "bg-slate-100 text-slate-600";
  }
};

const catLabel = (cat: string) =>
  BUILTIN_CATEGORIES.find(c => c.value === cat)?.label ?? cat;

export const extractExpenseMeta = (expense: Expense) => {
  let interestRate = Number(expense.interestRate) || 0;
  let totalInstallments = Number(expense.totalInstallments) || 0;
  let installmentNumber = Number(expense.installmentNumber) || 0;
  let baseType = expense.type || 'fixed';

  if (typeof expense.type === 'string' && expense.type.startsWith('{')) {
    try {
      const parsed = JSON.parse(expense.type);
      if (parsed.interestRate !== undefined && !interestRate) interestRate = Number(parsed.interestRate) || 0;
      if (parsed.totalInstallments !== undefined && !totalInstallments) totalInstallments = Number(parsed.totalInstallments) || 0;
      if (parsed.installmentNumber !== undefined && !installmentNumber) installmentNumber = Number(parsed.installmentNumber) || 0;
      if (parsed.baseType) baseType = parsed.baseType;
    } catch {}
  }

  return { interestRate, totalInstallments, installmentNumber, baseType };
};

export const cleanBaseName = (name: string) => {
  return (name || '')
    .replace(/\s*\(\d+(\s*\/\s*\d+)?\)$/, '')
    .replace(/\s*-\s*Parcela\s*\d+(\s*\/\s*\d+)?.*$/i, '')
    .replace(/\s*-\s*Fatura\s+.*$/i, '')
    .trim();
};

export interface CardGroup {
  key: string;
  name: string;
  bank: string;
  category: string;
  cardLimit: number;
  interestRate: number;
  invoices: Expense[];
  unpaidInvoices: Expense[];
  paidInvoices: Expense[];
  currentInvoice: Expense | null;
  totalCommitted: number;
  availableLimit: number;
  usagePct: number;
}

export interface LoanGroup {
  key: string;
  name: string;
  bank: string;
  category: "loan";
  interestRate: number;
  totalInstallments: number;
  installmentAmount: number;
  totalLoanAmount: number;
  installments: Expense[];
  unpaidInstallments: Expense[];
  paidInstallments: Expense[];
  nextInstallment: Expense | null;
  totalRemaining: number;
  totalPaid: number;
  progressPct: number;
}

type FormData = {
  name: string;
  amount: any;
  category: string;
  type: "fixed" | "variable";
  dueDate: string;
  isPaid: boolean;
  recurrenceDay: number;
  repeatMonths: number;
  cardLimit: any;
  bank: string;
  interestRate: any;
  totalInstallments: any;
  installmentAmount: any;
  paidInstallments: any;
};

export const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"normal" | "cards" | "loans" | "pending" | "paid" | "future" | "all">("normal");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Month filtering state (YYYY-MM)
  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const formatMonthLabel = (monthKey: string) => {
    if (!monthKey || monthKey === 'all') return 'Todos os Meses';
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const MONTH_NAMES = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${MONTH_NAMES[month]} de ${year}`;
  };

  const getAdjacentMonth = (monthKey: string, delta: number) => {
    const base = monthKey === 'all' ? currentMonthKey : monthKey;
    const [yearStr, monthStr] = base.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + delta;
    if (month > 12) {
      month = 1;
      year++;
    } else if (month < 1) {
      month = 12;
      year--;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => getAdjacentMonth(prev, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => getAdjacentMonth(prev, 1));
  };

  // Expanded cards & loans state
  const [expandedCardKeys, setExpandedCardKeys] = useState<Record<string, boolean>>({});
  const [expandedLoanKeys, setExpandedLoanKeys] = useState<Record<string, boolean>>({});

  // Quick modals for adding invoice/installment to an existing card or loan
  const [addInvoiceTarget, setAddInvoiceTarget] = useState<CardGroup | null>(null);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState<string>('');
  const [newInvoiceDate, setNewInvoiceDate] = useState<string>('');

  const [addInstallmentTarget, setAddInstallmentTarget] = useState<LoanGroup | null>(null);
  const [newInstallmentAmount, setNewInstallmentAmount] = useState<string>('');
  const [newInstallmentDate, setNewInstallmentDate] = useState<string>('');

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<FormData>({
    defaultValues: {
      name: "",
      amount: "",
      category: "other",
      type: "fixed",
      dueDate: "",
      isPaid: false,
      recurrenceDay: 1,
      repeatMonths: 1,
      cardLimit: "",
      bank: "nubank",
      interestRate: "",
      totalInstallments: 12,
      installmentAmount: "",
      paidInstallments: 0,
    }
  });

  const fetchExpenses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data } = await supabase.from("expenses").select("*").eq("userId", user.id).eq("isActive", true);
    if (data) setExpenses(data as Expense[]);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const today = new Date().toISOString().split("T")[0];

  const toggleCardExpanded = (key: string) => {
    setExpandedCardKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLoanExpanded = (key: string) => {
    setExpandedLoanKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openAdd = (defaultCat?: string) => {
    setEditingExpense(null);
    const cat = defaultCat || (tab === "cards" ? "credit_card" : tab === "loans" ? "loan" : "other");
    reset({ 
      name: cat === "credit_card" ? "Fatura Cartão Nubank" : cat === "loan" ? "Empréstimo Pessoal Caixa" : cat === "overdraft" ? "Cheque Especial Itaú" : "", 
      amount: "", 
      category: cat, 
      type: "fixed", 
      dueDate: today, 
      isPaid: false, 
      recurrenceDay: 1, 
      repeatMonths: cat === "credit_card" ? 1 : 1,
      cardLimit: "",
      bank: cat === "loan" ? "caixa" : "nubank",
      interestRate: cat === "credit_card" ? 14.5 : cat === "loan" ? 2.5 : "",
      totalInstallments: 12,
      installmentAmount: "",
      paidInstallments: 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const meta = extractExpenseMeta(expense);
    reset({
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      type: (meta.baseType as any) || "fixed",
      dueDate: expense.dueDate || today,
      isPaid: expense.isPaid || false,
      recurrenceDay: expense.recurrenceDay || 1,
      repeatMonths: 1,
      cardLimit: expense.cardLimit || "",
      bank: expense.bank || "nubank",
      interestRate: meta.interestRate || "",
      totalInstallments: meta.totalInstallments || 12,
      installmentAmount: expense.amount || "",
      paidInstallments: 0,
    });
    setIsModalOpen(true);
  };

  const togglePaid = async (expense: Expense) => {
    setTogglingId(expense.id);
    try {
      const nowPaid = !expense.isPaid;
      await supabase.from("expenses").update({
        isPaid: nowPaid,
        paymentDate: nowPaid ? new Date().toISOString().split("T")[0] : null,
        updatedAt: new Date().toISOString(),
      }).eq("id", expense.id);
      toast.success(nowPaid ? "Marcado como pago!" : "Marcado como pendente");
      await fetchExpenses();
    } catch { toast.error("Erro ao atualizar status"); }
    finally { setTogglingId(null); }
  };

  const onSubmit = async (data: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);
    try {
      const parsedAmount = parseCurrency(data.amount);
      const parsedLimit = parseCurrency(data.cardLimit) || 0;
      const parsedInterest = parseCurrency(data.interestRate) || 0;
      const parsedTotalInst = Number(data.totalInstallments) || 12;
      const parsedPaidInst = Number(data.paidInstallments) || 0;

      if (editingExpense) {
        // Editing existing expense
        const meta = {
          baseType: data.type,
          interestRate: parsedInterest,
          totalInstallments: parsedTotalInst,
        };
        const payload: any = {
          name: data.name,
          category: data.category,
          amount: parsedAmount,
          type: JSON.stringify(meta),
          dueDate: data.dueDate || null,
          isPaid: data.isPaid,
          paymentDate: data.isPaid ? (data.dueDate || today) : null,
          recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
          cardLimit: parsedLimit,
          bank: data.bank || null,
          interestRate: parsedInterest,
          updatedAt: new Date().toISOString(),
        };

        await supabase.from("expenses").update(payload).eq("id", editingExpense.id).throwOnError();
        
        // If it's a card and cardLimit or interestRate was updated, also update sister invoices of that card
        if (data.category === "credit_card" || data.category === "overdraft") {
          const baseName = cleanBaseName(editingExpense.name);
          const sisterInvoices = expenses.filter(e => 
            e.id !== editingExpense.id &&
            (e.category === "credit_card" || e.category === "overdraft") &&
            (e.bank || 'outro') === (editingExpense.bank || 'outro') &&
            cleanBaseName(e.name) === baseName
          );
          if (sisterInvoices.length > 0) {
            const sisterIds = sisterInvoices.map(s => s.id);
            await supabase.from("expenses").update({
              cardLimit: parsedLimit,
              bank: data.bank || null,
              interestRate: parsedInterest,
              updatedAt: new Date().toISOString(),
            }).in("id", sisterIds);
          }
        }

        toast.success("Despesa atualizada com sucesso!");
      } else if (data.category === "loan") {
        // Create full loan with installments
        const baseDate = data.dueDate || today;
        const totalInst = Math.min(120, Math.max(1, parsedTotalInst));
        const entries: any[] = [];

        for (let i = 0; i < totalInst; i++) {
          const itemDueDate = addMonthsToDate(baseDate, i);
          const isItemPaid = i < parsedPaidInst;
          const instNum = i + 1;
          const meta = {
            baseType: 'fixed',
            interestRate: parsedInterest,
            totalInstallments: totalInst,
            installmentNumber: instNum,
          };
          entries.push({
            name: `${cleanBaseName(data.name)} (${instNum}/${totalInst})`,
            category: "loan",
            amount: parsedAmount,
            type: JSON.stringify(meta),
            dueDate: itemDueDate,
            isPaid: isItemPaid,
            paymentDate: isItemPaid ? today : null,
            recurrenceDay: itemDueDate ? parseInt(itemDueDate.split("-")[2] || "1", 10) : 1,
            bank: data.bank || null,
            interestRate: parsedInterest,
            totalInstallments: totalInst,
            installmentNumber: instNum,
            userId: user.id,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await supabase.from("expenses").insert(entries).throwOnError();
        toast.success(`Empréstimo cadastrado com ${totalInst} parcelas!`);
      } else {
        // Normal expense or credit card with potential repeating months
        const repeatCount = data.repeatMonths ? Math.min(60, Math.max(1, Number(data.repeatMonths))) : 1;
        const baseDate = data.dueDate || today;
        const recurrenceDay = data.recurrenceDay ? Number(data.recurrenceDay) : (baseDate ? parseInt(baseDate.split("-")[2] || "1", 10) : 1);
        const entries: any[] = [];

        for (let i = 0; i < repeatCount; i++) {
          const itemDueDate = addMonthsToDate(baseDate, i);
          const isFirstPaid = i === 0 ? Boolean(data.isPaid) : false;
          const meta = {
            baseType: data.type,
            interestRate: parsedInterest,
          };
          entries.push({
            name: repeatCount > 1 ? `${cleanBaseName(data.name)} (${i + 1}/${repeatCount})` : data.name,
            category: data.category,
            amount: parsedAmount,
            type: JSON.stringify(meta),
            dueDate: itemDueDate,
            isPaid: isFirstPaid,
            paymentDate: isFirstPaid ? (data.dueDate || today) : null,
            recurrenceDay,
            cardLimit: parsedLimit,
            bank: data.bank || null,
            interestRate: parsedInterest,
            userId: user.id,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await supabase.from("expenses").insert(entries).throwOnError();
        toast.success(
          data.category === "credit_card"
            ? (repeatCount > 1 ? `Cartão cadastrado com ${repeatCount} faturas!` : "Fatura de cartão cadastrada!")
            : (repeatCount > 1 ? `${repeatCount} despesas mensais criadas!` : "Despesa cadastrada!")
        );
      }

      setIsModalOpen(false);
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar despesa");
    } finally { setIsSubmitting(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      await supabase.from("expenses").update({ isActive: false }).eq("id", id);
      toast.success("Registro removido");
      await fetchExpenses();
    } catch { toast.error("Erro ao remover"); }
  };

  const deleteCardGroup = async (group: CardGroup) => {
    if (!confirm(`Deseja realmente excluir o cartão "${group.name}" e todas as suas ${group.invoices.length} faturas?`)) return;
    try {
      const ids = group.invoices.map(i => i.id);
      await supabase.from("expenses").update({ isActive: false }).in("id", ids);
      toast.success("Cartão e faturas removidos");
      await fetchExpenses();
    } catch {
      toast.error("Erro ao remover cartão");
    }
  };

  const deleteLoanGroup = async (group: LoanGroup) => {
    if (!confirm(`Deseja realmente excluir o empréstimo "${group.name}" e todas as suas ${group.installments.length} parcelas?`)) return;
    try {
      const ids = group.installments.map(i => i.id);
      await supabase.from("expenses").update({ isActive: false }).in("id", ids);
      toast.success("Empréstimo e parcelas removidos");
      await fetchExpenses();
    } catch {
      toast.error("Erro ao remover empréstimo");
    }
  };

  // Quick action: Add next invoice to an existing card
  const openAddInvoiceForCard = (group: CardGroup) => {
    setAddInvoiceTarget(group);
    const latestDue = group.invoices[group.invoices.length - 1]?.dueDate || today;
    setNewInvoiceDate(addMonthsToDate(latestDue, 1));
    setNewInvoiceAmount('');
  };

  const handleSaveNextInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addInvoiceTarget) return;
    const parsedAmt = parseCurrency(newInvoiceAmount);
    if (parsedAmt <= 0) {
      toast.error("Informe um valor válido para a fatura");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    try {
      const nextNum = addInvoiceTarget.invoices.length + 1;
      const meta = {
        baseType: 'fixed',
        interestRate: addInvoiceTarget.interestRate,
      };
      const payload: any = {
        name: `${addInvoiceTarget.name} (${nextNum})`,
        category: addInvoiceTarget.category,
        amount: parsedAmt,
        type: JSON.stringify(meta),
        dueDate: newInvoiceDate || today,
        isPaid: false,
        paymentDate: null,
        recurrenceDay: newInvoiceDate ? parseInt(newInvoiceDate.split('-')[2] || '1', 10) : 1,
        cardLimit: addInvoiceTarget.cardLimit,
        bank: addInvoiceTarget.bank,
        interestRate: addInvoiceTarget.interestRate,
        userId: user.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.from("expenses").insert([payload]).throwOnError();
      toast.success("Próxima fatura adicionada ao cartão!");
      setAddInvoiceTarget(null);
      setNewInvoiceAmount('');
      setNewInvoiceDate('');
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar fatura");
    }
  };

  // Quick action: Add next installment to an existing loan
  const openAddInstallmentForLoan = (group: LoanGroup) => {
    setAddInstallmentTarget(group);
    const latestDue = group.installments[group.installments.length - 1]?.dueDate || today;
    setNewInstallmentDate(addMonthsToDate(latestDue, 1));
    setNewInstallmentAmount(group.installmentAmount ? group.installmentAmount.toString() : '');
  };

  const handleSaveNextInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addInstallmentTarget) return;
    const parsedAmt = parseCurrency(newInstallmentAmount);
    if (parsedAmt <= 0) {
      toast.error("Informe um valor válido para a parcela");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    try {
      const nextNum = addInstallmentTarget.installments.length + 1;
      const totalInst = Math.max(nextNum, addInstallmentTarget.totalInstallments);
      const meta = {
        baseType: 'fixed',
        interestRate: addInstallmentTarget.interestRate,
        totalInstallments: totalInst,
        installmentNumber: nextNum,
      };
      const payload: any = {
        name: `${addInstallmentTarget.name} (${nextNum}/${totalInst})`,
        category: "loan",
        amount: parsedAmt,
        type: JSON.stringify(meta),
        dueDate: newInstallmentDate || today,
        isPaid: false,
        paymentDate: null,
        recurrenceDay: newInstallmentDate ? parseInt(newInstallmentDate.split('-')[2] || '1', 10) : 1,
        bank: addInstallmentTarget.bank,
        interestRate: addInstallmentTarget.interestRate,
        totalInstallments: totalInst,
        installmentNumber: nextNum,
        userId: user.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.from("expenses").insert([payload]).throwOnError();
      toast.success("Parcela adicionada ao empréstimo!");
      setAddInstallmentTarget(null);
      setNewInstallmentAmount('');
      setNewInstallmentDate('');
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar parcela");
    }
  };

  // ── Categorization helpers ──────────────────────────────────────────────────
  const isCardExpense = (e: Expense) => e.category === 'credit_card' || e.category === 'overdraft';
  const isLoanExpense = (e: Expense) => e.category === 'loan';
  const isNormalExpense = (e: Expense) => !isCardExpense(e) && !isLoanExpense(e);
  const isFuture = (e: Expense) => !!(e.dueDate && e.dueDate > today && !e.isPaid);

  // Filter rule:
  // "mostra as dividas dentro desse mes e as contas diversas que tem o vencimento de pagamento ate o mes que esta sendo filtrado e quando se troca o mes ele so mostra as dividas do mes pesquisado"
  const isExpenseInMonthFilter = (e: Expense, monthKey: string): boolean => {
    if (!monthKey || monthKey === 'all') return true;

    const isDebt = isCardExpense(e) || isLoanExpense(e);

    if (isDebt) {
      // Dívidas (cartões e empréstimos): APENAS do mês pesquisado!
      if (e.dueDate) {
        return e.dueDate.startsWith(monthKey);
      }
      return true;
    } else {
      // Contas diversas: com vencimento de pagamento ATÉ o mês filtrado
      if (e.dueDate) {
        const expMonth = e.dueDate.slice(0, 7);
        // Vence no mês filtrado: mostra sempre
        if (expMonth === monthKey) return true;
        // Venceu em mês anterior: mostra se AINDA NÃO foi paga
        if (expMonth < monthKey && !e.isPaid) return true;
        // Vencimento após o mês filtrado: não mostra
        return false;
      }
      return true;
    }
  };

  const filteredExpenses = expenses.filter(e => isExpenseInMonthFilter(e, selectedMonth));

  // ── GROUPING CARDS & OVERDRAFTS ─────────────────────────────────────────────
  const getCardGroups = (): CardGroup[] => {
    const cardExpenses = expenses.filter(isCardExpense);
    const groupsMap = new Map<string, CardGroup>();

    // If a month is selected, find which cards have invoices in that month
    const cardKeysInMonth = new Set<string>();
    if (selectedMonth !== 'all') {
      cardExpenses.forEach(exp => {
        if (exp.dueDate && exp.dueDate.startsWith(selectedMonth)) {
          const bank = exp.bank || 'outro';
          const baseName = cleanBaseName(exp.name) || (exp.category === 'overdraft' ? 'Cheque Especial' : 'Fatura Cartão');
          cardKeysInMonth.add(`${bank}__${baseName.toLowerCase()}`);
        }
      });
    }

    cardExpenses.forEach(exp => {
      const bank = exp.bank || 'outro';
      const baseName = cleanBaseName(exp.name) || (exp.category === 'overdraft' ? 'Cheque Especial' : 'Fatura Cartão');
      const key = `${bank}__${baseName.toLowerCase()}`;

      // If month is filtered, only include cards that have an invoice in this specific month
      if (selectedMonth !== 'all' && !cardKeysInMonth.has(key)) return;

      const meta = extractExpenseMeta(exp);
      const limit = Number(exp.cardLimit) || 0;
      const rate = meta.interestRate;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          name: baseName,
          bank,
          category: exp.category,
          cardLimit: limit,
          interestRate: rate,
          invoices: [],
          unpaidInvoices: [],
          paidInvoices: [],
          currentInvoice: null,
          totalCommitted: 0,
          availableLimit: 0,
          usagePct: 0,
        });
      }

      const grp = groupsMap.get(key)!;
      grp.invoices.push(exp);
      if (limit > grp.cardLimit) grp.cardLimit = limit;
      if (rate > 0 && !grp.interestRate) grp.interestRate = rate;
    });

    const groups = Array.from(groupsMap.values()).map(grp => {
      grp.invoices.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      
      if (selectedMonth !== 'all') {
        const monthInv = grp.invoices.find(i => i.dueDate && i.dueDate.startsWith(selectedMonth)) || null;
        grp.currentInvoice = monthInv;
        grp.unpaidInvoices = monthInv && !monthInv.isPaid ? [monthInv] : [];
        grp.paidInvoices = monthInv && monthInv.isPaid ? [monthInv] : [];
        grp.totalCommitted = Number(monthInv?.amount) || 0;
      } else {
        grp.unpaidInvoices = grp.invoices.filter(i => !i.isPaid);
        grp.paidInvoices = grp.invoices.filter(i => !!i.isPaid);
        grp.currentInvoice = grp.unpaidInvoices[0] || grp.invoices[grp.invoices.length - 1] || null;
        grp.totalCommitted = grp.unpaidInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      }
      grp.availableLimit = Math.max(0, grp.cardLimit - grp.totalCommitted);
      grp.usagePct = grp.cardLimit > 0 ? Math.min(100, Math.round((grp.totalCommitted / grp.cardLimit) * 100)) : 0;
      return grp;
    });

    return groups;
  };

  // ── GROUPING LOANS ──────────────────────────────────────────────────────────
  const getLoanGroups = (): LoanGroup[] => {
    const loanExpenses = expenses.filter(isLoanExpense);
    const groupsMap = new Map<string, LoanGroup>();

    // If month is selected, find which loans have an installment in that month
    const loanKeysInMonth = new Set<string>();
    if (selectedMonth !== 'all') {
      loanExpenses.forEach(exp => {
        if (exp.dueDate && exp.dueDate.startsWith(selectedMonth)) {
          const bank = exp.bank || 'outro';
          const baseName = cleanBaseName(exp.name) || 'Empréstimo';
          loanKeysInMonth.add(`${bank}__${baseName.toLowerCase()}`);
        }
      });
    }

    loanExpenses.forEach(exp => {
      const bank = exp.bank || 'outro';
      const baseName = cleanBaseName(exp.name) || 'Empréstimo';
      const key = `${bank}__${baseName.toLowerCase()}`;

      // If month is filtered, only include loans that have an installment in this specific month
      if (selectedMonth !== 'all' && !loanKeysInMonth.has(key)) return;

      const meta = extractExpenseMeta(exp);
      const rate = meta.interestRate;
      const totalInst = meta.totalInstallments || 1;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          name: baseName,
          bank,
          category: 'loan',
          interestRate: rate,
          totalInstallments: totalInst,
          installmentAmount: Number(exp.amount) || 0,
          totalLoanAmount: 0,
          installments: [],
          unpaidInstallments: [],
          paidInstallments: [],
          nextInstallment: null,
          totalRemaining: 0,
          totalPaid: 0,
          progressPct: 0,
        });
      }

      const grp = groupsMap.get(key)!;
      grp.installments.push(exp);
      if (rate > 0 && !grp.interestRate) grp.interestRate = rate;
      if (totalInst > grp.totalInstallments) grp.totalInstallments = totalInst;
      if (!grp.installmentAmount && exp.amount) grp.installmentAmount = Number(exp.amount) || 0;
    });

    const groups = Array.from(groupsMap.values()).map(grp => {
      grp.installments.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      
      if (selectedMonth !== 'all') {
        const monthInst = grp.installments.find(i => i.dueDate && i.dueDate.startsWith(selectedMonth)) || null;
        grp.nextInstallment = monthInst;
        grp.unpaidInstallments = monthInst && !monthInst.isPaid ? [monthInst] : [];
        grp.paidInstallments = monthInst && monthInst.isPaid ? [monthInst] : [];
        grp.totalRemaining = Number(monthInst?.amount) || 0;
      } else {
        grp.unpaidInstallments = grp.installments.filter(i => !i.isPaid);
        grp.paidInstallments = grp.installments.filter(i => !!i.isPaid);
        grp.nextInstallment = grp.unpaidInstallments[0] || grp.installments[grp.installments.length - 1] || null;
        grp.totalRemaining = grp.unpaidInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      }
      grp.totalPaid = grp.paidInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      grp.totalLoanAmount = grp.totalRemaining + grp.totalPaid;
      grp.progressPct = grp.totalLoanAmount > 0 
        ? Math.min(100, Math.round((grp.totalPaid / grp.totalLoanAmount) * 100))
        : 0;
      return grp;
    });

    return groups;
  };

  const cardGroups = getCardGroups();
  const loanGroups = getLoanGroups();
  const normalList = filteredExpenses.filter(isNormalExpense);

  const totalCardsLimit = cardGroups.reduce((acc, c) => acc + c.cardLimit, 0);
  const totalCardsNegative = cardGroups.reduce((acc, c) => acc + c.totalCommitted, 0);
  const totalCardsAvailable = Math.max(0, totalCardsLimit - totalCardsNegative);

  const totalLoanRemaining = loanGroups.reduce((acc, l) => acc + (selectedMonth !== 'all' ? (Number(l.nextInstallment?.amount) || 0) : l.totalRemaining), 0);
  const totalPending = filteredExpenses.reduce((acc, e) => acc + (e.isPaid ? 0 : Number(e.amount) || 0), 0);
  const totalPaid = filteredExpenses.reduce((acc, e) => acc + (e.isPaid ? Number(e.amount) || 0 : 0), 0);
  const countFuture = filteredExpenses.filter(e => isFuture(e)).length;

  const allTabs = [
    { id: "normal" as const, label: "📋 Despesas Normais", count: normalList.length },
    { id: "cards" as const, label: "💳 Somente Cartões", count: cardGroups.length },
    { id: "loans" as const, label: "🏦 Empréstimos", count: loanGroups.length },
    { id: "pending" as const, label: "A Pagar", count: filteredExpenses.filter(e => !e.isPaid && !isFuture(e)).length },
    { id: "paid" as const, label: "Pagas", count: filteredExpenses.filter(e => !!e.isPaid).length },
    { id: "future" as const, label: "Futuras", count: countFuture },
    { id: "all" as const, label: "Todas", count: filteredExpenses.length },
  ];

  // Filtering for cards
  const getFilteredCardGroups = () => {
    let list = cardGroups;
    if (selectedBank !== "all") {
      list = list.filter(c => (c.bank || "outro").toLowerCase() === selectedBank);
    }
    return list;
  };

  // ── RENDER CREDIT CARD (Grouped with future invoices inside) ────────────────
  const renderCardItem = (card: CardGroup) => {
    const bankInfo = getBankInfo(card.bank);
    const hasUnpaid = card.unpaidInvoices.length > 0;
    const isExpanded = expandedCardKeys[card.key] ?? false;
    const currentInv = card.currentInvoice;
    const isCurrentPaid = currentInv?.isPaid ?? false;

    return (
      <div 
        key={card.key}
        className={cn(
          "border rounded-2xl p-4 transition-all duration-200 relative group flex flex-col justify-between shadow-2xs hover:shadow-sm",
          !hasUnpaid ? "bg-emerald-50/20 border-emerald-200/80" : "bg-white border-slate-200 hover:border-purple-300"
        )}
      >
        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs", bankInfo.badge)}>
                <CreditCard className="w-2.5 h-2.5" />
                {bankInfo.name}
              </span>
              <span className="text-[9px] font-extrabold text-sp-text-subtle uppercase">
                {card.category === "overdraft" ? "Cheque Especial" : "Fatura Cartão"}
              </span>
              {card.interestRate > 0 && (
                <span className="text-[9px] font-black text-purple-700 bg-purple-100/70 border border-purple-200/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Percent className="w-2.5 h-2.5" />
                  {card.interestRate}% a.m.
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!hasUnpaid ? (
                <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Pagas
                </span>
              ) : (
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {card.unpaidInvoices.length} {card.unpaidInvoices.length === 1 ? 'A Pagar' : 'A Pagar'}
                </span>
              )}
              {currentInv && (
                <button onClick={() => openEdit(currentInv)} className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer" title="Editar Cartão">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => deleteCardGroup(card)} className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer" title="Excluir Cartão e Faturas">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className={cn("font-black text-base truncate", !hasUnpaid ? "text-emerald-950 opacity-80" : "text-slate-900")}>
            {card.name}
          </h3>

          {/* Available Limit Badge — always visible when limit is set */}
          {card.cardLimit > 0 && (
            <div className="mt-1.5 mb-2 flex items-center gap-2">
              {card.availableLimit > 0 ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Limite Disponível</p>
                    <p className="text-sm font-black text-emerald-700 leading-tight">{formatCurrency(card.availableLimit)}</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                    {100 - card.usagePct}% livre
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-wider text-rose-600">Limite Esgotado</p>
                    <p className="text-sm font-black text-rose-700 leading-tight">{formatCurrency(card.cardLimit)} (total)</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                    {card.usagePct}% usado
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Current / Next Invoice Box - Compact & balanced */}
          {currentInv && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black uppercase tracking-wider text-rose-600">
                  {isCurrentPaid ? "Fatura Paga" : "Saldo Negativo / Fatura"}
                </span>
                {currentInv.dueDate && (
                  <span className="font-semibold text-sp-text-sec flex items-center gap-1 text-[10px]">
                    <Calendar className="w-2.5 h-2.5 text-slate-400" />
                    Venc: {new Date(currentInv.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className={cn("text-xl sm:text-2xl font-black tracking-tight", isCurrentPaid ? "text-emerald-700" : "text-rose-600")}>
                  {formatCurrency(currentInv.amount)}
                </p>
                <button 
                  onClick={() => togglePaid(currentInv)} 
                  disabled={togglingId === currentInv.id}
                  className={cn(
                    "text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer shrink-0 shadow-2xs",
                    isCurrentPaid 
                      ? "bg-white text-sp-text-sec hover:bg-red-50 hover:text-sp-red-text border border-emerald-200" 
                      : "bg-sp-purple text-white hover:bg-sp-purple-hover"
                  )}
                >
                  {togglingId === currentInv.id ? "..." : isCurrentPaid ? (<><Clock className="w-3 h-3" /> Reabrir</>) : (<><CheckCircle2 className="w-3.5 h-3.5" /> Pagar Fatura</>)}
                </button>
              </div>
            </div>
          )}

          {/* Card Limit Usage Gauge */}
          {card.cardLimit > 0 && (
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-sp-text-sec">Limite Total: {formatCurrency(card.cardLimit)}</span>
                <span className="text-sp-text-sec">Comprometido: {formatCurrency(card.totalCommitted)}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500", 
                    card.usagePct > 80 ? "bg-rose-500" : card.usagePct > 50 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${card.usagePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-extrabold text-sp-text-subtle uppercase tracking-wider">
                <span>{card.usagePct}% utilizado do limite</span>
                <span>{card.invoices.length} fatura{card.invoices.length !== 1 ? 's' : ''} registrada{card.invoices.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Invoices List inside the same card (Próximas Faturas) */}
          <div className="mt-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={() => toggleCardExpanded(card.key)}
                className="flex items-center gap-1 text-[11px] font-extrabold text-slate-800 hover:text-sp-purple transition-all cursor-pointer"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-sp-purple" /> : <ChevronDown className="w-3.5 h-3.5 text-sp-purple" />}
                <span>Próximas Faturas</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-sp-purple font-black">
                  {card.invoices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAddInvoiceForCard(card)}
                className="text-[10px] font-bold text-sp-purple hover:bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                Nova Fatura
              </button>
            </div>

            {/* Invoices Accordion List */}
            {isExpanded && (
              <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {card.invoices.map((inv, idx) => {
                  const invPaid = !!inv.isPaid;
                  return (
                    <div 
                      key={inv.id}
                      className={cn(
                        "p-2 rounded-lg border flex items-center justify-between text-xs transition-all",
                        invPaid ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-sp-text-subtle w-4 text-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className={cn("font-bold text-xs", invPaid ? "line-through text-slate-500" : "text-slate-900")}>
                            {formatCurrency(inv.amount)}
                          </p>
                          <p className="text-[9px] text-sp-text-sec flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {inv.dueDate ? new Date(inv.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "Sem data"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePaid(inv)}
                          disabled={togglingId === inv.id}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer",
                            invPaid 
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          )}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {invPaid ? "Paga" : "Pagar"}
                        </button>
                        <button 
                          onClick={() => openEdit(inv)} 
                          className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer"
                          title="Editar Fatura"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(inv.id)} 
                          className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer"
                          title="Excluir Fatura"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER LOAN (Grouped with all installments inside) ──────────────────────
  const renderLoanItem = (loan: LoanGroup) => {
    const bankInfo = getBankInfo(loan.bank);
    const hasUnpaid = loan.unpaidInstallments.length > 0;
    const isExpanded = expandedLoanKeys[loan.key] ?? false;
    const nextInst = loan.nextInstallment;

    return (
      <div 
        key={loan.key}
        className={cn(
          "border rounded-2xl p-4 transition-all duration-200 relative group flex flex-col justify-between shadow-2xs hover:shadow-sm",
          !hasUnpaid ? "bg-emerald-50/20 border-emerald-200/80" : "bg-white border-slate-200 hover:border-indigo-300"
        )}
      >
        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs", bankInfo.badge)}>
                <Landmark className="w-2.5 h-2.5" />
                {bankInfo.name}
              </span>
              <span className="text-[9px] font-extrabold text-sp-text-subtle uppercase">
                Empréstimo
              </span>
              {loan.interestRate > 0 && (
                <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 border border-indigo-200/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Percent className="w-2.5 h-2.5" />
                  {loan.interestRate}% a.m.
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!hasUnpaid ? (
                <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Quitado
                </span>
              ) : (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {loan.paidInstallments.length}/{loan.installments.length} Pagas
                </span>
              )}
              {nextInst && (
                <button onClick={() => openEdit(nextInst)} className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer" title="Editar Empréstimo">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => deleteLoanGroup(loan)} className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer" title="Excluir Empréstimo e Parcelas">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className={cn("font-black text-base truncate mb-2", !hasUnpaid ? "text-emerald-950 opacity-80" : "text-slate-900")}>
            {loan.name}
          </h3>

          {/* Next Installment Box - Compact & balanced */}
          {nextInst && (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black uppercase tracking-wider text-indigo-700">
                  Parcela Atual ({loan.paidInstallments.length + 1}/{loan.installments.length})
                </span>
                {nextInst.dueDate && (
                  <span className="font-semibold text-sp-text-sec flex items-center gap-1 text-[10px]">
                    <Calendar className="w-2.5 h-2.5 text-slate-400" />
                    Venc: {new Date(nextInst.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                  {formatCurrency(nextInst.amount || loan.installmentAmount)}
                </p>
                <button 
                  onClick={() => togglePaid(nextInst)} 
                  disabled={togglingId === nextInst.id}
                  className="text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer shrink-0 shadow-2xs bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {togglingId === nextInst.id ? "..." : (<><CheckCircle2 className="w-3.5 h-3.5" /> Pagar Parcela</>)}
                </button>
              </div>
            </div>
          )}

          {/* Loan Repayment Progress */}
          <div className="mt-2.5 space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-sp-text-sec">Total: {formatCurrency(loan.totalLoanAmount)}</span>
              <span className="text-rose-700">Saldo Devedor: {formatCurrency(loan.totalRemaining)}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${loan.progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-extrabold text-sp-text-subtle uppercase tracking-wider">
              <span>{loan.unpaidInstallments.length} restantes</span>
              <span>{loan.progressPct}% Quitado ({formatCurrency(loan.totalPaid)})</span>
            </div>
          </div>

          {/* Installments List inside the same card */}
          <div className="mt-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={() => toggleLoanExpanded(loan.key)}
                className="flex items-center gap-1 text-[11px] font-extrabold text-slate-800 hover:text-indigo-600 transition-all cursor-pointer"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />}
                <span>Todas as Parcelas</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black">
                  {loan.installments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAddInstallmentForLoan(loan)}
                className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                Nova Parcela
              </button>
            </div>

            {/* Installments Accordion List */}
            {isExpanded && (
              <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {loan.installments.map((inst, idx) => {
                  const instPaid = !!inst.isPaid;
                  return (
                    <div 
                      key={inst.id}
                      className={cn(
                        "p-2 rounded-lg border flex items-center justify-between text-xs transition-all",
                        instPaid ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-sp-text-subtle w-5 text-center">
                          {idx + 1}ª
                        </span>
                        <div>
                          <p className={cn("font-bold text-xs", instPaid ? "line-through text-slate-500" : "text-slate-900")}>
                            {formatCurrency(inst.amount)}
                          </p>
                          <p className="text-[9px] text-sp-text-sec flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {inst.dueDate ? new Date(inst.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "Sem data"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePaid(inst)}
                          disabled={togglingId === inst.id}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer",
                            instPaid 
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                              : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                          )}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {instPaid ? "Paga" : "Pagar"}
                        </button>
                        <button 
                          onClick={() => openEdit(inst)} 
                          className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer"
                          title="Editar Parcela"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(inst.id)} 
                          className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer"
                          title="Excluir Parcela"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER NORMAL ITEM ──────────────────────────────────────────────────────
  const renderNormalItem = (expense: Expense) => {
    const isPaid = !!expense.isPaid;
    const isFut = isFuture(expense);
    const isOverdueFromPastMonth = selectedMonth !== 'all' && !!expense.dueDate && expense.dueDate.slice(0, 7) < selectedMonth && !isPaid;
    const IconComp = catIcon(expense.category);
    const bgClass = isPaid ? "bg-emerald-100 text-emerald-600" : isOverdueFromPastMonth ? "bg-amber-100 text-amber-700" : catColor(expense.category);
    const isToggling = togglingId === expense.id;

    return (
      <div 
        key={expense.id} 
        className={cn(
          "border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 relative group flex flex-col justify-between shadow-xs hover:shadow-md",
          isPaid ? "bg-emerald-50/30 border-emerald-200/80" : isOverdueFromPastMonth ? "bg-amber-50/40 border-amber-300" : isFut ? "bg-blue-50/25 border-blue-200/80" : "bg-white border-sp-border"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
              <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className={cn("font-bold text-sm leading-tight truncate", isPaid ? "text-emerald-900 line-through opacity-70" : "text-sp-text-dark")}>
                {expense.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-bold text-sp-text-subtle tracking-wider">
                  {catLabel(expense.category)}
                </span>
                {expense.type && (
                  <>
                    <span className="text-[10px] text-sp-text-subtle">•</span>
                    <span className="text-[10px] font-semibold text-sp-text-sec">
                      {expense.type === 'fixed' ? 'Fixo' : 'Variável'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isPaid ? (
              <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Paga
              </span>
            ) : isOverdueFromPastMonth ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1" title="Conta de mês anterior que permanece pendente de pagamento">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" /> Vencida {new Date(expense.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
              </span>
            ) : isFut ? (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Futura
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                A Pagar
              </span>
            )}
            <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity ml-1">
              <button onClick={() => openEdit(expense)} className="p-1 text-sp-text-subtle hover:text-sp-purple hover:bg-slate-100 rounded cursor-pointer" title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteExpense(expense.id)} className="p-1 text-sp-text-subtle hover:text-sp-red-text hover:bg-sp-red-bg rounded cursor-pointer" title="Excluir">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-sp-dark-border/40">
          <span className={cn("text-lg sm:text-xl font-black tracking-tight", isPaid ? "text-emerald-700" : "text-indigo-950 dark:text-white")}>
            {formatCurrency(expense.amount)}
          </span>
          {expense.dueDate && (
            <span className={cn("text-[11px] font-semibold flex items-center gap-1", isFut ? "text-blue-600" : isPaid ? "text-emerald-600" : "text-sp-text-subtle")}>
              <Calendar className="w-3 h-3" />
              {new Date(expense.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>

        <button 
          onClick={() => togglePaid(expense)} 
          disabled={isToggling}
          className={cn(
            "mt-2 w-full text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer",
            isPaid 
              ? "bg-white text-sp-text-sec hover:bg-red-50 hover:text-sp-red-text border border-emerald-200 shadow-xs" 
              : "bg-sp-purple/8 text-sp-purple hover:bg-sp-purple hover:text-white border border-sp-purple/20 shadow-xs"
          )}
        >
          {isToggling ? "..." : isPaid ? (<><Clock className="w-3 h-3" /> Marcar Pendente</>) : (<><CheckCircle2 className="w-3 h-3" /> Marcar como Paga</>)}
        </button>
      </div>
    );
  };

  const watchedType = watch("type");
  const watchedRepeatMonths = Number(watch("repeatMonths")) || 1;
  const watchedAmount = watch("amount");
  const watchedCategory = watch("category");
  const watchedCardLimit = watch("cardLimit");
  const watchedBank = watch("bank");
  const watchedTotalInst = Number(watch("totalInstallments")) || 12;

  const parsedModalAmount = parseCurrency(watchedAmount) || 0;
  const parsedModalLimit = parseCurrency(watchedCardLimit) || 0;
  const modalAvailable = Math.max(0, parsedModalLimit - parsedModalAmount);
  const modalUsagePct = parsedModalLimit > 0 ? Math.min(100, Math.round((parsedModalAmount / parsedModalLimit) * 100)) : 0;

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORÇAMENTO">Despesas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">
            Controle seus custos fixos, faturas de cartões e parcelas de empréstimos.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => openAdd("credit_card")} 
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-extrabold text-xs py-3.5 px-3.5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Adicionar</span> Cartão
          </button>
          <button 
            onClick={() => openAdd("loan")} 
            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-extrabold text-xs py-3.5 px-3.5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <Landmark className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Adicionar</span> Empréstimo
          </button>
          <button 
            onClick={() => openAdd()} 
            className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTRO MENSAL ── */}
      <div className="bg-white border border-sp-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month Stepper Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white text-slate-700 hover:text-sp-purple rounded-xl transition-all cursor-pointer active:scale-95"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 font-black text-xs sm:text-sm text-slate-900 min-w-[150px] justify-center">
                <Calendar className="w-4 h-4 text-sp-purple shrink-0" />
                <span className="capitalize">{formatMonthLabel(selectedMonth)}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-white text-slate-700 hover:text-sp-purple rounded-xl transition-all cursor-pointer active:scale-95"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Month Picker */}
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || 'all')}
              className="text-xs font-bold border border-slate-200 rounded-2xl px-3 py-2.5 bg-slate-50 hover:bg-white text-slate-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sp-purple/20 shadow-2xs"
              title="Selecionar mês e ano específico"
            />
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthKey)}
              className={cn(
                "text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all cursor-pointer shadow-2xs",
                selectedMonth === currentMonthKey
                  ? "bg-sp-purple text-white border-sp-purple"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              Mês Atual
            </button>

            <button
              type="button"
              onClick={() => setSelectedMonth(selectedMonth === 'all' ? currentMonthKey : 'all')}
              className={cn(
                "text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all cursor-pointer shadow-2xs",
                selectedMonth === 'all'
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              {selectedMonth === 'all' ? 'Filtrar por Mês' : 'Ver Todos os Meses'}
            </button>
          </div>
        </div>

        {/* Informative Filter Status Banner */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sp-text-sec">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sp-purple shrink-0" />
            {selectedMonth === 'all' ? (
              <span>Exibindo <strong>todas</strong> as despesas cadastradas sem restrição de período.</span>
            ) : (
              <span>
                Filtro ativo para <strong>{formatMonthLabel(selectedMonth)}</strong>: mostra as dívidas deste mês e contas diversas com vencimento até este mês.
              </span>
            )}
          </div>
          {selectedMonth !== 'all' && (
            <span className="text-[10px] font-black uppercase tracking-wider text-sp-purple bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
              {filteredExpenses.length} itens encontrados
            </span>
          )}
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-sp-red-bg border border-red-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-red-text mb-1">
            {selectedMonth === 'all' ? 'A Pagar Geral' : 'A Pagar no Mês'}
          </p>
          <p className="text-xl font-black text-sp-red-text">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
            {selectedMonth === 'all' ? 'Pagas Geral' : 'Pagas no Mês'}
          </p>
          <p className="text-xl font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 mb-1">
            {selectedMonth === 'all' ? 'Faturas Cartões' : 'Faturas (Mês)'}
          </p>
          <p className="text-xl font-black text-purple-700">{formatCurrency(totalCardsNegative)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">
            {selectedMonth === 'all' ? 'Empréstimos Saldo' : 'Empréstimos (Mês)'}
          </p>
          <p className="text-xl font-black text-indigo-700">{formatCurrency(totalLoanRemaining)}</p>
        </div>
      </div>

      {/* SPECIAL CARDS & LIMITS EXECUTIVE BANNER */}
      {tab === "cards" && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Gestão de Cartões & Cheque Especial
              </span>
              <h3 className="text-xl font-black mt-0.5">Faturas e Limites Bancários</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Todas as faturas futuras agrupadas no cartão correspondente, com cálculo em tempo real do comprometimento do limite.
              </p>
            </div>
            <button 
              onClick={() => openAdd("credit_card")}
              className="text-xs font-black bg-white text-slate-900 px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer shadow-md shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Novo Cartão / Limite
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Total Faturas A Pagar</p>
              <p className="text-2xl font-black text-rose-400 mt-0.5">{formatCurrency(totalCardsNegative)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Limite Total Concedido</p>
              <p className="text-2xl font-black text-white mt-0.5">{formatCurrency(totalCardsLimit)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Limite Restante Disponível</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(totalCardsAvailable)}</p>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {allTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("font-semibold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap",
              tab === t.id ? "bg-sp-purple border-transparent text-white shadow-sm" : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark"
            )}>
            {t.label}{t.count > 0 && <span className={cn("ml-1 text-[10px] font-bold", tab === t.id ? "opacity-70" : "text-sp-text-subtle")}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ── CARTÕES SECTION (tab === "cards") ── */}
      {tab === "cards" && (
        <>
          {/* Bank filter chips */}
          {cardGroups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedBank("all")}
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0",
                  selectedBank === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-sp-text-sec border-sp-border hover:border-slate-400"
                )}
              >
                Todos ({cardGroups.length})
              </button>
              {BANK_OPTIONS.filter(b => cardGroups.some(c => (c.bank || "outro") === b.id)).map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBank(selectedBank === b.id ? "all" : b.id)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0",
                    selectedBank === b.id ? `${b.bg} border-transparent` : "bg-white text-sp-text-sec border-sp-border hover:border-slate-400"
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getFilteredCardGroups().map(grp => renderCardItem(grp))}
            {getFilteredCardGroups().length === 0 && (
              <div className="col-span-full border-2 border-dashed border-purple-200 rounded-3xl py-16 px-4 text-center">
                <CreditCard className="w-12 h-12 text-purple-200 mx-auto mb-4" />
                <h4 className="font-bold text-sp-text-dark">Nenhum cartão encontrado</h4>
                <p className="text-xs text-sp-text-sec mt-1 mb-6">Nenhum cartão cadastrado ainda.</p>
                <BrutalButton onClick={() => openAdd("credit_card")} className="mx-auto w-max py-2 px-6">
                  Cadastrar Cartão
                </BrutalButton>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EMPRÉSTIMOS SECTION (tab === "loans") ── */}
      {tab === "loans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loanGroups.map(grp => renderLoanItem(grp))}
          {loanGroups.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-indigo-200 rounded-3xl py-16 px-4 text-center">
              <Landmark className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
              <h4 className="font-bold text-sp-text-dark">Nenhum empréstimo cadastrado</h4>
              <p className="text-xs text-sp-text-sec mt-1 mb-6">Cadastre seus empréstimos ou financiamentos com parcelas e taxa de juros.</p>
              <BrutalButton onClick={() => openAdd("loan")} className="mx-auto w-max py-2 px-6">
                Cadastrar Empréstimo
              </BrutalButton>
            </div>
          )}
        </div>
      )}

      {/* ── NORMAL & OTHER TABS ── */}
      {tab !== "cards" && tab !== "loans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExpenses
            .filter(e => {
              if (tab === "normal") return isNormalExpense(e);
              if (tab === "pending") return !e.isPaid && !isFuture(e);
              if (tab === "paid") return !!e.isPaid;
              if (tab === "future") return isFuture(e);
              return true;
            })
            .map(e => isCardExpense(e) ? (
              // If in "all" or "pending" and it's a card invoice, render compact item or normal
              renderNormalItem(e)
            ) : renderNormalItem(e))}

          {filteredExpenses.filter(e => {
            if (tab === "normal") return isNormalExpense(e);
            if (tab === "pending") return !e.isPaid && !isFuture(e);
            if (tab === "paid") return !!e.isPaid;
            if (tab === "future") return isFuture(e);
            return true;
          }).length === 0 && (
            <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
              <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="font-bold text-sp-text-dark">Nenhum registro encontrado</h4>
              <p className="text-xs text-sp-text-sec mt-1 mb-6">
                {selectedMonth !== 'all' 
                  ? `Nenhuma despesa ou conta encontrada para ${formatMonthLabel(selectedMonth)}.` 
                  : (tab === "normal" ? "Nenhuma despesa normal cadastrada ainda." : "Nenhum item nesta lista.")}
              </p>
              <BrutalButton onClick={() => openAdd()} className="mx-auto w-max py-2 px-6">
                Adicionar Despesa
              </BrutalButton>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADICIONAR PRÓXIMA FATURA AO CARTÃO EXISTENTE ── */}
      <Modal 
        isOpen={!!addInvoiceTarget} 
        onClose={() => setAddInvoiceTarget(null)} 
        title={`Nova Fatura - ${addInvoiceTarget?.name || 'Cartão'}`}
      >
        <form onSubmit={handleSaveNextInvoice} className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
            <div>
              <p className="font-extrabold text-purple-900">{addInvoiceTarget?.name}</p>
              <p className="text-[11px] text-purple-700">
                Fatura #{addInvoiceTarget ? addInvoiceTarget.invoices.length + 1 : 1}
              </p>
            </div>
            {addInvoiceTarget && addInvoiceTarget.cardLimit > 0 && (
              <span className="font-bold text-purple-800">
                Limite: {formatCurrency(addInvoiceTarget.cardLimit)}
              </span>
            )}
          </div>

          <div>
            <BrutalLabel>Valor da Nova Fatura (R$)</BrutalLabel>
            <BrutalInput 
              type="text" 
              inputMode="decimal" 
              value={newInvoiceAmount} 
              onChange={e => setNewInvoiceAmount(e.target.value)} 
              placeholder="Ex: 850,00" 
              autoFocus 
            />
          </div>

          <div>
            <BrutalLabel>Data de Vencimento</BrutalLabel>
            <BrutalInput 
              type="date" 
              value={newInvoiceDate} 
              onChange={e => setNewInvoiceDate(e.target.value)} 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <BrutalButton type="button" variant="secondary" onClick={() => setAddInvoiceTarget(null)} className="flex-1">
              Cancelar
            </BrutalButton>
            <BrutalButton type="submit" className="flex-1">
              Salvar Fatura
            </BrutalButton>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ADICIONAR PARCELA AO EMPRÉSTIMO EXISTENTE ── */}
      <Modal 
        isOpen={!!addInstallmentTarget} 
        onClose={() => setAddInstallmentTarget(null)} 
        title={`Nova Parcela - ${addInstallmentTarget?.name || 'Empréstimo'}`}
      >
        <form onSubmit={handleSaveNextInstallment} className="space-y-4">
          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
            <div>
              <p className="font-extrabold text-indigo-900">{addInstallmentTarget?.name}</p>
              <p className="text-[11px] text-indigo-700">
                Parcela #{addInstallmentTarget ? addInstallmentTarget.installments.length + 1 : 1}
              </p>
            </div>
            {addInstallmentTarget && addInstallmentTarget.interestRate > 0 && (
              <span className="font-bold text-indigo-800">
                Juros: {addInstallmentTarget.interestRate}% a.m.
              </span>
            )}
          </div>

          <div>
            <BrutalLabel>Valor da Parcela (R$)</BrutalLabel>
            <BrutalInput 
              type="text" 
              inputMode="decimal" 
              value={newInstallmentAmount} 
              onChange={e => setNewInstallmentAmount(e.target.value)} 
              placeholder="Ex: 450,00" 
              autoFocus 
            />
          </div>

          <div>
            <BrutalLabel>Data de Vencimento</BrutalLabel>
            <BrutalInput 
              type="date" 
              value={newInstallmentDate} 
              onChange={e => setNewInstallmentDate(e.target.value)} 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <BrutalButton type="button" variant="secondary" onClick={() => setAddInstallmentTarget(null)} className="flex-1">
              Cancelar
            </BrutalButton>
            <BrutalButton type="submit" className="flex-1">
              Salvar Parcela
            </BrutalButton>
          </div>
        </form>
      </Modal>

      {/* ── MODAL PRINCIPAL: CADASTRO / EDIÇÃO ── */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
          editingExpense 
            ? "Editar Despesa" 
            : (watchedCategory === "credit_card" ? "Adicionar Cartão de Crédito" : watchedCategory === "loan" ? "Adicionar Empréstimo / Financiamento" : watchedCategory === "overdraft" ? "Adicionar Cheque Especial" : "Nova Despesa")
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Categoria */}
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <CategorySelect scope="expenses" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>

          {/* BANCO / BANDEIRA (Para Cartão, Empréstimo ou Cheque Especial) */}
          {(watchedCategory === "credit_card" || watchedCategory === "overdraft" || watchedCategory === "loan") && (
            <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-2xl space-y-3">
              <div>
                <BrutalLabel>Instituição Bancária / Emissor</BrutalLabel>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                  {BANK_OPTIONS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setValue("bank", b.id);
                        const currentName = watch("name");
                        if (!currentName || currentName.includes("Cartão") || currentName.includes("Fatura") || currentName.includes("Empréstimo") || currentName.includes("Cheque")) {
                          setValue("name", 
                            watchedCategory === "loan" ? `Empréstimo ${b.name}` :
                            watchedCategory === "overdraft" ? `Cheque Especial ${b.name}` : 
                            `Fatura Cartão ${b.name}`
                          );
                        }
                      }}
                      className={cn(
                        "text-[11px] font-black py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer text-center",
                        watchedBank === b.id 
                          ? `${b.bg} shadow-md scale-102` 
                          : "bg-white border-slate-200 text-slate-700 hover:border-purple-300"
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <BrutalLabel>Nome / Identificação</BrutalLabel>
            <BrutalInput {...register("name", { required: true })} placeholder="Ex: Nubank Roxinho, Itaú Click, Empréstimo Pessoal Caixa" />
          </div>

          {/* ── SE FOR CARTÃO DE CRÉDITO OU CHEQUE ESPECIAL ── */}
          {(watchedCategory === "credit_card" || watchedCategory === "overdraft") && (
            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Limites, Juros e Fatura Mensal
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <BrutalLabel>Limite Total (R$)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("cardLimit")} placeholder="Ex: 6.550,00" />
                </div>
                <div>
                  <BrutalLabel>Fatura Atual (R$)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="Ex: 1.118,88" />
                </div>
                <div>
                  <BrutalLabel>Juros (% a.m.)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("interestRate")} placeholder="Ex: 14,5" />
                </div>
              </div>

              {/* Feedback em tempo real */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-rose-600">Saldo Negativo a Pagar:</span>
                  <span className="font-black text-rose-600 text-sm">{formatCurrency(parsedModalAmount)}</span>
                </div>
                {parsedModalLimit > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600">Limite Restante Disponível:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(modalAvailable)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-300", modalUsagePct > 80 ? "bg-rose-500" : modalUsagePct > 50 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${modalUsagePct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-right font-bold text-sp-text-subtle uppercase">
                      Comprometimento do Limite: {modalUsagePct}%
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── SE FOR EMPRÉSTIMO / FINANCIAMENTO ── */}
          {watchedCategory === "loan" && (
            <div className="space-y-3 bg-indigo-50/50 border border-indigo-200 p-4 rounded-2xl">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> Condições do Empréstimo
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <BrutalLabel>Qtd. de Parcelas</BrutalLabel>
                  <BrutalInput type="number" min="1" max="120" {...register("totalInstallments")} placeholder="Ex: 24" />
                </div>
                <div>
                  <BrutalLabel>Valor da Parcela (R$)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="Ex: 450,00" />
                </div>
                <div>
                  <BrutalLabel>Juros (% a.m.)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("interestRate")} placeholder="Ex: 2,5" />
                </div>
              </div>

              {!editingExpense && (
                <div>
                  <BrutalLabel>Parcelas Já Pagas (opcional)</BrutalLabel>
                  <BrutalInput type="number" min="0" max="120" {...register("paidInstallments")} placeholder="Ex: 0" />
                </div>
              )}

              {/* Real-time loan overview */}
              {parsedModalAmount > 0 && (
                <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Total do Empréstimo:</span>
                    <span className="font-black text-indigo-950">{formatCurrency(parsedModalAmount * watchedTotalInst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Parcelamento:</span>
                    <span className="font-bold text-indigo-700">{watchedTotalInst}x de {formatCurrency(parsedModalAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SE FOR DESPESA NORMAL ── */}
          {watchedCategory !== "credit_card" && watchedCategory !== "overdraft" && watchedCategory !== "loan" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <BrutalLabel>Valor (R$)</BrutalLabel>
                <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="0,00" />
              </div>
              <div>
                <BrutalLabel>Tipo</BrutalLabel>
                <select {...register("type")} className="w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all">
                  <option value="fixed">Fixo (mensal)</option>
                  <option value="variable">Variável (único)</option>
                </select>
              </div>
            </div>
          )}

          {/* VENCIMENTO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>
                {watchedCategory === "credit_card" || watchedCategory === "overdraft" 
                  ? "Vencimento da 1ª Fatura" 
                  : watchedCategory === "loan" 
                    ? "Vencimento da 1ª Parcela" 
                    : "Data de Vencimento"}
              </BrutalLabel>
              <BrutalInput type="date" {...register("dueDate")} />
            </div>
            {watchedType === "fixed" && watchedCategory !== "loan" && (
              <div>
                <BrutalLabel>Dia de Recorrência</BrutalLabel>
                <BrutalInput type="number" min="1" max="31" {...register("recurrenceDay")} placeholder="Ex: 10" />
              </div>
            )}
          </div>

          {/* REPETIR MESES (Para Cartões ou Despesas Comuns) */}
          {!editingExpense && watchedCategory !== "loan" && (
            <div className="bg-sp-purple/5 border border-sp-purple/20 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sp-purple/10 flex items-center justify-center text-sp-purple">
                    <Repeat className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-sp-text-dark">
                    {watchedCategory === "credit_card" ? "Gerar faturas para quantos meses?" : "Repetir por quantos meses?"}
                  </span>
                </div>
                <span className="text-[10px] font-black text-sp-purple bg-sp-purple/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {watchedRepeatMonths > 1 ? `${watchedRepeatMonths} meses` : '1 mês'}
                </span>
              </div>
              
              <p className="text-[11px] text-sp-text-sec leading-snug">
                {watchedCategory === "credit_card"
                  ? "Cria as faturas futuras dentro deste mesmo cartão, mantendo seu limite controlado mês a mês."
                  : "Lança automaticamente os próximos meses com datas calculadas como valor futuro a pagar."}
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  {...register("repeatMonths", { valueAsNumber: true })} 
                  className="w-20 bg-white border border-sp-border focus:border-sp-purple px-3 py-1.5 rounded-xl text-xs font-black text-center text-sp-text-dark focus:outline-none focus:ring-2 focus:ring-sp-purple/20 transition-all shadow-xs"
                />
                <span className="text-xs font-bold text-sp-text-sec">meses</span>
                
                <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar">
                  {[1, 3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValue("repeatMonths", m)}
                      className={cn(
                        "text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap",
                        watchedRepeatMonths === m 
                          ? "bg-sp-purple border-sp-purple text-white shadow-xs" 
                          : "bg-white border-sp-border text-sp-text-sec hover:border-sp-purple/40 hover:text-sp-purple"
                      )}
                    >
                      {m === 1 ? "1 mês" : `${m} meses`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CHECKBOX JÁ FOI PAGA (apenas para despesa única ou edição) */}
          {(editingExpense || watchedCategory !== "loan") && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <input type="checkbox" id="isPaid-chk" {...register("isPaid")} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
              <label htmlFor="isPaid-chk" className="text-sm font-semibold text-emerald-800 cursor-pointer">
                1ª Parcela / Fatura já foi paga
              </label>
            </div>
          )}

          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingExpense 
              ? "Salvar Alterações" 
              : (watchedCategory === "credit_card" ? "Cadastrar Cartão" : watchedCategory === "loan" ? "Cadastrar Empréstimo" : "Adicionar Despesa")}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
