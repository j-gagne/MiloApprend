# Milo apprend

Une petite aventure de lecture en français pour un enfant de 6 ans, accompagné d'un dinosaure. Première version : accueil, cinq défis « Complète le mot », célébration et compteur d'aventures enregistré sur cet appareil. Aucun compte ni service externe.

## Lancer le projet

Prérequis : Node.js 22.18+ (ou Node.js 24) et npm. Depuis le dossier du projet :

```sh
npm install
npm run dev
```

Ouvrir **http://localhost:5173**. Dans PowerShell, si `npm.ps1` est bloqué, utiliser `npm.cmd install` puis `npm.cmd run dev` ; il n'est pas nécessaire de modifier la politique d'exécution.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Le build est dans `dist/`. Le serveur de prévisualisation utilise le port 4173. Documentation de référence : [Vite](https://vite.dev/guide/).

`npm run test:e2e` lance les tests de navigateur Playwright avec Google Chrome installé localement (canal `chrome`). Ils couvrent une partie complète, les gestes tactiles simulés, la souris, le clavier, la sauvegarde et son indisponibilité. Les captures sont dans `test-results/` (ignoré par Git). Cette simulation ne remplace pas un essai sur un véritable iPhone/iPad avec Safari.

## Tester sur iPhone ou iPad

Le serveur Vite écoute sur `0.0.0.0` au port fixe 5173. Connecter les appareils au même Wi-Fi et ouvrir dans Safari l'adresse `Network` affichée au démarrage, par exemple `http://192.168.1.25:5173`. Laisser le serveur et l'ordinateur allumés. `ipconfig` permet de retrouver l'adresse IPv4 du Wi-Fi.

Si l'accès échoue, vérifier que le réseau n'isole pas ses clients et que le pare-feu Windows autorise Node.js sur le réseau privé. Ne pas exposer ce serveur de développement sur Internet.

À vérifier d'abord : écouter le mot proposé, toucher le haut-parleur pour le réécouter, puis glisser la bonne réponse. Vérifier le bouton muet, essayer une mauvaise réponse, terminer les cinq mots puis rejouer. Un simple appui fonctionne aussi ; au clavier, utiliser Tab puis Entrée/Espace. Le bouton de son coupe la voix et le carillon. Le bouton du logo revient à l'accueil, arrête la voix et abandonne la série en cours. Le défilement tactile reste normal en dehors des blocs ; un geste commencé sur un bloc sert au glissement.

## Structure

- `AGENTS.md` : règles durables du projet.
- `src/content/model.ts` et `program.ts` : modèle typé et catalogue scolaire et entraînement des semaines 2 à 5.
- `src/content/service.ts`, `repository.ts`, `selectors.ts`, `validation.ts` : accès, cumul et diagnostics de contenu.
- `src/content/settings.ts` : semaine autorisée (`activeWeek = 5`).
- `src/game/complete-word.ts` : modèle générique, validation et évaluation des réponses.
- `src/game/complete-word-content.ts` : conversion des variantes autorisées en défis, sans copie du contenu.
- `src/components/` : activité, blocs tactiles avec Pointer Events et dinosaure SVG original.
- `src/services/` : stockage isolé et audio facultatif.
- `src/App.tsx` : accueil, navigation simple et célébration.
- `src/styles.css` : présentation responsive et animations avec réduction du mouvement.
- `public/manifest.webmanifest` : première préparation PWA.
- `tests/` : invariants pédagogiques et moteur.

## Contenu et progression

