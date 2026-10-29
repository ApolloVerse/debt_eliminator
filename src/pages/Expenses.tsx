import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Expense } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, cn } from "../lib/utils";
import { Plus, Pencil, Trash2, ShoppingCart, Home, Car, Heart, GraduationCap, Zap, Tv, MoreHorizontal, Calendar, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "housing", label: "Moradia" },
  { value: "food", label: "Alimentacao" },
  { value: "transport", label: "Transporte" },
  { value: "health", label: "Saude" },
  { value: "education", label: "Educacao" },
  { value: "utilities", label: "Contas basicas" },
  { value: "entertainment", label: "Lazer" },
  { value: "other", label: "Outros" },
];

const catIcon = (cat: string) => {
  switch (cat) {
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
  amount: number;
  category: string;
  type: "fixed" | "variable";
  dueDate: string;
  isPaid: boolean;
  recurrenceDay: number;
};

export const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"all" | "pending" | "paid" | "future">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, control } = useForm<FormData>({
    defaultValues: { name: "", amount: 0, category: "other", type: "fixed", dueDate: "", isPaid: false, recurrenceDay: 1 }
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

  const openAdd = () => {
    setEditingExpense(null);
    reset({ name: "", amount: 0, category: "other", type: "fixed", dueDate: today, isPaid: false, recurrenceDay: 1 });
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
      const payload = {
        name: data.name,
        category: data.category,
        amount: Number(data.amount),
        type: data.type,
        dueDate: data.dueDate || null,
        isPaid: data.isPaid,
        paymentDate: data.isPaid ? new Date().toISOString().split("T")[0] : null,
        recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };
      if (editingExpense) {
        await supabase.from("expenses").update(payload).eq("id", editingExpense.id).throwOnError();
        toast.success("Despesa atualizada");
      } else {
        await supabase.from("expenses").insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success("Despesa cadastrada");
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

  const isFuture = (e: Expense) => !!(e.dueDate && e.dueDate > today && !e.isPaid);

  const filtered = expenses.filter(e => {
    if (tab === "paid") return !!e.isPaid;
    if (tab === "pending") return !e.isPaid && !isFuture(e);
    if (tab === "future") return isFuture(e);
    return true;
  });

  const totalPending = expenses.reduce((acc, e) => acc + (e.isPaid ? 0 : e.amount), 0);
  const totalPaid = expenses.reduce((acc, e) => acc + (e.isPaid ? e.amount : 0), 0);
  const countFuture = expenses.filter(e => isFuture(e)).length;

  const allTabs = [
    { id: "all" as const, label: "Todas", count: expenses.length },
    { id: "pending" as const, label: "A Pagar", count: expenses.filter(e => !e.isPaid && !isFuture(e)).length },
    { id: "paid" as const, label: "Pagas", count: expenses.filter(e => !!e.isPaid).length },
    { id: "future" as const, label: "Futuras", count: countFuture },
  ];

  const watchedType = watch("type");

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORCAMENTO">Despesas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">Controle seus custos fixos, variaveis e futuros.</p>
        </div>
        <button onClick={openAdd} className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Despesa
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-sp-red-bg border border-red-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-red-text mb-1">A Pagar</p>
          <p className="text-xl font-black text-sp-red-text">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Pagas</p>
          <p className="text-xl font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">Futuras</p>
          <p className="text-xl font-black text-blue-700">{countFuture} itens</p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(expense => {
          const isPaid = !!expense.isPaid;
          const isFut = isFuture(expense);
          const IconComp = catIcon(expense.category);
          const bgClass = isPaid ? "bg-emerald-50 text-emerald-600" : catColor(expense.category);
          const isToggling = togglingId === expense.id;
          return (
            <div key={expense.id} className={cn("border rounded-3xl p-5 hover:border-sp-purple/35 transition-all duration-300 relative group flex flex-col justify-between",
              isPaid ? "bg-emerald-50/40 border-emerald-200" : isFut ? "bg-blue-50/30 border-blue-200" : "bg-white border-sp-border"
            )}>
              {isFut && !isPaid && <div className="absolute top-3 left-3 bg-blue-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full">Futura</div>}
              {isPaid && <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> PAGA</div>}
              <div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-0.5 border border-sp-border shadow-sm">
                  <button onClick={() => openEdit(expense)} className="p-1 text-sp-text-sec hover:text-sp-purple hover:bg-slate-50 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteExpense(expense.id)} className="p-1 text-sp-red-text hover:bg-sp-red-bg rounded-md" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center mb-4 shrink-0 mt-5", bgClass)}>
                  <IconComp className="w-5 h-5" />
                </div>
                <h3 className={cn("font-extrabold text-base leading-tight truncate max-w-[80%]", isPaid ? "text-emerald-800 line-through" : "text-sp-text-dark")}>{expense.name}</h3>
              </div>
              <div className="mt-4">
                <p className={cn("text-2xl font-black", isPaid ? "text-emerald-700" : "text-indigo-950")}>{formatCurrency(expense.amount)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase font-bold text-sp-text-subtle tracking-wider">{catLabel(expense.category)}</span>
                  {expense.dueDate && (
                    <span className={cn("text-[10px] font-bold flex items-center gap-1", isFut ? "text-blue-600" : isPaid ? "text-emerald-600" : "text-sp-text-sec")}>
                      <Calendar className="w-3 h-3" />
                      {new Date(expense.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>
                <button onClick={() => togglePaid(expense)} disabled={isToggling}
                  className={cn("mt-3 w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all",
                    isPaid ? "bg-white text-sp-text-sec hover:bg-red-50 hover:text-sp-red-text border border-emerald-200" : "bg-sp-purple/5 text-sp-purple hover:bg-sp-purple/15 border border-sp-purple/20"
                  )}>
                  {isToggling ? "..." : isPaid ? (<><Clock className="w-3 h-3" /> Marcar Pendente</>) : (<><CheckCircle2 className="w-3 h-3" /> Marcar como Paga</>)}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-sp-text-dark">Nenhuma despesa encontrada</h4>
            <p className="text-xs text-sp-text-sec mt-1 mb-6">Adicione sua primeira despesa usando o botao acima.</p>
            <BrutalButton onClick={openAdd} className="mx-auto w-max py-2 px-6">Adicionar Despesa</BrutalButton>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Editar Despesa" : "Nova Despesa"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Nome</BrutalLabel>
            <BrutalInput {...register("name", { required: true })} placeholder="Ex: Aluguel, Internet, Academia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Valor (R$)</BrutalLabel>
              <BrutalInput type="number" step="0.01" {...register("amount", { required: true })} placeholder="0,00" />
            </div>
            <div>
              <BrutalLabel>Tipo</BrutalLabel>
              <select {...register("type")} className="w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all">
                <option value="fixed">Fixo (mensal)</option>
                <option value="variable">Variavel (unico)</option>
              </select>
            </div>
          </div>
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <CategorySelect scope="expenses" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Data de Vencimento</BrutalLabel>
              <BrutalInput type="date" {...register("dueDate")} />
            </div>
            {watchedType === "fixed" && (
              <div>
                <BrutalLabel>Dia de Recorrencia</BrutalLabel>
                <BrutalInput type="number" min="1" max="31" {...register("recurrenceDay")} placeholder="Ex: 5" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <input type="checkbox" id="isPaid-chk" {...register("isPaid")} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            <label htmlFor="isPaid-chk" className="text-sm font-semibold text-emerald-800 cursor-pointer">Ja foi paga</label>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingExpense ? "Salvar Alteracoes" : "Adicionar Despesa"}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
