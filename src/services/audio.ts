export interface AudioDiagnostics {
  available: boolean;
  voices: { name: string; lang: string }[];
  selected: string;
  muted: boolean;
  lastText: string;
  lastAttempt: string;
  gesture: string;
  lastError: string;
  voiceStatus: string;
  events: string[];
}

// Vitesse commune à toutes les prononciations pédagogiques du jeu.
const SPEECH_RATE = 0.60;

const language = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replaceAll('_', '-');
const describeVoice = (voice: SpeechSynthesisVoice) => `${voice.name || '(sans nom)'} — ${voice.lang}`;

// Seul cet adaptateur connaît Web Speech ; les fichiers restent prioritaires.
class GameAudio {
  private context?: AudioContext;
  private word?: HTMLAudioElement;
  private enabled = true;
  private utterance?: SpeechSynthesisUtterance;
  private finishPlayback?: () => void;
  private voices: SpeechSynthesisVoice[] = [];
  private listening = false;
  private pollingStarted = false;
  private tones = new Set<OscillatorNode>();
  private listeners = new Set<() => void>();
  private attempt = 0;
  private diagnostics: AudioDiagnostics = {
    available: false, voices: [], selected: 'Aucune lecture', muted: false,
    lastText: '—', lastAttempt: '—', gesture: '—', lastError: '—',
    voiceStatus: 'Voix non inspectées', events: [],
  };

  getDiagnostics = () => this.diagnostics;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(values: Partial<AudioDiagnostics>) {
    this.diagnostics = { ...this.diagnostics, ...values };
    this.listeners.forEach((listener) => listener());
  }
  private log(event: string, attempt = this.attempt) {
    const line = `${new Date().toLocaleTimeString('fr-CA')} · #${attempt} · ${event}`;
    this.update({ events: [...this.diagnostics.events.slice(-19), line] });
  }
  private error(error: unknown) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  private frenchVoice() {
    return this.voices.find((voice) => language(voice) === 'fr-ca')
      ?? this.voices.find((voice) => language(voice) === 'fr-fr')
      ?? this.voices.find((voice) => language(voice).startsWith('fr'));
  }
  private refreshVoices = () => {
    try {
      const synthesis = window.speechSynthesis;
      const available = !!synthesis && typeof SpeechSynthesisUtterance !== 'undefined';
      this.voices = available ? synthesis.getVoices() : [];
      const voice = this.frenchVoice();
      this.update({ available,
        voices: this.voices.map(({ name, lang }) => ({ name, lang })),
        voiceStatus: !available ? 'Web Speech indisponible' : voice ? `Meilleure voix française : ${describeVoice(voice)}`
          : this.voices.length === 0 ? 'Liste vide : chargement en cours ou aucune voix exposée. Réessayer après chargement.'
            : 'Aucune voix française disponible. Lecture française ignorée ; TEST AUDIO peut tester la voix par défaut.',
      });
    } catch (error) {
      this.voices = [];
      this.update({ available: false, voices: [], voiceStatus: 'Impossible de lire les voix', lastError: this.error(error) });
    }
  };
  private voicesChanged = () => { this.refreshVoices(); this.log('voiceschanged'); };

