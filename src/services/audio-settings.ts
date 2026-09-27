// Valeur normale constatée dans le service V1.2.
export const READING_SPEEDS = { slow: { label: 'Lente', rate: 0.45 }, normal: { label: 'Normale', rate: 0.60 }, fast: { label: 'Rapide', rate: 0.78 } } as const;
export type ReadingSpeed = keyof typeof READING_SPEEDS;
export const DEFAULT_READING_SPEED: ReadingSpeed = 'normal';
export function readingRate(speed: ReadingSpeed = DEFAULT_READING_SPEED): number { return READING_SPEEDS[speed].rate; }
