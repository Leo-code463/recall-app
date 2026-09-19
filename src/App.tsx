import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { OtpModal } from './components/OtpModal';
import { WelcomeView } from './components/WelcomeView';
import { DashboardView } from './components/DashboardView';
import { MeetingDetailView } from './components/MeetingDetailView';
import { AgendaView } from './components/AgendaView';
import { SearchView } from './components/SearchView';
import { ProfileView } from './components/ProfileView';
import { RecordingModal } from './components/RecordingModal';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { SuccessBadge } from './components/SuccessBadge';
import { CalendarPreviewModal } from './components/CalendarPreviewModal';
import { AddFriendModal } from './components/AddFriendModal';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from './utils/haptic';
import { NavTab } from './types';

const AppContent: React.FC = () => {
  const { isLoggedIn, activeTab, setActiveTab, activeMeetingId, successAnimation, isSettingsModalOpen, calendarPreviewData } = useApp();
  const [showWelcome, setShowWelcome] = useState(true);

  // Reset showWelcome to true if user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setShowWelcome(true);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    if (showWelcome) {
      return <WelcomeView onStart={() => setShowWelcome(false)} />;
    }
    return (
      <>
        <AuthModal />
        <OtpModal />
      </>
    );
  }

  // Determine the content based on active state
  const renderActiveView = () => {
    if (activeMeetingId) {
      return <MeetingDetailView key={`meeting-${activeMeetingId}`} meetingId={activeMeetingId} />;
    }
    if (isSettingsModalOpen) {
      return <SettingsModal key="settings" />;
    }
    switch (activeTab) {
      case 'home':
        return <DashboardView key="home" />;
      case 'search':
        return <SearchView key="search" />;
      case 'agenda':
        return <AgendaView key="agenda" />;
      default:
        return <ProfileView key="profile" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-[#FCFCFC] transition-colors flex flex-col font-['Inter',sans-serif] overflow-x-hidden">
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-10 pt-3.5 sm:pt-6 pb-28 sm:pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMeetingId ? `meeting-${activeMeetingId}` : isSettingsModalOpen ? 'settings' : activeTab}
            initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile/Desktop Bottom Navigation */}
      <BottomNav />

      {/* Modals & Dialogs */}
      <RecordingModal />
      <UpgradeModal />
      <OtpModal />
      {calendarPreviewData && <CalendarPreviewModal />}
      <AddFriendModal />

      {/* Global Success Overlay Badge */}
      <SuccessBadge isVisible={successAnimation.isVisible} message={successAnimation.message} />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </LanguageProvider>
  );
}

