import { apiFetch } from './apiClient';

/** Errore con un messaggio già pronto da mostrare all'utente. */
export class OtpError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'OtpError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function postJson(path: string, body: Record<string, unknown>): Promise<any> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new OtpError('Impossibile contattare il server. Controlla la connessione e riprova.');
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // risposta non JSON (es. server in avvio): gestita sotto
  }

  if (!res.ok || !data?.success) {
    throw new OtpError(data?.error || `Errore del server (${res.status}). Riprova tra poco.`, data?.retryAfterSeconds);
  }
  return data;
}

/** Chiede al server di inviare (o reinviare) il codice a 6 cifre all'email dell'utente loggato. */
export async function requestEmailOtp(name?: string): Promise<{ alreadyVerified: boolean; resendAfterSeconds: number }> {
  const data = await postJson('/api/auth/otp/send', name ? { name } : {});
  return {
    alreadyVerified: data.alreadyVerified === true,
    resendAfterSeconds: typeof data.resendAfterSeconds === 'number' ? data.resendAfterSeconds : 60,
  };
}

/** Invia il codice digitato: se è corretto il server segna l'email come verificata su Firebase. */
export async function verifyEmailOtp(code: string): Promise<void> {
  await postJson('/api/auth/otp/verify', { code });
}
