import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleWorkspaceService } from './calendarService';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
];

// Standard provider used for authentication (login & registration).
// We add workspace scopes directly so that the user is logged into both identity & calendar services at once.
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never localStorage for security)
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token?: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (firebaseUser) {
      if (cachedAccessToken) {
        GoogleWorkspaceService.setAccessToken(cachedAccessToken);
      }
      if (onAuthSuccess) {
        onAuthSuccess(firebaseUser, cachedAccessToken || undefined);
      }
    } else {
      cachedAccessToken = null;
      GoogleWorkspaceService.setAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const clientId = firebaseConfig.oAuthClientId;
    if (!clientId) {
      throw new Error("L'ID client OAuth non è configurato nel file firebase-applet-config.json");
    }

    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const redirectUri = window.location.origin;
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      ...GOOGLE_WORKSPACE_SCOPES
    ];
    const scopeString = encodeURIComponent(scopes.join(' '));
    // We use response_type=id_token token to get both the ID token and an access token directly from Google OAuth
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token%20token&scope=${scopeString}&prompt=select_account&nonce=${nonce}`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Google_Login',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      throw new Error("Il blocco popup del browser ha impedito l'apertura della finestra di login. Per favore, abilita i popup per questo sito e riprova.");
    }

    const parsedTokens = await new Promise<{ idToken: string; accessToken: string }>((resolve, reject) => {
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error("Connessione a Google annullata dall'utente."));
          return;
        }

        try {
          const popupUrl = popup.location.href;
          if (popupUrl && popupUrl.includes(redirectUri)) {
            const hash = popup.location.hash;
            if (hash) {
              const params = new URLSearchParams(hash.substring(1));
              const accessToken = params.get('access_token');
              const idToken = params.get('id_token');
              const error = params.get('error');

              if (accessToken && idToken) {
                popup.close();
                clearInterval(interval);
                resolve({ idToken, accessToken });
              } else if (error) {
                popup.close();
                clearInterval(interval);
                reject(new Error(`Errore di login Google: ${error}`));
              }
            }
          }
        } catch (e) {
          // Ignore cross-origin errors (expected while popup is on accounts.google.com)
        }
      }, 500);
    });

    // Create a credential with BOTH the ID token and the Access token
    const credential = GoogleAuthProvider.credential(parsedTokens.idToken, parsedTokens.accessToken);
    // Authenticate with Firebase using standard credential signing, which is super fast and bypasses client-side userinfo call
    const result = await signInWithCredential(auth, credential);

    if (!result || !result.user) {
      throw new Error("Errore durante l'accesso con Google: risposta non valida.");
    }

    cachedAccessToken = parsedTokens.accessToken;
    if (cachedAccessToken) {
      GoogleWorkspaceService.setAccessToken(cachedAccessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Direct Google login failed, trying standard Firebase popup fallback...', error);
    try {
      const result = await signInWithPopup(auth, provider);
      if (!result || !result.user) {
        throw new Error("Errore durante l'accesso con Google: risposta non valida.");
      }
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || '';
      cachedAccessToken = accessToken;
      if (cachedAccessToken) {
        GoogleWorkspaceService.setAccessToken(cachedAccessToken);
      }
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (fallbackError: any) {
      console.error('Fallback standard login also failed:', fallbackError);
      throw error; // Throw original error so the user gets the best message
    }
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutAuth = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  cachedAccessToken = null;
  GoogleWorkspaceService.setAccessToken(null);
};

/**
 * requestGoogleWorkspaceToken launches a standard client-side Google OAuth 2.0 
 * implicit grant popup flow using the Client ID from firebase-applet-config.json.
 * This obtains the requested sensitive Google Workspace scopes (Calendar, Tasks, Docs, etc.)
 * directly in the browser and returns the Google Access Token without going through Firebase Auth.
 * This completely avoids triggering the Firebase 401 invalid-credential error!
 */
export const requestGoogleWorkspaceToken = async (): Promise<string> => {
  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error("L'ID client OAuth non è configurato nel file firebase-applet-config.json");
  }

  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const scopeString = encodeURIComponent(GOOGLE_WORKSPACE_SCOPES.join(' '));
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopeString}&prompt=consent`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Google_Workspace_Auth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Il blocco popup del browser ha impedito l'apertura della finestra di autenticazione. Per favore, abilita i popup per questo sito e riprova."));
      return;
    }

    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        reject(new Error("Connessione a Google Workspace annullata dall'utente."));
        return;
      }

      try {
        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes(redirectUri)) {
          const hash = popup.location.hash;
          if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const error = params.get('error');

            if (accessToken) {
              popup.close();
              clearInterval(interval);
              resolve(accessToken);
            } else if (error) {
              popup.close();
              clearInterval(interval);
              reject(new Error(`Errore di autorizzazione Google: ${error}`));
            }
          }
        }
      } catch (e) {
        // Cross-origin errors are expected and can be safely ignored while the popup is on accounts.google.com
      }
    }, 500);
  });
};
