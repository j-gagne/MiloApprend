// Comparaison uniquement : ne modifie jamais la graphie conservée dans le contenu.
export function comparableText(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('fr');
}
