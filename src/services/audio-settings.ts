// Valeur normale constatée dans le service V1.2.
export const READING_SPEEDS = { slow: { label: 'Lente', rate: 0.45 }, normal: { label: 'Normale', rate: 0.60 }, fast: { label: 'Rapide', rate: 0.78 } } as const;
export type ReadingSpeed = keyof typeof READING_SPEEDS;
export const DEFAULT_READING_SPEED: ReadingSpeed = 'normal';
export function readingRate(speed: ReadingSpeed = DEFAULT_READING_SPEED): number { return READING_SPEEDS[speed].rate; }
export const SLOW_WHOLE_FACTOR = 0.75;
export const MIN_SLOW_WHOLE_RATE = 0.1;
export function slowWholeRate(rate: number): number { return Math.max(MIN_SLOW_WHOLE_RATE, rate * SLOW_WHOLE_FACTOR); }
