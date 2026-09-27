# Architecture des activités — V1.2

## Audit initial

Word possédait plusieurs `segmentations` alternatives et des variantes historiques `completeWord`. Sentence était distincte et pouvait déjà être ciblée par une `CompletionActivity` inline, mais n’avait pas de construction de contenu ; l’adaptateur des sessions excluait explicitement les phrases. L’éditeur Parent exposait le tableau de constructions alternatives, d’où la confusion LA / VA / ge. Le moteur multi-case et l’audio complet étaient déjà réutilisables.

## Contrats conservés et extensions

- `CompletionParameters` conserve `missingSegmentIndex` historique ou `missingSegmentIndexes`, jamais les deux. Les réponses viennent des blocs référencés.
- `CompletionActivity` référence un Word **ou** une Sentence par `targetId` et sa construction par `segmentationId`. La forme inline `segmentation` reste compatible ; fournir les deux est invalide.
- Sentence reçoit `segmentations?`, de même type que Word. Parent n’expose que la construction principale. Les alternatives historiques ne sont pas supprimées.
- `Segmentation` conserve `id`, `segments`, `availableFromWeek?`. Les champs optionnels `gaps` et `surface` conservent les espaces et graphies exacts d’une phrase.
- Les segments restent `{ unitId }`, `{ literal, note }` ou l’ancien `{ separator }`. Seul `unitId` peut être une réponse ; espaces et ponctuation ne deviennent jamais des unités.

`content/construction.ts` centralise la résolution des graphies, la reconstruction, l’alignement des blocs explicitement choisis sur une phrase et la sélection de la construction principale. Aucune syllabe, mot ou réponse n’est inféré. La phrase originale demeure la source des espaces et de la typographie. Le validateur refuse des graphies de surface qui ne correspondent pas aux références.

Word sans construction et Sentence sans construction sont valides comme contenu ; une activité sans construction valide est rejetée. La reconstruction des mots garde la comparaison NFC/casse/espaces qui corrige LILA ; celle des phrases est exacte. Les références, semaines, désactivations, doublons et réponses visibles interdites utilisent les validateurs communs.

## Adaptation et rendu

`activityToExercise` valide et produit un `CompletionExercise` avec cible typée et `CompletionBoard`. `getCompleteWordChallenges` accepte désormais les deux types. Les champs historiques `word`/`wordId` du défi portent le texte/ID de la cible par compatibilité ; `targetType` la distingue, sans transformer une Sentence en Word. Aucun nouveau mini-jeu ni moteur n’est créé.

`placeAnswer`, `isSlotCorrect`, `isComplete` sont inchangés. Chaque case est corrigée par index, quel que soit l’ordre des dépôts. Les choix restent réutilisables. Les réponses partielles ne terminent pas le défi.

`CompletionLine` est partagé entre aperçu Parent et jeu enfant. Les mots conservent leurs blocs existants. Pour les phrases, les espaces séparent des groupes qui peuvent revenir à la ligne ; la ponctuation reste attachée au groupe voisin. Les séparateurs inline des anciennes activités restent rendus correctement. Les mêmes `AnswerTile`, Pointer Events et alternatives clavier servent aux deux types.

Le générateur de session reçoit simplement des candidats supplémentaires, applique la même semaine et la même stratégie (cinq cibles distinctes, environ trois récentes/deux révisions), sans répéter une cible pour remplir une série.

Le service audio n’est pas modifié : `audioText` de la cible complète passe par le même appel au début, après erreur, à la réussite complète et à la réécoute. La pause, le muet et le remplacement d’une lecture restent identiques.

## Fusion, sauvegardes et édition

```text
seed inchangé + unités/semaines Parent + overrides de construction/activation + activités
→ effectiveProgram → repository → service → session → moteur existant
```

Les constructions du seed sont surchargées par `ParentData.constructions` ; celles du contenu personnalisé restent dans les unités. Même store, même clé, JSON version 2 à champs optionnels, lecture V1 conservée. Aucun besoin de vider localStorage. Le reset restaure le seed sans effacer les aventures enfant.

`saveParentUnit` remappe les cases des activités référencées lors d’un réordonnancement. Supprimer une réponse exige une nouvelle configuration ; aucune réponse de remplacement n’est choisie. Les alternatives et activités inline historiques sont conservées. Une récupération des anciennes constructions partielles n’est proposée qu’en brouillon, sans réécriture silencieuse.

Limitation : plusieurs constructions alternatives par cible ne sont pas exposées dans Parent V1.2. Une future interface devra offrir ajout, modification, suppression, sélection par activité et validation. Voir [parent-space.md](parent-space.md) pour le parcours, les exemples JSON, la persistance et les résultats des validations.
