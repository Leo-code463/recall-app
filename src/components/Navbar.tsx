import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  LogOut,
} from 'lucide-react';
import { AILogo } from './AILogo';

export const Navbar: React.FC = () => {
  const {
    user,
    setIsUpgradeModalOpen,
    setActiveTab,
    setActiveMeetingId,
    setIsSettingsModalOpen,
    logout,
  } = useApp();

  const { t } = useLanguage();

  const handleOpenSearch = () => {
    setActiveMeetingId(null);
    setIsSettingsModalOpen(false);
    setActiveTab('search');
  };

  const handleOpenProfile = () => {
    setActiveMeetingId(null);
    setIsSettingsModalOpen(false);
    setActiveTab('profile');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1A1D1F]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-10 h-16 sm:h-18 flex items-center justify-between">
        {/* Logo & Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              setActiveMeetingId(null);
              setIsSettingsModalOpen(false);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
          >
            <AILogo size="md" className="sm:scale-110" />
          </button>
          <div className="flex items-center gap-2">
            <span
              onClick={() => setIsUpgradeModalOpen(true)}
              className={`cursor-pointer text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
                user?.plan === 'pro'
                  ? 'bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/25 dark:text-[#C084FC]'
                  : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {user?.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>

        {/* Action Controls: Search Icon & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Conversations Button */}
          <button
            id="navbar-search-btn"
            onClick={handleOpenSearch}
            title={t('searchConversations')}
            className="p-2 sm:p-2.5 rounded-2xl text-gray-600 dark:text-neutral-300 hover:text-[#761EAF] dark:hover:text-[#C084FC] hover:bg-[#761EAF]/10 dark:hover:bg-[#761EAF]/20 border border-gray-200/80 dark:border-white/10 transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Search className="w-4.5 h-4.5" />
            <span className="hidden sm:inline text-xs font-semibold text-gray-500 dark:text-neutral-400">
              {t('search')}
            </span>
          </button>

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-gray-200 dark:border-[#272B30]">
              <button
                id="navbar-profile-btn"
                onClick={handleOpenProfile}
                title={t('viewProfileAndSettings')}
                className="flex items-center gap-2 rounded-2xl p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] font-bold text-xs flex items-center justify-center uppercase ring-2 ring-gray-100 dark:ring-[#272B30] shadow-xs overflow-hidden">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <div className="hidden lg:block text-left font-['Inter'] font-sans">
                  <p className="text-xs font-bold text-[#1A1A1A] dark:text-white leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-400 truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
              </button>
              <button
                id="navbar-logout-btn"
                onClick={logout}
                title={t('logoutTooltip')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
