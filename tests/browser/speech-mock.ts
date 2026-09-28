import type { Page } from '@playwright/test';

declare global {
  interface Window {
    speechProbe: { calls: { text: string; lang: string; voice?: string }[]; cancels: number; languages: string[] };
  }
}

export async function mockSpeech(page: Page, languages = ['en-US', 'fr-FR', 'fr-CA'], ends = true, nativeUtterance = false) {
  await page.addInitScript(({ languages, ends, nativeUtterance }) => {
    // Ordre stable pour les tests historiques d'interaction et d'audio.
    // Les tests de session injectent leurs propres RNG pour vérifier le mélange.
    Math.random = () => 0.999;
    window.speechProbe = { calls: [], cancels: 0, languages };
    class Utterance {
      text: string;
      lang = '';
      voice?: { lang: string };
      onend?: () => void;
      onstart?: () => void;
      onerror?: () => void;
      constructor(text: string) { this.text = text; }
    }
    const synthesis = Object.assign(new EventTarget(), {
      getVoices: () => window.speechProbe.languages.map((lang) => ({ name: `Voix ${lang}`, lang })),
      cancel: () => { window.speechProbe.cancels += 1; },
      speak: (utterance: Utterance) => {
        window.speechProbe.calls.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.lang });
        utterance.onstart?.();
        if (ends) window.setTimeout(() => utterance.onend?.(), 100);
      },
    });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
    if (nativeUtterance) {
      class NativeProbeUtterance extends window.SpeechSynthesisUtterance {
        constructor(text: string) {
          super(text);
          // Fake voices are not native SpeechSynthesisVoice objects. Only shadow
          // voice; keep the browser's real rate setter/getter and utterance object.
          Object.defineProperty(this, 'voice', { writable: true, value: null });
        }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: NativeProbeUtterance });
    } else Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
  }, { languages, ends, nativeUtterance });
}
