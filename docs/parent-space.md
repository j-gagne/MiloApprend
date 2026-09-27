# Espace Parent V1.2 — Programme, construction, blocs et exercices

## Utilisation

Ouvrir **Parents**, recopier les trois chiffres écrits en lettres, puis Valider. Les quatre sections restent Aperçu, Programme, Exercices et Réglages. Le gate, les semaines, activations, suppressions confirmées et le reset restent en place.

- **Programme** décrit ce qui existe. Chaque semaine affiche uniquement ses nouveautés. Un mot ou une phrase peut être enregistré avec son texte et son audio, sans construction.
- **Construction** décrit comment la cible est construite pour les exercices. Il n’y en a qu’une visible par cible dans Parent.
- **Bloc** est une partie de cette construction, référencée dans le contenu appris ou saisie comme texte visible.
- **Exercice** décrit ce que Milo doit retrouver. Une construction peut servir à plusieurs exercices.

Exemple principal : **LAVAGE → LA + VA + ge**. LA et VA sont des références pédagogiques. `ge` est du texte visible : il ne crée ni syllabe, ni lettre, ni unité apprise et ne peut être ni réponse ni distracteur.

## Éditer une construction

Dans Programme, ouvrir le contenu puis **+ Ajouter un bloc**. Choisir **Contenu appris** (recherche et sélection dans le programme effectif) ou **Texte visible** (saisie explicite). Chaque bloc propose Modifier, Retirer et les flèches ↑/↓. Retirer la construction permet de revenir au contenu seul.

La reconstruction est affichée en direct. LA + VA donne `lava` et une seule erreur de reconstruction pour la construction complète. Ajouter le bloc visible `ge` donne `lavage ✓`. Le système n’invente jamais la partie manquante. LILA reste LI + LA, y compris si la casse du mot diffère des graphies référencées.

Les références et disponibilités sont contrôlées en plus de la reconstruction. Les mots sont comparés avec normalisation Unicode NFC, casse française et espaces ; les graphies stockées ne sont pas modifiées. Les phrases sont comparées **exactement**, avec leurs espaces, ponctuation, accents et casse.

## Construction facultative et création d’exercice

SOLEIL peut être enregistré sans construction. Programme affiche **Aucune construction** ; le mot reste activable et persistant. Il ne produit pas d’activité de complétion valide tant que la construction manque.

**Exercices → + Nouvel exercice** présente deux groupes, Mots et Phrases, issus du programme effectif, seed et ajouts Parent compris. Les cibles sans construction restent visibles. Sélectionner SOLEIL affiche « Ce mot n’a pas encore de construction. » et **Définir la construction**. Ce bouton ouvre exactement le même éditeur que Programme. Enregistrer une construction valide revient directement à la configuration de l’exercice.

Les cases de **Parties à trouver** sont réservées aux blocs pédagogiques admissibles. Les blocs visibles restent non sélectionnables. Les distracteurs référencent également des unités admissibles ; les doublons et réponses correctes déguisées en distracteurs sont refusés.

Plusieurs activités peuvent partager la même construction : trouver LA, trouver VA ou trouver LA + VA. Dupliquer conserve les paramètres dans un nouveau brouillon avec un nouvel ID. Les activités historiques gardent leurs IDs et leur construction déjà choisie.

## Phrases et espaces

Pour **Il a lu.**, ajouter explicitement les blocs Il, a, lu et le texte visible `.`. Le parent n’ajoute pas de bloc espace. Le système aligne uniquement ces blocs choisis sur la phrase originale et conserve les espaces entre eux : `Il a lu.`, jamais `Ilalu.` ni `Il a lu .`.

Aucun mot de la phrase n’est automatiquement considéré comme appris. Les apostrophes et la ponctuation doivent appartenir à un bloc choisi explicitement. Les espaces ordinaires, doubles ou insécables et les graphies Unicode sont conservés dans la construction persistée.

Une phrase peut aussi exister sans construction. Word et Sentence restent des types distincts. Les constructions ajoutées à un contenu seed sont des overrides Parent ; `program.ts` n’est jamais modifié.

## Jeu et aperçu

Word et Sentence utilisent les mêmes adaptateurs, `CompletionBoard`, `placeAnswer`, `isComplete`, gestes et composants. `CompletionLine` partage la présentation de la ligne entre Parent et enfant ; pour une phrase, les espaces permettent le retour à la ligne et la ponctuation reste attachée à son bloc voisin. Le titre devient « Complète la phrase » uniquement pour une phrase.

