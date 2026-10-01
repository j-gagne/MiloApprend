# Milo apprend — règles permanentes

## Mission et périmètre

- Application éducative francophone pour un enfant de 6 ans : jeu joyeux, peu de texte, feedback doux, sans punition, publicité ni dark patterns.
- React, TypeScript strict, Vite. Séparer contenu, moteur, services et rendu ; éviter `any`, dépendances inutiles et refactorisations hors demande.
- Le dépôt courant fait autorité. Préserver les modifications non commitées et limiter chaque tâche au comportement demandé. Ne pas ajouter comptes, backend, services payants, reconnaissance vocale ou nouvelles activités sans demande.

## Pédagogie et unités

- L’école fournit le contenu ; le Parent contrôle sa disponibilité. Ne pas inventer de contenu, de syllabes ou de segmentation, ni corriger silencieusement graphies, accents et ponctuation scolaires.
- `content/model.ts` distingue `letter`, `grapheme`, `sound`, `syllable`, `word`, `tool-word`, `sentence`. Une phrase reste une `Sentence`, jamais un `Word` artificiel. Un graphème multicaractère n’est pas une lettre Spell.
- Les unités ont des IDs stables ; les références utilisent `unitId`/`targetId`, pas la prononciation. `display` est écrit, `audioText` est prononcé. Syllabes et graphèmes sont configurables, sans règle consonne-voyelle imposée.
- Disponibilité cumulative par `introducedInWeek`, `enabled` et semaine active, indépendamment des scores. Les semaines décrivent les nouveautés ; les révisions référencent les IDs. Garder la distinction `school`/`practice`.
- Un mot connu peut contenir des lettres non enseignées. Les blocs `literal` restent visibles sans devenir appris, réponses ou distracteurs ; seuls les contenus admissibles référencés peuvent être demandés. Espaces et ponctuation ne sont pas des réponses.

## Contenu : sources et parcours

- Parcours de production : `main.tsx` → `loadBaseProgram()` → base distante ou repli local → `effectiveProgram(base, parent)` → repository/service → catalogue d’activités → session → composants.
- `content/remote-program.ts` charge au démarrage le `program.json` du dépôt **j-gagne/MiloApprend-Content**, branche `main`, avec `cache: 'no-store'` et délai maximal de 5 s. Format : `schemaVersion: 1`, `programId`, `weeks`.
- `content/seed-bank.ts` / `buildSeedProgram()` transforme les `SeedWeek` sans inférer de contenu. Lettres, graphèmes, syllabes et mots-outils acceptent une chaîne ou un objet avec `id`, `display` et propriétés telles que `audioText`.
- `content/program.ts` fournit `initialProgram`, le repli embarqué ; ce n’est pas l’unique source de production. Erreurs réseau/HTTP/JSON, enveloppe invalide, exception ou délai dépassé déclenchent le repli.
- Nuance de validation : le chargeur appelle `validateProgram()` mais ses diagnostics retournés ne rejettent pas à eux seuls la base distante. `main.tsx` les journalise ; les adaptateurs écartent les activités invalides. Conserver les diagnostics structurés `severity`, `code`, `path`, `message`.
- Une modification autorisée du catalogue partagé vise le `program.json` du dépôt de contenu. Modifier le repli `program.ts` seulement si demandé/nécessaire au périmètre ; ne jamais y réparer un comportement propre au Parent. Ne pas modifier le chargeur pour contourner des personnalisations.
- Les activités passent par `content/service.ts` et son repository ; aucun catalogue pédagogique parallèle dans les composants. Les médias peuvent être absents sans bloquer le jeu.

## Espace Parent et programme effectif

