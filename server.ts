import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy Google GenAI Client with standard User-Agent header
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Recall API", timestamp: new Date().toISOString() });
});

// Helper to clean mime types (e.g., "audio/webm;codecs=opus" -> "audio/webm")
function sanitizeAudioMimeType(mime?: string): string {
  if (!mime) return "audio/webm";
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp3" || base === "audio/mpeg") return "audio/mp3";
  if (base === "audio/x-m4a" || base === "audio/m4a" || base === "audio/mp4") return "audio/mp4";
  if (base === "audio/wav" || base === "audio/x-wav") return "audio/wav";
  if (base === "audio/ogg" || base === "audio/opus") return "audio/ogg";
  if (base === "audio/flac") return "audio/flac";
  if (base === "audio/aac") return "audio/aac";
  if (base === "audio/webm") return "audio/webm";
  return "audio/webm";
}

// Safely extract pure Base64 payload from any Data URI (including complex codecs=opus params)
function extractBase64Payload(dataUriOrBase64?: string): string {
  if (!dataUriOrBase64) return "";
  const commaIdx = dataUriOrBase64.indexOf(",");
  if (commaIdx !== -1) {
    return dataUriOrBase64.slice(commaIdx + 1).trim();
  }
  return dataUriOrBase64.trim();
}

// High-speed, lightweight model pools:
// Audio-optimized models (Flash Lite and Gemini Transcribe for ultra-low latency and fast transcription)
const AUDIO_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.5-transcribe",
  "gemini-3.7-flash",
];

