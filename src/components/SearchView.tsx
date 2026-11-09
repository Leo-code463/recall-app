import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  Clock,
  Users,
  Filter,
  Mic,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Meeting } from '../types';
import { EmptySearchAnimation } from './EmptySearchAnimation';

interface SwipeableMeetingCardProps {
  meeting: Meeting;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  formatDuration: (sec: number) => string;
}

const SwipeableMeetingCard: React.FC<SwipeableMeetingCardProps> = ({
  meeting,
  onSelect,
  onDelete,
  formatDuration,
}) => {
  const { language, t } = useLanguage();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;

    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -110));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -60) {
      setSwipeOffset(-100);
    } else {
      setSwipeOffset(0);
    }
    setTouchStart(null);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent">
      {/* Action background button */}
      <div className="absolute inset-y-0 right-0 w-[100px] flex items-center justify-center text-white bg-rose-600 dark:bg-rose-800 z-0 rounded-r-3xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(meeting.id);
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white font-bold"
        >
          <Trash2 className="w-5 h-5 text-white animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-white">
            {t('deleteLabel')}
          </span>
        </button>
      </div>

      {/* Main card body */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (swipeOffset < -20) {
            setSwipeOffset(0);
          } else {
            onSelect(meeting.id);
          }
        }}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="relative z-10 glass-card !bg-white/85 dark:!bg-[#1B1926]/90 rounded-3xl p-5 sm:p-6 shadow-xs border border-white/70 dark:border-white/10 hover:border-[#6A49D8] hover:shadow-md transition-all duration-150 ease-out cursor-pointer flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#6A49D8]/10 text-[#6A49D8] dark:bg-[#6A49D8]/25 dark:text-[#B29FFF]">
              {meeting.category === 'Riunione'
                ? language === 'it'
                  ? 'Riunione'
                  : 'Meeting'
                : meeting.category || 'Meeting'}
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(meeting.duration)}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#16161E] dark:text-white group-hover:text-[#6A49D8] dark:group-hover:text-[#B29FFF] transition-colors leading-snug">
            {meeting.title}
          </h3>

          {meeting.summary?.overview && (
            <p className="mt-3 text-xs text-gray-600 dark:text-neutral-300 line-clamp-2 leading-relaxed font-normal">
              {meeting.summary.overview}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {meeting.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F3F1FC]/70 dark:bg-white/10 text-gray-500 dark:text-neutral-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#ECEBF3] dark:border-white/10 flex items-center justify-between text-xs text-gray-400 dark:text-neutral-400">
          <div className="flex items-center gap-2 font-medium">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {meeting.speakers.length}{' '}
              {meeting.speakers.length === 1 ? t('oneSpeaker') : t('multipleSpeakers')}
            </span>
            <span>•</span>
            <span>
              {new Date(meeting.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
          <div className="text-[#6A49D8] dark:text-[#B29FFF] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>{t('seeSummary')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SearchView: React.FC = () => {
  const { meetings, setActiveMeetingId, setIsRecordingModalOpen, deleteMeeting } = useApp();
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Tutti');

  const allTags = ['Tutti', 'Riunione', 'Colloquio', '1-on-1', 'Clienti', 'Sprint', 'Flutter', 'HR'];

  const getTagLabel = (tag: string) => {
    if (tag === 'Tutti') return language === 'it' ? 'Tutti' : 'All';
    if (tag === 'Riunione') return language === 'it' ? 'Riunione' : 'Meeting';
    if (tag === 'Colloquio') return language === 'it' ? 'Colloquio' : 'Interview';
    return tag;
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesTag =
      selectedTag === 'Tutti' ||
      meeting.category === selectedTag ||
      meeting.tags.includes(selectedTag);

    if (!matchesTag) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const matchesTitle = meeting.title.toLowerCase().includes(q);
    const matchesSummary = meeting.summary?.overview?.toLowerCase().includes(q);
    const matchesTranscript = meeting.transcript.some(
      (seg) => seg.text.toLowerCase().includes(q) || seg.speakerName.toLowerCase().includes(q)
    );
    const matchesTags = meeting.tags.some((tag) => tag.toLowerCase().includes(q));

    return matchesTitle || matchesSummary || matchesTranscript || matchesTags;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-24">
      {/* Blocco Sticky */}
      <div className="sticky top-0 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 -mt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:-mt-[calc(1.5rem+env(safe-area-inset-top,0px))] pt-[calc(0.875rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] header-blur is-scrolled pb-3 space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16161E] dark:text-white tracking-tight">
          {t('searchTitle')}
        </h1>

        {/* Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchBarPlaceholder')}
            className="w-full pl-12 pr-24 py-3.5 text-xs sm:text-sm rounded-2xl border border-white/70 dark:border-white/10 bg-white/75 backdrop-blur-lg dark:bg-white/[0.06] text-[#16161E] dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#6A49D8]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 hover:text-[#16161E] dark:hover:text-white px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
            >
              {t('clearBtn')}
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-bold text-gray-400 dark:text-neutral-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> {t('filterLabel')}
          </span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#6A49D8] text-white shadow-xs'
                  : 'bg-white/75 backdrop-blur-lg dark:bg-white/[0.06] border border-white/70 dark:border-white/10 text-gray-500 dark:text-neutral-400 hover:border-[#6A49D8]/50'
              }`}
            >
              {getTagLabel(tag)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid delle registrazioni o stato vuoto con Animazione Lottie */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-neutral-400">
            {t('discussionsFound').replace('{count}', String(filteredMeetings.length))} ({filteredMeetings.length})
          </span>
        </div>

        {filteredMeetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredMeetings.map((meeting) => (
              <SwipeableMeetingCard
                key={meeting.id}
                meeting={meeting}
                onSelect={(id) => setActiveMeetingId(id)}
                onDelete={(id) => deleteMeeting(id)}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] p-6 sm:p-8 border border-white/70 dark:border-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
            <EmptySearchAnimation
              title={t('noRecordings')}
              subtitle={t('noRecordingsDesc')}
              actionButton={
                <button
                  onClick={() => setIsRecordingModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6A49D8] hover:bg-[#5B3CC4] text-white text-xs font-bold shadow-md shadow-[#6A49D8]/25 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>{t('startFirstRecording')}</span>
                </button>
              }
            />
          </div>
        ) : (
          <div className="bg-white/75 backdrop-blur-xl dark:bg-white/[0.06] rounded-[28px] p-6 sm:p-8 border border-white/70 dark:border-white/10 shadow-[0_10px_40px_-14px_rgba(106,73,216,0.22)] dark:shadow-none">
            <EmptySearchAnimation
              title={t('noSearchMatch')}
              subtitle={t('noSearchMatchDesc')}
              actionButton={
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag('Tutti');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-neutral-800 text-xs font-bold text-[#16161E] dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {t('showAllRecordings')}
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};