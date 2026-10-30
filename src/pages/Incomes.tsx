import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Income } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, parseCurrency, cn } from "../lib/utils";
import { Plus, Pencil, Trash2, DollarSign, Calendar, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "salary", label: "Salario / CLT" },
  { value: "freelance", label: "Freelance" },
  { value: "investment", label: "Investimentos" },
  { value: "rental", label: "Aluguel recebido" },
  { value: "business", label: "Empresa / Comercio" },
  { value: "benefit", label: "Beneficios (vale, aux)" },
  { value: "other", label: "Outros" },
];

const catLabel = (cat: string) =>
  BUILTIN_CATEGORIES.find(c => c.value === cat)?.label ?? cat;

const frequencyLabel = (freq: string) => {
  switch (freq) {
    case "monthly": return "Mensal";
    case "weekly": return "Semanal";
    case "biweekly": return "Quinzenal";
    case "annual": return "Anual";
    default: return "Esporadico";
  }
};

type FormData = {
  name: string;
  amount: any;
  frequency: string;
  type: "fixed" | "variable";
  category: string;
  expectedDate: string;
  isReceived: boolean;
  recurrenceDay: number;
};

export const Incomes = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"all" | "received" | "pending" | "future">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, control } = useForm<FormData>({
    defaultValues: { name: "", amount: 0, frequency: "monthly", type: "fixed", category: "salary", expectedDate: "", isReceived: false, recurrenceDay: 5 }
  });

  const fetchIncomes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data } = await supabase.from("incomes").select("*").eq("userId", user.id).eq("isActive", true);
    if (data) setIncomes(data as Income[]);
  };

  useEffect(() => { fetchIncomes(); }, []);

  const today = new Date().toISOString().split("T")[0];

  const openAdd = () => {
    setEditingIncome(null);
    reset({ name: "", amount: 0, frequency: "monthly", type: "fixed", category: "salary", expectedDate: today, isReceived: false, recurrenceDay: 5 });
    setIsModalOpen(true);
  };

  const openEdit = (income: Income) => {
    setEditingIncome(income);
    reset({
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      type: (income.type as any) || "fixed",
      category: income.category || "salary",
      expectedDate: income.expectedDate || today,
      isReceived: income.isReceived || false,
      recurrenceDay: income.recurrenceDay || 5,
    });
    setIsModalOpen(true);
  };

  const toggleReceived = async (income: Income) => {
    setTogglingId(income.id);
    try {
      const nowReceived = !income.isReceived;
      await supabase.from("incomes").update({
        isReceived: nowReceived,
        updatedAt: new Date().toISOString(),
      }).eq("id", income.id);
      toast.success(nowReceived ? "Receita confirmada!" : "Marcada como pendente");
      await fetchIncomes();
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
        frequency: data.frequency,
        amount: parseCurrency(data.amount),
        type: data.type,
        category: data.category,
        expectedDate: data.expectedDate || null,
        isReceived: data.isReceived,
        recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };
      if (editingIncome) {
        await supabase.from("incomes").update(payload).eq("id", editingIncome.id).throwOnError();
        toast.success("Receita atualizada");
      } else {
        await supabase.from("incomes").insert([{ ...payload, createdAt: new Date().toISOString() }]).throwOnError();
        toast.success("Receita cadastrada");
      }
      setIsModalOpen(false);
      await fetchIncomes();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally { setIsSubmitting(false); }
  };

  const deleteIncome = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta receita?")) return;
    try {
      await supabase.from("incomes").update({ isActive: false }).eq("id", id);
      toast.success("Receita removida");
      fetchIncomes();
    } catch { toast.error("Erro ao remover receita"); }
  };

  const isFuture = (inc: Income) => !!(inc.expectedDate && inc.expectedDate > today && !inc.isReceived);

  const filtered = incomes.filter(inc => {
    if (tab === "received") return !!inc.isReceived;
    if (tab === "pending") return !inc.isReceived && !isFuture(inc);
    if (tab === "future") return isFuture(inc);
    return true;
  });

  const totalReceived = incomes.reduce((acc, i) => acc + (i.isReceived ? i.amount : 0), 0);
  const totalExpected = incomes.reduce((acc, i) => acc + (!i.isReceived ? i.amount : 0), 0);
  const countFuture = incomes.filter(i => isFuture(i)).length;

  const allTabs = [
    { id: "all" as const, label: "Todas", count: incomes.length },
    { id: "received" as const, label: "Recebidas", count: incomes.filter(i => !!i.isReceived).length },
    { id: "pending" as const, label: "A Receber", count: incomes.filter(i => !i.isReceived && !isFuture(i)).length },
    { id: "future" as const, label: "Futuras", count: countFuture },
  ];

  const watchedType = watch("type");

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORCAMENTO">Receitas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">Gerencie suas fontes de renda fixas, variaveis e futuras.</p>
        </div>
        <button onClick={openAdd} className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all shrink-0 cursor-pointer">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Receita
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Recebido</p>
          <p className="text-xl font-black text-emerald-700">{formatCurrency(totalReceived)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">A Receber</p>
          <p className="text-xl font-black text-amber-700">{formatCurrency(totalExpected)}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(income => {
          const isRec = !!income.isReceived;
          const isFut = isFuture(income);
          const isToggling = togglingId === income.id;
          return (
            <div 
              key={income.id} 
              className={cn(
                "border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 relative group flex flex-col justify-between shadow-xs hover:shadow-md",
                isRec ? "bg-emerald-50/30 border-emerald-200/80" : isFut ? "bg-blue-50/25 border-blue-200/80" : "bg-white border-sp-border"
              )}
            >
              {/* TOP: Compact Icon, Title & Badges/Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0", 
                    isRec ? "bg-emerald-100 text-emerald-600" : "bg-sp-purple/10 text-sp-purple"
                  )}>
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn("font-bold text-sm leading-tight truncate", isRec ? "text-emerald-900" : "text-sp-text-dark")}>
                      {income.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-sp-text-subtle tracking-wider">
                        {frequencyLabel(income.frequency)}
                      </span>
                      {income.category && (
                        <>
                          <span className="text-sp-text-subtle text-[9px]">•</span>
                          <span className="text-[10px] text-sp-text-subtle font-medium truncate max-w-[110px]">
                            {catLabel(income.category)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isFut && !isRec && (
                    <span className="bg-blue-500/10 text-blue-600 border border-blue-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Futura
                    </span>
                  )}
                  {isRec && (
                    <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Recebida
                    </span>
                  )}
                  <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                    <button onClick={() => openEdit(income)} className="p-1 text-sp-text-subtle hover:text-sp-purple hover:bg-slate-100 rounded" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteIncome(income.id)} className="p-1 text-sp-text-subtle hover:text-sp-red-text hover:bg-sp-red-bg rounded" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Amount & Date */}
              <div className="flex items-baseline justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-sp-dark-border/40">
                <span className={cn("text-lg sm:text-xl font-black tracking-tight", isRec ? "text-emerald-700" : "text-indigo-950 dark:text-white")}>
                  {formatCurrency(income.amount)}
                </span>
                {income.expectedDate && (
                  <span className={cn("text-[11px] font-semibold flex items-center gap-1", isFut ? "text-blue-600" : isRec ? "text-emerald-600" : "text-sp-text-subtle")}>
                    <Calendar className="w-3 h-3" />
                    {new Date(income.expectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>

              {/* BOTTOM: Slim Action Button */}
              <button 
                onClick={() => toggleReceived(income)} 
                disabled={isToggling}
                className={cn(
                  "mt-2 w-full text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
                  isRec 
                    ? "bg-white text-sp-text-sec hover:bg-amber-50 hover:text-amber-700 border border-emerald-200 shadow-xs" 
                    : "bg-sp-purple/8 text-sp-purple hover:bg-sp-purple hover:text-white border border-sp-purple/20 shadow-xs"
                )}
              >
                {isToggling ? "..." : isRec ? (<><Clock className="w-3 h-3" /> Marcar Pendente</>) : (<><CheckCircle2 className="w-3 h-3" /> Confirmar Recebimento</>)}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-sp-border rounded-3xl py-16 px-4 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-sp-text-dark">Nenhuma receita encontrada</h4>
            <p className="text-xs text-sp-text-sec mt-1 mb-6">Adicione suas fontes de renda para calcular o saldo.</p>
            <BrutalButton onClick={openAdd} className="mx-auto w-max py-2 px-6">Adicionar Receita</BrutalButton>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingIncome ? "Editar Receita" : "Nova Receita"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Nome</BrutalLabel>
            <BrutalInput {...register("name", { required: true })} placeholder="Ex: Salario, Freelance, Aluguel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Valor (R$)</BrutalLabel>
              <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="0,00" />
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
              <CategorySelect scope="incomes" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>
          <div>
            <BrutalLabel>Frequencia</BrutalLabel>
            <select {...register("frequency")} className="w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all">
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="annual">Anual</option>
              <option value="sporadic">Esporadico</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BrutalLabel>Data Esperada</BrutalLabel>
              <BrutalInput type="date" {...register("expectedDate")} />
            </div>
            {watchedType === "fixed" && (
              <div>
                <BrutalLabel>Dia de Recorrencia</BrutalLabel>
                <BrutalInput type="number" min="1" max="31" {...register("recurrenceDay")} placeholder="Ex: 5" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <input type="checkbox" id="isReceived-chk" {...register("isReceived")} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            <label htmlFor="isReceived-chk" className="text-sm font-semibold text-emerald-800 cursor-pointer">Ja foi recebida</label>
          </div>
          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingIncome ? "Salvar Alteracoes" : "Adicionar Receita"}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};
