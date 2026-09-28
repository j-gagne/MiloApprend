# Profil enfant local

Le profil réutilise `Progress` et `progressStore` : `playerName` (facultatif),
`selectedCharacterId` et le compteur existant `completedSessions` restent dans
la même clé `milo-apprend.progress.v1`. Aucun stockage parallèle ni migration destructive.

Le sélecteur de personnage permet de modifier les deux choix puis de confirmer
avec « Continuer ». Le prénom est trimé, non vide, limité à 20 caractères Unicode
(points de code), sans changement de casse ni suppression d’accents. Retour/Échap
annule les changements non confirmés. Un échec de sauvegarde laisse le profil
actif en mémoire et affiche le message existant de sauvegarde indisponible.

Les anciennes sauvegardes sans prénom, ou avec un prénom invalide, utilisent
« Milo » ; personnage et progression restent conservés. Le prénom est prérempli
à la réouverture et persiste après refresh, partie, rejeu et retour à l’accueil.

`App` fournit le prénom aux textes existants : salut de l’accueil, encouragement
du compagnon, titre de la célébration existante et références au joueur dans
l’espace Parent. La marque « Milo apprend » et la phrase fixe du diagnostic
audio restent inchangées. Aucun accès direct à localStorage dans les composants.

Limite : un seul profil par navigateur/appareil, sans compte ni synchronisation.
