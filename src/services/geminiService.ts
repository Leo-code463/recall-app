import { PlanType, MeetingSummary, DetectedCalendarEvent, TaskAiMeetingDetection } from '../types';

export interface ProcessedMeetingResult {
  title: string;
  language: string;
  category?: 'Riunione' | 'Colloquio' | 'Brainstorming' | '1-on-1' | 'Chiamata';
  speakers: Array<{ id: string; name: string; role?: string; color: string }>;
  segments: Array<{ id: string; speakerId: string; speakerName: string; timeOffset: number; text: string }>;
  summary: MeetingSummary;
  calendarEventsDetected: DetectedCalendarEvent[];
}

function cleanBase64(input?: string): string | undefined {
  if (!input) return undefined;
  const commaIdx = input.indexOf(',');
  if (commaIdx !== -1) {
    return input.slice(commaIdx + 1).trim();
  }
  return input.trim();
}

function parseErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  let raw = "";
  if (typeof err === 'string') {
    try {
      const parsed = JSON.parse(err);
      if (parsed.error && parsed.error.message) raw = parsed.error.message;
      else if (parsed.message) raw = parsed.message;
      else raw = err;
    } catch (e) {
      raw = err;
    }
  } else if (err.error) {
    if (typeof err.error === 'string') return parseErrorMessage(err.error, fallback);
    if (err.error.message) raw = err.error.message;
    else raw = JSON.stringify(err.error);
  } else {
    raw = err.message || fallback;
  }

  if (raw.includes("high demand") || raw.includes("503") || raw.includes("overloaded") || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("spikes in demand")) {
    return "I server IA stanno elaborando un elevato volume di richieste. Riprova tra qualche istante.";
  }
  if (raw.includes("GEMINI_API_KEY")) {
    return "Chiave API Gemini non configurata o non valida.";
  }
  return raw || fallback;
}

async function parseResponseSafe(response: Response, fallbackError: string): Promise<any> {
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    if (!response.ok) {
      throw new Error(`${fallbackError} (${response.status})`);
    }
    throw new Error(fallbackError);
  }

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.error || json?.message || fallbackError;
    throw new Error(parseErrorMessage(errorMsg, fallbackError));
  }

  return json;
}

export function fallbackHeuristicTaskAnalysis(
  tasks: Array<{ id: string; title: string; notes?: string; dueDate?: string }>,
  referenceDate: string
): TaskAiMeetingDetection[] {
  const meetingKeywords = [
    'call', 'riunione', 'meeting', 'colloquio', 'allineamento', 'intervista',
    'appuntamento', 'sync', 'catch-up', 'catchup', 'demo', 'webinar', 'zoom',
    'meet', 'conferenza', 'visita', 'chiacchierata'
  ];

  return tasks.map((task) => {
    const textLower = `${task.title} ${task.notes || ''}`.toLowerCase();
    const isMeeting = meetingKeywords.some((kw) => textLower.includes(kw));

    const timeMatch = textLower.match(/(?:ore|alle|at)?\s*([01]?[0-9]|2[0-3])[:.]([0-5][0-9])/i);
    const hourOnlyMatch = textLower.match(/(?:ore|alle)\s*([01]?[0-9]|2[0-3])\b/i);

    let startTime = '10:00';
    let endTime = '11:00';

    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = timeMatch[2].padStart(2, '0');
      startTime = `${h}:${m}`;
      const endH = (parseInt(h, 10) + 1).toString().padStart(2, '0');
      endTime = `${endH}:${m}`;
    } else if (hourOnlyMatch) {
      const h = hourOnlyMatch[1].padStart(2, '0');
      startTime = `${h}:00`;
      const endH = (parseInt(h, 10) + 1).toString().padStart(2, '0');
      endTime = `${endH}:00`;
    }

    if (isMeeting) {
      return {
        taskId: task.id,
        taskTitle: task.title,
        isMeetingOrEvent: true,
        confidence: 0.88,
        reasoning: 'Rilevata indicazione di incontro/riunione nel titolo o nelle note',
        suggestedEvent: {
          title: task.title,
          date: task.dueDate?.split('T')[0] || referenceDate,
          startTime,
          endTime,
          location: textLower.includes('presenza') || textLower.includes('ufficio') ? 'Ufficio' : 'Google Meet',
          attendees: [],
          description: task.notes || `Attività sincronizzata da Task: ${task.title}`,
        },
        isScheduled: false,
      };
    }

    return {
      taskId: task.id,
      taskTitle: task.title,
      isMeetingOrEvent: false,
      confidence: 0.95,
      reasoning: 'Attività operativa individuale, non richiede incontro su calendario',
      isScheduled: false,
    };
  });
}

