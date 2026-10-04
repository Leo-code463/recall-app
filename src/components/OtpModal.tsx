import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, ArrowRight, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';

const EMPTY_CODE = ['', '', '', '', '', ''];

/**
 * Modal di verifica email con codice a 6 cifre.
 * Il codice viene generato e controllato dal server: qui l'utente lo digita soltanto.
 */
export const OtpModal: React.FC = () => {
  const {
    isOtpModalOpen,
    setIsOtpModalOpen,
    pendingOtpEmail,
    verifyEmailCode,
    resendVerificationEmail,
    otpStatus,
    logout,
  } = useApp();

  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Conto alla rovescia per il reinvio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Ad ogni apertura: campi puliti
  useEffect(() => {
    if (isOtpModalOpen) {
      setDigits(EMPTY_CODE);
      setError(null);
      setInfo(null);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    }
  }, [isOtpModalOpen]);

  // Ad ogni invio del codice (riuscito o no) il contesto aggiorna otpStatus
  useEffect(() => {
    if (!otpStatus.stamp) return;
    setCountdown(otpStatus.resendAfterSeconds);
    if (otpStatus.error) {
      setError(otpStatus.error);
      setInfo(null);
    } else {
      setError(null);
      setInfo(`Codice inviato a ${pendingOtpEmail || 'la tua email'}.`);
    }
  }, [otpStatus.stamp]);

  const focusInput = (index: number) => inputsRef.current[index]?.focus();

  const handleChange = (index: number, value: string) => {
    const onlyDigits = value.replace(/\D/g, '');
    if (onlyDigits.length > 1) {
      // Incolla di tutto il codice
      const next = [...EMPTY_CODE];
      onlyDigits.slice(0, 6).split('').forEach((ch, i) => (next[i] = ch));
      setDigits(next);
      focusInput(Math.min(onlyDigits.length, 5));
      return;
    }
    const next = [...digits];
    next[index] = onlyDigits;
    setDigits(next);
    if (onlyDigits && index < 5) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) focusInput(index - 1);
    if (e.key === 'Enter') handleVerify();
  };

  const handleVerify = async () => {
    if (isVerifying) return;
    setError(null);
    setInfo(null);
    const code = digits.join('');
    if (code.length < 6) {
      setError('Inserisci tutte le 6 cifre del codice.');
      return;
    }
    setIsVerifying(true);
    try {
      await verifyEmailCode(code); // se va bene il modal si chiude da solo
    } catch (err: any) {
      setError(err?.message || 'Verifica non riuscita. Riprova.');
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setError(null);
    setInfo(null);
    try {
      await resendVerificationEmail(); // l'esito arriva da otpStatus
      setDigits(EMPTY_CODE);
      focusInput(0);
    } catch {
      // il messaggio d'errore è già in otpStatus
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    setIsOtpModalOpen(false);
    await logout();
  };

  if (!isOtpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-[#1A1D1F] dark:text-white">Verifica la tua Email</h3>
        <p className="mt-2 text-xs text-[#6F767E] dark:text-[#9A9FA5] leading-relaxed">
          Abbiamo inviato un codice di sicurezza a 6 cifre a{' '}
          <strong className="text-[#1A1D1F] dark:text-white">{pendingOtpEmail || 'tua email'}</strong>.
          Controlla anche la cartella spam.
        </p>

        <div className="flex justify-center gap-2 sm:gap-3 my-6">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputsRef.current[idx] = el;
              }}
              id={`otp-input-${idx}`}
              type="text"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-12 sm:w-12 sm:h-14 text-center font-bold text-xl rounded-xl border border-[#EFEFEF] dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-start justify-center gap-2 text-xs text-rose-500 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-left">{error}</span>
          </div>
        )}
        {info && !error && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 mb-4">
            <CheckCircle className="w-4 h-4" />
            <span>{info}</span>
          </div>
        )}

        <button
          id="otp-verify-submit-btn"
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full py-3 px-4 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-sm font-semibold shadow-sm shadow-[#761EAF]/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span>{isVerifying ? 'Verifica in corso...' : 'Conferma e Accedi'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4 text-xs text-[#6F767E] dark:text-[#9A9FA5]">
          {countdown > 0 ? (
            <span>Nuovo codice tra {countdown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="font-semibold text-[#761EAF] dark:text-[#C084FC] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer disabled:opacity-50 disabled:no-underline"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>{isResending ? 'Invio in corso...' : 'Invia nuovo codice'}</span>
            </button>
          )}
        </div>

        <button
          onClick={handleCancel}
          className="mt-4 text-xs text-[#6F767E] dark:text-[#9A9FA5] hover:underline cursor-pointer"
        >
          Annulla e usa un altro account
        </button>
      </div>
    </div>
  );
};
