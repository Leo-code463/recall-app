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
import { NavTab } from './types';

/** Contenitore comune: sfondo sfumato "glass" fisso dietro a ogni schermata. */
const GlassShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ds min-h-screen text-[#16161E] dark:text-[#FCFCFC] transition-colors flex flex-col font-['Inter',sans-serif] overflow-x-clip">
    <div aria-hidden className="glass-bg pointer-events-none fixed inset-0 -z-10" />
    {children}
  </div>
);

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
      return (
        <GlassShell>
          <WelcomeView onStart={() => setShowWelcome(false)} />
        </GlassShell>
      );
    }
    return (
      <GlassShell>
        <AuthModal />
        <OtpModal />
      </GlassShell>
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
    <GlassShell>
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-10 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
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
    </GlassShell>
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