Le programme pédagogique est la source de vérité. Il contient 83 unités explicites : 11 lettres, 44 syllabes, 21 mots (12 scolaires et 9 d'entraînement), 3 mots-outils (`à`, `il`, `Il`) et 4 phrases. Les modèles distinguent aussi les sons ; aucun son ou alphabet supplémentaire n'est inventé. Chaque unité fournit `id`, `type`, `display`, `audioText`, `introducedInWeek`, `enabled` et éventuellement des tags/assets. Les mots ont en plus `text`, leurs segmentations et leurs configurations d'exercice.

`contentService.getAvailableLetters(week)`, `getAvailableSyllables(week)`, `getAvailableWords(week)`, `getAvailableToolWords(week)` et `getAvailableSentences(week)` cumulent uniquement les unités activées introduites jusqu'à la semaine demandée. Sans argument, ils utilisent `activeWeek`. Les observations répétées sont référencées par `reviewedUnitIds` : ni duplication ni nouvelle autorisation. La progression enregistrée de l'enfant reste dans `services/progress.ts` et n'active jamais de contenu.

Flux : composants → adaptateur d'activité → service de contenu → repository → programme initial. Le repository fournit actuellement un instantané TypeScript ; un futur chargement IndexedDB pourra alimenter ce même contrat au démarrage, sans l'introduire dans le moteur du jeu. Les anciens fichiers `learning.ts` et `challenges.ts` ont été remplacés.

Chaque segmentation possède un identifiant et une liste explicite de références `{ unitId }`. Un segment non confirmé peut être conservé sous forme `{ literal, note }` : c'est le cas de « vé » et « d », visibles mais jamais utilisables comme réponses. Les autres mots sans segmentation fournie restent au catalogue ; aucune découpe n'est devinée. Leurs avertissements n'empêchent pas de jouer.

Un mot devient jouable seulement si une variante `completeWord` valide précise `segmentationId`, `missingSegmentIndexes` (ou sa forme historique `missingSegmentIndex`) et `distractorUnitIds`. `answerPosition` préserve l'ordre des choix, `order` celui du catalogue avant sélection aléatoire. Plusieurs variantes/segmentations sont possibles, avec `availableFromWeek` facultatif ; `enabled: false` désactive une variante. Les distracteurs sont toujours des références à des unités autorisées. Les cinq exercices initiaux (lune, lama, ami, vélo, nid) conservent leurs segments et choix. Si une semaine a moins de cinq mots jouables, la session est raccourcie avec un avertissement, sans répétition ; sans variante valide, JOUER est désactivé et aucun contenu futur n'est emprunté.

`validateProgram` et `validateCompleteWordVariant` retournent des diagnostics `{ severity, code, path, message }` sans lancer d'exception. Les références absentes, identifiants dupliqués, semaines invalides, unités futures/désactivées et mauvaises configurations sont détectés. Les variantes invalides sont écartées. Le programme initial produit cinq avertissements attendus de segmentation non confirmée (vé, d, t, â et animal), aucune erreur ; ils sont affichés dans la console développeur. Un futur espace Parent pourra réutiliser ces fonctions.

Pour ajouter manuellement une **semaine 6** : ajouter `{ number: 6, label: 'Semaine 6' }` dans `initialProgram.weeks`, puis uniquement les nouvelles unités fournies par l'école dans `units`, avec des identifiants stables et `introducedInWeek: 6`. Référencer les unités déjà connues sans les recopier. Pour les nouveaux mots jouables, fournir explicitement une segmentation et une variante `completeWord` avec des distracteurs autorisés. Lancer `npm test` et `npm run build`, puis régler `activeWeek` à `6` dans `src/content/settings.ts` lorsque le parent l'autorise. Ne pas modifier les activités ni le stockage de progression.

Le mot complet est prononcé à l'apparition de chaque défi, après chaque mauvaise réponse et après réussite. Le haut-parleur permet de le réécouter pendant tout le défi, en respectant muet. Une nouvelle demande remplace la lecture en cours via le même service audio. La première lecture est lancée directement depuis JOUER/REJOUER, après montage de l'écran, pour conserver le geste utilisateur sur iPhone. Les lectures d'erreur n'énoncent jamais le segment erroné.

Une réponse peut être une lettre, une syllabe ou un mot ; la position et la longueur sont configurables. Les syllabes sont des unités explicites, y compris voyelle-consonne. Aucune combinaison nouvelle n'est produite. L'école guide la progression ; le parent autorise le contenu. Les segments « vé » et « d » restent visibles dans les mots connus et ne deviennent pas des réponses isolées.

Une nouvelle sélection est générée à chaque JOUER ou REJOUER. Une bonne réponse reste affichée au moins 1,9 seconde, et jusqu'à la fin de la prononciation si elle prend plus de temps (garde-fou de 4,5 secondes en cas d'absence d'événement audio). Réécouter relance cette pause. Cinq œufs deviennent des étoiles, puis restent visibles dans la célébration finale. Les erreurs font rebondir doucement le bloc sans enlever de point ni bloquer un nouvel essai. Seules les séries terminées incrémentent le compteur. `localStorage` conserve ce compteur (clé `milo-apprend.progress.v1`), avec repli en mémoire si le stockage est indisponible. Chaque navigateur/adresse conserve sa propre progression. L'interface `ProgressStore` isole ce choix ; un passage futur à IndexedDB demandera une adaptation asynchrone de ce service et de son consommateur, sans toucher au moteur du mini-jeu.

Pour ajouter une prononciation enregistrée, placer le fichier dans `public/audio/` puis renseigner `audioAsset: '/audio/lune.mp3'` dans le mot du programme. L'adaptateur transmet `audioText` à la synthèse et `audioAsset` au lecteur. `imageAsset` accepte `{ emoji, label }`, `{ src, label }` ou `null` ; une image absente ou impossible à charger utilise un pictogramme de remplacement. Aucun fichier vocal n'est fourni : le service audio utilise temporairement `speechSynthesis` avec priorité fr-CA, fr-FR, puis une autre voix dont la langue commence par fr. Il sélectionne uniquement un objet réellement retourné par `getVoices()`. Sans voix française disponible, il ignore la prononciation et signale la raison dans le diagnostic ; il ne suppose plus l'existence de fr-CA. Le fichier reste prioritaire s'il existe, avec repli vocal en cas d'erreur (cette erreur asynchrone peut perdre l'activation utilisateur sur iOS). L'API absente ou défaillante ne bloque pas le jeu ; le moteur pédagogique ne dépend pas de Web Speech. Aucun service payant ou SDK externe n'est ajouté.

