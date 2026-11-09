import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { hapticTap } from '../utils/haptic';
import {
  Plus,
  RefreshCw,
  Inbox,
  Sparkles,
  Bell,
  Check,
  ChevronRight,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Mic,
  RotateCw,
} from 'lucide-react';
import { AILogo } from './AILogo';

const getGreeting = (lang: string): string => {
  const hour = new Date().getHours();
  const isIt = lang === 'it';

  if (hour >= 5 && hour < 12) return isIt ? 'Buongiorno' : 'Good morning';
  if (hour >= 12 && hour < 18) return isIt ? 'Buon pomeriggio' : 'Good afternoon';
  if (hour >= 18 && hour < 22) return isIt ? 'Buonasera' : 'Good evening';
  return isIt ? 'Buonanotte' : 'Good night';
};

export const DashboardView: React.FC = () => {
  const {
    user,
    todayTasks,
    meetings,
    isAnalyzingTasks,
    analyzeTasksWithAi,
    toggleTask,
    addTask,
    setIsSettingsModalOpen,
    setActiveTab,
    setActiveMeetingId,
    friendsReceivedPending,
    setShowFriendsSetting,
    setIsRecordingModalOpen,
  } = useApp();

  const { language, t } = useLanguage();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [greetingText, setGreetingText] = useState(() => getGreeting(language));

  useEffect(() => {
    setGreetingText(getGreeting(language));
    const interval = setInterval(() => {
      setGreetingText(getGreeting(language));
    }, 60000);

    return () => clearInterval(interval);
  }, [language]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    await addTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Leonardo';

  const GLASS =
    'bg-white/75 backdrop-blur-xl border border-white/70 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:bg-white/[0.06] dark:border-white/10 dark:shadow-none';
  const INK = 'text-[#16161E] dark:text-white';
  const MUTED = 'text-[#6D6D77] dark:text-[#ADACB5]';
  const PRIMARY_TEXT = 'text-[#6A49D8] dark:text-[#B29FFF]';
  const BTN_PRIMARY =
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-[#6A49D8] text-white font-semibold shadow-[0_6px_18px_-6px_rgba(106,73,216,0.55)] transition-all hover:bg-[#5B3CC4] active:scale-95 cursor-pointer dark:bg-[#A088F9] dark:text-[#14101F] dark:hover:bg-[#B29FFF] dark:shadow-none';
  const TEAL_TEXT = 'text-[#0EBFA2] dark:text-[#5DE6CF]';

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
      {/* 1. Header sticky riposizionata in alto */}
      <div
        className={`sticky top-0 z-50 -mx-3 sm:mx-0 px-3 sm:px-0 -mt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:-mt-[calc(1.5rem+env(safe-area-inset-top,0px))] pt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between gap-3 transition-all duration-200 header-blur ${
          scrolled ? 'is-scrolled' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AILogo size="sm" />
          <span className="font-extrabold text-lg tracking-tight text-[#16161E] dark:text-white">
            Recap
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="dashboard-notifications-btn"
            onClick={() => {
              hapticTap('light');
              setIsSettingsModalOpen(true);
              setShowFriendsSetting(true);
            }}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${GLASS}`}
            title={t('viewNotificationsAndFriends')}
            aria-label={t('viewNotificationsAndFriends')}
          >
            <Bell className={`w-4.5 h-4.5 ${INK}`} strokeWidth={1.9} />
            {friendsReceivedPending.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#F43F6E] border-2 border-white dark:border-[#1B1926] rounded-full" />
            )}
          </button>

          <button
            id="dashboard-profile-btn"
            onClick={() => {
              hapticTap('light');
              setActiveTab('profile');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden active:scale-95 transition-transform cursor-pointer ${GLASS}`}
            title={t('viewProfileAndSettings')}
            aria-label={t('viewProfileAndSettings')}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={`text-xs font-semibold ${PRIMARY_TEXT}`}>
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

      {/* 2. Banner Viola Hero con Glassmorphism */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#6A49D8] via-[#5E37D3] to-[#4922B4] p-6 sm:p-7 text-white shadow-xl shadow-[#6A49D8]/20 transition-all">
        {/* Glow ed elementi decorativi di sfondo */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#B29FFF]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Sezione Saluto e Azioni Generali */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                {greetingText}, {userName}! 👋
              </h1>
              <p className="text-xs sm:text-sm font-medium text-white/80">
                {language === 'it'
                  ? `Hai ${meetings.length} riunioni e ${todayTasks.length} task in programma.`
                  : `You have ${meetings.length} meetings and ${todayTasks.length} tasks scheduled.`}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => hapticTap('light')}
                title="Sincronizza"
                className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticTap('medium');
                  setIsRecordingModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-white/95 text-[#6A49D8] text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#6A49D8]" />
                <span>{language === 'it' ? 'Nuova Registrazione' : 'New Recording'}</span>
              </button>
            </div>
          </div>

          {/* Card Interna Glassmorphism: Prossima Riunione Sincronizzata */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-white border border-white/15">
                  <Calendar className="w-3 h-3" />
                  {language === 'it' ? 'PROSSIMA RIUNIONE' : 'NEXT MEETING'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-[10px] font-bold border border-emerald-400/20">
                  <Video className="w-3 h-3" />
                  Google Meet
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Riunione Sistema Solare
                </h3>
                <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-white/70" />
                  <span>16:30 – 17:30</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://meet.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white text-xs font-bold transition-all active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'it' ? 'Apri Meet' : 'Open Meet'}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  hapticTap('medium');
                  setIsRecordingModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-white/95 text-[#6A49D8] text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-[#6A49D8]" />
                <span>{language === 'it' ? 'Registra' : 'Record'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Discussioni recenti */}
      <section>
        <div className="flex items-center justify-between py-2">
          <h2 className={`font-display text-lg font-semibold ${INK}`}>{t('recentDiscussions')}</h2>
          <button
            onClick={() => setActiveTab('search')}
            className={`text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 py-1 pl-3 ${PRIMARY_TEXT}`}
          >
            {t('viewAll')}
          </button>
        </div>

        {meetings.length > 0 ? (
          <div className="no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 mt-1 flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-px-3 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <div className={`mt-1 rounded-[28px] px-5 py-8 text-center text-sm ${GLASS} ${MUTED}`}>
            {language === 'it'
              ? 'Nessuna discussione registrata. Tocca il microfono per iniziare.'
              : 'No recordings yet. Tap the microphone to start.'}
          </div>
        )}
      </section>

      {/* 4. Task di oggi */}
      <section>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2 className={`font-display text-lg font-semibold ${INK}`}>{t('todayTasksTitle')}</h2>
            <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${TEAL_TEXT}`}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              Google Tasks
            </span>
          </div>

          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className={`inline-flex items-center gap-1 text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 shrink-0 py-1 pl-3 ${PRIMARY_TEXT}`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            {t('addTask')}
          </button>
        </div>

        {isAddingTask && (
          <form
            onSubmit={handleCreateTask}
            className={`mt-1 mb-3.5 flex gap-2 p-2.5 rounded-[22px] animate-in slide-in-from-top-2 duration-200 ${GLASS}`}
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
          <div className={`mt-1 rounded-[28px] px-4 ${GLASS}`}>
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3.5 py-4 border-b border-[#ECEBF3] dark:border-white/10 last:border-b-0"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="-m-2.5 p-2.5 shrink-0 cursor-pointer"
                  aria-label={task.title}
                >
                  <span
                    className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-[#6A49D8] border-[#6A49D8] text-white dark:bg-[#A088F9] dark:border-[#A088F9] dark:text-[#14101F]'
                        : 'border-[#D8D8E0] dark:border-white/20'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[15px] font-medium leading-snug truncate ${
                      task.completed ? `line-through ${MUTED}` : INK
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`mt-1 rounded-[28px] px-5 py-8 text-center ${GLASS}`}>
            <Inbox className="w-6 h-6 text-[#B8B6C6] mx-auto mb-2" strokeWidth={1.7} />
            <p className={`text-sm ${MUTED}`}>{t('noTasksToday')}</p>
          </div>
        )}
      </section>

      {/* 5. Scanner IA */}
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