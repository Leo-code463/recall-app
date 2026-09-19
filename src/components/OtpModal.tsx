import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, ArrowRight, RotateCw, CheckCircle, AlertCircle } from 'lucide-react';

export const OtpModal: React.FC = () => {
  const {
    isOtpModalOpen,
    setIsOtpModalOpen,
    pendingOtpCode,
    pendingOtpEmail,
    verifyOtp,
    resendOtp,
  } = useApp();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of full 6 digit string
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const nextInput = document.getElementById(`otp-input-${Math.min(pasted.length, 5)}`);
      nextInput?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    setError(null);
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError('Inserisci tutte le 6 cifre del codice OTP');
      return;
    }

    const success = verifyOtp(fullCode);
    if (!success) {
      setError('Codice OTP non valido o scaduto. Riprova.');
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setError(null);
    try {
      const result = await resendOtp();
      if (result.success) {
        setCountdown(45);
      } else {
        setError(`Errore rinvio codice: ${result.message}`);
      }
    } catch (err: any) {
      setError(`Errore durante l'invio: ${err.message || err}`);
    } finally {
      setIsResending(false);
    }
  };

  if (!isOtpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1D1F] max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-[#272B30] text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-[#1A1D1F] dark:text-white">
          Verifica la tua Email
        </h3>
        <p className="mt-2 text-xs text-[#6F767E] dark:text-[#9A9FA5] leading-relaxed">
          Abbiamo inviato un codice di sicurezza a 6 cifre a{' '}
          <strong className="text-[#1A1D1F] dark:text-white">{pendingOtpEmail || 'tua email'}</strong>
        </p>

        {/* 6 Digit OTP Inputs */}
        <div className="flex justify-center gap-2 sm:gap-3 my-6">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-input-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-xl rounded-xl border border-[#EFEFEF] dark:border-[#272B30] bg-[#F8F9FD] dark:bg-[#111315] text-[#1A1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF] transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-xs text-rose-500 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          id="otp-verify-submit-btn"
          onClick={handleVerify}
          className="w-full py-3 px-4 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-sm font-semibold shadow-sm shadow-[#761EAF]/30 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Conferma e Accedi</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Resend Countdown */}
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
      </div>
    </div>
  );
};
