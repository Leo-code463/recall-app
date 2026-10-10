import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTab } from '../types';
import { Home, Search, Calendar, Plus, Mic, type LucideIcon } from 'lucide-react';
import { hapticTap } from '../utils/haptic';

type NavItemId = 'home' | 'search' | 'agenda' | 'addFriend';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setActiveMeetingId,
    setIsRecordingModalOpen,
    setIsAddFriendModalOpen,
    setIsSettingsModalOpen,
  } = useApp();
  const { t } = useLanguage();

  const handleTabChange = (tab: NavTab) => {
    setActiveMeetingId(null);
    setIsSettingsModalOpen(false);
    setActiveTab(tab);
  };

  const handleClick = (itemId: NavItemId) => {
    hapticTap('light');
    if (itemId === 'addFriend') {
      setIsAddFriendModalOpen(true);
    } else {
      handleTabChange(itemId);
    }
  };

  const renderItem = (id: NavItemId, label: string, Icon: LucideIcon) => {
    const isActive = id !== 'addFriend' && activeTab === id;
    return (
      <button
        key={id}
        id={`bottom-nav-${id}-btn`}
        type="button"
        onClick={() => handleClick(id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex h-full flex-col items-center justify-center gap-[3px] text-[10px] font-medium transition-colors cursor-pointer active:opacity-70 ${
          isActive
            ? 'text-[#6A49D8] dark:text-[#A088F9]'
            : 'text-[#6F6D75] hover:text-[#16161E] dark:text-[#A3A1AD] dark:hover:text-white'
        }`}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.3 : 1.8} />
        <span className="leading-none">{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigazione principale"
      className="ds fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0F0D18]/90"
    >
      {/* Barra compatta a tutta larghezza (stile Spotify): 5 colonne uguali, microfono al centro */}
      <div className="mx-auto grid h-14 max-w-md grid-cols-5 items-stretch">
        {renderItem('home', t('home'), Home)}
        {renderItem('search', t('search'), Search)}

        <div className="flex items-center justify-center">
          <button
            id="bottom-nav-record-btn"
            type="button"
            onClick={() => {
              hapticTap('medium');
              setIsRecordingModalOpen(true);
            }}
            aria-label="Registra nuova riunione"
            className="-translate-y-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#6A49D8] text-white shadow-[0_6px_16px_-4px_rgba(106,73,216,0.55)] transition-transform active:scale-95 hover:bg-[#5B3CC4] cursor-pointer dark:bg-[#A088F9] dark:text-[#14101F] dark:shadow-[0_6px_16px_-4px_rgba(160,136,249,0.4)] dark:hover:bg-[#B29FFF]"
          >
            <Mic className="h-5 w-5" strokeWidth={2.1} />
          </button>
        </div>

        {renderItem('agenda', t('agenda'), Calendar)}
        {renderItem('addFriend', t('add'), Plus)}
      </div>
    </nav>
  );
};
