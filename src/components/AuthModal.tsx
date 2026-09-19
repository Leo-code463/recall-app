import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Hand,
} from 'lucide-react';
import { AILogo } from './AILogo';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptic';

export const AuthModal: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, isDarkMode, toggleTheme } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Inserisci tutti i campi obbligatori');
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Inserisci il tuo nome e cognome');
          setLoading(false);
          return;
        }
        await registerWithEmail(name.trim(), email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || '';
      const errMsg = err?.message || '';
      
      if (errCode === 'auth/operation-not-allowed') {
        setError("L'accesso con Google non è abilitato nel tuo progetto Firebase. Per favore, vai sulla Console Firebase > Authentication > Sign-in method e abilita il provider 'Google'.");
      } else if (errCode === 'auth/unauthorized-domain') {
        setError(`Questo dominio (${window.location.hostname}) non è autorizzato in Firebase. Vai su Console Firebase > Authentication > Settings > Authorized Domains e aggiungi '${window.location.hostname}'.`);
      } else {
        setError(`Impossibile completare l'autenticazione Google: ${errMsg || errCode || 'Errore sconosciuto'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#111315] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Top Navbar / Theme Switcher */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AILogo size="md" />
        </div>

        <button
          id="auth-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          title={isDarkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
          className="p-2 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-[#1A1D1F] border border-gray-200 dark:border-[#272B30] shadow-2xs transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <AILogo size="2xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight">
            {isSignUp ? 'Crea il tuo account' : 'Bentornato'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-neutral-400 font-medium">
            {isSignUp
              ? 'Registrati per sincronizzare Google Calendar, Tasks e gestire le riunioni con l\'AI'
              : 'Accedi per visualizzare le tue registrazioni, compiti Google e agenda'}
          </p>
        </div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(event, info) => {
            if (info.offset.x < -85) {
              // Swipe left -> register
              if (!isSignUp) {
                triggerHaptic(12);
                setIsSignUp(true);
                setError(null);
              }
            } else if (info.offset.x > 85) {
              // Swipe right -> login
              if (isSignUp) {
                triggerHaptic(12);
                setIsSignUp(false);
                setError(null);
              }
            }
          }}
          className="bg-white dark:bg-[#1A1D1F] py-7 px-6 sm:px-8 rounded-3xl shadow-sm border border-gray-200 dark:border-[#272B30] transition-colors relative cursor-grab active:cursor-grabbing select-none"
        >
          {/* Tab Switcher: Accedi / Registrati */}
          <div className="flex bg-[#F8F9FD] dark:bg-[#111315] p-1 rounded-2xl mb-6 border border-gray-200/80 dark:border-[#272B30]">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isSignUp
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#1A1A1A] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              Accedi
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isSignUp
                  ? 'bg-white dark:bg-[#1A1D1F] text-[#1A1A1A] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              Registrati
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup-fields' : 'login-fields'}
              initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Google Sign-In / Sign-Up Button */}
              <button
                id="auth-google-auth-btn"
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-200 dark:border-[#272B30] bg-white dark:bg-[#111315] text-[#1A1A1A] dark:text-white text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#272B30] transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSignUp ? 'Registrati con Google' : 'Accedi con Google'}</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-gray-200 dark:border-[#272B30] w-full" />
                <span className="bg-white dark:bg-[#1A1D1F] px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 absolute">
                  {isSignUp ? 'oppure registrati via email' : 'oppure con email'}
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white mb-1.5">
                      Nome e Cognome *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 dark:text-neutral-500 absolute left-3.5 top-3.5" />
                      <input
                        id="auth-input-name"
                        type="text"
                        required={isSignUp}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Il tuo nome e cognome"
                        className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1A1A] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white mb-1.5">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      id="auth-input-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@azienda.com"
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1A1A] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] dark:text-white mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 dark:text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      id="auth-input-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? 'Almeno 6 caratteri' : 'La tua password'}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1A1A] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in duration-200">
                    {error}
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-md shadow-[#761EAF]/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <span>Elaborazione in corso...</span>
                  ) : isSignUp ? (
                    <>
                      <span>Registrati e verifica codice OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Accedi a Recall</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Swipe indicator label */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-gray-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
            <Hand className="w-3.5 h-3.5 text-[#761EAF]/50 animate-bounce" />
            <span>Trascina per passare a {isSignUp ? 'Accedi' : 'Registrati'}</span>
          </div>
        </motion.div>


      </div>

      {/* Footer copyright */}
      <div className="max-w-md w-full mx-auto text-center mt-6">
        <p className="text-[11px] text-gray-400 dark:text-neutral-500 font-medium">
          Recall AI Assistant • Sicurezza e crittografia audio end-to-end
        </p>
      </div>
    </div>
  );
};
