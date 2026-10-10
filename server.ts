import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json";

const app = express();
// Dietro il proxy di Render serve per leggere l'IP reale del client (limiti per IP)
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- AUTENTICAZIONE: verifica dell'ID token Firebase ---
// Per verificare un ID token basta il projectId (le chiavi pubbliche le scarica Google): nessun segreto richiesto.
// Per VERIFICARE i token basta il projectId. Per segnare un'email come verificata (flusso OTP)
// serve invece un service account: va messo nella variabile d'ambiente FIREBASE_SERVICE_ACCOUNT (JSON intero).
function loadServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    console.error("[Auth] FIREBASE_SERVICE_ACCOUNT non è un JSON valido.");
    return null;
  }
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId;
const serviceAccount = loadServiceAccount();
if (getAdminApps().length === 0) {
  initAdminApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID }
      : { projectId: FIREBASE_PROJECT_ID }
  );
}
if (!serviceAccount) {
  console.warn("[Auth] FIREBASE_SERVICE_ACCOUNT assente: la verifica OTP dell'email non potrà completarsi.");
}

interface AuthedUser {
  uid: string;
  email: string; // sempre minuscola
  emailVerified: boolean;
  name?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

// Rotte /api/* raggiungibili senza login (percorso relativo a /api)
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

// Le uniche rotte che un utente con email NON ancora verificata può chiamare (servono a verificarla)
const UNVERIFIED_OK_ROUTES = new Set<string>(["POST /auth/otp/send", "POST /auth/otp/verify"]);

app.use("/api", (req, res, next) => {
  const key = `${req.method} ${req.path}`;
  if (PUBLIC_API_ROUTES.has(key)) return next();
  if (UNVERIFIED_OK_ROUTES.has(key)) return requireAuthAllowUnverified(req, res, next);
  return requireAuth(req, res, next);
});

// Helper di validazione input
function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLen);
}

// --- IA: Ollama locale (API compatibile OpenAI) ---
// Tutte le richieste di TESTO passano da qui. L'audio NON arriva mai al server:
// la trascrizione avviene sul dispositivo e il server riceve solo testo.
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ollama"; // fittizia: Ollama non la richiede
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000; // un LLM locale su CPU può essere lento
// Modelli di riserva opzionali, separati da virgola (es. "llama3.2:1b,qwen2.5:3b")
const OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS || "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
// Limite di caratteri di trascrizione inviati al modello (protegge dal troncamento silenzioso del contesto)
const MAX_TRANSCRIPT_CHARS = Number(process.env.MAX_TRANSCRIPT_CHARS) || 24_000;

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Recall API", timestamp: new Date().toISOString() });
});

// Converte una trascrizione (stringa, segmenti [{speakerName, text}] o altro) in testo compatto per il prompt.
// Se è troppo lunga tiene inizio e fine, perché Ollama tronca il contesto in silenzio.
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

// Generatore di testo su Ollama con retry sui modelli di riserva
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
    // Fino a 2 tentativi per modello: il secondo solo dopo un 429 (limite del piano gratuito), rispettando Retry-After
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

// Controllo all'avvio: segnala subito se Ollama non è raggiungibile
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

