import { GoogleCalendarEvent, GoogleTaskItem } from '../types';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
];

export class GoogleWorkspaceService {
  private static STORAGE_KEY_CALENDAR = 'recall_calendar_events';
  private static STORAGE_KEY_TASKS = 'recall_tasks_items';
  private static accessToken: string | null = null;
  private static userEmail: string | null = null;

  static setUserEmail(email: string | null) {
    this.userEmail = email;
  }

  static getUserEmail(): string | null {
    return this.userEmail;
  }

  private static getStorageKeyCalendar(): string {
    return this.userEmail ? `${this.STORAGE_KEY_CALENDAR}_email_${this.userEmail}` : this.STORAGE_KEY_CALENDAR;
  }

  private static getStorageKeyTasks(): string {
    return this.userEmail ? `${this.STORAGE_KEY_TASKS}_email_${this.userEmail}` : this.STORAGE_KEY_TASKS;
  }

  static setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  static getAccessToken(): string | null {
    return this.accessToken;
  }

  // ==========================================
  // GOOGLE CALENDAR
  // ==========================================

  // Fetch real Google Calendar Events from the Google Calendar API
  static async fetchGoogleCalendarEvents(accessToken?: string): Promise<GoogleCalendarEvent[] | null> {
    const token = accessToken || this.accessToken;
    if (!token) return null;

    try {
      // Query events from start of today up to 30 days ahead
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
          startOfToday.toISOString()
        )}&maxResults=30&singleEvents=true&orderBy=startTime&conferenceDataVersion=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        console.warn('Google Calendar API returned error status:', res.status);
        return null;
      }

      const data = await res.json();
      if (!data.items) return [];

      const rawEvents: GoogleCalendarEvent[] = data.items.map((item: any) => ({
        id: item.id || `gcal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.summary || 'Riunione senza titolo',
        start: item.start?.dateTime || item.start?.date || new Date().toISOString(),
        end: item.end?.dateTime || item.end?.date || new Date(Date.now() + 3600000).toISOString(),
        description: item.description || '',
        location: item.location || (item.hangoutLink ? 'Google Meet' : ''),
        meetUrl: item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri,
        attendees: item.attendees?.map((a: any) => a.displayName || a.email) || [],
        isRecallLinked: Boolean(item.description?.includes('Recall') || item.extendedProperties?.private?.recallLinked),
      }));

      // Deduplicate to avoid repeating identical events in the UI
      const seen = new Set<string>();
      const events: GoogleCalendarEvent[] = [];
      for (const e of rawEvents) {
        const key = e.id;
        const visualKey = `${e.title.trim().toLowerCase()}_${e.start}`;
        if (seen.has(key) || seen.has(visualKey)) continue;
        seen.add(key);
        seen.add(visualKey);
        events.push(e);
      }

      this.saveEvents(events);
      return events;
    } catch (err) {
      console.warn('Failed fetching Google Calendar events:', err);
      return null;
    }
  }

  // Get cached calendar events
  static getEvents(initialEvents: GoogleCalendarEvent[] = []): GoogleCalendarEvent[] {
    try {
      const stored = localStorage.getItem(this.getStorageKeyCalendar());
      if (stored) {
        const parsed: GoogleCalendarEvent[] = JSON.parse(stored);
        const seen = new Set<string>();
        const deduplicated: GoogleCalendarEvent[] = [];
        for (const e of parsed) {
          const key = e.id;
          const visualKey = `${e.title.trim().toLowerCase()}_${e.start}`;
          if (seen.has(key) || seen.has(visualKey)) continue;
          seen.add(key);
          seen.add(visualKey);
          deduplicated.push(e);
        }
        return deduplicated;
      }
    } catch (e) {
      console.warn('Error loading calendar events:', e);
    }
    return initialEvents;
  }

  // Save calendar events to local storage
  static saveEvents(events: GoogleCalendarEvent[]) {
    try {
      localStorage.setItem(this.getStorageKeyCalendar(), JSON.stringify(events));
    } catch (e) {
      console.warn('Error saving calendar events:', e);
    }
  }

  // Add event to Google Calendar (calls real API)
  static async addEvent(
    eventData: {
      title: string;
      start: string; // ISO
      end: string;   // ISO
      description?: string;
      location?: string;
      attendees?: string[];
      meetUrl?: string;
      linkedMeetingId?: string;
    },
    existingEvents: GoogleCalendarEvent[],
    token?: string
  ): Promise<{ event: GoogleCalendarEvent; updatedList: GoogleCalendarEvent[] }> {
    const activeToken = token || this.accessToken;

    let apiEventId = `gcal_${Date.now()}`;
    let hangoutLink = eventData.meetUrl;

    if (activeToken) {
      try {
        const payload = {
          summary: eventData.title,
          description: eventData.description || 'Pianificato con Recall AI Meeting Assistant',
          start: { dateTime: eventData.start },
          end: { dateTime: eventData.end },
          location: eventData.location,
          conferenceData: {
            createRequest: {
              requestId: `meet_${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const created = await response.json();
          apiEventId = created.id || apiEventId;
          hangoutLink = created.hangoutLink || hangoutLink;
        }
      } catch (err) {
        console.warn('Could not post directly to Google Calendar API:', err);
      }
    }

    const newEvent: GoogleCalendarEvent = {
      id: apiEventId,
      title: eventData.title,
      start: eventData.start,
      end: eventData.end,
      description: eventData.description,
      location: eventData.location || 'Google Meet',
      meetUrl: hangoutLink || `https://meet.google.com/rec-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`,
      attendees: eventData.attendees || [],
      isRecallLinked: true,
      linkedMeetingId: eventData.linkedMeetingId,
    };

    const rawList = [newEvent, ...existingEvents];
    const seen = new Set<string>();
    const updatedList: GoogleCalendarEvent[] = [];
    for (const e of rawList) {
      const key = e.id;
      const visualKey = `${e.title.trim().toLowerCase()}_${e.start}`;
      if (seen.has(key) || seen.has(visualKey)) continue;
      seen.add(key);
      seen.add(visualKey);
      updatedList.push(e);
    }
    this.saveEvents(updatedList);
    return { event: newEvent, updatedList };
  }

  // Delete an event from Google Calendar API & Local state
  static async deleteEvent(
    eventId: string,
    existingEvents: GoogleCalendarEvent[],
    token?: string
  ): Promise<GoogleCalendarEvent[]> {
    const activeToken = token || this.accessToken;
    if (activeToken && eventId && !eventId.startsWith('mock_') && !eventId.startsWith('gcal_')) {
      try {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          }
        );
      } catch (err) {
        console.warn('Could not delete from Google Calendar API:', err);
      }
    }

    const updated = existingEvents.filter((e) => e.id !== eventId);
    this.saveEvents(updated);
    return updated;
  }

  // ==========================================
  // GOOGLE TASKS
  // ==========================================

  // Fetch real Google Tasks from Google Tasks API
  static async fetchGoogleTasks(accessToken?: string): Promise<GoogleTaskItem[] | null> {
    const token = accessToken || this.accessToken;
    if (!token) return null;

    try {
      // First get primary task list or use @default
      const res = await fetch(
        'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=50',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        console.warn('Google Tasks API returned error status:', res.status);
        return null;
      }

      const data = await res.json();
      if (!data.items) return [];

      const tasks: GoogleTaskItem[] = data.items.map((item: any) => ({
        id: item.id,
        title: item.title || 'Attività senza titolo',
        notes: item.notes || '',
        dueDate: item.due ? new Date(item.due).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'Da pianificare',
        completed: item.status === 'completed',
      }));

      this.saveTasks(tasks);
      return tasks;
    } catch (err) {
      console.warn('Failed fetching Google Tasks:', err);
      return null;
    }
  }

  // Get cached Tasks
  static getTasks(initialTasks: GoogleTaskItem[] = []): GoogleTaskItem[] {
    try {
      const stored = localStorage.getItem(this.getStorageKeyTasks());
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error loading tasks:', e);
    }
    return initialTasks;
  }

  // Save Tasks
  static saveTasks(tasks: GoogleTaskItem[]) {
    try {
      localStorage.setItem(this.getStorageKeyTasks(), JSON.stringify(tasks));
    } catch (e) {
      console.warn('Error saving tasks:', e);
    }
  }

  // Add Task to Google Tasks API & Local state
  static async addTask(
    taskData: {
      title: string;
      notes?: string;
      dueDate?: string;
      meetingId?: string;
    },
    existingTasks: GoogleTaskItem[],
    token?: string
  ): Promise<{ task: GoogleTaskItem; updatedList: GoogleTaskItem[] }> {
    const activeToken = token || this.accessToken;
    let taskId = `task_${Date.now()}`;

    if (activeToken) {
      try {
        const payload: any = {
          title: taskData.title,
          notes: taskData.notes || '',
        };

        const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          taskId = created.id || taskId;
        }
      } catch (err) {
        console.warn('Could not post to Google Tasks API:', err);
      }
    }

    const newTask: GoogleTaskItem = {
      id: taskId,
      title: taskData.title,
      notes: taskData.notes,
      dueDate: taskData.dueDate || 'Oggi',
      completed: false,
      meetingId: taskData.meetingId,
    };

    const updatedList = [newTask, ...existingTasks];
    this.saveTasks(updatedList);
    return { task: newTask, updatedList };
  }

  // Toggle Task Completion in Google Tasks API & Local state
  static async toggleTask(
    taskId: string,
    existingTasks: GoogleTaskItem[],
    token?: string
  ): Promise<GoogleTaskItem[]> {
    const targetTask = existingTasks.find((t) => t.id === taskId);
    const newStatus = targetTask ? !targetTask.completed : false;

    const activeToken = token || this.accessToken;
    if (activeToken && taskId && !taskId.startsWith('task_')) {
      try {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus ? 'completed' : 'needsAction',
          }),
        });
      } catch (err) {
        console.warn('Could not update Google Tasks API:', err);
      }
    }

    const updated = existingTasks.map((t) =>
      t.id === taskId ? { ...t, completed: newStatus } : t
    );
    this.saveTasks(updated);
    return updated;
  }

  // Create Google Doc for Concept Map
  static async createGoogleDocForConceptMap(
    meetingTitle: string,
    mapData: {
      nodes: Array<{ id: string; label: string; type: string }>;
      links: Array<{ from: string; to: string; relation: string }>;
    },
    token?: string
  ): Promise<string | null> {
    const activeToken = token || this.accessToken;
    if (!activeToken) return null;

    try {
      // 1. Create a blank Google Document
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Recall AI - Mappa Concettuale: ${meetingTitle}`,
        }),
      });

      if (!createRes.ok) {
        console.error('Failed to create Google Doc', await createRes.text());
        return null;
      }

      const doc = await createRes.json();
      const documentId = doc.documentId;
      if (!documentId) return null;

      // 2. Format a gorgeous textual representation of the Mind Map
      let docText = `RECALL AI - MAPPA CONCETTUALE E STRUTTURA LOGICA\n`;
      docText += `Riunione: ${meetingTitle}\n`;
      docText += `Data esportazione: ${new Date().toLocaleDateString('it-IT')} ore ${new Date().toLocaleTimeString('it-IT')}\n`;
      docText += `========================================================================\n\n`;

      const centralNode = mapData.nodes.find(n => n.type === 'central');
      docText += `📌 FOCUS CENTRALE DELLA DISCUSSIONE:\n`;
      docText += `• "${centralNode?.label || meetingTitle}"\n\n`;

      docText += `🌿 ARGOMENTI CHIAVE ED ELEMENTI COGNITIVI:\n`;
      const nonCentral = mapData.nodes.filter(n => n.type !== 'central');
      nonCentral.forEach((n, idx) => {
        const typeStr = n.type === 'topic' ? 'Argomento' : 'Decisione / Dettaglio';
        docText += `${idx + 1}. [${typeStr}] ${n.label}\n`;
      });
      docText += `\n`;

      docText += `🔗 RELAZIONI E COLLEGAMENTI SEMANTICI:\n`;
      mapData.links.forEach((l) => {
        const fromNode = mapData.nodes.find(n => n.id === l.from);
        const toNode = mapData.nodes.find(n => n.id === l.to);
        if (fromNode && toNode) {
          docText += `• ["${fromNode.label}"] ──( ${l.relation.toUpperCase()} )──> ["${toNode.label}"]\n`;
        }
      });
      docText += `\n\n========================================================================\n`;
      docText += `Generato automaticamente dall'intelligenza artificiale di Recall AI.\n`;

      // 3. Update the document with text content
      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: docText,
                endOfSegmentLocation: {},
              },
            },
          ],
        }),
      });

      if (!updateRes.ok) {
        console.error('Failed to update Google Doc text', await updateRes.text());
        return null;
      }

      // Return the URL to open the document
      return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (err) {
      console.error('Error creating Google Doc:', err);
      return null;
    }
  }
}
