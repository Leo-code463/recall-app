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
    triggerHaptic(10); // Subtle feedback
    if (itemId === 'addFriend') {
      setIsAddFriendModalOpen(true);
    } else {
      handleTabChange(itemId as NavTab);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-3 sm:px-6 pb-2 sm:pb-5">
      {/* Liquid Glass Capsule Bar */}
      <div className="pointer-events-auto relative w-full max-w-sm bg-white/70 dark:bg-[#1A1D1F]/75 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 dark:border-white/10 shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_3px_12px_rgba(118,30,175,0.06)] dark:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4),0_3px_15px_rgba(118,30,175,0.15)] rounded-2xl sm:rounded-full px-2 sm:px-4 h-13 sm:h-14 flex items-center justify-between transition-all duration-300">
        
        {/* Subtle Top Specular Highlight for Liquid Glass Feel */}
        <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent rounded-full pointer-events-none" />

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
                className={`group flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#761EAF] dark:text-[#C084FC] bg-[#761EAF]/10 dark:bg-[#761EAF]/20 shadow-inner'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[9px] font-extrabold mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Floating Record Action Button */}
        <div className="absolute left-1/2 -top-4 sm:-top-[18px] -translate-x-1/2 flex flex-col items-center">
          <button
            id="bottom-nav-record-btn"
            onClick={() => {
              triggerHaptic(20); // Stronger haptic for macro action
              setIsRecordingModalOpen(true);
            }}
            aria-label="Registra nuova riunione"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#6B1D9F] via-[#7B22BC] to-[#9C44D4] hover:from-[#761EAF] hover:to-[#BC6EEB] text-white flex items-center justify-center shadow-md shadow-[#761EAF]/30 hover:shadow-lg hover:shadow-[#761EAF]/40 active:scale-95 transition-all duration-200 border-[2.5px] sm:border-3 border-white dark:border-[#1A1D1F] ring-1 ring-[#761EAF]/20 cursor-pointer"
          >
            <Mic className="w-4.5 h-4.5 animate-pulse" />
          </button>
        </div>

        {/* Right tabs: Agenda & Profilo (now Add Friend "+") */}
        <div className="flex items-center justify-around w-2/5">
          {navItems.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const isActive = item.id !== 'addFriend' && activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}-btn`}
                onClick={() => handleClick(item.id)}
                className={`group flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#761EAF] dark:text-[#C084FC] bg-[#761EAF]/10 dark:bg-[#761EAF]/20 shadow-inner'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="text-[9px] font-extrabold mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
