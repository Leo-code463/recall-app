export interface TranslationDict {
  // Navigation / Tabs
  home: string;
  search: string;
  agenda: string;
  profile: string;
  settings: string;
  back: string;
  logout: string;
  add: string;

  // Settings Modal
  appearance: string;
  darkTheme: string;
  enabled: string;
  disabled: string;
  account: string;
  editProfile: string;
  profileSubtitle: string;
  friendsAndCollaboration: string;
  friendsSubtitle: string;
  passwordAndAccess: string;
  language: string;
  notifications: string;
  pushNotifications: string;
  pushSubtitle: string;
  emailSummary: string;
  emailSubtitle: string;
  integrations: string;
  syncTasksEvents: string;
  connected: string;
  notConnected: string;
  recordCalls: string;
  privacyAndSecurity: string;
  dataManagement: string;
  dataManagementSubtitle: string;
  version: string;

  // Navbar and Tooltips
  searchConversations: string;
  viewNotificationsAndFriends: string;
  viewProfileAndSettings: string;
  logoutTooltip: string;

  // Dashboard
  goodMorning: string;
  welcomeBack: string;
  nextMeeting: string;
  ongoing: string;
  todayAgenda: string;
  tasksToProgram: string;
  addManually: string;
  addTaskPlaceholder: string;
  save: string;
  cancel: string;
  analyzingWithAi: string;
  noTasksToday: string;
  recentMeetings: string;
  noMeetingsRecorded: string;
  recordNewMeeting: string;
  syncCalendar: string;
  friendRequestsPending: string;
  viewRequests: string;
  minutesRecordedShort: string;
  summariesUsedShort: string;
  chatsUsedShort: string;
  
  // Dashboard additions
  join: string;
  record: string;
  recentDiscussions: string;
  viewAll: string;
  todayTasksTitle: string;
  addTask: string;
  whatNeedToDo: string;
  locale: string;
  scan: string;
  scanSub: string;
  scanning: string;
  inMinutes: string;
  inHours: string;
  inHour: string;

  // Friends & Add Friend Modal
  friendsTitle: string;
  inviteFriends: string;
  addFriendPlaceholder: string;
  sendRequest: string;
  requestSent: string;
  pendingRequests: string;
  receivedRequests: string;
  myFriends: string;
  noFriendsYet: string;
  noPendingRequests: string;
  accept: string;
  reject: string;
  invitationEmailSent: string;
  invitationStatusPending: string;
  creditsEarned: string;
  rateLimitError: string;
  invalidEmailError: string;
  friendRequestAcceptedNotif: string;
  friendRequestReceivedNotif: string;

  // Notifications Panel / Center
  notificationsCenter: string;
  markAllRead: string;
  noNotifications: string;

  // Meeting Detail View
  meetingDetails: string;
  transcript: string;
  summary: string;
  topics: string;
  decisions: string;
  actionItems: string;
  askAiAboutMeeting: string;
  askAiPlaceholder: string;
  aiThinking: string;
  sentiment: string;
  positive: string;
  neutral: string;
  constructive: string;
  duration: string;
  tags: string;
  detectedEvents: string;
  addToCalendar: string;
  addedToCalendar: string;
  conceptMap: string;
  createGoogleDoc: string;
  openingGoogleDoc: string;

  // Search Screen Additional Strings
  deleteLabel: string;
  oneSpeaker: string;
  multipleSpeakers: string;
  seeSummary: string;
  searchTitle: string;
  searchBarPlaceholder: string;
  clearBtn: string;
  filterLabel: string;
  discussionsFound: string;
  noRecordings: string;
  noRecordingsDesc: string;
  startFirstRecording: string;
  noSearchMatch: string;
  noSearchMatchDesc: string;
  showAllRecordings: string;

  // Friends Additional Strings
  friendsAndCollaborationViewTitle: string;
  friendsAndCollaborationViewSubtitle: string;
  addFriendBtn: string;
  noFriendsAdded: string;
  noFriendsAddedDesc: string;
  sendFirstInvite: string;
  futureCreditsInfo: string;
  futureCreditsTooltip: string;
  referralProgramTitle: string;
  referralProgramDesc: string;

  // Add Friend Modal Additional Strings
  addFriendModalTitle: string;
  referralAndCollaborationLabel: string;
  alreadyConnectedMsg: string;
  friendAddedSuccess: string;
  friendRequestSentSuccess: string;
  requestSentSuccess: string;
  unregisteredInviteSuccess: string;
  inviteSentSuccess: string;
  closeBtn: string;
  addFriendModalDesc: string;
  friendEmailLabel: string;
  friendEmailPlaceholder: string;
  errorSendingRequest: string;
  sendingBtn: string;
  sendRequestBtn: string;

  // Calendar Preview Modal Strings
  newEventModalTitle: string;
  gcalPreviewLabel: string;
  eventTitleLabel: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  eventReminderLabel: string;
  eventAiDescriptionLabel: string;
  savingBtn: string;
  saveToCalendarBtn: string;
  remind15Min: string;
  remind30Min: string;
  remind1Hour: string;
  remind1Day: string;

  // Recording Modal Strings
  micLiveMode: string;
  uploadAudioMode: string;
  micAccessError: string;
  transcribingProgress: string;
  rawRecordingTitle: string;
  transcribingTrackProgress: string;
  unsupportedAudioError: string;
  unableToReadAudioError: string;
  audioUploadError: string;
  aiProcessingTitle: string;
  recordingCompletedTitle: string;
  transcriptionReadyDesc: string;
  recordingTitleLabel: string;
  transcriptionPreviewLabel: string;
  otherPhrasesLabel: string;
  categoryLabel: string;
  saveRecordingBtn: string;
  recordingInPause: string;
  micActiveRecording: string;
  realtimeTranscriptLabel: string;
  endAndAnalyzeBtn: string;
  recordWithMicTitle: string;
  recordWithMicDesc: string;
  startRecordingBtn: string;
  dragAudioFileDesc: string;
  supportAudioFormatsDesc: string;
  transcribeAndAnalyzeBtn: string;
  fileSizeMB: string;

  // Upgrade Modal Strings
  premiumOfferLabel: string;
  recallPremiumLabel: string;
  premiumSubtitle: string;
  benefit1Title: string;
  benefit1Desc: string;
  benefit2Title: string;
  benefit2Desc: string;
  benefit3Title: string;
  benefit3Desc: string;
  monthlyFatturation: string;
  proPlanActiveBtn: string;
  activateProSubBtn: string;
  downgradeFreeBtn: string;

  // Profile View Strings
  proPlanBadge: string;
  freePlanBadge: string;
  verifiedOtpLabel: string;
  oauthConnectedLabel: string;
  usageStatsTitle: string;
  recordedAudioLabel: string;
  executiveAiSummariesLabel: string;
  detectedAiEventsLabel: string;
  chatAiQuestionsLabel: string;
  comparePlansTitle: string;
  comparePlansSubtitle: string;
  freePlanTitle: string;
  freePlanPrice: string;
  freePlanDesc: string;
  freeBenefit1: string;
  freeBenefit2: string;
  freeBenefit3: string;
  freeBenefit4: string;
  freeBenefit5: string;
  switchToFreeBtn: string;
  proPlanTitle: string;
  proPlanPrice: string;
  proPlanDesc: string;
  proBenefit1: string;
  proBenefit2: string;
  proBenefit3: string;
  proBenefit4: string;
  proBenefit5: string;
  activateProBtn: string;
  activeProPlanLabel: string;
  themeLabel: string;
  changeThemeTooltip: string;
  accessEmailLabel: string;
  disconnectBtn: string;

  // Agenda View Strings
  checkWithAiBtn: string;
  syncingBtn: string;
  syncBtn: string;
  newAppointmentBtn: string;
  aiDetectedEventsTitle: string;
  addedLabel: string;
  planMeetingGCalTitle: string;
  meetingTitleLabel: string;
  startTimeLabel: string;
  agendaNotesPlaceholder: string;
  gcalAddBtn: string;
  upcomingEventsTitle: string;
  eventsCount: string;
  eventCountSingle: string;
  participateBtn: string;
  registerBtn: string;
  deleteEventTooltip: string;
  noUpcomingEvents: string;
  noUpcomingEventsDesc: string;
  planMeetingBtn: string;
  tasksFilterAll: string;
  tasksFilterToDo: string;
  tasksFilterDone: string;
  addGTasksPlaceholder: string;
  noTasksPlaceholder: string;

  // Auth Modal Strings
  allFieldsRequired: string;
  passwordMinLength: string;
  nameRequired: string;
  authErrorMsg: string;
  googleAuthError: string;
  lightModeTooltip: string;
  darkModeTooltip: string;
  createAccountTitle: string;
  authWelcomeBack: string;
  signUpDesc: string;
  signInDesc: string;
  signUpWithGoogle: string;
  signInWithGoogle: string;
  orSignUpEmail: string;
  orSignInEmail: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholderSignUp: string;
  passwordPlaceholderSignIn: string;
  processingAuth: string;
  signUpAndVerify: string;
  signInBtn: string;
  copyrightFooter: string;

  // OTP Modal Strings
  enterAllOtpDigits: string;
  invalidOtpCode: string;
  resendOtpError: string;
  sendingOtpError: string;
  verifyEmailTitle: string;
  sentSecurityCodeDesc: string;
  confirmAndAccessBtn: string;
  newCodeIn: string;
  resendingProgress: string;
  resendCodeBtn: string;
}