// API UNIFICATA: elaborazione di una riunione a partire dal TESTO già trascritto sul dispositivo
// (trascrizione + segmenti + sintesi + action items + impegni calendario in un solo passaggio).
// Il server non riceve né elabora audio: eventuali campi audio nel body vengono ignorati.
app.post("/api/process-meeting", async (req, res) => {
  try {
    const { text, liveTranscript, transcript, plan, languageHint, referenceDate } = req.body;

    const sourceText = transcriptToText(text ?? liveTranscript ?? transcript);
    console.log("[process-meeting] tipo:", typeof (text ?? liveTranscript ?? transcript), "| lunghezza:", sourceText.length, "| anteprima:", JSON.stringify(sourceText.slice(0, 200)));
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

    const prompt = `Sei il motore di elaborazione di Recall per professionisti.
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

    // Ensure fallback speaker/segments if empty
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

// API: strutturazione di una trascrizione già prodotta sul dispositivo (titolo, categoria, interlocutori, segmenti).
// Riceve TESTO (body.text o body.liveTranscript), mai audio.
app.post("/api/transcribe", async (req, res) => {
  try {
    const { text, liveTranscript, transcript, plan, languageHint } = req.body;

    const sourceText = transcriptToText(text ?? liveTranscript ?? transcript);
    console.log("[transcribe] tipo:", typeof (text ?? liveTranscript ?? transcript), "| lunghezza:", sourceText.length, "| anteprima:", JSON.stringify(sourceText.slice(0, 200)));
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

    const prompt = `Sei il modulo di strutturazione delle trascrizioni di Recall.
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

// API: AI Meeting Summary & Action Items
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, meetingTitle } = req.body;

    const prompt = `Sei l'assistente IA esecutivo di Recall.
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

// API: AI Calendar Commitments Detection from Meeting Transcript
app.post("/api/detect-calendar-events", async (req, res) => {
  try {
    const { transcript, meetingDate } = req.body;

    const todayDate = meetingDate || new Date().toISOString().split("T")[0];

    const prompt = `Sei il modulo 'Calendario AI' di Recall per professionisti.
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

// API: AI Task Inspection (Detect if tasks are meetings or calendar events)
app.post("/api/analyze-tasks", async (req, res) => {
  try {
    const { tasks, referenceDate } = req.body;

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

// API: Interactive AI Chat over Meeting Transcript
app.post("/api/chat", async (req, res) => {
  try {
    const { question, transcript, summary, meetingTitle } = req.body;

    const prompt = `Sei l'assistente conversazionale intelligente di Recall.
Rispondi con massima precisione, tono professionale, cordiale ed efficace in lingua italiana.
Basa le tue risposte rigorosamente sui fatti e sulle decisioni emerse in questa specifica riunione:

TITOLO RIUNIONE: ${meetingTitle || "Riunione Recall"}

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

// --- VERIFICA EMAIL CON CODICE OTP (generato e controllato solo dal server) ---
interface OtpChallenge {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sentAt: number[]; // timestamp degli invii nell'ultima ora
}

const OTP_TTL_MS = 10 * 60 * 1000; // il codice vale 10 minuti
const OTP_MAX_ATTEMPTS = 5; // tentativi di inserimento per codice
const OTP_RESEND_MS = 60 * 1000; // minimo 60s tra due invii
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_SECRET = crypto.randomBytes(32); // vale finché il processo resta acceso (come i codici)
const otpChallenges = new Map<string, OtpChallenge>(); // chiave: uid Firebase
// Limite per IP: chiunque può creare account Firebase con email altrui, quindi senza questo limite
// si potrebbero spedire molte email a indirizzi di terzi usando la tua quota EmailJS.
const OTP_MAX_SENDS_PER_IP_HOUR = 20;
const otpIpSends = new Map<string, number[]>();

function hashOtp(uid: string, code: string): string {
  return crypto.createHmac("sha256", OTP_SECRET).update(`${uid}:${code}`).digest("hex");
}

setInterval(() => {
  const now = Date.now();
  for (const [uid, ch] of otpChallenges) {
    if (ch.expiresAt < now && now - ch.lastSentAt > 60 * 60 * 1000) otpChallenges.delete(uid);
  }
  for (const [ip, list] of otpIpSends) {
    const recent = list.filter((ts) => now - ts < 60 * 60 * 1000);
    if (recent.length) otpIpSends.set(ip, recent);
    else otpIpSends.delete(ip);
  }
}, 10 * 60 * 1000).unref();

async function sendOtpEmailServer(toEmail: string, toName: string, code: string): Promise<boolean> {
  // Stessi nomi variabile usati finora dal client; i default sono le credenziali EmailJS "attuali" dell'app.
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "service_19poemn";
  const templateId = process.env.EMAILJS_OTP_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "template_mndv7mq";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "T0-fxkSF4j0YYTyeR";
  const privateKey = process.env.EMAILJS_PRIVATE_KEY; // opzionale ma consigliata per chiamate dal server

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        ...(privateKey ? { accessToken: privateKey } : {}),
        template_params: {
          to_email: toEmail,
          to_name: toName,
          user_email: toEmail,
          user_name: toName,
          email: toEmail,
          name: toName,
          otp_code: code,
          otpCode: code,
          code,
          app_name: "Recall AI Meeting Assistant",
          message: `Il tuo codice di verifica per completare l'accesso è: ${code}`,
        },
      }),
    });
    if (!response.ok) {
      console.error(`[OTP] EmailJS ha risposto ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[OTP] Invio EmailJS fallito", err);
    return false;
  }
}

// Invia (o reinvia) un codice a 6 cifre all'email dell'utente autenticato
app.post("/api/auth/otp/send", async (req, res) => {
  try {
    const { uid, email, emailVerified } = req.authUser!;
    if (emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const now = Date.now();
    const ip = req.ip || "unknown";
    const ipRecent = (otpIpSends.get(ip) || []).filter((ts) => now - ts < 60 * 60 * 1000);
    if (ipRecent.length >= OTP_MAX_SENDS_PER_IP_HOUR) {
      return res.status(429).json({ success: false, error: "Troppe richieste da questa rete. Riprova tra un'ora." });
    }
    const previous = otpChallenges.get(uid);
    const recentSends = (previous?.sentAt || []).filter((ts) => now - ts < 60 * 60 * 1000);

    if (previous && now - previous.lastSentAt < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (now - previous.lastSentAt)) / 1000);
      return res.status(429).json({ success: false, error: `Attendi ${wait}s prima di richiedere un nuovo codice.`, retryAfterSeconds: wait });
    }
    if (recentSends.length >= OTP_MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ success: false, error: "Hai richiesto troppi codici. Riprova tra un'ora." });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const name = cleanText(req.body?.name, 80) || req.authUser!.name || email.split("@")[0];

    const sent = await sendOtpEmailServer(email, name, code);
    if (!sent) {
      return res.status(502).json({ success: false, error: "Non riesco a inviare l'email in questo momento. Riprova tra poco." });
    }

    ipRecent.push(now);
    otpIpSends.set(ip, ipRecent);
    otpChallenges.set(uid, {
      codeHash: hashOtp(uid, code),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      sentAt: [...recentSends, now],
    });
    res.json({ success: true, resendAfterSeconds: OTP_RESEND_MS / 1000 });
  } catch (err: any) {
    console.error("[OTP send]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// Controlla il codice; se è giusto marca l'email come verificata su Firebase
app.post("/api/auth/otp/verify", async (req, res) => {
  try {
    const { uid, emailVerified } = req.authUser!;
    if (emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const code = cleanText(req.body?.code, 12);
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: "Inserisci il codice di 6 cifre" });
    }

    const challenge = otpChallenges.get(uid);
    if (!challenge) {
      return res.status(400).json({ success: false, error: "Nessun codice attivo: richiedine uno nuovo." });
    }
    if (Date.now() > challenge.expiresAt) {
      otpChallenges.delete(uid);
      return res.status(400).json({ success: false, error: "Codice scaduto: richiedine uno nuovo." });
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      otpChallenges.delete(uid);
      return res.status(429).json({ success: false, error: "Troppi tentativi: richiedi un nuovo codice." });
    }

    challenge.attempts += 1;
    const expected = Buffer.from(challenge.codeHash, "hex");
    const received = Buffer.from(hashOtp(uid, code), "hex");
    const ok = expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!ok) {
      const left = OTP_MAX_ATTEMPTS - challenge.attempts;
      if (left <= 0) {
        otpChallenges.delete(uid);
        return res.status(429).json({ success: false, error: "Troppi tentativi: richiedi un nuovo codice." });
      }
      return res.status(400).json({ success: false, error: `Codice non corretto. Tentativi rimasti: ${left}` });
    }

    try {
      await getAdminAuth().updateUser(uid, { emailVerified: true });
    } catch (err) {
      console.error("[OTP verify] updateUser fallito (manca FIREBASE_SERVICE_ACCOUNT o è errato?)", err);
      return res.status(503).json({ success: false, error: "Verifica non completabile: configurazione del server incompleta." });
    }

    otpChallenges.delete(uid);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[OTP verify]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
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
    // L'identità arriva SOLO dal token verificato: l'email nel body (se c'è) viene ignorata.
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 2. Send Friend Request or Invite Link
app.post("/api/friends/request", async (req, res) => {
  try {
    const normSender = req.authUser!.email; // mittente = utente autenticato, mai preso dal body
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 3. Respond to Friend Request (Accept/Reject)
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 4. List Friends and Requests
app.get("/api/friends/list", (req, res) => {
  try {
    const normEmail = req.authUser!.email; // si vedono solo i propri amici
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 5. Get In-App Notifications
app.get("/api/notifications", (req, res) => {
  try {
    const normEmail = req.authUser!.email;
    const db = readDB();
    
    if (!db.notifications) db.notifications = [];
    
    // Sort notifications by newest first
    const list = db.notifications
      .filter(not => not.userEmail === normEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications: list });
  } catch (err: any) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 6. Mark Notifications as Read
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
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

// 4. Update User Language preference
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
    void checkOllamaOnStartup();
  });
}

startServer();
