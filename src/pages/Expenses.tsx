import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Expense } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, parseCurrency, addMonthsToDate, cn } from "../lib/utils";
import { Plus, Pencil, Trash2, ShoppingCart, Home, Car, Heart, GraduationCap, Zap, Tv, MoreHorizontal, Calendar, CheckCircle2, Clock, TrendingDown, Repeat, CreditCard, Landmark, AlertTriangle, Receipt } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "credit_card", label: "Cartão de Crédito" },
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
    id: "outro", name: bankId || "Cartão", bg: "bg-slate-800 text-white", badge: "bg-slate-100 text-slate-700", border: "border-slate-300", accent: "#475569"
  };

const catIcon = (cat: string) => {
  switch (cat) {
    case "credit_card": return CreditCard;
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
};

export const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"normal" | "cards" | "pending" | "paid" | "future" | "all">("normal");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<FormData>({
    defaultValues: { name: "", amount: "", category: "other", type: "fixed", dueDate: "", isPaid: false, recurrenceDay: 1, repeatMonths: 1, cardLimit: "", bank: "nubank" }
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

  const openAdd = (defaultCat?: string) => {
    setEditingExpense(null);
    const cat = defaultCat || (tab === "cards" ? "credit_card" : "other");
    reset({ 
      name: cat === "credit_card" ? "Fatura Cartão Nubank" : cat === "overdraft" ? "Cheque Especial Itaú" : "", 
      amount: "", 
      category: cat, 
      type: "fixed", 
      dueDate: today, 
      isPaid: false, 
      recurrenceDay: 1, 
      repeatMonths: 1,
      cardLimit: "",
      bank: "nubank",
    });
    setIsModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    reset({
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      type: (expense.type as any) || "fixed",
      dueDate: expense.dueDate || today,
      isPaid: expense.isPaid || false,
      recurrenceDay: expense.recurrenceDay || 1,
      repeatMonths: 1,
      cardLimit: expense.cardLimit || "",
      bank: expense.bank || "nubank",
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
      const basePayload = {
        name: data.name,
        category: data.category,
        amount: parsedAmount,
        type: data.type,
        dueDate: data.dueDate || null,
        isPaid: data.isPaid,
        paymentDate: data.isPaid ? (data.dueDate || new Date().toISOString().split("T")[0]) : null,
        recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
        cardLimit: parsedLimit,
        bank: data.bank || null,
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingExpense) {
        await supabase.from("expenses").update(basePayload).eq("id", editingExpense.id).throwOnError();
        toast.success("Despesa atualizada");
      } else {
        const repeatCount = data.repeatMonths ? Math.min(60, Math.max(1, Number(data.repeatMonths))) : 1;
        
        if (repeatCount > 1) {
          const baseDate = data.dueDate || today;
          const recurrenceDay = data.recurrenceDay ? Number(data.recurrenceDay) : (baseDate ? parseInt(baseDate.split("-")[2] || "1", 10) : 1);
          const entries = [];

          for (let i = 0; i < repeatCount; i++) {
            const itemDueDate = addMonthsToDate(baseDate, i);
            const isFirstPaid = i === 0 ? Boolean(data.isPaid) : false;
            entries.push({
              name: `${data.name} (${i + 1}/${repeatCount})`,
              category: data.category,
              amount: parsedAmount,
              type: data.type,
              dueDate: itemDueDate,
              isPaid: isFirstPaid,
              paymentDate: isFirstPaid ? (data.dueDate || today) : null,
              recurrenceDay,
              cardLimit: parsedLimit,
              bank: data.bank || null,
              userId: user.id,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          await supabase.from("expenses").insert(entries).throwOnError();
          toast.success(`${repeatCount} despesas mensais criadas com sucesso!`);
        } else {
          await supabase.from("expenses").insert([{ ...basePayload, createdAt: new Date().toISOString() }]).throwOnError();
          toast.success("Despesa cadastrada");
        }
      }
      setIsModalOpen(false);
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally { setIsSubmitting(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta despesa?")) return;
    try {
      await supabase.from("expenses").update({ isActive: false }).eq("id", id);
      toast.success("Despesa removida");
      fetchExpenses();
    } catch { toast.error("Erro ao remover despesa"); }
  };

  const isCardExpense = (e: Expense) => e.category === 'credit_card' || e.category === 'overdraft';
  const isFuture = (e: Expense) => !!(e.dueDate && e.dueDate > today && !e.isPaid);

  const normalList = expenses.filter(e => !isCardExpense(e));
  const cardsList = expenses.filter(isCardExpense);

  const totalCardsNegative = cardsList.filter(e => !e.isPaid).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalCardsLimit = cardsList.reduce((acc, e) => acc + (Number(e.cardLimit) || 0), 0);
  const totalCardsAvailable = Math.max(0, totalCardsLimit - totalCardsNegative);

  const totalPending = expenses.reduce((acc, e) => acc + (e.isPaid ? 0 : e.amount), 0);
  const totalPaid = expenses.reduce((acc, e) => acc + (e.isPaid ? e.amount : 0), 0);
  const countFuture = expenses.filter(e => isFuture(e)).length;

  const allTabs = [
    { id: "normal" as const, label: "📋 Despesas Normais", count: normalList.length },
    { id: "cards" as const, label: "💳 Somente Cartões", count: cardsList.length },
    { id: "pending" as const, label: "A Pagar", count: expenses.filter(e => !e.isPaid && !isFuture(e)).length },
    { id: "paid" as const, label: "Pagas", count: expenses.filter(e => !!e.isPaid).length },
    { id: "future" as const, label: "Futuras", count: countFuture },
    { id: "all" as const, label: "Todas", count: expenses.length },
  ];

  // Filtering for cards:
  const getFilteredCards = () => {
    let list = cardsList;
    if (tab === "normal") return [];
    if (tab === "cards") {
      if (selectedBank !== "all") {
        list = list.filter(c => (c.bank || "outro").toLowerCase() === selectedBank);
      }
      return list;
    }
    if (tab === "paid") return list.filter(e => !!e.isPaid);
    if (tab === "pending") return list.filter(e => !e.isPaid && !isFuture(e));
    if (tab === "future") return list.filter(e => isFuture(e));
    return list;
  };

  // Filtering for normal expenses:
  const getFilteredNormal = () => {
    let list = normalList;
    if (tab === "cards") return [];
    if (tab === "normal") return list;
    if (tab === "paid") return list.filter(e => !!e.isPaid);
    if (tab === "pending") return list.filter(e => !e.isPaid && !isFuture(e));
    if (tab === "future") return list.filter(e => isFuture(e));
    return list;
  };

  const displayedCards = getFilteredCards();
  const displayedNormal = getFilteredNormal();

  const renderCardItem = (expense: Expense) => {
    const isPaid = !!expense.isPaid;
    const bankInfo = getBankInfo(expense.bank);
    const isToggling = togglingId === expense.id;
    const limit = Number(expense.cardLimit) || 0;
    const used = Number(expense.amount) || 0;
    const available = Math.max(0, limit - used);
    const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return (
      <div 
        key={expense.id}
        className={cn(
          "border rounded-3xl p-4 sm:p-5 transition-all duration-200 relative group flex flex-col justify-between shadow-xs hover:shadow-md",
          isPaid ? "bg-emerald-50/20 border-emerald-200/80" : "bg-white border-slate-200 hover:border-purple-300"
        )}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs", bankInfo.badge)}>
                <CreditCard className="w-3 h-3" />
                {bankInfo.name}
              </span>
              <span className="text-[10px] font-extrabold text-sp-text-subtle uppercase">
                {expense.category === "overdraft" ? "Cheque Especial" : "Fatura Cartão"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isPaid ? (
                <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Paga
                </span>
              ) : (
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  A Pagar
                </span>
              )}
              <button onClick={() => openEdit(expense)} className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer" title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteExpense(expense.id)} className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer" title="Excluir">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className={cn("font-black text-base truncate", isPaid ? "text-emerald-950 line-through opacity-70" : "text-slate-900")}>
            {expense.name}
          </h3>

          <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {isPaid ? "Valor Pago" : "Saldo Negativo / Fatura"}
              </span>
              {expense.dueDate && (
                <span className="text-[11px] font-semibold text-sp-text-sec flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Venc: {new Date(expense.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
            <p className={cn("text-2xl font-black tracking-tight mt-0.5", isPaid ? "text-emerald-700" : "text-rose-600")}>
              {formatCurrency(expense.amount)}
            </p>
          </div>

          {limit > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-sp-text-sec">Limite: {formatCurrency(limit)}</span>
                <span className="text-emerald-700">Disponível: {formatCurrency(available)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", usagePct > 80 ? "bg-rose-500" : usagePct > 50 ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-extrabold text-sp-text-subtle uppercase tracking-wider">
                <span>Comprometido: {usagePct}%</span>
                <span>{available > 0 ? "Saldo Restante Positivo" : "Limite Esgotado"}</span>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => togglePaid(expense)} 
          disabled={isToggling}
          className={cn(
            "mt-4 w-full text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer",
            isPaid 
              ? "bg-white text-sp-text-sec hover:bg-red-50 hover:text-sp-red-text border border-emerald-200 shadow-xs" 
              : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
          )}
        >
          {isToggling ? "..." : isPaid ? (<><Clock className="w-3.5 h-3.5" /> Reabrir Fatura</>) : (<><CheckCircle2 className="w-3.5 h-3.5" /> Pagar Fatura</>)}
        </button>
      </div>
    );
  };

  const renderNormalItem = (expense: Expense) => {
    const isPaid = !!expense.isPaid;
    const isFut = isFuture(expense);
    const IconComp = catIcon(expense.category);
    const bgClass = isPaid ? "bg-emerald-100 text-emerald-600" : catColor(expense.category);
    const isToggling = togglingId === expense.id;

    return (
      <div 
        key={expense.id} 
        className={cn(
          "border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 relative group flex flex-col justify-between shadow-xs hover:shadow-md",
          isPaid ? "bg-emerald-50/30 border-emerald-200/80" : isFut ? "bg-blue-50/25 border-blue-200/80" : "bg-white border-sp-border"
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
                    <span className="text-sp-text-subtle text-[9px]">•</span>
                    <span className="text-[10px] text-sp-text-subtle font-medium">
                      {expense.type === 'fixed' ? 'Fixo' : 'Variável'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isFut && !isPaid && (
              <span className="bg-blue-500/10 text-blue-600 border border-blue-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Futura
              </span>
            )}
            {isPaid && (
              <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Paga
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

  const parsedModalAmount = parseCurrency(watchedAmount) || 0;
  const parsedModalLimit = parseCurrency(watchedCardLimit) || 0;
  const modalAvailable = Math.max(0, parsedModalLimit - parsedModalAmount);
  const modalUsagePct = parsedModalLimit > 0 ? Math.min(100, Math.round((parsedModalAmount / parsedModalLimit) * 100)) : 0;

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORÇAMENTO">Despesas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">Controle seus custos fixos, faturas de cartões e limites bancários.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => openAdd("credit_card")} 
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Adicionar</span> Cartão
          </button>
          <button 
            onClick={() => openAdd()} 
            className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-5 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-sp-red-bg border border-red-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-red-text mb-1">A Pagar no Mês</p>
          <p className="text-xl font-black text-sp-red-text">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Pagas</p>
          <p className="text-xl font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 mb-1">Faturas Cartões</p>
          <p className="text-xl font-black text-purple-700">{formatCurrency(totalCardsNegative)}</p>
        </div>
      </div>

      {/* SPECIAL CARDS & LIMITS EXECUTIVE BANNER (Shown in 'cards' tab or when cards exist) */}
      {tab === "cards" && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Gestão de Cartões & Cheque Especial
              </span>
              <h3 className="text-xl font-black mt-0.5">Faturas e Limites Bancários</h3>
              <p className="text-xs text-slate-300 mt-0.5">Mostra faturas mensais, limites concedidos e saldo negativo a pagar no mês.</p>
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Saldo Negativo (Faturas a Pagar)</p>
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

      {/* ── CARTÕES SECTION (only shown when tab === "cards") ── */}
      {tab === "cards" && (
        <>
          {/* Bank filter chips */}
          {cardsList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedBank("all")}
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0",
                  selectedBank === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-sp-text-sec border-sp-border hover:border-slate-400"
                )}
              >
                Todos ({cardsList.length})
              </button>
              {BANK_OPTIONS.filter(b => cardsList.some(c => (c.bank || "outro") === b.id)).map(b => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCards.map(e => renderCardItem(e))}
            {displayedCards.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-purple-200 rounded-3xl py-16 px-4 text-center">
                <CreditCard className="w-12 h-12 text-purple-200 mx-auto mb-4" />
                <h4 className="font-bold text-sp-text-dark">Nenhum cartão encontrado</h4>
                <p className="text-xs text-sp-text-sec mt-1 mb-6">Nenhum cartão ou limite cadastrado ainda.</p>
                <BrutalButton onClick={() => openAdd("credit_card")} className="mx-auto w-max py-2 px-6">
                  Cadastrar Cartão
                </BrutalButton>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── NORMAL EXPENSES SECTION (hidden when tab === "cards") ── */}
      {tab !== "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedNormal.map(e => renderNormalItem(e))}
          {displayedNormal.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
              <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="font-bold text-sp-text-dark">Nenhum registro encontrado</h4>
              <p className="text-xs text-sp-text-sec mt-1 mb-6">
                {tab === "normal" ? "Nenhuma despesa normal cadastrada ainda." : "Adicione sua primeira despesa usando o botão acima."}
              </p>
              <BrutalButton onClick={() => openAdd()} className="mx-auto w-max py-2 px-6">
                Adicionar Despesa
              </BrutalButton>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DE CADASTRO / EDIÇÃO ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Editar Despesa" : (watchedCategory === "credit_card" ? "Adicionar Cartão de Crédito" : watchedCategory === "overdraft" ? "Adicionar Cheque Especial" : "Nova Despesa")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Categoria */}
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <CategorySelect scope="expenses" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>

          {/* BANCO / BANDEIRA (Aparece se for Cartão de Crédito ou Cheque Especial) */}
          {(watchedCategory === "credit_card" || watchedCategory === "overdraft") && (
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
                        if (!currentName || currentName.includes("Cartão") || currentName.includes("Fatura") || currentName.includes("Cheque")) {
                          setValue("name", watchedCategory === "overdraft" ? `Cheque Especial ${b.name}` : `Fatura Cartão ${b.name}`);
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
            <BrutalInput {...register("name", { required: true })} placeholder="Ex: Nubank Roxinho, Itaú Click, Aluguel" />
          </div>

          {/* VALORES E LIMITES */}
          {(watchedCategory === "credit_card" || watchedCategory === "overdraft") ? (
            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Limites e Fatura Mensal
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BrutalLabel>Limite Total Concedido (R$)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("cardLimit")} placeholder="Ex: 5.000,00" />
                </div>
                <div>
                  <BrutalLabel>Fatura / Usado no Mês (R$)</BrutalLabel>
                  <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="Ex: 1.850,00" />
                </div>
              </div>

              {/* Real-time feedback for cards/overdraft */}
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
          ) : (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Data de Vencimento da Fatura</BrutalLabel>
              <BrutalInput type="date" {...register("dueDate")} />
            </div>
            {watchedType === "fixed" && (
              <div>
                <BrutalLabel>Dia de Recorrência</BrutalLabel>
                <BrutalInput type="number" min="1" max="31" {...register("recurrenceDay")} placeholder="Ex: 10" />
              </div>
            )}
          </div>

          {/* Repeating Months Selector (Any Category) */}
          {!editingExpense && (
            <div className="bg-sp-purple/5 border border-sp-purple/20 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sp-purple/10 flex items-center justify-center text-sp-purple">
                    <Repeat className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-sp-text-dark">Repetir por quantos meses?</span>
                </div>
                <span className="text-[10px] font-black text-sp-purple bg-sp-purple/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {watchedRepeatMonths > 1 ? `${watchedRepeatMonths} meses` : '1 mês (único)'}
                </span>
              </div>
              
              <p className="text-[11px] text-sp-text-sec leading-snug">
                Lança automaticamente os próximos meses com datas calculadas, ficando no app como valor futuro a pagar.
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
                
                {/* Quick Chips */}
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

              {watchedRepeatMonths > 1 && (
                <div className="text-[11px] font-semibold text-sp-purple bg-white border border-sp-purple/20 p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                  <span>Total acumulado ({watchedRepeatMonths} meses):</span>
                  <span className="font-black text-sm text-sp-purple">
                    {formatCurrency(parseCurrency(watchedAmount || 0) * watchedRepeatMonths)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <input type="checkbox" id="isPaid-chk" {...register("isPaid")} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            <label htmlFor="isPaid-chk" className="text-sm font-semibold text-emerald-800 cursor-pointer">Já foi paga</label>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingExpense ? "Salvar Alterações" : (watchedCategory === "credit_card" ? "Adicionar Cartão" : "Adicionar Despesa")}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