Les voix sont celles proposées par le navigateur/appareil et peuvent varier. Le service les prépare depuis JOUER, les actualise à leur chargement et lance la prononciation directement depuis le geste de réussite/réécoute. Références : [getVoices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices) et [voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event). Les tests audio automatisés simulent ces API : la qualité et l'audibilité de la voix restent à écouter dans Safari sur l'iPhone réel.

## Catalogue jouable et sessions

À `activeWeek = 5`, 20 mots sont jouables, avec 22 variantes :

- **school**, 11 mots : lune, lama, ami, vélo, nid, lime, sale, vis, os, lit, âne.
- **practice**, 9 mots : menu, mule, mime, mine, mémé, olive, salive, savane, salami.

Le douzième mot scolaire, **animal**, reste au catalogue sans exercice. **Savane** et **lama** possèdent chacun deux variantes ; la seconde variante de lama cache les deux segments. Les syllabes autorisées par le parent sont déclarées explicitement, sans générateur de combinaisons ; les syllabes inversées sont conservées.

`src/game/complete-word-session.ts` fournit `generateCompleteWordSession(service, { random, strategy })`. Chaque JOUER/REJOUER génère cinq mots distincts : trois de la semaine d'introduction la plus récente parmi les mots admissibles, deux plus anciens, puis mélange leur ordre. La catégorie dépend de l'introduction du mot, pas de sa variante. Si une catégorie manque de candidats, l'autre complète la sélection. Les tirages successifs peuvent partager des mots.

La stratégie centralisée est `{ size: 5, recentCount: 3 }`. La RNG injectable retourne un nombre dans `[0, 1)` ; `Math.random` est le défaut du générateur uniquement. Avec la RNG déterministe de `tests/helpers/random.ts` :

- seed 1 : lama, savane, salami, menu, âne ;
- seed 42 : os, ami, âne, mime, mine.

En développement uniquement, ouvrir `http://<adresse-IP-du-PC>:5173/?debugContent=1`, puis JOUER. Le diagnostic affiche le mot, sa source, sa semaine d'introduction, sa segmentation et le segment manquant. Il est absent du parcours normal et du build de production.

## Limites volontaires de cette étape

### Diagnostic audio temporaire sur iPhone

Ouvrir `http://<adresse-IP-du-PC>:5173/?debugAudio=1`, toucher **JOUER**, puis faire défiler jusqu'à **Diagnostic audio temporaire**. Le panneau n'existe pas dans l'interface sans cette valeur exacte du paramètre.

