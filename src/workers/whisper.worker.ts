// Web Worker: esegue Whisper (Transformers.js) direttamente sul dispositivo.
// L'audio non lascia mai il telefono: qui entra solo audio PCM e esce solo testo.
import { pipeline, env } from '@huggingface/transformers';

const ctx: any = self;

// Niente ricerche di modelli in /models (la SPA risponderebbe con index.html): si scarica dall'Hub una volta sola
env.allowLocalModels = false;
// Il modello scaricato resta nella cache del dispositivo (Cache Storage)
env.useBrowserCache = true;

let transcriber: any = null;
let loadedModel = '';
let loading: Promise<void> | null = null;

// Avanzamento aggregato del download del modello (più file)
const fileProgress = new Map<string, { loaded: number; total: number }>();
let maxPercent = 0;

function reportDownload(p: any) {
  if (!p || typeof p.file !== 'string') return;
  if (p.status === 'progress') {
    const loaded = typeof p.loaded === 'number' ? p.loaded : typeof p.progress === 'number' ? p.progress : 0;
    const total = typeof p.total === 'number' && p.total > 0 ? p.total : 100;
    fileProgress.set(p.file, { loaded, total });
  } else if (p.status === 'done') {
    const cur = fileProgress.get(p.file);
    if (cur) fileProgress.set(p.file, { loaded: cur.total, total: cur.total });
  } else {
    return;
  }
  let loaded = 0;
  let total = 0;
  for (const v of fileProgress.values()) {
    loaded += v.loaded;
    total += v.total;
  }
  if (total > 0) {
    maxPercent = Math.max(maxPercent, Math.min(99, (loaded / total) * 100));
    ctx.postMessage({ type: 'model-progress', percent: maxPercent });
  }
}

function ensureModel(model: string): Promise<void> {
  if (transcriber && loadedModel === model) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      fileProgress.clear();
      maxPercent = 0;
      transcriber = await (pipeline as any)('automatic-speech-recognition', model, {
        progress_callback: reportDownload,
      });
      loadedModel = model;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

ctx.onmessage = async (e: MessageEvent) => {
  const msg: any = e.data;
  try {
    if (msg.type === 'load') {
      await ensureModel(msg.model);
      ctx.postMessage({ type: 'ready' });
    } else if (msg.type === 'chunk') {
      await ensureModel(msg.model);
      const out = await transcriber(msg.audio, {
        language: msg.language,
        task: 'transcribe',
        return_timestamps: false,
      });
      const first = Array.isArray(out) ? out[0] : out;
      ctx.postMessage({ type: 'chunk-result', id: msg.id, text: String(first?.text ?? '') });
    }
  } catch (err: any) {
    ctx.postMessage({ type: 'error', id: msg?.id, message: String(err?.message || err) });
  }
};
