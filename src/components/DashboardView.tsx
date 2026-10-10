import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { hapticTap } from '../utils/haptic';
import {
  Mic,
  Clock,
  Plus,
  RefreshCw,
  Inbox,
  Sparkles,
  Bell,
  Check,
  ChevronRight,
} from 'lucide-react';
import { AILogo } from './AILogo';

export const DashboardView: React.FC = () => {
  const {
    user,
    upcomingEvents,
    todayTasks,
    meetings,
    taskAiDetections,
    isAnalyzingTasks,
    taskAiError,
    analyzeTasksWithAi,
    setIsRecordingModalOpen,
    toggleTask,
    addTask,
    refreshCalendarEvents,
    setIsSettingsModalOpen,
    setActiveTab,
    setActiveMeetingId,
    setCalendarPreviewData,
    friendsReceivedPending,
    setShowFriendsSetting,
  } = useApp();

  const { language, t } = useLanguage();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Lo sfondo sfocato dell'header compare solo quando la pagina scorre
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Next upcoming meeting
  const nextMeeting = upcomingEvents.length > 0 ? upcomingEvents[0] : {
    id: 'mock_event_1',
    title: 'Marketing Web Agency',
    start: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 85 * 60 * 1000).toISOString(),
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    attendees: ['Giulia Alberti', 'Leo Rossini'],
  };

  const getRelativeTimeString = (startDateStr: string) => {
    try {
      const diffMs = new Date(startDateStr).getTime() - Date.now();
      if (diffMs <= 0) return t('ongoing');
      const diffMins = Math.round(diffMs / (60 * 1000));
      if (diffMins < 60) {
        return t('inMinutes').replace('{mins}', String(diffMins));
      }
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) {
        if (diffHours === 1) return t('inHour');
        return t('inHours').replace('{hours}', String(diffHours));
      }
      return new Date(startDateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return t('inMinutes').replace('{mins}', '25');
    }
  };

  // Etichetta "Oggi, 09:30" / "Ieri, 16:00" / "12 ott, 18:45" calcolata dalla data reale della riunione
  const formatMeetingDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const isIt = language === 'it';
      const time = d.toLocaleTimeString(isIt ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
      if (dayDiff === 0) return `${isIt ? 'Oggi' : 'Today'}, ${time}`;
      if (dayDiff === 1) return `${isIt ? 'Ieri' : 'Yesterday'}, ${time}`;
      const day = d.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short' });
      return `${day}, ${time}`;
    } catch {
      return '';
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await addTask(
      newTaskTitle.trim(),
      language === 'it' ? 'Aggiunto manualmente dalla Dashboard' : 'Added manually from Dashboard'
    );
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshCalendarEvents();
    setTimeout(() => setIsSyncing(false), 650);
  };

  const handleTaskSyncClick = (task: any) => {
    const isTask1 = task.id === 'task-1';
    const isTask2 = task.id === 'task-2';
    
    setCalendarPreviewData({
      title: task.title,
      date: new Date().toISOString().split('T')[0],
      startTime: isTask1 ? '11:00' : isTask2 ? '14:30' : '17:00',
      endTime: isTask1 ? '11:45' : isTask2 ? '15:15' : '17:45',
      description: language === 'it'
        ? `Sincronizzazione automatica per l'attività: "${task.title}".\nIdentificato da Recall AI come impegno da programmare.`
        : `Automatic synchronization for task: "${task.title}".\nIdentified by Recall AI as a commitment to schedule.`,
      onSave: async (savedEvent: any) => {
        // Toggle the task to completed to show it has been processed
        await toggleTask(task.id);
      }
    });
  };

  /* ---------- Stile "Glassmorphism" (palette ricavata dal video di riferimento) ---------- */
  const GLASS =
    'bg-white/75 backdrop-blur-xl border border-white/70 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:bg-white/[0.06] dark:border-white/10 dark:shadow-none';
  const INK = 'text-[#16161E] dark:text-white';
  const MUTED = 'text-[#6D6D77] dark:text-[#ADACB5]';
  const PRIMARY_TEXT = 'text-[#6A49D8] dark:text-[#B29FFF]';
  const BTN_PRIMARY =
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-[#6A49D8] text-white font-semibold shadow-[0_6px_18px_-6px_rgba(106,73,216,0.55)] transition-all hover:bg-[#5B3CC4] active:scale-95 cursor-pointer dark:bg-[#A088F9] dark:text-[#14101F] dark:hover:bg-[#B29FFF] dark:shadow-none';
  const TEAL_TEXT = 'text-[#0EBFA2] dark:text-[#5DE6CF]';
  // Colori delle card "Discussioni recenti": alternano viola e verde acqua come nel video
  const CARD_TONES = [
    {
      iconBox: 'bg-[#E4DAF7] text-[#6A49D8] dark:bg-white/10 dark:text-[#B29FFF]',
      chip: 'bg-[#E9E3FA] text-[#6A49D8] dark:bg-[#3B2F5C] dark:text-[#B29FFF]',
    },
    {
      iconBox: 'bg-[#D4F3EC] text-[#0EBFA2] dark:bg-white/10 dark:text-[#5DE6CF]',
      chip: 'bg-[#DBF2EF] text-[#0EBFA2] dark:bg-[#1F3B3A] dark:text-[#5DE6CF]',
    },
  ];

  return (
    <div className="ds space-y-7 animate-in fade-in duration-300 max-w-2xl mx-auto pb-16">
      {/* ===== 1. Header sticky =====
          I margini negativi/padding ripetono quelli di <main> (incluso il safe-area della status bar Android):
          l'header parte dal bordo alto e lo sfondo sfocato copre anche la status bar. */}
      <div
        className={`sticky top-0 z-50 -mx-3 sm:mx-0 px-3 sm:px-0 -mt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:-mt-[calc(1.5rem+env(safe-area-inset-top,0px))] pt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between gap-3 transition-all duration-200 ${
          scrolled ? 'bg-[#F5F3FD]/75 backdrop-blur-xl dark:bg-[#0F0D18]/70' : 'bg-transparent'
        }`}
      >
        <div className="min-w-0">
          <p className={`text-[15px] leading-5 ${MUTED}`}>{t('goodMorning')}</p>
          <h1 className={`font-display text-[26px] font-semibold leading-8 tracking-tight truncate ${INK}`}>
            {user?.name || 'Leonardo Fiorot'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Campanella notifiche */}
          <button
            id="dashboard-notifications-btn"
            onClick={() => {
              hapticTap('light');
              setIsSettingsModalOpen(true);
              setShowFriendsSetting(true);
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${GLASS}`}
            title={t('viewNotificationsAndFriends')}
          >
            <Bell className={`w-5 h-5 ${INK}`} strokeWidth={1.9} />
            {friendsReceivedPending.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#F43F6E] border-2 border-white dark:border-[#1B1926] rounded-full" />
            )}
          </button>

          {/* Profilo */}
          <button
            id="dashboard-profile-btn"
            onClick={() => {
              hapticTap('light');
              setActiveTab('profile');
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden active:scale-95 transition-transform cursor-pointer ${GLASS}`}
            title={t('viewProfileAndSettings')}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={`text-sm font-semibold ${PRIMARY_TEXT}`}>
                {(user?.name || 'L')
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===== 2. Prossima riunione ===== */}
      {nextMeeting && (
        <div className="rounded-[26px] p-4 flex items-center gap-3.5 bg-[#EAE8FE]/90 border border-white/70 shadow-[0_10px_40px_-16px_rgba(106,73,216,0.3)] dark:bg-[#302850]/80 dark:border-white/10 dark:shadow-none">
          <div className="w-14 h-14 rounded-2xl bg-[#D6CFF9] dark:bg-white/10 flex items-center justify-center shrink-0">
            <Clock className={`w-6 h-6 ${PRIMARY_TEXT}`} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-medium leading-snug ${PRIMARY_TEXT}`}>
              {t('nextMeeting')} · {getRelativeTimeString(nextMeeting.start)}
            </p>
            <h3 className={`font-display text-base font-semibold leading-snug truncate mt-0.5 ${INK}`}>
              {nextMeeting.title}
            </h3>
          </div>

          <div className="shrink-0">
            {nextMeeting.meetUrl ? (
              <a
                href={nextMeeting.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BTN_PRIMARY} h-10 px-5 text-sm`}
              >
                {t('join')}
              </a>
            ) : (
              <button
                onClick={() => setIsRecordingModalOpen(true)}
                className={`${BTN_PRIMARY} h-10 px-5 text-sm`}
              >
                {t('record')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== 3. Discussioni recenti ===== */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className={`font-display text-lg font-semibold ${INK}`}>{t('recentDiscussions')}</h2>
          <button
            onClick={() => setActiveTab('search')}
            className={`text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 ${PRIMARY_TEXT}`}
          >
            {t('viewAll')}
          </button>
        </div>

        {meetings.length > 0 ? (
          <div className="no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-px-3 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {meetings.map((meet, cardIdx) => {
              const tone = CARD_TONES[cardIdx % CARD_TONES.length];
              return (
                <div
                  key={meet.id}
                  onClick={() => setActiveMeetingId(meet.id)}
                  className={`snap-start shrink-0 w-[272px] rounded-[28px] p-5 flex flex-col gap-3.5 active:scale-[0.98] transition-transform cursor-pointer ${GLASS}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tone.iconBox}`}>
                      <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.9} />
                    </div>
                    <span className={`text-[13px] ${MUTED}`}>{formatMeetingDateTime(meet.date)}</span>
                  </div>

                  <h3 className={`font-display text-[15px] font-semibold leading-snug line-clamp-2 ${INK}`}>
                    {meet.title}
                  </h3>

                  {meet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meet.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${tone.chip}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-0.5">
                    <div className="flex -space-x-2">
                      {meet.speakers.map((spk, idx) => (
                        <div
                          key={idx}
                          title={spk.name}
                          className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1B1926] bg-[#F1EFF9] dark:bg-[#2A2736] text-[11px] font-semibold text-[#16161E] dark:text-white flex items-center justify-center uppercase"
                        >
                          {spk.name === 'Me' ? 'ME' : spk.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                      ))}
                    </div>
                    <ChevronRight className={`w-[18px] h-[18px] ${MUTED}`} strokeWidth={1.9} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-[28px] px-5 py-8 text-center text-sm ${GLASS} ${MUTED}`}>
            {language === 'it'
              ? 'Nessuna discussione registrata. Tocca il microfono per iniziare.'
              : 'No recordings yet. Tap the microphone to start.'}
          </div>
        )}
      </section>

      {/* ===== 4. Task di oggi ===== */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2 className={`font-display text-lg font-semibold ${INK}`}>{t('todayTasksTitle')}</h2>
            <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${TEAL_TEXT}`}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              Google Tasks
            </span>
          </div>

          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className={`inline-flex items-center gap-1 text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 shrink-0 ${PRIMARY_TEXT}`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            {t('addTask')}
          </button>
        </div>

        {/* Aggiunta rapida */}
        {isAddingTask && (
          <form
            onSubmit={handleCreateTask}
            className={`flex gap-2 p-2.5 rounded-[22px] animate-in slide-in-from-top-2 duration-200 ${GLASS}`}
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('whatNeedToDo')}
              autoFocus
              className={`flex-1 min-w-0 h-11 px-4 text-sm rounded-full bg-white/70 dark:bg-white/[0.06] border border-[#E6E3F3] dark:border-white/10 placeholder:text-[#9A98A6] focus:outline-none focus:ring-2 focus:ring-[#6A49D8]/40 ${INK}`}
            />
            <button type="submit" className={`${BTN_PRIMARY} h-11 px-5 text-sm`}>
              {t('save')}
            </button>
          </form>
        )}

        {todayTasks.length > 0 ? (
          <div className={`rounded-[28px] px-4 ${GLASS}`}>
            {todayTasks.map((task) => {
              const isTask1 = task.id === 'task-1';
              const isTask2 = task.id === 'task-2';
              const isTask3 = task.id === 'task-3';

              const dueTime = isTask1 ? '11:00' : isTask2 ? '14:30' : '17:00';

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3.5 py-4 border-b border-[#ECEBF3] dark:border-white/10 last:border-b-0"
                >
                  {/* Cerchio di completamento */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-[#6A49D8] border-[#6A49D8] text-white dark:bg-[#A088F9] dark:border-[#A088F9] dark:text-[#14101F]'
                        : 'border-[#D8D8E0] dark:border-white/20 hover:border-[#6A49D8]'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[15px] font-medium leading-snug truncate ${
                        task.completed ? `line-through ${MUTED}` : INK
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className={`text-[13px] mt-0.5 truncate ${MUTED}`}>
                      {language === 'it' ? `Oggi, ${dueTime}` : `Today, ${dueTime}`}
                      {task.notes && <> · {task.notes.split('Sincronizzato da: ')[1] || task.notes}</>}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {task.completed || isTask3 ? (
                      <span className="inline-flex items-center h-8 px-3 rounded-full bg-[#EDEDF2] text-[#6D6D77] text-[13px] font-medium dark:bg-white/10 dark:text-[#ADACB5]">
                        {t('locale')}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTaskSyncClick(task)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#DBF2EF] text-[#0EBFA2] text-[13px] font-semibold transition-all hover:brightness-95 active:scale-95 cursor-pointer dark:bg-[#1F3B3A] dark:text-[#5DE6CF]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
                        <span>Sync</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-[28px] px-5 py-8 text-center ${GLASS}`}>
            <Inbox className="w-6 h-6 text-[#B8B6C6] mx-auto mb-2" strokeWidth={1.7} />
            <p className={`text-sm ${MUTED}`}>{t('noTasksToday')}</p>
          </div>
        )}
      </section>

      {/* ===== 5. Scanner IA dei task ===== */}
      <div className={`rounded-[28px] p-4 flex items-center justify-between gap-3 ${GLASS}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#E4DAF7] dark:bg-white/10 flex items-center justify-center shrink-0">
            <AILogo size="sm" />
          </div>
          <div className="min-w-0">
            <h3 className={`font-display text-[15px] font-semibold leading-tight ${INK}`}>{t('scan')}</h3>
            <p className={`text-[13px] truncate mt-0.5 ${MUTED}`}>{t('scanSub')}</p>
          </div>
        </div>

        <button
          onClick={analyzeTasksWithAi}
          disabled={isAnalyzingTasks}
          className={`${BTN_PRIMARY} h-10 px-4 text-sm shrink-0 disabled:opacity-50`}
        >
          {isAnalyzingTasks ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('scanning')}</span>
            </>
          ) : (
            <span>{language === 'it' ? 'Analizza' : 'Analyze'}</span>
          )}
        </button>
      </div>
    </div>
  );
};
