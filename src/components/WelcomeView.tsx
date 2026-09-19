import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AILogo } from './AILogo';
import { ArrowRight, Star, Quote, Sun, Moon, Sparkles, Calendar, CheckSquare, ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptic';

interface WelcomeViewProps {
  onStart: () => void;
}

const REVIEWS = [
  {
    id: 1,
    name: 'Alessandro R.',
    role: 'Project Manager',
    quote: 'Recall ha rivoluzionato la gestione dei miei meeting. Il riassunto AI è impeccabile e la sincronizzazione immediata con Google Calendar e Tasks mi risparmia ore di lavoro.',
    stars: 5,
  },
  {
    id: 2,
    name: 'Elena M.',
    role: 'Product Designer',
    quote: 'Poter registrare le discussioni e vedere la mappa concettuale creata in automatico è fantastico. L\'integrazione con Google Workspace è immediata.',
    stars: 5,
  },
  {
    id: 3,
    name: 'Marco T.',
    role: 'Tech Lead',
    quote: 'Semplice, pulita, senza fronzoli. L\'isolamento dei dati tra diversi account è perfetto ed i riassunti sono precisi ed incredibilmente utili.',
    stars: 5,
  },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart }) => {
  const { isDarkMode, toggleTheme } = useApp();
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  const handleStartClick = () => {
    triggerHaptic();
    onStart();
  };

  const handlePrevReview = () => {
    triggerHaptic(10);
    setActiveReviewIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  const handleNextReview = () => {
    triggerHaptic(10);
    setActiveReviewIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -60) {
      handleNextReview();
    } else if (info.offset.x > 60) {
      handlePrevReview();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#111315] flex flex-col justify-between transition-colors">
      {/* Header Bar */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AILogo size="md" />
          <span className="font-extrabold text-lg tracking-tight text-[#1A1A1A] dark:text-white">
            Recall<span className="text-[#761EAF]">AI</span>
          </span>
        </div>

        <button
          id="welcome-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          title={isDarkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
          className="p-2 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-[#1A1D1F] border border-gray-200 dark:border-[#272B30] shadow-2xs transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </header>

      {/* Hero / Main Introduction */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-center my-auto flex flex-col items-center justify-center">
        {/* Animated Accent Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#761EAF]/10 dark:bg-[#761EAF]/20 border border-[#761EAF]/20 text-[#761EAF] dark:text-[#BC6EEB] text-[11px] font-extrabold tracking-wider uppercase mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          L'Assistente Riunioni Intelligente
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-[#1A1A1A] dark:text-white tracking-tight leading-none mb-6 max-w-3xl"
        >
          Trasforma le tue discussioni in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6B1D9F] to-[#BC6EEB]">risultati concreti</span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-base sm:text-lg text-gray-500 dark:text-neutral-400 max-w-2xl font-medium leading-relaxed mb-10"
        >
          Registra le tue riunioni con Recall AI. Genera mappe concettuali, riassunti ed elementi d'azione strutturati che si sincronizzano istantaneamente con Google Calendar e Tasks.
        </motion.p>

        {/* Big CTA Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            id="welcome-start-btn"
            onClick={handleStartClick}
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] hover:from-[#7B22BC] hover:to-[#9C44D4] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          >
            <span>Inizia Subito</span>
            <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* Small Value Props */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-8 text-xs font-semibold text-gray-400 dark:text-neutral-500"
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#761EAF]/70" />
            <span>Sincronizzazione Google Calendar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#761EAF]/70" />
            <span>Integrazione Google Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#761EAF]/70" />
            <span>Isolamento e Sicurezza dei Dati</span>
          </div>
        </motion.div>
      </main>

      {/* Reviews Section */}
      <footer className="bg-white/50 dark:bg-[#1A1D1F]/40 border-t border-gray-200/80 dark:border-[#272B30] py-10 sm:py-12 transition-colors">
        <div className="max-w-xl w-full mx-auto px-4">
          <div className="text-center mb-5">
            <span className="text-[10px] font-extrabold text-[#761EAF] dark:text-[#BC6EEB] tracking-widest uppercase block mb-1">
              Testimonianze
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white">
              Cosa dicono i nostri utenti professionisti
            </h2>
          </div>

          {/* Swipeable Testimonials Carousel */}
          <div className="relative">
            {/* Desktop & Mobile Swipe Deck Card */}
            <div className="overflow-hidden min-h-[175px] flex items-center justify-center py-2 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeReviewIndex}
                  initial={{ opacity: 0, x: 50, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={handleDragEnd}
                  className="w-full bg-white dark:bg-[#1A1D1F] p-5 rounded-2xl border border-gray-150 dark:border-[#272B30] shadow-3xs active:cursor-grabbing cursor-grab select-none flex flex-col justify-between relative"
                >
                  <div>
                    {/* Stars and Drag indicator */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: REVIEWS[activeReviewIndex].stars }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
                        <Hand className="w-3 h-3 text-[#761EAF]/50" />
                        <span>Trascina</span>
                      </div>
                    </div>

                    {/* Quote text */}
                    <p className="text-xs sm:text-[13px] text-gray-500 dark:text-neutral-400 font-medium leading-relaxed italic mb-4">
                      "{REVIEWS[activeReviewIndex].quote}"
                    </p>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-center justify-between mt-auto border-t border-gray-100 dark:border-[#272B30]/50 pt-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                        {REVIEWS[activeReviewIndex].name}
                      </h4>
                      <p className="text-[10px] font-medium text-gray-400 dark:text-neutral-500">
                        {REVIEWS[activeReviewIndex].role}
                      </p>
                    </div>
                    <Quote className="w-4 h-4 text-[#761EAF]/20 dark:text-[#BC6EEB]/10 rotate-180" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Left/Right Buttons (for accessibility & precision) */}
            <button
              onClick={handlePrevReview}
              className="absolute -left-3 sm:-left-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-[#272B30] shadow-3xs flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
              title="Recensione precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextReview}
              className="absolute -right-3 sm:-right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-[#272B30] shadow-3xs flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
              title="Recensione successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {REVIEWS.map((rev, index) => (
              <button
                key={rev.id}
                onClick={() => {
                  triggerHaptic(8);
                  setActiveReviewIndex(index);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  index === activeReviewIndex 
                    ? 'w-5 bg-[#761EAF]' 
                    : 'w-1.5 bg-gray-300 dark:bg-neutral-700 hover:bg-gray-400'
                }`}
                title={`Vedi recensione ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
