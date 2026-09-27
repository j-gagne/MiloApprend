# Espace Parent V1.3

## Du contenu aux exercices

**Programme → contenu → construction explicite → exercices automatiques.** Exercices permet ensuite l'activation et les personnalisations. Le gate Parent et les quatre onglets restent inchangés.

Une construction facultative unique reste visible pour chaque mot/phrase. Ajouter, modifier, retirer et réordonner les blocs fonctionne comme en V1.2. Les unités déjà présentes sont masquées lors d'un ajout ; cocher **Afficher les éléments déjà utilisés** permet volontairement LA + LA. Le bloc en cours de modification reste sélectionnable. Les textes visibles sont toujours disponibles et jamais des réponses.

- **LILA = LI + LA** : trouver LI, trouver LA, construire le mot.
- **LAVAGE = LA + VA + ge** : trouver LA, trouver VA, construire le mot. `ge` reste visible.
- **SOLEIL sans construction** : contenu valide, aucun exercice automatique de complétion.
- **Nouvelle syllabe** : un exercice pour retrouver cette unité entière, sans créer un mot artificiel.
- **Il a lu. = Il + a + lu** : les exercices deviennent disponibles ; le point final vient de la phrase. L'ancienne construction contenant le point reste valide, sans doublon.

Aucune lettre, syllabe, mot ou segmentation française n'est inventé. Seules les variantes de cases à partir des blocs explicitement autorisés sont dérivées. Une construction de quatre blocs pédagogiques donne cinq variantes, pas quinze.

## Exercices

Les listes distinguent **Exercices automatiques** et **Exercices personnalisés** (dont les configurations initiales). Désactiver « Construire le mot » conserve les variantes individuelles et la construction ; ce choix survit au refresh. La préférence stockée est seulement un booléen associé à l'ID déterministe de la variante.

**Personnaliser l'exercice** ouvre un brouillon prérempli avec un nouvel ID Parent. Après sauvegarde, il remplace l'automatique équivalente, avec ses propres distracteurs et activations. Supprimer cette personnalisation permet à l'automatique de réapparaître. Les configurations explicitement enregistrées restent modifiables et duplicables ; leur désactivation n'est pas contournée par une copie automatique.

**+ Nouvel exercice** garde le parcours manuel Word/Sentence. Si la construction manque, **Définir la construction** ouvre le même éditeur que Programme. Les variantes standards seront alors disponibles, même si le parent annule la configuration manuelle proposée ensuite. Les syllabes automatiques sont personnalisables depuis leur carte.

Les exercices futurs peuvent être consultés dans Parent et restent indiqués indisponibles tant que le contenu n'est pas appris. Une construction incorrecte, une référence désactivée ou l'absence de distracteur admissible ne produit pas de variante automatique jouable. Les anciens exercices explicites invalides restent visibles avec leurs raisons.

## Réglages

**Semaine active** détermine tout le contenu appris cumulativement. **Exercices à pratiquer** détermine uniquement les cibles sélectionnées pour une partie :

- **Révision complète** (défaut compatible avec les anciennes sauvegardes).
- **Semaines sélectionnées**, avec cases à cocher.

Une cible de semaine 5 peut employer LA de semaine 3 même si semaine 3 n'est pas cochée. Programme, les constructions et les éditeurs restent accessibles indépendamment du filtre. Une sélection vide ou uniquement future ne propose aucune partie et l'indique ; il faut choisir une semaine apprise. Aucun contenu futur n'est emprunté.

**Vitesse de lecture** propose Lente, Normale et Rapide, puis **Écouter un exemple**. La valeur normale conserve la valeur réellement présente avant V1.3 : 0.60. Les valeurs centralisées sont 0.45 / 0.60 / 0.78 dans `services/audio-settings.ts`. Le réglage survit au refresh et agit sur mots, phrases, erreurs, réussites et réécoutes. Muet et remplacement de la lecture restent identiques.

## Média des phrases

Les phrases Parent disposent maintenant des mêmes médias facultatifs que Word : emoji ou adresse d'image, avec le texte comme libellé. Saisir l'un remplace l'autre ; vider le champ retire le média. Le média est visible dans l'aperçu interactif et le défi enfant. Une phrase sans média reste valide. Pas d'upload ni de stockage cloud ; une adresse d'image doit rester accessible depuis l'appareil.

## Compatibilité et sauvegarde

La clé reste **milo-apprend.parent.v1**, JSON version 2. Les nouveaux champs sont facultatifs :

```json
{
  "exerciseScope": { "mode": "selected-weeks", "selectedWeeks": [5] },
  "readingSpeed": "normal",
  "activityEnabled": { "generated:parent-word-lavage:main:missing:0-1": false }
}
```

Les unités/constructions/activités V1 et V2 sont conservées, ainsi que leurs IDs et les alternatives historiques internes. Les constructions du seed restent des overrides ; le fichier program.ts n'est pas modifié. Le reset confirmé efface les personnalisations, jamais **milo-apprend.progress.v1**. Un stockage bloqué laisse les changements en mémoire avec avertissement. Aucune demande de vider localStorage.

Les blocs visibles `{ literal, note }`, pédagogiques `{ unitId }`, `gaps` et `surface` gardent leur représentation V1.2. Seul le suffixe terminal exact `. ! ? …` ou leur combinaison peut être fourni par la phrase originale. La ponctuation interne reste obligatoire. L'audio garde le texte intégral original.

## Validation et limites

Les tests couvrent les anciens parcours, les exercices dérivés, leurs overrides, les semaines, la vitesse, les médias, les sessions et les sauvegardes. Les scénarios de gestes/audio historiques utilisent des préférences Parent désactivant les nouvelles variantes afin de conserver leur séquence de référence ; les tests V1.3 et de sessions vérifient le pool complet par défaut. Aucun ancien test n'a été supprimé.

Voir [rapport-v1.3.md](rapport-v1.3.md) pour les résultats et commandes. Les tests navigateur simulent Web Speech ; l'écoute réelle reste à confirmer sur l'iPhone. Le stockage reste local à l'adresse et au navigateur utilisés. Le garde-fou de durée audio existant reste inchangé ; les phrases longues nécessitent toujours une vérification sur appareil.

Plusieurs constructions Parent, banque consommable, scoring, synchronisation syllabique, plusieurs cibles simultanées et personnages ne font pas partie de cette version. Les fondations et leurs limites sont décrites dans [architecture-activities.md](architecture-activities.md).
