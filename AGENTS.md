# Milo apprend — règles permanentes

Les futures modifications importantes doivent respecter ce fichier.

## Mission et expérience
- Application éducative francophone pour un enfant de 6 ans qui apprend à lire.
- Univers joyeux de dinosaures ; interface de jeu, très peu de texte, gros boutons et zones tactiles généreuses.
- Mobile-first, priorité iPhone/iPad en portrait ; aussi utilisable sur ordinateur et au clavier.
- Feedback visuel et sonore doux, aucune punition, aucune publicité, aucun dark pattern.
- Respecter les préférences de réduction des animations. Ne pas dépendre du survol.

## Pédagogie
- L'école guide la progression et le parent est l'autorité sur le contenu disponible.
- Ne jamais générer ou introduire de nouveau contenu pédagogique sans autorisation.
- Une syllabe est une unité configurable : consonne-voyelle ET voyelle-consonne sont possibles.
- Les réponses sont génériques : lettres, syllabes ou mots, de longueur variable et à toute position.
- Garder les données pédagogiques séparées des activités ; ne pas coder les défis dans les composants.
- Les mots connus peuvent contenir des lettres non encore enseignées isolément : ne pas en déduire leur autorisation comme réponses.

## Programme pédagogique : source de vérité
- `src/content/program.ts` est l'unique catalogue initial. Chaque unité a un identifiant stable, une semaine d'introduction et un état `enabled`.
- Les activités ne doivent jamais maintenir leur propre copie du contenu. Passer par `content/service.ts` et son repository ; les composants reçoivent les défis issus de l'adaptateur d'activité.
- Calculer le cumul par semaine d'introduction ; les semaines ne recopient pas les unités antérieures. Les révisions ne contiennent que des références.
- Aucune syllabe ni segmentation française ne doit être générée automatiquement. N'ajouter que les unités explicitement autorisées.
- Aucun contenu futur ou désactivé ne doit apparaître dans les mots, segments référencés ou distracteurs d'un exercice. `content/settings.ts` définit `activeWeek`, indépendamment des scores de l'enfant.
- Ne jamais corriger silencieusement les données du matériel scolaire (notamment graphies, majuscules, accents ou phrases).
- Conserver les mots dont la constructibilité n'est pas confirmée. Un segment littéral est du texte visible, même si sa graphie correspond à une unité future/désactivée. Il ne crée aucune unité, ne devient jamais automatiquement appris et ne peut être ni réponse ni distracteur. Seules les références à des unités apprises et admissibles peuvent être demandées.
- Partager les validations structurées (`severity`, `code`, `path`, `message`) avec les futurs outils Parent. Signaler les avertissements sans bloquer l'application ; écarter les variantes invalides.
- Garder les configurations d'exercice explicites : segmentation choisie, segment manquant, distracteurs référencés et variantes. Les images/audio peuvent être absents.
- Les nouveaux exercices peuvent fournir `missingSegmentIndexes` ; conserver la compatibilité avec `missingSegmentIndex`. Chaque case attend le segment référencé à son index, indépendamment de l'ordre des dépôts. Réussite seulement lorsque toutes les cases sont correctes.
- Les activités génériques `LearningProgram.activities` référencent un mot ou une phrase distincts via `targetId`. Réutiliser la validation et le plateau de correction communs ; ne pas convertir une Sentence en Word. Espaces et ponctuation sont des séparateurs visibles, jamais des réponses. Voir `docs/architecture-activities.md`.
- Distinguer les mots scolaires (`school`) des mots d'entraînement autorisés (`practice`) avec les tags existants.
- Générer une session via `game/complete-word-session.ts` à chaque JOUER/REJOUER : cinq cibles distinctes (Word ou Sentence), environ trois de la semaine d'introduction la plus récente disponible et deux de révision. Une nouvelle variante d'une ancienne cible reste de la révision. La RNG est injectable ; ne pas disperser `Math.random` dans les composants.
- Si moins de cinq mots sont admissibles, raccourcir la session avec un avertissement ; ne jamais répéter un mot ou emprunter du contenu futur pour la remplir.
- L'espace Parent utilise `parent/model.ts` : seed + semaines/unités custom + overrides/activités = programme effectif. Programme décrit les nouveautés de chaque semaine ; Exercices référence Word ou Sentence via targetId/segmentationId. Parent V1.2 expose une seule construction facultative par cible, composée de blocs modifiables/retirables/réordonnables. Les alternatives historiques restent compatibles en interne. Les espaces exacts des phrases viennent du texte original après choix explicite des blocs ; aucune unité n'est inférée. Ne jamais modifier le seed depuis l'interface. `settings.ts` reste le défaut de semaine, l'override Parent est indépendant de la progression enfant.
- Persister uniquement les personnalisations via `services/parent-store.ts`, sans accès direct à localStorage dans les composants. La clé Parent est distincte de la progression enfant, que le reset ne doit jamais effacer. Confirmer suppression custom/reset ; aucun contenu seed n'est supprimable.
- L'éditeur Parent produit des `CompletionActivity`, validées avant sauvegarde. Conserver les IDs des variantes éditées et les IDs stables du contenu custom. Word et Sentence utilisent le même moteur, rendu et service audio, avec lecture de la cible complète. Voir `docs/parent-space.md`.

## Technique et périmètre
- React, TypeScript strict, Vite. Architecture simple, composants raisonnablement petits, éviter les dépendances inutiles et `any`.
- Séparer contenu pédagogique, moteur/activités, stockage/progression.
- Stockage derrière une interface pour permettre IndexedDB puis éventuellement une synchronisation Supabase.
- Préparer une future PWA et un futur emballage Capacitor ; aucun backend ni Capacitor à cette étape.
- Utiliser Pointer Events pour le glissement tactile ; prévoir une alternative par appui/clavier.
- Audio facultatif derrière un service ; l'absence de fichier ne bloque jamais le jeu.
- Pour le prototype, Web Speech prononce le mot complet au début du défi, après une erreur et après réussite, via le service audio uniquement (fr-CA, puis fr-FR, puis français). La réécoute reste disponible pendant tout le défi. Ne jamais prononcer le mauvais segment. Les fichiers audio restent prioritaires. Respecter muet, remplacer la lecture en cours, annuler à la sortie et conserver une pause d'environ 1,9 seconde après réussite.
- Première étape uniquement : accueil, activité `complete-word`, cinq défis, célébration, progression locale.
- Ne pas ajouter comptes, paiement, services payants, reconnaissance vocale, espace parent complet ou autres jeux sans demande.
- Vérifier TypeScript et le build après les modifications ; documenter les commandes et l'accès réseau local.
