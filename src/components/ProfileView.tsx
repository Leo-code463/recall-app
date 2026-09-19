import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Mic,
  MessageSquare,
  Shield,
  CreditCard,
  Zap,
  ArrowRight,
  Settings,
  Sliders,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { AILogo } from './AILogo';

export const ProfileView: React.FC = () => {
  const {
    user,
    meetings,
    upcomingEvents,
    setPlan,
    setIsUpgradeModalOpen,
    setIsSettingsModalOpen,
    isDarkMode,
    toggleTheme,
    logout,
  } = useApp();

  const { language, t } = useLanguage();

  const totalMinutes = meetings.reduce((acc, m) => acc + Math.round(m.duration / 60), 0);
  const totalSummaries = meetings.filter((m) => m.summary).length;
  const totalCalendarDetected = meetings.reduce(
    (acc, m) => acc + (m.calendarEventsDetected ? m.calendarEventsDetected.length : 0),
    0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight">
          {t('profile')}
        </h1>
      </div>

      {/* User Card */}
      <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-[#272B30] flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] text-2xl font-bold flex items-center justify-center ring-2 ring-[#761EAF]/20 overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            user?.name?.charAt(0) || 'U'
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-white">
              {user?.name || 'Leonardo Fiorot'}
            </h2>
            <span
              className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                user?.plan === 'pro'
                  ? 'bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/20 dark:text-[#C084FC]'
                  : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {user?.plan === 'pro' ? t('proPlanBadge') : t('freePlanBadge')}
            </span>
          </div>

          <p className="text-xs text-gray-400 dark:text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
            <Mail className="w-3.5 h-3.5" />
            <span>{user?.email || 'leo@alea.pro'}</span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> {t('verifiedOtpLabel')}
            </span>
          </p>

          <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
            Google Workspace OAuth:{' '}
            <strong className="text-[#1A1A1A] dark:text-white">{t('oauthConnectedLabel')}</strong> (Google
            Calendar + Google Tasks)
          </p>
        </div>
      </div>

      {/* Statistiche di Utilizzo Reali */}
      <div>
        <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white mb-4">
          {t('usageStatsTitle')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[#272B30]">
            <div className="w-8 h-8 rounded-xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A1A1A] dark:text-white">
              {totalMinutes} min
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5 font-medium">
              {t('recordedAudioLabel')}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[#272B30]">
            <div className="w-8 h-8 rounded-xl bg-[#761EAF]/10 flex items-center justify-center mb-3">
              <AILogo size="sm" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A1A1A] dark:text-white">
              {totalSummaries}
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5 font-medium">
              {t('executiveAiSummariesLabel')}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[#272B30]">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A1A1A] dark:text-white">
              {totalCalendarDetected}
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5 font-medium">
              {t('detectedAiEventsLabel')}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[#272B30]">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A1A1A] dark:text-white">
              {user?.monthlyUsage.chatsUsed || 24}
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5 font-medium">
              {t('chatAiQuestionsLabel')}
            </p>
          </div>
        </div>
      </div>

      {/* Piani di Abbonamento (Free vs Pro) */}
      <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-[#272B30] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-white">
              {t('comparePlansTitle')}
            </h2>
            <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
              {t('comparePlansSubtitle')}
            </p>
          </div>

          {/* Quick Plan Switcher */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FB] dark:bg-[#272B30] p-1.5 rounded-2xl border border-gray-100 dark:border-transparent">
            <button
              onClick={() => setPlan('free')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                user?.plan === 'free'
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#1A1A1A] dark:text-white shadow-xs'
                  : 'text-gray-400 dark:text-neutral-400'
              }`}
            >
              {language === 'it' ? 'Piano Free' : 'Free Plan'}
            </button>
            <button
              onClick={() => setPlan('pro')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                user?.plan === 'pro'
                  ? 'bg-[#761EAF] text-white shadow-xs'
                  : 'text-gray-400 dark:text-neutral-400'
              }`}
            >
              {language === 'it' ? '✦ Piano PRO' : '✦ PRO Plan'}
            </button>
          </div>
        </div>

        {/* Two Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Piano Gratuito */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              user?.plan === 'free'
                ? 'border-[#761EAF] bg-[#761EAF]/5 dark:bg-[#761EAF]/10 ring-1 ring-[#761EAF]'
                : 'border-gray-100 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-[#1A1A1A] dark:text-white">
                {t('freePlanTitle')}
              </h3>
              <span className="text-base font-extrabold text-[#1A1A1A] dark:text-white">
                {t('freePlanPrice')}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mb-4 font-normal">
              {t('freePlanDesc')}
            </p>

            <ul className="space-y-2.5 text-xs text-gray-700 dark:text-neutral-200 mb-6 font-normal">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('freeBenefit1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('freeBenefit2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('freeBenefit3')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('freeBenefit4')}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300 dark:text-neutral-600 line-through">
                <span>{t('freeBenefit5')}</span>
              </li>
            </ul>

            {user?.plan !== 'free' && (
              <button
                onClick={() => setPlan('free')}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-xs font-bold text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
              >
                {t('switchToFreeBtn')}
              </button>
            )}
          </div>

          {/* Piano PRO */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              user?.plan === 'pro'
                ? 'border-[#761EAF] bg-[#761EAF]/5 dark:bg-[#761EAF]/10 ring-1 ring-[#761EAF]'
                : 'border-gray-100 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1A1A1A] dark:text-white">
                  {t('proPlanTitle')}
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#761EAF] text-white">
                  {language === 'it' ? 'CONSIGLIATO' : 'RECOMMENDED'}
                </span>
              </div>
              <span className="text-base font-extrabold text-[#1A1A1A] dark:text-white">
                {t('proPlanPrice')}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-neutral-400 mb-4 font-normal">
              {t('proPlanDesc')}
            </p>

            <ul className="space-y-2.5 text-xs text-gray-700 dark:text-neutral-200 mb-6 font-normal">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#761EAF] shrink-0" />
                <span>{t('proBenefit1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#761EAF] shrink-0" />
                <span>{t('proBenefit2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#761EAF] shrink-0" />
                <span>{t('proBenefit3')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#761EAF] shrink-0" />
                <span>{t('proBenefit4')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#761EAF] shrink-0" />
                <span>{t('proBenefit5')}</span>
              </li>
            </ul>

            {user?.plan !== 'pro' ? (
              <button
                onClick={() => setPlan('pro')}
                className="w-full py-2.5 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-sm shadow-[#761EAF]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{t('activateProBtn')}</span>
              </button>
            ) : (
              <div className="text-center text-xs font-bold text-[#761EAF] py-2">
                {t('activeProPlanLabel')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impostazioni dell'Applicazione & Preferenze */}
      <div className="bg-white dark:bg-[#1A1D1F] rounded-2xl p-4 shadow-xs border border-gray-100 dark:border-[#272B30] space-y-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            {t('settings')}
          </h2>
        </div>

        <div className="space-y-2">
          {/* Main Settings Modal Trigger - "fallo sottile con scritto solo impostazioni" */}
          <button
            id="profile-open-settings-btn"
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200/60 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] hover:bg-white dark:hover:bg-[#1A1D1F] text-xs font-bold text-[#1A1A1A] dark:text-white transition-all cursor-pointer text-left"
          >
            <span>{t('settings')}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Quick Theme Switcher */}
          <button
            id="profile-theme-toggle-btn"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200/60 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] hover:bg-white dark:hover:bg-[#1A1D1F] text-xs font-bold text-[#1A1A1A] dark:text-white transition-all cursor-pointer text-left"
          >
            <span>
              {t('themeLabel')}{' '}
              {isDarkMode
                ? language === 'it'
                  ? 'Scuro'
                  : 'Dark'
                : language === 'it'
                ? 'Chiaro'
                : 'Light'}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">{t('changeThemeTooltip')}</span>
          </button>
        </div>

        {/* Account Logout Option */}
        <div className="pt-2 border-t border-gray-100 dark:border-[#272B30] flex items-center justify-between text-[11px]">
          <span className="text-gray-400 dark:text-neutral-500">
            {t('accessEmailLabel')} {user?.email}
          </span>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>{t('disconnectBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
