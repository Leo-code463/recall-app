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
  CheckCircle2,
  FileAudio,
  Loader2,
  Volume2,
} from 'lucide-react';
import { AILogo } from './AILogo';
import { AudioRecorderService } from '../services/audioRecorder';
import {
  processMeetingFastApi,
  transcribeAudioApi,
  summarizeMeetingApi,
  detectCalendarEventsApi,
} from '../services/geminiService';
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

  const [activeMode, setActiveMode] = useState<'mic' | 'upload'>('mic');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedMeeting, setProcessedMeeting] = useState<Meeting | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recorderRef = useRef<AudioRecorderService | null>(null);
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  const handleCancel = React.useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancelRecording();
      recorderRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(0);
    setLiveTranscript('');
    setProcessingStage(null);
    setErrorMessage(null);
    setUploadedFile(null);
    setProcessedMeeting(null);
    setTempTitle('');
  }, []);

  useEffect(() => {
    if (!isRecordingModalOpen) {
      handleCancel();
    }
  }, [isRecordingModalOpen, handleCancel]);

  // Timer tick
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Setup Web Speech API for real-time live caption preview
  const initSpeechRecognition = () => {
    try {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'it-IT';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(currentText.trim());
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }
    } catch (e) {
      console.warn('Web Speech Recognition not supported in this browser', e);
    }
  };

  const startLiveRecording = async () => {
    setErrorMessage(null);
    setLiveTranscript('');
    try {
      recorderRef.current = new AudioRecorderService();
      await recorderRef.current.startRecording((level) => {
        setAudioLevel(Math.min(level * 2.5, 1));
      });
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      // Start live transcription preview
      initSpeechRecognition();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        'Impossibile accedere al microfono. Verifica i permessi nel browser oppure carica direttamente un file audio.'
      );
    }
  };

  const handlePauseToggle = () => {
    if (!recorderRef.current) return;
    if (isPaused) {
      recorderRef.current.resumeRecording();
      setIsPaused(false);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {}
      }
    } else {
      recorderRef.current.pauseRecording();
      setIsPaused(true);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  const handleStopAndProcess = async () => {
    if (!recorderRef.current) return;
    setProcessingStage('Trascrizione della registrazione in corso...');

    try {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }

      const { base64, mimeType } = await recorderRef.current.stopRecording();
      setIsRecording(false);

      // Call ultra-fast transcription only API
      const meetingResult = await transcribeAudioApi({
        audioBase64: base64,
        mimeType,
        liveTranscript,
        plan: user?.plan || 'pro',
        languageHint: 'it',
      });

      // Create raw meeting record without AI summary (set status to processing for lazy generation)
      const newMeeting: Meeting = {
        id: `meet_${Date.now()}`,
        title: meetingResult.title || 'Nuova Registrazione',
        date: new Date().toISOString(),
        duration: recordingSeconds > 0 ? recordingSeconds : 60,
        tags: ['Registrazione', 'Da Elaborare'],
        category: meetingResult.category || 'Riunione',
        status: 'processing', // This triggers the lazy AI load on detail view
        speakers: meetingResult.speakers && meetingResult.speakers.length > 0
          ? meetingResult.speakers
          : [{ id: 'spk_1', name: user?.name || 'Interlocutore 1', color: '#761EAF' }],
        transcript: meetingResult.segments || [],
        summary: undefined,
        calendarEventsDetected: [],
        chatHistory: [],
        audioUrl: base64,
      };

      setProcessedMeeting(newMeeting);
      setTempTitle(newMeeting.title);
      setProcessingStage(null);
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(
        err.message || 'Si è verificato un errore durante la trascrizione audio.'
      );
      setProcessingStage(null);
    }
  };

  // Handle Audio File Upload and Processing
  const handleProcessUploadedFile = async () => {
    if (!uploadedFile) return;

    setProcessingStage('Trascrizione traccia audio in corso...');
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string) || '';
          const mimeType = uploadedFile.type || 'audio/mp3';

          const meetingResult = await transcribeAudioApi({
            audioBase64: base64,
            mimeType,
            plan: user?.plan || 'pro',
            languageHint: 'it',
          });

          const newMeeting: Meeting = {
            id: `meet_${Date.now()}`,
            title: meetingResult.title || uploadedFile.name.replace(/\.[^/.]+$/, ''),
            date: new Date().toISOString(),
            duration: 300, // estimated
            tags: ['File Audio', 'Da Elaborare'],
            category: meetingResult.category || 'Riunione',
            status: 'processing', // This triggers the lazy AI load on detail view
            speakers: meetingResult.speakers || [
              { id: 'spk_1', name: user?.name || 'Interlocutore 1', color: '#761EAF' },
            ],
            transcript: meetingResult.segments || [],
            summary: undefined,
            calendarEventsDetected: [],
            chatHistory: [],
            audioUrl: base64,
          };

          setProcessedMeeting(newMeeting);
          setTempTitle(newMeeting.title);
          setProcessingStage(null);
        } catch (innerErr: any) {
          console.error(innerErr);
          setErrorMessage(innerErr.message || 'Errore durante la trascrizione del file audio.');
          setProcessingStage(null);
        }
      };

      reader.onerror = () => {
        setErrorMessage('Impossibile leggere il file audio selezionato.');
        setProcessingStage(null);
      };

      reader.readAsDataURL(uploadedFile);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Errore durante il caricamento del file.');
      setProcessingStage(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(file.name)) {
        setUploadedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage('Seleziona un file audio valido (MP3, WAV, M4A, WEBM, OGG, AAC).');
      }
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isRecordingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1D1F] max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-200 dark:border-[#272B30] text-center relative overflow-hidden">
        {/* Close Button: Solo all'inizio (Ready State) in alto a destra */}
        {!isRecording && !processingStage && !processedMeeting && (
          <button
            id="recording-modal-close-btn"
            onClick={() => {
              handleCancel();
              setIsRecordingModalOpen(false);
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Processing State */}
        {processingStage ? (
          <div className="py-12 space-y-5 animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-[#761EAF]/10 dark:bg-[#761EAF]/20 flex items-center justify-center mx-auto shadow-inner">
              <AILogo size="xl" isThinking={true} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#1A1A1A] dark:text-white">
                Elaborazione AI
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400 max-w-xs mx-auto font-medium">
                {processingStage}
              </p>
            </div>
            {/* Smoothly scrolling indeterminate progress bar */}
            <div className="w-48 mx-auto bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden relative">
              <div className="bg-[#761EAF] h-full rounded-full absolute top-0 left-0 animate-progress" />
            </div>
          </div>
        ) : processedMeeting ? (
          /* Save Confirmation Preview State */
          <div className="py-2 space-y-4 animate-in fade-in duration-200 text-left">
            
            <div className="text-center">
              <h3 className="text-sm font-black text-[#1A1A1A] dark:text-white">
                Registrazione completata!
              </h3>
              <p className="mt-0.5 text-[10.5px] text-gray-500 dark:text-neutral-400 font-medium">
                La trascrizione è pronta. Dai un titolo per salvare la registrazione.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                  Titolo Registrazione
                </label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#272B30] bg-transparent text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#761EAF]"
                  placeholder="Es. Riunione del lunedì"
                />
              </div>

              {/* Scrollable preview of transcription */}
              {processedMeeting.transcript && processedMeeting.transcript.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-extrabold text-gray-400 dark:text-neutral-500 uppercase tracking-wider">
                    Anteprima Trascrizione
                  </span>
                  <div className="max-h-20 overflow-y-auto p-2 bg-[#F8F9FD] dark:bg-[#111315] border border-gray-100 dark:border-[#272B30] rounded-lg text-[10.5px] text-gray-600 dark:text-neutral-400 font-medium leading-relaxed">
                    {processedMeeting.transcript.slice(0, 3).map((seg) => (
                      <p key={seg.id} className="mb-1">
                        <strong className="text-[#761EAF]">{seg.speakerName}:</strong> {seg.text}
                      </p>
                    ))}
                    {processedMeeting.transcript.length > 3 && (
                      <p className="text-[9.5px] text-gray-400 italic">...e altre {processedMeeting.transcript.length - 3} frasi</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-[#F8F9FD] dark:bg-[#111315] p-2.5 rounded-xl border border-gray-100 dark:border-[#272B30]">
                <div>
                  <label htmlFor="modal-category-select" className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Categoria</label>
                  <select
                    id="modal-category-select"
                    value={processedMeeting.category || 'Riunione'}
                    onChange={(e) => {
                      setProcessedMeeting({
                        ...processedMeeting,
                        category: e.target.value as any,
                      });
                    }}
                    className="w-full bg-transparent text-[11px] font-black text-[#1A1A1A] dark:text-white border-none p-0 focus:outline-none focus:ring-0 cursor-pointer outline-none hover:text-[#761EAF] transition-colors"
                  >
                    <option value="Riunione" className="bg-white dark:bg-[#1A1D1F] text-black dark:text-white">Riunione</option>
                    <option value="Chiamata" className="bg-white dark:bg-[#1A1D1F] text-black dark:text-white">Chiamata</option>
                    <option value="Lezione" className="bg-white dark:bg-[#1A1D1F] text-black dark:text-white">Lezione/Corso</option>
                    <option value="Intervista" className="bg-white dark:bg-[#1A1D1F] text-black dark:text-white">Intervista</option>
                    <option value="Nota Personale" className="bg-white dark:bg-[#1A1D1F] text-black dark:text-white">Nota Personale</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Durata</span>
                  <span className="text-[11px] font-black text-[#1A1A1A] dark:text-white">
                    {Math.floor(processedMeeting.duration / 60)}m {processedMeeting.duration % 60}s
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setProcessedMeeting(null);
                  setTempTitle('');
                }}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#272B30] hover:bg-gray-100 dark:hover:bg-neutral-800 text-[11px] font-bold text-[#1A1A1A] dark:text-white transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalMeeting = {
                    ...processedMeeting,
                    title: tempTitle.trim() || processedMeeting.title,
                  };
                  addMeeting(finalMeeting);
                  setIsRecordingModalOpen(false);
                  setActiveMeetingId(finalMeeting.id);
                  setProcessedMeeting(null);
                  setTempTitle('');
                  triggerSuccess('Registrazione salvata con successo!');
                  try {
                    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                  } catch (e) {}
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer"
              >
                Salva Registrazione
              </button>
            </div>
          </div>
        ) : isRecording ? (
          /* Active Live Recording State */
          <div className="py-6 space-y-6 animate-in fade-in duration-200">
            {/* Live Indicator */}
            <div 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-extrabold shadow-2xs"
              style={{ fontSize: '12px' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              {isPaused ? 'REGISTRAZIONE IN PAUSA' : 'MICROFONO ATTIVO • REGISTRAZIONE'}
            </div>

            {/* Timer */}
            <div 
              className="text-[#1A1A1A] dark:text-white tracking-wider"
              style={{ fontFamily: 'Inter', fontWeight: 'bold', fontSize: '47px' }}
            >
              {formatTimer(recordingSeconds)}
            </div>

            {/* Animated Waveform Visualizer */}
            <div className="h-16 flex items-center justify-center gap-1 sm:gap-1.5 px-6">
              {[...Array(24)].map((_, i) => {
                const height = isPaused
                  ? 8
                  : Math.max(8, Math.sin((i + recordingSeconds * 4) * 0.5) * 35 * (audioLevel + 0.35));
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-[#761EAF] transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Live Captions Preview Box */}
            {liveTranscript && (
              <div className="p-3.5 rounded-2xl bg-[#F8F9FD] dark:bg-[#111315] border border-gray-200 dark:border-[#272B30] text-left text-xs text-gray-700 dark:text-neutral-300 max-h-24 overflow-y-auto leading-relaxed">
                <span className="font-bold text-[#761EAF] text-[10px] block uppercase tracking-wider mb-1">
                  Anteprima Parlato in Tempo Reale:
                </span>
                "{liveTranscript}"
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                id="recording-pause-btn"
                type="button"
                onClick={handlePauseToggle}
                className="p-3.5 rounded-2xl border border-gray-200 dark:border-[#272B30] hover:bg-gray-100 dark:hover:bg-neutral-800 text-[#1A1A1A] dark:text-white transition-all cursor-pointer shadow-2xs"
                title={isPaused ? 'Riprendi' : 'Metti in pausa'}
              >
                {isPaused ? <Play className="w-5 h-5 text-emerald-500 fill-emerald-500" /> : <Pause className="w-5 h-5" />}
              </button>

              <button
                id="stop-and-save-recording-btn"
                type="button"
                onClick={handleStopAndProcess}
                className="px-6 py-3.5 rounded-2xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#761EAF]/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span style={{ fontSize: '13px' }}>Termina & Analizza con Gemini AI</span>
              </button>
            </div>
          </div>
        ) : (
          /* Ready State: Choose Mic or Upload File */
          <div className="py-3 space-y-5">
            {/* Mode Switcher */}
            <div className="flex bg-[#F8F9FD] dark:bg-[#111315] p-1 rounded-2xl border border-gray-200/80 dark:border-[#272B30]">
              <button
                type="button"
                onClick={() => setActiveMode('mic')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'mic'
                    ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Microfono dal Vivo</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'upload'
                    ? 'bg-white dark:bg-[#1A1D1F] text-[#761EAF] shadow-xs'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carica File Audio</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {activeMode === 'mic' ? (
              /* Live Mic Option */
              <div className="space-y-5 pt-2">
                <div className="w-16 h-16 rounded-3xl bg-[#761EAF] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#761EAF]/25">
                  <Mic className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-[#1A1A1A] dark:text-white">
                    Registra Riunione con Microfono
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400 max-w-sm mx-auto font-medium">
                    Parla o registra l'incontro dal vivo. Gemini AI trascriverà ogni frase, separerà gli interlocutori ed estrarrà impegni per Google Calendar.
                  </p>
                </div>

                <button
                  id="start-live-mic-btn"
                  type="button"
                  onClick={startLiveRecording}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-md shadow-[#761EAF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Mic className="w-4 h-4" />
                  <span>Avvia Registrazione Audio</span>
                </button>
              </div>
            ) : (
              /* Audio File Upload Option */
              <div className="space-y-4 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedFile(e.target.files[0]);
                      setErrorMessage(null);
                    }
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-[#761EAF] bg-[#761EAF]/5'
                      : uploadedFile
                      ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-gray-200 dark:border-[#272B30] hover:border-[#761EAF] bg-[#F8F9FD] dark:bg-[#111315]'
                  }`}
                >
                  {uploadedFile ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-[#1A1A1A] dark:text-white truncate max-w-[260px]">
                        {uploadedFile.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Clicca per cambiare file
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#761EAF]/10 text-[#761EAF] flex items-center justify-center">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                        Trascina qui il file audio o fai clic per selezionare
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Supporta MP3, WAV, M4A, WEBM, OGG, AAC (fino a 50MB)
                      </p>
                    </>
                  )}
                </div>

                <button
                  id="process-uploaded-audio-btn"
                  type="button"
                  disabled={!uploadedFile}
                  onClick={handleProcessUploadedFile}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#761EAF] hover:bg-[#681898] text-white text-xs font-bold shadow-md shadow-[#761EAF]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AILogo size="sm" />
                  <span>Trascrivi & Analizza File con AI</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
