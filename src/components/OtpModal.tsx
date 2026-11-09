import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, CheckCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

export const OtpModal: React.FC = () => {
  const { user, verifyEmailCode, sendEmailCode, isOtpModalOpen, setIsOtpModalOpen } = useApp();
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);

  useEffect(() => {
    if (!isOtpModalOpen) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOtpModalOpen]);

  // Rileva quando l'utente torna sull'app dopo aver cliccato il link nell'email
  useEffect(() => {
    if (!isOtpModalOpen) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleVerify();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOtpModalOpen]);

  if (!isOtpModalOpen) return null;

  const handleVerify = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await verifyEmailCode();
      setSuccessMessage('Email verificata con successo!');
      setTimeout(() => {
        setIsOtpModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Non risulta ancora verificata: clicca prima il link nell\'email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setSuccessMessage(null);
    setResendLoading(true);
    try {
      await sendEmailCode();
      setSuccessMessage('Nuova email di verifica inviata!');
      setCountdown(60);
    } catch (err: any) {
      setError(err?.message || 'Errore durante il reinvio dell\'email di verifica.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1C1C24] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/20 dark:border-white/10 relative flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => setIsOtpModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-[#6A49D8]/10 flex items-center justify-center text-[#6A49D8] mb-4">
          <Mail className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-[#16161E] dark:text-white mb-2">
          Verifica il tuo indirizzo email
        </h3>

        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-6 px-2 leading-relaxed">
          Ti abbiamo inviato un link di verifica a{' '}
          <span className="font-semibold text-[#16161E] dark:text-white">{user?.email}</span>.
          <br />
          Apri l'email e clicca sul link di conferma per attivare il tuo account.
        </p>

        {error && (
          <div className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium mb-4 animate-in fade-in">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="w-full p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-4 animate-in fade-in flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#6A49D8] hover:bg-[#5B3CC4] text-white font-bold text-xs shadow-md shadow-[#6A49D8]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mb-4"
        >
          {loading ? (
            <span>Verifica in corso...</span>
          ) : (
            <>
              <span>Ho verificato</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between w-full pt-3 border-t border-gray-100 dark:border-white/5 text-xs">
          <span className="text-gray-400 dark:text-neutral-500">Non hai ricevuto l'email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resendLoading}
            className="font-semibold text-[#6A49D8] hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
            <span>
              {countdown > 0 ? `Rinvio tra ${countdown}s` : 'Rinvia email'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};