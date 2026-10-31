import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Income } from "../types";
import { Title, BrutalButton, BrutalLabel, BrutalInput } from "../components/BrutalUI";
import { Modal } from "../components/Modal";
import { CategorySelect } from "../components/CategorySelect";
import { formatCurrency, parseCurrency, addMonthsToDate, cn } from "../lib/utils";
import {
  Plus, Pencil, Trash2, DollarSign, Calendar, CheckCircle2, Clock,
  TrendingUp, Repeat, PiggyBank, Lock, Unlock, CreditCard, Link, Landmark,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

const BUILTIN_CATEGORIES = [
  { value: "salary", label: "Salario / CLT" },
  { value: "freelance", label: "Freelance" },
  { value: "investment", label: "Investimentos" },
  { value: "rental", label: "Aluguel recebido" },
  { value: "business", label: "Empresa / Comercio" },
  { value: "benefit", label: "Beneficios (vale, aux)" },
  { value: "bank_box", label: "Caixinha / Reserva Bancaria" },
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

// Card keys are stored in expenses as bank__baseName.toLowerCase()
// We show them from incomes.linkedCardKey
const getCardDisplayName = (linkedCardKey?: string) => {
  if (!linkedCardKey) return null;
  // format: "banco__nome do cartao"
  const parts = linkedCardKey.split("__");
  const bank = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "";
  const name = parts[1] ? parts[1].split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
  return bank && name ? `${name} (${bank})` : name || bank || linkedCardKey;
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
  repeatMonths: number;
  // caixinha
  boxStatus: "available" | "blocked";
  linkedCardKey: string;
  bankName: string;
};

export const Incomes = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"all" | "received" | "pending" | "future" | "caixinhas">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openBoxId, setOpenBoxId] = useState<string | null>(null);

  // Card keys available for linking (from expenses/cards + existing caixinhas)
  const [existingCardKeys, setExistingCardKeys] = useState<{key: string; displayName: string}[]>([]);

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<FormData>({
    defaultValues: {
      name: "", amount: "", frequency: "sporadic", type: "variable",
      category: "salary", expectedDate: "", isReceived: false,
      recurrenceDay: 5, repeatMonths: 1,
      boxStatus: "available", linkedCardKey: "", bankName: ""
    }
  });

  const fetchIncomes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
      supabase.from("incomes").select("*").eq("userId", user.id).eq("isActive", true),
      supabase.from("expenses").select("name,bank,category").eq("userId", user.id).eq("isActive", true),
    ]);
    if (incomeData) {
      const list = incomeData as Income[];
      setIncomes(list);
      // Collect card keys from caixinhas already linked
      const caixinhaKeys = list
        .filter(i => i.category === "bank_box" && i.linkedCardKey)
        .map(i => i.linkedCardKey!);
      // Collect card keys from actual expenses (cards & loans)
      const expenseKeys: string[] = [];
      if (expenseData) {
        expenseData.forEach((exp: any) => {
          if (exp.category === 'credit_card' || exp.category === 'loan' || exp.category === 'overdraft') {
            const bank = exp.bank || 'outro';
            // clean base name: remove month suffixes like " - Jan/2025"
            const cleanName = (exp.name || '').replace(/\s*-\s*(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/\d{4}$/i, '').trim();
            if (cleanName) expenseKeys.push(`${bank}__${cleanName.toLowerCase()}`);
          }
        });
      }
      const allKeys = [...new Set([...caixinhaKeys, ...expenseKeys])];
      setExistingCardKeys(allKeys.map(k => ({ key: k, displayName: getCardDisplayName(k) || k })));
    }
  };

  useEffect(() => { fetchIncomes(); }, []);

  const today = new Date().toISOString().split("T")[0];

  const openAdd = (forcedCategory?: string) => {
    setEditingIncome(null);
    const isCaixinha = forcedCategory === "bank_box";
    reset({
      name: "", amount: "", frequency: isCaixinha ? "sporadic" : "monthly",
      type: isCaixinha ? "variable" : "fixed",
      category: forcedCategory || "salary", expectedDate: today, isReceived: false,
      recurrenceDay: 5, repeatMonths: 1,
      boxStatus: "available", linkedCardKey: "", bankName: ""
    });
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
      repeatMonths: 1,
      boxStatus: (income.boxStatus as any) || "available",
      linkedCardKey: income.linkedCardKey || "",
      bankName: income.bankName || "",
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

  const toggleBoxStatus = async (income: Income) => {
    setTogglingId(income.id);
    try {
      const newStatus = income.boxStatus === "available" ? "blocked" : "available";
      await supabase.from("incomes").update({
        boxStatus: newStatus,
        updatedAt: new Date().toISOString(),
      }).eq("id", income.id);
      toast.success(newStatus === "available" ? "Caixinha liberada!" : "Caixinha bloqueada");
      await fetchIncomes();
    } catch { toast.error("Erro ao atualizar caixinha"); }
    finally { setTogglingId(null); }
  };

  const onSubmit = async (data: FormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIsSubmitting(true);
    try {
      const parsedAmount = parseCurrency(data.amount);
      const isCaixinha = data.category === "bank_box";

      const basePayload: any = {
        name: data.name,
        frequency: (data.frequency as any) || "monthly",
        amount: parsedAmount,
        type: data.type,
        category: data.category,
        expectedDate: data.expectedDate || null,
        isReceived: data.isReceived,
        paymentDate: data.isReceived ? (data.expectedDate || new Date().toISOString().split("T")[0]) : null,
        recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : null,
        userId: user.id,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (isCaixinha) {
        basePayload.boxStatus = data.boxStatus || "available";
        basePayload.linkedCardKey = data.linkedCardKey || null;
        basePayload.bankName = data.bankName || null;
      }

      if (editingIncome) {
        await supabase.from("incomes").update(basePayload).eq("id", editingIncome.id).throwOnError();
        toast.success(isCaixinha ? "Caixinha atualizada" : "Receita atualizada");
      } else {
        const repeatCount = data.repeatMonths ? Math.min(60, Math.max(1, Number(data.repeatMonths))) : 1;

        if (!isCaixinha && repeatCount > 1) {
          const baseDate = data.expectedDate || today;
          const recurrenceDay = data.recurrenceDay ? Number(data.recurrenceDay) : (baseDate ? parseInt(baseDate.split("-")[2] || "5", 10) : 5);
          const entries = [];
          for (let i = 0; i < repeatCount; i++) {
            const itemDate = addMonthsToDate(baseDate, i);
            entries.push({
              name: `${data.name} (${i + 1}/${repeatCount})`,
              amount: parsedAmount,
              frequency: (data.frequency as any) || "monthly",
              type: data.type,
              category: data.category,
              expectedDate: itemDate,
              isReceived: i === 0 ? Boolean(data.isReceived) : false,
              recurrenceDay,
              userId: user.id,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          await supabase.from("incomes").insert(entries).throwOnError();
          toast.success(`${repeatCount} receitas mensais geradas com sucesso!`);
        } else {
          await supabase.from("incomes").insert([{ ...basePayload, createdAt: new Date().toISOString() }]).throwOnError();
          toast.success(isCaixinha ? "Caixinha cadastrada!" : "Receita cadastrada");
        }
      }
      setIsModalOpen(false);
      await fetchIncomes();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally { setIsSubmitting(false); }
  };

  const deleteIncome = async (id: string) => {
    if (!confirm("Deseja realmente excluir?")) return;
    try {
      await supabase.from("incomes").update({ isActive: false }).eq("id", id);
      toast.success("Removido");
      fetchIncomes();
    } catch { toast.error("Erro ao remover"); }
  };

  const isFuture = (inc: Income) => !!(inc.expectedDate && inc.expectedDate > today && !inc.isReceived);

  // Caixinhas
  const caixinhas = incomes.filter(i => i.category === "bank_box");
  const regularIncomes = incomes.filter(i => i.category !== "bank_box");

  const totalCaixinhasAvailable = caixinhas.filter(c => c.boxStatus !== "blocked").reduce((acc, c) => acc + c.amount, 0);
  const totalCaixinhasBlocked = caixinhas.filter(c => c.boxStatus === "blocked").reduce((acc, c) => acc + c.amount, 0);

  const filtered = (tab === "caixinhas" ? caixinhas : regularIncomes).filter(inc => {
    if (tab === "received") return !!inc.isReceived;
    if (tab === "pending") return !inc.isReceived && !isFuture(inc);
    if (tab === "future") return isFuture(inc);
    return true;
  });

  const totalReceived = regularIncomes.reduce((acc, i) => acc + (i.isReceived ? i.amount : 0), 0);
  const totalExpected = regularIncomes.reduce((acc, i) => acc + (!i.isReceived ? i.amount : 0), 0);
  const countFuture = regularIncomes.filter(i => isFuture(i)).length;

  const allTabs = [
    { id: "all" as const, label: "Todas", count: regularIncomes.length },
    { id: "received" as const, label: "Recebidas", count: regularIncomes.filter(i => !!i.isReceived).length },
    { id: "pending" as const, label: "A Receber", count: regularIncomes.filter(i => !i.isReceived && !isFuture(i)).length },
    { id: "future" as const, label: "Futuras", count: countFuture },
    { id: "caixinhas" as const, label: "Caixinhas", count: caixinhas.length },
  ];

  const watchedType = watch("type");
  const watchedRepeatMonths = Number(watch("repeatMonths")) || 1;
  const watchedAmount = watch("amount");
  const watchedCategory = watch("category");
  const isCaixinhaForm = watchedCategory === "bank_box";

  // Group caixinhas by linkedCardKey for display
  const caixinhasByCard: Record<string, Income[]> = {};
  const caixinhasUnlinked: Income[] = [];
  caixinhas.forEach(c => {
    if (c.linkedCardKey) {
      if (!caixinhasByCard[c.linkedCardKey]) caixinhasByCard[c.linkedCardKey] = [];
      caixinhasByCard[c.linkedCardKey].push(c);
    } else {
      caixinhasUnlinked.push(c);
    }
  });

  return (
    <div className="space-y-6 pb-20 antialiased max-w-xl mx-auto md:max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title subtitle="ORCAMENTO">Receitas</Title>
          <p className="text-sm font-semibold text-sp-text-sec mt-1">Gerencie suas fontes de renda, reservas e caixinhas bancarias.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tab === "caixinhas" && (
            <button
              onClick={() => openAdd("bank_box")}
              className="bg-teal-600 text-white hover:bg-teal-700 font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <PiggyBank className="w-4 h-4" />
              Nova Caixinha
            </button>
          )}
          <button
            onClick={() => openAdd()}
            className="bg-sp-purple text-white hover:bg-sp-purple-hover font-extrabold text-xs py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-md shadow-sp-purple/10 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nova Receita
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {tab !== "caixinhas" ? (
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
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-1">Total Caixinhas</p>
            <p className="text-xl font-black text-teal-700">{formatCurrency(totalCaixinhasAvailable + totalCaixinhasBlocked)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Disponivel</p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(totalCaixinhasAvailable)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-1">Bloqueado</p>
            <p className="text-xl font-black text-orange-700">{formatCurrency(totalCaixinhasBlocked)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {allTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("font-semibold text-xs py-2 px-4 rounded-full border transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1",
              tab === t.id
                ? t.id === "caixinhas"
                  ? "bg-teal-600 border-transparent text-white shadow-sm"
                  : "bg-sp-purple border-transparent text-white shadow-sm"
                : "bg-white border-sp-border text-sp-text-sec hover:text-sp-text-dark"
            )}>
            {t.id === "caixinhas" && <PiggyBank className="w-3 h-3" />}
            {t.label}
            {t.count > 0 && <span className={cn("ml-0.5 text-[10px] font-bold", tab === t.id ? "opacity-70" : "text-sp-text-subtle")}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ── CAIXINHAS TAB ── */}
      {tab === "caixinhas" && (
        <div className="space-y-4">
          {caixinhas.length === 0 && (
            <div className="border-2 border-dashed border-teal-200 rounded-3xl py-16 px-4 text-center">
              <PiggyBank className="w-12 h-12 text-teal-200 mx-auto mb-4" />
              <h4 className="font-bold text-sp-text-dark">Nenhuma caixinha cadastrada</h4>
              <p className="text-xs text-sp-text-sec mt-1 mb-6">Adicione suas reservas e caixinhas bancarias com status disponivel ou bloqueado.</p>
              <BrutalButton onClick={() => openAdd("bank_box")} className="mx-auto w-max py-2 px-6">Criar Caixinha</BrutalButton>
            </div>
          )}

          {/* Unlinked caixinhas */}
          {caixinhasUnlinked.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sp-text-subtle mb-2 flex items-center gap-1.5">
                <PiggyBank className="w-3 h-3" /> Caixinhas Gerais
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {caixinhasUnlinked.map(box => (
                  <CaixinhaCard key={box.id} box={box} onEdit={openEdit} onDelete={deleteIncome} onToggleStatus={toggleBoxStatus} togglingId={togglingId} />
                ))}
              </div>
            </div>
          )}

          {/* Caixinhas grouped by card */}
          {Object.entries(caixinhasByCard).map(([cardKey, boxes]) => {
            const totalAvail = boxes.filter(b => b.boxStatus !== "blocked").reduce((s, b) => s + b.amount, 0);
            const totalBlocked = boxes.filter(b => b.boxStatus === "blocked").reduce((s, b) => s + b.amount, 0);
            const isOpen = openBoxId === cardKey;
            return (
              <div key={cardKey} className="border border-teal-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenBoxId(isOpen ? null : cardKey)}
                  className="w-full flex items-center justify-between p-4 bg-teal-50/50 hover:bg-teal-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-600/10 flex items-center justify-center">
                      <Link className="w-4 h-4 text-teal-700" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[9px] font-black uppercase tracking-wider text-teal-600">Vinculado ao Cartao</p>
                      <p className="font-black text-sm text-slate-900 truncate">{getCardDisplayName(cardKey)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-emerald-600">Dispon.</p>
                      <p className="text-sm font-black text-emerald-700">{formatCurrency(totalAvail)}</p>
                    </div>
                    {totalBlocked > 0 && (
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-orange-600">Bloq.</p>
                        <p className="text-sm font-black text-orange-700">{formatCurrency(totalBlocked)}</p>
                      </div>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-teal-600" /> : <ChevronDown className="w-4 h-4 text-teal-600" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white border-t border-teal-100">
                    {boxes.map(box => (
                      <CaixinhaCard key={box.id} box={box} onEdit={openEdit} onDelete={deleteIncome} onToggleStatus={toggleBoxStatus} togglingId={togglingId} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── REGULAR INCOMES TAB ── */}
      {tab !== "caixinhas" && (
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0", isRec ? "bg-emerald-100 text-emerald-600" : "bg-sp-purple/10 text-sp-purple")}>
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn("font-bold text-sm leading-tight truncate", isRec ? "text-emerald-900" : "text-sp-text-dark")}>{income.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] uppercase font-bold text-sp-text-subtle tracking-wider">{frequencyLabel(income.frequency)}</span>
                        {income.category && (
                          <>
                            <span className="text-sp-text-subtle text-[9px]">•</span>
                            <span className="text-[10px] text-sp-text-subtle font-medium truncate max-w-[110px]">{catLabel(income.category)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isFut && !isRec && <span className="bg-blue-500/10 text-blue-600 border border-blue-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">Futura</span>}
                    {isRec && <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Recebida</span>}
                    <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                      <button onClick={() => openEdit(income)} className="p-1 text-sp-text-subtle hover:text-sp-purple hover:bg-slate-100 rounded" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteIncome(income.id)} className="p-1 text-sp-text-subtle hover:text-sp-red-text hover:bg-sp-red-bg rounded" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100">
                  <span className={cn("text-lg sm:text-xl font-black tracking-tight", isRec ? "text-emerald-700" : "text-indigo-950")}>{formatCurrency(income.amount)}</span>
                  {income.expectedDate && (
                    <span className={cn("text-[11px] font-semibold flex items-center gap-1", isFut ? "text-blue-600" : isRec ? "text-emerald-600" : "text-sp-text-subtle")}>
                      <Calendar className="w-3 h-3" />
                      {new Date(income.expectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleReceived(income)}
                  disabled={isToggling}
                  className={cn(
                    "mt-2 w-full text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer",
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
              <BrutalButton onClick={() => openAdd()} className="mx-auto w-max py-2 px-6">Adicionar Receita</BrutalButton>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingIncome ? "Editar" : isCaixinhaForm ? "Nova Caixinha Bancaria" : "Nova Receita"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <BrutalLabel>Categoria</BrutalLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <CategorySelect scope="incomes" value={field.value} onChange={field.onChange} builtinOptions={BUILTIN_CATEGORIES} />
            )} />
          </div>

          {isCaixinhaForm ? (
            /* ── CAIXINHA FORM ── */
            <>
              <div>
                <BrutalLabel>Nome da Caixinha</BrutalLabel>
                <BrutalInput {...register("name", { required: true })} placeholder="Ex: Caixinha Nubank, Reserva Fatura, Fundo Emergencia" />
              </div>
              <div>
                <BrutalLabel>Valor (R$)</BrutalLabel>
                <BrutalInput type="text" inputMode="decimal" {...register("amount", { required: true })} placeholder="0,00" />
              </div>

              {/* Status: Disponivel / Bloqueado */}
              <div>
                <BrutalLabel>Status da Caixinha</BrutalLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "available", label: "Disponivel", icon: Unlock, desc: "Pode ser usado agora", color: "emerald" },
                    { value: "blocked", label: "Bloqueado", icon: Lock, desc: "Reservado para futuro", color: "orange" },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const selected = watch("boxStatus") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue("boxStatus", opt.value as any)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all cursor-pointer",
                          selected
                            ? opt.color === "emerald" ? "border-emerald-500 bg-emerald-50" : "border-orange-500 bg-orange-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 mb-1", selected ? (opt.color === "emerald" ? "text-emerald-600" : "text-orange-600") : "text-slate-400")} />
                        <p className={cn("text-xs font-black", selected ? (opt.color === "emerald" ? "text-emerald-800" : "text-orange-800") : "text-slate-700")}>{opt.label}</p>
                        <p className="text-[10px] text-sp-text-sec">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link to card */}
              <div>
                <BrutalLabel>Vincular a um Cartao (opcional)</BrutalLabel>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-sp-text-sec bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <Link className="w-4 h-4 shrink-0 text-teal-600" />
                    <span>Insira o identificador do cartao no formato <code className="bg-white px-1 rounded font-mono text-[10px]">banco__nome</code> (ex: <code className="bg-white px-1 rounded font-mono text-[10px]">nubank__fatura nubank</code>)</span>
                  </div>
                  {existingCardKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {existingCardKeys.map(({ key, displayName }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setValue("linkedCardKey", key)}
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                            watch("linkedCardKey") === key
                              ? "bg-teal-600 border-teal-600 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"
                          )}
                        >
                          <CreditCard className="w-2.5 h-2.5" />{displayName}
                        </button>
                      ))}
                    </div>
                  )}
                  <BrutalInput
                    {...register("linkedCardKey")}
                    placeholder="banco__nome do cartao (ex: nubank__fatura nubank)"
                  />
                </div>
              </div>

              <div>
                <BrutalLabel>Data de Referencia</BrutalLabel>
                <BrutalInput type="date" {...register("expectedDate")} />
              </div>
            </>
          ) : (
            /* ── REGULAR INCOME FORM ── */
            <>
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

              {!editingIncome && (
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
                  <p className="text-[11px] text-sp-text-sec leading-snug">Ideal para salários, pensões, aluguéis recebidos ou receitas recorrentes.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <input type="number" min="1" max="60" {...register("repeatMonths", { valueAsNumber: true })} className="w-20 bg-white border border-sp-border focus:border-sp-purple px-3 py-1.5 rounded-xl text-xs font-black text-center text-sp-text-dark focus:outline-none focus:ring-2 focus:ring-sp-purple/20 transition-all shadow-xs" />
                    <span className="text-xs font-bold text-sp-text-sec">meses</span>
                    <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar">
                      {[1, 3, 6, 12, 24].map((m) => (
                        <button key={m} type="button" onClick={() => setValue("repeatMonths", m)}
                          className={cn("text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap",
                            watchedRepeatMonths === m ? "bg-sp-purple border-sp-purple text-white shadow-xs" : "bg-white border-sp-border text-sp-text-sec hover:border-sp-purple/40 hover:text-sp-purple"
                          )}>
                          {m === 1 ? "1 mês" : `${m} meses`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {watchedRepeatMonths > 1 && (
                    <div className="text-[11px] font-semibold text-sp-purple bg-white border border-sp-purple/20 p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                      <span>Total acumulado ({watchedRepeatMonths} meses):</span>
                      <span className="font-black text-sm text-sp-purple">{formatCurrency(parseCurrency(watchedAmount || 0) * watchedRepeatMonths)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <input type="checkbox" id="isReceived-chk" {...register("isReceived")} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                <label htmlFor="isReceived-chk" className="text-sm font-semibold text-emerald-800 cursor-pointer">Ja foi recebida</label>
              </div>
            </>
          )}

          <BrutalButton type="submit" className="w-full mt-4" isLoading={isSubmitting}>
            {editingIncome ? "Salvar Alteracoes" : isCaixinhaForm ? "Criar Caixinha" : "Adicionar Receita"}
          </BrutalButton>
        </form>
      </Modal>
    </div>
  );
};

// ── Caixinha Card Component ─────────────────────────────────────────────────
interface CaixinhaCardProps {
  box: Income;
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (income: Income) => void;
  togglingId: string | null;
}

const CaixinhaCard = ({ box, onEdit, onDelete, onToggleStatus, togglingId }: CaixinhaCardProps) => {
  const isAvailable = box.boxStatus !== "blocked";
  const isToggling = togglingId === box.id;

  return (
    <div className={cn(
      "border rounded-xl p-3.5 transition-all duration-200 flex flex-col gap-2 shadow-2xs hover:shadow-sm",
      isAvailable ? "bg-emerald-50/40 border-emerald-200" : "bg-orange-50/40 border-orange-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0", isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
            {isAvailable ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate text-slate-900">{box.name}</p>
            <p className={cn("text-[9px] font-black uppercase tracking-wider", isAvailable ? "text-emerald-600" : "text-orange-600")}>
              {isAvailable ? "Disponivel" : "Bloqueado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(box)} className="p-1 text-sp-text-subtle hover:text-sp-purple rounded cursor-pointer" title="Editar"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onDelete(box.id)} className="p-1 text-sp-text-subtle hover:text-sp-red-text rounded cursor-pointer" title="Excluir"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-slate-100">
        <span className={cn("text-lg font-black tracking-tight", isAvailable ? "text-emerald-700" : "text-orange-700")}>{formatCurrency(box.amount)}</span>
        {box.expectedDate && (
          <span className="text-[10px] text-sp-text-sec flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(box.expectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => onToggleStatus(box)}
        disabled={isToggling}
        className={cn(
          "w-full text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border",
          isAvailable
            ? "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
        )}
      >
        {isToggling ? "..." : isAvailable
          ? (<><Lock className="w-3 h-3" /> Bloquear</>)
          : (<><Unlock className="w-3 h-3" /> Liberar</>)
        }
      </button>
    </div>
  );
};
