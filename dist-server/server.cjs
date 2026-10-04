var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var import_crypto = __toESM(require("crypto"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0094177266",
  appId: "1:1002121828904:web:d4aa5faed8d56e41b2b31d",
  apiKey: "AIzaSyDqGTV3VsYG-_JfepgBepfDnJyQzzJFLG0",
  authDomain: "gen-lang-client-0094177266.firebaseapp.com",
  storageBucket: "gen-lang-client-0094177266.firebasestorage.app",
  messagingSenderId: "1002121828904",
  measurementId: "",
  oAuthClientId: "1002121828904-291ovb8kt2s2o03a2pinlvgj65h8v5o1.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// server.ts
var app = (0, import_express.default)();
app.set("trust proxy", 1);
var PORT = Number(process.env.PORT) || 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    console.error("[Auth] FIREBASE_SERVICE_ACCOUNT non \xE8 un JSON valido.");
    return null;
  }
}
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebase_applet_config_default.projectId;
var serviceAccount = loadServiceAccount();
if ((0, import_app.getApps)().length === 0) {
  (0, import_app.initializeApp)(
    serviceAccount ? { credential: (0, import_app.cert)(serviceAccount), projectId: FIREBASE_PROJECT_ID } : { projectId: FIREBASE_PROJECT_ID }
  );
}
if (!serviceAccount) {
  console.warn("[Auth] FIREBASE_SERVICE_ACCOUNT assente: la verifica OTP dell'email non potr\xE0 completarsi.");
}
var PUBLIC_API_ROUTES = /* @__PURE__ */ new Set(["GET /health", "GET /invitations/validate"]);
function makeAuthMiddleware(allowUnverified) {
  return async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!match) {
      return res.status(401).json({ success: false, error: "Autenticazione richiesta" });
    }
    try {
      const decoded = await (0, import_auth.getAuth)().verifyIdToken(match[1]);
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
        name: typeof decoded.name === "string" ? decoded.name : void 0
      };
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Sessione non valida o scaduta" });
    }
  };
}
var requireAuth = makeAuthMiddleware(false);
var requireAuthAllowUnverified = makeAuthMiddleware(true);
var UNVERIFIED_OK_ROUTES = /* @__PURE__ */ new Set(["POST /auth/otp/send", "POST /auth/otp/verify"]);
app.use("/api", (req, res, next) => {
  const key = `${req.method} ${req.path}`;
  if (PUBLIC_API_ROUTES.has(key)) return next();
  if (UNVERIFIED_OK_ROUTES.has(key)) return requireAuthAllowUnverified(req, res, next);
  return requireAuth(req, res, next);
});
function cleanText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLen);
}
var genAIClient = null;
function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    genAIClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return genAIClient;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Recall API", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
function sanitizeAudioMimeType(mime) {
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
function extractBase64Payload(dataUriOrBase64) {
  if (!dataUriOrBase64) return "";
  const commaIdx = dataUriOrBase64.indexOf(",");
  if (commaIdx !== -1) {
    return dataUriOrBase64.slice(commaIdx + 1).trim();
  }
  return dataUriOrBase64.trim();
}
var AUDIO_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
];
var FAST_TEXT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
];
async function generateWithModelFallback(params) {
  const ai = getGenAI();
  let lastError = null;
  const modelList = params.models && params.models.length > 0 ? params.models : FAST_TEXT_MODELS;
  for (const model of modelList) {
    try {
      const config = {
        temperature: params.temperature ?? 0.2
      };
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (model.includes("3.5-flash-lite") || model.includes("3.8-flash")) {
        config.thinkingConfig = { thinkingLevel: import_genai.ThinkingLevel.LOW };
      }
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config
      });
      if (response) {
        return response;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini Fast Mode] Model ${model} encountered an issue: ${errMsg.slice(0, 120)}. Switching to next fast candidate...`);
      if (errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE")) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }
  throw lastError || new Error("I server IA stanno riscontrando un picco temporaneo di richieste. Riprova tra qualche istante.");
}
function safeExtractJson(rawText, defaultFallback = {}) {
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
      } catch (e2) {
      }
    }
    const firstBracket = clean.indexOf("[");
    const lastBracket = clean.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(clean.substring(firstBracket, lastBracket + 1));
      } catch (e3) {
      }
    }
    console.warn("safeExtractJson fallback used due to parse failure:", clean.slice(0, 100));
    return defaultFallback;
  }
}
app.post("/api/process-meeting", async (req, res) => {
  try {
    const { audioData, mimeType, liveTranscript, plan, languageHint, referenceDate } = req.body;
    const ai = getGenAI();
    const cleanMime = sanitizeAudioMimeType(mimeType);
    const todayDate = referenceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const prompt = `Sei il motore ad altissima velocit\xE0 e precisione di Recall per professionisti.
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
        "task": "Descrizione chiara, concreta ed attuabile dell'attivit\xE0",
        "assignee": "Nome della persona incaricata (es. 'Leonardo', 'Marco' o 'Team')",
        "dueDate": "Data o scadenza concordata (es. 'Entro venerd\xEC' o '15 Settembre')",
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

Se l'audio o il parlato \xE8 molto breve o consiste in una frase/appunto rapido, trascrivilo comunque fedelmente e crea una sintesi puntuale e appropriata.`;
    let parts = [];
    if (audioData) {
      const rawBase64 = extractBase64Payload(audioData);
      if (rawBase64.length > 50) {
        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: rawBase64
          }
        });
      }
    }
    parts.push({ text: prompt });
    const response = await generateWithModelFallback({
      contents: parts,
      responseMimeType: "application/json",
      temperature: 0.2,
      models: AUDIO_MODELS
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
  } catch (error) {
    console.error("Process meeting error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante l'elaborazione ultra-rapida della riunione"
    });
  }
});
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
    let parts = [];
    if (audioData) {
      const rawBase64 = extractBase64Payload(audioData);
      if (rawBase64.length > 50) {
        parts.push({
          inlineData: {
            mimeType: cleanMime,
            data: rawBase64
          }
        });
      }
    }
    parts.push({ text: prompt });
    const response = await generateWithModelFallback({
      contents: parts,
      responseMimeType: "application/json",
      temperature: 0.2,
      models: AUDIO_MODELS
    });
    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione",
      language: "it",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: liveTranscript || "Trascrizione completata." }]
    });
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante la trascrizione audio"
    });
  }
});
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
      "task": "Descrizione chiara, concreta ed attuabile dell'attivit\xE0",
      "assignee": "Nome della persona incaricata (es. 'Leonardo', 'Marco' o 'Team')",
      "dueDate": "Data o scadenza concordata (es. 'Entro venerd\xEC ore 18:00' o '15 Settembre')",
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
      temperature: 0.2
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
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante la generazione del riassunto IA"
    });
  }
});
app.post("/api/detect-calendar-events", async (req, res) => {
  try {
    const { transcript, meetingDate } = req.body;
    const ai = getGenAI();
    const todayDate = meetingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
      temperature: 0.2
    });
    const parsed = safeExtractJson(response.text, { events: [] });
    res.json({ success: true, events: parsed.events || [] });
  } catch (error) {
    console.error("Calendar detection error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante il rilevamento impegni per il calendario"
    });
  }
});
app.post("/api/analyze-tasks", async (req, res) => {
  try {
    const { tasks, referenceDate } = req.body;
    const ai = getGenAI();
    const todayDate = referenceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const prompt = `Sei l'assistente IA di Recall specializzato nell'analisi predittiva della produttivit\xE0 e dell'agenda.
L'utente ti fornisce la lista delle sue attuali Google Tasks / attivit\xE0 da completare.
Il tuo compito \xE8 ESAMINARE ciascun task per determinare se si tratta in realt\xE0 di una RIUNIONE, APPUNTAMENTO, CALL, DEMO, COLLOQUIO o EVENTO che dovrebbe essere pianificato su Google Calendar anzich\xE9 rimanere come semplice to-do text.

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
      "reasoning": "Spiegazione chiara in italiano sul perch\xE9 questo task \xE8 identificato come evento o riunione (es. 'Il task indica chiaramente una call con Marco fissata per gioved\xEC alle 15:00')",
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

Se un task \xE8 una semplice to-do (es. 'Inviare fattura', 'Comprare cavo HDMI', 'Scrivere documentazione'), imposta "isMeetingOrEvent": false, confidence: 0.95, reasoning: "Attivit\xE0 operativa, non richiede una riunione", e ometti o lascia null "suggestedEvent".
Se un task menziona 'Call', 'Meeting', 'Riunione', 'Incontro', 'Demo', 'Allineamento', 'Visita', 'Colloquio' o include giorni/ore, imposta "isMeetingOrEvent": true con i dettagli del suggestedEvent.`;
    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      temperature: 0.2
    });
    const parsed = safeExtractJson(response.text, { analyses: [] });
    res.json({ success: true, analyses: parsed.analyses || [] });
  } catch (error) {
    console.error("Task analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore durante l'analisi delle task con IA"
    });
  }
});
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