// Text-optimized models (Flash Lite is near-instant, minimal token consumption, ultra-efficient)
const FAST_TEXT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Robust Gemini Content Generator with multi-model fallback and high-demand recovery
async function generateWithModelFallback(params: {
  contents: any[];
  responseMimeType?: string;
  temperature?: number;
  models?: string[];
}): Promise<any> {
  const ai = getGenAI();
  let lastError: any = null;
  const modelList = params.models && params.models.length > 0 ? params.models : FAST_TEXT_MODELS;

  for (const model of modelList) {
    try {
      const config: any = {
        temperature: params.temperature ?? 0.2,
      };
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (model.includes("3.7") || model.includes("3.1-flash-lite")) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (response) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini Fast Mode] Model ${model} encountered an issue: ${errMsg.slice(0, 120)}. Switching to next fast candidate...`);
      // Brief pause if encountering rate-limit or high-demand spikes
      if (errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE")) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  throw lastError || new Error("I server IA stanno riscontrando un picco temporaneo di richieste. Riprova tra qualche istante.");
}

// Robust JSON parser that handles codeblocks and partial JSON safely
function safeExtractJson(rawText?: string, defaultFallback: any = {}): any {
  if (!rawText || !rawText.trim()) return defaultFallback;
  let clean = rawText.trim();
  
  // Remove markdown codeblock tags if present
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    // Attempt to slice out the first { ... } or [ ... ]
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      } catch (e2) {}
    }

    const firstBracket = clean.indexOf("[");
    const lastBracket = clean.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(clean.substring(firstBracket, lastBracket + 1));
      } catch (e3) {}
    }
    console.warn("safeExtractJson fallback used due to parse failure:", clean.slice(0, 100));
    return defaultFallback;
  }
}

// HIGH-SPEED UNIFIED API: Audio Processing (Transcription + Diarization + Summary + Actions + Calendar) in 1 Fast Pass!
app.post("/api/process-meeting", async (req, res) => {
  try {
    const { audioData, mimeType, liveTranscript, plan, languageHint, referenceDate } = req.body;
    const ai = getGenAI();

    const cleanMime = sanitizeAudioMimeType(mimeType);
    const todayDate = referenceDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei il motore ad altissima velocità e precisione di Recall per professionisti.
Elabora l'audio della riunione e genera in un singolo passaggio ultra-veloce:
1. Trascrizione accurata e speaker diarization (separazione degli interlocutori naturali).
2. Sintesi esecutiva ad alto impatto per dirigenti (panoramica, decisioni chiave, argomenti, sentiment, citazioni).
3. Action items concreti (con incaricato e scadenza dedotta).
4. Rilevamento impegni per Google Calendar (eventi, follow-up, call future concordate).

Data di riferimento: ${todayDate}.
Lingua principale attesa: ${languageHint || "Italiano"}.
Livello account: ${plan === "pro" ? "PRO" : "FREE"}.
${liveTranscript ? `Trascrizione grezza WebSpeech di supporto: "${liveTranscript}"` : ""}

Restituisci ESCLUSIVAMENTE un JSON valido conforme a questa esatta struttura:
{
  "title": "Titolo breve, professionale ed espressivo della riunione (max 6 parole)",
  "language": "it",
  "category": "Riunione" | "Colloquio" | "Brainstorming" | "1-on-1" | "Chiamata",
  "speakers": [
    { "id": "spk_1", "name": "Interlocutore 1", "role": "Ruolo dedotto o interlocutore", "color": "#6C5DD3" },
    { "id": "spk_2", "name": "Interlocutore 2", "role": "Ruolo dedotto o interlocutore", "color": "#3B82F6" }
  ],
  "segments": [
    {
      "id": "seg_1",
      "speakerId": "spk_1",
      "speakerName": "Interlocutore 1",
      "timeOffset": 0,
      "text": "Frase pronunciata chiaramente..."
    }
  ],
  "summary": {
    "overview": "Panoramica dettagliata ed elegante di 2-4 frasi sugli argomenti centrali discussi, il contesto e i punti chiave.",
    "keyDecisions": [
      "Decisione cruciale 1 presa durante il meeting",
      "Decisione cruciale 2..."
    ],
    "mindMap": {
      "core": "Concetto o pilastro centrale della riunione (es. Lancio Prodotto)",
      "branches": [
        {
          "title": "Sotto-argomento o Pilastro 1 (es. Strategia di Marketing)",
          "ideas": ["Idea chiave o decisione 1", "Dettaglio operativo 2"]
        },
        {
          "title": "Sotto-argomento o Pilastro 2 (es. Sviluppo Tecnico)",
          "ideas": ["Idea chiave A", "Accordo tecnico B"]
        }
      ]
    },
    "actionItems": [
      {
        "task": "Descrizione chiara, concreta ed attuabile dell'attività",
        "assignee": "Nome della persona incaricata (es. 'Leonardo', 'Marco' o 'Team')",
        "dueDate": "Data o scadenza concordata (es. 'Entro venerdì' o '15 Settembre')",
        "priority": "Alta" | "Media" | "Bassa"
      }
    ],
    "topics": ["Argomento 1", "Argomento 2"],
    "sentiment": "positive" | "neutral" | "constructive",
    "keyQuotes": ["Citazione o accordo chiave registrato..."]
  },
  "calendarEvents": [
    {
      "title": "Titolo professionale dell'evento (es. 'Call di Allineamento')",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "description": "Dettagli dell'incontro concordato",
      "attendees": ["Leonardo"],
      "location": "Google Meet",
      "confidence": 0.95
    }
  ]
}

Se l'audio o il parlato è molto breve o consiste in una frase/appunto rapido, trascrivilo comunque fedelmente e crea una sintesi puntuale e appropriata.`;

    let parts: any[] = [];
    if (audioData) {
      const rawBase64 = extractBase64Payload(audioData);
      if (rawBase64.length > 50) {
        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: rawBase64,
          },
        });
      }
    }
    parts.push({ text: prompt });

    const response = await generateWithModelFallback({
      contents: parts,
      responseMimeType: "application/json",
      temperature: 0.2,
      models: AUDIO_MODELS,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione Vocale",
      language: "it",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: liveTranscript || "Registrazione completata." }],
      summary: {
        overview: liveTranscript ? `Registrazione elaborata con successo: ${liveTranscript}` : "Registrazione vocale elaborata con successo.",
        keyDecisions: ["Registrazione archiviata e trascritta con successo."],
        mindMap: {
          core: "Conversazione",
          branches: [
            { title: "Sintesi", ideas: ["Registrazione archiviata e trascritta con successo."] }
          ]
        },
        actionItems: [],
        topics: ["Audio"],
        sentiment: "positive",
        keyQuotes: []
      },
      calendarEvents: []
    });

    // Ensure fallback speaker/segments if empty
    if (!parsed.segments || parsed.segments.length === 0) {
      const fallbackText = liveTranscript || "Trascrizione completata.";
      parsed.segments = [{ id: "seg_1", speakerId: "spk_1", speakerName: parsed.speakers?.[0]?.name || "Interlocutore 1", timeOffset: 0, text: fallbackText }];
    }
    if (!parsed.speakers || parsed.speakers.length === 0) {
      parsed.speakers = [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }];
    }
    if (!parsed.summary) {
      parsed.summary = {
        overview: "Riassunto elaborato da Gemini AI.",
        keyDecisions: [],
        actionItems: [],
        topics: [],
        sentiment: "positive",
        keyQuotes: []
      };
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Process meeting error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante l'elaborazione ultra-rapida della riunione",
    });
  }
});

