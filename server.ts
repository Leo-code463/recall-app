import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json";

const app = express();

app.get(['/privacy', '/privacy/'], (req, res) => {
  res.sendFile(process.cwd() + '/public/privacy/index.html');
});

app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId;
if (getAdminApps().length === 0) {
  initAdminApp({ projectId: FIREBASE_PROJECT_ID });
}

interface AuthedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

const PUBLIC_API_ROUTES = new Set<string>(["GET /health", "GET /invitations/validate"]);

function makeAuthMiddleware(allowUnverified: boolean) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!match) {
      return res.status(401).json({ success: false, error: "Autenticazione richiesta" });
    }
    try {
      const decoded = await getAdminAuth().verifyIdToken(match[1]);
      const email = (decoded.email || "").toLowerCase().trim();
      if (!email) {
        return res.status(401).json({ success: false, error: "Account senza email" });
      }
      const emailVerified = decoded.email_verified === true;
      if (!emailVerified && !allowUnverified) {
        return res.status(403).json({ success: false, error: "Email non verificata", code: "EMAIL_NOT_VERIFIED" });
      }
      req.authUser = {
        uid: decoded.uid,
        email,
        emailVerified,
        name: typeof decoded.name === "string" ? decoded.name : undefined,
      };
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Sessione non valida o scaduta" });
    }
  };
}

const requireAuth = makeAuthMiddleware(false);
const requireAuthAllowUnverified = makeAuthMiddleware(true);

const UNVERIFIED_OK_ROUTES = new Set<string>();

app.use("/api", (req, res, next) => {
  const key = `${req.method} ${req.path}`;
  if (PUBLIC_API_ROUTES.has(key)) return next();
  if (UNVERIFIED_OK_ROUTES.has(key)) return requireAuthAllowUnverified(req, res, next);
  return requireAuth(req, res, next);
});

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLen);
}

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ollama";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000;
const OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS || "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MAX_TRANSCRIPT_CHARS = Number(process.env.MAX_TRANSCRIPT_CHARS) || 24_000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Recap API", timestamp: new Date().toISOString() });
});

function transcriptToText(transcript: unknown, maxChars: number = MAX_TRANSCRIPT_CHARS): string {
  let text = "";
  if (typeof transcript === "string") {
    text = transcript;
  } else if (Array.isArray(transcript)) {
    text = transcript
      .map((seg: any) => {
        if (typeof seg === "string") return seg;
        const who = typeof seg?.speakerName === "string" ? seg.speakerName : typeof seg?.speaker === "string" ? seg.speaker : "";
        const line = typeof seg?.text === "string" ? seg.text : "";
        return who && line ? `${who}: ${line}` : line;
      })
      .filter(Boolean)
      .join("\n");
  } else if (transcript && typeof transcript === "object") {
    text = JSON.stringify(transcript);
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.length > maxChars) {
    const head = Math.floor(maxChars * 0.6);
    const tail = maxChars - head;
    text = `${text.slice(0, head)}\n[... parte centrale omessa per limiti di lunghezza ...]\n${text.slice(-tail)}`;
  }
  return text;
}

function describeOllamaError(err: any, model: string): string {
  const msg: string = err?.message || String(err);
  if (err?.name === "AbortError") {
    return `Il servizio IA non ha risposto entro ${Math.round(OLLAMA_TIMEOUT_MS / 1000)} secondi. Riprova.`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|ECONNRESET/i.test(msg) || /fetch failed|ECONNREFUSED/i.test(String(err?.cause?.code || err?.cause?.message || ""))) {
    return `Il servizio IA non è raggiungibile su ${OLLAMA_BASE_URL}. Controlla OLLAMA_BASE_URL e la connessione (con Ollama locale: verifica che sia avviato).`;
  }
  if (/HTTP 401|HTTP 403/.test(msg)) {
    return "Servizio IA non configurato correttamente (OLLAMA_API_KEY mancante o non valida).";
  }
  if (/HTTP 429/.test(msg)) {
    return "Il servizio IA ha raggiunto il limite di richieste del piano gratuito. Riprova tra qualche istante.";
  }
  if (/HTTP 404/.test(msg) || /not found/i.test(msg)) {
    return `Modello IA "${model}" non trovato. Controlla OLLAMA_MODEL (con Ollama locale: ollama pull ${model}).`;
  }
  return msg;
}

