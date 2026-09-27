# Architecture des activités — V1.3

## Audit V1.2 et distinctions

L'audit a porté sur les modèles, constructions, activités historiques/Parent, validateurs, adaptateurs, générateur de sessions, fusion, stockage, éditeurs, aperçu, moteur, audio, médias et tests. V1.2 avait déjà un plateau multi-case commun, des références stables, un service de contenu injectable et un service audio indépendant du moteur. Il n'était pas nécessaire de créer un second moteur.

| Concept | Responsabilité | Persistance |
|---|---|---|
| Contenu pédagogique | Ce que Milo apprend : LearningUnit, graphie, audio, introduction, activation | Seed ou customUnits Parent |
| Construction | Blocs explicitement choisis pour décrire la cible | Première Segmentation de Word/Sentence, ou override seed |
| Activité personnalisée | CompletionActivity explicite, cases et distracteurs choisis | activities Parent ; configurations seed conservées |
| Exercice automatique | CompletionActivity dérivée, sans nouveau contenu pédagogique | Non persistée ; seul l'override enabled est enregistré |

La V1.2 acceptait uniquement Word et Sentence comme cibles de complétion. `CompletionTarget` ajoute Syllable. Une syllabe donne un plateau à une case référençant cette même unité ; aucun faux Word, aucune décomposition de syllabe et aucune nouvelle unité. Lettres, mots-outils et sons ne deviennent pas automatiquement des cibles dans cette version.

## Catalogue d'activités

`content/activity-catalog.ts` centralise la projection historique et les variantes dérivées. `parentActivities` reste une projection **explicite** de compatibilité pour les opérations de sauvegarde, suppression et remappage. Les dérivées ne sont jamais transformées en centaines d'activités persistées.

Pour N blocs pédagogiques, la construction principale produit chaque case seule et toutes les cases ensemble : N + 1 variantes si N > 1, une seule si N = 1, zéro si N = 0. Aucun sous-ensemble intermédiaire automatique. Les littéraux/séparateurs ne sont jamais cachés ni introduits dans les choix. Construction absente/invalide : aucun exercice automatique jouable. Les alternatives historiques restent accessibles aux activités explicites, sans réintroduire plusieurs constructions Parent.

Les distracteurs viennent uniquement d'unités existantes, activées et apprises à la semaine considérée. Choix déterministe de deux graphies distinctes au maximum, priorité au type des réponses attendues puis ordre du catalogue. Les graphies des bonnes réponses et les doublons NFC/casse sont exclus. Un seul distracteur suffit si le catalogue est limité ; sans distracteur admissible, pas d'exercice. Aucun contenu n'est inventé. Les validateurs communs contrôlent ensuite chaque variante.

Identité : `generated:<targetId>:<constructionId>:missing:<index-index>`. La construction d'une syllabe utilise `self`. Identité stable entre sessions, refresh et changements de semaine ; pas de RNG. Les index désignent des positions de la construction courante : réordonner une construction conserve les préférences de positions, tandis que recréer une construction avec un nouvel ID crée de nouvelles identités. Ces IDs ne sont pas encore un historique statistique versionné.

Déduplication : cible + séquence exacte des blocs + index manquants triés. Une activité explicite équivalente prend priorité, même désactivée ou temporairement indisponible : sa configuration ne doit pas être contournée par l'automatique. Les distracteurs personnalisés sont donc conservés. Les activités explicites historiques distinctes restent préservées, même si deux configurations ont les mêmes cases ; une session ne choisit jamais deux fois leur cible. Une personnalisation d'une automatique crée un nouvel ID Parent et remplace son équivalent dérivé au prochain calcul ; la supprimer restaure la variante dérivée et son éventuel override.

Les overrides `ParentData.activityEnabled[id]` restent de simples booléens. `effectiveProgram` les transmet au catalogue et applique toujours les overrides des activités explicites. Le mode administration peut présenter les automatiques futures avec leur indisponibilité ; le pool enfant reste strictement borné par activeWeek.

## Phrases et présentation

`Sentence.display` est le texte original du modèle réel (pas de nouveau champ `text`). La reconstruction exacte reste exigée sauf un suffixe terminal manquant composé de `.`, `!`, `?`, `…`, éventuellement combinés et entourés d'espaces. `terminalSuffix` exige que le texte reconstruit soit un préfixe exact : les virgules/apostrophes internes ou les mots manquants ne sont jamais réparés.