// API: Audio Transcription & Speaker Diarization (Fast Mode with ThinkingLevel.LOW)
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType, liveTranscript, plan, languageHint } = req.body;
    const ai = getGenAI();

    const cleanMime = sanitizeAudioMimeType(mimeType);

    const prompt = `Sei il motore di trascrizione ed intelligenza vocale avanzato di Recall.
Trascrivi accuratamente l'audio fornito e realizza una separazione degli interlocutori (Speaker Diarization) dettagliata e naturale.

Lingua principale attesa: ${languageHint || "Italiano"}.
Livello account: ${plan === "pro" ? "PRO" : "FREE"}.
${liveTranscript ? `Trascrizione grezza preliminare di supporto (WebSpeech): "${liveTranscript}"` : ""}

Restituisci ESCLUSIVAMENTE un JSON valido con questa esatta struttura:
{
  "title": "Titolo breve, professionale ed espressivo della riunione (max 6 parole)",
  "language": "it",
  "category": "Riunione" | "Colloquio" | "Brainstorming" | "1-on-1" | "Chiamata",
  "speakers": [
    { "id": "spk_1", "name": "Interlocutore 1", "role": "Ruolo dedotto o sconosciuto", "color": "#6C5DD3" },
    { "id": "spk_2", "name": "Interlocutore 2", "role": "Ruolo dedotto o sconosciuto", "color": "#3B82F6" }
  ],
  "segments": [
    {
      "id": "seg_1",
      "speakerId": "spk_1",
      "speakerName": "Interlocutore 1",
      "timeOffset": 0,
      "text": "Testo chiaro e puntuale pronunciato dal primo interlocutore..."
    }
  ]
}`;

    let parts: any[] = [];
    if (audioData) {
      const rawBase64 = extractBase64Payload(audioData);
      if (rawBase64.length > 50) {
        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: rawBase64,
          },
        });
      }
    }
    parts.push({ text: prompt });

    const response = await generateWithModelFallback({
      contents: parts,
      responseMimeType: "application/json",
      temperature: 0.2,
      models: AUDIO_MODELS,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione",
      language: "it",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: liveTranscript || "Trascrizione completata." }]
    });

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante la trascrizione audio",
    });
  }
});

// API: AI Meeting Summary & Action Items (Fast Mode with ThinkingLevel.LOW)
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, meetingTitle } = req.body;
    const ai = getGenAI();

    const prompt = `Sei l'assistente IA esecutivo di Recall.
Genera una sintesi professionale ad alto impatto per dirigenti e professionisti.

Titolo riunione: "${meetingTitle || "Riunione"}"

Trascrizione completa o segmenti:
${typeof transcript === "string" ? transcript : JSON.stringify(transcript, null, 2)}

Restituisci ESCLUSIVAMENTE un JSON valido conforme a questo schema:
{
  "overview": "Panoramica dettagliata ed elegante di 2-4 frasi sugli argomenti centrali discussi, il contesto e i punti chiave.",
  "keyDecisions": [
    "Decisione cruciale 1 presa durante il meeting",
    "Decisione cruciale 2..."
  ],
  "mindMap": {
    "core": "Concetto o pilastro centrale della riunione",
    "branches": [
      {
        "title": "Sotto-argomento o Pilastro 1",
        "ideas": ["Idea chiave 1", "Dettaglio operativo 2"]
      }
    ]
  },
  "actionItems": [
    {
      "task": "Descrizione chiara, concreta ed attuabile dell'attività",
      "assignee": "Nome della persona incaricata (es. 'Leonardo', 'Marco' o 'Team')",
      "dueDate": "Data o scadenza concordata (es. 'Entro venerdì ore 18:00' o '15 Settembre')",
      "priority": "Alta" | "Media" | "Bassa"
    }
  ],
  "topics": ["Argomento 1", "Argomento 2", "Argomento 3"],
  "sentiment": "positive" | "neutral" | "constructive",
  "keyQuotes": [
    "Citazione testuale memorabile o accordo chiave registrato..."
  ]
}`;

    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, {
      overview: "Sintesi elaborata con successo.",
      keyDecisions: [],
      mindMap: {
        core: "Conversazione",
        branches: [
          { title: "Sintesi", ideas: ["Sintesi elaborata con successo."] }
        ]
      },
      actionItems: [],
      topics: [],
      sentiment: "positive",
      keyQuotes: []
    });

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Summarize error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante la generazione del riassunto IA",
    });
  }
});

