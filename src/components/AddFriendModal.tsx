import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, Sparkles, UserPlus, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AddFriendModal: React.FC = () => {
  const { isAddFriendModalOpen, setIsAddFriendModalOpen, sendFriendRequest, triggerSuccess } = useApp();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    registered: boolean;
    acceptedAutomatic?: boolean;
  } | null>(null);

  if (!isAddFriendModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessResult(null);

    const result = await sendFriendRequest(email.trim());

    setIsLoading(false);
    if (result.success) {
      if (result.acceptedAutomatic) {
        setSuccessResult({
          message: `Siete già in contatto! Richiesta accettata automaticamente con ${email.trim()}.`,
          registered: true,
          acceptedAutomatic: true,
        });
        triggerSuccess('Amico aggiunto automaticamente!');
      } else if (result.registered) {
        setSuccessResult({
          message: `Richiesta di amicizia inviata con successo a ${email.trim()}! Appena accetterà, sarete amici su Recall.`,
          registered: true,
        });
        triggerSuccess('Richiesta inviata!');
      } else {
        setSuccessResult({
          message: `L'utente con email ${email.trim()} non è ancora registrato su Recall. Abbiamo inviato un'email di invito a unirsi a Recall!`,
          registered: false,
        });
        triggerSuccess('Invito inviato!');
      }

      // Fire confetti for success
      try {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      } catch (err) {}

      setEmail('');
    } else {
      setErrorMsg(result.error || 'Errore durante l\'invio della richiesta.');
    }
  };

  const handleClose = () => {
    setIsAddFriendModalOpen(false);
    // Reset states
    setEmail('');
    setErrorMsg(null);
    setSuccessResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1A1D1F] w-full max-w-md rounded-[28px] shadow-2xl border border-gray-100 dark:border-[#272B30] overflow-hidden p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#272B30] text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 pb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#761EAF]/10 dark:bg-[#761EAF]/20 flex items-center justify-center text-[#761EAF] dark:text-[#C084FC]">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1A1A1A] dark:text-white tracking-tight">
              Aggiungi un amico
            </h2>
            <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-bold uppercase tracking-wider">
              Referral & Collaborazione
            </p>
          </div>
        </div>

        {/* Success Result view */}
        {successResult ? (
          <div className="mt-5 space-y-4 py-2 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {successResult.registered ? 'Richiesta di amicizia' : 'Invito via Email Inviato'}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-medium leading-relaxed">
                  {successResult.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-[#272B30] dark:hover:bg-neutral-700 text-white dark:text-neutral-100 text-xs font-black rounded-xl cursor-pointer transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          /* Input Request Form */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed font-medium">
              Inserisci l'indirizzo email dell'amico che vuoi aggiungere. 
              Se fa già parte di Recall, riceverà una notifica immediata. 
              Altrimenti, invieremo un'email di invito con il tuo invito personalizzato.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 pl-1 tracking-wider">
                Indirizzo Email dell'amico
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="es. amico@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] rounded-xl text-xs font-bold text-[#1A1A1A] dark:text-white placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-hidden focus:border-[#761EAF] dark:focus:border-[#C084FC] focus:ring-1 focus:ring-[#761EAF] transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2.5 justify-end pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-5 py-2.5 bg-[#761EAF] hover:bg-[#681898] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Invio in corso...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Invia richiesta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
