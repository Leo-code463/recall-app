// Base URL del backend (Express su Render).
// Nell'APK Capacitor la pagina gira su https://localhost, quindi le chiamate
// relative tipo "/api/..." NON raggiungono il server: serve sempre l'URL assoluto.
// Per puntare a un altro backend (es. test) imposta VITE_API_BASE nel file .env.
const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;

export const API_BASE: string = (envBase || 'https://recall-app-1.onrender.com').replace(/\/+$/, '');
