import { apiFetch } from './apiClient';

/**
 * Helper per convertire trascrizioni in formato stringa semplice
 */
function normalizeTranscript(transcript: any): string {
  if (typeof transcript === 'string') return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((seg) => (typeof seg === 'string' ? seg : `${seg.speakerName || 'Interlocutore'}: ${seg.text || ''}`))
      .join('\n');
  }
  return String(transcript || '');
}

/**
 * Analizza un singolo blocco di trascrizione in background (~300ms)
 */
export async function processChunkApi(chunkText: string): Promise<{
  summaryPoint: string;
  detectedActionItems: string[];
}> {
  try {
    const res = await apiFetch('/api/ai/process-chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkText }),
    });

    if (!res.ok) throw new Error('Errore chunk processing');
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn('Fallback chunk processing locale:', err);
    return { summaryPoint: chunkText, detectedActionItems: [] };
  }
}

/**
 * Sintesi finale: unifica i mini-riassunti già calcolati durante la registrazione
 */
export async function summarizeChunksFinalApi(params: {
  chunkSummaries: string[];
  actionItems: string[];
  totalDuration: number;
  plan?: string;
  languageHint?: string;
}) {
  const res = await apiFetch('/api/ai/summarize-chunks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Errore nella sintesi finale a blocchi.');
  }

  const json = await res.json();
  return json.data || json;
}

/**
 * Trascrizione e analisi completa dell'audio / testo
 */
export async function transcribeAudioApi(params: {
  text: string;
  plan?: string;
  languageHint?: string;
}) {
  const res = await apiFetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Errore durante l'elaborazione dell'audio.");
  }

  const json = await res.json();
  return json.data || json;
}

/**
 * Genera o rigenera la sintesi esecutiva della riunione
 */
export async function summarizeMeetingApi(params: {
  transcript: any;
  title?: string;
  meetingTitle?: string;
  plan?: string;
  languageHint?: string;
}) {
  const title = params.title || params.meetingTitle;
  const res = await apiFetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      meetingTitle: title,
      transcript: normalizeTranscript(params.transcript),
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Errore durante la generazione del riassunto.');
  }

  const json = await res.json();
  return json.data || json;
}

/**
 * Rileva eventi e date da aggiungere a Google Calendar
 */
export async function detectCalendarEventsApi(params: {
  transcript: any;
  summary?: any;
  meetingDate?: string;
}) {
  const res = await apiFetch('/api/detect-calendar-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      transcript: normalizeTranscript(params.transcript),
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Errore nel rilevamento degli eventi.');
  }

  const json = await res.json();
  return json.events || json.data || [];
}

/**
 * Chat interattiva con l'assistente IA sulla riunione
 */
export async function chatWithMeetingAiApi(params: {
  meetingId?: string;
  transcript: any;
  summary?: any;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userQuestion?: string;
  question?: string;
  meetingTitle?: string;
  plan?: string;
}) {
  const question = params.userQuestion || params.question || '';
  const res = await apiFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      question,
      transcript: normalizeTranscript(params.transcript),
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Errore nella comunicazione con l'IA.");
  }

  const json = await res.json();
  return String(json.answer ?? json.text ?? json.data ?? '');
}

/**
 * Scansione IA delle Google Tasks per individuare appuntamenti e riunioni
 */
export async function analyzeTasksApi(params: {
  tasks: Array<{ id: string; title: string; notes?: string; dueDate?: string }>;
  referenceDate: string;
}) {
  const res = await apiFetch('/api/analyze-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Errore durante l'analisi dei task.");
  }

  const json = await res.json();
  return json.analyses || json.data || [];
}