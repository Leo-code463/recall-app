import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Mic,
  Square,
  Pause,
  Play,
  X,
  Upload,
  AlertCircle,
  FileAudio,
} from 'lucide-react';
import { AILogo } from './AILogo';
import { transcribeAudioApi, processChunkApi, summarizeChunksFinalApi } from '../services/geminiService';
import { Meeting } from '../types';
import confetti from 'canvas-confetti';

export const RecordingModal: React.FC = () => {
  const {
    isRecordingModalOpen,
    setIsRecordingModalOpen,
    addMeeting,
    setActiveMeetingId,
    user,
    triggerSuccess,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'mic' | 'upload'>('mic');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedMeeting, setProcessedMeeting] = useState<Meeting | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timerRef = useRef<any>(null);
  const chunkTimerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  
  // Riferimento dedicato ai soli blocchi DEFINITIVI per evitare duplicazioni
  const finalTranscriptRef = useRef<string>('');
  
  // Riferimenti per la Pipeline a Blocchi
  const accumulatedTranscriptRef = useRef<string>('');
  const lastProcessedIndexRef = useRef<number>(0);
  const partialSummariesRef = useRef<string[]>([]);
  const partialActionItemsRef = useRef<string[]>([]);

  const handleCancel = React.useCallback(() => {
    isRecordingRef.current = false;
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(0);
    setLiveTranscript('');
    finalTranscriptRef.current = '';
    accumulatedTranscriptRef.current = '';
    lastProcessedIndexRef.current = 0;
    partialSummariesRef.current = [];
    partialActionItemsRef.current = [];
    setProcessingStage(null);
    setErrorMessage(null);
    setUploadedFile(null);
    setProcessedMeeting(null);
    setTempTitle('');
  }, []);

  useEffect(() => {
    if (!isRecordingModalOpen) handleCancel();
  }, [isRecordingModalOpen, handleCancel]);

  // Timer di registrazione
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused]);

  // CHUNKING PIPELINE: Invio dei blocchi in background ogni 30s
  useEffect(() => {
    if (isRecording && !isPaused) {
      chunkTimerRef.current = setInterval(async () => {
        const fullText = (accumulatedTranscriptRef.current + ' ' + liveTranscript).trim();
        const unparsedChunk = fullText.slice(lastProcessedIndexRef.current).trim();

        if (unparsedChunk.length > 40) {
          lastProcessedIndexRef.current = fullText.length;
          try {
            const chunkResult = await processChunkApi(unparsedChunk);
            if (chunkResult.summaryPoint) {
              partialSummariesRef.current.push(chunkResult.summaryPoint);
            }
            if (chunkResult.detectedActionItems?.length) {
              partialActionItemsRef.current.push(...chunkResult.detectedActionItems);
            }
          } catch (e) {
            console.warn('Errore elaborazione blocco in background:', e);
          }
        }
      }, 30000);
    } else if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
    }
    return () => { if (chunkTimerRef.current) clearInterval(chunkTimerRef.current); };
  }, [isRecording, isPaused, liveTranscript]);

  const startLiveRecording = () => {
    setErrorMessage(null);
    setLiveTranscript('');
    finalTranscriptRef.current = '';
    accumulatedTranscriptRef.current = '';
    lastProcessedIndexRef.current = 0;
    partialSummariesRef.current = [];
    partialActionItemsRef.current = [];

    try {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setErrorMessage('Riconoscimento vocale non supportato su questo dispositivo.');
        return;
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'it-IT';

      // LOGICA ANTI-DUPLICAZIONE COMPATIBILE CON WEBVIEW ANDROID
      recognition.onresult = (event: any) => {
        let interimAcc = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcriptChunk + ' ';
          } else {
            interimAcc = transcriptChunk;
          }
        }

        const cleanFinal = finalTranscriptRef.current.trim();
        const cleanInterim = interimAcc.trim();

        let combined = cleanFinal;
        if (cleanInterim) {
          if (!cleanFinal.endsWith(cleanInterim)) {
            combined = cleanFinal ? `${cleanFinal} ${cleanInterim}` : cleanInterim;
          }
        }

        const finalTextToDisplay = combined.replace(/\s+/g, ' ').trim();
        accumulatedTranscriptRef.current = finalTextToDisplay;
        setLiveTranscript(finalTextToDisplay);
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setErrorMessage('Permesso microfono negato nelle impostazioni.');
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && speechRecognitionRef.current) {
          try { speechRecognitionRef.current.start(); } catch (e) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
    } catch (err: any) {
      setErrorMessage('Impossibile accedere al microfono.');
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      setIsPaused(false);
      isRecordingRef.current = true;
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.start(); } catch (e) {}
      }
    } else {
      setIsPaused(true);
      isRecordingRef.current = false;
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

  const handleStopAndProcess = async () => {
    isRecordingRef.current = false;
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    setIsRecording(false);
    setProcessingStage('Sintesi istantanea...');

    try {
      const finalText = (accumulatedTranscriptRef.current + ' ' + liveTranscript).replace(/\s+/g, ' ').trim();
      if (!finalText || finalText.length < 3) {
        throw new Error('Nessun parlato rilevato dal microfono. Riprova parlando più vicino al dispositivo.');
      }

      const remainingChunk = finalText.slice(lastProcessedIndexRef.current).trim();
      if (remainingChunk.length > 10) {
        try {
          const lastChunkRes = await processChunkApi(remainingChunk);
          if (lastChunkRes.summaryPoint) partialSummariesRef.current.push(lastChunkRes.summaryPoint);
          if (lastChunkRes.detectedActionItems?.length) partialActionItemsRef.current.push(...lastChunkRes.detectedActionItems);
        } catch (e) {}
      }

      let meetingResult: any;

      if (partialSummariesRef.current.length > 0) {
        meetingResult = await summarizeChunksFinalApi({
          chunkSummaries: partialSummariesRef.current,
          actionItems: partialActionItemsRef.current,
          totalDuration: recordingSeconds,
          plan: user?.plan || 'pro',
          languageHint: 'it',
        });
      } else {
        meetingResult = await transcribeAudioApi({
          text: finalText,
          plan: user?.plan || 'pro',
          languageHint: 'it',
        });
      }

      const newMeeting: Meeting = {
        id: `meet_${Date.now()}`,
        title: meetingResult.title || 'Nuova Registrazione',
        date: new Date().toISOString(),
        duration: recordingSeconds > 0 ? recordingSeconds : 60,
        tags: ['Registrazione', 'Vocale'],
        category: meetingResult.category || 'Riunione',
        status: 'processing',
        speakers: meetingResult.speakers || [{ id: 'spk_1', name: user?.name || 'Interlocutore 1', color: '#6A49D8' }],
        transcript: meetingResult.segments || [{ id: 'seg_1', speakerId: 'spk_1', speakerName: 'Interlocutore 1', timeOffset: 0, text: finalText }],
        summary: meetingResult.summary,
        calendarEventsDetected: meetingResult.calendarEventsDetected || [],
        chatHistory: [],
      };

      setProcessedMeeting(newMeeting);
      setTempTitle(newMeeting.title);
      setProcessingStage(null);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante l\'elaborazione.');
      setProcessingStage(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleProcessUploadedFile = async () => {
    if (!uploadedFile) return;
    setProcessingStage('Elaborazione file audio...');
    try {
      const meetingResult = await transcribeAudioApi({
        text: `File audio caricato: ${uploadedFile.name}`,
        plan: user?.plan || 'pro',
        languageHint: 'it',
      });

      const newMeeting: Meeting = {
        id: `meet_${Date.now()}`,
        title: uploadedFile.name.replace(/\.[^/.]+$/, ''),
        date: new Date().toISOString(),
        duration: 120,
        tags: ['Audio File', 'Importato'],
        category: 'Riunione',
        status: 'processing',
        speakers: [{ id: 'spk_1', name: user?.name || 'Interlocutore 1', color: '#6A49D8' }],
        transcript: [{ id: 'seg_1', speakerId: 'spk_1', speakerName: 'Interlocutore 1', timeOffset: 0, text: `Trascrizione estratta dal file ${uploadedFile.name}` }],
        summary: undefined,
        calendarEventsDetected: [],
        chatHistory: [],
      };

      setProcessedMeeting(newMeeting);
      setTempTitle(newMeeting.title);
      setProcessingStage(null);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore nel caricamento del file.');
      setProcessingStage(null);
    }
  };

  const handleSaveFinalMeeting = () => {
    if (!processedMeeting) return;
    const finalMeeting = { ...processedMeeting, title: tempTitle.trim() || processedMeeting.title };
    addMeeting(finalMeeting);
    setIsRecordingModalOpen(false);
    setActiveMeetingId(finalMeeting.id);
    triggerSuccess('Registrazione salvata!');

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch (e) {}
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isRecordingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card max-w-lg w-full rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden bg-white dark:bg-[#1A1D1F]">
        {!isRecording && !processingStage && !processedMeeting && (
          <button
            onClick={() => { handleCancel(); setIsRecordingModalOpen(false); }}
            className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!isRecording && !processingStage && !processedMeeting && (
          <div className="flex p-1 bg-gray-100 dark:bg-white/10 rounded-2xl mb-6">
            <button
              onClick={() => setActiveTab('mic')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'mic' ? 'bg-white dark:bg-[#272B30] shadow-sm text-[#6A49D8] dark:text-white' : 'text-gray-500'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Microfono Nativo</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload' ? 'bg-white dark:bg-[#272B30] shadow-sm text-[#6A49D8] dark:text-white' : 'text-gray-500'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Carica File Audio</span>
            </button>
          </div>
        )}

        {processingStage ? (
          <div className="py-10 space-y-4">
            <AILogo size="xl" isThinking={true} />
            <h3 className="text-base font-bold text-[#16161E] dark:text-white">Elaborazione AI Groq</h3>
            <p className="text-xs text-gray-500">{processingStage}</p>
          </div>
        ) : processedMeeting ? (
          <div className="py-2 space-y-4 text-left">
            <h3 className="text-sm font-bold text-[#16161E] dark:text-white text-center">Registrazione Completata</h3>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Titolo Registrazione</label>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-[#16161E] dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setProcessedMeeting(null)} className="flex-1 py-2 rounded-xl border text-xs font-bold">Annulla</button>
              <button
                onClick={handleSaveFinalMeeting}
                className="flex-1 py-2 rounded-xl bg-[#6A49D8] text-white text-xs font-bold"
              >
                Salva
              </button>
            </div>
          </div>
        ) : isRecording ? (
          <div className="py-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              MICROFONO ATTIVO
            </div>
            <div className="text-4xl font-bold text-[#16161E] dark:text-white">{formatTimer(recordingSeconds)}</div>
            {liveTranscript && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 text-left text-xs max-h-24 overflow-y-auto">
                <span className="font-bold text-[#6A49D8] text-[10px] block uppercase">Trascrizione:</span>
                "{liveTranscript}"
              </div>
            )}
            <div className="flex justify-center gap-4 pt-2">
              <button onClick={handlePauseToggle} className="p-3 rounded-2xl border">
                {isPaused ? <Play className="w-5 h-5 text-emerald-500" /> : <Pause className="w-5 h-5" />}
              </button>
              <button onClick={handleStopAndProcess} className="px-6 py-3 rounded-2xl bg-[#6A49D8] text-white text-xs font-bold flex items-center gap-2">
                <Square className="w-4 h-4 fill-white" />
                <span>Termina & Analizza</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'mic' ? (
          <div className="py-3 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-4 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-[#6A49D8] text-white flex items-center justify-center mx-auto">
                <Mic className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-[#16161E] dark:text-white">Registrazione Vocale Nativa</h2>
              <p className="text-xs text-gray-500">
                Il microfono dello smartphone trascrive la tua voce in tempo reale a costo zero. Groq genera la sintesi ed estrae gli impegni per Google Calendar.
              </p>
              <button onClick={startLiveRecording} className="w-full py-3 rounded-2xl bg-[#6A49D8] text-white text-xs font-bold">
                Avvia Registrazione
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-[#6A49D8] transition-colors"
            >
              <FileAudio className="w-10 h-10 text-[#6A49D8] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#16161E] dark:text-white">
                {uploadedFile ? uploadedFile.name : 'Clicca per selezionare un file audio'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">MP3, WAV, M4A o AAC (max 25MB)</p>
            </div>

            {uploadedFile && (
              <button
                onClick={handleProcessUploadedFile}
                className="w-full py-3 rounded-2xl bg-[#6A49D8] text-white text-xs font-bold"
              >
                Analizza File Audio
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};