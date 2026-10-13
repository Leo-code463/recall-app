// Trascrizione audio tramite il backend (Groq Whisper large-v3).
// L'audio viene inviato a /api/transcribe-audio; il server restituisce solo il testo.
// Mantiene la stessa API pubblica della vecchia versione on-device, quindi RecordingModal non va modificato.
import { getAuth } from 'firebase/auth';
import { API_BASE } from '../config';

export const WHISPER_MODEL = 'whisper-large-v3 (Groq)';
export const WHISPER_LANGUAGE = 'italian';

const SAMPLE_RATE = 16000;
// Sopra questa soglia il file non entra in una sola richiesta (limite Groq 25 MB): viene decodificato e diviso.
const MAX_DIRECT_BYTES = 23 * 1024 * 1024;
const LARGE_CHUNK_SECONDS = 600; // 10 minuti per pezzo (WAV 16 kHz mono = circa 19 MB)
const MIN_CHUNK_SECONDS = 0.3;
const CHUNK_SECONDS = 28;

export interface LocalTranscribeProgress {
  stage: 'decoding' | 'model' | 'transcribing';
  percent: number; // 0-100
}

export interface LocalTranscribeOptions {
  language?: string;
  signal?: AbortSignal;
  onProgress?: (p: LocalTranscribeProgress) => void;
}

export interface LocalTranscribeResult {
  text: string;
  durationSec: number;
}

/** Compatibilità: con il backend non c'è nessun modello da scaricare. */
export function preloadWhisper(onProgress?: (percent: number) => void): Promise<void> {
  onProgress?.(100);
  return Promise.resolve();
}

/** Compatibilità: nessuna memoria da liberare. */
export function releaseWhisper() {}

// ---------- Rete ----------
const LANGUAGE_CODES: Record<string, string> = {
  italian: 'it',
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  portuguese: 'pt',
};

function toLanguageCode(language: string): string {
  const l = language.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(l)) return l;
  return LANGUAGE_CODES[l] || 'it';
}

