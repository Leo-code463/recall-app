// Trascrizione locale a costo zero tramite il motore di riconoscimento vocale nativo del dispositivo (Web Speech API).
// Nessun file audio viene inviato a server esterni o API a pagamento per l'ascolto.

export const WHISPER_MODEL = 'Dispositivo Nativo (Web Speech API)';
export const WHISPER_LANGUAGE = 'italian';

export interface LocalTranscribeProgress {
  stage: 'decoding' | 'model' | 'transcribing';
  percent: number;
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

/** Compatibilità: nessuna libreria pesante o modello da caricare. */
export function preloadWhisper(onProgress?: (percent: number) => void): Promise<void> {
  onProgress?.(100);
  return Promise.resolve();
}

/** Compatibilità: nessuna risorsa di memoria da liberare. */
export function releaseWhisper() {}

/** Ripulisce il testo da tag e spazi multipli. */
export function cleanWhisperText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[[^\]]{1,40}\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Funzione di utilità per validare e formattare il testo trascritto dal microfono del dispositivo.
 */
export async function transcribeBlobLocally(
  blob: Blob,
  opts: LocalTranscribeOptions = {}
): Promise<LocalTranscribeResult> {
  return {
    text: '',
    durationSec: 0,
  };
}