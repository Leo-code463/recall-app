import { auth } from './firebaseAuth';
import { API_BASE } from '../config';

/**
 * fetch verso il nostro backend con l'ID token Firebase nell'header Authorization.
 * Il server ricava l'identità (email) SOLO da questo token.
 * Se il token è scaduto (401) ne chiede uno nuovo a Firebase e riprova una volta.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Attende che Firebase abbia ripristinato l'eventuale sessione salvata
  await auth.authStateReady();
  const firebaseUser = auth.currentUser;

  const send = async (forceRefresh: boolean): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (firebaseUser) {
      headers.set('Authorization', `Bearer ${await firebaseUser.getIdToken(forceRefresh)}`);
    }
    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };

  let res = await send(false);
  if (res.status === 401 && firebaseUser) {
    res = await send(true);
  }
  return res;
}