// API: AI Calendar Commitments Detection from Meeting Transcript (Fast Mode)
app.post("/api/detect-calendar-events", async (req, res) => {
  try {
    const { transcript, meetingDate } = req.body;
    const ai = getGenAI();

    const todayDate = meetingDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei il modulo 'Calendario AI' di Recall per professionisti.
Analizza accuratamente la trascrizione della riunione per identificare TUTTI gli impegni futuri, date, scadenze, riunioni di follow-up, call o demo concordate tra i partecipanti.

Data di riferimento della riunione: ${todayDate}.

Trascrizione:
${typeof transcript === "string" ? transcript : JSON.stringify(transcript, null, 2)}

Estrai ogni impegno rilevato in formato JSON valido:
{
  "events": [
    {
      "title": "Titolo professionale dell'evento (es: 'Demo Client Acme' o 'Review Architettura')",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "description": "Contesto e note estratte dalla conversazione",
      "attendees": ["email o nomi dei partecipanti menzionati"],
      "location": "Google Meet" | "Ufficio" | "Remoto",
      "confidence": 0.95
    }
  ]
}

Se non sono stati citati orari precisi, deduci un orario lavorativo logico (es. 10:00 o 15:00) e durata di 45-60 minuti.`;

    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, { events: [] });
    res.json({ success: true, events: parsed.events || [] });
  } catch (error: any) {
    console.error("Calendar detection error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante il rilevamento impegni per il calendario",
    });
  }
});

// API: AI Task Inspection (Detect if tasks are meetings or calendar events) (Fast Mode)
app.post("/api/analyze-tasks", async (req, res) => {
  try {
    const { tasks, referenceDate } = req.body;
    const ai = getGenAI();

    const todayDate = referenceDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei l'assistente IA di Recall specializzato nell'analisi predittiva della produttività e dell'agenda.
L'utente ti fornisce la lista delle sue attuali Google Tasks / attività da completare.
Il tuo compito è ESAMINARE ciascun task per determinare se si tratta in realtà di una RIUNIONE, APPUNTAMENTO, CALL, DEMO, COLLOQUIO o EVENTO che dovrebbe essere pianificato su Google Calendar anziché rimanere come semplice to-do text.

Data odierna di riferimento: ${todayDate}.

Lista dei compiti (Google Tasks):
${JSON.stringify(tasks || [], null, 2)}

Per OGNI task fornito, restituisci l'analisi nel seguente formato JSON:
{
  "analyses": [
    {
      "taskId": "id_del_task",
      "taskTitle": "titolo_originale",
      "isMeetingOrEvent": true | false,
      "confidence": 0.95,
      "reasoning": "Spiegazione chiara in italiano sul perché questo task è identificato come evento o riunione (es. 'Il task indica chiaramente una call con Marco fissata per giovedì alle 15:00')",
      "suggestedEvent": {
        "title": "Titolo professionale per Google Calendar (es. 'Call con Marco')",
        "date": "YYYY-MM-DD (data dedotta coerente con la data di riferimento)",
        "startTime": "HH:MM (es. 15:00 o 10:00 se non specificato)",
        "endTime": "HH:MM (es. 16:00)",
        "location": "Google Meet" | "Ufficio" | "In presenza",
        "attendees": ["nomi o email citati"],
        "description": "Note e contesto ricavati dal task per l'evento del calendario"
      }
    }
  ]
}

Se un task è una semplice to-do (es. 'Inviare fattura', 'Comprare cavo HDMI', 'Scrivere documentazione'), imposta "isMeetingOrEvent": false, confidence: 0.95, reasoning: "Attività operativa, non richiede una riunione", e ometti o lascia null "suggestedEvent".
Se un task menziona 'Call', 'Meeting', 'Riunione', 'Incontro', 'Demo', 'Allineamento', 'Visita', 'Colloquio' o include giorni/ore, imposta "isMeetingOrEvent": true con i dettagli del suggestedEvent.`;

    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, { analyses: [] });
    res.json({ success: true, analyses: parsed.analyses || [] });
  } catch (error: any) {
    console.error("Task analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante l'analisi delle task con IA",
    });
  }
});

// API: Interactive AI Chat over Meeting Transcript (Fast Mode)
app.post("/api/chat", async (req, res) => {
  try {
    const { question, transcript, summary, meetingTitle } = req.body;
    const ai = getGenAI();

    const prompt = `Sei l'assistente conversazionale intelligente di Recall.
Rispondi con massima precisione, tono professionale, cordiale ed efficace in lingua italiana.
Basa le tue risposte rigorosamente sui fatti e sulle decisioni emerse in questa specifica riunione:

TITOLO RIUNIONE: ${meetingTitle || "Riunione Recall"}

PANORAMICA / RIASSUNTO:
${summary ? JSON.stringify(summary, null, 2) : "Nessun riassunto disponibile"}

TRASCRIZIONE COMPLETA:
${typeof transcript === "string" ? transcript : JSON.stringify(transcript, null, 2)}

DOMANDA DELL'UTENTE:
${question}

Se l'utente ti chiede di formulare una mail di recap, una lista di task o un messaggio Slack per il team, crea il testo pronto per essere copiato ed inviato. Se un dettaglio non è stato menzionato nella riunione, specificalo con trasparenza senza inventare dati.`;

    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      temperature: 0.3,
    });

    res.json({
      success: true,
      answer: response.text || "Non sono riuscito a elaborare una risposta.",
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nella chat IA",
    });
  }
});

