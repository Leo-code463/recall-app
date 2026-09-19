export type PlanType = 'free' | 'pro';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  plan: PlanType;
  avatarUrl?: string;
  googleConnected: boolean;
  googleAccessToken?: string;
  createdAt: string;
  monthlyUsage: {
    summariesUsed: number;
    chatsUsed: number;
    minutesRecorded: number;
    month: string;
  };
}

export interface Speaker {
  id: string;
  name: string;
  role?: string;
  color: string;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  timeOffset: number; // in seconds
  text: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'Alta' | 'Media' | 'Bassa';
  isCompleted?: boolean;
  syncedToGoogleTasks?: boolean;
}

export interface MindMapBranch {
  title: string;
  ideas: string[];
}

export interface MindMap {
  core: string;
  branches: MindMapBranch[];
}

export interface MeetingSummary {
  overview: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'constructive';
  keyQuotes?: string[];
  mindMap?: MindMap;
}

export interface DetectedCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description: string;
  location?: string;
  attendees?: string[];
  confidence?: number;
  isAddedToCalendar?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // ISO date string
  duration: number; // duration in seconds
  tags: string[];
  status: 'processing' | 'ready' | 'error';
  speakers: Speaker[];
  transcript: TranscriptSegment[];
  summary?: MeetingSummary;
  calendarEventsDetected?: DetectedCalendarEvent[];
  chatHistory?: ChatMessage[];
  audioUrl?: string;
  category?: 'Riunione' | 'Colloquio' | 'Brainstorming' | '1-on-1' | 'Chiamata';
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO or date string
  end: string;
  meetUrl?: string;
  location?: string;
  attendees?: string[];
  description?: string;
  isRecallLinked?: boolean;
  linkedMeetingId?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  completed: boolean;
  meetingId?: string;
}

export interface TaskAiMeetingDetection {
  taskId: string;
  taskTitle: string;
  isMeetingOrEvent: boolean;
  confidence: number;
  reasoning: string;
  suggestedEvent?: {
    title: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    location: string;
    attendees: string[];
    description: string;
  };
  isScheduled?: boolean;
}

export type NavTab = 'home' | 'search' | 'agenda' | 'profile';
