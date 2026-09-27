# Banque pédagogique de base

Modifier **`program.ts` → `seedBank`**. C'est la seule source de contenu seed,
indépendante du Parent et de localStorage. `seed-bank.ts` la projette en
`initialProgram` pour le repository existant ; ce fichier ne contient aucun catalogue.

- **Semaine** : ajouter un objet `number`, `label`, `letters`, `syllables`, `words`,
  `toolWords`, `sentences`. Les listes peuvent être vides. `reviewedUnitIds` référence
  des unités antérieures sans les recopier. La semaine d'introduction est héritée.
- **Lettre** : ajouter `'n'` à `letters` (ID `letter-n`). Une entrée objet avec `id`,
  `display`, `grapheme`, `uppercase`, etc. permet de préciser les métadonnées.
- **Syllabe** : ajouter `'ma'` à `syllables` (ID `syllable-ma`). Déclarer uniquement
  les syllabes autorisées, jamais de découpage déduit de l'orthographe.
- **Mot-outil** : ajouter `'il'` à `toolWords` (ID `tool-word-il`, casse conservée).
- **Mot** : ajouter `{ id: 'word-…', display: '…', segmentations: [...] }` à `words`.
  `text` et `audioText` prennent `display` par défaut, `enabled` vaut `true` et
  `tags` vaut `['school']`. Préciser `tags: ['practice']` pour l'entraînement.
- **Phrase** : ajouter `{ id: 'sentence-…', display: '…', segmentations: [...] }`
  à `sentences`. Conserver espaces, casse et ponctuation. Les phrases existantes
  sans construction restent telles quelles, sans exercice inventé.

Une construction se définit à côté du contenu :

```ts
{ id: 'word-lavage', display: 'lavage', segmentations: [{
  id: 'initial',
  segments: [
    { unitId: 'syllable-la' },
    { unitId: 'syllable-va' },
    { literal: 'ge', note: 'Terminaison visible uniquement.' },
  ],
}] }
```

Cet exemple n'ajoute pas LAVAGE au seed. Un bloc `unitId` référence une unité
pédagogique existante. Un `literal` reste visible mais ne crée ni unité, ni réponse,
ni distracteur. Pour une phrase, les blocs `separator` représentent les espaces
ou la ponctuation explicites ; `gaps`/`surface` restent également disponibles.
Les autres métadonnées du modèle sont conservées (`audioText`, `audioAsset`,
`imageAsset`, `availableFromWeek` des constructions, alternatives, etc.).

`activity-catalog.ts` dérive les exercices standards depuis la première construction :
chaque bloc pédagogique seul, puis tous ensemble. Aucun exercice manuel requis.
Les anciens `completeWord` et leurs IDs restent prioritaires sur les variantes
automatiques équivalentes. Les cibles actuellement supportées sont Word, Sentence
et Syllable ; les lettres et mots-outils peuvent servir de blocs/réponses.

Les syllabes de **deux lettres** restent actives comme contenu/blocs/distracteurs.
Seul leur exercice automatique ayant la syllabe pour cible est désactivé par défaut.
Un `activityEnabled` Parent explicite (`true` ou `false`) conserve la priorité.
Les exercices Word/Sentence utilisant ces syllabes restent actifs.

Conserver les IDs existants, y compris les IDs de construction et d'exercice.
Les quelques `legacyOrder` maintiennent l'ancien ordre des mots d'entraînement
pour préserver les tirages/distracteurs ; inutile d'en ajouter au nouveau contenu.
Ne recopier ni personnalisations Parent ni données de stockage dans cette banque.
