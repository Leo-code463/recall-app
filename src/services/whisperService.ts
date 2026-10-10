// Trascrizione audio ON-DEVICE con Whisper (Transformers.js in un Web Worker).
// L'audio resta sul telefono: al server va solo il testo risultante.

// Modello: 'Xenova/whisper-base' (migliore) oppure 'Xenova/whisper-tiny' (più veloce, meno preciso in italiano)
export const WHISPER_MODEL = 'Xenova/whisper-base';
export const WHISPER_LANGUAGE = 'italian';

const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 28; // finestre < 30s (limite di Whisper), tagliate sui momenti di silenzio
const SILENCE_RMS = 0.0025; // finestre quasi mute vengono saltate (evita "allucinazioni" di Whisper)
const MIN_CHUNK_SECONDS = 0.3;

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

// ---------- Worker ----------
let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let readyHandlers: { resolve: () => void; reject: (e: Error) => void } | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(percent: number) => void>();

function failAll(error: Error) {
  readyHandlers?.reject(error);
  readyHandlers = null;
  for (const p of pending.values()) p.reject(error);
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent) => {
    const msg: any = e.data;
    if (msg.type === 'model-progress') {
      progressListeners.forEach((fn) => fn(msg.percent));
    } else if (msg.type === 'ready') {
      readyHandlers?.resolve();
      readyHandlers = null;
    } else if (msg.type === 'chunk-result') {
      pending.get(msg.id)?.resolve(msg.text);
      pending.delete(msg.id);
    } else if (msg.type === 'error') {
      const err = new Error(msg.message || 'Errore del trascrittore locale');
      if (typeof msg.id === 'number' && pending.has(msg.id)) {
        pending.get(msg.id)!.reject(err);
        pending.delete(msg.id);
      } else {
        readyHandlers?.reject(err);
        readyHandlers = null;
      }
    }
  };
  w.onerror = (e: ErrorEvent) => {
    const err = new Error(e.message || 'Impossibile avviare il trascrittore locale');
    failAll(err);
    worker = null;
    readyPromise = null;
  };
  worker = w;
  return w;
}

/** Scarica/carica il modello Whisper (la prima volta serve internet, poi resta in cache sul dispositivo). */
export function preloadWhisper(onProgress?: (percent: number) => void): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve, reject) => {
      readyHandlers = { resolve, reject };
      getWorker().postMessage({ type: 'load', model: WHISPER_MODEL });
    });
    readyPromise.catch(() => {
      readyPromise = null; // permette di riprovare
    });
  }
  const done = () => {
    if (onProgress) progressListeners.delete(onProgress);
  };
  return readyPromise.then(
    () => done(),
    (err) => {
      done();
      throw err;
    }
  );
}

/** Libera la memoria del modello (si ricarica dalla cache alla prossima trascrizione). */
export function releaseWhisper() {
  if (worker) {
    failAll(new Error('Trascrittore locale arrestato'));
    worker.terminate();
    worker = null;
  }
  readyPromise = null;
}

function transcribeChunk(audio: Float32Array, language: string): Promise<string> {
  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type: 'chunk', id, audio, language, model: WHISPER_MODEL }, [audio.buffer]);
  });
}

// ---------- Decodifica audio -> PCM mono 16 kHz ----------
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
    console.warn('[Whisper] Decodifica a 16 kHz non riuscita, provo il ricampionamento manuale', firstErr);
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
  let audio: Float32Array;
  try {
    audio = await decodeTo16kMono(blob);
  } catch (err: any) {
    throw new Error(
      'Impossibile leggere questo audio sul dispositivo (formato non supportato o file troppo lungo).'
    );
  }
  throwIfAborted();
  const durationSec = audio.length / SAMPLE_RATE;

  onProgress?.({ stage: 'model', percent: 0 });
  await preloadWhisper((percent) => onProgress?.({ stage: 'model', percent }));
  throwIfAborted();

  const windows = planWindows(audio);
  const parts: string[] = [];

  for (let i = 0; i < windows.length; i++) {
    throwIfAborted();
    const [s, e] = windows[i];
    if (e - s >= MIN_CHUNK_SECONDS * SAMPLE_RATE) {
      const slice = audio.slice(s, e); // copia: il buffer viene trasferito al worker
      if (rms(slice) >= SILENCE_RMS) {
        const cleaned = cleanWhisperText(await transcribeChunk(slice, language));
        if (cleaned && cleaned !== parts[parts.length - 1]) parts.push(cleaned);
      }
    }
    onProgress?.({ stage: 'transcribing', percent: ((i + 1) / windows.length) * 100 });
  }

  return { text: parts.join(' ').trim(), durationSec };
}
