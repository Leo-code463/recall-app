import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Check } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen, user, setPlan } = useApp();

  if (!isUpgradeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#282828] max-w-lg w-full rounded-[16px] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white font-sans">
        <button
          onClick={() => setIsUpgradeModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-[#A7A7A7] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="bg-[#1ED760] text-black text-[11px] font-black px-2.5 py-1 rounded-[4px] w-fit mb-4 uppercase tracking-wider leading-none">
          OFFERTA PREMIUM
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4.5 h-4.5 rounded-full bg-[#1ED760] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
            <span className="text-[11px] font-black tracking-wider uppercase text-white">Recall Premium</span>
          </div>
          <h2 className="text-3xl font-black text-[#1ED760] tracking-tighter leading-tight">
            Individual PRO
          </h2>
          <p className="mt-1.5 text-xs text-[#A7A7A7] font-medium leading-relaxed">
            Potenzia la tua produttività con diarizzazione multi-speaker avanzata e automazione calendario.
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-4 p-4 bg-[#181818] rounded-xl border border-[#282828] mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#1ED760]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#1ED760]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Riconoscimento Multi-Voce Avanzato
              </p>
              <p className="text-[11px] text-[#A7A7A7] font-medium mt-0.5">
                Distingui e assegna automaticamente il parlato a più interlocutori
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#1ED760]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#1ED760]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Modulo "Calendario AI" Esclusivo
              </p>
              <p className="text-[11px] text-[#A7A7A7] font-medium mt-0.5">
                Estrae automaticamente date ed impegni e li aggiunge su Google Calendar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#1ED760]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#1ED760]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Riassunti IA e Chat Illimitati
              </p>
              <p className="text-[11px] text-[#A7A7A7] font-medium mt-0.5">
                Analisi approfondite con i modelli più performanti di Gemini
              </p>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-black text-white tracking-tight">€14,99</p>
            <p className="text-[11px] text-[#A7A7A7] font-semibold mt-0.5">/ mese (fatturato mensilmente)</p>
          </div>

          <button
            onClick={() => {
              setPlan('pro');
              setIsUpgradeModalOpen(false);
            }}
            className="w-full py-3 bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-black uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-sm text-center active:scale-[0.98]"
          >
            {user?.plan === 'pro' ? 'Piano PRO Già Attivo' : 'Attiva Abbonamento PRO Subito'}
          </button>

          {user?.plan === 'pro' && (
            <div className="text-center pt-1">
              <button
                onClick={() => {
                  setPlan('free');
                  setIsUpgradeModalOpen(false);
                }}
                className="text-[11px] text-[#A7A7A7] hover:text-[#1ED760] hover:underline cursor-pointer font-bold uppercase tracking-wider"
              >
                Downgrade al Piano Gratuito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