Se l'utente ti chiede di formulare una mail di recap, una lista di task o un messaggio Slack per il team, crea il testo pronto per essere copiato ed inviato. Se un dettaglio non \xE8 stato menzionato nella riunione, specificalo con trasparenza senza inventare dati.`;
    const response = await generateWithModelFallback({
      contents: [{ text: prompt }],
      temperature: 0.3
    });
    res.json({
      success: true,
      answer: response.text || "Non sono riuscito a elaborare una risposta."
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nella chat IA"
    });
  }
});
var OTP_TTL_MS = 10 * 60 * 1e3;
var OTP_MAX_ATTEMPTS = 5;
var OTP_RESEND_MS = 60 * 1e3;
var OTP_MAX_SENDS_PER_HOUR = 5;
var OTP_SECRET = import_crypto.default.randomBytes(32);
var otpChallenges = /* @__PURE__ */ new Map();
var OTP_MAX_SENDS_PER_IP_HOUR = 20;
var otpIpSends = /* @__PURE__ */ new Map();
function hashOtp(uid, code) {
  return import_crypto.default.createHmac("sha256", OTP_SECRET).update(`${uid}:${code}`).digest("hex");
}
setInterval(() => {
  const now = Date.now();
  for (const [uid, ch] of otpChallenges) {
    if (ch.expiresAt < now && now - ch.lastSentAt > 60 * 60 * 1e3) otpChallenges.delete(uid);
  }
  for (const [ip, list] of otpIpSends) {
    const recent = list.filter((ts) => now - ts < 60 * 60 * 1e3);
    if (recent.length) otpIpSends.set(ip, recent);
    else otpIpSends.delete(ip);
  }
}, 10 * 60 * 1e3).unref();
async function sendOtpEmailServer(toEmail, toName, code) {
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "service_19poemn";
  const templateId = process.env.EMAILJS_OTP_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "template_mndv7mq";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "T0-fxkSF4j0YYTyeR";
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        ...privateKey ? { accessToken: privateKey } : {},
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
          message: `Il tuo codice di verifica per completare l'accesso \xE8: ${code}`
        }
      })
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
app.post("/api/auth/otp/send", async (req, res) => {
  try {
    const { uid, email, emailVerified } = req.authUser;
    if (emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }
    const now = Date.now();
    const ip = req.ip || "unknown";
    const ipRecent = (otpIpSends.get(ip) || []).filter((ts) => now - ts < 60 * 60 * 1e3);
    if (ipRecent.length >= OTP_MAX_SENDS_PER_IP_HOUR) {
      return res.status(429).json({ success: false, error: "Troppe richieste da questa rete. Riprova tra un'ora." });
    }
    const previous = otpChallenges.get(uid);
    const recentSends = (previous?.sentAt || []).filter((ts) => now - ts < 60 * 60 * 1e3);
    if (previous && now - previous.lastSentAt < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (now - previous.lastSentAt)) / 1e3);
      return res.status(429).json({ success: false, error: `Attendi ${wait}s prima di richiedere un nuovo codice.`, retryAfterSeconds: wait });
    }
    if (recentSends.length >= OTP_MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ success: false, error: "Hai richiesto troppi codici. Riprova tra un'ora." });
    }
    const code = String(import_crypto.default.randomInt(1e5, 1e6));
    const name = cleanText(req.body?.name, 80) || req.authUser.name || email.split("@")[0];
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
      sentAt: [...recentSends, now]
    });
    res.json({ success: true, resendAfterSeconds: OTP_RESEND_MS / 1e3 });
  } catch (err) {
    console.error("[OTP send]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.post("/api/auth/otp/verify", async (req, res) => {
  try {
    const { uid, emailVerified } = req.authUser;
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
    const ok = expected.length === received.length && import_crypto.default.timingSafeEqual(expected, received);
    if (!ok) {
      const left = OTP_MAX_ATTEMPTS - challenge.attempts;
      if (left <= 0) {
        otpChallenges.delete(uid);
        return res.status(429).json({ success: false, error: "Troppi tentativi: richiedi un nuovo codice." });
      }
      return res.status(400).json({ success: false, error: `Codice non corretto. Tentativi rimasti: ${left}` });
    }
    try {
      await (0, import_auth.getAuth)().updateUser(uid, { emailVerified: true });
    } catch (err) {
      console.error("[OTP verify] updateUser fallito (manca FIREBASE_SERVICE_ACCOUNT o \xE8 errato?)", err);
      return res.status(503).json({ success: false, error: "Verifica non completabile: configurazione del server incompleta." });
    }
    otpChallenges.delete(uid);
    res.json({ success: true });
  } catch (err) {
    console.error("[OTP verify]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
var DB_FILE = import_path.default.join(process.cwd(), "recall_db.json");
function readDB() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const data = import_fs.default.readFileSync(DB_FILE, "utf-8");
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
function writeDB(db) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing database", e);
  }
}
var requestHistory = {};
function isRateLimited(email) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1e3;
  const maxRequests = 10;
  if (!requestHistory[email]) {
    requestHistory[email] = [];
  }
  requestHistory[email] = requestHistory[email].filter((ts) => now - ts < windowMs);
  if (requestHistory[email].length >= maxRequests) {
    return true;
  }
  requestHistory[email].push(now);
  return false;
}
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
var initialDb = readDB();
if (Object.keys(initialDb.users).length === 0) {
  initialDb.users["leo@alea.pro"] = { email: "leo@alea.pro", name: "Leonardo Fiorot", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  initialDb.users["friend@example.com"] = { email: "friend@example.com", name: "Amico Demo", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  initialDb.users["marco@alea.pro"] = { email: "marco@alea.pro", name: "Marco Rossini", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  writeDB(initialDb);
}
app.post("/api/users/sync", (req, res) => {
  try {
    const normEmail = req.authUser.email;
    const name = cleanText(req.body?.name, 80) || cleanText(req.authUser.name, 80);
    const inviteToken = cleanText(req.body?.inviteToken, 100);
    const language = req.body?.language === "en" || req.body?.language === "it" ? req.body.language : void 0;
    const db = readDB();
    const isNew = !db.users[normEmail];
    db.users[normEmail] = {
      email: normEmail,
      name: name || db.users[normEmail]?.name || normEmail.split("@")[0],
      createdAt: db.users[normEmail]?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      language: language || db.users[normEmail]?.language || "it"
    };
    let linkedFriendship = false;
    let inviterName = "";
    if (inviteToken && isNew && db.invitations) {
      const invitation = db.invitations.find((inv) => inv.token === inviteToken);
      if (invitation && invitation.status === "pending" && new Date(invitation.expiresAt) > /* @__PURE__ */ new Date()) {
        const inviterEmail = invitation.senderEmail.toLowerCase().trim();
        const inviterUser = db.users[inviterEmail];
        inviterName = inviterUser?.name || inviterEmail.split("@")[0];
        const existingFnd = db.friendships.find(
          (f) => f.senderEmail === inviterEmail && f.receiverEmail === normEmail || f.senderEmail === normEmail && f.receiverEmail === inviterEmail
        );
        if (!existingFnd) {
          const newFnd = {
            id: `fnd_${Date.now()}`,
            senderEmail: inviterEmail,
            receiverEmail: normEmail,
            status: "pending",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            creditsEarnedFromFriend: 0
          };
          db.friendships.push(newFnd);
          const targetLang = db.users[normEmail]?.language || "it";
          const msgText = targetLang === "en" ? `"${inviterName}" sent you a friend request!` : `"${inviterName}" ti ha inviato una richiesta di amicizia!`;
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
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          linkedFriendship = true;
        }
        invitation.status = "used";
      }
    }
    writeDB(db);
    res.json({ success: true, isNew, user: db.users[normEmail], linkedFriendship, inviterName });
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.post("/api/friends/request", async (req, res) => {
  try {
    const normSender = req.authUser.email;
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
      (f) => f.senderEmail === normSender && f.receiverEmail === normReceiver || f.senderEmail === normReceiver && f.receiverEmail === normSender
    );
    if (existingIndex !== -1) {
      const existing = db.friendships[existingIndex];
      if (existing.status === "accepted") {
        return res.status(400).json({ success: false, error: "Siete gi\xE0 amici!" });
      }
      if (existing.status === "pending") {
        if (existing.senderEmail === normSender) {
          return res.status(400).json({ success: false, error: "Hai gi\xE0 inviato una richiesta a questo utente" });
        } else {
          existing.status = "accepted";
          existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          const senderLang = db.users[normSender]?.language || "it";
          const acceptedMsg = senderLang === "en" ? `"${db.users[normReceiver]?.name || normReceiver.split("@")[0]}" accepted your friend request!` : `"${db.users[normReceiver]?.name || normReceiver.split("@")[0]}" ha accettato la tua richiesta di amicizia!`;
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
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          writeDB(db);
          return res.json({ success: true, acceptedAutomatic: true, friendship: existing });
        }
      }
      existing.status = "pending";
      existing.senderEmail = normSender;
      existing.receiverEmail = normReceiver;
      existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (receiverExists) {
        const receiverLang = db.users[normReceiver]?.language || "it";
        const msgText = receiverLang === "en" ? `"${senderName}" sent you a friend request!` : `"${senderName}" ti ha inviato una richiesta di amicizia!`;
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
          // 7 days expiration
        });
        writeDB(db);
        await sendInviteEmail(normReceiver, senderName, normSender, token, req);
        return res.json({ success: true, friendship: existing, registered: false, invitationToken: token });
      }
    }
    if (receiverExists) {
      const newFriendship = {
        id: `fnd_${Date.now()}`,
        senderEmail: normSender,
        receiverEmail: normReceiver,
        status: "pending",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        creditsEarnedFromFriend: 0
      };
      db.friendships.push(newFriendship);
      const receiverLang = db.users[normReceiver]?.language || "it";
      const msgText = receiverLang === "en" ? `"${senderName}" sent you a friend request!` : `"${senderName}" ti ha inviato una richiesta di amicizia!`;
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      writeDB(db);
      res.json({ success: true, friendship: newFriendship, registered: true });
    } else {
      if (!db.invitations) db.invitations = [];
      const activeInvitation = db.invitations.find(
        (inv) => inv.email === normReceiver && inv.status === "pending" && new Date(inv.expiresAt) > /* @__PURE__ */ new Date()
      );
      if (activeInvitation) {
        return res.status(400).json({
          success: false,
          error: "Un invito \xE8 gi\xE0 stato inviato a questa email ed \xE8 in attesa di registrazione"
        });
      }
      const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`;
      db.invitations.push({
        email: normReceiver,
        token,
        senderEmail: normSender,
        status: "pending",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        // 7 days
      });
      writeDB(db);
      await sendInviteEmail(normReceiver, senderName, normSender, token, req);
      res.json({ success: true, registered: false, invitationToken: token });
    }
  } catch (err) {
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
    const normEmail = req.authUser.email;
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
      friendship.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const receiverUser = db.users[normEmail];
      const receiverName = receiverUser?.name || normEmail.split("@")[0];
      const senderLang = db.users[friendship.senderEmail]?.language || "it";
      const acceptedMsgText = senderLang === "en" ? `"${receiverName}" accepted your friend request!` : `"${receiverName}" ha accettato la tua richiesta di amicizia!`;
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      db.notifications.forEach((not) => {
        if (not.userEmail === normEmail && not.friendshipId === friendshipId && not.type === "friend_request") {
          not.read = true;
        }
      });
    } else {
      db.friendships.splice(friendshipIndex, 1);
      if (db.notifications) {
        db.notifications = db.notifications.filter(
          (not) => !(not.userEmail === normEmail && not.friendshipId === friendshipId)
        );
      }
    }
    writeDB(db);
    res.json({ success: true, action, friendship: action === "accept" ? friendship : null });
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.get("/api/friends/list", (req, res) => {
  try {
    const normEmail = req.authUser.email;
    const db = readDB();
    const friends = [];
    const receivedPending = [];
    const sentPending = [];
    db.friendships.forEach((f) => {
      if (f.status === "accepted") {
        if (f.senderEmail === normEmail) {
          const friendUser = db.users[f.receiverEmail] || { email: f.receiverEmail, name: f.receiverEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.receiverEmail,
            name: friendUser.name,
            createdAt: f.createdAt,
            creditsEarned: f.creditsEarnedFromFriend
          });
        } else if (f.receiverEmail === normEmail) {
          const friendUser = db.users[f.senderEmail] || { email: f.senderEmail, name: f.senderEmail.split("@")[0] };
          friends.push({
            friendshipId: f.id,
            email: f.senderEmail,
            name: friendUser.name,
            createdAt: f.createdAt,
            creditsEarned: f.creditsEarnedFromFriend
          });
        }
      } else if (f.status === "pending") {
        if (f.receiverEmail === normEmail) {
          const senderUser = db.users[f.senderEmail] || { email: f.senderEmail, name: f.senderEmail.split("@")[0] };
          receivedPending.push({
            friendshipId: f.id,
            email: f.senderEmail,
            name: senderUser.name,
            createdAt: f.createdAt
          });
        } else if (f.senderEmail === normEmail) {
          const receiverRegistered = !!db.users[f.receiverEmail];
          const receiverUser = db.users[f.receiverEmail] || { email: f.receiverEmail, name: f.receiverEmail.split("@")[0] };
          sentPending.push({
            friendshipId: f.id,
            email: f.receiverEmail,
            name: receiverUser.name,
            createdAt: f.createdAt,
            registered: receiverRegistered
          });
        }
      }
    });
    res.json({ success: true, friends, receivedPending, sentPending });
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.get("/api/notifications", (req, res) => {
  try {
    const normEmail = req.authUser.email;
    const db = readDB();
    if (!db.notifications) db.notifications = [];
    const list = db.notifications.filter((not) => not.userEmail === normEmail).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, notifications: list });
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.post("/api/notifications/read", (req, res) => {
  try {
    const notificationId = cleanText(req.body?.notificationId, 100);
    const readAll = req.body?.readAll === true;
    const normEmail = req.authUser.email;
    const db = readDB();
    if (!db.notifications) db.notifications = [];
    if (readAll) {
      db.notifications.forEach((not) => {
        if (not.userEmail === normEmail) {
          not.read = true;
        }
      });
    } else if (notificationId) {
      const not = db.notifications.find((n) => n.id === notificationId && n.userEmail === normEmail);
      if (not) {
        not.read = true;
      }
    }
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
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
    const invitation = db.invitations.find((inv) => inv.token === String(token));
    if (!invitation) {
      return res.status(404).json({ success: false, error: "Token non valido o inesistente" });
    }
    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, error: `Questo token \xE8 gi\xE0 stato utilizzato (${invitation.status})` });
    }
    if (new Date(invitation.expiresAt) <= /* @__PURE__ */ new Date()) {
      return res.status(400).json({ success: false, error: "Questo token di invito \xE8 scaduto" });
    }
    const inviterUser = db.users[invitation.senderEmail.toLowerCase().trim()];
    const inviterName = inviterUser?.name || invitation.senderEmail.split("@")[0];
    res.json({ success: true, invitation, inviterName });
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
app.post("/api/users/update-language", (req, res) => {
  try {
    const language = req.body?.language;
    const normEmail = req.authUser.email;
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
  } catch (err) {
    console.error("[API error]", err);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});
async function sendInviteEmail(receiverEmail, senderName, senderEmail, inviteToken, req) {
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "service_4o4xkok";
  const templateId = process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "template_mndv7mq";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "T0-fxkSF4j0YYTyeR";
  const origin = req.headers.origin || "https://ais-dev-cnni324kpf4faqg7qs5ekl-615634755252.europe-west2.run.app";
  const inviteLink = `${origin}?inviteToken=${inviteToken}`;
  console.log(`[Backend Invite] Generating invitation link for ${receiverEmail}: ${inviteLink}`);
  const db = readDB();
  const senderUser = db.users[senderEmail.toLowerCase().trim()];
  const senderLang = senderUser?.language || "it";
  const emailMessage = senderLang === "en" ? `Hello! ${senderName || senderEmail} has invited you to join Recall AI.` : `Ciao! ${senderName || senderEmail} ti ha invitato ad unirti a Recall AI.`;
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
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} non trovato`
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Recall server active on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