// --- PERSISTENT BACKEND DATABASE FOR USERS & FRIENDSHIPS ---
interface RegisteredUser {
  email: string;
  name: string;
  createdAt: string;
  language?: "it" | "en";
}

interface Friendship {
  id: string;
  senderEmail: string;
  receiverEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  creditsEarnedFromFriend: number; // Predisposto per il futuro sistema di crediti
}

interface Invitation {
  email: string;
  token: string;
  senderEmail: string;
  status: "pending" | "used" | "expired";
  createdAt: string;
  expiresAt: string;
}

interface InAppNotification {
  id: string;
  userEmail: string;
  message: string;
  type: "friend_request" | "friend_accepted";
  senderEmail: string;
  senderName: string;
  friendshipId?: string;
  read: boolean;
  createdAt: string;
}

interface DB {
  users: Record<string, RegisteredUser>; // email (lowercase) -> RegisteredUser
  friendships: Friendship[];
  invitations?: Invitation[];
  notifications?: InAppNotification[];
}

const DB_FILE = path.join(process.cwd(), "recall_db.json");

function readDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      if (!db.invitations) db.invitations = [];
      if (!db.notifications) db.notifications = [];
      return db;
    }
  } catch (e) {
    console.error("Failed reading database, returning empty database", e);
  }
  return { users: {}, friendships: [], invitations: [], notifications: [] };
}

function writeDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing database", e);
  }
}

// Helpers for rate limiting and email validation
const requestHistory: Record<string, number[]> = {};

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10; // max 10 friendship/invite requests per 15 mins
  
  if (!requestHistory[email]) {
    requestHistory[email] = [];
  }
  
  requestHistory[email] = requestHistory[email].filter(ts => now - ts < windowMs);
  
  if (requestHistory[email].length >= maxRequests) {
    return true;
  }
  
  requestHistory[email].push(now);
  return false;
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Ensure the db contains a few mock users for demoing additions if needed
const initialDb = readDB();
if (Object.keys(initialDb.users).length === 0) {
  initialDb.users["leo@alea.pro"] = { email: "leo@alea.pro", name: "Leonardo Fiorot", createdAt: new Date().toISOString() };
  initialDb.users["friend@example.com"] = { email: "friend@example.com", name: "Amico Demo", createdAt: new Date().toISOString() };
  initialDb.users["marco@alea.pro"] = { email: "marco@alea.pro", name: "Marco Rossini", createdAt: new Date().toISOString() };
  writeDB(initialDb);
}

