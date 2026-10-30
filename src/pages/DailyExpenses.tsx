import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { DailyExpense } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, parseCurrency, cn } from "../lib/utils";
import { Plus, Pencil, Trash2, ShoppingCart, Car, Heart, Tv, Wrench, Package, MoreHorizontal, Calendar, TrendingDown, Clock } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "alimentacao", label: "Alimentacao" },
  { value: "transporte", label: "Transporte" },
  { value: "saude", label: "Saude" },
  { value: "lazer", label: "Lazer" },
  { value: "compras", label: "Compras" },
  { value: "servicos", label: "Servicos" },
  { value: "educacao", label: "Educacao" },
  { value: "moradia", label: "Moradia" },
  { value: "outros", label: "Outros" },
];

const catIcon = (cat: string) => {
  switch (cat) {
    case "alimentacao": return ShoppingCart;
    case "transporte": return Car;
    case "saude": return Heart;
    case "lazer": return Tv;
    case "compras": return Package;
    case "servicos": return Wrench;
    default: return MoreHorizontal;
  }
};

const catColor = (cat: string) => {
  switch (cat) {
    case "alimentacao": return "bg-emerald-50 text-sp-mint";
    case "transporte": return "bg-amber-50 text-amber-600";
    case "saude": return "bg-rose-50 text-rose-600";
    case "lazer": return "bg-fuchsia-50 text-fuchsia-600";
    case "compras": return "bg-blue-50 text-blue-600";
    case "servicos": return "bg-indigo-50 text-indigo-600";
    case "educacao": return "bg-cyan-50 text-cyan-600";
    case "moradia": return "bg-orange-50 text-orange-600";
    default: return "bg-slate-100 text-slate-600";
  }
};

const catLabel = (cat: string) =>
  BUILTIN_CATEGORIES.find(c => c.value === cat)?.label ?? cat;

type FormData = {
  description: string;
  amount: any;
  category: string;
  date: string;
  type: "fixed" | "variable";
  isScheduled: boolean;
};

