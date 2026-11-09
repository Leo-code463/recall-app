import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Calendar,
  Clock,
  Video,
  RotateCw,
  Mic,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface NextEvent {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  meetUrl?: string;
}

interface HomeHeroBannerProps {
  nextEvent?: NextEvent;
  onRefresh?: () => void;
}

export const HomeHeroBanner: React.FC<HomeHeroBannerProps> = ({
  nextEvent = {
    title: 'Riunione Sistema Solare',
    startTime: '16:30',
    endTime: '17:30',
    meetUrl: 'https://meet.google.com',
  },
  onRefresh,
}) => {
  const { user, meetings, setIsRecordingModalOpen } = useApp();
  const { t } = useLanguage();

  const totalMeetings = meetings.length;
  const userName = user?.name ? user.name.split(' ')[0] : 'Leonardo';

  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#6A49D8] via-[#5E37D3] to-[#4922B4] p-6 sm:p-8 text-white shadow-xl shadow-[#6A49D8]/20 transition-all">
      {/* Elementi decorativi in Glassmorphism sullo sfondo */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#B29FFF]/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Sezione Superiore: Saluto e Azioni Generali */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              Ciao, {userName}! 👋
            </h1>
            <p className="text-xs sm:text-sm font-medium text-white/80">
              Hai {totalMeetings} registrazioni nel tuo archivio
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Aggiorna sincronizzazione"
                className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsRecordingModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-[#6A49D8] text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-[#6A49D8]" />
              <span>Nuova Registrazione</span>
            </button>
          </div>
        </div>

        {/* Card Interna Glassmorphism: Prossima Riunione */}
        {nextEvent && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div className="space-y-2">
              {/* Badge Tag */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-white border border-white/15">
                  <Calendar className="w-3 h-3" />
                  PROSSIMA RIUNIONE
                </span>
                {nextEvent.meetUrl && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-[10px] font-bold border border-emerald-400/20">
                    <Video className="w-3 h-3" />
                    Google Meet
                  </span>
                )}
              </div>

              {/* Titolo Riunione e Orario */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {nextEvent.title}
                </h3>
                <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-white/70" />
                  <span>
                    {nextEvent.startTime} – {nextEvent.endTime}
                  </span>
                </p>
              </div>
            </div>

            {/* Pulsanti d'Azione Riunione */}
            <div className="flex items-center gap-2 shrink-0">
              {nextEvent.meetUrl && (
                <a
                  href={nextEvent.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white text-xs font-bold transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Apri Meet</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setIsRecordingModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-white/90 text-[#6A49D8] text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Registra</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};