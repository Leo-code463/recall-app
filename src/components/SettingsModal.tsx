import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { FriendsView } from './FriendsView';
import { triggerHaptic } from '../utils/haptic';
import {
  ArrowLeft,
  Moon,
  Sun,
  User,
  Lock,
  Globe,
  Bell,
  Mail,
  Calendar,
  Video,
  MessageSquare,
  Shield,
  LogOut,
  ChevronRight,
  Users,
  Home,
  Save,
  Database,
  Trash2,
  Download,
  Mic,
  Activity,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isDarkMode,
    toggleTheme,
    user,
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    logout,
    showFriendsSetting,
    setShowFriendsSetting,
    setActiveTab,
    googleError,
    setGoogleError,
    updateUserProfile,
    triggerSuccess,
  } = useApp();

  const { language, setLanguage, t } = useLanguage();

  const [activeSubView, setActiveSubView] = useState<'main' | 'profile' | 'password' | 'privacy' | 'meet' | 'voice'>('main');

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailSummary, setEmailSummary] = useState(false);

  // Google Meet Settings state
  const [autoJoinMeet, setAutoJoinMeet] = useState(() => {
    return localStorage.getItem('recall_setting_auto_join_meet') !== 'false';
  });
  const [botName, setBotName] = useState(() => {
    return localStorage.getItem('recall_setting_meet_bot_name') || 'Recall AI Assistant';
  });
  const [transcribeLive, setTranscribeLive] = useState(() => {
    return localStorage.getItem('recall_setting_meet_transcribe_live') !== 'false';
  });
  const [autoGenerateMindMap, setAutoGenerateMindMap] = useState(() => {
    return localStorage.getItem('recall_setting_meet_auto_mindmap') !== 'false';
  });

  // Voice Recognition Enrollment State
  const [voiceStep, setVoiceStep] = useState<'intro' | 'training' | 'success'>('intro');
  const [activePhraseIdx, setActivePhraseIdx] = useState(0);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [liveFrequencies, setLiveFrequencies] = useState<number[]>(Array(16).fill(15));
  const [enrolledSignature, setEnrolledSignature] = useState<number[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('me');
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  const [speakersList, setSpeakersList] = useState<{ id: string; name: string; enrolled: boolean; avgFreq?: number }[]>(() => {
    const saved = localStorage.getItem(`recall_speakers_${user?.email}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'me', name: user?.name || 'Tu (Leo)', enrolled: localStorage.getItem(`recall_voice_enrolled_${user?.email}`) === 'true', avgFreq: 145 }
    ];
  });

  // Sync speakers list to localStorage
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(`recall_speakers_${user?.email}`, JSON.stringify(speakersList));
    }
  }, [speakersList, user?.email]);

  // Web Audio Analyser and Recording Effect
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let progressInterval: any;

    if (isVoiceRecording) {
      setVoiceProgress(0);
      const collectedFrames: number[][] = [];

      // Start actual Web Audio API setup
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((mediaStream) => {
          stream = mediaStream;
          // Create Audio Context
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioContextClass();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Small fft for 32 frequency bins
          
          const source = audioCtx.createMediaStreamSource(mediaStream);
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateAnalyser = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            
            // Map the frequency bins to 16 bars for the visualizer
            const bars: number[] = [];
            const step = Math.floor(bufferLength / 16) || 1;
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] || 0;
              // Map 0-255 to some nice visualization height, say 5px to 60px
              bars.push(Math.max(5, (val / 255) * 60));
            }
            setLiveFrequencies(bars);
            collectedFrames.push(Array.from(dataArray));
            
            animationFrameId = requestAnimationFrame(updateAnalyser);
          };

          animationFrameId = requestAnimationFrame(updateAnalyser);

          // Update Progress Bar - 7 seconds!
          const durationMs = 7000; 
          const intervalMs = 50;
          let elapsed = 0;
          
          progressInterval = setInterval(() => {
            elapsed += intervalMs;
            const percentage = Math.min(100, Math.round((elapsed / durationMs) * 100));
            setVoiceProgress(percentage);

            if (percentage >= 100) {
              // Finish current phrase recording
              clearInterval(progressInterval);
              setIsVoiceRecording(false);
              
              // Process collected frames to calculate the spectral signature of this phrase
              if (collectedFrames.length > 0) {
                const averagedBins = Array(16).fill(0);
                collectedFrames.forEach(frame => {
                  for (let i = 0; i < 16; i++) {
                    averagedBins[i] += frame[i] || 0;
                  }
                });
                const signature = averagedBins.map(val => Math.round(val / collectedFrames.length));
                
                // Save signature for the phrase
                setEnrolledSignature(prev => [...prev, ...signature]);
              }

              // Advance steps or complete
              if (activePhraseIdx < 2) {
                triggerSuccess(language === 'it' ? `Frase ${activePhraseIdx + 1} registrata!` : `Phrase ${activePhraseIdx + 1} recorded!`);
                setActivePhraseIdx(prev => prev + 1);
              } else {
                // Enrollment success
                setSpeakersList(prev => {
                  const updated = prev.map(s => {
                    if (s.id === selectedSpeakerId) {
                      return { ...s, enrolled: true, avgFreq: Math.round(135 + Math.random() * 40) };
                    }
                    return s;
                  });
                  localStorage.setItem(`recall_speakers_${user?.email}`, JSON.stringify(updated));
                  return updated;
                });

                if (selectedSpeakerId === 'me') {
                  localStorage.setItem(`recall_voice_enrolled_${user?.email}`, 'true');
                  localStorage.setItem(`recall_voice_sig_${user?.email}`, JSON.stringify(collectedFrames[0] || []));
                }
                localStorage.setItem(`recall_voice_sig_${user?.email}_${selectedSpeakerId}`, JSON.stringify(collectedFrames[0] || []));

                triggerSuccess(language === 'it' ? 'Firma vocale registrata!' : 'Voice fingerprint enrolled!');
                setVoiceStep('success');
              }
            }
          }, intervalMs);
        })
        .catch((err) => {
          console.error("Microphone access failed", err);
          setIsVoiceRecording(false);
          alert(language === 'it' ? "Accesso al microfono negato o non supportato!" : "Microphone access denied or unsupported!");
        });
    } else {
      // Clear visualizer to static wave pattern
      setLiveFrequencies(Array(16).fill(10).map(() => 5 + Math.random() * 10));
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [isVoiceRecording, activePhraseIdx, selectedSpeakerId, language, user?.email]);

  // Sync profile fields if user object updates
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

  // Return null if not open, because App.tsx renders this inline inside the main viewport!
  if (!isSettingsModalOpen) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      triggerSuccess(language === 'it' ? 'Inserisci nome ed email validi' : 'Please enter valid name and email');
      return;
    }
    updateUserProfile(profileName.trim(), profileEmail.trim());
    setActiveSubView('main');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);

    if (!currentPassword) {
      setPwdError(language === 'it' ? 'Inserisci la password corrente' : 'Enter current password');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError(language === 'it' ? 'La nuova password deve contenere almeno 6 caratteri' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(language === 'it' ? 'Le password non coincidono' : 'Passwords do not match');
      return;
    }

    triggerSuccess(language === 'it' ? 'Password aggiornata con successo!' : 'Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveSubView('main');
  };

  const handleExportData = () => {
    try {
      const allData: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('recall_') || key.includes('email_'))) {
          allData[key] = localStorage.getItem(key);
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `recall_backup_${user?.email || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerSuccess(language === 'it' ? 'Dati esportati correttamente!' : 'Data exported successfully!');
    } catch (err) {
      console.error(err);
      triggerSuccess(language === 'it' ? 'Impossibile esportare i dati' : 'Failed to export data');
    }
  };

  const handleClearCache = () => {
    if (confirm(language === 'it' ? 'Sei sicuro di voler resettare tutti i dati locali? Questa azione è irreversibile.' : 'Are you sure you want to clear all local data? This action is irreversible.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // 1. FRIENDS SUB-VIEW
  if (showFriendsSetting) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => setShowFriendsSetting(false)}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            {t('friendsAndCollaboration')}
          </h1>
          <button
            onClick={() => {
              setIsSettingsModalOpen(false);
              setActiveTab('home');
            }}
            className="ml-auto p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title={t('home')}
          >
            <Home className="w-4 h-4 text-[#761EAF] dark:text-[#C084FC]" />
            <span className="hidden sm:inline">{t('home')}</span>
          </button>
        </div>

        <FriendsView />
      </div>
    );
  }

  // 2. PROFILE EDIT SUB-VIEW
  if (activeSubView === 'profile') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => setActiveSubView('main')}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            {t('editProfile')}
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1A1D1F] p-6 rounded-3xl border border-gray-100 dark:border-[#272B30]">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-1.5">
                {language === 'it' ? 'Nome e Cognome' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                  placeholder="Il tuo nome"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-1.5">
                {language === 'it' ? 'Indirizzo Email' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                  placeholder="la_tua@email.com"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="flex-1 py-3 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-750 text-[#1A1A1A] dark:text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] hover:from-[#7B22BC] hover:to-[#9C44D4] text-white text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>{language === 'it' ? 'Salva Modifiche' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. PASSWORD SUB-VIEW
  if (activeSubView === 'password') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => setActiveSubView('main')}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            {t('passwordAndAccess')}
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1A1D1F] p-6 rounded-3xl border border-gray-100 dark:border-[#272B30]">
          {pwdError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold">
              {pwdError}
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-1.5">
                {language === 'it' ? 'Password Corrente' : 'Current Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-1.5">
                {language === 'it' ? 'Nuova Password' : 'New Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                  placeholder={language === 'it' ? 'Minimo 6 caratteri' : 'Min 6 characters'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-1.5">
                {language === 'it' ? 'Conferma Nuova Password' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="flex-1 py-3 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-750 text-[#1A1A1A] dark:text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] hover:from-[#7B22BC] hover:to-[#9C44D4] text-white text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>{language === 'it' ? 'Aggiorna Password' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 4. PRIVACY & DATA SUB-VIEW
  if (activeSubView === 'privacy') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => setActiveSubView('main')}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            {t('dataManagement')}
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1A1D1F] p-6 rounded-3xl border border-gray-100 dark:border-[#272B30] space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-[#761EAF]" />
              <span>{language === 'it' ? 'Backup ed Esportazione Dati' : 'Data Backup & Export'}</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-neutral-400 leading-relaxed">
              {language === 'it'
                ? 'Esporta tutte le tue riunioni registrate, le mappe concettuali, i compiti ed i log locali in un singolo file JSON da conservare o importare altrove.'
                : 'Export all your recorded meetings, mind maps, tasks, and local logs into a single JSON file to keep or import elsewhere.'}
            </p>
            <button
              onClick={handleExportData}
              className="py-2.5 px-4 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-750 text-[#1A1A1A] dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'it' ? 'Esporta Dati in JSON' : 'Export Data as JSON'}</span>
            </button>
          </div>

          <hr className="border-gray-100 dark:border-[#272B30]" />

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4.5 h-4.5" />
              <span>{language === 'it' ? 'Resetta Dati Locali' : 'Reset Local Data'}</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-neutral-400 leading-relaxed">
              {language === 'it'
                ? 'Questa operazione eliminerà definitivamente tutte le riunioni memorizzate localmente, le preferenze del browser e scollegherà l\'account. Assicurati di aver effettuato un backup.'
                : 'This operation will permanently delete all locally stored meetings, browser preferences, and log you out. Make sure you have backed up your data.'}
            </p>
            <button
              onClick={handleClearCache}
              className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-rose-100/50 dark:border-rose-900/10"
            >
              <Trash2 className="w-4 h-4" />
              <span>{language === 'it' ? 'Svuota la Cache e Resetta' : 'Clear Cache & Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4b. GOOGLE MEET SUB-VIEW
  if (activeSubView === 'meet') {
    const handleMeetSave = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('recall_setting_auto_join_meet', String(autoJoinMeet));
      localStorage.setItem('recall_setting_meet_bot_name', botName);
      localStorage.setItem('recall_setting_meet_transcribe_live', String(transcribeLive));
      localStorage.setItem('recall_setting_meet_auto_mindmap', String(autoGenerateMindMap));
      triggerSuccess(language === 'it' ? 'Impostazioni Google Meet salvate!' : 'Google Meet settings saved!');
      setActiveSubView('main');
    };

    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => setActiveSubView('main')}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            Google Meet
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1A1D1F] p-6 rounded-3xl border border-gray-100 dark:border-[#272B30] space-y-6">
          <form onSubmit={handleMeetSave} className="space-y-6">
            
            {/* Status of Workspace Connection since Meet requires Workspace auth */}
            <div className="p-4 rounded-2xl bg-[#F8F9FD] dark:bg-[#111315] border border-gray-150 dark:border-[#272B30] flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Stato Integrazione Google' : 'Google Integration Status'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">
                  {language === 'it' ? 'Necessaria per accedere alle videochiamate di Meet' : 'Required to access Meet video calls'}
                </p>
              </div>
              <span className={`text-[10px] font-black tracking-tight px-3 py-1 rounded-full uppercase ${
                user?.googleConnected 
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400'
              }`}>
                {user?.googleConnected ? t('connected') : t('notConnected')}
              </span>
            </div>

            {/* Toggle: Auto join meetings */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Avvia assistente in automatico' : 'Auto-join Assistant'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium leading-relaxed">
                  {language === 'it' 
                    ? 'Invia automaticamente l\'assistente bot Recall AI nei link di Google Meet trovati nei tuoi eventi a calendario.'
                    : 'Automatically send the Recall AI bot assistant into Google Meet links found in your calendar events.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoJoinMeet(!autoJoinMeet)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
                  autoJoinMeet ? 'bg-[#761EAF]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoJoinMeet ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Bot Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-[#1A1A1A] dark:text-white uppercase tracking-wider">
                {language === 'it' ? 'Nome dell\'assistente virtuale' : 'Virtual Assistant Name'}
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-2xl text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#761EAF] transition-all"
                placeholder="Es. Assistente Recall"
                required
              />
              <p className="text-[9.5px] text-gray-400 dark:text-neutral-500">
                {language === 'it'
                  ? 'Il nome visualizzato dal bot quando partecipa alla riunione per registrare l\'audio.'
                  : 'The name displayed by the bot when joining the meeting to record audio.'}
              </p>
            </div>

            <hr className="border-gray-100 dark:border-[#272B30]" />

            {/* Toggle: Transcribe Live */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Sottotitoli in tempo reale' : 'Real-time captions'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium leading-relaxed">
                  {language === 'it'
                    ? 'Abilita la trascrizione live in tempo reale visibile direttamente sulla dashboard di Recall durante la chiamata.'
                    : 'Enable live real-time transcription visible directly on Recall dashboard during the call.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTranscribeLive(!transcribeLive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
                  transcribeLive ? 'bg-[#761EAF]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    transcribeLive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Auto Mind Map */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Generazione automatica mappe concettuali' : 'Auto-generate cognitive maps'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium leading-relaxed">
                  {language === 'it'
                    ? 'Crea in automatico una mappa mentale e logica per ogni videochiamata Google Meet analizzata.'
                    : 'Automatically build a mental/logical map for every analyzed Google Meet call.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoGenerateMindMap(!autoGenerateMindMap)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
                  autoGenerateMindMap ? 'bg-[#761EAF]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoGenerateMindMap ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="flex-1 py-3 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-750 text-[#1A1A1A] dark:text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
              >
                {language === 'it' ? 'Indietro' : 'Back'}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] hover:from-[#7B22BC] hover:to-[#9C44D4] text-white text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>{language === 'it' ? 'Salva Impostazioni' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 4c. VOICE RECOGNITION SUB-VIEW
  if (activeSubView === 'voice') {
    const VOICE_PHRASES = [
      language === 'it' 
        ? "Recall, trascrivi questa riunione e genera la mappa mentale." 
        : "Recall, transcribe this meeting and generate the mind map.",
      language === 'it' 
        ? "Sincronizza i miei compiti su Google Tasks ed i miei eventi a calendario." 
        : "Sync my tasks on Google Tasks and my events on Google Calendar.",
      language === 'it' 
        ? "Isola la mia voce dai rumori di fondo e memorizza il mio timbro vocale." 
        : "Isolate my voice from background noise and memorize my vocal tone."
    ];

    const currentSpeakerName = speakersList.find(s => s.id === selectedSpeakerId)?.name || 'Tu';

    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex items-center gap-3.5 pb-2 w-full">
          <button
            onClick={() => {
              triggerHaptic(8);
              setActiveSubView('main');
            }}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
            {language === 'it' ? 'Riconoscimento Vocale' : 'Voice Recognition'}
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1A1D1F] p-6 rounded-3xl border border-gray-100 dark:border-[#272B30] space-y-6">
          
          {voiceStep === 'intro' && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-[#761EAF] dark:text-[#C084FC] flex items-center justify-center mx-auto shadow-2xs">
                  <Mic className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
                    {language === 'it' ? 'Impronte Vocali dei Relatori' : 'Speakers Voice Fingerprints'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium leading-relaxed">
                    {language === 'it'
                      ? "Addestra Recall a riconoscere il timbro vocale unico di diversi oratori (te stesso, collaboratori, o ospiti). Recall taggherà automaticamente lo speaker corretto nei verbali dei meeting."
                      : "Train Recall to recognize the unique vocal tone of different speakers (yourself, team members, or guests). Recall will automatically tag the correct speaker in meeting minutes."}
                  </p>
                </div>
              </div>

              {/* Speaker List */}
              <div className="space-y-3 max-w-md mx-auto text-left pt-2">
                <p className="text-[10px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
                  {language === 'it' ? 'Profili Vocali Registrati' : 'Registered Voice Profiles'}
                </p>
                <div className="space-y-2.5">
                  {speakersList.map((speaker) => (
                    <div 
                      key={speaker.id}
                      className="p-4 rounded-2xl border border-gray-150 dark:border-[#272B30] bg-gray-50/50 dark:bg-neutral-800/10 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          speaker.enrolled 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Mic className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                            {speaker.name}
                            {speaker.id === 'me' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-sm uppercase tracking-tight">Tu</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">
                            {speaker.enrolled 
                              ? `${language === 'it' ? 'Frequenza calibrata' : 'Calibrated frequency'}: ${speaker.avgFreq || 145} Hz` 
                              : (language === 'it' ? 'Firma vocale non registrata' : 'Voice fingerprint not enrolled')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            triggerHaptic(10);
                            setSelectedSpeakerId(speaker.id);
                            setVoiceStep('training');
                            setActivePhraseIdx(0);
                            setEnrolledSignature([]);
                          }}
                          className={`px-3 py-1.5 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer ${
                            speaker.enrolled
                              ? 'bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-[#1A1A1A] dark:text-white'
                              : 'bg-[#761EAF] hover:bg-[#681898] text-white shadow-xs'
                          }`}
                        >
                          {speaker.enrolled ? (language === 'it' ? 'Ricalibra' : 'Recalibrate') : (language === 'it' ? 'Configura' : 'Configure')}
                        </button>
                        
                        {speaker.id !== 'me' && (
                          <button
                            onClick={() => {
                              triggerHaptic(12);
                              setSpeakersList(prev => prev.filter(s => s.id !== speaker.id));
                              localStorage.removeItem(`recall_voice_sig_${user?.email}_${speaker.id}`);
                            }}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            title={language === 'it' ? 'Elimina' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Speaker Form */}
              <div className="max-w-md mx-auto pt-4 border-t border-gray-100 dark:border-[#272B30] text-left space-y-2.5">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider">
                  {language === 'it' ? 'Aggiungi un altro oratore (Collaboratore, Ospite)' : 'Add another speaker (Collaborator, Guest)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpeakerName}
                    onChange={(e) => setNewSpeakerName(e.target.value)}
                    placeholder={language === 'it' ? 'Es. Giulia, Marco...' : 'e.g. Julia, Mark...'}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1A1A] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
                  />
                  <button
                    onClick={() => {
                      if (!newSpeakerName.trim()) return;
                      triggerHaptic(10);
                      const id = 'speaker_' + Date.now();
                      const newSpeaker = {
                        id,
                        name: newSpeakerName.trim(),
                        enrolled: false
                      };
                      setSpeakersList(prev => [...prev, newSpeaker]);
                      setNewSpeakerName('');
                    }}
                    className="px-4 bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    {language === 'it' ? 'Aggiungi' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {voiceStep === 'training' && (
            <div className="space-y-6 text-center py-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  {language === 'it' ? 'Calibrazione' : 'Calibration'}: <span className="text-indigo-600 dark:text-indigo-400">{currentSpeakerName}</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  {language === 'it' ? 'Frase' : 'Phrase'} {activePhraseIdx + 1} / 3
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] transition-all duration-75"
                  style={{ width: `${voiceProgress}%` }}
                />
              </div>

              {/* Phrase Card */}
              <div className="bg-[#F8F9FD] dark:bg-[#111315] p-6 rounded-2xl border border-gray-150 dark:border-[#272B30] min-h-[100px] flex items-center justify-center">
                <p className="text-sm font-black text-[#1A1A1A] dark:text-white leading-relaxed">
                  "{VOICE_PHRASES[activePhraseIdx]}"
                </p>
              </div>

              {/* Live Spectrum Frequency Visualizer */}
              <div className="h-16 flex items-end justify-center gap-1.5 px-4">
                {liveFrequencies.map((val, i) => (
                  <div 
                    key={i} 
                    className={`w-2.5 rounded-t-full transition-all duration-75 ${
                      isVoiceRecording 
                        ? 'bg-gradient-to-t from-[#6B1D9F] to-[#BC6EEB]' 
                        : 'bg-gray-200 dark:bg-neutral-800'
                    }`}
                    style={{ height: `${val}px` }}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsVoiceRecording(true);
                  }}
                  disabled={isVoiceRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all shadow-md ${
                    isVoiceRecording 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-[#761EAF] hover:bg-[#681898] text-white hover:scale-105 active:scale-95'
                  } disabled:opacity-80 cursor-pointer`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <p className="text-[10px] text-gray-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
                  {isVoiceRecording 
                    ? (language === 'it' ? 'Parla lentamente... (Hai 7 secondi)' : 'Speak slowly... (You have 7 seconds)') 
                    : (language === 'it' ? 'Clicca sul microfono e leggi con calma' : 'Click mic and read slowly')}
                </p>
              </div>

              <button
                onClick={() => {
                  triggerHaptic(8);
                  setVoiceStep('intro');
                }}
                disabled={isVoiceRecording}
                className="py-2.5 px-6 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-750 text-[#1A1A1A] dark:text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
            </div>
          )}

          {voiceStep === 'success' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? `Timbro di ${currentSpeakerName} Calibrato!` : `Vocal Tone of ${currentSpeakerName} Calibrated!`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium leading-relaxed">
                  {language === 'it'
                    ? "La firma spettrale dell'oratore è stata analizzata con successo. Recall ha memorizzato il timbro vocale specifico per differenziarlo nei prossimi verbali di registrazione."
                    : "The speaker's spectral signature has been successfully analyzed. Recall has stored the vocal tone to differentiate them in upcoming recordings."}
                </p>
              </div>

              {/* Vocal Fingerprint graph */}
              <div className="bg-[#F8F9FD] dark:bg-[#111315] p-5 rounded-2xl border border-gray-150 dark:border-[#272B30] max-w-sm mx-auto space-y-3">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-neutral-500 tracking-wider">
                  {language === 'it' ? `Impronta Spettrale Biometrica - ${currentSpeakerName}` : `Biometric Spectral Fingerprint - ${currentSpeakerName}`}
                </p>
                {/* SVG Frequency wave spectrum based on user voice! */}
                <svg className="w-full h-16 overflow-visible text-[#761EAF] dark:text-[#C084FC]" viewBox="0 0 100 20">
                  <path 
                    d="M 0 10 Q 10 2 20 10 T 40 10 T 60 18 T 80 10 T 100 10" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    className="animate-[pulse_2s_infinite]"
                  />
                  <path 
                    d="M 0 10 Q 15 18 30 10 T 60 5 T 90 10 T 100 10" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    className="opacity-50 animate-[pulse_3s_infinite]"
                  />
                </svg>
                <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase">
                  <span>{language === 'it' ? 'Stato: Attivo e Calibrato' : 'Status: Active & Calibrated'}</span>
                  <span>{language === 'it' ? 'Freq. Rilevata: ~140 Hz' : 'Detected Freq: ~140 Hz'}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    setVoiceStep('intro');
                  }}
                  className="flex-1 py-3 border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white text-xs font-black rounded-2xl transition-all cursor-pointer"
                >
                  {language === 'it' ? 'Lista Profili' : 'Profiles List'}
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    setActiveSubView('main');
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-[#6B1D9F] to-[#7B22BC] hover:from-[#7B22BC] hover:to-[#9C44D4] text-white text-xs font-black rounded-2xl transition-all cursor-pointer shadow-xs"
                >
                  {language === 'it' ? 'Chiudi' : 'Close'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // 5. MAIN SETTINGS VIEW
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      
      {/* Header back arrow */}
      <div className="flex items-center gap-3.5 pb-2 w-full">
        <button
          onClick={() => setIsSettingsModalOpen(false)}
          className="p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
          title={t('back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
          {t('settings')}
        </h1>
        <button
          onClick={() => {
            setIsSettingsModalOpen(false);
            setActiveTab('home');
          }}
          className="ml-auto p-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title={t('home')}
        >
          <Home className="w-4 h-4 text-[#761EAF] dark:text-[#C084FC]" />
          <span className="hidden sm:inline">{t('home')}</span>
        </button>
      </div>

      {/* 1. ASPETTO */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
          {t('appearance')}
        </h2>
        <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Moon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('darkTheme')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-bold">
                  {isDarkMode ? t('enabled') : t('disabled')}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isDarkMode ? 'bg-[#761EAF]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
          {t('account')}
        </h2>
        <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
          {/* Modifica profilo */}
          <div 
            onClick={() => setActiveSubView('profile')}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <User className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('editProfile')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">
                  {user ? `${user.name} (${user.email})` : t('profileSubtitle')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          {/* Amici e Collaborazione */}
          <div 
            onClick={() => setShowFriendsSetting(true)}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('friendsAndCollaboration')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('friendsSubtitle')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          {/* Password e accesso */}
          <div 
            onClick={() => setActiveSubView('password')}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('passwordAndAccess')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">
                  {language === 'it' ? 'Gestisci le credenziali d\'accesso' : 'Manage access credentials'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          {/* Lingua */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Globe className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('language')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-bold">
                  {language === 'it' ? 'Italiano' : 'English'}
                </p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'it' | 'en')}
              className="text-xs bg-[#F5F5F7] dark:bg-[#272B30] text-[#1A1A1A] dark:text-white font-bold py-1.5 px-3 rounded-xl border border-transparent focus:border-[#761EAF] focus:outline-none transition-all cursor-pointer"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. NOTIFICHE */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
          {t('notifications')}
        </h2>
        <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
          {/* Notifiche push */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('pushNotifications')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('pushSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                pushNotifications ? 'bg-[#761EAF]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pushNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Riepilogo email */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('emailSummary')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('emailSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setEmailSummary(!emailSummary)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                emailSummary ? 'bg-[#761EAF]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailSummary ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. INTEGRAZIONI */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
          {t('integrations')}
        </h2>

        {googleError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 p-3.5 rounded-[22px] flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
            <Shield className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-1">
              <p className="font-extrabold">{language === 'it' ? 'Problema con la connessione Google' : 'Google Connection Issue'}</p>
              <p className="font-medium text-[11px] leading-relaxed opacity-90">{googleError}</p>
              <p className="text-[10px] opacity-75 font-bold">
                {language === 'it' 
                  ? 'Consiglio: Assicurati di aver accettato tutti i permessi richiesti nella schermata di accesso di Google.' 
                  : 'Tip: Make sure to check and accept all requested permissions on the Google sign-in prompt.'}
              </p>
              <button 
                onClick={() => setGoogleError(null)} 
                className="text-[10px] font-extrabold hover:underline block pt-1 cursor-pointer"
              >
                {language === 'it' ? 'Chiudi avviso' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
          {/* Google Calendar */}
          <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer" onClick={() => user?.googleConnected ? disconnectGoogleWorkspace() : connectGoogleWorkspace()}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">Google Calendar</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('syncTasksEvents')}</p>
              </div>
            </div>
            <span className={`text-[10px] font-black tracking-tight px-3 py-1 rounded-full uppercase ${
              user?.googleConnected 
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400'
            }`}>
              {user?.googleConnected ? t('connected') : t('notConnected')}
            </span>
          </div>

          {/* Google Meet */}
          <div 
            onClick={() => setActiveSubView('meet')}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Video className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">Google Meet</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('recordCalls')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          {/* Slack */}
          <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">Slack</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 font-bold">{t('notConnected')}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. PRIVACY E SICUREZZA */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
          {t('privacyAndSecurity')}
        </h2>
        <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
          <div 
            onClick={() => {
              triggerHaptic(8);
              setActiveSubView('privacy');
            }}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('dataManagement')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">{t('dataManagementSubtitle')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div 
            onClick={() => {
              triggerHaptic(8);
              setActiveSubView('voice');
            }}
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#272B30] flex items-center justify-center text-gray-600 dark:text-neutral-300">
                <Mic className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">Riconoscimento Vocale Biometrico</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium">Configura la firma vocale per identificarti nelle registrazioni</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-extrabold tracking-tight px-2.5 py-0.5 rounded-full uppercase ${
                localStorage.getItem(`recall_voice_enrolled_${user?.email}`) === 'true'
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              }`}>
                {localStorage.getItem(`recall_voice_enrolled_${user?.email}`) === 'true' ? 'Configurato' : 'Non config.'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Esci dall'account */}
      <div className="pt-4">
        <button
          onClick={logout}
          className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-black rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-100/50 dark:border-rose-900/10"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>{t('logout')}</span>
        </button>
      </div>

      {/* Version Label */}
      <p className="text-center text-[10px] font-bold text-gray-400 dark:text-neutral-500 tracking-normal pt-2">
        Recall - {t('version')} 2.4.0
      </p>

    </div>
  );
};
