import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { StickyHeader } from './StickyHeader';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Inbox, 
  Sparkles, 
  Gift,
  Share2,
  FileText,
  Trash2
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ShareConversationModal } from './ShareConversationModal';
import { SharedConversationViewer } from './SharedConversationViewer';
import { EmptyState } from './EmptyState';

export const FriendsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { 
    user,
    friendsList, 
    friendsReceivedPending, 
    friendsSentPending, 
    respondFriendRequest, 
    setIsAddFriendModalOpen,
    fetchFriends,
    receivedShares,
    sentShares,
    fetchShares,
    removeShare
  } = useApp();

  const { language, t } = useLanguage();
  const [isResponding, setIsResponding] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ email: string; name: string } | null>(null);
  const [viewerShareId, setViewerShareId] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
    fetchShares();
  }, []);

  const avatarOf = (email: string): string | undefined =>
    friendsList.find((f) => f.email === email)?.avatarUrl;

  const formatShareDate = (iso: string): string => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-GB');
  };

  const handleResponse = async (friendshipId: string, action: 'accept' | 'reject') => {
    setIsResponding(friendshipId);
    await respondFriendRequest(friendshipId, action);
    setIsResponding(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* View Header (Sticky) */}
      <StickyHeader className="border-b border-[#ECEBF3] dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl font-extrabold text-[#16161E] dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5.5 h-5.5 text-[#6A49D8]" />
              <span>{t('friendsAndCollaborationViewTitle')}</span>
            </h2>
            <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
              {t('friendsAndCollaborationViewSubtitle')}
            </p>
          </div>
          
          <button
            onClick={() => setIsAddFriendModalOpen(true)}
            className="px-4 py-2.5 bg-[#6A49D8] hover:bg-[#5B3CC4] text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('addFriendBtn')}</span>
          </button>
        </div>
      </StickyHeader>

      {/* 1. SEZIONE RICHIESTE RICEVUTE (PENDING INCOMING) */}
      {friendsReceivedPending.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-3 duration-300">
          <h3 className="text-[11px] font-black uppercase text-rose-500 dark:text-rose-400 tracking-wider pl-1 flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            <span>{t('receivedRequests')} ({friendsReceivedPending.length})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </h3>
          
          <div className="glass-card rounded-[22px] border border-white/70 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10">
            {friendsReceivedPending.map((req) => (
              <div key={req.friendshipId} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={req.name} src={req.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#16161E] dark:text-white truncate">
                      {req.name}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                      {req.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    disabled={isResponding === req.friendshipId}
                    onClick={() => handleResponse(req.friendshipId, 'accept')}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer transition-colors"
                    title={t('accept')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    disabled={isResponding === req.friendshipId}
                    onClick={() => handleResponse(req.friendshipId, 'reject')}
                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/35 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors"
                    title={t('reject')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {friendsReceivedPending.length === 0 && (
        <EmptyState
          icon={Inbox}
          compact
          title={language === 'it' ? 'Nessuna richiesta di amicizia' : 'No friend requests yet'}
          description={
            language === 'it'
              ? 'Quando qualcuno ti aggiunge su Recall, lo vedrai qui.'
              : 'When someone adds you on Recall, you will see it here.'
          }
        />
      )}

      {/* Grid containing Current Friends & Sent Pending Requests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
            {t('myFriends')} ({friendsList.length})
          </h3>
          
          {friendsList.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noFriendsAdded')}
              description={t('noFriendsAddedDesc')}
              action={
                <button
                  onClick={() => setIsAddFriendModalOpen(true)}
                  className="px-4 py-2 bg-[#6A49D8] hover:bg-[#5B3CC4] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {t('sendFirstInvite')}
                </button>
              }
            />
          ) : (
            <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] border border-white/70 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
              {friendsList.map((friend) => (
                <div key={friend.friendshipId} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={friend.name}
                      src={friend.avatarUrl}
                      className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#16161E] dark:text-white truncate">
                        {friend.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShareTarget({ email: friend.email, name: friend.name })}
                      className="px-2.5 py-1 rounded-full bg-[#6A49D8]/10 hover:bg-[#6A49D8]/20 text-[#6A49D8] dark:text-[#B29FFF] text-[9px] font-black uppercase tracking-tight flex items-center gap-1 cursor-pointer transition-colors"
                      title={language === 'it' ? 'Condividi una conversazione' : 'Share a conversation'}
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{language === 'it' ? 'Condividi' : 'Share'}</span>
                    </button>
                    <div 
                      className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-tight flex items-center gap-1 cursor-help group relative"
                      title={t('futureCreditsInfo')}
                    >
                      <Gift className="w-3 h-3" />
                      <span>{friend.creditsEarned || 0} {language === 'it' ? 'crediti' : 'credits'}</span>
                      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-2 bg-gray-950 dark:bg-neutral-800 text-white rounded-lg text-[9px] font-medium leading-normal shadow-lg text-center normal-case pointer-events-none z-10 border border-neutral-700/50">
                        {t('futureCreditsTooltip')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
            {t('pendingRequests')} ({friendsSentPending.length})
          </h3>

          {friendsSentPending.length === 0 ? (
            <EmptyState icon={Clock} compact title={t('noPendingRequests')} />
          ) : (
            <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] border border-white/70 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
              {friendsSentPending.map((req) => (
                <div key={req.friendshipId} className="p-3.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#16161E] dark:text-white truncate">
                      {req.name || req.email}
                    </p>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {language === 'it' ? 'In attesa' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 dark:text-neutral-400 truncate">
                    {req.email}
                  </p>
                  
                  {!req.registered && (
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold mt-1 block">
                      ✦ {language === 'it' ? 'Non registrato (invitato via email)' : 'Unregistered (invited via email)'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1 flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            <span>
              {language === 'it' ? 'Condivise con me' : 'Shared with me'} ({receivedShares.length})
            </span>
            {receivedShares.some((sh) => !sh.read) && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
          </h3>

          {receivedShares.length === 0 ? (
            <EmptyState
              icon={FileText}
              compact
              title={language === 'it' ? 'Nessuna conversazione condivisa con te' : 'No conversations shared with you'}
            />
          ) : (
            <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] border border-white/70 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
              {receivedShares.map((sh) => (
                <div key={sh.id} className="p-3.5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setViewerShareId(sh.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <UserAvatar name={sh.ownerName} src={avatarOf(sh.ownerEmail)} />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#16161E] dark:text-white truncate flex items-center gap-1.5">
                        {!sh.read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                        <span className="truncate">{sh.title}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                        {sh.ownerName} · {formatShareDate(sh.createdAt)}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeShare(sh.id)}
                    className="p-2 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                    title={language === 'it' ? 'Rimuovi dalla mia lista' : 'Remove from my list'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span>
              {language === 'it' ? 'Condivise da me' : 'Shared by me'} ({sentShares.length})
            </span>
          </h3>

          {sentShares.length === 0 ? (
            <EmptyState
              icon={Share2}
              compact
              title={
                language === 'it'
                  ? 'Tocca "Condividi" accanto a un amico per inviargli una conversazione'
                  : 'Tap "Share" next to a friend to send them a conversation'
              }
            />
          ) : (
            <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] border border-white/70 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
              {sentShares.map((sh) => (
                <div key={sh.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={sh.recipientName}
                      src={avatarOf(sh.recipientEmail)}
                      className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#16161E] dark:text-white truncate">{sh.title}</p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                        {language === 'it' ? 'a' : 'to'} {sh.recipientName} · {formatShareDate(sh.createdAt)}
                        {sh.read ? (language === 'it' ? ' · letta' : ' · read') : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeShare(sh.id)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors shrink-0"
                    title={language === 'it' ? 'Revoca: l’amico non potrà più aprirla' : 'Revoke: your friend will no longer be able to open it'}
                  >
                    {language === 'it' ? 'Revoca' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-purple-50/50 dark:bg-[#6A49D8]/5 border border-purple-100/50 dark:border-[#6A49D8]/10 flex items-start gap-3.5 mt-2">
        <Sparkles className="w-5 h-5 text-[#6A49D8] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#16161E] dark:text-white">
            {t('referralProgramTitle')}
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-neutral-400 font-medium leading-relaxed">
            {t('referralProgramDesc')}
          </p>
        </div>
      </div>

      {shareTarget && (
        <ShareConversationModal friend={shareTarget} onClose={() => setShareTarget(null)} />
      )}
      {viewerShareId && (
        <SharedConversationViewer
          shareId={viewerShareId}
          ownerAvatarUrl={avatarOf(receivedShares.find((sh) => sh.id === viewerShareId)?.ownerEmail || '')}
          onClose={() => {
            setViewerShareId(null);
            fetchShares();
          }}
        />
      )}
    </div>
  );
};