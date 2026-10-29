import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  CreditCard, 
  BrainCircuit, 
  TrendingUp,
  History, 
  LogOut,
  Bell,
  Receipt,
  ArrowUpCircle,
  Sparkles,
  ShoppingBag,
  Moon,
  Sun,
  Target,
  Menu,
  X,
  Tag
} from 'lucide-react';
import { logout, supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { User } from '@supabase/supabase-js';
import { useTheme } from '../lib/ThemeContext';

const APP_VERSION = 'v1.1';
const APP_BUILD_DATE = '29/10/2026';

const navItems = [
  { label: 'Resumo', href: '/', icon: LayoutDashboard },
  { label: 'Dívidas', href: '/debts', icon: CreditCard },
  { label: 'Essencial', href: '/ai-plan', icon: BrainCircuit },
  { label: 'Evolução', href: '/history', icon: History },
];

const extraItems = [
  { label: 'Gastos Diários', href: '/daily-expenses', icon: ShoppingBag },
  { label: 'Orçamento', href: '/budget', icon: Receipt },
  { label: 'Metas', href: '/goals', icon: Target },
  { label: 'Despesas', href: '/expenses', icon: Receipt },
  { label: 'Receitas', href: '/incomes', icon: TrendingUp },
  { label: 'Amortizar', href: '/payments', icon: ArrowUpCircle },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const avatarUrl = user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-sp-bg dark:bg-sp-dark-bg flex flex-col font-sans text-sp-text-dark dark:text-sp-dark-text transition-colors">
      
      {/* HEADER */}
      <header className="bg-white dark:bg-sp-dark-card border-b border-sp-border dark:border-sp-dark-border sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-xl text-sp-text-sec hover:bg-sp-purple-light hover:text-sp-purple active:scale-95 transition-all duration-200"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-sp-purple" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sp-purple flex items-center justify-center text-white shadow-sm shadow-sp-purple/30">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-sp-purple to-indigo-600 bg-clip-text text-transparent">
              Saldo Positivo
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-sp-purple/10 text-sp-purple border border-sp-purple/30 select-none">
              v1.1
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Demo Ativa
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-xl text-sp-text-sec hover:bg-sp-purple-light hover:text-sp-purple active:scale-95 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setShowNotification(!showNotification)}
            className="p-2 sm:p-2.5 rounded-xl text-sp-text-sec hover:bg-sp-purple-light hover:text-sp-purple active:scale-95 transition-all duration-200 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sp-purple rounded-full ring-2 ring-white" />
          </button>

          {showNotification && (
            <div className="absolute right-4 sm:right-16 top-14 sm:top-16 w-72 sm:w-80 bg-white dark:bg-sp-dark-card border border-sp-border dark:border-sp-dark-border rounded-2xl shadow-xl p-4 z-50">
              <h4 className="font-bold text-sm mb-2 text-sp-text-dark dark:text-sp-dark-text">Aviso de IA</h4>
              <p className="text-xs text-sp-text-sec leading-relaxed">
                Configure seus dados financeiros para receber alertas personalizados.
              </p>
            </div>
          )}

          <Link href="/history" className="flex items-center cursor-pointer">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-sp-purple shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 relative">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-72 bg-white dark:bg-sp-dark-card border-r border-sp-border dark:border-sp-dark-border flex-col p-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="flex-1 space-y-6">
            <div>
              <span className="text-[10px] font-bold text-sp-text-subtle uppercase tracking-widest pl-3 block mb-2">Central Geral</span>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={cn(
                        "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer select-none",
                        isActive ? "bg-sp-purple-light text-sp-purple" : "text-sp-text-sec hover:bg-slate-50 hover:text-sp-text-dark"
                      )}>
                        <item.icon className={cn("w-5 h-5", isActive ? "text-sp-purple" : "text-sp-text-subtle")} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div>
              <span className="text-[10px] font-bold text-sp-text-subtle uppercase tracking-widest pl-3 block mb-2">Operações</span>
              <nav className="space-y-1">
                {extraItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={cn(
                        "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer select-none",
                        isActive ? "bg-sp-purple-light text-sp-purple" : "text-sp-text-sec hover:bg-slate-50 hover:text-sp-text-dark"
                      )}>
                        <item.icon className={cn("w-5 h-5", isActive ? "text-sp-purple" : "text-sp-text-subtle")} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
          <div className="pt-4 border-t border-sp-border dark:border-sp-dark-border mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div className="overflow-hidden">
                <p className="text-xs text-sp-text-subtle font-medium uppercase tracking-wider">Conectado como</p>
                <p className="text-sm font-bold text-sp-text-dark truncate">{user?.user_metadata?.full_name || 'Operador'}</p>
              </div>
            </div>
            <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 py-3 bg-sp-red-bg hover:bg-red-200 transition-all text-sp-red-text font-bold text-xs rounded-xl uppercase tracking-wider">
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
            {/* Version badge */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sp-purple/8 border border-sp-purple/20 text-sp-purple text-[10px] font-bold tracking-wider select-none">
                <Tag className="w-3 h-3" />
                Saldo Positivo {APP_VERSION}
              </span>
              <span className="text-[9px] text-sp-text-subtle font-medium">{APP_BUILD_DATE}</span>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        <div 
          className={cn(
            "md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
            mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* MOBILE MENU */}
        <div className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-sp-dark-card z-50 transform transition-transform duration-300 ease-out overflow-y-auto shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="px-5 pt-5 pb-4 border-b border-sp-border dark:border-sp-dark-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sp-purple flex items-center justify-center text-white shadow-lg shadow-sp-purple/30">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-sp-text-dark dark:text-sp-dark-text">Saldo Positivo</p>
                <p className="text-[9px] font-bold text-sp-text-subtle uppercase tracking-wider">Painel Financeiro</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 -mr-2 rounded-xl text-sp-text-sec hover:bg-sp-red-bg hover:text-sp-red-text active:scale-95 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            <div>
              <span className="text-[9px] font-bold text-sp-text-subtle uppercase tracking-widest pl-3 block mb-2">Central Geral</span>
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                          isActive ? "bg-sp-purple-light text-sp-purple" : "text-sp-text-sec hover:bg-slate-50 active:scale-[0.97]"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-sp-purple" : "text-sp-text-subtle")} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <span className="text-[9px] font-bold text-sp-text-subtle uppercase tracking-widest pl-3 block mb-2">Operações</span>
              <nav className="space-y-0.5">
                {extraItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                          isActive ? "bg-sp-purple-light text-sp-purple" : "text-sp-text-sec hover:bg-slate-50 active:scale-[0.97]"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-sp-purple" : "text-sp-text-subtle")} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-sp-border dark:border-sp-dark-border">
              <div className="flex items-center gap-3 mb-3 px-3">
                <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-sp-purple/20" referrerPolicy="no-referrer" />
                <div className="overflow-hidden">
                  <p className="text-[9px] text-sp-text-subtle font-medium uppercase tracking-wider">Conectado como</p>
                  <p className="text-xs font-bold text-sp-text-dark truncate">{user?.user_metadata?.full_name || 'Operador'}</p>
                </div>
              </div>
              <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 py-3 bg-sp-red-bg hover:bg-red-200 active:scale-[0.97] transition-all text-sp-red-text font-bold text-[11px] rounded-xl uppercase tracking-wider">
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </button>
              {/* Version badge mobile */}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sp-purple/8 border border-sp-purple/20 text-sp-purple text-[10px] font-bold tracking-wider select-none">
                  <Tag className="w-3 h-3" />
                  Saldo Positivo {APP_VERSION}
                </span>
                <span className="text-[9px] text-sp-text-subtle font-medium">{APP_BUILD_DATE}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT & BOTTOM FOOTER */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
            {children}
          </main>

          {/* RODAPÉ DA PÁGINA (PARTE DE BAIXO) COM VERSÃO */}
          <footer className="mt-auto py-6 px-4 sm:px-8 border-t border-sp-border dark:border-sp-dark-border bg-white dark:bg-sp-dark-card transition-colors">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2 text-xs text-sp-text-subtle">
                <span className="font-extrabold text-sp-text-dark dark:text-sp-dark-text">Saldo Positivo</span>
                <span>•</span>
                <span>Elimine suas dívidas &amp; Liberdade Financeira</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sp-purple/15 border border-sp-purple/40 text-sp-purple font-black text-xs shadow-sm">
                  <Tag className="w-3.5 h-3.5" />
                  Versão {APP_VERSION}
                </span>
                <span className="text-[11px] text-sp-text-subtle font-semibold">Atualização {APP_BUILD_DATE}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

    </div>
  );
};
