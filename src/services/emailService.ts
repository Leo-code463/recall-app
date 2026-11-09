import { getAuth, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';

const RESET_ACTION_CODE_SETTINGS = {
  url: 'https://recall-app-1.onrender.com',
  handleCodeInApp: true,
};

const VERIFY_ACTION_CODE_SETTINGS = {
  url: 'https://recall-app-1.onrender.com',
  handleCodeInApp: false, // Disattivato per garantire l'apertura e la verifica diretta da browser
};

/**
 * Invia l'email di reset password nativa con Firebase.
 */
export const sendPasswordResetLink = async (email: string): Promise<void> => {
  const auth = getAuth();
  auth.languageCode = 'it';
  await sendPasswordResetEmail(auth, email.trim(), RESET_ACTION_CODE_SETTINGS);
};

/**
 * Invia l'email di verifica account all'utente Firebase connesso.
 */
export const sendVerificationEmailFirebase = async (): Promise<void> => {
  const auth = getAuth();
  if (auth.currentUser) {
    auth.languageCode = 'it';
    await sendEmailVerification(auth.currentUser, VERIFY_ACTION_CODE_SETTINGS);
  } else {
    throw new Error('Nessun utente attualmente connesso per inviare l\'email di verifica.');
  }
};

/**
 * Placeholder per compatibilità con l'invio di notifiche di benvenuto
 */
export const sendWelcomeEmail = async (email: string, name?: string): Promise<void> => {
  console.log(`[Firebase Native] Account registrato per ${email} (${name || 'Utente'})`);
};