# Mode chaîne de cibles

## Modes et session

- **Cibles individuelles** (défaut) : session de 3, 6 ou 9 cibles demandées,
  une banque par cible, avec ses distracteurs.
- **Chaîne de cibles** : une chaîne de deux ou trois cibles successives partage une
  banque. Une seule cible est affichée et manipulable à la fois.
- **Cible** : l'exercice Word, Sentence ou Syllable sélectionné, avec ses slots.
- **Chaîne** : cibles sélectionnées, banque d'occurrences et placements validés.
- **Session** : partie complète, même nombre total de cibles dans les deux modes.
  Les cibles sont ensuite regroupées en chaînes, avec une nouvelle banque par chaîne.
  Les points locaux, le parcours global et les étoiles de performance sont distincts.
  Voir [session-progress.md](session-progress.md) pour le modèle et les réglages actuels.

`play-session.ts` enveloppe le générateur existant sans modifier ses règles
d'admissibilité ni sa RNG injectable. La stratégie demande le total configuré avec
environ 60 % de contenu récent. Le regroupement existant évite les variantes
d'une même cible et les textes dupliqués. Tous les réglages Parent, activations,
constructions effectives et filtres de semaines restent appliqués en amont.

Une demande de trois avec deux cibles disponibles devient une chaîne de deux.
Avec une seule cible, la session revient au défi individuel avec ses distracteurs.
Avec zéro cible, JOUER reste désactivé. Aucune cible n'est dupliquée pour remplir.

## Banque et validation

`chain.ts` crée la banque avant JOUER depuis les **slots des exercices sélectionnés** :
une occurrence par slot, avec son texte et son type de réponse déjà fournis par
l'adaptateur. ID unique `target-{index}-slot-{segmentIndex}`. Deux LA ont deux IDs.
Ni orthographe, ni construction alternative, ni syllabification ne sont inférées.
Une phrase demandant VO + NI produit ces deux occurrences ; un literal comme
« ge » n'en produit aucune.

La mécanique `answer-bank.ts` reste inchangée : placement accepté → occurrence
indisponible ; retrait → restitution ; remplacement accepté → ancienne occurrence
restituée. Une erreur laisse l'inventaire intact. La validation des slots reste
identique, donc une réponse incorrecte ne remplace pas une réponse correcte.

Pendant le feedback positif, les réponses sont verrouillées. Après le délai et la
lecture existants, `advanceChain` valide les placements puis conserve leurs IDs
consommés pour les prochaines cibles. La banque originale reste le même objet ;
seule sa vue disponible est filtrée. La cible suivante reçoit le reste de la banque.
La réussite dépend de toutes les cibles validées, **jamais d'une banque vide**.

Le mode chaîne n'ajoute aucun distracteur par défaut et ne requiert pas de
distracteur dans sa banque. `createChain` accepte techniquement des occurrences
supplémentaires ; aucune interface de configuration n'est ajoutée. Des éléments
restants ne bloquent pas la fin. L'admissibilité des exercices sources conserve
les validations pédagogiques existantes.

## Réglages, affichage et audio

Parent → Réglages : `gameMode` = `individual` / `chain`, `chainLength` = 2 / 3.
Champs optionnels dans la sauvegarde Parent existante, même clé et version.
Anciennes sauvegardes : mode individuel, longueur 3. Le réglage de longueur est
visible uniquement en mode chaîne. Aucun changement du seed ou des overrides.
Les syllabes de deux lettres restent désactivées comme cibles par défaut, et
deviennent admissibles si le Parent active leur exercice.

Le composant enfant conserve son rendu, ses interactions et son service audio.
JOUER lance directement la première lecture pour iOS ; la lecture automatique,
la réécoute et les feedbacks concernent uniquement la cible courante. La prochaine
cible est prononcée après son apparition. Aucun moteur ni réglage audio modifié.
Les médias Word/Sentence sont conservés ; aucune image pour une cible syllabe.
La banque commune se replie sur plusieurs lignes, avec la police enfant existante.

## Vérifications

- `tests/chain.test.ts` : réglages/compatibilité, sélection, occurrences, retraits,
  remplacements, validation, transitions, phrases/literals, fin, overrides/filtres.
- `tests/browser/chain.spec.ts` : chaîne complète souris/tactile/clavier,
  une cible visible, audio courant, banque persistante, replay, syllabe sans image,
  largeur mobile et réglages Parent persistants.
- Régressions ciblées : moteur de correction, occurrences, sessions, parcours
  enfant, multi-slot, audio et médias de phrases ; typecheck et build.

Résultat : 10 tests unitaires chaîne + 21 tests unitaires de régression réussis ;
5 tests navigateur chaîne + 18 tests navigateur de régression réussis.
`npm run typecheck` et `npm run build` réussis.

Commandes de test (Windows : utiliser `npm.cmd` si nécessaire) :

```sh
node --experimental-strip-types --test tests/chain.test.ts
node --experimental-strip-types --test tests/complete-word.test.ts tests/answer-bank.test.ts tests/session.test.ts
npm run test:e2e -- tests/browser/chain.spec.ts --workers=1 --reporter=line
npm run test:e2e -- tests/browser/game.spec.ts tests/browser/multiple-slots.spec.ts tests/browser/session.spec.ts tests/browser/audio.spec.ts tests/browser/sentence-media.spec.ts --workers=1 --reporter=line
```

## Limites

Deux ou trois cibles par chaîne, éventuellement moins dans la dernière chaîne.
Pas de séries configurables, de nouvelle récompense ou de distracteurs configurables.
L'état de chaîne est autonome et réutilisable pour de futures séries, mais aucune
interface de séries n'est développée. Les gestes tactiles sont testés par Chromium
mobile ; cela ne remplace pas une vérification matérielle sur iPhone/Safari.
