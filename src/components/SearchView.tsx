import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  Clock,
  Users,
  Tag,
  ChevronRight,
  Filter,
  Mic,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { AILogo } from './AILogo';
import { Meeting } from '../types';

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
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;

    // Only allow swiping left (negative values) up to -110px
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -110));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset < -60) {
      setSwipeOffset(-100);
    } else {
      setSwipeOffset(0);
    }
    setTouchStart(null);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent">
      {/* Background Action Button (revealed on swipe) */}
      <div className="absolute inset-y-0 right-0 w-[100px] flex items-center justify-center text-white bg-rose-600 dark:bg-rose-800 z-0 rounded-r-3xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(meeting.id);
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white font-bold"
        >
          <Trash2 className="w-5 h-5 text-white animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-white">{t('deleteLabel')}</span>
        </button>
      </div>

      {/* Main card body (slides over background) */}
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
        className="relative z-10 bg-white dark:bg-[#1A1D1F] rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-200/80 dark:border-[#272B30] hover:border-[#761EAF] hover:shadow-md transition-all duration-150 ease-out cursor-pointer flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/25 dark:text-[#C084FC]">
              {meeting.category === 'Riunione' ? (language === 'it' ? 'Riunione' : 'Meeting') : (meeting.category || 'Meeting')}
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(meeting.duration)}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white group-hover:text-[#761EAF] dark:group-hover:text-[#C084FC] transition-colors leading-snug">
            {meeting.title}
          </h3>

          {meeting.summary?.overview && (
            <p className="mt-2.5 text-xs text-gray-600 dark:text-neutral-300 line-clamp-2 leading-relaxed font-normal">
              {meeting.summary.overview}
            </p>
          )}

          {/* Matching tags */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {meeting.tags.map((t, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#272B30] text-gray-500 dark:text-neutral-400"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-[#272B30] flex items-center justify-between text-xs text-gray-400 dark:text-neutral-400">
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
          <div className="text-[#761EAF] dark:text-[#C084FC] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
    const matchesSummary = meeting.summary?.overview.toLowerCase().includes(q);
    const matchesTranscript = meeting.transcript.some(
      (t) => t.text.toLowerCase().includes(q) || t.speakerName.toLowerCase().includes(q)
    );
    const matchesTags = meeting.tags.some((tag) => tag.toLowerCase().includes(q));

    return matchesTitle || matchesSummary || matchesTranscript || matchesTags;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight">
          {t('searchTitle')}
        </h1>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchBarPlaceholder')}
          className="w-full pl-12 pr-24 py-3.5 text-xs sm:text-sm rounded-2xl border border-gray-200/80 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] text-[#1A1A1A] dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
          >
            {t('clearBtn')}
          </button>
        )}
      </div>

      {/* Filter Tag Pills */}
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
                ? 'bg-[#761EAF] text-white shadow-xs'
                : 'bg-white dark:bg-[#1A1D1F] border border-gray-200/80 dark:border-[#272B30] text-gray-500 dark:text-neutral-400 hover:border-[#761EAF]/50'
            }`}
          >
            {getTagLabel(tag)}
          </button>
        ))}
      </div>

      {/* Recordings & Discussions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-neutral-400">
            {t('discussionsFound').replace('{count}', String(filteredMeetings.length))} ({filteredMeetings.length})
          </span>
        </div>

        {filteredMeetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-10 sm:p-12 text-center border border-gray-200/80 dark:border-[#272B30] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center mx-auto">
              <Mic className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white">
              {t('noRecordings')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
              {t('noRecordingsDesc')}
            </p>
            <button
              onClick={() => setIsRecordingModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-md shadow-[#761EAF]/25 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>{t('startFirstRecording')}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-10 text-center border border-gray-200/80 dark:border-[#272B30] space-y-2">
            <Search className="w-8 h-8 text-gray-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-white">
              {t('noSearchMatch')}
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
              {t('noSearchMatchDesc')}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('Tutti');
              }}
              className="mt-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 text-xs font-bold text-[#1A1A1A] dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              {t('showAllRecordings')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

