import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getShare, ShareMeta } from '../services/shareService';
import { UserAvatar } from './UserAvatar';

interface Props {
  shareId: string;
  ownerAvatarUrl?: string;
  onClose: () => void;
}

// Campi tecnici che non ha senso mostrare a chi legge
const HIDDEN_KEYS = new Set(['id', 'title', 'createdAt', 'date', 'duration', 'userId', 'status']);

const humanize = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** Mostra in modo sicuro (solo testo, niente HTML) qualunque struttura di conversazione. */
const Value: React.FC<{ value: any; depth?: number }> = ({ value, depth = 0 }) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <p className="text-xs text-gray-700 dark:text-neutral-200 font-medium leading-relaxed whitespace-pre-wrap break-words">
        {String(value)}
      </p>
    );
  }
  if (depth > 5) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="space-y-1.5 list-disc pl-4 marker:text-[#6A49D8]">
        {value.map((item, i) => (
          <li key={i} className="text-xs text-gray-700 dark:text-neutral-200 font-medium">
            <Value value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  const entries = Object.entries(value).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            {humanize(k)}
          </p>
          <Value value={v} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
};

export const SharedConversationViewer: React.FC<Props> = ({ shareId, ownerAvatarUrl, onClose }) => {
  const { language } = useLanguage();
  const it = language === 'it';
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShare(shareId)
      .then((r) => {
        if (cancelled) return;
        setMeta(r.share);
        setSnapshot(r.snapshot);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || (it ? 'Impossibile aprire la conversazione.' : 'Unable to open the conversation.'));
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  // Mostro prima riassunto e trascrizione, poi tutto il resto
  const ordered: Array<[string, any]> = [];
  if (snapshot && typeof snapshot === 'object') {
    const priority = ['summary', 'transcript'];
    priority.forEach((k) => {
      if (snapshot[k] !== undefined) ordered.push([k, snapshot[k]]);
    });
    Object.entries(snapshot).forEach(([k, v]) => {
      if (!priority.includes(k) && !HIDDEN_KEYS.has(k)) ordered.push([k, v]);
    });
  }

  const dateLabel = (() => {
    if (!meta?.meetingDate) return '';
    const d = new Date(meta.meetingDate);
    return isNaN(d.getTime()) ? meta.meetingDate : d.toLocaleDateString(it ? 'it-IT' : 'en-GB');
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-2xl max-h-[88vh] rounded-[28px] shadow-2xl border border-white/70 dark:border-white/10 overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-4 border-b border-[#ECEBF3] dark:border-white/10 flex items-start gap-3.5 pr-14">
          <button
            onClick={onClose}
            aria-label={it ? 'Chiudi' : 'Close'}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F1EFF9] dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <UserAvatar name={meta?.ownerName} src={ownerAvatarUrl} className="w-10 h-10 bg-purple-50 dark:bg-purple-950/20 text-[#6A49D8] dark:text-[#B29FFF] text-sm" />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#16161E] dark:text-white tracking-tight break-words">
              {meta?.title || (it ? 'Conversazione condivisa' : 'Shared conversation')}
            </h2>
            {meta && (
              <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-bold uppercase tracking-wider">
                {it ? 'Condivisa da' : 'Shared by'} {meta.ownerName}
                {dateLabel ? ` · ${dateLabel}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error ? (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : !snapshot ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-[#6A49D8]/30 border-t-[#6A49D8] rounded-full animate-spin" />
            </div>
          ) : ordered.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-neutral-500 font-bold text-center py-6">
              {it ? 'Questa conversazione non ha contenuti da mostrare.' : 'This conversation has no content to show.'}
            </p>
          ) : (
            ordered.map(([k, v]) => (
              <section key={k} className="space-y-2">
                <h3 className="text-[11px] font-black uppercase text-[#6A49D8] dark:text-[#B29FFF] tracking-wider">
                  {humanize(k)}
                </h3>
                <Value value={v} />
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