export async function processMeetingFastApi(params: {
  audioBase64?: string;
  mimeType?: string;
  liveTranscript?: string;
  plan: PlanType;
  languageHint?: string;
  referenceDate?: string;
}): Promise<ProcessedMeetingResult> {
  const sanitizedAudio = cleanBase64(params.audioBase64);

  const response = await fetch('/api/process-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: sanitizedAudio,
      mimeType: params.mimeType || 'audio/webm',
      liveTranscript: params.liveTranscript,
      plan: params.plan,
      languageHint: params.languageHint || 'it',
      referenceDate: params.referenceDate || new Date().toISOString().split('T')[0],
    }),
  });

  const result = await parseResponseSafe(response, 'Errore durante l’elaborazione della registrazione');
  if (!result.success || !result.data) {
    throw new Error(parseErrorMessage(result, 'Risultato non valido restituito dal server'));
  }

  const data = result.data;
  const now = Date.now();

  const formattedSummary: MeetingSummary = {
    overview: data.summary?.overview || 'Riassunto generato da AI.',
    keyDecisions: data.summary?.keyDecisions || [],
    actionItems: (data.summary?.actionItems || []).map((item: any, idx: number) => ({
      id: `act_gen_${now}_${idx}`,
      task: item.task || 'Nuova attività',
      assignee: item.assignee || 'Team',
      dueDate: item.dueDate || '',
      priority: item.priority || 'Media',
      isCompleted: false,
      syncedToGoogleTasks: false,
    })),
    topics: data.summary?.topics || [],
    sentiment: data.summary?.sentiment || 'positive',
    keyQuotes: data.summary?.keyQuotes || [],
  };

  const formattedEvents: DetectedCalendarEvent[] = (data.calendarEvents || []).map((ev: any, idx: number) => ({
    id: `cal_det_${now}_${idx}`,
    title: ev.title || 'Nuovo Impegno',
    date: ev.date || new Date().toISOString().split('T')[0],
    startTime: ev.startTime || '10:00',
    endTime: ev.endTime || '11:00',
    description: ev.description || '',
    location: ev.location || 'Google Meet',
    attendees: ev.attendees || [],
    confidence: ev.confidence || 0.95,
    isAddedToCalendar: false,
  }));

  return {
    title: data.title || 'Nuova Riunione',
    language: data.language || 'it',
    category: data.category || 'Riunione',
    speakers: data.speakers && data.speakers.length > 0
      ? data.speakers
      : [{ id: 'spk_1', name: 'Interlocutore 1', color: '#761EAF' }],
    segments: data.segments && data.segments.length > 0
      ? data.segments
      : [{ id: 'seg_1', speakerId: 'spk_1', speakerName: 'Interlocutore 1', timeOffset: 0, text: params.liveTranscript || 'Trascrizione completata.' }],
    summary: formattedSummary,
    calendarEventsDetected: formattedEvents,
  };
}

export async function transcribeAudioApi(params: {
  audioBase64?: string;
  mimeType?: string;
  liveTranscript?: string;
  plan: PlanType;
  languageHint?: string;
}): Promise<{
  title: string;
  language: string;
  category?: 'Riunione' | 'Colloquio' | 'Brainstorming' | '1-on-1' | 'Chiamata';
  speakers: Array<{ id: string; name: string; role?: string; color: string }>;
  segments: Array<{ id: string; speakerId: string; speakerName: string; timeOffset: number; text: string }>;
}> {
  const sanitizedAudio = cleanBase64(params.audioBase64);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: sanitizedAudio,
      mimeType: params.mimeType || 'audio/webm',
      liveTranscript: params.liveTranscript,
      plan: params.plan,
      languageHint: params.languageHint || 'it',
    }),
  });

  const result = await parseResponseSafe(response, 'Errore nella trascrizione audio');
  if (!result.success || !result.data) {
    throw new Error(parseErrorMessage(result, 'Trascrizione non valida restituita dal server'));
  }

  return result.data;
}

