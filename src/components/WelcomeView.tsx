import React from 'react';
import { useApp } from '../context/AppContext';
import { AILogo } from './AILogo';
import { ArrowRight, Sun, Moon, Sparkles, Calendar, CheckSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeViewProps {
  onStart: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart }) => {
  const { isDarkMode, toggleTheme } = useApp();

  const handleStartClick = () => {
    onStart();
  };

  const handleOpenPrivacy = () => {
    window.open('https://tuo-dominio.onrender.com/index.html', '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors pt-safe">
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AILogo size="md" />
          <span className="font-extrabold text-lg tracking-tight text-[#16161E] dark:text-white">
            Recap
          </span>
        </div>

        <button
          id="welcome-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          title={isDarkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
          className="p-2 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-white/[0.09] border border-white/70 dark:border-white/10 shadow-2xs transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 text-center my-auto flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#6A49D8]/10 dark:bg-[#6A49D8]/20 border border-[#6A49D8]/20 text-[#6A49D8] dark:text-[#A088F9] text-[11px] font-extrabold tracking-wider uppercase mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          L'Assistente Riunioni Intelligente
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-[#16161E] dark:text-white tracking-tight leading-tight mb-6 max-w-3xl"
        >
          Trasforma le tue discussioni in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B3CC4] to-[#A088F9]">risultati concreti</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-base sm:text-lg text-gray-500 dark:text-neutral-400 max-w-2xl font-medium leading-relaxed mb-10"
        >
          Registra le tue riunioni con Recap. Genera mappe concettuali, riassunti ed elementi d'azione strutturati che si sincronizzano istantaneamente con Google Calendar e Tasks.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            id="welcome-start-btn"
            onClick={handleStartClick}
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#6A49D8] hover:bg-[#5B3CC4] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          >
            <span>Inizia Subito</span>
            <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-10 text-xs font-semibold text-gray-400 dark:text-neutral-500"
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#6A49D8]/70" />
            <span>Sincronizzazione Google Calendar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#6A49D8]/70" />
            <span>Integrazione Google Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#6A49D8]/70" />
            <span>Isolamento e Sicurezza dei Dati</span>
          </div>
        </motion.div>
      </main>

      <footer className="py-8 transition-colors">
        <div className="max-w-xl w-full mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-gray-400 dark:text-neutral-500">
            <button
              type="button"
              onClick={handleOpenPrivacy}
              className="underline underline-offset-2 hover:text-[#6A49D8] dark:hover:text-[#A088F9] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <a
              href="mailto:it.recap.info@gmail.com"
              className="underline underline-offset-2 hover:text-[#6A49D8] dark:hover:text-[#A088F9] transition-colors"
            >
              Contatti
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};