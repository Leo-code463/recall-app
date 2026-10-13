# Recall: trascrizione precisa con Groq (whisper-large-v3) + limite per utente

## Cosa cambia
- L'audio registrato viene inviato al backend (`POST /api/transcribe-audio`), che lo inoltra a **Groq Whisper large-v3**
  e restituisce solo il testo. Molto più preciso di Whisper tiny/base sul telefono, e più veloce.
- Ogni utente ha un limite giornaliero di trascrizione (default **60 minuti al giorno**). Il consumo è contato
  sull'utente autenticato (uid Firebase), non su dati falsificabili dal client.
- `RecordingModal.tsx` NON cambia: `whisperService.ts` mantiene la stessa interfaccia di prima.
- Nessuna nuova dipendenza: niente `npm install`.

## File dello zip (da sovrascrivere nella root del progetto)
- server.ts
- src/services/whisperService.ts
- LEGGIMI.md

## 1. Creare la chiave API Groq (gratis, senza carta)
1. Vai su https://console.groq.com e registrati (Google, GitHub o email).
2. Apri https://console.groq.com/keys e clicca **Create API Key**.
3. Dai un nome (es. `recall`) e copia la chiave (inizia con `gsk_`): viene mostrata UNA sola volta.
4. Non incollarla in chat né nel codice.

## 2. Impostarla su Render (Dashboard > servizio > Environment)
- Aggiungi `GROQ_API_KEY` = la chiave Groq.
- Se `OLLAMA_BASE_URL` punta già a Groq (`https://api.groq.com/openai/v1`) e hai già `OLLAMA_API_KEY`,
  il server la riusa in automatico: in quel caso non serve aggiungere nulla.
- Variabili opzionali:
  - `TRANSCRIBE_DAILY_LIMIT_SEC` (default 3600 = 60 minuti per utente al giorno)
  - `GROQ_WHISPER_MODEL` (default `whisper-large-v3`; `whisper-large-v3-turbo` è più veloce ma meno preciso)

## 3. Build e deploy (terminale nella cartella del progetto)
1. Estrai lo zip e sovrascrivi i file.
2. `npm run build`
3. `npx cap sync android` poi ricompila l'APK da Android Studio (il client è cambiato).
4. `git add server.ts src/services/whisperService.ts LEGGIMI.md`
   `git commit -m "Trascrizione con Groq e limite per utente"`
   `git push`
   (Render rifà il deploy da solo.)

## 4. Controllo
Dopo il deploy fai una registrazione breve. Nei Logs di Render, se qualcosa non va, compaiono righe `[transcribe-audio] ...`.

## Se la build segnala un errore su `API_BASE`
`whisperService.ts` importa `API_BASE` da `../config`. Se nel tuo progetto l'indirizzo del backend si prende in un altro modo,
apri `src/services/geminiService.ts`, guarda come costruisce l'indirizzo delle chiamate a `/api/...` e copia la stessa
riga di import in `whisperService.ts` al posto di `import { API_BASE } from '../config';`.

## Pulizia opzionale (non più usati)
- `src/workers/whisper.worker.ts`
- la dipendenza `@huggingface/transformers` (`npm uninstall @huggingface/transformers`)

## Limiti e note
- **Limiti Groq gratuiti (per tutta l'app, non per utente)**: circa 8 ore di audio al giorno, 2 ore all'ora, 20 richieste al minuto,
  25 MB per file. Se vengono superati, l'utente vede "servizio molto richiesto, riprova tra qualche minuto".
  Passando al piano Developer a pagamento i limiti salgono molto.
- File audio oltre ~23 MB: il telefono li divide automaticamente in pezzi da 10 minuti.
- Il limite per utente si controlla all'inizio di ogni richiesta e si addebita la durata reale riportata da Groq:
  l'ultima registrazione della giornata può superare di poco il limite, poi le richieste successive vengono rifiutate.
- Il contatore è in memoria: si azzera a ogni riavvio o deploy di Render (e dopo l'inattività del piano gratuito).
  Per un conteggio permanente andrà salvato in un database.
- **Privacy**: ora l'audio lascia il telefono (va al tuo server e a Groq). Se in app, nell'informativa o nei testi
  c'è scritto che l'audio resta sul dispositivo, va aggiornato.
