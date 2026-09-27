# Rapport V1.3 — Milo apprend

## 1. Audit V1.2

AGENTS.md et les deux documents demandés ont été lus avant les modifications. Inspection du contenu, constructions, activités, fusion Parent, store, validateurs, adaptateurs, session, audio, médias, éditeurs, aperçu, moteur et tests. Le moteur commun et l'abstraction audio étaient adaptés ; ils sont conservés. La limitation des cibles Word/Sentence a été étendue proprement aux syllabes. Le débit réel était 0.60, contrairement à la valeur citée dans la documentation précédente.

## 2. Quatre concepts distincts

Contenu = unité apprise. Construction = blocs pédagogiques ou visibles explicitement choisis. Activité persistée = configuration personnalisée/initiale. Variante automatique = exercice dérivé de cette construction, sans nouvel enregistrement. Voir [architecture](architecture-activities.md).

## 3. Génération standard

Chaque bloc pédagogique seul, puis tous ensemble ; une seule variante si un bloc, aucune si zéro. LILA et LAVAGE donnent chacun trois variantes. Quatre blocs donnent cinq variantes. Pas de puissance combinatoire. Les distracteurs sont choisis de façon déterministe parmi le contenu existant autorisé, avec préférence au type des réponses, sans doublon de graphie ni bonne réponse camouflée.

## 4. Identité

`generated:<targetId>:<constructionId>:missing:<indexes>` ; construction `self` pour une syllabe. Aucun ID aléatoire par session. Ces IDs représentent les positions de la construction courante ; une nouvelle construction avec nouvel ID crée de nouvelles variantes.

## 5. Déduplication

Comparaison cible/blocs/index manquants, indépendamment des distracteurs et de l'ID de construction. L'explicite équivalent prend priorité, même désactivé. Les activités explicites historiques ne sont pas supprimées. Une seule variante par texte de cible est retenue en session.

## 6. Overrides

Même map `activityEnabled`. Une désactivation automatique n'écrit qu'un booléen, pas une copie de l'exercice. La préférence survit au refresh ; la construction reste disponible. Personnaliser crée une activité Parent explicite, qui masque ensuite l'automatique équivalente.

## 7. Syllabes

Syllable devient une CompletionTarget distincte : retrouver la syllabe entière dans une case, avec distracteurs existants. Pas de faux Word et aucune syllabe fabriquée. Les lettres et sons ne deviennent pas des cibles automatiques dans cette version.

## 8. Word

Construction principale valide : variantes immédiates. Sans construction : contenu valide, sans exercice automatique. Les variantes seed, constructions historiques alternatives et activités Parent restent compatibles.

## 9. Sentence

Même moteur, validation, gestes, plateau, aperçu et audio de la phrase complète. Sentence.display reste le texte original. Les phrases peuvent exister sans construction et sans média.

## 10. Ponctuation

Suffixe exact `.`, `!`, `?`, `…`, combinaisons simples et espaces finaux acceptés sans bloc obligatoire. Le moteur restitue le suffixe en affichage uniquement. Ancien bloc point toujours valide, aucun double point. Ponctuation interne et mots manquants restent contrôlés.

## 11. Blocs déjà utilisés

Masqués à l'ajout, sauf activation explicite de « Afficher les éléments déjà utilisés ». Le bloc en cours d'édition reste accessible. LA + LA, réordonnancement et littéraux restent possibles.

## 12. Semaines d'exercices

Révision complète par défaut. Le mode sélectionné filtre seulement la semaine d'introduction des cibles. Aucun filtre sur les blocs antérieurs, distracteurs ou éditeurs. Sélection vide/future : zéro défi et explication, sans introduction de contenu futur.

## 13. Générateur de session

Programme effectif → catalogue explicite/automatique → validation activeWeek → filtre exerciseScope → regroupement des cibles → tirage RNG injectable. Cinq cibles distinctes si possible, environ trois récentes/deux révisions, puis complément ou session raccourcie si nécessaire. Les sessions de référence V1.2 restent testées avec les nouvelles variantes désactivées via les overrides publics ; les sessions V1.3 testent le pool complet.

## 14. Vitesse audio

Valeurs centralisées dans `services/audio-settings.ts` : Lente 0.45, Normale **0.60**, Rapide 0.78. Défaut réel conservé, pitch/volume inchangés à 1. Le service applique le réglage aux lectures du jeu et de l'aperçu, avec bouton d'exemple et persistance. Les appels synchrones depuis les gestes iOS, sélection de voix, annulation/remplacement et muet restent conservés.

## 15. Média Sentence