- **TEST AUDIO** : prononce « Bonjour Milo » sans imposer de voix ni de langue, afin de tester le moteur du navigateur indépendamment de la sélection française.
- **TEST VOIX FR** : prononce le même texte avec la meilleure voix française réellement énumérée. Sans voix française, le panneau le signale et aucun appel `speak()` n'est fait.
- Les deux tests respectent le bouton muet. Ils appellent `speak()` dans la même pile d'appel que le clic, sans `await`, Promise ou timer préalable, et sans démarrer Web Audio.
- Le panneau affiche la disponibilité, le nombre de voix, les noms/langues français, la voix de la dernière tentative, muted, le texte, l'heure et le numéro de tentative, l'activation utilisateur et les événements `onstart`, `onend`, `onerror` avec leur code/message lorsqu'ils existent. Le journal conserve les 20 dernières entrées en mémoire, sans transmission ni sauvegarde.
- Les voix sont inspectées immédiatement, sur `voiceschanged`, puis à 250 ms, 1 s et 2,5 s pour les chargements tardifs sans événement. Ces inspections ne déclenchent jamais de lecture différée : retoucher le bouton après leur arrivée.
- Une synthèse en pause est reprise avant la lecture. `cancel()` est réservé aux lectures actives/en attente ; le mute et la sortie arrêtent toujours une lecture active.
- `no-french-voice` et `timeout` sont des diagnostics de l'application, pas des erreurs WebKit. Le délai de garde vaut 10 s pour les boutons de test, 4,5 s pour les mots du jeu. `speak()` seul ne signifie pas que la lecture a démarré ; même `onstart`/`onend` ne prouvent pas l'audibilité du haut-parleur.

Si le silence persiste, relever les résultats des deux boutons, la voix sélectionnée, muted et les dernières lignes du journal. Les tests automatisés valident les appels et simulent les événements : ils ne peuvent pas confirmer le son physique d'un iPhone. Le code précédent utilisait déjà un exécuteur de Promise synchrone ; sa présence seule n'expliquait donc pas une perte du geste utilisateur. Référence de l'audit : [gestion des gestes, de speak et de cancel dans WebKit](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/SpeechSynthesis.cpp).

### Périmètre

Le manifeste, l'icône et les couleurs préparent une future PWA. Il n'y a pas encore de service worker, de mode hors ligne garanti ou de jeu complet d'icônes iOS/installation. Leur validation, HTTPS et Capacitor viendront dans une autre étape. Un espace Parent local est disponible. Pas de backend, compte, synchronisation ou autre mini-jeu. Les illustrations des mots sont des emoji système, dont le rendu varie selon l'appareil.

## Architecture des activités

L'audit et les contrats de compatibilité sont décrits dans [docs/architecture-activities.md](docs/architecture-activities.md). Les 21 variantes historiques restent compatibles ; LAMA ajoute une variante à deux cases. Les configurations de phrases sont préparées et testées sans ajouter de mini-jeu.

## Espace Parent local

Depuis l’accueil, toucher **Parents**, recopier les trois chiffres écrits en lettres, puis Valider. **Programme** permet de créer des semaines, lettres, syllabes, mots et phrases ; chaque semaine affiche seulement ses nouveautés. Chaque mot ou phrase peut avoir une **construction facultative**, composée de blocs de contenu appris ou de texte visible. **Exercices** crée, modifie ou duplique plusieurs activités pour la même cible. Les phrases utilisent le moteur et l’audio existants. Les changements Parent persistent séparément du seed et des aventures enfant ; les anciennes sauvegardes restent lisibles.

Le reset confirmé efface uniquement les personnalisations Parent. Les données sont propres au navigateur et à l’adresse du site ; aucun transfert entre appareils. Voir [docs/parent-space.md](docs/parent-space.md) pour les détails, le stockage et les limites de cette V1.

## Espace Parent V1.3

Une construction explicite valide produit maintenant ses exercices standards automatiquement, sans sauvegarder toutes les variantes. Exercices distingue les automatiques et les personnalisés ; Réglages ajoute le choix des semaines pratiquées et la vitesse de lecture. Les phrases acceptent une ponctuation finale absente des blocs et le même média facultatif que les mots. Le seed et les sauvegardes existantes sont conservés.

Voir le [guide Parent](docs/parent-space.md), l'[architecture V1.3](docs/architecture-activities.md) et le [rapport de validation](docs/rapport-v1.3.md). La vitesse normale réellement présente au début de V1.3 était 0.60 : elle reste le défaut.