export const translations: Record<string, TranslationDict> = {
  it: {
    home: "Home",
    search: "Cerca",
    agenda: "Agenda",
    profile: "Profilo",
    settings: "Impostazioni",
    back: "Torna indietro",
    logout: "Esci dall'account",
    add: "Aggiungi",

    appearance: "Aspetto",
    darkTheme: "Tema scuro",
    enabled: "Attivo",
    disabled: "Disattivato",
    account: "Account",
    editProfile: "Modifica profilo",
    profileSubtitle: "Nome, foto, email",
    friendsAndCollaboration: "Amici e Collaborazione",
    friendsSubtitle: "Invita amici e gestisci richieste",
    passwordAndAccess: "Password e accesso",
    language: "Lingua",
    notifications: "Notifiche",
    pushNotifications: "Notifiche push",
    pushSubtitle: "Promemoria task e riunioni",
    emailSummary: "Riepilogo email",
    emailSubtitle: "Sintesi giornaliera",
    integrations: "Integrazioni",
    syncTasksEvents: "Sincronizza task ed eventi",
    connected: "Connesso",
    notConnected: "Non connesso",
    recordCalls: "Registra le chiamate",
    privacyAndSecurity: "Privacy e sicurezza",
    dataManagement: "Gestione dati",
    dataManagementSubtitle: "Esporta e elimina i dati",
    version: "versione",

    searchConversations: "Cerca nelle conversazioni",
    viewNotificationsAndFriends: "Visualizza Notifiche e Amici",
    viewProfileAndSettings: "Visualizza Profilo e Impostazioni",
    logoutTooltip: "Esci",

    goodMorning: "Buongiorno,",
    welcomeBack: "Bentornato",
    nextMeeting: "Prossimo incontro",
    ongoing: "ora in corso",
    todayAgenda: "Agenda di Oggi",
    tasksToProgram: "Attività da Programmare (Rilevate da AI)",
    addManually: "Aggiungi manualmente",
    addTaskPlaceholder: "Cosa devi fare oggi?",
    save: "Salva",
    cancel: "Annulla",
    analyzingWithAi: "Analisi con AI in corso...",
    noTasksToday: "Nessuna attività programmata per oggi. Ottimo lavoro!",
    recentMeetings: "Riunioni Recenti",
    noMeetingsRecorded: "Nessuna riunione registrata ancora.",
    recordNewMeeting: "Registra Nuova Riunione",
    syncCalendar: "Sincronizza Calendario",
    friendRequestsPending: "Hai richieste di amicizia in attesa!",
    viewRequests: "Visualizza",
    minutesRecordedShort: "min registrati",
    summariesUsedShort: "sintesi usate",
    chatsUsedShort: "chat usate",

    join: "Unisciti",
    record: "Registra",
    recentDiscussions: "Discussioni recenti",
    viewAll: "Vedi tutte",
    todayTasksTitle: "Task di oggi",
    addTask: "Aggiungi task",
    whatNeedToDo: "Che cosa c'è da fare?",
    locale: "Locale",
    scan: "Task AI Scanner",
    scanSub: "Scansiona i task per individuare impegni automatici",
    scanning: "Scansione...",
    inMinutes: "tra {mins} min",
    inHours: "tra {hours} ore",
    inHour: "tra 1 ora",

    friendsTitle: "Amici e Collaboratori",
    inviteFriends: "Invita un amico o collaboratore",
    addFriendPlaceholder: "Inserisci l'email del tuo amico...",
    sendRequest: "Invia Richiesta / Invito",
    requestSent: "Richiesta inviata!",
    pendingRequests: "Richieste Inviate (In Attesa)",
    receivedRequests: "Richieste Ricevute",
    myFriends: "I Miei Amici",
    noFriendsYet: "Non hai ancora aggiunto nessun amico. Invita qualcuno per iniziare a collaborare!",
    noPendingRequests: "Nessuna richiesta in attesa.",
    accept: "Accetta",
    reject: "Rifiuta",
    invitationEmailSent: "Email di invito inviata con successo via EmailJS!",
    invitationStatusPending: "Invito email pendente (non registrato)",
    creditsEarned: "Crediti accumulati",
    rateLimitError: "Hai inviato troppe richieste. Riprova tra poco.",
    invalidEmailError: "Email destinatario non valida",
    friendRequestAcceptedNotif: "ha accettato la tua richiesta di amicizia!",
    friendRequestReceivedNotif: "ti ha inviato una richiesta di amicizia!",

    notificationsCenter: "Centro Notifiche",
    markAllRead: "Segna tutte come lette",
    noNotifications: "Nessuna notifica presente.",

    meetingDetails: "Dettagli Riunione",
    transcript: "Trascrizione",
    summary: "Sintesi AI",
    topics: "Argomenti Trattati",
    decisions: "Decisioni Chiave",
    actionItems: "Azioni Correttive & Task",
    askAiAboutMeeting: "Chiedi all'AI su questa riunione",
    askAiPlaceholder: "Chiedi chiarimenti, decisioni prese o dettagli della riunione...",
    aiThinking: "L'AI sta elaborando...",
    sentiment: "Sentiment",
    positive: "positivo",
    neutral: "neutrale",
    constructive: "costruttivo",
    duration: "Durata",
    tags: "Tag",
    detectedEvents: "Impegni / Eventi Rilevati nel testo",
    addToCalendar: "Aggiungi al Calendario",
    addedToCalendar: "Aggiunto",
    conceptMap: "Mappa Concettuale",
    createGoogleDoc: "Crea in Google Docs",
    openingGoogleDoc: "Creazione in corso...",

    // Search Screen Additional Strings
    deleteLabel: "Elimina",
    oneSpeaker: "1 interlocutore",
    multipleSpeakers: "interlocutori",
    seeSummary: "Vedi Sintesi",
    searchTitle: "Cerca",
    searchBarPlaceholder: "Cerca per parola chiave, trascrizione o argomenti...",
    clearBtn: "Cancella",
    filterLabel: "Filtra:",
    discussionsFound: "discussioni trovate",
    noRecordings: "Nessuna registrazione salvata",
    noRecordingsDesc: "Inizia subito a registrare o caricare file per archiviare le tue discussioni e analizzarle con l'AI.",
    startFirstRecording: "Avvia Prima Registrazione",
    noSearchMatch: "Nessuna conversazione corrisponde alla ricerca",
    noSearchMatchDesc: "Prova a inserire altre parole chiave o a modificare la categoria filtrata.",
    showAllRecordings: "Mostra tutte le registrazioni",

    // Friends Additional Strings
    friendsAndCollaborationViewTitle: "Amici e Collaborazione",
    friendsAndCollaborationViewSubtitle: "Gestisci la tua rete di contatti, invita nuovi colleghi e collabora sugli action item delle riunioni.",
    addFriendBtn: "Aggiungi Amico",
    noFriendsAdded: "Nessun amico aggiunto",
    noFriendsAddedDesc: "Inizia a creare la tua rete di contatti per condividere riepiloghi, delegare task e pianificare insieme.",
    sendFirstInvite: "Invia il tuo primo invito",
    futureCreditsInfo: "Ogni amico che si registra ti fa guadagnare crediti gratuiti per Recall AI Pro.",
    futureCreditsTooltip: "Predisposizione futura crediti. Guadagna Recall Pro invitando colleghi.",
    referralProgramTitle: "Programma Referral Recall AI",
    referralProgramDesc: "Per ogni amico o collega che si registra utilizzando la tua email, entrambi riceverete 1 mese gratuito di Recall Pro! Invia subito un invito inserendo la sua email qui sopra.",

    // Add Friend Modal Additional Strings
    addFriendModalTitle: "Aggiungi un amico",
    referralAndCollaborationLabel: "Referral & Collaborazione",
    alreadyConnectedMsg: "Siete già in contatto!",
    friendAddedSuccess: "Amico aggiunto automaticamente!",
    friendRequestSentSuccess: "Richiesta di amicizia inviata con successo via EmailJS!",
    requestSentSuccess: "Richiesta inviata!",
    unregisteredInviteSuccess: "L'utente non è ancora registrato, ma abbiamo inviato un invito via EmailJS!",
    inviteSentSuccess: "Invito inviato!",
    closeBtn: "Chiudi",
    addFriendModalDesc: "Inserisci l'indirizzo email di un amico o collega. Se è già registrato su Recall, sarete connessi all'istante, altrimenti gli invieremo un invito speciale via email.",
    friendEmailLabel: "Indirizzo Email dell'amico",
    friendEmailPlaceholder: "es. collega@azienda.com",
    errorSendingRequest: "Errore durante l'invio della richiesta.",
    sendingBtn: "Invio in corso...",
    sendRequestBtn: "Invia richiesta",

    // Calendar Preview Modal Strings
    newEventModalTitle: "Nuovo evento",
    gcalPreviewLabel: "Anteprima Google Calendar",
    eventTitleLabel: "Titolo",
    eventDateLabel: "Data",
    eventTimeLabel: "Orario",
    eventReminderLabel: "Promemoria",
    eventAiDescriptionLabel: "Descrizione generata dall'IA",
    savingBtn: "Salvataggio...",
    saveToCalendarBtn: "Salva su Calendar",
    remind15Min: "15 minuti prima",
    remind30Min: "30 minuti prima",
    remind1Hour: "1 ora prima",
    remind1Day: "1 giorno prima",

    // Recording Modal Strings
    micLiveMode: "Microfono dal Vivo",
    uploadAudioMode: "Carica File Audio",
    micAccessError: "Impossibile accedere al microfono. Verifica i permessi del browser.",
    transcribingProgress: "Trascrizione della registrazione in corso...",
    rawRecordingTitle: "Nuova Registrazione",
    transcribingTrackProgress: "Trascrizione traccia audio in corso...",
    unsupportedAudioError: "Seleziona un file audio valido (MP3, WAV, M4A, WEBM, OGG, AAC).",
    unableToReadAudioError: "Impossibile leggere il file audio selezionato.",
    audioUploadError: "Errore durante il caricamento del file audio.",
    aiProcessingTitle: "Elaborazione AI",
    recordingCompletedTitle: "Registrazione completata!",
    transcriptionReadyDesc: "La trascrizione della tua riunione è pronta. Dai un titolo e una categoria per salvarla e generare l'analisi con Gemini AI.",
    recordingTitleLabel: "Titolo Registrazione",
    transcriptionPreviewLabel: "Anteprima Trascrizione",
    otherPhrasesLabel: "...e altre {count} frasi",
    categoryLabel: "Categoria",
    saveRecordingBtn: "Salva Registrazione",
    recordingInPause: "REGISTRAZIONE IN PAUSA",
    micActiveRecording: "MICROFONO ATTIVO • REGISTRAZIONE",
    realtimeTranscriptLabel: "Anteprima Parlato in Tempo Reale:",
    endAndAnalyzeBtn: "Termina & Analizza con Gemini AI",
    recordWithMicTitle: "Registra Riunione con Microfono",
    recordWithMicDesc: "Parla o registra l'incontro dal vivo. Il sistema riconoscerà automaticamente le diverse voci dei partecipanti (diarizzazione speaker).",
    startRecordingBtn: "Avvia Registrazione Audio",
    dragAudioFileDesc: "Trascina qui il file audio o fai clic per sfogliare i tuoi file",
    supportAudioFormatsDesc: "Supporta MP3, WAV, M4A, WEBM, OGG, AAC fino a 25MB",
    transcribeAndAnalyzeBtn: "Trascrivi & Analizza File con AI",
    fileSizeMB: "MB • Clicca per cambiare file",

    // Upgrade Modal Strings
    premiumOfferLabel: "OFFERTA PREMIUM",
    recallPremiumLabel: "Recall Premium",
    premiumSubtitle: "Potenzia la tua produttività, automatizza la gestione delle riunioni e connetti i tuoi calendari senza limiti.",
    benefit1Title: "Riconoscimento Multi-Voce Avanzato",
    benefit1Desc: "Distingui e assegna automaticamente i testi ai diversi interlocutori (diarizzazione speaker) per riunioni chiare e leggibili.",
    benefit2Title: "Modulo \"Calendario AI\" Esclusivo",
    benefit2Desc: "Estrae in tempo reale gli impegni, i follow-up e le scadenze concordate a voce e li sincronizza all'istante su Google Calendar.",
    benefit3Title: "Riassunti IA e Chat Illimitati",
    benefit3Desc: "Analisi approfondite con i modelli Gemini più performanti e domande illimitate ai tuoi meeting.",
    monthlyFatturation: "/ mese (fatturato mensilmente)",
    proPlanActiveBtn: "Piano PRO Già Attivo",
    activateProSubBtn: "Attiva Abbonamento PRO Subito",
    downgradeFreeBtn: "Downgrade al Piano Gratuito",

    // Profile View Strings
    proPlanBadge: "✦ PIANO PRO",
    freePlanBadge: "PIANO GRATUITO",
    verifiedOtpLabel: "Verificata via OTP",
    oauthConnectedLabel: "Connesso",
    usageStatsTitle: "Statistiche di Utilizzo",
    recordedAudioLabel: "Audio Registrato",
    executiveAiSummariesLabel: "Riassunti Esecutivi IA",
    detectedAiEventsLabel: "Impegni AI Rilevati",
    chatAiQuestionsLabel: "Domande Chat IA",
    comparePlansTitle: "Confronto Piani di Abbonamento",
    comparePlansSubtitle: "Puoi passare liberamente tra il piano gratuito e il piano PRO in qualsiasi momento.",
    freePlanTitle: "Piano Gratuito",
    freePlanPrice: "€0 /mese",
    freePlanDesc: "Per professionisti che registrano riunioni occasionalmente.",
    freeBenefit1: "Registrazioni e trascrizioni illimitate nel browser",
    freeBenefit2: "Riconoscimento di 1 sola voce principale",
    freeBenefit3: "Massimo 5 Riassunti IA al mese",
    freeBenefit4: "10 domande al mese con Chat IA",
    freeBenefit5: "Calendario AI (impegni automatici) disattivato",
    switchToFreeBtn: "Passa a Free",
    proPlanTitle: "Piano PRO",
    proPlanPrice: "€14,99 /mese",
    proPlanDesc: "Tutto illimitato con speaker diarization avanzata e Calendario AI.",
    proBenefit1: "Registrazioni e trascrizioni illimitate",
    proBenefit2: "Riconoscimento multi-voce avanzato (diarizzazione)",
    proBenefit3: "Riassunti IA illimitati con Gemini 1.5 Pro",
    proBenefit4: "Chat IA illimitata sui contenuti delle riunioni",
    proBenefit5: "Calendario AI Esclusivo (auto-sync impegni)",
    activateProBtn: "Attiva Abbonamento PRO",
    activeProPlanLabel: "✓ Stai utilizzando il Piano PRO",
    themeLabel: "Tema:",
    changeThemeTooltip: "Cambia tema",
    accessEmailLabel: "Accesso:",
    disconnectBtn: "Disconnetti",

    // Agenda View Strings
    checkWithAiBtn: "Controlla con IA",
    syncingBtn: "Sincronizzazione...",
    syncBtn: "Sincronizza",
    newAppointmentBtn: "Nuovo Appuntamento",
    aiDetectedEventsTitle: "AI Assistant ha rilevato {count} task o date importanti da salvare:",
    addedLabel: "Aggiunto",
    planMeetingGCalTitle: "Pianifica Riunione su Google Calendar",
    meetingTitleLabel: "Titolo Riunione",
    startTimeLabel: "Orario Inizio",
    agendaNotesPlaceholder: "Descrizione degli argomenti, link, note aggiuntive concordate...",
    gcalAddBtn: "Aggiungi a Google Calendar",
    upcomingEventsTitle: "Eventi & Riunioni in Programma",
    eventsCount: "eventi",
    eventCountSingle: "evento",
    participateBtn: "Partecipa",
    registerBtn: "Registra",
    deleteEventTooltip: "Elimina appuntamento",
    noUpcomingEvents: "Nessun evento in programma",
    noUpcomingEventsDesc: "Non ci sono appuntamenti imminenti sul tuo calendario di Google. Sincronizza per caricare gli eventi più recenti.",
    planMeetingBtn: "Pianifica Riunione",
    tasksFilterAll: "Tutti",
    tasksFilterToDo: "Da fare",
    tasksFilterDone: "Fatti",
    addGTasksPlaceholder: "Aggiungi un'attività su Google Tasks...",
    noTasksPlaceholder: "Nessuna attività presente",

    // Auth Modal Strings
    allFieldsRequired: "Inserisci tutti i campi obbligatori",
    passwordMinLength: "La password deve contenere almeno 6 caratteri",
    nameRequired: "Inserisci il tuo nome e cognome",
    authErrorMsg: "Errore durante l'autenticazione. Riprova.",
    googleAuthError: "Impossibile completare l'autenticazione Google Workspace.",
    lightModeTooltip: "Passa alla modalità chiara",
    darkModeTooltip: "Passa alla modalità scura",
    createAccountTitle: "Crea il tuo account",
    authWelcomeBack: "Bentornato",
    signUpDesc: "Registrati per sincronizzare Google Calendar, Tasks e gestire le riunioni con l'AI",
    signInDesc: "Accedi per visualizzare le tue registrazioni, compiti Google e agenda",
    signUpWithGoogle: "Registrati con Google",
    signInWithGoogle: "Accedi con Google",
    orSignUpEmail: "oppure registrati via email",
    orSignInEmail: "oppure con email",
    fullNameLabel: "Nome e Cognome *",
    fullNamePlaceholder: "Il tuo nome e cognome",
    emailLabel: "Email *",
    emailPlaceholder: "nome@azienda.com",
    passwordLabel: "Password *",
    passwordPlaceholderSignUp: "Almeno 6 caratteri",
    passwordPlaceholderSignIn: "La tua password",
    processingAuth: "Elaborazione in corso...",
    signUpAndVerify: "Registrati e verifica codice OTP",
    signInBtn: "Accedi a Recall",
    copyrightFooter: "Recall AI Assistant • Sicurezza e crittografia audio end-to-end",

    // OTP Modal Strings
    enterAllOtpDigits: "Inserisci tutte le 6 cifre del codice OTP",
    invalidOtpCode: "Codice OTP non valido o scaduto. Riprova.",
    resendOtpError: "Errore rinvio codice:",
    sendingOtpError: "Errore durante l'invio:",
    verifyEmailTitle: "Verifica la tua Email",
    sentSecurityCodeDesc: "Abbiamo inviato un codice di sicurezza a 6 cifre a",
    confirmAndAccessBtn: "Conferma e Accedi",
    newCodeIn: "Nuovo codice tra {seconds}s",
    resendingProgress: "Invio in corso...",
    resendCodeBtn: "Invia nuovo codice",
  },
  en: {
    home: "Home",
    search: "Search",
    agenda: "Agenda",
    profile: "Profile",
    settings: "Settings",
    back: "Go back",
    logout: "Sign out of account",
    add: "Add",

    appearance: "Appearance",
    darkTheme: "Dark theme",
    enabled: "Active",
    disabled: "Disabled",
    account: "Account",
    editProfile: "Edit profile",
    profileSubtitle: "Name, photo, email",
    friendsAndCollaboration: "Friends & Collaboration",
    friendsSubtitle: "Invite friends and manage requests",
    passwordAndAccess: "Password & access",
    language: "Language",
    notifications: "Notifications",
    pushNotifications: "Push notifications",
    pushSubtitle: "Task and meeting reminders",
    emailSummary: "Email summary",
    emailSubtitle: "Daily synthesis",
    integrations: "Integrations",
    syncTasksEvents: "Sync tasks and events",
    connected: "Connected",
    notConnected: "Not connected",
    recordCalls: "Record calls",
    privacyAndSecurity: "Privacy & security",
    dataManagement: "Data management",
    dataManagementSubtitle: "Export and delete data",
    version: "version",

    searchConversations: "Search conversations",
    viewNotificationsAndFriends: "View Notifications and Friends",
    viewProfileAndSettings: "View Profile and Settings",
    logoutTooltip: "Logout",

    goodMorning: "Good morning,",
    welcomeBack: "Welcome back",
    nextMeeting: "Next meeting",
    ongoing: "now ongoing",
    todayAgenda: "Today's Agenda",
    tasksToProgram: "Tasks to Schedule (AI Detected)",
    addManually: "Add manually",
    addTaskPlaceholder: "What do you need to do today?",
    save: "Save",
    cancel: "Cancel",
    analyzingWithAi: "AI analysis in progress...",
    noTasksToday: "No tasks scheduled for today. Great job!",
    recentMeetings: "Recent Meetings",
    noMeetingsRecorded: "No meetings recorded yet.",
    recordNewMeeting: "Record New Meeting",
    syncCalendar: "Sync Calendar",
    friendRequestsPending: "You have pending friend requests!",
    viewRequests: "View",
    minutesRecordedShort: "min recorded",
    summariesUsedShort: "summaries used",
    chatsUsedShort: "chats used",

    join: "Join",
    record: "Record",
    recentDiscussions: "Recent discussions",
    viewAll: "View all",
    todayTasksTitle: "Today's tasks",
    addTask: "Add task",
    whatNeedToDo: "What needs to be done?",
    locale: "Local",
    scan: "Task AI Scanner",
    scanSub: "Scan tasks to identify automatic schedule events",
    scanning: "Scanning...",
    inMinutes: "in {mins} min",
    inHours: "in {hours} hours",
    inHour: "in 1 hour",

    friendsTitle: "Friends & Collaborators",
    inviteFriends: "Invite a friend or collaborator",
    addFriendPlaceholder: "Enter your friend's email...",
    sendRequest: "Send Request / Invitation",
    requestSent: "Request sent!",
    pendingRequests: "Sent Requests (Pending)",
    receivedRequests: "Received Requests",
    myFriends: "My Friends",
    noFriendsYet: "You haven't added any friends yet. Invite someone to start collaborating!",
    noPendingRequests: "No pending requests.",
    accept: "Accept",
    reject: "Reject",
    invitationEmailSent: "Invitation email successfully sent via EmailJS!",
    invitationStatusPending: "Email invitation pending (unregistered)",
    creditsEarned: "Credits earned",
    rateLimitError: "You have sent too many requests. Please try again in a bit.",
    invalidEmailError: "Invalid recipient email address",
    friendRequestAcceptedNotif: "accepted your friend request!",
    friendRequestReceivedNotif: "sent you a friend request!",

    notificationsCenter: "Notification Center",
    markAllRead: "Mark all as read",
    noNotifications: "No notifications.",

    meetingDetails: "Meeting Details",
    transcript: "Transcript",
    summary: "AI Summary",
    topics: "Topics Covered",
    decisions: "Key Decisions",
    actionItems: "Action Items & Tasks",
    askAiAboutMeeting: "Ask AI about this meeting",
    askAiPlaceholder: "Ask for clarifications, decisions, or meeting details...",
    aiThinking: "AI is processing...",
    sentiment: "Sentiment",
    positive: "positive",
    neutral: "neutral",
    constructive: "constructive",
    duration: "Duration",
    tags: "Tags",
    detectedEvents: "Tasks / Events Detected in text",
    addToCalendar: "Add to Calendar",
    addedToCalendar: "Added",
    conceptMap: "Concept Map",
    createGoogleDoc: "Create in Google Docs",
    openingGoogleDoc: "Creating...",

    // Search Screen Additional Strings
    deleteLabel: "Delete",
    oneSpeaker: "1 speaker",
    multipleSpeakers: "speakers",
    seeSummary: "View Summary",
    searchTitle: "Search",
    searchBarPlaceholder: "Search by keyword, transcript or topics...",
    clearBtn: "Clear",
    filterLabel: "Filter:",
    discussionsFound: "discussions found",
    noRecordings: "No recordings saved",
    noRecordingsDesc: "Start recording or uploading audio files to archive your discussions and analyze them with AI.",
    startFirstRecording: "Start First Recording",
    noSearchMatch: "No discussion matches your search",
    noSearchMatchDesc: "Try entering other keywords or change the category filter.",
    showAllRecordings: "Show all recordings",

    // Friends Additional Strings
    friendsAndCollaborationViewTitle: "Friends & Collaboration",
    friendsAndCollaborationViewSubtitle: "Manage your contact network, invite new colleagues and collaborate on meeting action items.",
    addFriendBtn: "Add Friend",
    noFriendsAdded: "No friends added",
    noFriendsAddedDesc: "Start building your contact network to share summaries, delegate tasks, and plan together.",
    sendFirstInvite: "Send your first invite",
    futureCreditsInfo: "Every friend who registers earns you free credits for Recall AI Pro.",
    futureCreditsTooltip: "Future credit system. Earn Recall Pro by inviting colleagues.",
    referralProgramTitle: "Recall AI Referral Program",
    referralProgramDesc: "For each friend or colleague who registers using your email, both of you will receive 1 free month of Recall Pro! Send an invite immediately by entering their email address above.",

    // Add Friend Modal Additional Strings
    addFriendModalTitle: "Add a friend",
    referralAndCollaborationLabel: "Referral & Collaboration",
    alreadyConnectedMsg: "You are already connected!",
    friendAddedSuccess: "Friend automatically added!",
    friendRequestSentSuccess: "Friend request successfully sent via EmailJS!",
    requestSentSuccess: "Request sent!",
    unregisteredInviteSuccess: "The user is not registered yet, but we sent an invitation via EmailJS!",
    inviteSentSuccess: "Invitation sent!",
    closeBtn: "Close",
    addFriendModalDesc: "Enter the email address of a friend or colleague. If they are already registered on Recall, you will be connected instantly; otherwise, we will send them a special invitation via email.",
    friendEmailLabel: "Friend's Email Address",
    friendEmailPlaceholder: "e.g. colleague@company.com",
    errorSendingRequest: "Error sending request.",
    sendingBtn: "Sending...",
    sendRequestBtn: "Send request",

    // Calendar Preview Modal Strings
    newEventModalTitle: "New event",
    gcalPreviewLabel: "Google Calendar Preview",
    eventTitleLabel: "Title",
    eventDateLabel: "Date",
    eventTimeLabel: "Time",
    eventReminderLabel: "Reminder",
    eventAiDescriptionLabel: "Description generated by AI",
    savingBtn: "Saving...",
    saveToCalendarBtn: "Save to Calendar",
    remind15Min: "15 minutes before",
    remind30Min: "30 minutes before",
    remind1Hour: "1 hour before",
    remind1Day: "1 day before",

    // Recording Modal Strings
    micLiveMode: "Live Microphone",
    uploadAudioMode: "Upload Audio File",
    micAccessError: "Unable to access the microphone. Please check your browser permissions.",
    transcribingProgress: "Transcribing your recording...",
    rawRecordingTitle: "New Recording",
    transcribingTrackProgress: "Transcribing audio track...",
    unsupportedAudioError: "Please select a valid audio file (MP3, WAV, M4A, WEBM, OGG, AAC).",
    unableToReadAudioError: "Unable to read the selected audio file.",
    audioUploadError: "Error occurred during audio file upload.",
    aiProcessingTitle: "AI Processing",
    recordingCompletedTitle: "Recording completed!",
    transcriptionReadyDesc: "Your meeting transcription is ready. Give it a title and a category to save it and generate the analysis with Gemini AI.",
    recordingTitleLabel: "Recording Title",
    transcriptionPreviewLabel: "Transcription Preview",
    otherPhrasesLabel: "...and other {count} sentences",
    categoryLabel: "Category",
    saveRecordingBtn: "Save Recording",
    recordingInPause: "RECORDING PAUSED",
    micActiveRecording: "LIVE MICROPHONE • RECORDING",
    realtimeTranscriptLabel: "Real-time Speech Preview:",
    endAndAnalyzeBtn: "End & Analyze with Gemini AI",
    recordWithMicTitle: "Record Meeting with Microphone",
    recordWithMicDesc: "Speak or record the live meeting. The system will automatically recognize different participant voices (speaker diarization).",
    startRecordingBtn: "Start Audio Recording",
    dragAudioFileDesc: "Drag audio file here or click to browse files",
    supportAudioFormatsDesc: "Supports MP3, WAV, M4A, WEBM, OGG, AAC up to 25MB",
    transcribeAndAnalyzeBtn: "Transcribe & Analyze File with AI",
    fileSizeMB: "MB • Click to change file",

    // Upgrade Modal Strings
    premiumOfferLabel: "PREMIUM OFFER",
    recallPremiumLabel: "Recall Premium",
    premiumSubtitle: "Boost your productivity, automate meeting management, and connect your calendars without limits.",
    benefit1Title: "Advanced Multi-Voice Recognition",
    benefit1Desc: "Automatically distinguish and assign text to different speakers (speaker diarization) for clear and readable meetings.",
    benefit2Title: "Exclusive \"AI Calendar\" Module",
    benefit2Desc: "Extract in real-time commitments, follow-ups, and deadlines agreed on voice and sync them instantly to Google Calendar.",
    benefit3Title: "Unlimited AI Summaries & Chat",
    benefit3Desc: "In-depth analysis with top performing Gemini models and unlimited questions to your meetings.",
    monthlyFatturation: "/ month (billed monthly)",
    proPlanActiveBtn: "PRO Plan Already Active",
    activateProSubBtn: "Activate PRO Subscription Now",
    downgradeFreeBtn: "Downgrade to Free Plan",

    // Profile View Strings
    proPlanBadge: "✦ PRO PLAN",
    freePlanBadge: "FREE PLAN",
    verifiedOtpLabel: "Verified via OTP",
    oauthConnectedLabel: "Connected",
    usageStatsTitle: "Usage Statistics",
    recordedAudioLabel: "Recorded Audio",
    executiveAiSummariesLabel: "Executive AI Summaries",
    detectedAiEventsLabel: "Detected AI Events",
    chatAiQuestionsLabel: "AI Chat Questions",
    comparePlansTitle: "Compare Subscription Plans",
    comparePlansSubtitle: "You can freely switch between the free plan and the PRO plan at any time.",
    freePlanTitle: "Free Plan",
    freePlanPrice: "$0 /month",
    freePlanDesc: "For professionals who occasionally record meetings.",
    freeBenefit1: "Unlimited recordings and transcriptions in browser",
    freeBenefit2: "Recognition of only 1 main voice",
    freeBenefit3: "Maximum 5 AI Summaries per month",
    freeBenefit4: "10 questions per month with AI Chat",
    freeBenefit5: "AI Calendar (automatic schedule commitments) disabled",
    switchToFreeBtn: "Switch to Free",
    proPlanTitle: "PRO Plan",
    proPlanPrice: "$14.99 /month",
    proPlanDesc: "Everything unlimited with advanced speaker diarization and AI Calendar.",
    proBenefit1: "Unlimited recordings and transcriptions",
    proBenefit2: "Advanced multi-voice recognition (diarization)",
    proBenefit3: "Unlimited AI summaries with Gemini 1.5 Pro",
    proBenefit4: "Unlimited AI chat on meeting contents",
    proBenefit5: "Exclusive AI Calendar (auto-sync commitments)",
    activateProBtn: "Activate PRO Subscription",
    activeProPlanLabel: "✓ You are using the PRO Plan",
    themeLabel: "Theme:",
    changeThemeTooltip: "Change theme",
    accessEmailLabel: "Signed in as:",
    disconnectBtn: "Sign out",

    // Agenda View Strings
    checkWithAiBtn: "Check with AI",
    syncingBtn: "Syncing...",
    syncBtn: "Sync",
    newAppointmentBtn: "New Event",
    aiDetectedEventsTitle: "AI Assistant detected {count} tasks or important dates to save:",
    addedLabel: "Added",
    planMeetingGCalTitle: "Plan Meeting on Google Calendar",
    meetingTitleLabel: "Meeting Title",
    startTimeLabel: "Start Time",
    agendaNotesPlaceholder: "Description of topics, links, additional notes agreed upon...",
    gcalAddBtn: "Add to Google Calendar",
    upcomingEventsTitle: "Scheduled Events & Meetings",
    eventsCount: "events",
    eventCountSingle: "event",
    participateBtn: "Join",
    registerBtn: "Record",
    deleteEventTooltip: "Delete event",
    noUpcomingEvents: "No scheduled events",
    noUpcomingEventsDesc: "There are no upcoming events on your Google Calendar. Sync to load the latest events.",
    planMeetingBtn: "Plan Meeting",
    tasksFilterAll: "All",
    tasksFilterToDo: "To do",
    tasksFilterDone: "Done",
    addGTasksPlaceholder: "Add a task on Google Tasks...",
    noTasksPlaceholder: "No tasks found",

    // Auth Modal Strings
    allFieldsRequired: "Enter all required fields",
    passwordMinLength: "Password must be at least 6 characters",
    nameRequired: "Enter your name and surname",
    authErrorMsg: "Authentication error. Try again.",
    googleAuthError: "Unable to complete Google Workspace authentication.",
    lightModeTooltip: "Switch to light mode",
    darkModeTooltip: "Switch to dark mode",
    createAccountTitle: "Create your account",
    authWelcomeBack: "Welcome back",
    signUpDesc: "Register to sync Google Calendar, Tasks and manage meetings with AI",
    signInDesc: "Sign in to view your recordings, Google tasks and agenda",
    signUpWithGoogle: "Register with Google",
    signInWithGoogle: "Sign in with Google",
    orSignUpEmail: "or register via email",
    orSignInEmail: "or with email",
    fullNameLabel: "Full Name *",
    fullNamePlaceholder: "Your name and surname",
    emailLabel: "Email *",
    emailPlaceholder: "name@company.com",
    passwordLabel: "Password *",
    passwordPlaceholderSignUp: "At least 6 characters",
    passwordPlaceholderSignIn: "Your password",
    processingAuth: "Processing...",
    signUpAndVerify: "Register & verify OTP code",
    signInBtn: "Sign in to Recall",
    copyrightFooter: "Recall AI Assistant • Security and audio encryption end-to-end",

    // OTP Modal Strings
    enterAllOtpDigits: "Enter all 6 digits of the OTP code",
    invalidOtpCode: "Invalid or expired OTP code. Please try again.",
    resendOtpError: "Error resending code:",
    sendingOtpError: "Error during sending:",
    verifyEmailTitle: "Verify your Email",
    sentSecurityCodeDesc: "We sent a 6-digit security code to",
    confirmAndAccessBtn: "Confirm & Access",
    newCodeIn: "New code in {seconds}s",
    resendingProgress: "Sending...",
    resendCodeBtn: "Resend code",
  }
};

