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
        className="flex h-full items-center justify-center cursor-pointer active:opacity-60"
      >
        {/* Capsula evidenziata dietro la tab attiva, come in iOS 26 */}
        <span
          className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors ${
            isActive
              ? 'bg-[color:var(--fill)] text-[color:var(--accent)]'
              : 'text-[color:var(--label-2)]'
          }`}
        >
          <Icon className="h-[23px] w-[23px]" strokeWidth={isActive ? 2.2 : 1.7} />
          <span className="leading-none">{label}</span>
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigazione principale"
      className="ds fixed inset-x-0 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] z-40 px-4 pointer-events-none"
    >
      {/* Barra flottante a capsula in Liquid Glass */}
      <div className="liquid pointer-events-auto mx-auto grid h-[64px] max-w-sm grid-cols-5 items-stretch gap-0.5 rounded-full p-1.5">
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
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--accent)] text-white transition-transform active:scale-90 cursor-pointer"
          >
            <Mic className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {renderItem('agenda', t('agenda'), Calendar)}
        {renderItem('addFriend', t('add'), Plus)}
      </div>
    </nav>
  );
};