export const DailyExpenses = () => {
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [tab, setTab] = useState<"all" | "done" | "scheduled">("all");

  const { register, handleSubmit, reset, control } = useForm<FormData>({
    defaultValues: { description: "", amount: 0, category: "outros", date: new Date().toISOString().split("T")[0], type: "variable", isScheduled: false }
  });

  const fetchDailyExpenses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data } = await supabase.from("daily_expenses").select("*").eq("userId", user.id).order("date", { ascending: false });
    if (data) setDailyExpenses(data as DailyExpense[]);
  };

  useEffect(() => { fetchDailyExpenses(); }, []);

  const openAdd = () => {
    setEditingItem(null);
    reset({ description: "", amount: 0, category: "outros", date: new Date().toISOString().split("T")[0], type: "variable", isScheduled: false });
    setIsModalOpen(true);
  };

  const openEdit = (item: DailyExpense) => {
    setEditingItem(item);
    reset({
      description: item.description,
      amount: item.amount,
      category: item.category,
      date: item.date,
      type: (item.type as any) || "variable",
      isScheduled: item.isScheduled || false,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        description: data.description,
        amount: parseCurrency(data.amount),
        category: data.category,
        date: data.date,
        type: data.type,
        isScheduled: data.isScheduled,
        userId: user.id,
      };
      if (editingItem) {
        await supabase.from("daily_expenses").update(payload).eq("id", editingItem.id).throwOnError();
        toast.success("Gasto atualizado");
      } else {
        await supabase.from("daily_expenses").insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success(data.isScheduled ? "Gasto programado!" : "Gasto registrado");
      }
      setIsModalOpen(false);
      await fetchDailyExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally { setIsSubmitting(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Deseja realmente excluir este gasto?")) return;
    try {
      await supabase.from("daily_expenses").delete().eq("id", id);
      toast.success("Gasto removido");
      fetchDailyExpenses();
    } catch { toast.error("Erro ao remover"); }
  };

  const today = new Date().toISOString().split("T")[0];

  const filteredByMonth = dailyExpenses.filter(de => {
    const d = new Date(de.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return monthKey === selectedMonth;
  });

  const filtered = filteredByMonth.filter(de => {
    if (tab === "done") return !de.isScheduled || de.date <= today;
    if (tab === "scheduled") return de.isScheduled && de.date > today;
    return true;
  });

  const totalFiltered = filtered.reduce((acc, de) => acc + de.amount, 0);
  const countScheduled = filteredByMonth.filter(de => de.isScheduled && de.date > today).length;

  const byCategory = filtered.reduce((acc, de) => {
    acc[de.category] = (acc[de.category] || 0) + de.amount;
    return acc;
  }, {} as Record<string, number>);

  const byDay = filtered.reduce((acc, de) => {
    const day = de.date.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(de);
    return acc;
  }, {} as Record<string, DailyExpense[]>);

  const monthOptions: { value: string; label: string }[] = [];
  for (let i = -2; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    monthOptions.push({ value, label });
  }

  const allTabs = [
    { id: "all" as const, label: "Todos", count: filteredByMonth.length },
    { id: "done" as const, label: "Realizados", count: filteredByMonth.filter(de => !de.isScheduled || de.date <= today).length },
    { id: "scheduled" as const, label: "Programados", count: countScheduled },
  ];

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="CONTROLE DIARIO">Gastos Diarios</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">Registre e programe seus gastos do dia a dia.</p>
        </div>
        <button onClick={openAdd} className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Novo Gasto
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
        {monthOptions.map(opt => (
          <button key={opt.value} onClick={() => setSelectedMonth(opt.value)}
            className={cn("font-semibold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 select-none whitespace-nowrap",
              selectedMonth === opt.value ? "bg-sp-purple border-transparent text-white shadow-sm" : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark hover:border-sp-text-sec/40"
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {allTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("font-semibold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap",
              tab === t.id ? "bg-orange-500 border-transparent text-white shadow-sm" : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark"
            )}>
            {t.label}{t.count > 0 && <span className={cn("ml-1 text-[10px] font-bold", tab === t.id ? "opacity-70" : "text-sp-text-subtle")}>({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">Total Filtrado</p>
          <p className="text-3xl font-black text-orange-700">{formatCurrency(totalFiltered)}</p>
        </div>
        <div className="bg-white border border-sp-border rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-sec mb-1">Programados</p>
          <p className="text-3xl font-black text-blue-600">{countScheduled}</p>
        </div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="bg-white border border-sp-border rounded-3xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-sp-text-dark mb-4 uppercase tracking-wider">Por Categoria</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).sort(([,a],[,b]) => b - a).map(([cat, amount]) => {
              const IconComp = catIcon(cat);
              const bgClass = catColor(cat);
              const pct = totalFiltered > 0 ? (amount / totalFiltered) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bgClass)}><IconComp className="w-4 h-4" /></div>
                  <span className="text-xs font-bold text-sp-text-dark flex-1">{catLabel(cat)}</span>
                  <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-sp-purple rounded-full" style={{ width: `${pct}%` }} /></div>
                  <span className="text-xs font-bold text-sp-text-dark w-20 text-right">{formatCurrency(amount)}</span>
                  <span className="text-[10px] font-bold text-sp-text-subtle w-10 text-right">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(byDay).sort(([a],[b]) => b.localeCompare(a)).map(([day, items]) => {
          const dayTotal = items.reduce((acc, i) => acc + i.amount, 0);
          const d = new Date(day + "T12:00:00");
          const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
          const isFutureDay = day > today;
          return (
            <div key={day} className={cn("border rounded-3xl p-5 shadow-sm", isFutureDay ? "bg-blue-50/30 border-blue-200" : "bg-white border-sp-border")}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-sp-border">
                <div className="flex items-center gap-2">
                  {isFutureDay ? <Clock className="w-4 h-4 text-blue-500" /> : <Calendar className="w-4 h-4 text-sp-purple" />}
                  <span className="text-sm font-extrabold text-sp-text-dark capitalize">{dayLabel}</span>
                  {isFutureDay && <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">Programado</span>}
                </div>
                <span className="text-sm font-black text-sp-red-text">{formatCurrency(dayTotal)}</span>
              </div>
              <div className="space-y-3">
                {items.map(item => {
                  const IconComp = catIcon(item.category);
                  const bgClass = catColor(item.category);
                  return (
                    <div key={item.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bgClass)}><IconComp className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-sp-text-dark truncate">{item.description}</p>
                          <p className="text-[10px] font-semibold text-sp-text-subtle uppercase tracking-wider">{catLabel(item.category)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-sp-text-dark">{formatCurrency(item.amount)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="p-1 text-sp-text-sec hover:text-sp-purple hover:bg-slate-50 rounded" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-1 text-sp-red-text hover:bg-sp-red-bg rounded" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white border border-dashed border-sp-border rounded-3xl">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sp-text-dark">Nenhum gasto registrado</p>
            <p className="text-xs text-sp-text-sec mt-1">Toque em "Novo Gasto" para comecar.</p>
          </div>
        )}
      </div>

      <button onClick={openAdd} className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-sp-purple text-white rounded-full flex items-center justify-center shadow-xl hover:bg-sp-purple-hover hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer">
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Gasto" : "Registrar Gasto"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Descricao</BrutalLabel>
            <BrutalInput {...register("description", { required: true })} placeholder="Ex: Almoco, Uber, Farmacia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Valor (R$)</BrutalLabel>
              <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="Ex: 45,90" />
            </div>
            <div>
              <BrutalLabel>Tipo</BrutalLabel>
              <select {...register("type")} className="w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all">
                <option value="variable">Variavel</option>
                <option value="fixed">Fixo (recorrente)</option>
              </select>
            </div>
          </div>
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <CategorySelect scope="daily" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>
          <div>
            <BrutalLabel>Data</BrutalLabel>
            <BrutalInput type="date" {...register("date", { required: true })} />
          </div>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <input type="checkbox" id="isScheduled-chk" {...register("isScheduled")} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            <label htmlFor="isScheduled-chk" className="text-sm font-semibold text-blue-800 cursor-pointer">Gasto programado (data futura)</label>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingItem ? "Salvar Alteracoes" : "Registrar Gasto"}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
