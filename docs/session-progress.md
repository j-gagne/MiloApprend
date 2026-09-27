# Session, progression et performance

- **TARGET** : exercice pédagogique Word, Sentence ou Syllable admissible ; une
  unité de progression et au maximum une étoile, même avec plusieurs slots.
- **CHAIN** : regroupement de cibles successives partageant une banque. Une seule
  cible est visible à la fois. Une chaîne ne constitue pas une question unique.
- **SESSION** : ensemble des cibles sélectionnées en une fois pour la partie.

## Sélection et réglages

Parent → Réglages propose le mode, **Nombre de questions par partie : 3 / 6 / 9**,
et en mode chaîne **Nombre de cibles par chaîne : 2 / 3**.
`questionCount` est un champ optionnel de la sauvegarde Parent existante, même clé
et version. Sans valeur enregistrée : **6**, aucun ancien réglage Parent équivalent
n'existait. Mode par défaut : individuel ; longueur de chaîne par défaut : 3.
La lecture accepte aussi les entiers de 1 à 9, notamment 5 pour compatibilité,
sans ajouter ces choix à l'interface.

`play-session.ts` demande le total au générateur existant, avec environ 60 % de
cibles récentes. Il conserve l'admissibilité, les overrides et les filtres de
semaines. Il sélectionne les cibles distinctes une seule fois, puis les découpe :
6 en chaînes de 3 → `[3,3]`, 5 en chaînes de 3 → `[3,2]`, 5 en chaînes de 2 → `[2,2,1]`.
Une dernière chaîne peut donc contenir une seule cible, sans duplication.

Si le contenu manque, la session est raccourcie au nombre réellement disponible.
Tous les dénominateurs utilisent ce nombre. Avec une seule cible disponible pour
toute la session, le repli individuel existant est conservé. Avec zéro : JOUER
reste désactivé.

## Trois notions distinctes

1. **Progression locale** : points `○ / ●`, uniquement en mode chaîne, nombre de
   cibles terminées dans la chaîne actuelle. Elle repart à zéro à la prochaine chaîne.
2. **Progression globale** : barre de parcours et `completedTargets / totalTargets`.
   Elle avance immédiatement après chaque cible réussie, avant la transition.
3. **Performance** : `⭐ perfectTargets / totalTargets`. Une cible parfaite a été
   terminée sans aucune tentative incorrecte. Les étoiles ne servent plus à
   représenter la progression ou le nombre de parties terminées.

`game/session-progress.ts` est commun aux deux modes. Il conserve uniquement les
compteurs globaux, le compteur d'erreurs courant et un verrou de cible terminée.
`completeTarget` est idempotent : ni double réponse, ni réécoute ne redonnent d'étoile.
`nextTarget` réinitialise les erreurs courantes, pas les étoiles de la partie.
Les données de performance restent en mémoire ; seul le compteur préexistant de
parties terminées reste persisté. Aucun historique de performance n'est ajouté.

## Erreurs et feedback

Seul un placement refusé par la validation existante incrémente le compteur
d'erreurs de la cible. Un placement partiel correct ne l'efface jamais.
Retrait volontaire, déplacement/remplacement correct, annulation de glissement
et réécoute ne sont pas des erreurs. Un déplacement vers un slot incorrect reste
une tentative incorrecte selon le moteur existant.

La réussite sans erreur affiche une étoile dans le feedback existant et ajoute
une étoile au total. Après erreur, le même « Bravo ! » positif apparaît sans
ajout d'étoile ; l'enfant avance normalement, sans message de punition.
La célébration finale affiche le nombre d'exercices terminés et le score réel.
Les trois étoiles décoratives et le badge d'étoile automatique de fin ont été
retirés pour éviter un deuxième sens à la récompense.

Une consommation tactile est traitée uniquement par `pointerup` ; le clic
synthétique suivant ne peut pas soumettre une autre tuile déplacée à sa place.
Le handler `click` conserve les activations clavier/accessibilité.

## Banques et audio

Individuel : nouvelle banque par cible, avec les distracteurs actuels.
Chaîne : une banque issue des slots de ses cibles, sans distracteur par défaut.
Les occurrences restent consommées entre cibles ; chaque nouvelle chaîne possède
une nouvelle banque et aucun placement hérité de la précédente.
`chain.ts` et `answer-bank.ts` restent inchangés.

Audio : moteur inchangé, uniquement la cible visible, même délai de feedback et
lecture initiale depuis JOUER pour iOS. Seed, constructions, médias et police inchangés.

## Validation et limites

Tests ciblés : `tests/session-progress.test.ts`, `tests/browser/session-progress.spec.ts`.
Les tests de chaîne, gestes, audio et sessions sont adaptés aux nouveaux réglages
et indicateurs, sans suite complète historique ni audit général.

Validation effectuée : **38 tests unitaires** et **29 scénarios navigateur distincts**
réussis (ciblés + régressions enfant/session), puis typecheck/build finaux réussis.

```sh
node --experimental-strip-types --test tests/session-progress.test.ts tests/chain.test.ts tests/answer-bank.test.ts tests/complete-word.test.ts tests/session.test.ts
npm run test:e2e -- tests/browser/session-progress.spec.ts tests/browser/chain.spec.ts tests/browser/session.spec.ts tests/browser/multiple-slots.spec.ts tests/browser/game.spec.ts tests/browser/audio.spec.ts --workers=1 --reporter=line
npm run typecheck
npm run build
```

Le score n'est ni conservé après rechargement ni affiché dans un dashboard Parent.
Aucun objet, avatar, monnaie, niveau ou nouveau système de récompenses.
La validation tactile utilise Chromium mobile ; aucun iPhone physique n'est piloté.
