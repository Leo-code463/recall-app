import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptic';
import {
  Mic,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Plus,
  RefreshCw,
  Inbox,
  AlertCircle,
  Settings,
  ArrowRight,
  Sparkles,
  User,
  Bell,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto pb-16">
      
      {/* 1. Welcome Greeting Area matching video exactly */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-0.5">
          <span className="font-['Inter'] font-sans main-greeting-bold text-[11px] text-gray-400 dark:text-neutral-500 tracking-normal uppercase">
            {t('goodMorning')}
          </span>
          <h1 className="font-['Inter'] font-sans main-greeting-bold text-[21px] tracking-tight text-[#1A1A1A] dark:text-white leading-none">
            {user?.name || 'Leonardo Fiorot'}
          </h1>
        </div>
        
        {/* Profile page action and Notifications Bell buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell Button */}
          <button
            id="dashboard-notifications-btn"
            onClick={() => {
              setIsSettingsModalOpen(true);
              setShowFriendsSetting(true);
            }}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#1A1D1F] border border-gray-200/50 dark:border-[#272B30] flex items-center justify-center shadow-3xs hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
            title={t('viewNotificationsAndFriends')}
          >
            <Bell className="w-4.5 h-4.5 text-gray-600 dark:text-neutral-300" />
            {friendsReceivedPending.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 border border-white dark:border-[#1A1D1F] rounded-full animate-pulse" />
            )}
          </button>

          {/* Profile Button */}
          <button
            id="dashboard-profile-btn"
            onClick={() => setActiveTab('profile')}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#1A1D1F] border border-gray-200/50 dark:border-[#272B30] flex items-center justify-center shadow-3xs hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
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
              <User className="w-4.5 h-4.5 text-gray-600 dark:text-neutral-300" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Standalone "Prossima riunione" capsule card styled exactly like the video */}
      {nextMeeting && (
        <div className="bg-[#761EAF]/15 dark:bg-[#761EAF]/10 rounded-[22px] p-4 flex items-center justify-between gap-3.5 border border-transparent transition-all shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Rounded Circle Icon Wrapper */}
            <div className="w-11 h-11 rounded-full bg-[#761EAF]/25 dark:bg-[#761EAF]/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#761EAF] dark:text-[#C084FC]" />
            </div>
            
            {/* Text Content */}
            <div className="min-w-0 space-y-0.5">
              <div className="text-[10.5px] font-black text-[#761EAF] dark:text-[#C084FC] flex items-center gap-1.5 tracking-tight uppercase">
                <span className="text-[8.5px] font-bold">{t('nextMeeting')}</span>
                <span>•</span>
                <span className="normal-case font-bold">{getRelativeTimeString(nextMeeting.start)}</span>
              </div>
              <h3 className="text-[14px] sm:text-[15px] font-black text-[#1A1A1A] dark:text-white truncate leading-tight">
                {nextMeeting.title}
              </h3>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            {nextMeeting.meetUrl ? (
              <a
                href={nextMeeting.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4.5 py-1.5 bg-[#761EAF] hover:bg-[#681898] text-white text-[11px] font-black rounded-full shadow-3xs hover:scale-[1.03] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer"
              >
                {t('join')}
              </a>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setIsRecordingModalOpen(true);
                }}
                className="px-4.5 py-1.5 bg-[#761EAF] hover:bg-[#681898] text-white text-[11px] font-black rounded-full shadow-3xs hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
              >
                {t('record')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. DISCUSSIONS RECENTI - Horizontal scrolling list matching video perfectly */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
            {t('recentDiscussions')}
          </h2>
          <button
            onClick={() => {
              triggerHaptic(12);
              setActiveTab('search');
            }}
            className="text-[#761EAF] hover:text-[#681898] dark:text-[#C084FC] dark:hover:text-[#C084FC] text-[11px] font-black cursor-pointer transition-colors"
          >
            {t('viewAll')}
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {meetings.map((meet) => (
            <div
              key={meet.id}
              onClick={() => {
                triggerHaptic(15);
                setActiveMeetingId(meet.id);
              }}
              className="snap-start shrink-0 w-[235px] bg-white dark:bg-[#1A1D1F] p-4 rounded-[22px] border border-gray-100 dark:border-[#272B30] hover:border-[#761EAF]/40 dark:hover:border-[#761EAF]/40 shadow-3xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between h-[155px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {/* Soft round icon */}
                  <div className="w-8 h-8 rounded-full bg-[#761EAF]/10 dark:bg-[#761EAF]/20 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-[#761EAF] dark:text-[#C084FC]" />
                  </div>
                  {/* Date marker */}
                  <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500">
                    {meet.id === 'product-sync-q3' 
                      ? (language === 'it' ? 'Oggi, 09:30' : 'Today, 09:30') 
                      : (language === 'it' ? 'Ieri, 16:00' : 'Yesterday, 16:00')}
                  </span>
                </div>

                <h3 className="text-xs font-black text-[#1A1A1A] dark:text-white line-clamp-2 leading-snug">
                  {meet.title}
                </h3>

                {/* Sub tags */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {meet.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] text-gray-500 dark:text-neutral-400 uppercase tracking-tight"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Speakers Overlap */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {meet.speakers.map((spk, idx) => (
                    <div
                      key={idx}
                      title={spk.name}
                      className="w-5.5 h-5.5 rounded-full border-1.5 border-white dark:border-[#111315] bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] text-[8px] font-black flex items-center justify-center font-mono uppercase"
                    >
                      {spk.name === 'Me' ? 'ME' : spk.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  ))}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-neutral-600" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TASK DI OGGI & COMPITI - Vertical stack with Google integration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
              {t('todayTasksTitle')}
            </h2>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-[#C084FC] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Google Tasks</span>
            </span>
          </div>

          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="text-xs font-black text-[#761EAF] hover:text-[#681898] cursor-pointer flex items-center gap-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px]">{t('addTask')}</span>
          </button>
        </div>

        {/* Quick Add Form inline */}
        {isAddingTask && (
          <form onSubmit={handleCreateTask} className="flex gap-2 p-2 bg-white dark:bg-[#1A1D1F] rounded-2xl border border-gray-100 dark:border-[#272B30] animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('whatNeedToDo')}
              autoFocus
              className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#761EAF]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#761EAF] text-white text-xs font-extrabold rounded-xl hover:bg-[#681898] cursor-pointer"
            >
              {t('save')}
            </button>
          </form>
        )}

        {/* Action Items List */}
        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            {todayTasks.map((task, idx) => {
              const isTask1 = task.id === 'task-1';
              const isTask2 = task.id === 'task-2';
              const isTask3 = task.id === 'task-3';
              
              const dueTime = isTask1 ? '11:00' : isTask2 ? '14:30' : '17:00';
              
              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-[22px] border transition-all flex items-center justify-between gap-3.5 ${
                    task.completed
                      ? 'bg-gray-50/60 dark:bg-neutral-900/10 border-transparent opacity-60'
                      : 'bg-white dark:bg-[#1A1D1F] border-gray-100 dark:border-[#272B30] hover:border-[#761EAF]/30 shadow-3xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox circle trigger */}
                    <button
                      onClick={() => {
                        triggerHaptic(10);
                        toggleTask(task.id);
                      }}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-200 dark:border-neutral-700 hover:border-[#761EAF]'
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <p
                        className={`text-xs font-bold leading-normal truncate ${
                          task.completed
                            ? 'line-through text-gray-400 dark:text-neutral-500'
                            : 'text-[#1A1A1A] dark:text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-neutral-500">
                        <span>{language === 'it' ? `Oggi, ${dueTime}` : `Today, ${dueTime}`}</span>
                        {task.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate">{task.notes.split('Sincronizzato da: ')[1] || task.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sync Button Action on the right */}
                  <div className="shrink-0">
                    {task.completed || isTask3 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tight border border-emerald-100 dark:border-emerald-900/30">
                        {t('locale')}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          triggerHaptic(15);
                          handleTaskSyncClick(task);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10.5px] font-black rounded-full shadow-3xs transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                      >
                        <RefreshCw className="w-3 h-3 animate-[spin_4s_linear_infinite]" />
                        <span>Sync</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-[22px] bg-white dark:bg-[#1A1D1F] border border-dashed border-gray-200 dark:border-[#272B30]">
            <Inbox className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-400 dark:text-neutral-500">
              {t('noTasksToday')}
            </p>
          </div>
        )}
      </div>

      {/* 5. Smart AI Scanner Widget (Elegant and clean footer capsule) */}
      <div className="bg-white dark:bg-[#1A1D1F] p-4 rounded-[22px] border border-gray-100 dark:border-[#272B30] shadow-3xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <AILogo size="sm" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black text-[#1A1A1A] dark:text-white leading-tight">
              {t('scan')}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-neutral-500 font-medium truncate">
              {t('scanSub')}
            </p>
          </div>
        </div>

        <button
          onClick={analyzeTasksWithAi}
          disabled={isAnalyzingTasks}
          className="px-3.5 py-1.5 bg-[#761EAF] hover:bg-[#681898] disabled:bg-neutral-200 text-white text-[10.5px] font-black rounded-full shadow-3xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          {isAnalyzingTasks ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{t('scanning')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'it' ? 'Analizza' : 'Analyze'}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
