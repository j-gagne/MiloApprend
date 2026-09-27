# Lecture audio pédagogique segmentée

Le bouton **Mot** conserve la lecture normale. **Découpe** est une aide volontaire :
chaque bloc pédagogique de la construction est lu séparément, puis le mot complet.
La lecture automatique, les erreurs et les réussites continuent à prononcer
normalement la cible visible. L'aide ne compte pas comme erreur et ne change pas
les étoiles ni la progression, en individuel comme en chaîne.

## Source pédagogique et admissibilité

`content/segmented-reading.ts` expose `getSegmentedReading`. L'adaptateur
`complete-word-content.ts` lui transmet la construction explicite utilisée par
l'exercice et le programme effectif, incluant les personnalisations Parent.
Tous les blocs sont considérés dans leur ordre, pas uniquement les slots manquants.
Aucune segmentation n'est déduite de l'orthographe.

Une lecture est proposée seulement pour une cible Word disponible avec une
construction complète et valide, des références pédagogiques disponibles et
au moins un bloc lisible. Les erreurs de construction, références manquantes,
futures ou désactivées rendent l'aide indisponible.

- AMI : `audioText(A)` → `audioText(MI)` → `audioText(AMI)`.
- LAMA : `audioText(LA)` → `audioText(MA)` → `audioText(LAMA)`, même avec deux slots.
- LAVAGE avec literal « ge » : lecture normale uniquement. « ge » ne devient
  jamais une unité, une réponse ou un bloc appris.
- Phrase et cible syllabe : lecture normale uniquement dans cette version.

Un literal contenant des lettres ou d'autres signes prononçables bloque l'aide ;
espaces et ponctuation seuls peuvent être ignorés si la construction reste valide.
`audioText` est prioritaire ; `display` sert de repli s'il est vide/absent.

## Exécution et pauses

`services/audio-sequence.ts` ordonnance des lectures distinctes. Il ne connaît
pas Web Speech. `gameAudio.playSegmented` réutilise l'adaptateur existant : voix
française disponible, priorité fr-CA / fr-FR / autre fr, vitesse Parent, pitch 1,
volume 1. La vitesse normale reste 0.60.

Chaque bloc utilise une utterance distincte ; aucun texte artificiel « a-mi »
ou « a ... mi ». Après la fin réelle d'un bloc :

- `SEGMENT_PAUSE_MS = 400` entre blocs ;
- `WHOLE_WORD_PAUSE_MS = 600` avant le mot complet.

Ces constantes sont centralisées dans `audio-sequence.ts`. Pour le mot complet,
un fichier audio déjà configuré conserve sa priorité. Aucun nouveau fichier ajouté.
La première lecture de la séquence part directement du geste utilisateur, sans
attendre une Promise ni un timer avant `speak()`.

## Annulation

`stop()` invalide la séquence, efface sa pause éventuelle et arrête la lecture
courante. Un nouvel appui Découpe, une lecture normale, une tentative de réponse,
le muet, la sortie ou la transition ne peuvent laisser reprendre les anciens blocs.
La promesse annulée est résolue pour ne pas bloquer le jeu. Le garde-fou existant
interrompt une lecture sans événement de fin.

Après réussite, une réécoute Découpe bénéficie de la même attente de fin et du
délai de transition existants. Les boutons sont désactivés lorsque le son est coupé.

## Limites et validation

La prononciation isolée dépend de la voix et de l'appareil : une lettre peut être
lue comme son nom et certaines syllabes peuvent sembler artificielles. Les pauses
sont ajoutées après les événements de fin ; leur durée réelle dépend aussi du
navigateur. WebKit peut restreindre la lecture différée : la première utterance
reste lancée depuis le tap, mais un essai sur iPhone physique reste nécessaire.
Sans synthèse/voix française disponible, le jeu demeure utilisable.

Tests ciblés : `tests/segmented-audio.test.ts`, `tests/browser/segmented-audio.spec.ts`.
Ils couvrent admissibilité, audioText, utterances, pauses, vitesse, annulation,
transitions, muet, score inchangé et affichage mobile. Régressions : audio normal,
diagnostic iOS, CompleteWord et gestes multi-slot. Aucun audio cloud, highlight,
lecture segmentée de phrase ou réglage Parent supplémentaire.