`Il + a + lu` et `Il + a + lu + .` sont valides pour `Il a lu.`. L'adaptateur ajoute le suffixe absent comme segment d'affichage, après les blocs. Aucun slot n'y pointe ; il n'entre pas dans les réponses et ne double pas une ponctuation déjà présente. `gaps` reste réservé aux espaces ; `surface` correspond aux graphies des références. Le texte audio n'est pas modifié.

`activityToExercise` et `getCompleteWordChallenges` alimentent toujours CompletionBoard, CompletionLine, placeAnswer, isComplete et les mêmes gestes. Les validations historiques Word restent exécutées. Les champs word/wordId du défi conservent leur nom de compatibilité mais targetType distingue mot, phrase et syllabe.

`Sentence.imageAsset?` réutilise exactement ImageAsset de Word : emoji, src/label ou absence. L'aperçu et l'enfant utilisent WordImage, y compris son fallback. Aucun upload ou cloud.

## Semaine de contenu et semaines d'exercices

`activeWeek` autorise cumulativement le contenu appris, y compris réponses, références et distracteurs. `exerciseScope` sélectionne uniquement les semaines d'introduction des **cibles**. Le service expose ce réglage indépendant ; le générateur le filtre après validation/déduplication du pool.

Par défaut : `{ mode: 'all', selectedWeeks: [] }`. Le mode `selected-weeks` n'affecte jamais Programme, les constructions, les distracteurs ou l'aperçu Parent. Une cible semaine 5 peut demander LA semaine 3 même si seule la semaine 5 est cochée. Une sélection vide ou exclusivement future/inconnue donne zéro défi ; le bouton JOUER est désactivé, sans emprunter de contenu futur. Passer au mode sélectionné initialise la semaine active si aucune préférence n'existe.

Le générateur garde la RNG injectable, cinq textes de cibles distincts, environ trois de la dernière introduction admissible et deux de révision. Si une catégorie manque, il complète avec d'autres cibles distinctes ; si le pool total est insuffisant, il raccourcit avec avertissement. Choisir une seule semaine rend toutes ses cibles admissibles dans cette catégorie. Le filtrage n'est pas une restriction des composants de contenu.

## Audio, persistance et prochaines versions

L'audit du fichier réel a trouvé `SPEECH_RATE = 0.60`, contrairement à l'ancienne documentation évoquant 0.78. La valeur normale reste donc **0.60**. `services/audio-settings.ts` centralise Lente 0.45, Normale 0.60, Rapide 0.78. `readingSpeed?` est persisté ; App configure une fois le service lors du chargement/changement de réglage. Aucun taux ne circule dans les composants de jeu. Pitch/volume restent 1 ; fichiers audio à vitesse relative au débit normal, priorité fichier conservée. Les événements, sélection de voix françaises, déclenchement direct dans le geste, muet et annulation/remplacement sont conservés.

Même clé `milo-apprend.parent.v1`, même version 2 ; champs optionnels `exerciseScope`, `readingSpeed` et imageAsset Sentence. Lecture V1 toujours disponible. Les anciennes données sans champs gardent révision complète et débit actuel. Le store contrôle les nouveaux champs ; aucune purge, migration destructive ni modification de la progression enfant. Les constructions et activités existantes gardent leurs IDs.

Tentatives : placeAnswer retourne accepted/complete ; le composant a un compteur d'erreurs destiné au feedback, remis à zéro après un placement accepté. Ce n'est pas un bilan de défi. Pour la future version, prévoir un accumulateur d'événements par activityId (tentative, erreur, aide, réussite) et un stockage dédié ; aucune modification nécessaire au moteur maintenant, aucun scoring ajouté.

Synchronisation : le service actuel gère start/end/error, sans repères de blocs. La spécification Web Speech décrit boundary aux frontières de mots/phrases et charIndex/elapsedTime lorsque le moteur les fournit ; elle ne garantit pas des frontières de syllabes pédagogiques. On ne peut donc pas déduire une synchronisation syllabique fiable de ces événements seuls. Une future solution devra vérifier les voix/appareils ou employer des enregistrements annotés et exposer les repères via l'abstraction audio. Aucun délai arbitraire ni surlignage ajouté. Source : [spécification Web Speech, événements de synthèse](https://webaudio.github.io/web-speech-api/#speechsynthesisutterance-events).

Les réponses restent réutilisables, aucun mode multicible, personnage, police, backend ou nouvelle animation. Voir [parent-space.md](parent-space.md) pour les parcours et [rapport-v1.3.md](rapport-v1.3.md) pour les validations finales.