Les sessions acceptent les phrases admissibles, gardent cinq cibles distinctes lorsque possible et la stratégie récent/révision existante. Une variante de la même cible n’ajoute pas un doublon à la série.

Le service audio est inchangé : cible entière au début, après erreur, à la réussite complète et à la réécoute. Une bonne réponse partielle ne termine pas le défi et ne déclenche pas la réussite. Muet, annulation/remplacement vocal, pause, dinosaures, œufs, célébration et REJOUER sont conservés.

## Audit et compatibilité interne

Le problème initial a été reproduit : trois anciennes segmentations contenant chacune LA, VA ou ge donnaient trois erreurs, car chacune représentait une alternative complète. L’interface exposait ce modèle technique de manière trompeuse. La V1.2 retire ces commandes et ce vocabulaire de l’interface, sans supprimer les anciennes alternatives stockées ni modifier le seed.

La construction reste un `Segmentation` dans `segmentations`. Word conserve son tableau ; Sentence possède maintenant le même champ optionnel. La première entrée est la construction principale. Les alternatives historiques restent conservées en interne et les anciennes activités continuent de référencer leur ID. Un marqueur principal vide peut préserver la position des alternatives lorsqu’on retire une construction principale historique.

Une ancienne saisie partielle LA / VA / ge peut être réunie **dans le brouillon** seulement si les blocs assemblés reconstruisent le mot et qu’aucune ancienne alternative ne le reconstruisait. Une explication s’affiche et le parent doit enregistrer pour confirmer. Les alternatives originales restent conservées. Aucun changement silencieux des sauvegardes.

Lors d’un réordonnancement, les emplacements des activités référencées sont remappés vers les mêmes blocs. Si une réponse disparaît, les parties à trouver deviennent invalides et demandent une reconfiguration ; aucune autre réponse n’est choisie automatiquement. Les activités anciennes avec construction inline gardent leur configuration autonome de compatibilité.

## Représentation persistée

Bloc pédagogique : `{ "unitId": "syllable-la" }`.
Bloc visible : `{ "literal": "ge", "note": "Texte visible — non appris" }`.

Exemple LAVAGE dans `customUnits` (IDs illustratifs ; l’interface crée des IDs aléatoires stables) :

```json
{
  "id": "parent-word-lavage-exemple",
  "type": "word",
  "text": "LAVAGE",
  "display": "LAVAGE",
  "audioText": "lavage",
  "introducedInWeek": 5,
  "enabled": true,
  "tags": ["parent", "practice"],
  "segmentations": [{
    "id": "parent-segmentation-lavage-exemple",
    "segments": [
      { "unitId": "syllable-la" },
      { "unitId": "syllable-va" },
      { "literal": "ge", "note": "Texte visible — non appris" }
    ]
  }]
}
```

Pour une phrase, `gaps` conserve les espaces avant chaque bloc et après le dernier ; `surface` conserve ses graphies exactes :

```json
{
  "id": "parent-segmentation-phrase-exemple",
  "segments": [
    { "unitId": "tool-word-Il" },
    { "unitId": "letter-a" },
    { "unitId": "syllable-lu" },
    { "literal": ".", "note": "Texte visible — non appris" }
  ],
  "gaps": ["", " ", " ", "", ""],
  "surface": ["Il", "a", "lu", "."]
}
```

Le validateur vérifie que `surface` correspond aux blocs et que `gaps` contient uniquement des espaces. Ni l’un ni l’autre ne peut introduire une nouvelle réponse. L’activité référence `targetId`, `segmentationId`, `missingSegmentIndexes` et `distractorUnitIds`. Pour retrouver a + lu ci-dessus, les index sont `[1, 2]`.

## Stockage et reset

Même `ParentStore`, même clé **milo-apprend.parent.v1**, même JSON `version: 2`. Les nouveaux champs sont optionnels. La lecture V1 (customWords → customUnits) reste compatible ; les activités inline, semaines, overrides et IDs V2 restent conservés.

Les constructions de contenu Parent restent dans leurs unités. Le champ optionnel `constructions` contient uniquement les overrides de constructions du seed, par ID de cible. `effectiveProgram` fusionne ces overrides avec le seed, les contenus/semaines Parent et les activités ; les composants ne maintiennent pas un autre catalogue.

