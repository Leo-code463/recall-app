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
var import_vite = require("vite");
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
app.get(["/privacy", "/privacy/"], (req, res) => {
  res.sendFile(process.cwd() + "/public/privacy/index.html");
});
app.set("trust proxy", 1);
var PORT = Number(process.env.PORT) || 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebase_applet_config_default.projectId;
if ((0, import_app.getApps)().length === 0) {
  (0, import_app.initializeApp)({ projectId: FIREBASE_PROJECT_ID });
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
var UNVERIFIED_OK_ROUTES = /* @__PURE__ */ new Set();
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
var OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/+$/, "");
var OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
var OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ollama";
var OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 12e4;
var OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS || "").split(",").map((m) => m.trim()).filter(Boolean);
var MAX_TRANSCRIPT_CHARS = Number(process.env.MAX_TRANSCRIPT_CHARS) || 24e3;
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Recap API", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
function transcriptToText(transcript, maxChars = MAX_TRANSCRIPT_CHARS) {
  let text = "";
  if (typeof transcript === "string") {
    text = transcript;
  } else if (Array.isArray(transcript)) {
    text = transcript.map((seg) => {
      if (typeof seg === "string") return seg;
      const who = typeof seg?.speakerName === "string" ? seg.speakerName : typeof seg?.speaker === "string" ? seg.speaker : "";
      const line = typeof seg?.text === "string" ? seg.text : "";
      return who && line ? `${who}: ${line}` : line;
    }).filter(Boolean).join("\n");
  } else if (transcript && typeof transcript === "object") {
    text = JSON.stringify(transcript);
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.length > maxChars) {
    const head = Math.floor(maxChars * 0.6);
    const tail = maxChars - head;
    text = `${text.slice(0, head)}
[... parte centrale omessa per limiti di lunghezza ...]
${text.slice(-tail)}`;
  }
  return text;
}
function describeOllamaError(err, model) {
  const msg = err?.message || String(err);
  if (err?.name === "AbortError") {
    return `Il servizio IA non ha risposto entro ${Math.round(OLLAMA_TIMEOUT_MS / 1e3)} secondi. Riprova.`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|ECONNRESET/i.test(msg) || /fetch failed|ECONNREFUSED/i.test(String(err?.cause?.code || err?.cause?.message || ""))) {
    return `Il servizio IA non \xE8 raggiungibile su ${OLLAMA_BASE_URL}. Controlla OLLAMA_BASE_URL e la connessione.`;
  }
  if (/HTTP 401|HTTP 403/.test(msg)) {
    return "Servizio IA non configurato correttamente (OLLAMA_API_KEY mancante o non valida).";
  }
  if (/HTTP 429/.test(msg)) {
    return "Il servizio IA ha raggiunto il limite di richieste. Riprova tra qualche istante.";
  }
  if (/HTTP 404/.test(msg) || /not found/i.test(msg)) {
    return `Modello IA "${model}" non trovato. Controlla OLLAMA_MODEL.`;
  }
  return msg;
}
async function generateWithModelFallback(params) {
  const modelList = params.models && params.models.length > 0 ? params.models : [OLLAMA_MODEL, ...OLLAMA_FALLBACK_MODELS];
  const messages = [];
  if (params.system) messages.push({ role: "system", content: params.system });
  messages.push({ role: "user", content: params.prompt });
  let lastError = null;
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
            Authorization: `Bearer ${OLLAMA_API_KEY}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: params.temperature ?? 0.2,
            stream: false,
            ...params.json ? { response_format: { type: "json_object" } } : {}
          }),
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status === 429 && attempt === 0) {
            const secs = Number(response.headers.get("retry-after"));
            retryAfterMs = Math.min(Number.isFinite(secs) && secs > 0 ? secs : 3, 15) * 1e3;
          }
          const body = await response.text();
          throw new Error(`Servizio IA HTTP ${response.status}: ${body.slice(0, 300)}`);
        }
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text === "string") {
          return { text };
        }
        throw new Error("Risposta del servizio IA priva di contenuto.");
      } catch (err) {
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
function safeExtractJson(rawText, defaultFallback = {}) {
  if (!rawText || !rawText.trim()) return defaultFallback;
  let clean = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
    return defaultFallback;
  }
}
app.post("/api/ai/process-chunk", async (req, res) => {
  try {
    const { chunkText, text } = req.body;
    const content = cleanText(chunkText || text, 1e4);
    if (!content || content.length < 10) {
      return res.json({ success: true, summaryPoint: "", detectedActionItems: [] });
    }
    const prompt = `Analizza questo breve blocco di trascrizione di una riunione.
Estrai:
1. "summaryPoint": un singolo punto di sintesi (1 frase) di ci\xF2 che \xE8 stato detto.
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
      temperature: 0.1
    });
    const parsed = safeExtractJson(response.text, { summaryPoint: "", detectedActionItems: [] });
    res.json({ success: true, ...parsed });
  } catch (error) {
    console.error("Process chunk error:", error);
    res.json({ success: true, summaryPoint: "", detectedActionItems: [] });
  }
});
app.post("/api/ai/summarize-chunks", async (req, res) => {
  try {
    const { chunkSummaries, actionItems } = req.body;
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
        "task": "Descrizione attivit\xE0",
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
      temperature: 0.2
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
  } catch (error) {
    console.error("Summarize chunks error:", error);
    res.status(500).json({ success: false, error: "Errore nella generazione della sintesi" });
  }
});
app.post("/api/transcribe", async (req, res) => {
  try {
    const { text, liveTranscript, transcript, languageHint } = req.body;
    const sourceText = transcriptToText(text ?? liveTranscript ?? transcript);
    if (!sourceText || sourceText.replace(/\s/g, "").length < 5) {
      return res.status(400).json({ success: false, error: "Trascrizione vuota" });
    }
    const prompt = `Struttura la trascrizione in segmenti e interlocutori.
Lingua: ${languageHint || "it"}.

TRASCRIZIONE:
"""
${sourceText}
"""

Restituisci JSON:
{
  "title": "Titolo Breve",
  "category": "Riunione",
  "speakers": [{ "id": "spk_1", "name": "Interlocutore 1", "color": "#6C5DD3" }],
  "segments": [{ "id": "seg_1", "speakerId": "spk_1", "speakerName": "Interlocutore 1", "timeOffset": 0, "text": "${sourceText.replace(/"/g, "'")}" }]
}`;
    const response = await generateWithModelFallback({
      system: "Rispondi sempre con JSON valido.",
      prompt,
      json: true,
      temperature: 0.2
    });
    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: sourceText }]
    });
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
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
    console.log(`Recap server active on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
