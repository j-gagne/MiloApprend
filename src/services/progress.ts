export interface Progress { completedSessions: number }
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): boolean;
}
const key = 'milo-apprend.progress.v1';
export const progressStore: ProgressStore = {
  load() {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (value && typeof value === 'object' && 'completedSessions' in value
        && typeof value.completedSessions === 'number' && Number.isSafeInteger(value.completedSessions)
        && value.completedSessions >= 0) return { completedSessions: value.completedSessions };
    } catch { /* Le jeu reste disponible si le stockage est bloqué. */ }
    return { completedSessions: 0 };
  },
  save(progress) {
    try { localStorage.setItem(key, JSON.stringify(progress)); return true; }
    catch { return false; }
  },
};
