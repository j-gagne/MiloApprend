const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
export interface GateChallenge { readonly digits: readonly number[]; readonly prompt: string }
export function createGate(random: () => number = Math.random): GateChallenge {
  const digits = Array.from({ length: 3 }, () => 1 + Math.floor(random() * 9));
  return { digits, prompt: digits.map((digit) => names[digit - 1]).join(' — ') };
}
export function checkGate(challenge: GateChallenge, answer: string): boolean {
  return /^[1-9]{3}$/.test(answer) && answer === challenge.digits.join('');
}
