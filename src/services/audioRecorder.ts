export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  async startRecording(onAudioLevel?: (level: number) => void): Promise<void> {
    this.audioChunks = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Il tuo browser non supporta l\'accesso al microfono.');
    }

    // Request microphone stream
    this.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Setup visualizer analyzer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.audioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength / 255;
          if (onAudioLevel) {
            onAudioLevel(avg);
          }
          this.animationFrameId = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      }
    } catch (e) {
      console.warn('Web Audio Context not available for visualizer', e);
    }

    // Determine supported MediaRecorder mimeType
    let selectedMimeType = 'audio/webm;codecs=opus';
    if (typeof MediaRecorder !== 'undefined') {
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          selectedMimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          selectedMimeType = 'audio/wav';
        } else {
          selectedMimeType = '';
        }
      }
    }

    const options: MediaRecorderOptions = {
      ...(selectedMimeType ? { mimeType: selectedMimeType } : {}),
      audioBitsPerSecond: 32000, // 32 kbps provides crystal-clear speech with ultra-fast transfer & processing
    };
    this.mediaRecorder = new MediaRecorder(this.audioStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Collect in 250ms chunks
    this.mediaRecorder.start(250);
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  async stopRecording(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder non inizializzato'));
        return;
      }

      // Stop audio level visualizer
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Stop microphone tracks
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((track) => track.stop());
          this.audioStream = null;
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string) || '';
          resolve({ blob: audioBlob, base64, mimeType });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(audioBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cancelRecording(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }
    this.audioChunks = [];
  }
}