- `parent/model.ts` fusionne base + semaines/unités personnalisées + activations + constructions + `audioOverrides` + activités. Les overrides s’appliquent par ID à la base chargée, distante ou locale ; l’interface ne modifie jamais cette base.
- `saveParentUnit()` stocke les contenus Parent dans `customUnits` ; pour le contenu de base, il stocke les overrides de prononciation/lecture et les constructions. Conserver les IDs lors d’une édition ; les activités Parent remplacent celles de même ID.
- Programme expose une construction principale facultative par mot/phrase ; les alternatives déjà stockées restent compatibles. Exercices configure les activités, leurs positions et distracteurs ; valider avant sauvegarde.
- `activeWeek` Parent remplace le défaut de `content/settings.ts`. `exerciseScope` filtre seulement les semaines d’introduction des cibles des sessions, jamais les éditeurs ni le cumul des unités apprises.
- Les suppressions personnalisées et resets demandent confirmation. Le contenu de base peut être désactivé, pas supprimé par le Parent.

## Construction, lecture et Découpe

- **Construction d’exercice et séquence de lecture sont indépendantes.** `segmentations` décrit les blocs du plateau ; `readingSequence` décrit les morceaux audio. Ne pas convertir l’une en l’autre ni réécrire l’orthographe affichée.
- `ReadingEditor` : Automatique = `segmented` sans séquence explicite ; Mot complet lentement = `whole` ; Séquence personnalisée = `segmented` avec `readingSequence` ordonnée (`{ text }` ou `{ unitId }`).
- `content/segmented-reading.ts` est l’autorité : `whole` lit le mot lentement ; sinon une séquence explicite est prioritaire. Chaque référence doit exister et être disponible ; chaque morceau doit avoir un texte audio non vide. Aucun remplacement silencieux d’une séquence invalide par la construction.
- Sans séquence explicite, la lecture utilise la construction valide entière, pas seulement les cases manquantes. Un bloc littéral non ponctuation empêche cette lecture automatique segmentée.
- Les mots Parent et les mots de base personnalisés suivent exactement ce parcours après sauvegarde/rechargement. Aucun drapeau supplémentaire « activer Découpe » ni traitement selon l’origine du mot. Une séquence audio seule ne crée pas d’exercice de complétion.
- `getCompleteWordChallenges()` transmet `pedagogicalReading` au jeu ; `CompleteWord` affiche Découpe pour le mode segmenté et Lentement pour `whole`. La lecture segmentée prononce tous les morceaux configurés puis le mot complet.

## Activités et sessions

- `content/activity-catalog.ts` conserve les activités explicites et dérive les complétions standard : chaque bloc admissible seul, puis tous ensemble. IDs déterministes, priorité aux configurations explicites équivalentes, sans combinaisons exhaustives.
- Les exercices automatiques ne sont pas persistés : personnaliser crée une activité Parent ; désactiver utilise `activityEnabled`. Une cible sans construction peut rester du contenu valide sans complétion automatique.
- `game/play-session.ts` appelle `complete-word-session.ts` : nouvelles cibles distinctes à chaque JOUER/REJOUER, environ 60 % de la semaine disponible la plus récente puis révision, RNG injectable. Défaut du jeu : 6 questions ; Parent propose 3/6/9. Ne pas confondre avec le défaut bas niveau de 5 défis du générateur.
- Si les cibles manquent, raccourcir et avertir, sans répétition ni contenu futur. Une nouvelle variante d’une ancienne cible reste de la révision. Le mode `chain` groupe la session déjà sélectionnée par 2 ou 3 cibles.

### Complete Word et banque de réponses

- `complete-segments` référence une cible Word/Sentence/Syllable et une construction ; conserver `missingSegmentIndexes` et la compatibilité `missingSegmentIndex`. Chaque case vérifie son index, indépendamment de l’ordre des dépôts ; réussite lorsque toutes sont correctes.
- `game/answer-bank.ts` gère des occurrences consommables identifiées, pas un inventaire de textes uniques. Les réponses répétées nécessitent plusieurs tuiles ; retirer une réponse libère son occurrence.
- `game/chain.ts` partage une banque entre cibles et conserve les occurrences utilisées. Une complétion ordinaire fournit les réponses attendues ; une cible avec `tileOrder` fournit sa banque ordonnée, distracteurs compris.
- `Sentence.display` conserve espaces et ponctuation ; le suffixe terminal peut provenir du texte original, sans inventer la ponctuation interne.