async function getIdToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Devi accedere per trascrivere una registrazione.');
  return user.getIdToken();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function uploadForTranscription(
  blob: Blob,
  durationSec: number,
  language: string,
  signal?: AbortSignal
): Promise<string> {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': blob.type || 'audio/webm',
    'X-Audio-Language': toLanguageCode(language),
  };
  if (durationSec > 0) headers['X-Audio-Duration'] = String(Math.ceil(durationSec));

  let lastError: Error = new Error('Errore di trascrizione');
  // Un solo nuovo tentativo, utile quando Render si sta "svegliando" (502/503/504) o la rete cade un attimo
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/transcribe-audio`, { method: 'POST', headers, body: blob, signal });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) return typeof data.text === 'string' ? data.text : '';
      lastError = new Error(data?.error || `Errore di trascrizione (HTTP ${res.status})`);
      if (![502, 503, 504].includes(res.status) || data?.code === 'TRANSCRIBE_BUSY') throw lastError;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      if (err === lastError) throw err;
      lastError = new Error('Impossibile contattare il server. Controlla la connessione e riprova.');
    }
    if (attempt === 0) await sleep(3000);
  }
  throw lastError;
}

// ---------- Durata e decodifica ----------
/** Durata di un blob audio. I file webm di MediaRecorder dichiarano durata Infinity: si forza il calcolo. */
function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    let finished = false;
    const finish = (d: number) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      a.onloadedmetadata = null;
      a.ontimeupdate = null;
      a.onerror = null;
      a.removeAttribute('src');
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    const timer = setTimeout(() => finish(0), 5000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) return finish(a.duration);
      a.ontimeupdate = () => finish(a.duration);
      a.currentTime = 1e101;
    };
    a.onerror = () => finish(0);
    a.src = url;
  });
}

function mixToMono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return buf.getChannelData(0);
  const out = new Float32Array(buf.length);
  const n = buf.numberOfChannels;
  for (let c = 0; c < n; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / n;
  }
  return out;
}

function decodeWith(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
}

async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const AudioCtx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error('Questo dispositivo non supporta la decodifica audio.');
  const raw = await blob.arrayBuffer();

  // 1) contesto a 16 kHz: il browser ricampiona da solo in fase di decodifica
  try {
    const ctx = new AudioCtx({ sampleRate: SAMPLE_RATE });
    try {
      return mixToMono(await decodeWith(ctx, raw.slice(0)));
    } finally {
      ctx.close().catch(() => {});
    }
  } catch (firstErr) {
    console.warn('[Trascrizione] Decodifica a 16 kHz non riuscita, provo il ricampionamento manuale', firstErr);
  }

  // 2) fallback: decodifica alla frequenza nativa e ricampiona con OfflineAudioContext
  const ctx = new AudioCtx();
  try {
    const decoded = await decodeWith(ctx, raw);
    const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    ctx.close().catch(() => {});
  }
}

/** PCM mono 16 bit in un file WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// ---------- Utilità pure (esportate per i test) ----------
/** Divide l'audio in finestre <= targetSec, tagliando nel punto più silenzioso degli ultimi 4 secondi. */
export function planWindows(
  audio: Float32Array,
  sr: number = SAMPLE_RATE,
  targetSec: number = CHUNK_SECONDS
): Array<[number, number]> {
  const total = audio.length;
  const win = Math.floor(targetSec * sr);
  const frame = Math.floor(0.1 * sr);
  const searchBack = Math.floor(4 * sr);
  const out: Array<[number, number]> = [];
  let start = 0;

  while (start < total) {
    let end = Math.min(start + win, total);
    if (start + win < total) {
      const from = Math.max(start + Math.floor(win * 0.5), end - searchBack);
      let bestPos = end;
      let bestEnergy = Infinity;
      for (let pos = from; pos + frame <= end; pos += frame) {
        let e = 0;
        for (let i = pos; i < pos + frame; i++) e += audio[i] * audio[i];
        if (e < bestEnergy) {
          bestEnergy = e;
          bestPos = pos + (frame >> 1);
        }
      }
      end = bestPos;
    }
    if (end <= start) end = Math.min(start + win, total);
    out.push([start, end]);
    start = end;
  }
  return out;
}

export function rms(a: Float32Array): number {
  if (a.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / a.length);
}

const HALLUCINATIONS: RegExp[] = [
  /amara\.org/gi, // prima del resto: così la frase sotto non lascia residui dopo il punto
  /sottotitoli\s+(e\s+revisione\s+)?(a\s+cura\s+di|creati\s+dalla\s+comunit[àa])[^.]*\.?/gi,
  /grazie\s+(mille\s+)?per\s+(aver\s+guardato|la\s+visione)[^.]*\.?/gi,
];

/** Ripulisce il testo di Whisper: tag tipo [MUSICA], frasi "fantasma" e ripetizioni a loop. */
export function cleanWhisperText(raw: string): string {
  let t = raw.replace(/\[[^\]]{1,40}\]/g, ' ');
  for (const re of HALLUCINATIONS) t = t.replace(re, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/(\b[^.!?]{3,80}[.!?])(\s*\1){3,}/g, '$1');
  return t;
}

// ---------- API principale ----------
export async function transcribeBlobLocally(
  blob: Blob,
  opts: LocalTranscribeOptions = {}
): Promise<LocalTranscribeResult> {
  const { language = WHISPER_LANGUAGE, signal, onProgress } = opts;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('Operazione annullata', 'AbortError');
  };

  onProgress?.({ stage: 'decoding', percent: 0 });

  // File di dimensione normale: si invia l'audio originale (leggero, qualità massima)
  if (blob.size <= MAX_DIRECT_BYTES) {
    const durationSec = await probeDuration(blob);
    throwIfAborted();
    onProgress?.({ stage: 'transcribing', percent: 10 });
    const raw = await uploadForTranscription(blob, durationSec, language, signal);
    onProgress?.({ stage: 'transcribing', percent: 100 });
    return { text: cleanWhisperText(raw), durationSec };
  }

  // File molto lungo: si decodifica e si divide in pezzi WAV da 10 minuti
  let audio: Float32Array;
  try {
    audio = await decodeTo16kMono(blob);
  } catch {
    throw new Error('Impossibile leggere questo audio sul dispositivo (formato non supportato o file troppo lungo).');
  }
  throwIfAborted();
  const durationSec = audio.length / SAMPLE_RATE;

  const windows = planWindows(audio, SAMPLE_RATE, LARGE_CHUNK_SECONDS);
  const parts: string[] = [];
  for (let i = 0; i < windows.length; i++) {
    throwIfAborted();
    const [s, e] = windows[i];
    if (e - s >= MIN_CHUNK_SECONDS * SAMPLE_RATE) {
      const wav = encodeWav(audio.subarray(s, e), SAMPLE_RATE);
      const raw = await uploadForTranscription(wav, (e - s) / SAMPLE_RATE, language, signal);
      const cleaned = cleanWhisperText(raw);
      if (cleaned && cleaned !== parts[parts.length - 1]) parts.push(cleaned);
    }
    onProgress?.({ stage: 'transcribing', percent: ((i + 1) / windows.length) * 100 });
  }

  return { text: parts.join(' ').trim(), durationSec };
}