export async function summarizeMeetingApi(params: {
  transcript: any;
  meetingTitle: string;
  plan: PlanType;
}): Promise<MeetingSummary> {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: params.transcript,
      meetingTitle: params.meetingTitle,
      plan: params.plan,
    }),
  });

  const result = await parseResponseSafe(response, 'Errore nel riassunto IA');
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Dati riassunto non disponibili');
  }

  return {
    overview: result.data.overview || '',
    keyDecisions: result.data.keyDecisions || [],
    actionItems: (result.data.actionItems || []).map((item: any, idx: number) => ({
      id: `act_gen_${Date.now()}_${idx}`,
      task: item.task || '',
      assignee: item.assignee || 'Team',
      dueDate: item.dueDate || '',
      priority: item.priority || 'Media',
      isCompleted: false,
      syncedToGoogleTasks: false,
    })),
    topics: result.data.topics || [],
    sentiment: result.data.sentiment || 'positive',
    keyQuotes: result.data.keyQuotes || [],
  };
}

export async function detectCalendarEventsApi(params: {
  transcript: any;
  meetingDate?: string;
}): Promise<DetectedCalendarEvent[]> {
  const response = await fetch('/api/detect-calendar-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: params.transcript,
      meetingDate: params.meetingDate || new Date().toISOString().split('T')[0],
    }),
  });

  const result = await parseResponseSafe(response, 'Errore nel rilevamento impegni');
  return (result.events || []).map((ev: any, idx: number) => ({
    id: `cal_det_${Date.now()}_${idx}`,
    title: ev.title || 'Nuovo Impegno',
    date: ev.date || new Date().toISOString().split('T')[0],
    startTime: ev.startTime || '10:00',
    endTime: ev.endTime || '11:00',
    description: ev.description || '',
    location: ev.location || 'Google Meet',
    attendees: ev.attendees || [],
    confidence: ev.confidence || 0.9,
    isAddedToCalendar: false,
  }));
}

// Inspect Google Tasks to detect if any task is an event or meeting
export async function analyzeTasksApi(params: {
  tasks: Array<{ id: string; title: string; notes?: string; dueDate?: string }>;
  referenceDate?: string;
}): Promise<TaskAiMeetingDetection[]> {
  const refDate = params.referenceDate || new Date().toISOString().split('T')[0];
  if (!params.tasks || params.tasks.length === 0) {
    return [];
  }

  try {
    const response = await fetch('/api/analyze-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: params.tasks,
        referenceDate: refDate,
      }),
    });

    const result = await parseResponseSafe(response, 'Errore durante l’analisi delle task con IA');
    if (result && Array.isArray(result.analyses)) {
      return result.analyses.map((item: any) => ({
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        isMeetingOrEvent: Boolean(item.isMeetingOrEvent),
        confidence: item.confidence || 0.9,
        reasoning: item.reasoning || '',
        suggestedEvent: item.suggestedEvent
          ? {
              title: item.suggestedEvent.title || item.taskTitle,
              date: item.suggestedEvent.date || refDate,
              startTime: item.suggestedEvent.startTime || '10:00',
              endTime: item.suggestedEvent.endTime || '11:00',
              location: item.suggestedEvent.location || 'Google Meet',
              attendees: item.suggestedEvent.attendees || [],
              description: item.suggestedEvent.description || '',
            }
          : undefined,
        isScheduled: false,
      }));
    }
  } catch (err: any) {
    console.warn('API task analysis failed, using heuristic analysis fallback:', err);
    return fallbackHeuristicTaskAnalysis(params.tasks, refDate);
  }

  return fallbackHeuristicTaskAnalysis(params.tasks, refDate);
}

export async function chatWithMeetingAiApi(params: {
  question: string;
  transcript: any;
  summary?: MeetingSummary;
  meetingTitle: string;
  plan: PlanType;
}): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: params.question,
      transcript: params.transcript,
      summary: params.summary,
      meetingTitle: params.meetingTitle,
      plan: params.plan,
    }),
  });

  const result = await parseResponseSafe(response, 'Errore nella chat IA');
  return result.answer || 'Nessuna risposta generata.';
}