### Spell / Écris le mot

- `content/spelling.ts` définit l’activité distincte `spell`, rendue par le plateau commun. `targetText`, `missingPositions` et `letterUnitIds` sont indépendants de la construction du mot.
- Réponses et distracteurs : uniquement des unités `letter` disponibles, correspondant à une position Unicode, accents préservés. Ne pas transformer syllabes ou graphèmes multicaractères en lettres ; un texte cible modifié impose de reconfigurer l’activité.
- Chaque lettre répétée a son occurrence `answer:<position>` ; les distracteurs utilisent `distractor:<unitId>`. `tileOrder`, s’il existe, contient exactement toutes les occurrences une fois. Préserver cet ordre et cette consommation aussi en chaîne.
- Pas d’indice audio du segment manquant ni de surbrillance ActiveReadingSegment pour Spell. L’aide audio pédagogique du mot peut rester disponible, sans surligner les lettres.

## Audio et ActiveReadingSegment

- Tout audio passe par `services/audio.ts` (`gameAudio`). Fichier audio prioritaire lorsqu’il est fourni ; sinon Web Speech avec voix fr-CA, fr-FR puis française et replis existants. Préserver le déverrouillage iPhone et les gardes contre lectures automatiques doublées.
- Première lecture lancée depuis l’action utilisateur ; réécoute manuelle disponible. Remplacer/annuler la lecture précédente, respecter muet, arrêter à la sortie ; ne pas prononcer une mauvaise réponse. Préserver le délai après réussite.
- Pour un mot avec un seul bloc pédagogique manquant, `first-segment-audio.ts` fournit l’indice « segment comme dans mot ». Le segment isolé, « comme dans » et le mot sont des unités audio distinctes.
- Vitesse pédagogique centralisée dans `audio-settings.ts` (normale par défaut 0.60) ; `audio-sequence.ts` ordonnance les morceaux et pauses. Les voix de salutation des personnages sont séparées des réglages pédagogiques.
- `ActiveReadingSegment = { activityId, segmentIndex }` appartient au service audio et suit le vrai début/fin/erreur/annulation de lecture, pas un délai CSS. React s’abonne à cet état ; segments présents et cases manquantes/remplies utilisent la même bordure temporaire, solide 5 px `--theme-primary`, sans changer fond ni échelle ni animer.
- `getReadingSegmentIndexes()` associe les morceaux aux blocs par identité, jamais par `audioText`. Une correspondance ambiguë, un texte audio libre ou un morceau sans bloc correspondant n’est pas surligné. Ne pas promettre une surbrillance de toute séquence arbitraire ni une synchronisation interne à une utterance de mot complet.

## Persistance

- Réutiliser les services de stockage ; pas d’accès direct au stockage depuis une nouvelle UI, de clé parallèle inutile, de purge ou de migration destructive.
- `services/parent-store.ts` : `milo-apprend.parent.v1`, données version 2 avec compatibilité version 1 ; contenu personnalisé, overrides, activités et réglages éducatifs/jeu/audio.
- `services/parent-drafts.ts` : brouillons et navigation Parent en `sessionStorage`, distincts des contenus enregistrés ; conserver la restauration et l’identité des éditeurs.
- `services/progress.ts` : `milo-apprend.progress.v1`, `completedSessions`, prénom, personnage choisi et `eggRewards` (cycle, transitions, sessions traitées, Collection). Pas de catalogue éducatif dans la progression.
- Reset Parent conserve la progression enfant. Reset progression rétablit le profil initial et efface récompense/Collection/sessions traitées, sans toucher aux contenus, overrides ou réglages Parent. Vérifier le succès de sauvegarde avant de confirmer un reset à l’UI.

## Récompenses, personnages et Collection