Le reset efface toutes les personnalisations, y compris ces constructions, sans toucher **milo-apprend.progress.v1**. Un stockage bloqué laisse les modifications en mémoire avec avertissement. Aucun accès localStorage direct dans les composants.

## Limites

**Plusieurs constructions alternatives pour une même cible ne sont pas exposées dans l’espace Parent V1.2.** Une future interface devra proposer création, modification, suppression, choix par activité et validation explicite ; cette fonctionnalité n’est pas développée ici.

Les contenus et leurs constructions restent locaux au navigateur et à l’adresse utilisée, sans cloud ni synchronisation entre onglets. Aucun backend, compte ou nouveau mini-jeu. Les textes/audio/semaines du seed restent protégés ; seule leur construction peut être surchargée depuis l’éditeur. Les données historiques inline restent compatibles ; elles ne sont pas automatiquement réécrites pour suivre une construction de contenu nouvellement modifiée.

L’écoute réelle sur iPhone doit être testée sur l’appareil ; les tests automatisés simulent Web Speech. Le service audio et sa vitesse 0,78 sont inchangés.

## Fichiers V1.2

Ajoutés : `src/content/construction.ts`, `src/components/CompletionLine.tsx`, `src/components/parent/ConstructionEditor.tsx`, `tests/construction.test.ts`, `tests/browser/construction.spec.ts`, `tests/browser/construction-helpers.ts`.

Modifiés : `src/content/model.ts`, `activity-segmentation.ts`, `validation.ts` ; `src/parent/model.ts`, `content.ts`, `activities.ts` ; `src/services/parent-store.ts` ; `src/game/complete-word.ts`, `completion-content.ts`, `complete-word-content.ts` ; `src/components/CompleteWord.tsx` ; les composants Parent `UnitEditor`, `Programme`, `ParentSpace`, `Exercises`, `ActivityEditor`, `ActivityPreview` ; `src/styles.css`, `parent.css` ; tests `completion.test.ts`, `parent.test.ts`, `browser/parent.spec.ts`, `browser/parent-programme.spec.ts` ; `AGENTS.md`, `README.md`, `docs/architecture-activities.md`, ce document.

Le générateur de session est réutilisé sans nouveau moteur. `program.ts` et `audio.ts` sont conservés à l’identique.

## Validation V1.2

- Audit : AGENTS.md, documentation, modèles, éditeurs, store, fusion, adaptateurs, sessions et tests inspectés avant modification. Le cas de trois constructions partielles LA / VA / ge est reproduit dans les tests.
- **117 tests unitaires réussis** (82 précédents, 35 ajouts).
- **39 tests navigateur réussis** (33 précédents adaptés uniquement au nouveau vocabulaire/parcours ou à l’admission demandée des phrases, 6 ajouts).
- **TypeScript et npm run build réussis**, aucune erreur. Aucun lint n’était configuré et aucune configuration artificielle n’a été ajoutée.
- **20 tests production réussis** sur le build servi par Vite preview : les 14 contrôles Parent/LAMA précédents et les 6 nouveaux contrôles V1.2.
- Production à 390 et 1280 px : LAVAGE dans une construction, ajout/modification/retrait/réordonnancement, SOLEIL sans construction puis construction depuis Exercices, phrase Parent sans construction, construction du seed Il a lu. par override, activité simple et multi-case, refresh, série de cinq cibles, célébration et REJOUER. Contrôles supplémentaires au clavier, à la souris et au doigt simulé ; aperçu et audio de la cible complète.
- Captures mobile et desktop inspectées ; contrôles de largeur sans débordement horizontal. Les tests audio simulent Web Speech, sans prétendre valider l’audibilité physique d’un iPhone.
- `program.ts` et `audio.ts` ont exactement les mêmes empreintes SHA-256 qu’avant le travail. Le catalogue initial reste 21 mots, 4 phrases et 22 variantes Word ; aucune activité Sentence n’est ajoutée automatiquement au seed.
- Serveur réseau vérifié : **http://192.168.2.182:5173/** répond HTTP 200 et reste accessible.

Commandes reproductibles :

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:e2e -- --config=playwright.production.config.ts tests/browser/construction.spec.ts tests/browser/parent-programme.spec.ts tests/browser/parent.spec.ts tests/browser/multiple-slots.spec.ts
```

Les essais utilisent des navigateurs de test isolés et ne modifient pas les personnalisations du navigateur de l’utilisateur.
