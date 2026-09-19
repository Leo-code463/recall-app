import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  Share2,
  Trash2,
  Search,
  Copy,
  Send,
  Check,
  Bot,
  AlertCircle,
  ExternalLink,
  Brain,
  Network,
  RefreshCw,
} from 'lucide-react';
import { AILogo } from './AILogo';
import { chatWithMeetingAiApi, summarizeMeetingApi, detectCalendarEventsApi } from '../services/geminiService';
import { GoogleWorkspaceService } from '../services/calendarService';
import confetti from 'canvas-confetti';

export const MeetingDetailView: React.FC<{ meetingId: string }> = ({ meetingId }) => {
  const {
    meetings,
    setActiveMeetingId,
    deleteMeeting,
    addDetectedEventToCalendar,
    addActionItemToGoogleTasks,
    user,
    setIsUpgradeModalOpen,
    triggerSuccess,
    updateMeeting,
    setCalendarPreviewData,
  } = useApp();

  const { language, t } = useLanguage();

  const meeting = meetings.find((m) => m.id === meetingId);

  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'chat'>('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Lazy AI Loader state for when the meeting needs processing
  const [isProcessingLazy, setIsProcessingLazy] = useState(meeting?.status === 'processing');
  const [lazyError, setLazyError] = useState<string | null>(null);

  // Function to process meeting with AI in the background
  const triggerLazyAi = React.useCallback(async () => {
    if (!meeting) return;
    setIsProcessingLazy(true);
    setLazyError(null);
    try {
      // Step 1: Call Gemini summary API
      const summary = await summarizeMeetingApi({
        transcript: meeting.transcript,
        meetingTitle: meeting.title,
        plan: user?.plan || 'pro',
      });

      // Step 2: Call Gemini calendar detection API
      const calendarEvents = await detectCalendarEventsApi({
        transcript: meeting.transcript,
        meetingDate: meeting.date.split('T')[0],
      });

      // Step 3: Update the meeting status to ready and save to global context & localStorage
      const updatedMeeting = {
        ...meeting,
        status: 'ready' as const,
        tags: ['Registrazione', 'Elaborato AI', meeting.category || 'Riunione'],
        summary,
        calendarEventsDetected: calendarEvents,
      };

      updateMeeting(updatedMeeting);
      setIsProcessingLazy(false);
      triggerSuccess('Sintesi ed elaborazione IA completate!');
    } catch (err: any) {
      console.error('Lazy AI error:', err);
      setLazyError(err.message || 'Errore durante l’elaborazione intelligente. Riprova.');
      setIsProcessingLazy(false);
    }
  }, [meeting, user?.plan, updateMeeting, triggerSuccess]);

  // Run automatically on mount if status is 'processing'
  React.useEffect(() => {
    if (meeting && meeting.status === 'processing') {
      triggerLazyAi();
    }
  }, [meetingId, meeting?.status]);

  // Audio Player live synchronizer states
  const [currentTime, setCurrentTime] = useState(0);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const synthIntervalRef = React.useRef<any>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Concept Map state
  const [conceptMap, setConceptMap] = useState<{
    nodes: Array<{ id: string; label: string; type: 'central' | 'topic' | 'decision'; color: string }>;
    links: Array<{ from: string; to: string; relation: string }>;
  } | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);

  // Concept Map customized questions states
  const [showMapQuestions, setShowMapQuestions] = useState(false);
  const [showMindMapScreen, setShowMindMapScreen] = useState(false);
  const [mapFocus, setMapFocus] = useState<'overview' | 'decisions' | 'technical' | 'brainstorm'>('overview');
  const [mapDetail, setMapDetail] = useState<'compact' | 'detailed'>('compact');
  const [mapStyle, setMapStyle] = useState<'tech' | 'creative' | 'minimal'>('creative');
  const [mapNotes, setMapNotes] = useState('');

  // Google Docs Export States
  const [isExportingToDoc, setIsExportingToDoc] = useState(false);
  const [exportedDocUrl, setExportedDocUrl] = useState<string | null>(null);

  // AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; timestamp: string }>>(
    meeting?.chatHistory || [
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: `Ciao! Sono l'assistente IA di questa riunione. Puoi farmi qualsiasi domanda sul contenuto, chiedere chiarimenti sulle decisioni prese o chiedermi di comporre una mail di riepilogo.`,
        timestamp: 'Adesso',
      },
    ]
  );
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Play periodic clean synthesized sound if real audioUrl is missing (just so they can HEAR the transcript AI-synthesized!)
  const startSynthSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(261.63, ctx.currentTime); // C4 note (nice clean pitch)
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(329.63, ctx.currentTime); // E4 note

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn('Synth sound failed', e);
    }
  };

  const startSimulatedTimer = () => {
    if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
    startSynthSound();
    
    let lastSynthTime = Date.now();
    synthIntervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1;
        if (meeting && next >= meeting.duration) {
          setIsPlaying(false);
          return 0;
        }
        if (Date.now() - lastSynthTime > 5000) {
          startSynthSound();
          lastSynthTime = Date.now();
        }
        return next;
      });
    }, 1000 / playbackSpeed);
  };

  const stopSimulatedTimer = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  // Audio Playback effect
  React.useEffect(() => {
    if (!meeting) return;

    if (isPlaying) {
      if (meeting.audioUrl) {
        if (audioElRef.current) {
          audioElRef.current.playbackRate = playbackSpeed;
          audioElRef.current.play().catch((err) => {
            console.warn('Real audio play failed, falling back to simulated ticking:', err);
            startSimulatedTimer();
          });
        }
      } else {
        startSimulatedTimer();
      }
    } else {
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      stopSimulatedTimer();
    }

    return () => {
      stopSimulatedTimer();
    };
  }, [isPlaying, playbackSpeed, meeting?.audioUrl]);

  // Custom AI Map generation function based on user's questionnaire answers
  const generateCustomMapWithAi = async () => {
    if (!meeting) return;
    setIsGeneratingMap(true);
    setExportedDocUrl(null);
    try {
      let focusText = 'un riassunto equilibrato di tutta la riunione';
      if (mapFocus === 'decisions') focusText = 'focalizzato su decisioni strategiche, compiti d\'azione e chi fa cosa';
      else if (mapFocus === 'technical') focusText = 'focalizzato su dettagli tecnici, specifiche, architettura ed elementi operativi';
      else if (mapFocus === 'brainstorm') focusText = 'focalizzato su idee, brainstorming creativo, opzioni discusse e proposte innovative';

      let detailText = 'fino a un massimo di 6 nodi chiave, molto sintetico ed essenziale';
      if (mapDetail === 'detailed') detailText = 'fino a un massimo di 11-12 nodi dettagliati, approfondito e ramificato';

      let centralColor = '#761EAF';
      let topicColor = '#3B82F6';
      let decisionColor = '#10B981';

      if (mapStyle === 'tech') {
        centralColor = '#1E293B';
        topicColor = '#2563EB';
        decisionColor = '#06B6D4';
      } else if (mapStyle === 'minimal') {
        centralColor = '#0F172A';
        topicColor = '#475569';
        decisionColor = '#64748B';
      }

      const prompt = `Genera una mappa concettuale strutturata personalizzata per la riunione "${meeting.title}".
L'utente ha configurato le seguenti preferenze speciali per la mappa:
- Focus Tematico: ${focusText}
- Livello di Dettaglio: ${detailText}
- Note personalizzate aggiuntive fornite dall'utente: "${mapNotes.trim() || 'Nessuna nota aggiuntiva'}"

Ritorna ESCLUSIVAMENTE un JSON valido con la seguente struttura, non aggiungere alcun testo prima o dopo il JSON:
{
  "nodes": [
    { "id": "central", "label": "Titolo o Focus Centrale", "type": "central", "color": "${centralColor}" },
    { "id": "node1", "label": "Argomento o Concetto Chiave", "type": "topic", "color": "${topicColor}" },
    { "id": "node2", "label": "Decisione, Action Item o Conseguenza", "type": "decision", "color": "${decisionColor}" }
  ],
  "links": [
    { "from": "central", "to": "node1", "relation": "comprende" },
    { "from": "node1", "to": "node2", "relation": "porta a" }
  ]
}

Assicurati che tutti i nodi abbiano un "id" unico e che i link usino questi id in "from" e "to".
Basa interamente la mappa su questa conversazione trascorsa:
${JSON.stringify(meeting.summary)}
`;

      const aiReply = await chatWithMeetingAiApi({
        question: prompt,
        transcript: meeting.transcript,
        summary: meeting.summary,
        meetingTitle: meeting.title,
        plan: user?.plan || 'pro',
      });

      const jsonStart = aiReply.indexOf('{');
      const jsonEnd = aiReply.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = aiReply.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.nodes && parsed.links) {
          const typedNodes = parsed.nodes.map((n: any) => ({
            id: n.id,
            label: n.label,
            type: n.type || 'topic',
            color: n.color || (n.type === 'central' ? centralColor : n.type === 'topic' ? topicColor : decisionColor)
          }));
          
          setConceptMap({ nodes: typedNodes, links: parsed.links });
          setShowMapQuestions(false);
          setShowMindMapScreen(true);
          try {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Custom AI Map generation failed', e);
      alert('Si è verificato un errore durante la generazione della mappa. Riprova con parametri più semplici.');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  // Google Docs export function
  const exportMapToGoogleDocs = async () => {
    if (!meeting || !conceptMap) return;
    setIsExportingToDoc(true);
    setExportedDocUrl(null);
    try {
      const docUrl = await GoogleWorkspaceService.createGoogleDocForConceptMap(
        meeting.title,
        conceptMap
      );
      if (docUrl) {
        setExportedDocUrl(docUrl);
        triggerSuccess('Mappa esportata in Google Docs!');
        try {
          confetti({ particleCount: 50, spread: 40 });
        } catch (e) {}
      } else {
        alert("Impossibile creare il documento. Verifica di aver concesso l'autorizzazione per Google Docs.");
      }
    } catch (err) {
      console.error('Export error:', err);
      alert("Errore durante l'esportazione su Google Docs.");
    } finally {
      setIsExportingToDoc(false);
    }
  };

  if (!meeting) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#1A1D1F] rounded-3xl border border-gray-100 dark:border-[#272B30] shadow-sm">
        <p className="text-sm font-bold text-[#1A1A1A] dark:text-white">
          {language === 'it' ? 'Riunione non trovata' : 'Meeting not found'}
        </p>
        <button
          onClick={() => setActiveMeetingId(null)}
          className="mt-4 px-4 py-2 bg-[#761EAF] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          {language === 'it' ? 'Torna alla Dashboard' : 'Back to Dashboard'}
        </button>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return language === 'it' ? `${mins} min e ${seconds % 60} sec` : `${mins} min and ${seconds % 60} sec`;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!meeting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * meeting.duration;
    setCurrentTime(newTime);
    if (audioElRef.current) {
      audioElRef.current.currentTime = newTime;
    }
  };

  const handleCopyTranscript = () => {
    const text = meeting.transcript
      .map((t) => `[${t.speakerName}]: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleSendChatMessage = async (presetText?: string) => {
    const query = presetText || chatInput;
    if (!query.trim() || isChatLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user' as const,
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    try {
      const aiReply = await chatWithMeetingAiApi({
        question: query,
        transcript: meeting.transcript,
        summary: meeting.summary,
        meetingTitle: meeting.title,
        plan: user?.plan || 'free',
      });

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai' as const,
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: `Si è verificato un errore durante la risposta: ${err.message}`,
          timestamp: 'Errore',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Filter transcript
  const filteredTranscript = meeting.transcript.filter(
    (item) =>
      item.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      item.speakerName.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Top Bar with Back, Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="meeting-detail-back-btn"
            onClick={() => setActiveMeetingId(null)}
            className="p-2 rounded-xl border border-gray-100 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-colors cursor-pointer"
            title={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/20 dark:text-[#C084FC]">
                {meeting.category || (language === 'it' ? 'Riunione' : 'Meeting')}
              </span>
              <span className="text-xs font-medium text-gray-400 dark:text-neutral-400">
                {new Date(meeting.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight mt-1">
              {meeting.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="meeting-copy-transcript-btn"
            onClick={handleCopyTranscript}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-100 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] hover:bg-gray-50 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {copiedTranscript ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedTranscript ? (language === 'it' ? 'Copiato' : 'Copied') : (language === 'it' ? 'Copia Testo' : 'Copy Text')}</span>
          </button>

          <button
            id="meeting-delete-btn"
            onClick={() => deleteMeeting(meeting.id)}
            title="Elimina registrazione"
            className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Player Bar */}
      <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-[#272B30] flex flex-col sm:flex-row items-center justify-between gap-4">
        {meeting.audioUrl && (
          <audio
            ref={audioElRef}
            src={meeting.audioUrl.startsWith('data:') ? meeting.audioUrl : `data:audio/mp3;base64,${meeting.audioUrl}`}
            onTimeUpdate={() => {
              if (audioElRef.current) {
                setCurrentTime(audioElRef.current.currentTime);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
          />
        )}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <button
            id="audio-player-toggle-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 rounded-full bg-[#761EAF] hover:bg-[#681898] text-white flex items-center justify-center shadow-md shadow-[#761EAF]/30 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-neutral-400 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatDuration(meeting.duration)}</span>
            </div>
            <div
              onClick={handleTimelineClick}
              className="w-full bg-[#F8F9FB] dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden cursor-pointer relative"
            >
              <div
                className="bg-[#761EAF] h-full rounded-full transition-all duration-100"
                style={{ width: `${meeting.duration > 0 ? (currentTime / meeting.duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#272B30] p-1 rounded-xl text-xs font-bold text-[#1A1A1A] dark:text-white">
            {[1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  setPlaybackSpeed(spd);
                  if (audioElRef.current) {
                    audioElRef.current.playbackRate = spd;
                  }
                }}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                    : 'text-gray-400 dark:text-neutral-400'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-gray-400 dark:text-neutral-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{meeting.speakers.length} {language === 'it' ? 'interlocutori' : 'speakers'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Riassunto vs Trascrizione vs Chat AI */}
      <div className="flex bg-[#761EAF]/5 dark:bg-[#761EAF]/10 p-1.5 rounded-2xl border border-transparent">
        <button
          id="meeting-tab-summary"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] dark:text-white shadow-xs'
              : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-400'
          }`}
        >
          <AILogo size="xs" />
          <span>{language === 'it' ? 'Riassunto IA' : 'AI Summary'}</span>
        </button>

        <button
          id="meeting-tab-transcript"
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transcript'
              ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] dark:text-white shadow-xs'
              : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-400'
          }`}
        >
          <FileText className="w-4 h-4 text-[#761EAF]" />
          <span>{t('transcript')}</span>
        </button>

        <button
          id="meeting-tab-chat"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] dark:text-white shadow-xs'
              : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-400'
          }`}
        >
          <Bot className="w-4 h-4 text-[#761EAF]" />
          <span>{language === 'it' ? 'Chat AI' : 'AI Chat'}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: RIASSUNTO IA */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {isProcessingLazy ? (
            <div className="bg-white dark:bg-[#1A1D1F] rounded-2xl p-8 shadow-xs border border-gray-100 dark:border-[#272B30] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#761EAF]/10 dark:bg-[#761EAF]/20 flex items-center justify-center mx-auto">
                <RefreshCw className="w-5 h-5 text-[#761EAF] animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-black text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Generazione analisi IA in corso...' : 'Generating AI Analysis...'}
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  {language === 'it' 
                    ? 'Stiamo leggendo la trascrizione per strutturare la panoramica esecutiva, rilevare decisioni e impegni ed impostare il Calendario AI. Ci vorranno circa 2 secondi.'
                    : 'We are parsing the transcript to structure the executive summary, detect decisions, and prepare your AI Calendar events. This will take about 2 seconds.'}
                </p>
              </div>
            </div>
          ) : lazyError ? (
            <div className="bg-white dark:bg-[#1A1D1F] rounded-2xl p-8 shadow-xs border border-gray-100 dark:border-[#272B30] text-center space-y-3">
              <div className="text-amber-500 flex justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? "Impossibile completare l'analisi IA" : "Unable to complete AI analysis"}
                </h3>
                <p className="text-[11px] text-rose-500 max-w-xs mx-auto leading-relaxed">
                  {lazyError}
                </p>
              </div>
              <button
                onClick={triggerLazyAi}
                className="px-3.5 py-1.5 bg-[#761EAF] hover:bg-[#681898] text-white text-[10px] font-bold rounded-lg cursor-pointer"
              >
                {language === 'it' ? 'Riprova Elaborazione' : 'Retry Processing'}
              </button>
            </div>
          ) : (
            <>
              {/* Executive Overview */}
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#272B30]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <AILogo size="sm" />
                <span>{language === 'it' ? 'Panoramica Esecutiva' : 'Executive Overview'}</span>
              </h2>
              {meeting.summary?.sentiment && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {language === 'it' ? 'Clima: Costruttivo & Positivo' : 'Tone: Constructive & Positive'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-neutral-200 leading-relaxed font-normal">
              {meeting.summary?.overview || (language === 'it' ? 'Nessun riassunto generato per questa conversazione.' : 'No summary generated for this discussion.')}
            </p>

            {meeting.summary?.topics && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#272B30] flex flex-wrap gap-2">
                {meeting.summary.topics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#F8F9FB] dark:bg-neutral-800 text-gray-500 dark:text-neutral-400"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CALENDARIO AI: Impegni & Date Rilevate (Pro Feature) */}
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 shadow-sm border border-[#761EAF]/20 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#761EAF]" />
                    <span>{language === 'it' ? 'Calendario AI' : 'AI Calendar'}</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#761EAF] text-white">
                    {language === 'it' ? 'ESCLUSIVA PRO' : 'PRO EXCLUSIVE'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
                  {language === 'it' ? 'Impegni, date e follow-up concordati durante la conversazione' : 'Commitments, dates, and follow-ups agreed upon during the conversation'}
                </p>
              </div>

              {user?.plan !== 'pro' && (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="text-xs text-[#761EAF] font-bold hover:underline cursor-pointer"
                >
                  {language === 'it' ? 'Sblocca con Recall Pro →' : 'Unlock with Recall Pro →'}
                </button>
              )}
            </div>

            {meeting.calendarEventsDetected && meeting.calendarEventsDetected.length > 0 ? (
              <div className="space-y-3">
                {meeting.calendarEventsDetected.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                          {ev.title}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#761EAF]/10 text-[#761EAF] dark:bg-[#761EAF]/20 dark:text-[#C084FC]">
                          {ev.date} {language === 'it' ? 'alle' : 'at'} {ev.startTime}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-neutral-400 mt-1 font-normal">
                        {ev.description}
                      </p>
                    </div>

                    <button
                      id={`add-to-calendar-${ev.id}-btn`}
                      onClick={() => addDetectedEventToCalendar(meeting.id, ev.id)}
                      disabled={ev.isAddedToCalendar}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        ev.isAddedToCalendar
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#761EAF] hover:bg-[#681898] text-white shadow-xs'
                      }`}
                    >
                      {ev.isAddedToCalendar ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{language === 'it' ? 'Aggiunto a Google Calendar' : 'Added to Google Calendar'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{language === 'it' ? 'Aggiungi a Google Calendar' : 'Add to Google Calendar'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-neutral-400 italic">
                {language === 'it' ? 'Nessuna data o appuntamento futuro rilevato in questa discussione.' : 'No future date or appointment detected in this discussion.'}
              </p>
            )}
          </div>

          {/* Mappa Concettuale AI */}
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#272B30] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-gradient-to-l from-purple-500/10 to-transparent w-40 h-40 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-[#761EAF]" />
                  <span>{language === 'it' ? 'Mappa Concettuale AI' : 'AI Concept Map'}</span>
                </h2>
                <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
                  {language === 'it' ? 'Crea e visualizza una mappa logica interattiva basata sulle tue esigenze.' : 'Create and view an interactive logic map customized to your needs.'}
                </p>
              </div>

              {!conceptMap ? (
                <button
                  onClick={() => setShowMapQuestions(true)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#761EAF] hover:bg-[#641896] text-white text-xs font-bold rounded-xl shadow-md shadow-[#761EAF]/20 transition-all cursor-pointer shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{language === 'it' ? 'Genera Mappa con IA' : 'Generate Map with AI'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <button
                    onClick={() => setShowMindMapScreen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#761EAF]/10 hover:bg-[#761EAF]/20 dark:bg-[#761EAF]/20 dark:hover:bg-[#761EAF]/30 text-[#761EAF] dark:text-[#C084FC] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'it' ? 'Visualizza Mappa' : 'View Map'}</span>
                  </button>
                  <button
                    onClick={() => setShowMapQuestions(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'it' ? 'Rigenera...' : 'Regenerate...'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Simple static preview/status banner */}
            <div className="bg-[#F8F9FB] dark:bg-[#111315]/80 p-5 rounded-2xl border border-gray-100 dark:border-[#272B30] text-center">
              {conceptMap ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-neutral-300 font-bold">
                    {language === 'it' 
                      ? `Mappa concettuale disponibile (${conceptMap.nodes.length} nodi e ${conceptMap.links.length} collegamenti)` 
                      : `Concept map available (${conceptMap.nodes.length} nodes and ${conceptMap.links.length} links)`}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {language === 'it' 
                      ? 'Clicca su "Visualizza Mappa" per aprirla a schermo intero ed esportarla su Google Docs.' 
                      : 'Click "View Map" to open it full screen and export to Google Docs.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {language === 'it' ? 'Nessuna mappa concettuale è stata ancora generata per questa riunione.' : 'No concept map has been generated for this meeting yet.'}
                  </p>
                  <button
                    onClick={() => setShowMapQuestions(true)}
                    className="text-xs text-[#761EAF] dark:text-[#C084FC] font-extrabold hover:underline"
                  >
                    {language === 'it' ? 'Inizia configurazione guidata →' : 'Start guided configuration →'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Items & Task */}
          <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl p-6 shadow-xs border border-gray-100 dark:border-[#272B30] space-y-4">
            <div className="flex items-center justify-between pl-1">
              <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Action Items
              </h2>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-neutral-500 tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </div>
            </div>

            <div className="space-y-3">
              {meeting.summary?.actionItems?.map((act) => {
                const handleActionSyncClick = () => {
                  const isAi1 = act.id === 'ai-1';
                  const isAi2 = act.id === 'ai-2';
                  
                  setCalendarPreviewData({
                    title: act.task,
                    date: '2026-07-19', // Representative date for Q3 roadmap outputs
                    startTime: isAi1 ? '10:00' : isAi2 ? '13:00' : '15:00',
                    endTime: isAi1 ? '10:45' : isAi2 ? '13:45' : '15:45',
                    description: `Action Item assegnato a ${act.assignee || 'Team'} emerso durante la riunione: "${meeting.title}".\nScadenza stabilita: ${act.dueDate || 'non specificata'}.`,
                    onSave: async (savedEvent: any) => {
                      await addActionItemToGoogleTasks(meeting.id, act.id);
                    }
                  });
                };

                return (
                  <div
                    key={act.id}
                    className={`p-3.5 rounded-[22px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                      act.isCompleted
                        ? 'bg-gray-50/50 dark:bg-neutral-900/10 border-transparent opacity-60'
                        : 'bg-white dark:bg-[#1A1D1F] border-gray-100 dark:border-[#272B30] shadow-3xs'
                    }`}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white leading-normal">
                        {act.task}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 dark:text-neutral-500 font-bold">
                        <span>👤 {act.assignee || 'Team'}</span>
                        {act.dueDate && (
                          <>
                            <span>•</span>
                            <span>{language === 'it' ? `Scadenza: ${act.dueDate}` : `Due date: ${act.dueDate}`}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {act.syncedToGoogleTasks ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tight border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{language === 'it' ? 'Sincronizzato con Google Calendar' : 'Synced with Google Calendar'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleActionSyncClick}
                          className="px-3.5 py-1.5 bg-[#761EAF] hover:bg-[#681898] text-white text-[10.5px] font-black rounded-full shadow-3xs hover:scale-[1.03] active:scale-97 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'it' ? 'Aggiungi a Google Calendar' : 'Add to Google Calendar'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: TRASCRIZIONE COMPLETA */}
      {activeTab === 'transcript' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Search bar for transcript */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              placeholder={language === 'it' ? 'Cerca parole chiave o interlocutori nella trascrizione...' : 'Search keywords or speakers in transcript...'}
              className="w-full pl-10 pr-3 py-3 text-xs rounded-2xl border border-gray-100 dark:border-[#272B30] bg-white dark:bg-[#1A1D1F] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
            />
          </div>

          {/* Diarization Bubbles */}
          <div className="space-y-3">
            {filteredTranscript.map((seg) => {
              const speaker = meeting.speakers.find((s) => s.id === seg.speakerId) || {
                name: seg.speakerName,
                color: '#761EAF',
              };

              const formatOffset = (offsetSec: number) => {
                const mins = Math.floor(offsetSec / 60);
                const secs = offsetSec % 60;
                return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
              };

              return (
                <div
                  key={seg.id}
                  className="bg-white dark:bg-[#1A1D1F] rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-[#272B30]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center uppercase"
                        style={{ backgroundColor: speaker.color || '#761EAF' }}
                      >
                        {seg.speakerName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                        {seg.speakerName}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-gray-400 dark:text-neutral-400">
                      {formatOffset(seg.timeOffset)}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-700 dark:text-neutral-200 leading-relaxed pl-8 font-normal">
                    {seg.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CHATTA CON L'IA */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-[#1A1D1F] rounded-3xl shadow-sm border border-gray-100 dark:border-[#272B30] flex flex-col h-[520px] animate-in fade-in duration-200 overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 dark:border-[#272B30] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                  {language === 'it' ? 'Assistente IA di Riunione' : 'Meeting AI Assistant'}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-neutral-400">
                  {language === 'it' ? 'Risponde rigorosamente sui fatti della trascrizione' : 'Answers strictly based on the transcript facts'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              Gemini 3.1 Flash Lite Active
            </span>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 p-4 overflow-y-auto space-y-3 ${isProcessingLazy || lazyError ? 'flex flex-col justify-center' : ''}`}>
            {isProcessingLazy ? (
              <div className="text-center space-y-3 py-8">
                <div className="w-10 h-10 rounded-full bg-[#761EAF]/10 dark:bg-[#761EAF]/20 flex items-center justify-center mx-auto animate-spin">
                  <RefreshCw className="w-5 h-5 text-[#761EAF]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#1A1A1A] dark:text-white">
                    {language === 'it' ? 'Attivazione chat intelligente...' : 'Activating smart chat...'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    {language === 'it' 
                      ? 'Stiamo elaborando la trascrizione con Gemini per abilitare la conversazione contestuale. Ci vorrà solo un istante.'
                      : 'We are processing the transcript with Gemini to enable contextual chat. This will only take a moment.'}
                  </p>
                </div>
              </div>
            ) : lazyError ? (
              <div className="text-center space-y-3 py-8">
                <div className="text-amber-500 flex justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-500">
                    {language === 'it' ? "Impossibile attivare l'assistente AI" : 'Unable to activate AI assistant'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-neutral-400">
                    {lazyError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerLazyAi}
                  className="px-3 py-1 bg-[#761EAF] text-white text-[10px] font-bold rounded-lg cursor-pointer mx-auto"
                >
                  {language === 'it' ? 'Riprova' : 'Retry'}
                </button>
              </div>
            ) : (
              <>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center shrink-0 mt-0.5">
                        <AILogo size="sm" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#761EAF] text-white rounded-br-none shadow-xs'
                          : 'bg-[#F8F9FB] dark:bg-[#272B30] text-[#1A1A1A] dark:text-white rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-normal">{msg.text}</p>
                      <span
                        className={`block text-[10px] mt-1 ${
                          msg.sender === 'user' ? 'text-white/70 text-right' : 'text-gray-400 dark:text-neutral-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex gap-2.5 items-center text-xs text-gray-400 dark:text-neutral-400">
                    <div className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center">
                      <AILogo size="sm" isThinking={true} />
                    </div>
                    <div className="bg-[#F8F9FB] dark:bg-[#272B30] p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#761EAF] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#761EAF] animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#761EAF] animate-bounce delay-300" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preset Prompts Pill Carousel */}
          <div className="px-4 py-2.5 bg-[#F8F9FB] dark:bg-[#111315] border-t border-gray-100 dark:border-[#272B30] flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendChatMessage(language === 'it' ? 'Scrivi una mail di recap per i partecipanti' : 'Write a recap email for the participants')}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-[#272B30] hover:border-[#761EAF] text-[#1A1A1A] dark:text-white shrink-0 transition-colors cursor-pointer"
            >
              {language === 'it' ? 'Mail di recap' : 'Recap Email'}
            </button>
            <button
              onClick={() => handleSendChatMessage(language === 'it' ? 'Quali scadenze sono state fissate?' : 'What deadlines have been set?')}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-[#272B30] hover:border-[#761EAF] text-[#1A1A1A] dark:text-white shrink-0 transition-colors cursor-pointer"
            >
              {language === 'it' ? 'Scadenze fissate' : 'Set Deadlines'}
            </button>
            <button
              onClick={() => handleSendChatMessage(language === 'it' ? 'Chi è responsabile del rilascio in staging?' : 'Who is responsible for the staging release?')}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1D1F] border border-gray-100 dark:border-[#272B30] hover:border-[#761EAF] text-[#1A1A1A] dark:text-white shrink-0 transition-colors cursor-pointer"
            >
              {language === 'it' ? 'Responsabile staging' : 'Staging Owner'}
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="p-3 bg-white dark:bg-[#1A1D1F] border-t border-gray-100 dark:border-[#272B30] flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={language === 'it' ? 'Chiedi qualsiasi dettaglio su questa riunione...' : 'Ask any detail about this meeting...'}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-[#272B30] bg-[#F8F9FB] dark:bg-[#111315] text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#761EAF]"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="px-4 py-2.5 bg-[#761EAF] hover:bg-[#681898] disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>

      {/* 🔮 CUSTOM MAP CONFIGURATION FORM MODAL */}
      {showMapQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1D1F] w-full max-w-lg rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-[#272B30] space-y-6 text-left max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#272B30] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#761EAF] dark:text-[#C084FC] flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1A1A] dark:text-white">
                    {language === 'it' ? 'Personalizza la tua Mappa Concettuale' : 'Customize Your Concept Map'}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-neutral-400 font-medium">
                    {language === 'it' ? "Scegli i parametri per l'elaborazione di Gemini AI" : 'Choose parameters for Gemini AI processing'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMapQuestions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-bold"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Question 1: Focus */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                  {language === 'it' ? '1. Quale deve essere il focus principale?' : '1. What should be the main focus?'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'overview', title: language === 'it' ? 'Panoramica' : 'Overview', desc: language === 'it' ? 'Sintesi equilibrata' : 'Balanced summary' },
                    { id: 'decisions', title: language === 'it' ? 'Decisioni' : 'Decisions', desc: language === 'it' ? 'Action Items & Chi fa cosa' : 'Action Items & Responsibilities' },
                    { id: 'technical', title: language === 'it' ? 'Tecnico' : 'Technical', desc: language === 'it' ? 'Specifiche e operatività' : 'Specs & Operations' },
                    { id: 'brainstorm', title: language === 'it' ? 'Brainstorm' : 'Brainstorm', desc: language === 'it' ? 'Idee e spunti creativi' : 'Ideas & creative inputs' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMapFocus(opt.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        mapFocus === opt.id
                          ? 'border-[#761EAF] bg-purple-50/50 dark:bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] font-bold'
                          : 'border-gray-100 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="block text-xs font-extrabold">{opt.title}</span>
                      <span className="block text-[10px] text-gray-400 font-medium">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Detail Level */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                  {language === 'it' ? '2. Livello di dettaglio desiderato' : '2. Desired detail level'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'compact', title: language === 'it' ? 'Essenziale' : 'Essential', desc: language === 'it' ? 'Fino a 6 nodi chiave' : 'Up to 6 key nodes' },
                    { id: 'detailed', title: language === 'it' ? 'Approfondito' : 'In-depth', desc: language === 'it' ? 'Fino a 12 nodi dettagliati' : 'Up to 12 detailed nodes' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMapDetail(opt.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        mapDetail === opt.id
                          ? 'border-[#761EAF] bg-purple-50/50 dark:bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] font-bold'
                          : 'border-gray-100 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="block text-xs font-extrabold">{opt.title}</span>
                      <span className="block text-[10px] text-gray-400 font-medium">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Style */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                  {language === 'it' ? '3. Stile visuale & Colori' : '3. Visual Style & Colors'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'creative', title: 'Recall Purple', color: 'bg-[#761EAF]' },
                    { id: 'tech', title: 'Cobalt Blue', color: 'bg-blue-500' },
                    { id: 'minimal', title: 'Slate Minimal', color: 'bg-slate-600' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMapStyle(opt.id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        mapStyle === opt.id
                          ? 'border-[#761EAF] bg-purple-50/50 dark:bg-[#761EAF]/10 text-[#761EAF] dark:text-[#C084FC] font-bold'
                          : 'border-gray-100 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                      <span className="text-[10px] font-bold">{opt.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4: Custom Notes */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                  {language === 'it' ? '4. Note Aggiuntive o Richieste Speciali (Opzionale)' : '4. Additional Notes or Special Requests (Optional)'}
                </label>
                <textarea
                  value={mapNotes}
                  onChange={(e) => setMapNotes(e.target.value)}
                  placeholder={language === 'it' ? 'Es: focalizzati principalmente sulle scadenze discusse, oppure mantieni uno schema a stella...' : 'E.g., focus mainly on discussed deadlines, or maintain a star schema...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 dark:border-[#272B30] bg-transparent text-xs text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#761EAF] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMapQuestions(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-[#272B30] text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={generateCustomMapWithAi}
                disabled={isGeneratingMap}
                className="flex-1 py-3 rounded-2xl bg-[#761EAF] hover:bg-[#641896] text-white text-xs font-bold shadow-md shadow-[#761EAF]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingMap ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'it' ? 'Generazione...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-3.5 h-3.5" />
                    <span>{language === 'it' ? 'Genera Mappa' : 'Generate Map'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗺️ FULLSCREEN MIND MAP SCREEN OVERLAY */}
      {showMindMapScreen && conceptMap && (
        <div className="fixed inset-0 z-50 bg-[#F4F5F6] dark:bg-[#0B0D0E] overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#272B30] pb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMindMapScreen(false)}
                  className="p-3 bg-white dark:bg-[#1A1D1F] border border-gray-200 dark:border-[#272B30] rounded-2xl text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                  title={language === 'it' ? 'Torna alla riunione' : 'Back to meeting'}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-[#761EAF]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#761EAF]">Recall MindMap Workbench</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight mt-0.5">
                    {language === 'it' ? `Mappa Concettuale: ${meeting.title}` : `Concept Map: ${meeting.title}`}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={exportMapToGoogleDocs}
                  disabled={isExportingToDoc}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/10 cursor-pointer disabled:opacity-50"
                >
                  {isExportingToDoc ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'it' ? 'Esportazione...' : 'Exporting...'}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>{language === 'it' ? 'Esporta in Google Docs' : 'Export to Google Docs'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMindMapScreen(false);
                    setShowMapQuestions(true);
                  }}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-[#1A1D1F] border border-gray-200 dark:border-[#272B30] hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'it' ? 'Rigenera Mappa' : 'Regenerate Map'}
                </button>
              </div>
            </div>

            {/* Export Success Link Banner */}
            {exportedDocUrl && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-3xl border border-emerald-200 dark:border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {language === 'it' ? 'Documento Google Docs Creato!' : 'Google Docs Document Created!'}
                    </h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {language === 'it' 
                        ? 'La mappa logica è stata formattata e salvata con successo sul tuo Google Drive.' 
                        : 'The logic map has been formatted and successfully saved to your Google Drive.'}
                    </p>
                  </div>
                </div>
                <a
                  href={exportedDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>{language === 'it' ? 'Apri Google Doc' : 'Open Google Doc'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Interactive Concept Map Area */}
            <div className="relative w-full h-[600px] bg-white dark:bg-[#111315] rounded-[32px] shadow-sm border border-gray-200 dark:border-[#272B30] overflow-hidden flex items-center justify-center p-6">
              
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#272b30_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
              
              {/* SVG Links */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {conceptMap.links.map((link, idx) => {
                  const fromNode = conceptMap.nodes.find(n => n.id === link.from);
                  const toNode = conceptMap.nodes.find(n => n.id === link.to);
                  if (!fromNode || !toNode) return null;

                  const getPos = (id: string, index: number) => {
                    if (id === 'central') return { x: 50, y: 50 };
                    const angle = (index * 2 * Math.PI) / (conceptMap.nodes.length - 1);
                    const radius = 35;
                    return {
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    };
                  };

                  const fromIdx = conceptMap.nodes.findIndex(n => n.id === link.from);
                  const toIdx = conceptMap.nodes.findIndex(n => n.id === link.to);
                  const p1 = getPos(link.from, fromIdx);
                  const p2 = getPos(link.to, toIdx);

                  return (
                    <g key={idx}>
                      <line
                        x1={`${p1.x}%`}
                        y1={`${p1.y}%`}
                        x2={`${p2.x}%`}
                        y2={`${p2.y}%`}
                        stroke={fromNode.color || "#761EAF"}
                        strokeWidth="2"
                        strokeDasharray="4 6"
                        className="opacity-40 animate-pulse"
                      />
                      {/* Relationship Badge */}
                      <text
                        x={`${(p1.x + p2.x) / 2}%`}
                        y={`${(p1.y + p2.y) / 2 - 2}%`}
                        className="text-[10px] font-extrabold fill-gray-500 dark:fill-neutral-400"
                        textAnchor="middle"
                      >
                        {link.relation.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* HTML Nodes overlayed on top */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {conceptMap.nodes.map((node, idx) => {
                  const getPos = (id: string, index: number) => {
                    if (id === 'central') return { x: 50, y: 50 };
                    const angle = (index * 2 * Math.PI) / (conceptMap.nodes.length - 1);
                    const radius = 35;
                    return {
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    };
                  };

                  const pos = getPos(node.id, idx);

                  return (
                    <div
                      key={node.id}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute pointer-events-auto"
                    >
                      <div
                        className={`p-4 rounded-[20px] text-center shadow-lg border max-w-[160px] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex flex-col justify-center items-center ${
                          node.type === 'central'
                            ? 'bg-[#761EAF] border-transparent text-white ring-4 ring-[#761EAF]/25'
                            : node.type === 'topic'
                            ? 'bg-blue-600 dark:bg-blue-700 border-transparent text-white ring-2 ring-blue-500/15'
                            : 'bg-emerald-600 dark:bg-emerald-700 border-transparent text-white ring-2 ring-emerald-500/15'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-80 block mb-1">
                          {node.type === 'central' ? 'Central Focus' : node.type === 'topic' ? (language === 'it' ? 'Argomento' : 'Topic') : (language === 'it' ? 'Decisione' : 'Decision')}
                        </span>
                        <span className="text-xs font-bold leading-snug">
                          {node.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowMindMapScreen(false)}
                className="px-6 py-3 border border-gray-200 dark:border-[#272B30] rounded-2xl hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-bold text-gray-700 dark:text-white transition-all cursor-pointer"
              >
                {language === 'it' ? 'Torna ai dettagli riunione' : 'Back to meeting details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
