import React from 'react';
import { BrutalButton } from '../components/BrutalUI';
import { signInWithGoogle } from '../lib/supabase';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Login = () => {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/50 flex flex-col items-center justify-center p-6 antialiased">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center space-y-10"
      >
        {/* Upper Brand Icon & Logo */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-sp-purple text-white rounded-3xl flex items-center justify-center shadow-lg shadow-sp-purple/20">
              <Sparkles className="w-8 h-8 fill-current" />
            </div>
          </div>
          
          <div>
            <h1 className="text-4xl font-extrabold text-indigo-950 tracking-tight leading-none">
              Saldo Positivo
            </h1>
            <p className="mt-2 text-sp-purple text-xs font-bold uppercase tracking-[0.2em]">
              O Caminho Definitivo Para Sua Liberdade
            </p>
          </div>
        </div>

        {/* Action card */}
        <div className="bg-white border border-sp-border rounded-4xl p-8 text-left shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 pointer-events-none" />
          
          <h2 className="text-2xl font-black text-indigo-950 mb-3 tracking-tight">
            Seja bem-vindo
          </h2>
          <p className="text-sp-text-sec mb-8 text-sm leading-relaxed font-medium">
            Acesse seu painel financeiro otimizado com inteligência artificial para planejar, gerenciar e quitar suas obrigações de forma previsível e livre de estresse.
          </p>

          <button 
            className="w-full flex items-center justify-center gap-2.5 text-base font-extrabold text-white bg-sp-purple hover:bg-sp-purple-hover h-14 rounded-2xl shadow-lg shadow-sp-purple/10 active:scale-[0.98] transition-all cursor-pointer select-none"
            onClick={signInWithGoogle}
          >
            Acesse com o Google
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          <p className="mt-6 text-[10px] text-sp-text-subtle uppercase tracking-widest text-center font-bold">
            Conexão Criptografada • Proteção de Dados
          </p>
        </div>
      </motion.div>
    </div>
  );
};
