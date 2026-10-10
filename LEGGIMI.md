# Recall: IA senza PC acceso e senza chiavi Gemini a pagamento

## Cosa cambia
- **Audio**: viene trascritto SUL TELEFONO con Whisper (Transformers.js). Al server arriva solo testo.
- **IA di testo**: il server usa un servizio compatibile OpenAI (consigliato: Groq, piano gratuito).
- `src/services/audioRecorder.ts` NON cambia.

## File dello zip (da sovrascrivere nella root del progetto)
- server.ts
- vite.config.ts
- src/components/RecordingModal.tsx
- src/services/geminiService.ts
- src/services/whisperService.ts   (nuovo)
- src/workers/whisper.worker.ts    (nuovo)

## Passi
1. Estrai lo zip nella root del progetto e sovrascrivi.
2. Nel terminale del progetto:
   npm install @huggingface/transformers@3
   npm uninstall @google/genai
3. Su Render > Environment imposta (la chiave la crei su console.groq.com, senza carta):
   OLLAMA_BASE_URL=https://api.groq.com/openai/v1
   OLLAMA_API_KEY=<la tua chiave Groq>
   OLLAMA_MODEL=llama-3.3-70b-versatile
   OLLAMA_FALLBACK_MODELS=llama-3.1-8b-instant
   (puoi rimuovere GEMINI_API_KEY)
4. Build e sincronizzazione:
   npm run build
   npx cap sync android
   poi ricompila l'APK da Android Studio.
5. Rifai il deploy del backend su Render.

## Note
- Prima trascrizione: serve internet per scaricare il modello Whisper (circa 100 MB); poi resta in cache sul telefono.
- Per più velocità (meno precisione in italiano): in whisperService.ts cambia WHISPER_MODEL in 'Xenova/whisper-tiny'.
- Se vedi errori di limite (429) con trascrizioni lunghe: abbassa MAX_TRANSCRIPT_CHARS su Render (es. 12000).