async function generateWithModelFallback(params: {
  prompt: string;
  system?: string;
  json?: boolean;
  temperature?: number;
  models?: string[];
}): Promise<{ text: string }> {
  const modelList =
    params.models && params.models.length > 0 ? params.models : [OLLAMA_MODEL, ...OLLAMA_FALLBACK_MODELS];

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (params.system) messages.push({ role: "system", content: params.system });
  messages.push({ role: "user", content: params.prompt });

  let lastError: any = null;
  let lastModel = modelList[0];

  for (const model of modelList) {
    lastModel = model;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
      let retryAfterMs = 0;
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OLLAMA_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: params.temperature ?? 0.2,
            stream: false,
            ...(params.json ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 429 && attempt === 0) {
            const secs = Number(response.headers.get("retry-after"));
            retryAfterMs = Math.min(Number.isFinite(secs) && secs > 0 ? secs : 3, 15) * 1000;
          }
          const body = await response.text();
          throw new Error(`Servizio IA HTTP ${response.status}: ${body.slice(0, 300)}`);
        }

        const data: any = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text === "string") {
          return { text };
        }
        throw new Error("Risposta del servizio IA priva di contenuto.");
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI] Modello ${model} non disponibile: ${String(err?.message || err).slice(0, 160)}.`);
      } finally {
        clearTimeout(timer);
      }
      if (retryAfterMs > 0) {
        await new Promise((r) => setTimeout(r, retryAfterMs));
        continue;
      }
      break;
    }
  }

  throw new Error(describeOllamaError(lastError, lastModel));
}

async function checkOllamaOnStartup(): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(`${OLLAMA_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${OLLAMA_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data: any = await r.json();
    const names: string[] = (data?.data || []).map((m: any) => m.id);
    console.log(`[AI] Servizio raggiungibile su ${OLLAMA_BASE_URL}. Modello predefinito: ${OLLAMA_MODEL}.`);
    if (names.length > 0 && !names.some((n) => n === OLLAMA_MODEL || n.startsWith(`${OLLAMA_MODEL}:`))) {
      console.warn(`[AI] Il modello "${OLLAMA_MODEL}" non risulta installato. Con Ollama locale: ollama pull ${OLLAMA_MODEL}`);
    }
  } catch (err: any) {
    console.warn(`[AI] Servizio NON raggiungibile su ${OLLAMA_BASE_URL} (${err?.message || err}). Le funzioni IA falliranno finché non è avviato.`);
  }
}

function safeExtractJson(rawText?: string, defaultFallback: any = {}): any {
  if (!rawText || !rawText.trim()) return defaultFallback;
  let clean = rawText.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
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

/* --- NUOVI ENDPOINT PER CHUNKING PIPELINE --- */

app.post("/api/ai/process-chunk", async (req, res) => {
  try {
    const { chunkText, text } = req.body;
    const content = cleanText(chunkText || text, 10000);

    if (!content || content.length < 10) {
      return res.json({ success: true, summaryPoint: "", detectedActionItems: [] });
    }

    const prompt = `Analizza questo breve blocco di trascrizione di una riunione.
Estrai:
1. "summaryPoint": un singolo punto di sintesi (1 frase) di ciò che è stato detto.
2. "detectedActionItems": un array di eventuali compiti da svolgere menzionati.

TESTO BLOCCO:
"${content}"

Restituisci ESCLUSIVAMENTE un JSON valido:
{
  "summaryPoint": "Sintesi breve...",
  "detectedActionItems": ["Task 1 se presente"]
}`;

    const response = await generateWithModelFallback({
      system: "Rispondi sempre e soltanto con JSON valido in italiano.",
      prompt,
      json: true,
      temperature: 0.1,
    });

    const parsed = safeExtractJson(response.text, { summaryPoint: "", detectedActionItems: [] });
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error("Process chunk error:", error);
    res.json({ success: true, summaryPoint: "", detectedActionItems: [] });
  }
});

app.post ("/api/ai/summarize-chunks", async (req, res) => {
  try {
    const { chunkSummaries, actionItems, totalDuration } = req.body;

    const summariesList = Array.isArray(chunkSummaries) ? chunkSummaries.join("\n- ") : "";
    const tasksList = Array.isArray(actionItems) ? actionItems.join("\n- ") : "";

    const prompt = `Unisci i seguenti punti chiave estratti durante la riunione in una sintesi esecutiva finale.

PUNTI CHIAVE:
- ${summariesList}

AZIONI RILEVATE:
- ${tasksList}

Restituisci ESCLUSIVAMENTE un JSON valido conforme a questa struttura:
{
  "title": "Titolo professionale breve",
  "category": "Riunione",
  "speakers": [{ "id": "spk_1", "name": "Interlocutore 1", "color": "#6A49D8" }],
  "segments": [{ "id": "seg_1", "speakerId": "spk_1", "speakerName": "Interlocutore 1", "timeOffset": 0, "text": "${summariesList.replace(/"/g, "'")}" }],
  "summary": {
    "overview": "Panoramica completa ed elegante di 2-3 frasi.",
    "keyDecisions": ["Decisione principale"],
    "actionItems": [
      {
        "task": "Descrizione attività",
        "assignee": "Team",
        "dueDate": "Prossimamente",
        "priority": "Media"
      }
    ],
    "topics": ["Discussione"],
    "sentiment": "positive",
    "keyQuotes": []
  },
  "calendarEventsDetected": []
}`;

    const response = await generateWithModelFallback({
      system: "Rispondi sempre e soltanto con JSON valido in italiano.",
      prompt,
      json: true,
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Riunione Elaborata",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6A49D8" }],
      segments: [],
      summary: { overview: "Elaborazione completata.", keyDecisions: [], actionItems: [], topics: [], sentiment: "positive", keyQuotes: [] },
      calendarEventsDetected: []
    });

    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error("Summarize chunks error:", error);
    res.status(500).json({ success: false, error: "Errore nella generazione della sintesi dai blocchi" });
  }
});