// 1. Sync / Register user in backend (with optional inviteToken linking)
app.post("/api/users/sync", (req, res) => {
  try {
    const { email, name, inviteToken, language } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email richiesta" });
    }
    const normEmail = email.toLowerCase().trim();
    const db = readDB();
    const isNew = !db.users[normEmail];
    
    db.users[normEmail] = {
      email: normEmail,
      name: name || normEmail.split("@")[0],
      createdAt: db.users[normEmail]?.createdAt || new Date().toISOString(),
      language: language || db.users[normEmail]?.language || "it",
    };

    let linkedFriendship = false;
    let inviterName = "";

    // Process Invitation token if provided and new user
    if (inviteToken && isNew && db.invitations) {
      const invitation = db.invitations.find(inv => inv.token === inviteToken);
      if (invitation && invitation.status === "pending" && new Date(invitation.expiresAt) > new Date()) {
        const inviterEmail = invitation.senderEmail.toLowerCase().trim();
        const inviterUser = db.users[inviterEmail];
        inviterName = inviterUser?.name || inviterEmail.split("@")[0];

        // Create a pending friendship linking
        const existingFnd = db.friendships.find(f => 
          (f.senderEmail === inviterEmail && f.receiverEmail === normEmail) ||
          (f.senderEmail === normEmail && f.receiverEmail === inviterEmail)
        );

        if (!existingFnd) {
          const newFnd: Friendship = {
            id: `fnd_${Date.now()}`,
            senderEmail: inviterEmail,
            receiverEmail: normEmail,
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            creditsEarnedFromFriend: 0
          };
          db.friendships.push(newFnd);

          // Add in-app notification for the newly registered user (Localized)
          const targetLang = db.users[normEmail]?.language || "it";
          const msgText = targetLang === "en"
            ? `"${inviterName}" sent you a friend request!`
            : `"${inviterName}" ti ha inviato una richiesta di amicizia!`;

          if (!db.notifications) db.notifications = [];
          db.notifications.push({
            id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userEmail: normEmail,
            message: msgText,
            type: "friend_request",
            senderEmail: inviterEmail,
            senderName: inviterName,
            friendshipId: newFnd.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          linkedFriendship = true;
        }

        // Mark invitation as used
        invitation.status = "used";
      }
    }

    writeDB(db);
    res.json({ success: true, isNew, user: db.users[normEmail], linkedFriendship, inviterName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Send Friend Request or Invite Link
app.post("/api/friends/request", async (req, res) => {
  try {
    const { senderEmail, receiverEmail } = req.body;
    if (!senderEmail || !receiverEmail) {
      return res.status(400).json({ success: false, error: "Sender and receiver email required" });
    }
    const normSender = senderEmail.toLowerCase().trim();
    const normReceiver = receiverEmail.toLowerCase().trim();

    if (!isValidEmail(normReceiver)) {
      return res.status(400).json({ success: false, error: "Email destinatario non valida" });
    }

    if (normSender === normReceiver) {
      return res.status(400).json({ success: false, error: "Non puoi inviare una richiesta a te stesso" });
    }

    // Rate Limiting
    if (isRateLimited(normSender)) {
      return res.status(429).json({ success: false, error: "Hai inviato troppe richieste. Riprova tra poco." });
    }

    const db = readDB();
    const senderUser = db.users[normSender];
    const senderName = senderUser?.name || normSender.split("@")[0];
    const receiverExists = !!db.users[normReceiver];

    // Check existing friendship
    const existingIndex = db.friendships.findIndex(
      (f) =>
        (f.senderEmail === normSender && f.receiverEmail === normReceiver) ||
        (f.senderEmail === normReceiver && f.receiverEmail === normSender)
    );

    if (existingIndex !== -1) {
      const existing = db.friendships[existingIndex];
      if (existing.status === "accepted") {
        return res.status(400).json({ success: false, error: "Siete già amici!" });
      }
      if (existing.status === "pending") {
        if (existing.senderEmail === normSender) {
          return res.status(400).json({ success: false, error: "Hai già inviato una richiesta a questo utente" });
        } else {
          // If the other user already sent a request, accept it automatically!
          existing.status = "accepted";
          existing.updatedAt = new Date().toISOString();
          
          // Add a notification for sender that they accepted (Localized)
          const senderLang = db.users[normSender]?.language || "it";
          const acceptedMsg = senderLang === "en"
            ? `"${db.users[normReceiver]?.name || normReceiver.split("@")[0]}" accepted your friend request!`
            : `"${db.users[normReceiver]?.name || normReceiver.split("@")[0]}" ha accettato la tua richiesta di amicizia!`;

          if (!db.notifications) db.notifications = [];
          db.notifications.push({
            id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userEmail: normSender,
            message: acceptedMsg,
            type: "friend_accepted",
            senderEmail: normReceiver,
            senderName: db.users[normReceiver]?.name || normReceiver.split("@")[0],
            friendshipId: existing.id,
            read: false,
            createdAt: new Date().toISOString()
          });

          writeDB(db);
          return res.json({ success: true, acceptedAutomatic: true, friendship: existing });
        }
      }
      
      // If rejected, allow resending by resetting state
      existing.status = "pending";
      existing.senderEmail = normSender;
      existing.receiverEmail = normReceiver;
      existing.updatedAt = new Date().toISOString();
      
      if (receiverExists) {
        // Create an in-app notification for the receiver (Localized)
        const receiverLang = db.users[normReceiver]?.language || "it";
        const msgText = receiverLang === "en"
          ? `"${senderName}" sent you a friend request!`
          : `"${senderName}" ti ha inviato una richiesta di amicizia!`;

        if (!db.notifications) db.notifications = [];
        db.notifications.push({
          id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userEmail: normReceiver,
          message: msgText,
          type: "friend_request",
          senderEmail: normSender,
          senderName,
          friendshipId: existing.id,
          read: false,
          createdAt: new Date().toISOString()
        });
        writeDB(db);
        return res.json({ success: true, friendship: existing, registered: true });
      } else {
        // Not registered: generate and send email invitation
        const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`;
        if (!db.invitations) db.invitations = [];
        db.invitations.push({
          email: normReceiver,
          token,
          senderEmail: normSender,
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiration
        });
        writeDB(db);
        await sendInviteEmail(normReceiver, senderName, normSender, token, req);
        return res.json({ success: true, friendship: existing, registered: false, invitationToken: token });
      }
    }

    // No existing friendship row
    if (receiverExists) {
      // 1. Registered User: Create request and send only in-app notification
      const newFriendship: Friendship = {
        id: `fnd_${Date.now()}`,
        senderEmail: normSender,
        receiverEmail: normReceiver,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creditsEarnedFromFriend: 0
      };
      db.friendships.push(newFriendship);

      // Create in-app notification (Localized)
      const receiverLang = db.users[normReceiver]?.language || "it";
      const msgText = receiverLang === "en"
        ? `"${senderName}" sent you a friend request!`
        : `"${senderName}" ti ha inviato una richiesta di amicizia!`;

      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userEmail: normReceiver,
        message: msgText,
        type: "friend_request",
        senderEmail: normSender,
        senderName,
        friendshipId: newFriendship.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      writeDB(db);
      res.json({ success: true, friendship: newFriendship, registered: true });
    } else {
      // 2. Unregistered User: Avoid duplicate active invitations from this sender
      if (!db.invitations) db.invitations = [];
      const activeInvitation = db.invitations.find(
        inv => inv.email === normReceiver && inv.status === "pending" && new Date(inv.expiresAt) > new Date()
      );

      if (activeInvitation) {
        return res.status(400).json({
          success: false,
          error: "Un invito è già stato inviato a questa email ed è in attesa di registrazione"
        });
      }

      // Generate token and create Invitation entry
      const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`;
      db.invitations.push({
        email: normReceiver,
        token,
        senderEmail: normSender,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
      writeDB(db);

      // Send Email JS invitation
      await sendInviteEmail(normReceiver, senderName, normSender, token, req);
      res.json({ success: true, registered: false, invitationToken: token });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Respond to Friend Request (Accept/Reject)
app.post("/api/friends/respond", (req, res) => {
  try {
    const { friendshipId, email, action } = req.body;
    if (!friendshipId || !email || !action) {
      return res.status(400).json({ success: false, error: "friendshipId, email and action required" });
    }
    const normEmail = email.toLowerCase().trim();
    if (action !== "accept" && action !== "reject") {
      return res.status(400).json({ success: false, error: "Action must be 'accept' or 'reject'" });
    }

    const db = readDB();
    const friendshipIndex = db.friendships.findIndex((f) => f.id === friendshipId);

    if (friendshipIndex === -1) {
      return res.status(404).json({ success: false, error: "Richiesta di amicizia non trovata" });
    }

    const friendship = db.friendships[friendshipIndex];

    // Security check: only the receiver can accept or reject
    if (friendship.receiverEmail !== normEmail) {
      return res.status(403).json({ success: false, error: "Non sei autorizzato a rispondere a questa richiesta" });
    }

    if (action === "accept") {
      friendship.status = "accepted";
      friendship.updatedAt = new Date().toISOString();

      // Create notification for the sender that their request was accepted (Localized)
      const receiverUser = db.users[normEmail];
      const receiverName = receiverUser?.name || normEmail.split("@")[0];
      
      const senderLang = db.users[friendship.senderEmail]?.language || "it";
      const acceptedMsgText = senderLang === "en"
        ? `"${receiverName}" accepted your friend request!`
        : `"${receiverName}" ha accettato la tua richiesta di amicizia!`;

      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userEmail: friendship.senderEmail,
        message: acceptedMsgText,
        type: "friend_accepted",
        senderEmail: normEmail,
        senderName: receiverName,
        friendshipId: friendship.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Mark original friend_request notifications for this friendship as read
      db.notifications.forEach(not => {
        if (not.userEmail === normEmail && not.friendshipId === friendshipId && not.type === "friend_request") {
          not.read = true;
        }
      });
    } else {
      // Reject: delete the friendship row completely (richiesta eliminata, nessuna notifica al mittente)
      db.friendships.splice(friendshipIndex, 1);

      // Clean up any pending notification for this request
      if (db.notifications) {
        db.notifications = db.notifications.filter(
          not => !(not.userEmail === normEmail && not.friendshipId === friendshipId)
        );
      }
    }

    writeDB(db);
    res.json({ success: true, action, friendship: action === "accept" ? friendship : null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. List Friends and Requests
app.get("/api/friends/list", (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email query param is required" });
    }
    const normEmail = String(email).toLowerCase().trim();
    const db = readDB();

    const friends: Array<{ friendshipId: string; email: string; name: string; createdAt: string; creditsEarned: number }> = [];
    const receivedPending: Array<{ friendshipId: string; email: string; name: string; createdAt: string }> = [];
    const sentPending: Array<{ friendshipId: string; email: string; name: string; createdAt: string; registered: boolean }> = [];

    db.friendships.forEach((f) => {
      if (f.status === "accepted") {
        if (f.senderEmail === normEmail) {
          const friendUser = db.users[f.receiverEmail] || { email: f.receiverEmail, name: f.receiverEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.receiverEmail,
            name: friendUser.name,
            createdAt: f.createdAt,
            creditsEarned: f.creditsEarnedFromFriend,
          });
        } else if (f.receiverEmail === normEmail) {
          const friendUser = db.users[f.senderEmail] || { email: f.senderEmail, name: f.senderEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.senderEmail,
            name: friendUser.name,
            createdAt: f.createdAt,
            creditsEarned: f.creditsEarnedFromFriend,
          });
        }
      } else if (f.status === "pending") {
        if (f.receiverEmail === normEmail) {
          const senderUser = db.users[f.senderEmail] || { email: f.senderEmail, name: f.senderEmail.split("@")[0] };
          receivedPending.push({
            friendshipId: f.id,
            email: f.senderEmail,
            name: senderUser.name,
            createdAt: f.createdAt,
          });
        } else if (f.senderEmail === normEmail) {
          const receiverRegistered = !!db.users[f.receiverEmail];
          const receiverUser = db.users[f.receiverEmail] || { email: f.receiverEmail, name: f.receiverEmail.split("@")[0] };
          sentPending.push({
            friendshipId: f.id,
            email: f.receiverEmail,
            name: receiverUser.name,
            createdAt: f.createdAt,
            registered: receiverRegistered,
          });
        }
      }
    });

    res.json({ success: true, friends, receivedPending, sentPending });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get In-App Notifications
app.get("/api/notifications", (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email query param is required" });
    }
    const normEmail = String(email).toLowerCase().trim();
    const db = readDB();
    
    if (!db.notifications) db.notifications = [];
    
    // Sort notifications by newest first
    const list = db.notifications
      .filter(not => not.userEmail === normEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Mark Notifications as Read
app.post("/api/notifications/read", (req, res) => {
  try {
    const { email, notificationId, readAll } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email required" });
    }
    const normEmail = email.toLowerCase().trim();
    const db = readDB();
    
    if (!db.notifications) db.notifications = [];

    if (readAll) {
      db.notifications.forEach(not => {
        if (not.userEmail === normEmail) {
          not.read = true;
        }
      });
    } else if (notificationId) {
      const not = db.notifications.find(n => n.id === notificationId && n.userEmail === normEmail);
      if (not) {
        not.read = true;
      }
    }

    writeDB(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Validate Invitation Token
app.get("/api/invitations/validate", (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: "Token query param required" });
    }
    const db = readDB();
    if (!db.invitations) db.invitations = [];
    
    const invitation = db.invitations.find(inv => inv.token === String(token));
    if (!invitation) {
      return res.status(404).json({ success: false, error: "Token non valido o inesistente" });
    }
    
    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, error: `Questo token è già stato utilizzato (${invitation.status})` });
    }
    
    if (new Date(invitation.expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, error: "Questo token di invito è scaduto" });
    }
    
    const inviterUser = db.users[invitation.senderEmail.toLowerCase().trim()];
    const inviterName = inviterUser?.name || invitation.senderEmail.split("@")[0];
    
    res.json({ success: true, invitation, inviterName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update User Language preference
app.post("/api/users/update-language", (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email || !language) {
      return res.status(400).json({ success: false, error: "Email and language are required" });
    }
    const normEmail = email.toLowerCase().trim();
    if (language !== "it" && language !== "en") {
      return res.status(400).json({ success: false, error: "Language must be 'it' or 'en'" });
    }
    const db = readDB();
    if (db.users[normEmail]) {
      db.users[normEmail].language = language;
      writeDB(db);
      return res.json({ success: true, language: db.users[normEmail].language });
    }
    return res.status(404).json({ success: false, error: "User not found" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to send EmailJS invitation
async function sendInviteEmail(receiverEmail: string, senderName: string, senderEmail: string, inviteToken: string, req: express.Request) {
  // Credenziali primarie attive (EmailJS fornite dall'utente) con salvaguardia di quelle preesistenti
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "service_4o4xkok"; // Fallback storico: "service_19poemn"
  const templateId = process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "template_mndv7mq"; // Fallback storico: "template_clzzhsc"
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "T0-fxkSF4j0YYTyeR";
  
  const origin = req.headers.origin || "https://ais-dev-cnni324kpf4faqg7qs5ekl-615634755252.europe-west2.run.app";
  const inviteLink = `${origin}?inviteToken=${inviteToken}`;
  
  console.log(`[Backend Invite] Generating invitation link for ${receiverEmail}: ${inviteLink}`);
  
  // Choose email language based on inviter (sender) preference
  const db = readDB();
  const senderUser = db.users[senderEmail.toLowerCase().trim()];
  const senderLang = senderUser?.language || "it";
  const emailMessage = senderLang === "en"
    ? `Hello! ${senderName || senderEmail} has invited you to join Recall AI.`
    : `Ciao! ${senderName || senderEmail} ti ha invitato ad unirti a Recall AI.`;

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: receiverEmail,
          inviter_name: senderName || senderEmail,
          invite_link: inviteLink,
          message: emailMessage
        }
      })
    });
    if (response.ok) {
      console.log(`[Backend Invite] Email sent successfully to ${receiverEmail}`);
    } else {
      const txt = await response.text();
      console.error(`[Backend Invite] EmailJS error: ${txt}`);
    }
  } catch (err) {
    console.error("[Backend Invite] Failed sending EmailJS invite email", err);
  }
}

// 404 JSON handler for unhandled /api/* routes
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} non trovato`,
  });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Recall server active on http://localhost:${PORT}`);
  });
}

startServer();
