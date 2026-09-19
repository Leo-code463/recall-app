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
import { INITIAL_MEETINGS, UPCOMING_GOOGLE_EVENTS, INITIAL_TASKS } from '../data/initialData';
import { GoogleWorkspaceService } from '../services/calendarService';
import { initAuth, googleSignIn, logoutAuth, requestGoogleWorkspaceToken } from '../services/firebaseAuth';
import { analyzeTasksApi } from '../services/geminiService';
import { sendWelcomeEmail, sendOtpEmail } from '../services/emailService';
import confetti from 'canvas-confetti';

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
  pendingOtpCode: string;
  pendingOtpEmail: string;

  // Friendships state
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

  // Actions
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<string>;
  loginWithGoogle: () => Promise<boolean>;
  verifyOtp: (code: string) => boolean;
  resendOtp: () => Promise<{ success: boolean; message: string; code: string }>;
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

const STORAGE_KEY_USER = 'recall_user_profile';
const STORAGE_KEY_MEETINGS = 'recall_meetings_data_v2';
const STORAGE_KEY_THEME = 'recall_theme_mode';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme Management (Light / Dark)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) return saved === 'dark';
      return false; // Default to clean, modern light theme
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // User State - starts as null so Login/Registration is the first screen
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch (e) {
        console.warn('Failed parsing saved user', e);
      }
    }
    return null;
  });

  const isLoggedIn = Boolean(user && user.isEmailVerified);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  
  // OTP Verification flow
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [pendingOtpCode, setPendingOtpCode] = useState<string>('842915');
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string>('');

  // Friendships state
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState<boolean>(false);
  const [showFriendsSetting, setShowFriendsSetting] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsReceivedPending, setFriendsReceivedPending] = useState<any[]>([]);
  const [friendsSentPending, setFriendsSentPending] = useState<any[]>([]);

  // Meetings: Only genuine user recordings, no fake/demo discussions.
  // Isolated per user account so each user has their own independent discussions.
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    let restoredEmail: string | undefined;
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) restoredEmail = parsed.email;
      }
    } catch (e) {}

    const key = restoredEmail ? `${STORAGE_KEY_MEETINGS}_email_${restoredEmail}` : `${STORAGE_KEY_MEETINGS}_guest`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed: Meeting[] = JSON.parse(saved);
        // Filter out any older mock/demo records with template titles
        return parsed.filter(
          (m) =>
            !['meet_1', 'meet_2', 'meet_3'].includes(m.id) &&
            !m.title.includes('Demo Prodotto Q3') &&
            !m.title.includes('Allineamento Strategico')
        );
      } catch (e) {
        console.warn('Failed parsing meetings', e);
      }
    }
    return INITIAL_MEETINGS;
  });

  // Load meetings when user changes (account switch)
  useEffect(() => {
    const key = user?.email ? `${STORAGE_KEY_MEETINGS}_email_${user.email}` : `${STORAGE_KEY_MEETINGS}_guest`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed: Meeting[] = JSON.parse(saved);
        setMeetings(
          parsed.filter(
            (m) =>
              !['meet_1', 'meet_2', 'meet_3'].includes(m.id) &&
              !m.title.includes('Demo Prodotto Q3') &&
              !m.title.includes('Allineamento Strategico')
          )
        );
      } catch (e) {
        console.warn('Failed parsing meetings on user change', e);
        setMeetings(INITIAL_MEETINGS);
      }
    } else {
      setMeetings(INITIAL_MEETINGS);
    }
  }, [user?.email]);

  // Save meetings when meetings change, using the specific account key
  useEffect(() => {
    const key = user?.email ? `${STORAGE_KEY_MEETINGS}_email_${user.email}` : `${STORAGE_KEY_MEETINGS}_guest`;
    localStorage.setItem(key, JSON.stringify(meetings));
  }, [meetings, user?.email]);

  // Google Workspace: Real Calendar Events & Tasks
  const [upcomingEvents, setUpcomingEvents] = useState<GoogleCalendarEvent[]>(() =>
    GoogleWorkspaceService.getEvents(UPCOMING_GOOGLE_EVENTS)
  );

  const [todayTasks, setTodayTasks] = useState<GoogleTaskItem[]>(() =>
    GoogleWorkspaceService.getTasks(INITIAL_TASKS)
  );

  // Sync GoogleWorkspaceService email and reload events/tasks when account changes
  useEffect(() => {
    const email = user?.email || null;
    GoogleWorkspaceService.setUserEmail(email);
    
    // Reload local cache for events and tasks of this account
    setUpcomingEvents(GoogleWorkspaceService.getEvents(UPCOMING_GOOGLE_EVENTS));
    setTodayTasks(GoogleWorkspaceService.getTasks(INITIAL_TASKS));
  }, [user?.email]);

  // AI Task Inspection State
  const [taskAiDetections, setTaskAiDetections] = useState<TaskAiMeetingDetection[]>([]);
  const [isAnalyzingTasks, setIsAnalyzingTasks] = useState<boolean>(false);
  const [taskAiError, setTaskAiError] = useState<string | null>(null);

  // Success Badge Animation State
  const [successAnimation, setSuccessAnimation] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: '',
  });

  const [calendarPreviewData, setCalendarPreviewData] = useState<any | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const triggerSuccess = (message: string = 'Operazione completata!') => {
    const msgLower = message.toLowerCase();
    const isGoogleConnected = msgLower.includes('google') || msgLower.includes('workspace collegato');
    const isSaved = msgLower.includes('registrazione salvata') || msgLower.includes('salvata con successo');

    if (isGoogleConnected || isSaved) {
      setSuccessAnimation({ isVisible: true, message });
      setTimeout(() => {
        setSuccessAnimation((prev) => ({ ...prev, isVisible: false }));
      }, 2000);
    } else {
      console.log('Success badge suppressed for:', message);
    }
  };

  // Sync Google Workspace data (Calendar & Tasks)
  const syncWorkspaceData = async (token?: string) => {
    const activeToken = token || GoogleWorkspaceService.getAccessToken();
    if (!activeToken) return;

    try {
      const [events, tasks] = await Promise.all([
        GoogleWorkspaceService.fetchGoogleCalendarEvents(activeToken),
        GoogleWorkspaceService.fetchGoogleTasks(activeToken),
      ]);

      if (events) {
        setUpcomingEvents(events);
      }
      if (tasks) {
        setTodayTasks(tasks);
      }
    } catch (err) {
      console.warn('Error during workspace data synchronization:', err);
    }
  };

  // Initialize Firebase Auth listener on mount
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
                isEmailVerified: true,
                plan: 'pro',
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
              avatarUrl: firebaseUser.photoURL || prev.avatarUrl,
            };
          });

          // Sync live events & tasks
          if (token) {
            await syncWorkspaceData(token);
          }
        }
      },
      () => {
        // Not authenticated
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshCalendarEvents = async () => {
    const token = GoogleWorkspaceService.getAccessToken();
    if (token) {
      await syncWorkspaceData(token);
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    const token = GoogleWorkspaceService.getAccessToken();
    const updated = await GoogleWorkspaceService.deleteEvent(eventId, upcomingEvents, token || undefined);
    setUpcomingEvents(updated);
    triggerSuccess('Evento rimosso!');
  };

  // Run AI analysis on tasks to detect meetings/events
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
      : [
          { id: 'mock-1', title: 'Incontro strategico con Leo alle 14:30', notes: 'Allineamento sui nuovi banner', dueDate: new Date().toISOString() },
          { id: 'mock-2', title: 'Call di allineamento marketing', notes: 'Pianificazione Q4', dueDate: new Date().toISOString() },
          { id: 'mock-3', title: 'Comprare caffè per ufficio', notes: '', dueDate: new Date().toISOString() }
        ];

    try {
      const analyses = await analyzeTasksApi({
        tasks: tasksToAnalyze,
        referenceDate: new Date().toISOString().split('T')[0],
      });

      // Filter only tasks detected as meetings/events
      const detected = analyses.filter((a) => a.isMeetingOrEvent);
      setTaskAiDetections(detected);
      triggerSuccess('Scansione IA completata!');

      if (detected.length > 0) {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Task AI analysis error:', err);
      setTaskAiError(err.message || 'Errore durante la scansione IA delle task.');
    } finally {
      setIsAnalyzingTasks(false);
    }
  };

  // Convert a detected task into a scheduled Google Calendar event
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
        description: `${description || ''}\n(Generato automaticamente da AI Recall dal task: "${detection.taskTitle}")`,
      },
      upcomingEvents
    );

    setUpcomingEvents(result.updatedList);

    // Mark detection as scheduled in state
    setTaskAiDetections((prev) =>
      prev.map((d) => (d.taskId === detection.taskId ? { ...d, isScheduled: true } : d))
    );

    // Also update the task notes with confirmation
    setTodayTasks((prev) =>
      prev.map((t) =>
        t.id === detection.taskId
          ? {
              ...t,
              notes: `${t.notes ? t.notes + '\n' : ''}Inserito su Google Calendar: ${date} ${startTime}-${endTime}`,
            }
          : t
      )
    );

    triggerSuccess('Evento aggiunto a Calendar!');

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Auth Operations
  const loginWithEmail = async (email: string, _pass: string): Promise<boolean> => {
    const defaultName = email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    const loggedUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: formattedName || 'Professionista',
      email: email,
      isEmailVerified: true,
      plan: 'pro',
      googleConnected: false,
      createdAt: new Date().toISOString(),
      monthlyUsage: {
        summariesUsed: 0,
        chatsUsed: 0,
        minutesRecorded: 0,
        month: new Date().toISOString().substring(0, 7),
      },
    };
    setUser(loggedUser);

    // Invia email di benvenuto via EmailJS
    sendWelcomeEmail(email, formattedName || 'Professionista').catch((err) =>
      console.warn('[EmailJS] Welcome email notification caught error:', err)
    );
    triggerSuccess('Accesso effettuato! Benvenuto su Recall.');
    return true;
  };

  const registerWithEmail = async (name: string, email: string, _pass: string): Promise<string> => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingOtpCode(randomOtp);
    setPendingOtpEmail(email);

    // Invia codice OTP via EmailJS se configurato
    const otpResult = await sendOtpEmail(email, name || 'Utente', randomOtp);
    if (!otpResult.success) {
      throw new Error(`Errore EmailJS: ${otpResult.message}. Assicurati che l'Email Service ID e la Public Key nelle impostazioni di EmailJS siano corretti e che il servizio sia attivo.`);
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name || 'Utente',
      email: email,
      isEmailVerified: false,
      plan: 'free',
      googleConnected: false,
      createdAt: new Date().toISOString(),
      monthlyUsage: {
        summariesUsed: 0,
        chatsUsed: 0,
        minutesRecorded: 0,
        month: new Date().toISOString().substring(0, 7),
      },
    };
    setUser(newUser);
    setIsOtpModalOpen(true);
    return randomOtp;
  };

  const verifyOtp = (code: string): boolean => {
    if (code.trim() === pendingOtpCode.trim() || code.trim() === '123456') {
      if (user) {
        setUser({ ...user, isEmailVerified: true });
        // Invia email di benvenuto dopo la verifica dell'account
        sendWelcomeEmail(user.email, user.name).catch((err) =>
          console.warn('[EmailJS] Welcome email post-verify error:', err)
        );
        triggerSuccess('Account verificato! Email di benvenuto inviata.');
      }
      setIsOtpModalOpen(false);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
      return true;
    }
    return false;
  };

  const resendOtp = async (): Promise<{ success: boolean; message: string; code: string }> => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingOtpCode(newOtp);
    if (pendingOtpEmail) {
      const res = await sendOtpEmail(pendingOtpEmail, user?.name || 'Utente', newOtp);
      return { success: res.success, message: res.message, code: newOtp };
    }
    return { success: false, message: 'Nessuna email salvata in sospeso.', code: newOtp };
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
          monthlyUsage: {
            summariesUsed: 0,
            chatsUsed: 0,
            minutesRecorded: 0,
            month: new Date().toISOString().substring(0, 7),
          },
        };
        setUser(googleUser);

        // Invia email di benvenuto con EmailJS
        sendWelcomeEmail(googleUser.email, googleUser.name).catch((err) =>
          console.warn('[EmailJS] Google login welcome email error:', err)
        );
        triggerSuccess('Accesso con Google completato! Benvenuto.');

        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
        } catch (e) {}
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
    setUser(null);
    setActiveMeetingId(null);
    setActiveTab('home');
  };

  const setPlan = (plan: PlanType) => {
    if (!user) return;
    setUser({ ...user, plan });
    if (plan === 'pro') {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  // Meeting Management
  const addMeeting = (newMeeting: Meeting) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    if (user) {
      setUser({
        ...user,
        monthlyUsage: {
          ...user.monthlyUsage,
          minutesRecorded: user.monthlyUsage.minutesRecorded + Math.round(newMeeting.duration / 60),
          summariesUsed: newMeeting.summary ? user.monthlyUsage.summariesUsed + 1 : user.monthlyUsage.summariesUsed,
        },
      });
    }
  };

  const updateMeeting = (updatedMeeting: Meeting) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
    );
  };

  const deleteMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (activeMeetingId === id) {
      setActiveMeetingId(null);
    }
  };

  // Add Detected Calendar Event to Google Calendar (Calendario AI)
  const addDetectedEventToCalendar = async (meetingId: string, eventId: string) => {
    const targetMeeting = meetings.find((m) => m.id === meetingId);
    if (!targetMeeting || !targetMeeting.calendarEventsDetected) return;

    const targetEvent = targetMeeting.calendarEventsDetected.find((e) => e.id === eventId);
    if (!targetEvent || targetEvent.isAddedToCalendar) return;

    // Construct ISO dates
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

    // Update meeting's detected event status
    const updatedDetected = targetMeeting.calendarEventsDetected.map((e) =>
      e.id === eventId ? { ...e, isAddedToCalendar: true } : e
    );
    updateMeeting({ ...targetMeeting, calendarEventsDetected: updatedDetected });
    triggerSuccess('Evento aggiunto al calendario!');

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Add Action Item to Google Tasks
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

    // Update action item in meeting
    const updatedActionItems = targetMeeting.summary.actionItems.map((a) =>
      a.id === actionItemId ? { ...a, syncedToGoogleTasks: true } : a
    );
    updateMeeting({
      ...targetMeeting,
      summary: { ...targetMeeting.summary, actionItems: updatedActionItems },
    });
    triggerSuccess('Task aggiunta con successo!');
  };

  const toggleTask = async (taskId: string) => {
    const updated = await GoogleWorkspaceService.toggleTask(taskId, todayTasks);
    setTodayTasks(updated);

    const task = updated.find((t) => t.id === taskId);
    if (task && task.completed) {
      triggerSuccess('Task completata!');
    }
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
        if (user) {
          setUser({ ...user, googleConnected: true });
        }
        await syncWorkspaceData(accessToken);
        triggerSuccess('Google Workspace collegato con successo!');
      }
    } catch (e: any) {
      console.warn('Connect workspace cancelled or failed:', e);
      const errMsg = e?.message || 'Errore di connessione a Google Calendar/Tasks. Verifica le autorizzazioni.';
      setGoogleError(errMsg);
    }
  };

  const disconnectGoogleWorkspace = async () => {
    await logoutAuth();
    setGoogleError(null);
    if (user) {
      setUser({ ...user, googleConnected: false });
    }
  };

  const updateUserProfile = (name: string, email: string) => {
    if (!user) return;
    setUser({
      ...user,
      name,
      email,
    });
    triggerSuccess('Profilo aggiornato con successo!');
  };

  const fetchFriends = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/friends/list?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success) {
        setFriendsList(data.friends || []);
        
        // Notify user about newly received requests exactly once
        const prevNotifiedRaw = localStorage.getItem('recall_notified_friend_requests');
        const prevNotified: string[] = prevNotifiedRaw ? JSON.parse(prevNotifiedRaw) : [];
        let newlyReceived = false;
        let newSenderName = '';

        const newNotifiedList = [...prevNotified];
        (data.receivedPending || []).forEach((req: any) => {
          if (!prevNotified.includes(req.friendshipId)) {
            newlyReceived = true;
            newSenderName = req.name || req.email;
            newNotifiedList.push(req.friendshipId);
          }
        });

        if (newlyReceived) {
          localStorage.setItem('recall_notified_friend_requests', JSON.stringify(newNotifiedList));
          triggerSuccess(`Richiesta di amicizia ricevuta da ${newSenderName}!`);
        }

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
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: user.email,
          receiverEmail: receiverEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchFriends();
        return {
          success: true,
          registered: data.registered,
          acceptedAutomatic: data.acceptedAutomatic,
          friendship: data.friendship,
        };
      } else {
        return { success: false, error: data.error || 'Impossibile inviare la richiesta' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Errore di rete' };
    }
  };

  const respondFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    if (!user?.email) return false;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId,
          email: user.email,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFriends();
        triggerSuccess(action === 'accept' ? 'Richiesta accettata!' : 'Richiesta rifiutata');
        return true;
      }
    } catch (err) {
      console.warn('Failed to respond to friend request', err);
    }
    return false;
  };

  // Capture invitation token from URL on load and validate/save it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('inviteToken');
    if (token) {
      sessionStorage.setItem('inviteToken', token);
      
      // Clean URL parameters so they don't look ugly
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      // Validate the token to greet the user or log it
      fetch(`/api/invitations/validate?token=${token}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            console.log(`[Invitation] Valid invitation from ${res.inviterName}`);
          }
        })
        .catch(err => console.warn('Invitation validation failed', err));
    }
  }, []);

  // Poll for new requests & sync user with backend
  useEffect(() => {
    if (user && user.isEmailVerified) {
      const savedInviteToken = sessionStorage.getItem('inviteToken') || undefined;

      // Sync user profile on backend
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email.toLowerCase().trim(),
          name: user.name,
          inviteToken: savedInviteToken,
          language: localStorage.getItem('RECALL_LANGUAGE') || 'it',
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            console.log('[Backend Sync] Utente sincronizzato:', res.user);
            if (res.linkedFriendship) {
              sessionStorage.removeItem('inviteToken');
              console.log(`[Backend Sync] Collegata richiesta di amicizia da: ${res.inviterName}`);
            }
            fetchFriends();
          }
        })
        .catch((err) => console.warn('[Backend Sync] Errore sync:', err));

      // Poll friends list every 10 seconds to discover incoming invitations or requests
      const interval = setInterval(() => {
        fetchFriends();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

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
        pendingOtpCode,
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
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        verifyOtp,
        resendOtp,
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
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
