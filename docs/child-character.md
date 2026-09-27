# Personnage enfant

`src/game/characters.ts` centralise `characterCatalog`, `CharacterId` et
`ChildCharacter` : Dinosaure, Lion, Singe, Tigre, Licorne. Tous sont disponibles.
Le dinosaure réutilise le SVG existant ; les autres sont des émojis temporaires,
sans téléchargement ni dépendance. `Character.tsx` isole leur rendu pour permettre
de remplacer les visuels sans changer la sélection ou le stockage.

À l'accueil, **CHOISIR MON PERSONNAGE** ouvre une grille de cinq grands boutons.
Chaque bouton affiche son nom ; le personnage choisi porte une coche « Ton ami »
et `aria-pressed`. Un appui sauvegarde puis retourne à l'accueil. Clavier, bouton
Retour et Échap sont pris en charge ; le focus revient au bouton d'ouverture.

La préférence `selectedCharacterId` est ajoutée au stockage enfant existant
`milo-apprend.progress.v1`, via `services/progress.ts`. Aucune nouvelle clé ni
préférence Parent. Les anciennes sauvegardes et les IDs inconnus utilisent le
dinosaure, en conservant le compteur de parties terminées. Terminer une partie
conserve le personnage. Si le stockage est bloqué, le choix reste actif en mémoire
et un message discret le signale à l'accueil.

Le personnage apparaît à l'accueil, près du parcours global, comme compagnon
pendant le défi et à la célébration. Sa position est exclusivement calculée par
`completedTargets / totalTargets`, dans les deux modes, après **chaque cible**.
Les compteurs de progression/performance et les points locaux de chaîne restent
inchangés. Les étoiles n'influencent jamais la position.

Une réussite déclenche un bond de 650 ms, y compris après une erreur : complétion
et performance restent distinctes. `prefers-reduced-motion` désactive le mouvement
et le bond, mais conserve la nouvelle position.

Tests : `tests/characters.test.ts` et `tests/browser/characters.spec.ts`, puis
régressions ciblées App/session. Les émojis dépendent du système ; les illustrations
définitives pourront les remplacer. Aucun niveau, inventaire, déblocage, accessoire,
récompense ou historique ajouté. Vérification tactile automatisée sous Chromium
mobile, sans appareil iPhone physique.