/* --- FINE ROTTE NUOVE --- */

app.post("/api/process-meeting", async (req, res) => {
  try {
    const { text, liveTranscript, transcript, plan, languageHint, referenceDate } = req.body;

    const sourceText = transcriptToText(text ?? liveTranscript ?? transcript);
    if (sourceText.replace(/\s/g, "").length < 15) {
      return res.status(400).json({
        success: false,
        error: "Trascrizione vuota o troppo breve: il riconoscimento vocale sul dispositivo non ha prodotto testo.",
      });
    }
    if (!sourceText) {
      return res.status(400).json({
        success: false,
        error: "Nessun testo da elaborare: trascrivi l'audio sul dispositivo e invia solo il testo.",
      });
    }

    const todayDate = referenceDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei il motore di elaborazione di Recap per professionisti.
Ricevi la TRASCRIZIONE TESTUALE di una riunione, già prodotta sul dispositivo dell'utente (non è disponibile alcun audio).
Elaborala e genera in un singolo passaggio:
1. Suddivisione in interventi. Separa gli interlocutori SOLO se il testo lo rende evidente; altrimenti usa un unico "Interlocutore 1". Non inventare contenuti che non sono nel testo.
2. Sintesi esecutiva ad alto impatto per dirigenti (panoramica, decisioni chiave, argomenti, sentiment, citazioni).
3. Action items concreti (con incaricato e scadenza dedotta).
4. Rilevamento impegni per Google Calendar (eventi, follow-up, call future concordate).

Data di riferimento: ${todayDate}.
Lingua principale attesa: ${languageHint || "Italiano"}.
Livello account: ${plan === "pro" ? "PRO" : "FREE"}.

TRASCRIZIONE:
"""
${sourceText}
"""

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

Il campo "timeOffset" non è disponibile: usa 0. Se il testo è molto breve o è un appunto rapido, riportalo fedelmente e crea comunque una sintesi puntuale e appropriata.`;

    const response = await generateWithModelFallback({
      system: "Rispondi sempre e soltanto con JSON valido, senza testo prima o dopo. I contenuti sono in italiano.",
      prompt,
      json: true,
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione Vocale",
      language: "it",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: sourceText }],
      summary: {
        overview: `Registrazione elaborata con successo: ${sourceText.slice(0, 300)}`,
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

    if (!parsed.segments || parsed.segments.length === 0) {
      parsed.segments = [{ id: "seg_1", speakerId: "spk_1", speakerName: parsed.speakers?.[0]?.name || "Interlocutore 1", timeOffset: 0, text: sourceText }];
    }
    if (!parsed.speakers || parsed.speakers.length === 0) {
      parsed.speakers = [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }];
    }
    if (!parsed.summary) {
      parsed.summary = {
        overview: "Riassunto elaborato dall'IA.",
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
      error: error.message || "Errore durante l'elaborazione della riunione",
    });
  }
});

app.post("/api/transcribe", async (req, res) => {
  try {
    const { text, liveTranscript, transcript, plan, languageHint } = req.body;

    const sourceText = transcriptToText(text ?? liveTranscript ?? transcript);
    if (sourceText.replace(/\s/g, "").length < 15) {
      return res.status(400).json({
        success: false,
        error: "Trascrizione vuota o troppo breve: il riconoscimento vocale sul dispositivo non ha prodotto testo.",
      });
    }
    if (!sourceText) {
      return res.status(400).json({
        success: false,
        error: "Nessun testo da elaborare: trascrivi l'audio sul dispositivo e invia solo il testo.",
      });
    }

    const prompt = `Sei il modulo di strutturazione delle trascrizioni di Recap.
Ricevi una trascrizione testuale già prodotta sul dispositivo dell'utente. Non modificarne il contenuto: dividila in segmenti naturali e, SOLO se il testo lo rende evidente, separa gli interlocutori. Se non è possibile distinguerli usa un unico "Interlocutore 1".

Lingua principale attesa: ${languageHint || "Italiano"}.
Livello account: ${plan === "pro" ? "PRO" : "FREE"}.

TRASCRIZIONE:
"""
${sourceText}
"""

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
}

Il campo "timeOffset" non è disponibile: usa 0.`;

    const response = await generateWithModelFallback({
      system: "Rispondi sempre e soltanto con JSON valido, senza testo prima o dopo.",
      prompt,
      json: true,
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione",
      language: "it",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: sourceText }]
    });

    if (!parsed.segments || parsed.segments.length === 0) {
      parsed.segments = [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: sourceText }];
    }
    if (!parsed.speakers || parsed.speakers.length === 0) {
      parsed.speakers = [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }];
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Transcription structuring error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante l'elaborazione della trascrizione",
    });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, meetingTitle } = req.body;

    const prompt = `Sei l'assistente IA esecutivo di Recap.
Genera una sintesi professionale ad alto impatto per dirigenti e professionisti.

Titolo riunione: "${meetingTitle || "Riunione"}"

Trascrizione completa o segmenti:
${transcriptToText(transcript)}

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
      system: "Rispondi sempre e soltanto con JSON valido, senza testo prima o dopo. I contenuti sono in italiano.",
      prompt,
      json: true,
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

app.post("/api/detect-calendar-events", async (req, res) => {
  try {
    const { transcript, meetingDate } = req.body;

    const todayDate = meetingDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei il modulo 'Calendario AI' di Recap per professionisti.
Analizza accuratamente la trascrizione della riunione per identificare TUTTI gli impegni futuri, date, scadenze, riunioni di follow-up, call o demo concordate tra i partecipanti.

Data di riferimento della riunione: ${todayDate}.

Trascrizione:
${transcriptToText(transcript)}

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
      system: "Rispondi sempre e soltanto con JSON valido, senza testo prima o dopo. I contenuti sono in italiano.",
      prompt,
      json: true,
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

app.post("/api/analyze-tasks", async (req, res) => {
  try {
    const { tasks, referenceDate } = req.body;

    const todayDate = referenceDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei l'assistente IA di Recap specializzato nell'analisi predittiva della produttività e dell'agenda.
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
      system: "Rispondi sempre e soltanto con JSON valido, senza testo prima o dopo. I contenuti sono in italiano.",
      prompt,
      json: true,
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

app.post("/api/chat", async (req, res) => {
  try {
    const { question, transcript, summary, meetingTitle } = req.body;

    const prompt = `Sei l'assistente conversazionale intelligente di Recap.
Rispondi con massima precisione, tono professionale, cordiale ed efficace in lingua italiana.
Basa le tue risposte rigorosamente sui fatti e sulle decisioni emerse in questa specifica riunione:

TITOLO RIUNIONE: ${meetingTitle || "Riunione Recap"}

PANORAMICA / RIASSUNTO:
${summary ? JSON.stringify(summary, null, 2) : "Nessun riassunto disponibile"}

TRASCRIZIONE COMPLETA:
${transcriptToText(transcript)}

DOMANDA DELL'UTENTE:
${question}

Se l'utente ti chiede di formulare una mail di recap, una lista di task o un messaggio Slack per il team, crea il testo pronto per essere copiato ed inviato. Se un dettaglio non è stato menzionato nella riunione, specificalo con trasparenza senza inventare dati.`;

    const response = await generateWithModelFallback({
      prompt,
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

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3";
const GROQ_API_KEY =
  process.env.GROQ_API_KEY || (/groq\.com/i.test(OLLAMA_BASE_URL) ? process.env.OLLAMA_API_KEY || "" : "");
const TRANSCRIBE_DAILY_LIMIT_SEC = Number(process.env.TRANSCRIBE_DAILY_LIMIT_SEC) || 60 * 60;
const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;
const TRANSCRIBE_TIMEOUT_MS = Number(process.env.TRANSCRIBE_TIMEOUT_MS) || 120_000;

const transcribeUsage = new Map<string, { day: string; seconds: number }>();

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
function getTranscribeUsed(uid: string): number {
  const u = transcribeUsage.get(uid);
  return u && u.day === utcDay() ? u.seconds : 0;
}
function addTranscribeUsed(uid: string, seconds: number): void {
  transcribeUsage.set(uid, { day: utcDay(), seconds: getTranscribeUsed(uid) + seconds });
}

setInterval(() => {
  const day = utcDay();
  for (const [uid, u] of transcribeUsage) if (u.day !== day) transcribeUsage.delete(uid);
}, 60 * 60 * 1000).unref();

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

app.post(
  "/api/transcribe-audio",
  express.raw({ type: ["audio/*", "video/webm", "application/octet-stream"], limit: TRANSCRIBE_MAX_BYTES }),
  async (req, res) => {
    try {
      if (!GROQ_API_KEY) {
        console.error("[transcribe-audio] GROQ_API_KEY mancante.");
        return res.status(503).json({ success: false, error: "Trascrizione non configurata sul server." });
      }

      const audio = req.body as Buffer;
      if (!Buffer.isBuffer(audio) || audio.length < 1000) {
        return res.status(400).json({ success: false, error: "Audio mancante o troppo breve." });
      }

      const uid = req.authUser!.uid;
      const used = getTranscribeUsed(uid);
      if (used >= TRANSCRIBE_DAILY_LIMIT_SEC) {
        return res.status(429).json({
          success: false,
          error: `Hai raggiunto il limite giornaliero di trascrizione (${Math.round(TRANSCRIBE_DAILY_LIMIT_SEC / 60)} minuti). Riprova domani.`,
          code: "TRANSCRIBE_DAILY_LIMIT",
        });
      }

      const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      const ext = AUDIO_EXTENSIONS[mime] || "webm";
      const declared = Number(req.headers["x-audio-duration"]);
      const langHeader = String(req.headers["x-audio-language"] || "it").toLowerCase();
      const language = /^[a-z]{2}$/.test(langHeader) ? langHeader : "it";

      const form = new FormData();
      form.append("file", new Blob([audio as unknown as BlobPart], { type: mime || "audio/webm" }), `registrazione.${ext}`);
      form.append("model", GROQ_WHISPER_MODEL);
      form.append("language", language);
      form.append("temperature", "0");
      form.append("response_format", "verbose_json");
      if (language === "it") {
        form.append("prompt", "Trascrizione di una riunione di lavoro in italiano, con punteggiatura corretta.");
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
      let groqRes: Response;
      try {
        groqRes = await fetch(GROQ_TRANSCRIBE_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
          body: form,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!groqRes.ok) {
        const body = await groqRes.text();
        console.error(`[transcribe-audio] Groq HTTP ${groqRes.status}: ${body.slice(0, 300)}`);
        if (groqRes.status === 429) {
          return res.status(503).json({
            success: false,
            error: "Il servizio di trascrizione è molto richiesto in questo momento. Riprova tra qualche minuto.",
            code: "TRANSCRIBE_BUSY",
          });
        }
        if (groqRes.status === 400 || groqRes.status === 413) {
          return res.status(422).json({ success: false, error: "Audio non valido o troppo grande per la trascrizione." });
        }
        if (groqRes.status === 401 || groqRes.status === 403) {
          return res.status(503).json({ success: false, error: "Trascrizione non configurata correttamente sul server." });
        }
        return res.status(502).json({ success: false, error: "Errore dal servizio di trascrizione. Riprova." });
      }

      const data: any = await groqRes.json();
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      const realDuration = Number(data?.duration);
      const charged = Math.max(10, Math.ceil(realDuration > 0 ? realDuration : declared > 0 ? declared : 10));
      addTranscribeUsed(uid, charged);

      return res.json({
        success: true,
        text,
        durationSec: realDuration > 0 ? realDuration : undefined,
        remainingSec: Math.max(0, TRANSCRIBE_DAILY_LIMIT_SEC - getTranscribeUsed(uid)),
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return res.status(504).json({ success: false, error: "La trascrizione ha impiegato troppo tempo. Riprova." });
      }
      console.error("[transcribe-audio]", err);
      return res.status(500).json({ success: false, error: "Errore interno di trascrizione." });
    }
  },
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.type === "entity.too.large") {
      return res.status(413).json({ success: false, error: "File audio troppo grande (max 25 MB)." });
    }
    console.error("[transcribe-audio] body error", err);
    return res.status(400).json({ success: false, error: "Richiesta audio non valida." });
  }
);

interface RegisteredUser {
  email: string;
  name: string;
  createdAt: string;
  language?: "it" | "en";
  avatarUrl?: string;
}

interface Friendship {
  id: string;
  senderEmail: string;
  receiverEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  creditsEarnedFromFriend: number;
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
  type: "friend_request" | "friend_accepted" | "conversation_shared";
  senderEmail: string;
  senderName: string;
  friendshipId?: string;
  read: boolean;
  createdAt: string;
}

interface SharedConversation {
  id: string;
  ownerEmail: string;
  recipientEmail: string;
  title: string;
  meetingDate?: string;
  snapshot: unknown;
  createdAt: string;
  readAt?: string;
  hiddenByRecipient?: boolean;
}

interface DB {
  users: Record<string, RegisteredUser>;
  friendships: Friendship[];
  invitations?: Invitation[];
  notifications?: InAppNotification[];
  shares?: SharedConversation[];
}

const DB_FILE = path.join(process.cwd(), "recall_db.json");

function readDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      if (!db.invitations) db.invitations = [];
      if (!db.notifications) db.notifications = [];
      if (!db.shares) db.shares = [];
      return db;
    }
  } catch (e) {
    console.error("Failed reading database, returning empty database", e);
  }
  return { users: {}, friendships: [], invitations: [], notifications: [], shares: [] };
}

function writeDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing database", e);
  }
}

const requestHistory: Record<string, number[]> = {};

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 10;
  
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

const initialDb = readDB();
if (Object.keys(initialDb.users).length === 0) {
  initialDb.users["leo@alea.pro"] = { email: "leo@alea.pro", name: "Leonardo Fiorot", createdAt: new Date().toISOString() };
  initialDb.users["friend@example.com"] = { email: "friend@example.com", name: "Amico Demo", createdAt: new Date().toISOString() };
  initialDb.users["marco@alea.pro"] = { email: "marco@alea.pro", name: "Marco Rossini", createdAt: new Date().toISOString() };
  writeDB(initialDb);
}

app.post("/api/users/sync", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const name = cleanText(req.body?.name, 80) || cleanText(req.authUser!.name, 80);
    const inviteToken = cleanText(req.body?.inviteToken, 100);
    const language = req.body?.language === "en" || req.body?.language === "it" ? req.body.language : undefined;
    const db = readDB();
    const isNew = !db.users[normEmail];
    
    db.users[normEmail] = {
      email: normEmail,
      name: name || db.users[normEmail]?.name || normEmail.split("@")[0],
      createdAt: db.users[normEmail]?.createdAt || new Date().toISOString(),
      language: language || db.users[normEmail]?.language || "it",
      avatarUrl: db.users[normEmail]?.avatarUrl,
    };

    let linkedFriendship = false;
    let inviterName = "";

    if (inviteToken && isNew && db.invitations) {
      const invitation = db.invitations.find(inv => inv.token === inviteToken);
      if (invitation && invitation.status === "pending" && new Date(invitation.expiresAt) > new Date()) {
        const inviterEmail = invitation.senderEmail.toLowerCase().trim();
        const inviterUser = db.users[inviterEmail];
        inviterName = inviterUser?.name || inviterEmail.split("@")[0];

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

        invitation.status = "used";
      }
    }

    writeDB(db);
    res.json({ success: true, isNew, user: db.users[normEmail], linkedFriendship, inviterName });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.post("/api/friends/request", async (req, res) => {
  try {
    const normSender = req.authUser!.email;
    const normReceiver = cleanText(req.body?.receiverEmail, 254).toLowerCase();
    if (!normReceiver) {
      return res.status(400).json({ success: false, error: "Email destinatario richiesta" });
    }

    if (!isValidEmail(normReceiver)) {
      return res.status(400).json({ success: false, error: "Email destinatario non valida" });
    }

    if (normSender === normReceiver) {
      return res.status(400).json({ success: false, error: "Non puoi inviare una richiesta a te stesso" });
    }

    if (isRateLimited(normSender)) {
      return res.status(429).json({ success: false, error: "Hai inviato troppe richieste. Riprova tra poco." });
    }

    const db = readDB();
    const senderUser = db.users[normSender];
    const senderName = senderUser?.name || normSender.split("@")[0];
    const receiverExists = !!db.users[normReceiver];

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
          existing.status = "accepted";
          existing.updatedAt = new Date().toISOString();
          
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
      
      existing.status = "pending";
      existing.senderEmail = normSender;
      existing.receiverEmail = normReceiver;
      existing.updatedAt = new Date().toISOString();
      
      if (receiverExists) {
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
        const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`;
        if (!db.invitations) db.invitations = [];
        db.invitations.push({
          email: normReceiver,
          token,
          senderEmail: normSender,
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        writeDB(db);
        await sendInviteEmail(normReceiver, senderName, normSender, token, req);
        return res.json({ success: true, friendship: existing, registered: false, invitationToken: token });
      }
    }

    if (receiverExists) {
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

      const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`;
      db.invitations.push({
        email: normReceiver,
        token,
        senderEmail: normSender,
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      writeDB(db);

      await sendInviteEmail(normReceiver, senderName, normSender, token, req);
      res.json({ success: true, registered: false, invitationToken: token });
    }
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.post("/api/friends/respond", (req, res) => {
  try {
    const friendshipId = cleanText(req.body?.friendshipId, 100);
    const action = req.body?.action;
    if (!friendshipId || !action) {
      return res.status(400).json({ success: false, error: "friendshipId and action required" });
    }
    const normEmail = req.authUser!.email;
    if (action !== "accept" && action !== "reject") {
      return res.status(400).json({ success: false, error: "Action must be 'accept' or 'reject'" });
    }

    const db = readDB();
    const friendshipIndex = db.friendships.findIndex((f) => f.id === friendshipId);

    if (friendshipIndex === -1) {
      return res.status(404).json({ success: false, error: "Richiesta di amicizia non trovata" });
    }

    const friendship = db.friendships[friendshipIndex];

    if (friendship.receiverEmail !== normEmail) {
      return res.status(403).json({ success: false, error: "Non sei autorizzato a rispondere a questa richiesta" });
    }

    if (action === "accept") {
      friendship.status = "accepted";
      friendship.updatedAt = new Date().toISOString();

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

      db.notifications.forEach(not => {
        if (not.userEmail === normEmail && not.friendshipId === friendshipId && not.type === "friend_request") {
          not.read = true;
        }
      });
    } else {
      db.friendships.splice(friendshipIndex, 1);

      if (db.notifications) {
        db.notifications = db.notifications.filter(
          not => !(not.userEmail === normEmail && not.friendshipId === friendshipId)
        );
      }
    }

    writeDB(db);
    res.json({ success: true, action, friendship: action === "accept" ? friendship : null });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.get("/api/friends/list", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const db = readDB();

    const friends: Array<{ friendshipId: string; email: string; name: string; avatarUrl?: string; createdAt: string; creditsEarned: number }> = [];
    const receivedPending: Array<{ friendshipId: string; email: string; name: string; avatarUrl?: string; createdAt: string }> = [];
    const sentPending: Array<{ friendshipId: string; email: string; name: string; createdAt: string; registered: boolean }> = [];

    db.friendships.forEach((f) => {
      if (f.status === "accepted") {
        if (f.senderEmail === normEmail) {
          const friendUser = db.users[f.receiverEmail] || { email: f.receiverEmail, name: f.receiverEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.receiverEmail,
            name: friendUser.name,
            avatarUrl: (friendUser as any).avatarUrl,
            createdAt: f.createdAt,
            creditsEarned: f.creditsEarnedFromFriend,
          });
        } else if (f.receiverEmail === normEmail) {
          const friendUser = db.users[f.senderEmail] || { email: f.senderEmail, name: f.senderEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.senderEmail,
            name: friendUser.name,
            avatarUrl: (friendUser as any).avatarUrl,
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
            avatarUrl: (senderUser as any).avatarUrl,
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.get("/api/notifications", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const db = readDB();
    
    if (!db.notifications) db.notifications = [];
    
    const list = db.notifications
      .filter(not => not.userEmail === normEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications: list });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.post("/api/notifications/read", (req, res) => {
  try {
    const notificationId = cleanText(req.body?.notificationId, 100);
    const readAll = req.body?.readAll === true;
    const normEmail = req.authUser!.email;
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.post("/api/users/update-language", (req, res) => {
  try {
    const language = req.body?.language;
    const normEmail = req.authUser!.email;
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

const AVATAR_MAX_CHARS = 200_000;
app.post("/api/users/avatar", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const dataUrl = typeof req.body?.avatar === "string" ? req.body.avatar : "";
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
      return res.status(400).json({ success: false, error: "Formato immagine non valido" });
    }
    if (dataUrl.length > AVATAR_MAX_CHARS) {
      return res.status(413).json({ success: false, error: "Immagine troppo pesante" });
    }
    const db = readDB();
    if (!db.users[normEmail]) {
      return res.status(404).json({ success: false, error: "Utente non trovato" });
    }
    db.users[normEmail].avatarUrl = dataUrl;
    writeDB(db);
    res.json({ success: true, avatarUrl: dataUrl });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.delete("/api/users/avatar", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const db = readDB();
    if (!db.users[normEmail]) {
      return res.status(404).json({ success: false, error: "Utente non trovato" });
    }
    delete db.users[normEmail].avatarUrl;
    writeDB(db);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

const SHARE_MAX_CHARS = 600_000;

function areFriends(db: DB, a: string, b: string): boolean {
  return db.friendships.some(
    (f) =>
      f.status === "accepted" &&
      ((f.senderEmail === a && f.receiverEmail === b) || (f.senderEmail === b && f.receiverEmail === a))
  );
}

function shareMeta(db: DB, sh: SharedConversation) {
  const owner = db.users[sh.ownerEmail];
  const recipient = db.users[sh.recipientEmail];
  return {
    id: sh.id,
    title: sh.title,
    meetingDate: sh.meetingDate || "",
    createdAt: sh.createdAt,
    read: !!sh.readAt,
    ownerEmail: sh.ownerEmail,
    ownerName: owner?.name || sh.ownerEmail.split("@")[0],
    recipientEmail: sh.recipientEmail,
    recipientName: recipient?.name || sh.recipientEmail.split("@")[0],
  };
}

app.post("/api/shares", (req, res) => {
  try {
    const owner = req.authUser!.email;
    const friendEmail = cleanText(req.body?.friendEmail, 254).toLowerCase();
    const meeting = req.body?.meeting;
    if (!friendEmail || !meeting || typeof meeting !== "object" || Array.isArray(meeting)) {
      return res.status(400).json({ success: false, error: "Dati di condivisione non validi" });
    }
    if (friendEmail === owner) {
      return res.status(400).json({ success: false, error: "Non puoi condividere con te stesso" });
    }
    if (isRateLimited(`share:${owner}`)) {
      return res.status(429).json({ success: false, error: "Troppe condivisioni ravvicinate. Riprova tra qualche minuto." });
    }
    const db = readDB();
    if (!areFriends(db, owner, friendEmail)) {
      return res.status(403).json({ success: false, error: "Puoi condividere solo con i tuoi amici" });
    }
    const raw = JSON.stringify(meeting);
    if (raw.length > SHARE_MAX_CHARS) {
      return res.status(413).json({ success: false, error: "Conversazione troppo grande da condividere" });
    }
    const title = cleanText(meeting.title, 200) || "Conversazione";
    const meetingDate = cleanText(String(meeting.createdAt || meeting.date || ""), 40);
    const sh: SharedConversation = {
      id: `shr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ownerEmail: owner,
      recipientEmail: friendEmail,
      title,
      meetingDate,
      snapshot: JSON.parse(raw),
      createdAt: new Date().toISOString(),
    };
    if (!db.shares) db.shares = [];
    db.shares.push(sh);

    const ownerName = db.users[owner]?.name || owner.split("@")[0];
    const lang = db.users[friendEmail]?.language || "it";
    if (!db.notifications) db.notifications = [];
    db.notifications.push({
      id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userEmail: friendEmail,
      message:
        lang === "en"
          ? `"${ownerName}" shared the conversation "${title}" with you`
          : `"${ownerName}" ha condiviso con te la conversazione "${title}"`,
      type: "conversation_shared",
      senderEmail: owner,
      senderName: ownerName,
      read: false,
      createdAt: new Date().toISOString(),
    });

    writeDB(db);
    res.json({ success: true, share: shareMeta(db, sh) });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.get("/api/shares/received", (req, res) => {
  try {
    const me = req.authUser!.email;
    const db = readDB();
    const list = (db.shares || [])
      .filter((sh) => sh.recipientEmail === me && !sh.hiddenByRecipient)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((sh) => shareMeta(db, sh));
    res.json({ success: true, shares: list });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.get("/api/shares/sent", (req, res) => {
  try {
    const me = req.authUser!.email;
    const db = readDB();
    const list = (db.shares || [])
      .filter((sh) => sh.ownerEmail === me)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((sh) => shareMeta(db, sh));
    res.json({ success: true, shares: list });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.get("/api/shares/:id", (req, res) => {
  try {
    const me = req.authUser!.email;
    const id = cleanText(req.params.id, 100);
    const db = readDB();
    const sh = (db.shares || []).find((x) => x.id === id);
    const isOwner = !!sh && sh.ownerEmail === me;
    const isRecipient = !!sh && sh.recipientEmail === me && !sh.hiddenByRecipient;
    if (!sh || (!isOwner && !isRecipient)) {
      return res.status(404).json({ success: false, error: "Conversazione non trovata" });
    }
    if (isRecipient && !sh.readAt) {
      sh.readAt = new Date().toISOString();
      writeDB(db);
    }
    res.json({ success: true, share: shareMeta(db, sh), snapshot: sh.snapshot });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

app.delete("/api/shares/:id", (req, res) => {
  try {
    const me = req.authUser!.email;
    const id = cleanText(req.params.id, 100);
    const db = readDB();
    const sh = (db.shares || []).find((x) => x.id === id);
    if (!sh) return res.status(404).json({ success: false, error: "Conversazione non trovata" });
    if (sh.ownerEmail === me) {
      db.shares = (db.shares || []).filter((x) => x.id !== id);
    } else if (sh.recipientEmail === me) {
      sh.hiddenByRecipient = true;
    } else {
      return res.status(404).json({ success: false, error: "Conversazione non trovata" });
    }
    writeDB(db);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

async function sendInviteEmail(receiverEmail: string, senderName: string, senderEmail: string, inviteToken: string, req: express.Request) {
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "service_4o4xkok";
  const templateId = process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "template_mndv7mq";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "T0-fxkSF4j0YYTyeR";
  
  const origin = req.headers.origin || "http://localhost:3000";
  const inviteLink = `${origin}?inviteToken=${inviteToken}`;
  
  const db = readDB();
  const senderUser = db.users[senderEmail.toLowerCase().trim()];
  const senderLang = senderUser?.language || "it";
  const emailMessage = senderLang === "en"
    ? `Hello! ${senderName || senderEmail} has invited you to join Recap.`
    : `Ciao! ${senderName || senderEmail} ti ha invitato ad unirti a Recap.`;

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
      console.log(`[Backend Invite] Email inviata con successo a ${receiverEmail}`);
    } else {
      const txt = await response.text();
      console.error(`[Backend Invite] Errore EmailJS: ${txt}`);
    }
  } catch (err) {
    console.error("[Backend Invite] Invio email di invito fallito", err);
  }
}

app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} non trovato`,
  });
});

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
    console.log(`Recap server active on http://localhost:${PORT}`);
    void checkOllamaOnStartup();
  });
}

startServer();

app.get('/google6e883f65db785910.html', (req, res) => {
  res.send('google-site-verification: google6e883f65db785910.html');
});