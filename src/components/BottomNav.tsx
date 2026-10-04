import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTab } from '../types';
import { Home, Search, Calendar, User, Mic, Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/haptic';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setActiveMeetingId, setIsRecordingModalOpen, setIsAddFriendModalOpen, setIsSettingsModalOpen } = useApp();
  const { t } = useLanguage();

  const handleTabChange = (tab: NavTab) => {
    setActiveMeetingId(null);
    setIsSettingsModalOpen(false);
    setActiveTab(tab);
  };

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'search', label: t('search'), icon: Search },
    { id: 'agenda', label: t('agenda'), icon: Calendar },
    { id: 'addFriend', label: t('add'), icon: Plus },
  ];

  const handleClick = (itemId: string) => {
    triggerHaptic(10);
    if (itemId === 'addFriend') {
      setIsAddFriendModalOpen(true);
    } else {
      handleTabChange(itemId as NavTab);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Sfumatura in stile Spotify che si fonde con lo sfondo della pagina */}
      <div className="absolute inset-0 h-32 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB]/95 to-transparent dark:from-[#111315] dark:via-[#111315]/95 pointer-events-none" />

      <div className="relative pointer-events-auto flex items-center justify-between max-w-sm mx-auto px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">

        {/* Left tabs: Home & Cerca */}
        <div className="flex items-center justify-around w-2/5">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}-btn`}
                onClick={() => handleClick(item.id)}
                className={`group flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#761EAF] dark:text-[#C084FC]'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[9px] font-extrabold mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Floating Record Action Button */}
        <div className="flex flex-col items-center -mt-6">
          <button
            id="bottom-nav-record-btn"
            onClick={() => {
              triggerHaptic(20);
              setIsRecordingModalOpen(true);
            }}
            aria-label="Registra nuova riunione"
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#6B1D9F] via-[#7B22BC] to-[#9C44D4] hover:from-[#761EAF] hover:to-[#BC6EEB] text-white flex items-center justify-center shadow-lg shadow-[#761EAF]/30 hover:shadow-xl hover:shadow-[#761EAF]/40 active:scale-95 transition-all duration-200 border-[3px] border-[#F8F9FB] dark:border-[#111315] cursor-pointer"
          >
            <Mic className="w-5 h-5 animate-pulse" />
          </button>
        </div>

        {/* Right tabs: Agenda & Aggiungi */}
        <div className="flex items-center justify-around w-2/5">
          {navItems.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const isActive = item.id !== 'addFriend' && activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}-btn`}
                onClick={() => handleClick(item.id)}
                className={`group flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#761EAF] dark:text-[#C084FC]'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[9px] font-extrabold mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};