- `game/egg-rewards.ts` : un cycle de 5 sessions terminées ; `completedSessionIds` garantit l’idempotence. `pendingTransition` empêche une autre progression avant CONTINUER et permet de restaurer l’écran après rechargement.
- `ensureReward()` enregistre le cycle dès zéro. `pendingAnimalId` et `pendingVariantId` déterminent la récompense, sans nouveau tirage pendant sa progression. Choix du personnage permis à zéro seulement ; changer d’animal à zéro crée son nouveau cycle, reconfirmer le même conserve le tirage.
- À la dernière session, le `HatchRecord` (`id`, `animalId`, `variantId`, `hatchedAt`) est ajouté avant CONTINUER. `acknowledgeEgg()` acquitte la transition et crée le prochain cycle uniquement si le précédent est terminé. Ne pas remettre à zéro sur simple montage d’un écran.
- `game/character-variants.ts` : catalogue actuel `normal`, `sleeping`, `celebrating`, `waving` pour chaque personnage. Tirage uniforme parmi les variantes non possédées pour cet `animalId` ; toutes redeviennent candidates uniformes lorsqu’elles sont toutes possédées. Propriété = `animalId + variantId` ; variante absente des anciennes données = `normal`.
- Ajouter une variante via le catalogue et le rendu existant, sans logique de sélection spéciale, pondération, nouveau schéma ou migration.
- `Collection.tsx` rend les `hatches` dans leur ordre enregistré : chaque gain reste un individu, doublons compris, avec son `animalId + variantId`. Aucun tirage, regroupement ou recalcul du gain dans Collection.
- `game/characters.ts` et `themes.ts` portent les données ; `CharacterArtwork.tsx` sélectionne les six SVG `Dinosaur`, `Lion`, `Monkey`, `Unicorn`, `Rabbit`, `Tiger` et leur variante. Réutiliser ce rendu partagé, préserver identités, palettes et variantes existantes, notamment `normal`.
- `CharacterRewardReveal.tsx` résout les environnements : dinosaure → `HatchingEgg` (dans `HatchingPreview.tsx`), lion → `LionReveal`, singe → `MonkeyBananaReveal`, licorne → `UnicornReveal`, lapin → `RabbitReveal`, tigre → `TigerReveal`.
- Œuf, végétation, bananes, nuages, terrier et hautes herbes sont indépendants des variantes : les révélations reçoivent le personnage/variant en attente. Ajouter une pose ne justifie pas de modifier masques, étapes ou environnement. Les previews isolées ne remplacent pas le parcours de production.
- Vêtements/accessoires/inventaire restent du backlog ; n’introduire aucune architecture d’équipement sans demande explicite.

## Mobile et validation

- Priorité iPhone/iPad portrait, grosses cibles, Pointer Events avec alternative par appui/clavier, focus accessible et aucune dépendance au survol. Respecter `prefers-reduced-motion` ; empêcher sélection/appui long sur le jeu sans empêcher l’édition normale dans Parent.
- Tests ciblés du sous-système et régressions pertinentes : `node --experimental-strip-types --test tests/<fichier>.test.ts`. Playwright (`npm run test:e2e -- tests/browser/<fichier>.spec.ts`) pour interactions et cycles audio ; configuration Chrome à 390 × 844. Isoler le contenu distant dans les fixtures qui exigent le seed local.
- Après modification applicative : `npm run typecheck` et `npm run build` (inclut le typecheck). Pour documentation seule : vérifier exactitude, diff et périmètre ; ne pas lancer de suites inutiles. Rapporter les échecs existants sans les réparer hors tâche.
- Pas d’analyse coûteuse de captures/pixels ou de couverture SVG sauf précision visuelle explicitement requise ; la validation physique iPhone peut être faite par l’utilisateur.
- Développement : `npm run dev` ; réseau local : `npm run dev -- --host 0.0.0.0`, puis adresse LAN et port Vite affiché. Sous PowerShell, utiliser `npm.cmd` si nécessaire.
- Compléments : `docs/architecture-activities.md` et `docs/parent-space.md` décrivent les activités/éditeurs ; vérifier leurs détails contre le code courant, sans les traiter comme un inventaire complet des fonctionnalités.