  prepareSpeech() {
    try {
      const synthesis = window.speechSynthesis;
      if (!this.listening && synthesis) {
        synthesis.addEventListener('voiceschanged', this.voicesChanged);
        this.listening = true;
      }
    } catch { /* L'inspection ci-dessous affiche l'erreur. */ }
    this.refreshVoices();
    // Quelques inspections seulement : aucun speak() différé, même si les voix arrivent tard.
    if (!this.pollingStarted) {
      this.pollingStarted = true;
      [250, 1000, 2500].forEach((delay) => window.setTimeout(this.refreshVoices, delay));
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.update({ muted: !enabled });
    if (!enabled) this.stop();
  }
  unlock() {
    this.prepareSpeech();
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* Web Audio facultatif. */ }
  }
  success() {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.1;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.025, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.connect(gain).connect(ctx.destination);
      this.tones.add(oscillator);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
      oscillator.onended = () => { this.tones.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    });
  }

  private beginAttempt(text: string, source: string) {
    this.attempt += 1;
    this.update({ lastText: text, lastAttempt: `#${this.attempt} · ${new Date().toLocaleTimeString('fr-CA')} · ${source}`,
      gesture: navigator.userActivation ? (navigator.userActivation.isActive ? 'oui' : 'non') : 'non exposée par le navigateur',
      selected: 'Aucune', lastError: '—',
    });
    this.log('demande de lecture');
  }

  // Synchrone : appelé directement depuis le click/tap, sans Promise ni timer avant speak().
  private speakNow(text: string, french: boolean, finish: () => void) {
    const attempt = this.attempt;
    this.prepareSpeech();
    if (!this.enabled) { this.log('lecture ignorée : muted'); finish(); return; }
    if (!this.diagnostics.available) { this.log('lecture ignorée : Web Speech indisponible'); finish(); return; }
    const voice = french ? this.frenchVoice() : undefined;
    if (french && !voice) {
      this.update({ lastError: 'no-french-voice (application) : aucune voix française retournée par getVoices()' });
      this.log('lecture ignorée : aucune voix française');
      finish();
      return;
    }
    try {
      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      this.utterance = utterance; // Conserver une référence jusqu'à la fin sur WebKit.
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
      // TEST AUDIO laisse volontairement voice et lang aux valeurs du navigateur.
      utterance.volume = 1;
      utterance.rate = french ? SPEECH_RATE : 1;
      utterance.pitch = 1;
      this.update({ selected: voice ? describeVoice(voice) : 'Voix par défaut du navigateur (sans voice/lang imposés)' });
      utterance.onstart = () => { this.log('onstart', attempt); };
      utterance.onend = () => { this.log('onend', attempt); finish(); };
      utterance.onerror = (event) => {
        const message = 'message' in event ? String(event.message) : '';
        const detail = `${event.error || 'unknown'}${message ? ` : ${message}` : ''}`;
        if (attempt === this.attempt) this.update({ lastError: detail });
        this.log(`onerror : ${detail}`, attempt);
        finish();
      };
      if (synthesis.paused) { synthesis.resume(); this.log('resume()'); }
      this.log('speak() appelé');
      synthesis.speak(utterance);
    } catch (error) {
      this.update({ lastError: this.error(error) });
      this.log(`exception : ${this.error(error)}`);
      finish();
    }
  }

  // Boutons de diagnostic : chemin direct, sans créer de Promise et sans Web Audio.
  testSpeech(french: boolean) {
    this.stop();
    this.beginAttempt('Bonjour Milo', french ? 'TEST VOIX FR' : 'TEST AUDIO');
    const finish = this.watchPlayback(() => {}, 10000);
    this.speakNow('Bonjour Milo', french, finish);
  }

  private watchPlayback(done: () => void, timeout = 4500) {
    let settled = false;
    const timer = window.setTimeout(() => {
      this.update({ lastError: `timeout (application) : pas de fin après ${timeout / 1000} s ; voir onstart dans le journal` });
      this.log('délai de garde dépassé');
      this.stop();
    }, timeout);
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      this.word = undefined;
      this.utterance = undefined;
      this.finishPlayback = undefined;
      done();
    };
    this.finishPlayback = finish;
    return finish;
  }

  playWord(text: string, src?: string): Promise<void> {
    this.stop();
    this.beginAttempt(text, src ? 'fichier audio' : 'mot du jeu');
    if (!this.enabled) { this.log('lecture ignorée : muted'); return Promise.resolve(); }
    let resolvePlayback!: () => void;
    const playback = new Promise<void>((resolve) => { resolvePlayback = resolve; });
    const finish = this.watchPlayback(resolvePlayback);
    // La Promise sert uniquement à notifier la fin ; speakNow() n'attend pas son exécution.
    if (!src) { this.speakNow(text, true, finish); return playback; }
    const attempt = this.attempt;
    try {
      const audio = new Audio(src);
      this.word = audio;
      let failed = false;
      const fallback = () => {
        if (failed || attempt !== this.attempt || this.word !== audio) return;
        failed = true;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        this.word = undefined;
        this.log('fichier indisponible : tentative de synthèse (activation utilisateur non garantie)');
        this.speakNow(text, true, finish);
      };
      audio.onended = finish;
      audio.onerror = fallback;
      void audio.play().catch(fallback);
    } catch { this.speakNow(text, true, finish); }
    return playback;
  }

  stop() {
    const hadUtterance = !!this.utterance;
    try { this.word?.pause(); } catch { /* Facultatif. */ }
    this.finishPlayback?.();
    try {
      const synthesis = window.speechSynthesis;
      // Ne pas annuler inutilement un synthétiseur au repos avant sa première lecture.
      if (synthesis && (hadUtterance || synthesis.speaking || synthesis.pending)) {
        this.log('cancel()');
        synthesis.cancel();
      }
    } catch (error) { this.update({ lastError: this.error(error) }); }
    for (const tone of this.tones) { try { tone.stop(); } catch { /* Déjà arrêté. */ } }
    this.tones.clear();
  }
}
export const gameAudio = new GameAudio();
