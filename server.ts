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
    return `Il servizio IA non è raggiungibile su ${OLLAMA_BASE_URL}. Controlla OLLAMA_BASE_URL e la connessione.`;
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

function safeExtractJson(rawText?: string, defaultFallback: any = {}): any {
  if (!rawText || !rawText.trim()) return defaultFallback;
  let clean = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(clean.substring(firstBrace, lastBrace + 1)); } catch (e2) {}
    }
    return defaultFallback;
  }
}

/* ROTTE PIPELINE A BLOCCHI */
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
      temperature: 0.2,
    });

    const parsed = safeExtractJson(response.text, {
      title: "Nuova Registrazione",
      category: "Riunione",
      speakers: [{ id: "spk_1", name: "Interlocutore 1", color: "#6C5DD3" }],
      segments: [{ id: "seg_1", speakerId: "spk_1", speakerName: "Interlocutore 1", timeOffset: 0, text: sourceText }]
    });

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
  });
}

startServer();