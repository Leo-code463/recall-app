import React, { useState } from 'react';
import { X, Share2, Send, CheckCircle2, AlertCircle, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  friend: { email: string; name: string };
  onClose: () => void;
}

export const ShareConversationModal: React.FC<Props> = ({ friend, onClose }) => {
  const { meetings, shareMeetingWithFriend } = useApp();
  const { language } = useLanguage();
  const it = language === 'it';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSend = async () => {
    const meeting = meetings.find((m) => m.id === selectedId);
    if (!meeting) return;
    setIsSending(true);
    setError(null);
    const result = await shareMeetingWithFriend(meeting, friend.email);
    setIsSending(false);
    if (result.success) setDone(true);
    else setError(result.error || (it ? 'Condivisione non riuscita.' : 'Sharing failed.'));
  };

  const formatDate = (m: any): string => {
    const raw = m.createdAt || m.date;
    if (!raw) return '';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString(it ? 'it-IT' : 'en-GB');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-[28px] shadow-2xl border border-white/70 dark:border-white/10 overflow-hidden p-6 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label={it ? 'Chiudi' : 'Close'}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F1EFF9] dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 pb-2 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-[#6A49D8]/10 dark:bg-[#6A49D8]/20 flex items-center justify-center text-[#6A49D8] dark:text-[#B29FFF]">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#16161E] dark:text-white tracking-tight">
              {it ? 'Condividi conversazione' : 'Share conversation'}
            </h2>
            <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-bold uppercase tracking-wider truncate">
              {it ? 'con' : 'with'} {friend.name || friend.email}
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-5 space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                {it
                  ? `Conversazione condivisa con ${friend.name || friend.email}. La trova nella sezione "Condivise con me". Puoi revocarla quando vuoi.`
                  : `Conversation shared with ${friend.name || friend.email}. They'll find it under "Shared with me". You can revoke it anytime.`}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white/10 dark:hover:bg-neutral-700 text-white dark:text-neutral-100 text-xs font-black rounded-xl cursor-pointer transition-colors"
              >
                {it ? 'Chiudi' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed font-medium">
              {it
                ? "Scegli la conversazione da inviare. L'amico ne riceverà una copia in sola lettura (senza audio)."
                : 'Pick the conversation to send. Your friend will get a read-only copy (without audio).'}
            </p>

            {meetings.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-white/70 dark:border-white/10 text-center text-xs font-bold text-gray-400 dark:text-neutral-500">
                {it ? 'Non hai ancora nessuna conversazione da condividere.' : "You don't have any conversation to share yet."}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {meetings.map((m) => {
                  const active = m.id === selectedId;
                  const minutes = Math.round((m.duration || 0) / 60);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        active
                          ? 'border-[#6A49D8] bg-[#6A49D8]/5 dark:bg-[#6A49D8]/10 ring-1 ring-[#6A49D8]'
                          : 'border-[#ECEBF3] dark:border-white/10 bg-white/60 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#6A49D8]/10 text-[#6A49D8] dark:text-[#B29FFF] flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-black text-[#16161E] dark:text-white truncate">
                          {m.title}
                        </span>
                        <span className="block text-[10px] text-gray-400 dark:text-neutral-400 font-medium">
                          {[formatDate(m), minutes > 0 ? `${minutes} min` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                {it ? 'Annulla' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!selectedId || isSending}
                className="px-5 py-2.5 bg-[#6A49D8] hover:bg-[#5B3CC4] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{it ? 'Invio...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{it ? 'Condividi' : 'Share'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
