import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Inbox, 
  Sparkles, 
  User, 
  Mail, 
  HelpCircle,
  Gift,
  ArrowRight
} from 'lucide-react';

export const FriendsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { 
    user,
    friendsList, 
    friendsReceivedPending, 
    friendsSentPending, 
    respondFriendRequest, 
    setIsAddFriendModalOpen,
    fetchFriends 
  } = useApp();

  const { language, t } = useLanguage();
  const [isResponding, setIsResponding] = useState<string | null>(null);

  // Refresh friends list when mounting FriendsView to ensure up-to-date data
  useEffect(() => {
    fetchFriends();
  }, []);

  const handleResponse = async (friendshipId: string, action: 'accept' | 'reject') => {
    setIsResponding(friendshipId);
    await respondFriendRequest(friendshipId, action);
    setIsResponding(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#272B30]">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-[#761EAF]" />
            <span>{t('friendsAndCollaborationViewTitle')}</span>
          </h2>
          <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
            {t('friendsAndCollaborationViewSubtitle')}
          </p>
        </div>
        
        {/* Add Friend Trigger Button */}
        <button
          onClick={() => setIsAddFriendModalOpen(true)}
          className="px-4 py-2.5 bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('addFriendBtn')}</span>
        </button>
      </div>

      {/* 1. SEZIONE RICHIESTE RICEVUTE (PENDING INCOMING) */}
      {friendsReceivedPending.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-3 duration-300">
          <h3 className="text-[11px] font-black uppercase text-rose-500 dark:text-rose-400 tracking-wider pl-1 flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            <span>{t('receivedRequests')} ({friendsReceivedPending.length})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </h3>
          
          <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
            {friendsReceivedPending.map((req) => (
              <div key={req.friendshipId} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/20 text-[#761EAF] dark:text-[#C084FC] flex items-center justify-center font-bold text-xs shrink-0">
                    {req.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#1A1A1A] dark:text-white truncate">
                      {req.name}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                      {req.email}
                    </p>
                  </div>
                </div>
                
                {/* Accept/Reject actions */}
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

      {/* Grid containing Current Friends & Sent Pending Requests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Friends list */}
        <div className="md:col-span-2 space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
            {t('myFriends')} ({friendsList.length})
          </h3>
          
          {friendsList.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1D1F] rounded-[24px] border border-gray-100 dark:border-[#272B30] p-8 text-center flex flex-col items-center justify-center space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#111315] border border-gray-100 dark:border-[#272B30] flex items-center justify-center text-gray-400 dark:text-neutral-500">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">{t('noFriendsAdded')}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400 font-medium max-w-[260px] mx-auto leading-normal">
                  {t('noFriendsAddedDesc')}
                </p>
              </div>
              <button
                onClick={() => setIsAddFriendModalOpen(true)}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-[#272B30] dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-neutral-200 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-[#272B30] cursor-pointer transition-all"
              >
                {t('sendFirstInvite')}
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
              {friendsList.map((friend) => (
                <div key={friend.friendshipId} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {friend.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#1A1A1A] dark:text-white truncate">
                        {friend.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-400 truncate">
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  {/* Future credits structure indicator as requested by instructions */}
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-tight flex items-center gap-1 cursor-help group relative"
                      title={t('futureCreditsInfo')}
                    >
                      <Gift className="w-3 h-3" />
                      <span>{friend.creditsEarned || 0} {language === 'it' ? 'crediti' : 'credits'}</span>
                      
                      {/* Interactive tooltip */}
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

        {/* Column 3: Sent pending requests (attesa) */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider pl-1">
            {t('pendingRequests')} ({friendsSentPending.length})
          </h3>

          {friendsSentPending.length === 0 ? (
            <div className="bg-white/50 dark:bg-[#1A1D1F]/40 rounded-[24px] border border-dashed border-gray-200 dark:border-[#272B30] p-6 text-center text-gray-400 dark:text-neutral-500">
              <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-60" />
              <p className="text-[10px] font-bold">{t('noPendingRequests')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1A1D1F] rounded-[22px] border border-gray-100 dark:border-[#272B30] overflow-hidden divide-y divide-gray-100 dark:divide-[#272B30]">
              {friendsSentPending.map((req) => (
                <div key={req.friendshipId} className="p-3.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#1A1A1A] dark:text-white truncate">
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
                  
                  {/* Note if invited user is unregistered */}
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

      {/* Info Banner about credits */}
      <div className="p-4 rounded-3xl bg-purple-50/50 dark:bg-[#761EAF]/5 border border-purple-100/50 dark:border-[#761EAF]/10 flex items-start gap-3.5 mt-2">
        <Sparkles className="w-5 h-5 text-[#761EAF] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#1A1A1A] dark:text-white">
            {t('referralProgramTitle')}
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-neutral-400 font-medium leading-relaxed">
            {t('referralProgramDesc')}
          </p>
        </div>
      </div>

    </div>
  );
};