Réutilisation d'ImageAsset et WordImage : aucun média, emoji ou src/label. Éditeur Parent, stockage, fusion, aperçu et enfant compatibles. Aucun upload ou cloud.

## 16. Synchronisation future et tentatives

Aucune synchronisation simulée. Le service n'expose actuellement que la lecture complète et ses événements. Web Speech prévoit des frontières de mots/phrases, pas un alignement syllabique garanti : une future implémentation devra vérifier les événements réels ou s'appuyer sur des enregistrements annotés. [Spécification Web Speech](https://webaudio.github.io/web-speech-api/#speechsynthesisutterance-events).

Le compteur d'erreurs actuel sert à l'animation et se remet à zéro après une bonne réponse partielle ; ce n'est pas une statistique complète. Le résultat accepted/complete du moteur permet une future collecte d'événements par activité. Aucun scoring ni adaptation intrusive ajouté.

## 17–21. Validation

- Tests unitaires : **161 réussis**, dont 44 nouveaux.
- Tests navigateur : **46 réussis**, dont 7 nouveaux.
- Production : **27 contrôles réussis** (20 scénarios V1.2 + 7 nouveaux), servis depuis dist sur le port 4174. Largeurs 390 et 1280 px, plus les petits écrans et gestes des scénarios historiques.
- TypeScript : **réussi**, y compris la configuration de tests existante. Captures de production mobile/desktop inspectées ; aucun débordement horizontal détecté par les scénarios.
- `npm run build` : **réussi**. Aucun lint configuré.

## 22. Fichiers

Ajoutés : `src/content/activity-catalog.ts`, `src/services/audio-settings.ts`, `tests/v13.test.ts`, `tests/helpers/explicit-service.ts`, `tests/browser/legacy-speech-mock.ts`, `tests/browser/v13.spec.ts`, `tests/browser/sentence-media.spec.ts`, ce rapport.

Modifiés : `src/content/{model,construction,service,validation}.ts`, `src/game/{complete-word,complete-word-content,complete-word-session,completion-content}.ts`, `src/parent/{model,activities}.ts`, `src/services/{audio,parent-store}.ts`, `src/App.tsx`, `src/components/CompleteWord.tsx`, les composants Parent ActivityEditor, ActivityPreview, ConstructionEditor, Exercises, ParentSpace, UnitEditor et parent.css.

Tests adaptés : completion, construction, content, parent-programme, parent, session ; navigateur audio, construction-helpers, construction, game, mobile, multiple-slots, parent-programme, parent. Aucun test retiré. Configuration production : playwright.production.config.ts (serveur neuf sur 4174, tenant compte du chemin /MiloApprend/). Documentation : AGENTS.md, README.md, parent-space.md, architecture-activities.md.

## 23. Migration et compatibilité

Clé Parent identique, version 2 avec champs facultatifs, lecture V1 conservée. Les anciennes sauvegardes reçoivent les valeurs par défaut à l'utilisation, sans purge ni réécriture automatique. Aucun changement de progression enfant. Constructions, mots, phrases et activités existantes conservés. Seed `program.ts` inchangé, SHA-256 : `BBA58E717C2C320193A8B8F3CA9A52AFA483236EB68F0BB92655E1284A54965A`.

## 24. Limites restantes

Le son physique iPhone n'est pas vérifiable par les tests automatisés (Web Speech simulé). Les adresses d'images doivent rester accessibles ; pas de copie cloud. Les préférences restent propres au navigateur et à l'adresse utilisée. Les distracteurs automatiques restent une règle simple et sont personnalisables. Les constructions alternatives Parent, consommation de réponses, statistiques complètes, synchronisation audio/blocs, personnages et mode multicible ne sont pas implémentés. Le garde-fou de durée audio existant est conservé ; tester les longues phrases à vitesse lente sur appareil.

## Commandes et accès

```sh
npm run typecheck
npm test
npm run test:e2e -- --workers=3 --reporter=line
npm run build
npm run test:e2e -- --config=playwright.production.config.ts tests/browser/construction.spec.ts tests/browser/parent-programme.spec.ts tests/browser/parent.spec.ts tests/browser/multiple-slots.spec.ts tests/browser/v13.spec.ts tests/browser/sentence-media.spec.ts --workers=3 --reporter=line
```

Réseau local vérifié HTTP 200 : **http://192.168.2.182:5173/MiloApprend/**. Laisser le serveur et l'ordinateur allumés, ouvrir la même adresse sur iPhone connecté au réseau local. Le build de production est servi sur **http://192.168.2.182:4174/MiloApprend/**. Le précédent serveur 4173 conservait une ancienne configuration de chemin et retournait 404 pour les nouveaux fichiers ; les validations utilisent le serveur neuf.
