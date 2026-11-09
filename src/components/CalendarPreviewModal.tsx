import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Calendar, Clock, Bell, Sparkles } from 'lucide-react';

export const CalendarPreviewModal: React.FC = () => {
  const { calendarPreviewData, setCalendarPreviewData, triggerSuccess } = useApp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('15:45');
  const [reminder, setReminder] = useState('15 minuti prima');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (calendarPreviewData) {
      setTitle(calendarPreviewData.title || '');
      setDate(calendarPreviewData.date || new Date().toISOString().split('T')[0]);
      setStartTime(calendarPreviewData.startTime || '15:00');
      setEndTime(calendarPreviewData.endTime || '15:45');
      setDescription(calendarPreviewData.description || '');
    }
  }, [calendarPreviewData]);

  if (!calendarPreviewData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (calendarPreviewData.onSave) {
        await calendarPreviewData.onSave({
          title,
          date,
          startTime,
          endTime,
          description,
        });
      }
      triggerSuccess('Evento salvato su Google Calendar!');
      setCalendarPreviewData(null);
    } catch (e) {
      console.warn('Errore salvataggio evento:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card max-w-lg w-full rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-left relative overflow-hidden bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-white/10 pb-safe">
        
        {/* Header Modale */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#16161E] dark:text-white leading-tight">Nuovo evento</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider">
              ANTEPRIMA GOOGLE CALENDAR
            </p>
          </div>
          <button
            onClick={() => setCalendarPreviewData(null)}
           className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] overflow-y-auto space-y-4 flex-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* TITOLO MULTILINEA (Textarea dinamica invece di Input singolo) */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">TITOLO</label>
            <textarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent focus:border-[#6A49D8] text-xs font-semibold text-[#16161E] dark:text-white focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* DATA ED ORARIO */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-6">
              <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                <Calendar className="w-3 h-3 text-[#6A49D8]" />
                <span>DATA</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent text-xs font-semibold text-[#16161E] dark:text-white focus:outline-none"
              />
            </div>

            <div className="col-span-6">
              <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                <Clock className="w-3 h-3 text-[#6A49D8]" />
                <span>ORARIO</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-center px-1.5 py-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent text-xs font-semibold text-[#16161E] dark:text-white focus:outline-none"
                />
                <span className="text-gray-400 font-bold text-xs">-</span>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-center px-1.5 py-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent text-xs font-semibold text-[#16161E] dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* PROMEMORIA */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
              <Bell className="w-3 h-3 text-[#6A49D8]" />
              <span>PROMEMORIA</span>
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent text-xs font-semibold text-[#16161E] dark:text-white focus:outline-none"
            >
              <option value="5 minuti prima">5 minuti prima</option>
              <option value="15 minuti prima">15 minuti prima</option>
              <option value="30 minuti prima">30 minuti prima</option>
              <option value="1 ora prima">1 ora prima</option>
            </select>
          </div>

          {/* DESCRIZIONE GENERATA DALL'IA */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-[#6A49D8] dark:text-[#A088F9] uppercase mb-1 tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>DESCRIZIONE GENERATA DALL'IA</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-white/[0.06] border border-transparent focus:border-[#6A49D8] text-xs text-gray-600 dark:text-neutral-300 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* AZIONI IN BASSO CON PADDING SICURO DALLA BOTTOM NAV BAR */}
        <div className="flex gap-3 mt-6 pt-2 mb-2 pb-safe">
          <button
            type="button"
            onClick={() => setCalendarPreviewData(null)}
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#6A49D8] hover:bg-[#5B3CC4] text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva su Calendar'}
          </button>
        </div>

      </div>
    </div>
  );
};