import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleWorkspaceService } from '../services/calendarService';
import {
  Calendar as CalendarIcon,
  Plus,
  Video,
  Clock,
  CheckCircle2,
  Circle,
  RefreshCw,
  Mic,
  CalendarDays,
  Loader2,
  CalendarPlus,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { AILogo } from './AILogo';
import confetti from 'canvas-confetti';

export const AgendaView: React.FC = () => {
  const {
    upcomingEvents,
    todayTasks,
    taskAiDetections,
    isAnalyzingTasks,
    taskAiError,
    analyzeTasksWithAi,
    convertTaskToCalendarEvent,
    refreshCalendarEvents,
    deleteCalendarEvent,
    setIsRecordingModalOpen,
    toggleTask,
    addTask,
  } = useApp();

  const { language, t } = useLanguage();

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Quick Add Task State
  const [newTaskInput, setNewTaskInput] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const startIso = `${newEventDate}T${newEventTime}:00`;
    const endDate = new Date(new Date(startIso).getTime() + 45 * 60000);
    const endIso = endDate.toISOString();

    await GoogleWorkspaceService.addEvent(
      {
        title: newEventTitle.trim(),
        start: startIso,
        end: endIso,
        description: newEventDesc.trim() || undefined,
        location: 'Google Meet',
      },
      upcomingEvents
    );

    await refreshCalendarEvents();

    setNewEventTitle('');
    setNewEventDesc('');
    setIsAddingEvent(false);

    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    await addTask(
      newTaskInput.trim(),
      language === 'it' ? 'Aggiunto da Agenda' : 'Added from Agenda'
    );
    setNewTaskInput('');
  };

  const filteredTasks = todayTasks.filter((task) => {
    if (taskFilter === 'pending') return !task.completed;
    if (taskFilter === 'completed') return task.completed;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight">
            {t('agenda')}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="agenda-analyze-tasks-btn"
            type="button"
            onClick={analyzeTasksWithAi}
            disabled={isAnalyzingTasks}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-[#761EAF]/15 dark:hover:bg-[#761EAF]/25 text-[#761EAF] dark:text-[#C084FC] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isAnalyzingTasks ? (
              <AILogo size="xs" isThinking={true} />
            ) : (
              <AILogo size="xs" />
            )}
            <span>{t('checkWithAiBtn')}</span>
          </button>

          <button
            id="agenda-sync-gcal-btn"
            onClick={async () => {
              setIsSyncing(true);
              await refreshCalendarEvents();
              setTimeout(() => setIsSyncing(false), 600);
            }}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-[#272B30] text-[#1A1A1A] dark:text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title={
              language === 'it'
                ? 'Sincronizza subito con Google Workspace'
                : 'Sync immediately with Google Workspace'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#761EAF] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t('syncingBtn') : t('syncBtn')}</span>
          </button>

          <button
            id="agenda-add-event-toggle-btn"
            onClick={() => setIsAddingEvent(!isAddingEvent)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newAppointmentBtn')}</span>
          </button>
        </div>
      </div>

      {/* AI Task Scanner Detections Banner */}
      {taskAiDetections.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#761EAF]/10 dark:bg-[#761EAF]/15 border border-[#761EAF]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AILogo size="sm" />
              <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                {t('aiDetectedEventsTitle').replace('{count}', String(taskAiDetections.length))}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {taskAiDetections.map((detection) => (
              <div
                key={detection.taskId}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1D1F] border border-gray-200 dark:border-[#272B30] flex flex-col justify-between gap-2 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white">
                      "{detection.taskTitle}"
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#761EAF]/10 text-[#761EAF]">
                      {detection.suggestedEvent?.startTime || '10:00'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-1">
                    {detection.reasoning}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-1">
                  {detection.isScheduled ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('addedLabel')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => convertTaskToCalendarEvent(detection)}
                      className="px-3 py-1.5 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>{language === 'it' ? 'Inserisci nel Calendario' : 'Add to Calendar'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Event Form Modal/Drawer */}
      {isAddingEvent && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 shadow-sm border border-[#761EAF]/30 space-y-4 animate-in fade-in duration-200"
        >
          <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
            {t('planMeetingGCalTitle')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-400 dark:text-neutral-400 mb-1">
                {t('meetingTitleLabel')}
              </label>
              <input
                type="text"
                required
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder={language === 'it' ? 'Es. Review Progetto' : 'e.g., Project Review'}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-neutral-400 mb-1">
                {language === 'it' ? 'Data' : 'Date'}
              </label>
              <input
                type="date"
                required
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-neutral-400 mb-1">
                {t('startTimeLabel')}
              </label>
              <input
                type="time"
                required
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 dark:text-neutral-400 mb-1">
              {language === 'it' ? 'Note o Ordine del Giorno (Opzionale)' : 'Notes or Agenda (Optional)'}
            </label>
            <input
              type="text"
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
              placeholder={t('agendaNotesPlaceholder')}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingEvent(false)}
              className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {t('gcalAddBtn')}
            </button>
          </div>
        </form>
      )}

      {/* Two Column Layout: Events & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Google Calendar Events (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#761EAF]" />
              <span>{t('upcomingEventsTitle')}</span>
            </h2>
            <span className="text-xs font-medium text-gray-400 dark:text-neutral-400">
              {upcomingEvents.length}{' '}
              {upcomingEvents.length === 1 ? t('eventCountSingle') : t('eventsCount')}
            </span>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 shadow-xs border border-gray-200/80 dark:border-[#272B30] hover:border-[#761EAF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                        {event.title}
                      </span>
                      {event.isRecallLinked && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/20 dark:text-[#C084FC]">
                          Recall Sync
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-neutral-400 flex items-center gap-2 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(event.start).toLocaleDateString(
                          language === 'it' ? 'it-IT' : 'en-US',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}{' '}
                        {language === 'it' ? 'ore' : 'at'}{' '}
                        {new Date(event.start).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <span>{event.location}</span>
                        </>
                      )}
                    </p>

                    {event.description && (
                      <p className="text-xs text-gray-400 dark:text-neutral-400 line-clamp-1 font-normal">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {event.meetUrl && (
                      <a
                        href={event.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t('participateBtn')}</span>
                      </a>
                    )}

                    <button
                      onClick={() => setIsRecordingModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{t('registerBtn')}</span>
                    </button>

                    <button
                      onClick={() => deleteCalendarEvent(event.id)}
                      title={t('deleteEventTooltip')}
                      className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] hover:border-rose-200 dark:hover:border-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1A1D1F] p-8 rounded-3xl border border-gray-200/80 dark:border-[#272B30] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center mx-auto">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                {t('noUpcomingEvents')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-sm mx-auto">
                {t('noUpcomingEventsDesc')}
              </p>
              <button
                onClick={() => setIsAddingEvent(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#761EAF] text-white text-xs font-bold shadow-xs hover:bg-[#681898] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('planMeetingBtn')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Google Tasks Sincronizzati (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-200/80 dark:border-[#272B30] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#761EAF]" />
              <span>Google Tasks</span>
            </h2>
            <span className="text-[11px] font-bold text-[#761EAF] dark:text-[#C084FC]">
              Real-Time
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-[#F8F9FB] dark:bg-[#272B30] p-1 rounded-2xl text-xs border border-gray-200/60 dark:border-transparent">
            <button
              onClick={() => setTaskFilter('all')}
              className={`flex-1 py-1 font-bold rounded-xl transition-all cursor-pointer ${
                taskFilter === 'all'
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                  : 'text-gray-400 dark:text-neutral-400'
              }`}
            >
              {t('tasksFilterAll')} ({todayTasks.length})
            </button>
            <button
              onClick={() => setTaskFilter('pending')}
              className={`flex-1 py-1 font-bold rounded-xl transition-all cursor-pointer ${
                taskFilter === 'pending'
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                  : 'text-gray-400 dark:text-neutral-400'
              }`}
            >
              {t('tasksFilterToDo')} ({todayTasks.filter((t) => !t.completed).length})
            </button>
            <button
              onClick={() => setTaskFilter('completed')}
              className={`flex-1 py-1 font-bold rounded-xl transition-all cursor-pointer ${
                taskFilter === 'completed'
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                  : 'text-gray-400 dark:text-neutral-400'
              }`}
            >
              {t('tasksFilterDone')}
            </button>
          </div>

          {/* Inline Add Task */}
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder={t('addGTasksPlaceholder')}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
            />
            <button
              type="submit"
              className="px-3.5 py-2.5 bg-[#761EAF] text-white text-xs font-bold rounded-xl hover:bg-[#681898] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Tasks list */}
          {filteredTasks.length > 0 ? (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    task.completed
                      ? 'bg-gray-50 dark:bg-neutral-900/30 border-transparent opacity-60'
                      : 'bg-white dark:bg-[#1A1D1F] border-gray-200/80 dark:border-[#272B30] hover:border-[#761EAF]/40'
                  }`}
                >
                  <button type="button" className="mt-0.5 text-gray-400">
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        task.completed
                          ? 'line-through text-gray-400 dark:text-neutral-400'
                          : 'text-[#1A1A1A] dark:text-white'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.notes && (
                      <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate mt-0.5 font-normal">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 dark:text-neutral-400">
              {t('noTasksPlaceholder')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
