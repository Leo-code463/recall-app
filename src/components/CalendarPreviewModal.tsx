import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Calendar, Clock, Bell, FileText, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CalendarPreviewModal: React.FC = () => {
  const { calendarPreviewData, setCalendarPreviewData, triggerSuccess } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminder, setReminder] = useState('15 minuti prima');
  const [description, setDescription] = useState('');

  // Sync state whenever calendarPreviewData becomes available or changes
  useEffect(() => {
    if (calendarPreviewData) {
      setTitle(calendarPreviewData.title || '');
      setDate(calendarPreviewData.date || '');
      setStartTime(calendarPreviewData.startTime || '');
      setEndTime(calendarPreviewData.endTime || '');
      setDescription(calendarPreviewData.description || '');
    }
  }, [calendarPreviewData]);

  if (!calendarPreviewData) return null;

  const { onSave } = calendarPreviewData;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (onSave) {
        // Execute the save function from the parent
        await onSave({
          title,
          date,
          startTime,
          endTime,
          reminder,
          description
        });
      }
      
      setCalendarPreviewData(null);
      triggerSuccess('Evento sincronizzato!');
      try {
        confetti({ particleCount: 60, spread: 50 });
      } catch (e) {}
    } catch (err) {
      console.error('Error saving calendar event:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1D1F] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl border-t sm:border border-gray-100 dark:border-[#272B30] overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-[#272B30] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#1A1A1A] dark:text-white">
              Nuovo evento
            </h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-400 uppercase tracking-tight">
              Anteprima Google Calendar
            </p>
          </div>
          <button
            onClick={() => setCalendarPreviewData(null)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Title input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider">
              Titolo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
              required
            />
          </div>

          {/* Grid fields for date and time */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Data</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Orario</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="10:00"
                  className="w-full text-center px-2 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
                  required
                />
                <span className="text-xs text-gray-400 font-bold">-</span>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="10:45"
                  className="w-full text-center px-2 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reminder option */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider flex items-center gap-1">
              <Bell className="w-3 h-3 text-gray-400" />
              <span>Promemoria</span>
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
            >
              <option value="15 minuti prima">15 minuti prima</option>
              <option value="30 minuti prima">30 minuti prima</option>
              <option value="1 ora prima">1 ora prima</option>
              <option value="1 giorno prima">1 giorno prima</option>
            </select>
          </div>

          {/* AI description field */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#6C5DD3]" />
              <span className="text-[#6C5DD3] dark:text-[#A798F8]">Descrizione generata dall'IA</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 text-xs leading-normal rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C5DD3]"
              required
            />
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCalendarPreviewData(null)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4cb8] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#6C5DD3]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <span>Salva su Calendar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
