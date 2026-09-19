import emailjs from '@emailjs/browser';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

// Lettura delle credenziali dalle variabili d'ambiente Vite o da configurazione dinamica
export const getEmailJSConfig = (): EmailJSConfig => {
  const env = (import.meta as any).env || {};
  
  // Rimuovi eventuali credenziali localStorage obsolete per caricare i nuovi default corretti
  const localService = localStorage.getItem('RECALL_EMAILJS_SERVICE_ID');
  const localTemplate = localStorage.getItem('RECALL_EMAILJS_TEMPLATE_ID');
  if (localService === 'service_c0653oi') {
    localStorage.removeItem('RECALL_EMAILJS_SERVICE_ID');
  }
  if (localTemplate === 'template_mndv7mq') {
    localStorage.removeItem('RECALL_EMAILJS_TEMPLATE_ID');
  }

  return {
    serviceId: localStorage.getItem('RECALL_EMAILJS_SERVICE_ID') || env.VITE_EMAILJS_SERVICE_ID || 'service_19poemn',
    templateId: localStorage.getItem('RECALL_EMAILJS_TEMPLATE_ID') || env.VITE_EMAILJS_TEMPLATE_ID || 'template_2hfi3ef',
    publicKey: localStorage.getItem('RECALL_EMAILJS_PUBLIC_KEY') || env.VITE_EMAILJS_PUBLIC_KEY || 'T0-fxkSF4j0YYTyeR',
  };
};

export const saveEmailJSConfig = (serviceId: string, templateId: string, publicKey: string) => {
  localStorage.setItem('RECALL_EMAILJS_SERVICE_ID', serviceId.trim());
  localStorage.setItem('RECALL_EMAILJS_TEMPLATE_ID', templateId.trim());
  localStorage.setItem('RECALL_EMAILJS_PUBLIC_KEY', publicKey.trim());
};

/**
 * Invia un'email di benvenuto tramite EmailJS al momento del login o della registrazione.
 * 
 * Parametri del template raccomandati su EmailJS:
 * - to_email: email del destinatario (es. {{to_email}})
 * - to_name: nome dell'utente (es. {{to_name}})
 * - app_name: nome dell'app ("Recall AI")
 * - login_time: data e ora del login/accesso
 * - message: messaggio personalizzato di benvenuto
 */
export const sendWelcomeEmail = async (
  userEmail: string,
  userName: string = 'Utente Recall'
): Promise<{ success: boolean; message: string }> => {
  const config = getEmailJSConfig();

  // Se mancano le chiavi EmailJS, logga in console e restituisce un messaggio informativo
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.info(
      `[EmailJS] Credenziali non ancora configurate (.env: VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY). ` +
      `Simulazione invio email di benvenuto a ${userEmail} (${userName}).`
    );
    return {
      success: true,
      message: `Configurazione EmailJS richiesta. Simulazione riuscita per ${userEmail}.`,
    };
  }

  try {
    const templateParams = {
      // Formati standard e varianti per garantire la massima compatibilità con qualsiasi nome di campo del template EmailJS
      to_email: userEmail,
      to_name: userName,
      user_email: userEmail,
      user_name: userName,
      email: userEmail,
      name: userName,
      app_name: 'Recall AI Meeting Assistant',
      login_time: new Date().toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' }),
      message: `Benvenuto su Recall! Il tuo account (${userEmail}) è pronto per registrare meeting, trascrivere l'audio e sincronizzare le azioni con Google Workspace.`,
    };

    // Inizializza esplicitamente EmailJS per questa transazione
    emailjs.init({ publicKey: config.publicKey });

    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      {
        publicKey: config.publicKey,
      }
    );

    console.log('[EmailJS] Email di benvenuto inviata con successo:', response.status, response.text);
    return {
      success: true,
      message: 'Email di benvenuto inviata con successo!',
    };
  } catch (error: any) {
    console.error('[EmailJS] Errore durante l\'invio dell\'email:', error);
    return {
      success: false,
      message: error?.text || error?.message || 'Errore durante l\'invio con EmailJS',
    };
  }
};

/**
 * Invia un'email con codice OTP per la verifica della registrazione.
 */
export const sendOtpEmail = async (
  userEmail: string,
  userName: string,
  otpCode: string
): Promise<{ success: boolean; message: string }> => {
  const config = getEmailJSConfig();

  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.info(
      `[EmailJS] Credenziali non configurate. Simulazione invio OTP ${otpCode} a ${userEmail}.`
    );
    return {
      success: true,
      message: `Codice OTP generato: ${otpCode}`,
    };
  }

  try {
    const templateParams = {
      // Formati standard e varianti per garantire la massima compatibilità con qualsiasi nome di campo del template EmailJS
      to_email: userEmail,
      to_name: userName,
      user_email: userEmail,
      user_name: userName,
      email: userEmail,
      name: userName,
      otp_code: otpCode,
      otpCode: otpCode,
      code: otpCode,
      app_name: 'Recall AI Meeting Assistant',
      message: `Il tuo codice di verifica per completare l'accesso è: ${otpCode}`,
    };

    // Inizializza esplicitamente EmailJS per questa transazione
    emailjs.init({ publicKey: config.publicKey });

    await emailjs.send(config.serviceId, config.templateId, templateParams, {
      publicKey: config.publicKey,
    });
    return {
      success: true,
      message: 'Codice inviato alla tua email!',
    };
  } catch (error: any) {
    console.error('[EmailJS] Errore invio OTP:', error);
    return {
      success: false,
      message: error?.text || error?.message || 'Errore durante l\'invio dell\'OTP',
    };
  }
};
