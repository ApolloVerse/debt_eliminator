import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  CreditCard, 
  BrainCircuit, 
  TrendingUp,
  History, 
  LogOut,
  Bell,
  User as UserIcon,
  Plus,
  Receipt,
  ArrowUpCircle,
  Sparkles
} from 'lucide-react';
import { auth, logout } from '../lib/firebase';
import { cn } from '../lib/utils';

const navItems = [
  { label: 'Início', href: '/', icon: LayoutDashboard },
  { label: 'Dívidas', href: '/debts', icon: CreditCard },
  { label: 'Estratégia', href: '/ai-plan', icon: BrainCircuit },
  { label: 'Evolução', href: '/history', icon: History },
];

const extraItems = [
  { label: 'Despesas', href: '/expenses', icon: Receipt },
  { label: 'Receitas', href: '/incomes', icon: TrendingUp },
  { label: 'Amortizar', href: '/payments', icon: ArrowUpCircle },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation();
  const user = auth.currentUser;
  const [showNotification, setShowNotification] = useState(false);

  // User avatar URL or a beautiful default
  const avatarUrl = user?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-sp-bg flex flex-col font-sans text-sp-text-dark">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-sp-border sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer select-none">
          <div className="w-9 h-9 rounded-xl bg-sp-purple flex items-center justify-center text-white shadow-sm shadow-sp-purple/30">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-sp-purple to-indigo-600 bg-clip-text text-transparent">
            Saldo Positivo
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button 
            onClick={() => setShowNotification(!showNotification)}
            className="p-2.5 rounded-xl text-sp-text-sec hover:bg-sp-purple-light hover:text-sp-purple transition-all relative"
          >
            <Bell className="w-5.5 h-5.5" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-sp-purple rounded-full ring-2 ring-white" />
          </button>

          {showNotification && (
            <div className="absolute right-16 top-16 w-80 bg-white border border-sp-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="font-bold text-sm mb-2 text-sp-text-dark">Aviso de IA</h4>
              <p className="text-xs text-sp-text-sec leading-relaxed">
                Excelente escolha! Sua dívida do Nubank está progredindo bem. A Inteligência Artificial sugere amortizar mais R$ 150 para acelerar sua data de quitação.
              </p>
            </div>
          )}

          {/* Profile Picture */}
          <Link href="/history" className="flex items-center gap-2 cursor-pointer">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-sp-purple shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 relative mb-16 md:mb-0">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-72 bg-white border-r border-sp-border flex-col p-6 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
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
                        isActive 
                          ? "bg-sp-purple-light text-sp-purple" 
                          : "text-sp-text-sec hover:bg-slate-50 hover:text-sp-text-dark"
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
                        isActive 
                          ? "bg-sp-purple-light text-sp-purple" 
                          : "text-sp-text-sec hover:bg-slate-50 hover:text-sp-text-dark"
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

          {/* User Logged Info */}
          <div className="pt-4 border-t border-sp-border mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <p className="text-xs text-sp-text-subtle font-medium uppercase tracking-wider">Conectado como</p>
                <p className="text-sm font-bold text-sp-text-dark truncate">
                  {user?.displayName || 'Operador'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sp-red-bg hover:bg-red-200 transition-all text-sp-red-text font-bold text-xs rounded-xl uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-sp-border px-4 py-2 flex items-center justify-around z-40 shadow-lg">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex flex-col items-center justify-center touch-target cursor-pointer",
                isActive ? "text-sp-purple" : "text-sp-text-subtle"
              )}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-1 tracking-tight">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

    </div>
  );
};
