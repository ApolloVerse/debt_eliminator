import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { Plus, X, Check, Tag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { CustomCategory } from "../types";

interface CategoryOption {
  value: string;
  label: string;
}

interface CategorySelectProps {
  scope: "expenses" | "daily" | "debts" | "incomes";
  value: string;
  onChange: (value: string) => void;
  builtinOptions: CategoryOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  scope,
  value,
  onChange,
  builtinOptions,
  placeholder = "Selecionar categoria...",
  className,
  disabled,
}) => {
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadCustomCats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("custom_categories")
      .select("*")
      .eq("userId", userId)
      .eq("scope", scope);
    if (data) setCustomCats(data as CustomCategory[]);
  };

  useEffect(() => { loadCustomCats(); }, [scope]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNewInput(false);
        setNewCatName("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (showNewInput) inputRef.current?.focus();
  }, [showNewInput]);

  const allOptions: CategoryOption[] = [
    ...builtinOptions,
    ...customCats.map(c => ({ value: c.id, label: c.name })),
  ];

  const selectedLabel = allOptions.find(o => o.value === value)?.label || value || placeholder;

  const saveNewCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const newCat = {
        id: "custom-" + Date.now(),
        userId,
        name: newCatName.trim(),
        scope,
        createdAt: new Date().toISOString(),
      };
      const { data: inserted } = await supabase
        .from("custom_categories")
        .insert([newCat])
        .select()
        .single();
      if (inserted) {
        setCustomCats(prev => [...prev, inserted as CustomCategory]);
        onChange(inserted.id);
        setShowNewInput(false);
        setNewCatName("");
        setIsOpen(false);
      }
    } catch (err) {
      console.error("[CategorySelect] Error saving custom category", err);
    } finally {
      setSavingCat(false);
    }
  };

  const deleteCustomCat = async (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("custom_categories").delete().eq("id", catId);
    setCustomCats(prev => prev.filter(c => c.id !== catId));
    if (value === catId) onChange(builtinOptions[0]?.value || "");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "bg-white border border-sp-border rounded-xl px-4 py-3.5 text-sm text-left",
          "focus:outline-none focus:ring-4 focus:ring-sp-purple/10 focus:border-sp-purple",
          "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "border-sp-purple ring-4 ring-sp-purple/10"
        )}
      >
        <span className={cn("flex items-center gap-2 flex-1 truncate font-medium", !value ? "text-sp-text-subtle" : "text-sp-text-dark")}>
          <Tag className="w-3.5 h-3.5 text-sp-purple shrink-0" />
          {selectedLabel}
        </span>
        <svg className={cn("w-4 h-4 text-sp-text-sec transition-transform shrink-0", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-sp-border rounded-2xl shadow-xl max-h-72 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 py-1.5">
            {builtinOptions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle px-3 py-1.5">Categorias padrao</p>
                {builtinOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-sp-purple/5 rounded-lg mx-1", value === opt.value && "text-sp-purple font-bold bg-sp-purple/5")}
                  >
                    {value === opt.value ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {customCats.length > 0 && (
              <div className="mt-1 border-t border-sp-border pt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sp-text-subtle px-3 py-1.5">Minhas categorias</p>
                {customCats.map(cat => (
                  <div key={cat.id} className={cn("flex items-center group rounded-lg mx-1", value === cat.id && "bg-sp-purple/5")}>
                    <button
                      type="button"
                      onClick={() => { onChange(cat.id); setIsOpen(false); }}
                      className="flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-sp-purple/5 rounded-l-lg"
                    >
                      {value === cat.id ? <Check className="w-3.5 h-3.5 shrink-0 text-sp-purple" /> : <span className="w-3.5 shrink-0" />}
                      <span className={cn(value === cat.id ? "text-sp-purple font-bold" : "text-sp-text-dark")}>
                        {cat.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteCustomCat(cat.id, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-sp-red-text hover:bg-sp-red-bg rounded transition-all"
                      title="Remover categoria"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-sp-border p-2 bg-slate-50/70 rounded-b-2xl">
            {!showNewInput ? (
              <button
                type="button"
                onClick={() => setShowNewInput(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sp-purple hover:bg-sp-purple/5 rounded-lg transition-colors font-semibold"
              >
                <Plus className="w-4 h-4" />
                Nova categoria personalizada
              </button>
            ) : (
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); saveNewCategory(); }
                    if (e.key === "Escape") { setShowNewInput(false); setNewCatName(""); }
                  }}
                  placeholder="Nome da categoria..."
                  className="flex-1 text-sm bg-white border border-sp-border rounded-lg px-3 py-2 focus:outline-none focus:border-sp-purple focus:ring-2 focus:ring-sp-purple/10"
                />
                <button
                  type="button"
                  disabled={!newCatName.trim() || savingCat}
                  onClick={saveNewCategory}
                  className="px-3 py-2 bg-sp-purple text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-sp-purple-hover transition-colors"
                >
                  {savingCat ? "..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewInput(false); setNewCatName(""); }}
                  className="px-2 py-2 text-sp-text-sec hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
