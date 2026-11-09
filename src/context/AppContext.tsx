import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  PlanType,
  Meeting,
  GoogleCalendarEvent,
  GoogleTaskItem,
  NavTab,
  TaskAiMeetingDetection,
} from '../types';
import { GoogleWorkspaceService } from '../services/calendarService';
import {
  initAuth,
  googleSignIn,
  logoutAuth,
  requestGoogleWorkspaceToken,
  registerEmailAccount,
  loginEmailAccount,
  refreshEmailVerified,
  friendlyAuthError,
  auth,
} from '../services/firebaseAuth';
import { apiFetch } from '../services/apiClient';
import {
  ShareMeta,
  createShare,
  listReceivedShares,
  listSentShares,
  deleteShare,
} from '../services/shareService';
import { analyzeTasksApi } from '../services/geminiService';
import { sendVerificationEmailFirebase, sendWelcomeEmail } from '../services/emailService';
import confetti from 'canvas-confetti';

export interface OtpStatus {
  error: string | null;
  resendAfterSeconds: number;
  stamp: number;
}

interface AppContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isDarkMode: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeMeetingId: string | null;
  setActiveMeetingId: (id: string | null) => void;
  meetings: Meeting[];
  upcomingEvents: GoogleCalendarEvent[];
  todayTasks: GoogleTaskItem[];
  taskAiDetections: TaskAiMeetingDetection[];
  isAnalyzingTasks: boolean;
  taskAiError: string | null;
  isRecordingModalOpen: boolean;
  setIsRecordingModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  isOtpModalOpen: boolean;
  setIsOtpModalOpen: (open: boolean) => void;
  pendingOtpEmail: string;

  isAddFriendModalOpen: boolean;
  setIsAddFriendModalOpen: (open: boolean) => void;
  showFriendsSetting: boolean;
  setShowFriendsSetting: (show: boolean) => void;
  friendsList: any[];
  friendsReceivedPending: any[];
  friendsSentPending: any[];
  fetchFriends: () => Promise<void>;
  sendFriendRequest: (email: string) => Promise<{ success: boolean; error?: string; registered?: boolean; acceptedAutomatic?: boolean }>;
  respondFriendRequest: (friendshipId: string, action: 'accept' | 'reject') => Promise<boolean>;

  setAvatarUrl: (url?: string) => void;

  receivedShares: ShareMeta[];
  sentShares: ShareMeta[];
  fetchShares: () => Promise<void>;
  shareMeetingWithFriend: (meeting: Meeting, friendEmail: string) => Promise<{ success: boolean; error?: string }>;
  removeShare: (shareId: string) => Promise<boolean>;

  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  verifyEmailCode: () => Promise<void>;
  sendEmailCode: (name?: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  otpStatus: OtpStatus;
  logout: () => void;
  toggleTheme: () => void;
  setPlan: (plan: PlanType) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meeting: Meeting) => void;
  deleteMeeting: (id: string) => void;
  addDetectedEventToCalendar: (meetingId: string, eventId: string) => Promise<void>;
  addActionItemToGoogleTasks: (meetingId: string, actionItemId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  addTask: (title: string, notes?: string, dueDate?: string) => Promise<void>;
  refreshCalendarEvents: () => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  connectGoogleWorkspace: () => Promise<void>;
  disconnectGoogleWorkspace: () => void;
  analyzeTasksWithAi: () => Promise<void>;
  convertTaskToCalendarEvent: (detection: TaskAiMeetingDetection) => Promise<void>;
  successAnimation: { isVisible: boolean; message: string };
  triggerSuccess: (message?: string) => void;
  calendarPreviewData: any | null;
  setCalendarPreviewData: (data: any | null) => void;
  googleError: string | null;
  setGoogleError: (err: string | null) => void;
  updateUserProfile: (name: string, email: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Funzione di recupero sicura che legge sia la nuova chiave 'recap_' che la vecchia 'recall_'
function loadSavedMeetings(email?: string): Meeting[] {
  try {
    const recapKey = email ? `recap_meetings_data_v2_email_${email}` : `recap_meetings_data_v2_guest`;
    const recallKey = email ? `recall_meetings_data_v2_email_${email}` : `recall_meetings_data_v2_guest`;

    const raw = localStorage.getItem(recapKey) || localStorage.getItem(recallKey) || localStorage.getItem('recall_meetings_data_v2');
    if (raw) {
      const parsed: Meeting[] = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Errore durante il caricamento delle riunioni salvate:', e);
  }
  return [];
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('recap_theme_mode') === 'dark' || localStorage.getItem('recall_theme_mode') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('recap_theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('recap_theme_mode', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('recap_user_profile') || localStorage.getItem('recall_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const isLoggedIn = Boolean(user && user.isEmailVerified);

  useEffect(() => {
    if (user) {
      localStorage.setItem('recap_user_profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('recap_user_profile');
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string>('');
  const [otpStatus, setOtpStatus] = useState<OtpStatus>({ error: null, resendAfterSeconds: 60, stamp: 0 });

  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState<boolean>(false);
  const [showFriendsSetting, setShowFriendsSetting] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsReceivedPending, setFriendsReceivedPending] = useState<any[]>([]);
  const [friendsSentPending, setFriendsSentPending] = useState<any[]>([]);
  const [receivedShares, setReceivedShares] = useState<ShareMeta[]>([]);
  const [sentShares, setSentShares] = useState<ShareMeta[]>([]);

  // Caricamento riunioni con salvataggio retrocompatibile
  const [meetings, setMeetings] = useState<Meeting[]>(() => loadSavedMeetings(user?.email));

  useEffect(() => {
    if (user?.email) {
      setMeetings(loadSavedMeetings(user.email));
    }
  }, [user?.email]);

  useEffect(() => {
    const key = user?.email ? `recap_meetings_data_v2_email_${user.email}` : `recap_meetings_data_v2_guest`;
    localStorage.setItem(key, JSON.stringify(meetings));
  }, [meetings, user?.email]);

  const [upcomingEvents, setUpcomingEvents] = useState<GoogleCalendarEvent[]>([]);
  const [todayTasks, setTodayTasks] = useState<GoogleTaskItem[]>([]);

  useEffect(() => {
    const email = user?.email || null;
    GoogleWorkspaceService.setUserEmail(email);

    if (user?.googleConnected) {
      setUpcomingEvents(GoogleWorkspaceService.getEvents([]));
      setTodayTasks(GoogleWorkspaceService.getTasks([]));
    } else {
      setUpcomingEvents([]);
      setTodayTasks([]);
    }
  }, [user?.email, user?.googleConnected]);

  const [taskAiDetections, setTaskAiDetections] = useState<TaskAiMeetingDetection[]>([]);
  const [isAnalyzingTasks, setIsAnalyzingTasks] = useState<boolean>(false);
  const [taskAiError, setTaskAiError] = useState<string | null>(null);

  const [successAnimation, setSuccessAnimation] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: '',
  });

  const [calendarPreviewData, setCalendarPreviewData] = useState<any | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const triggerSuccess = (message: string = 'Operazione completata!') => {
    setSuccessAnimation({ isVisible: true, message });
    setTimeout(() => {
      setSuccessAnimation((prev) => ({ ...prev, isVisible: false }));
    }, 2000);
  };

  const syncWorkspaceData = async (token?: string) => {
    const activeToken = token || GoogleWorkspaceService.getAccessToken();
    if (!activeToken) return;

    try {
      const [events, tasks] = await Promise.all([
        GoogleWorkspaceService.fetchGoogleCalendarEvents(activeToken),
        GoogleWorkspaceService.fetchGoogleTasks(activeToken),
      ]);

      if (events) setUpcomingEvents(events);
      if (tasks) setTodayTasks(tasks);
    } catch (err) {
      console.warn('Error during workspace data synchronization:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        if (firebaseUser) {
          setUser((prev) => {
            const workspaceConnected = prev ? prev.googleConnected : false;
            if (!prev) {
              return {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Utente Google',
                email: firebaseUser.email || 'utente@gmail.com',
                avatarUrl: firebaseUser.photoURL || undefined,
                isEmailVerified: firebaseUser.emailVerified,
                plan: firebaseUser.providerData.some((p) => p.providerId === 'google.com') ? 'pro' : 'free',
                googleConnected: workspaceConnected,
                createdAt: new Date().toISOString(),
                monthlyUsage: {
                  summariesUsed: 0,
                  chatsUsed: 0,
                  minutesRecorded: 0,
                  month: new Date().toISOString().substring(0, 7),
                },
              };
            }
            return {
              ...prev,
              googleConnected: workspaceConnected,
              avatarUrl: prev.avatarUrl || firebaseUser.photoURL || undefined,
              isEmailVerified: firebaseUser.emailVerified,
            };
          });

          if (token) {
            await syncWorkspaceData(token);
          }
        }
      },
      () => {
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshCalendarEvents = async () => {
    const token = GoogleWorkspaceService.getAccessToken();
    if (token) await syncWorkspaceData(token);
  };

  const deleteCalendarEvent = async (eventId: string) => {
    const token = GoogleWorkspaceService.getAccessToken();
    const updated = await GoogleWorkspaceService.deleteEvent(eventId, upcomingEvents, token || undefined);
    setUpcomingEvents(updated);
    triggerSuccess('Evento rimosso!');
  };

  const analyzeTasksWithAi = async () => {
    setIsAnalyzingTasks(true);
    setTaskAiError(null);

    const tasksToAnalyze = todayTasks.length > 0
      ? todayTasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          dueDate: t.dueDate,
        }))
      : [];

    if (tasksToAnalyze.length === 0) {
      setTaskAiError('Nessuna task presente da analizzare. Aggiungine una prima di avviare la scansione.');
      setIsAnalyzingTasks(false);
      return;
    }

    try {
      const analyses = await analyzeTasksApi({
        tasks: tasksToAnalyze,
        referenceDate: new Date().toISOString().split('T')[0],
      });

      const detected = analyses.filter((a) => a.isMeetingOrEvent);
      setTaskAiDetections(detected);
      triggerSuccess('Scansione IA completata!');
      if (detected.length > 0) {
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); } catch (e) {}
      }
    } catch (err: any) {
      console.error('Task AI analysis error:', err);
      setTaskAiError(err.message || 'Errore durante la scansione IA delle task.');
    } finally {
      setIsAnalyzingTasks(false);
    }
  };

  const convertTaskToCalendarEvent = async (detection: TaskAiMeetingDetection) => {
    if (!detection.suggestedEvent) return;

    const { title, date, startTime, endTime, location, attendees, description } = detection.suggestedEvent;
    const startIso = `${date}T${startTime}:00`;
    const endIso = `${date}T${endTime}:00`;

    const result = await GoogleWorkspaceService.addEvent(
      {
        title,
        start: startIso,
        end: endIso,
        location,
        attendees,
        description: `${description || ''}\n(Generato automaticamente da Recap dal task: "${detection.taskTitle}")`,
      },
      upcomingEvents
    );

    setUpcomingEvents(result.updatedList);
    setTaskAiDetections((prev) =>
      prev.map((d) => (d.taskId === detection.taskId ? { ...d, isScheduled: true } : d))
    );
    triggerSuccess('Evento aggiunto a Calendar!');
  };

  const emptyUsage = () => ({
    summariesUsed: 0,
    chatsUsed: 0,
    minutesRecorded: 0,
    month: new Date().toISOString().substring(0, 7),
  });

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    let fbUser;
    try {
      fbUser = await loginEmailAccount(email.trim(), pass);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }

    const fallbackName = (fbUser.email || email).split('@')[0].replace(/[._]/g, ' ');
    const loggedUser: UserProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) || 'Professionista',
      email: fbUser.email || email.trim(),
      avatarUrl: fbUser.photoURL || undefined,
      isEmailVerified: fbUser.emailVerified,
      plan: 'pro',
      googleConnected: false,
      createdAt: new Date().toISOString(),
      monthlyUsage: emptyUsage(),
    };
    setUser(loggedUser);

    if (!fbUser.emailVerified) {
      setPendingOtpEmail(loggedUser.email);
      setIsOtpModalOpen(true);
      sendEmailCode().catch(() => {});
      return false;
    }

    triggerSuccess('Accesso effettuato! Benvenuto su Recap.');
    return true;
  };

  const registerWithEmail = async (name: string, email: string, pass: string): Promise<void> => {
    let fbUser;
    try {
      fbUser = await registerEmailAccount(name, email.trim(), pass);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }

    const newUser: UserProfile = {
      id: fbUser.uid,
      name: name || 'Utente',
      email: fbUser.email || email.trim(),
      isEmailVerified: false,
      plan: 'free',
      googleConnected: false,
      createdAt: new Date().toISOString(),
      monthlyUsage: emptyUsage(),
    };
    setUser(newUser);
    setPendingOtpEmail(newUser.email);
    setIsOtpModalOpen(true);
  };

  const sendEmailCode = async (_name?: string): Promise<void> => {
    try {
      await sendVerificationEmailFirebase();
      setOtpStatus({ error: null, resendAfterSeconds: 60, stamp: Date.now() });
    } catch (err: any) {
      const msg = friendlyAuthError(err);
      setOtpStatus({ error: msg, resendAfterSeconds: 0, stamp: Date.now() });
      throw new Error(msg);
    }
  };

  const verifyEmailCode = async (): Promise<void> => {
    const verified = await refreshEmailVerified();
    if (!verified) {
      throw new Error('Non risulta ancora verificata: clicca prima il link nell\'email.');
    }

    if (user) {
      setUser({ ...user, isEmailVerified: true });
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.warn('[EmailJS] Welcome email post-verify error:', err)
      );
    }
    triggerSuccess('Account verificato! Benvenuto su Recap.');
    setIsOtpModalOpen(false);
  };

  const resendVerificationEmail = async (): Promise<void> => {
    await sendEmailCode(user?.name);
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await googleSignIn();
      if (result) {
        const googleUser: UserProfile = {
          id: result.user.uid || `usr_google_${Date.now()}`,
          name: result.user.displayName || 'Utente Google',
          email: result.user.email || 'utente@gmail.com',
          avatarUrl: result.user.photoURL || undefined,
          isEmailVerified: true,
          plan: 'pro',
          googleConnected: true,
          createdAt: new Date().toISOString(),
          monthlyUsage: emptyUsage(),
        };
        setUser(googleUser);
        triggerSuccess('Accesso con Google completato! Benvenuto.');
        return true;
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      throw err;
    }
    return false;
  };

  const logout = async () => {
    await logoutAuth();
    GoogleWorkspaceService.clearCache();
    setUser(null);
    setActiveMeetingId(null);
    setActiveTab('home');
    setUpcomingEvents([]);
    setTodayTasks([]);
  };

  const setPlan = (plan: PlanType) => {
    if (!user) return;
    setUser({ ...user, plan });
  };

  const addMeeting = (newMeeting: Meeting) => {
    setMeetings((prev) => [newMeeting, ...prev]);
  };

  const updateMeeting = (updatedMeeting: Meeting) => {
    setMeetings((prev) => prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m)));
  };

  const deleteMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (activeMeetingId === id) setActiveMeetingId(null);
  };

  const addDetectedEventToCalendar = async (meetingId: string, eventId: string) => {
    const targetMeeting = meetings.find((m) => m.id === meetingId);
    if (!targetMeeting || !targetMeeting.calendarEventsDetected) return;

    const targetEvent = targetMeeting.calendarEventsDetected.find((e) => e.id === eventId);
    if (!targetEvent || targetEvent.isAddedToCalendar) return;

    const startIso = `${targetEvent.date}T${targetEvent.startTime}:00`;
    const endIso = `${targetEvent.date}T${targetEvent.endTime}:00`;

    const result = await GoogleWorkspaceService.addEvent(
      {
        title: targetEvent.title,
        start: startIso,
        end: endIso,
        description: targetEvent.description,
        location: targetEvent.location,
        attendees: targetEvent.attendees,
        linkedMeetingId: meetingId,
      },
      upcomingEvents
    );

    setUpcomingEvents(result.updatedList);
    triggerSuccess('Evento aggiunto al calendario!');
  };

  const addActionItemToGoogleTasks = async (meetingId: string, actionItemId: string) => {
    const targetMeeting = meetings.find((m) => m.id === meetingId);
    if (!targetMeeting || !targetMeeting.summary) return;

    const actionItem = targetMeeting.summary.actionItems.find((a) => a.id === actionItemId);
    if (!actionItem || actionItem.syncedToGoogleTasks) return;

    const result = await GoogleWorkspaceService.addTask(
      {
        title: actionItem.task,
        notes: `Assegnato a: ${actionItem.assignee || 'Team'} • Riunione: ${targetMeeting.title}`,
        dueDate: actionItem.dueDate,
        meetingId,
      },
      todayTasks
    );

    setTodayTasks(result.updatedList);
    triggerSuccess('Task aggiunta con successo!');
  };

  const toggleTask = async (taskId: string) => {
    const updated = await GoogleWorkspaceService.toggleTask(taskId, todayTasks);
    setTodayTasks(updated);
  };

  const addTask = async (title: string, notes?: string, dueDate?: string) => {
    const result = await GoogleWorkspaceService.addTask({ title, notes, dueDate }, todayTasks);
    setTodayTasks(result.updatedList);
    triggerSuccess('Task aggiunta con successo!');
  };

  const connectGoogleWorkspace = async () => {
    setGoogleError(null);
    try {
      const accessToken = await requestGoogleWorkspaceToken();
      if (accessToken) {
        if (user) setUser({ ...user, googleConnected: true });
        await syncWorkspaceData(accessToken);
        triggerSuccess('Google Workspace collegato con successo!');
      }
    } catch (e: any) {
      setGoogleError('Errore di connessione a Google Calendar/Tasks.');
    }
  };

  const disconnectGoogleWorkspace = async () => {
    await logoutAuth();
    GoogleWorkspaceService.clearCache();
    setGoogleError(null);
    if (user) setUser({ ...user, googleConnected: false });
    setUpcomingEvents([]);
    setTodayTasks([]);
  };

  const updateUserProfile = (name: string, email: string) => {
    if (!user) return;
    setUser({ ...user, name, email });
    triggerSuccess('Profilo aggiornato con successo!');
  };

  const fetchFriends = async () => {
    if (!user?.email) return;
    try {
      const res = await apiFetch('/api/friends/list');
      const data = await res.json();
      if (data.success) {
        setFriendsList(data.friends || []);
        setFriendsReceivedPending(data.receivedPending || []);
        setFriendsSentPending(data.sentPending || []);
      }
    } catch (err) {
      console.warn('Failed to fetch friends list', err);
    }
  };

  const sendFriendRequest = async (receiverEmail: string) => {
    if (!user?.email) return { success: false, error: 'Devi effettuare l’accesso per aggiungere amici' };
    try {
      const res = await apiFetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchFriends();
        return { success: true, registered: data.registered, acceptedAutomatic: data.acceptedAutomatic, friendship: data.friendship };
      }
      return { success: false, error: data.error || 'Impossibile inviare la richiesta' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Errore di rete' };
    }
  };

  const respondFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    if (!user?.email) return false;
    try {
      const res = await apiFetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFriends();
        triggerSuccess(action === 'accept' ? 'Richiesta accettata!' : 'Richiesta rifiutata');
        return true;
      }
    } catch (err) {}
    return false;
  };

  const setAvatarUrl = (url?: string) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl: url ?? auth.currentUser?.photoURL ?? undefined } : prev));
  };

  const fetchShares = async () => {
    if (!user?.email) return;
    try {
      const [received, sent] = await Promise.all([listReceivedShares(), listSentShares()]);
      setReceivedShares(received);
      setSentShares(sent);
    } catch (err) {}
  };

  const shareMeetingWithFriend = async (meeting: Meeting, friendEmail: string) => {
    if (!user?.email) return { success: false, error: 'Devi effettuare l’accesso per condividere' };
    try {
      await createShare(friendEmail, meeting);
      await fetchShares();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Errore di rete' };
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      await deleteShare(shareId);
      await fetchShares();
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn,
        isDarkMode,
        activeTab,
        setActiveTab,
        activeMeetingId,
        setActiveMeetingId,
        meetings,
        upcomingEvents,
        todayTasks,
        taskAiDetections,
        isAnalyzingTasks,
        taskAiError,
        isRecordingModalOpen,
        setIsRecordingModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        isOtpModalOpen,
        setIsOtpModalOpen,
        pendingOtpEmail,
        isAddFriendModalOpen,
        setIsAddFriendModalOpen,
        showFriendsSetting,
        setShowFriendsSetting,
        friendsList,
        friendsReceivedPending,
        friendsSentPending,
        fetchFriends,
        sendFriendRequest,
        respondFriendRequest,
        setAvatarUrl,
        receivedShares,
        sentShares,
        fetchShares,
        shareMeetingWithFriend,
        removeShare,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        verifyEmailCode,
        sendEmailCode,
        resendVerificationEmail,
        otpStatus,
        logout,
        toggleTheme,
        setPlan,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addDetectedEventToCalendar,
        addActionItemToGoogleTasks,
        toggleTask,
        addTask,
        refreshCalendarEvents,
        deleteCalendarEvent,
        connectGoogleWorkspace,
        disconnectGoogleWorkspace,
        analyzeTasksWithAi,
        convertTaskToCalendarEvent,
        successAnimation,
        triggerSuccess,
        calendarPreviewData,
        setCalendarPreviewData,
        googleError,
        setGoogleError,
        updateUserProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};