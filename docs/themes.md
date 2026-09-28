# Thèmes des personnages

`src/game/themes.ts` définit les palettes ; chaque entrée du catalogue des
personnages possède sa palette `theme`. `themeVariables` expose les propriétés
CSS `--theme-*` sur la racine du document. Les valeurs de repli CSS sont exactement
celles du Dinosaure, également conservées dans `dinosaurTheme`.

Le personnage sauvegardé reste la seule préférence persistante. Dans le sélecteur,
un choix temporaire pilote l'aperçu. Confirmer conserve le personnage ; Retour,
Échap ou Accueil restaure le thème sauvegardé sans écrire de nouvelle préférence.

Seules les couleurs décoratives changent. Les formes, espacements, animations,
visuels des personnages et couleurs de feedback, erreurs, réussite, récompenses,
slots interactifs et focus clavier restent inchangés. Parents hérite des couleurs
principales et conserve ses états fonctionnels.

Les captures de référence Dinosaure ont été prises avant modification, en Chrome
Windows à 390 et 1280 pixels de largeur. La comparaison accepte seulement 1/255
d'arrondi sur un canal aux contours anticrénelés. Les tests couvrent aussi les
contrastes texte/boutons/cartes et le parcours de jeu individuel et en chaîne.

## Palette complète

Chaque ligne correspond à une variable CSS `--theme-<nom>`.

| Variable | Dinosaure | Lion | Singe | Tigre | Licorne |
|---|---|---|---|---|---|
| text | #284c43 | #513c24 | #49382d | #4d302b | #473652 |
| background | #f8f6eb | #fff8e9 | #faf4eb | #fff3ea | #f9f3fc |
| primary | #628859 | #a26727 | #876248 | #ad5535 | #825a9b |
| surface | #fffef7 | #fffdf4 | #fffaf3 | #fffaf3 | #fffaff |
| surface-soft | #eef0e3 | #f8e8c2 | #eee0cb | #f8ddcc | #eadff4 |
| brand-soft | #e1e9cc | #f8e8c2 | #eee0cb | #f8ddcc | #eadff4 |
| border | #dce2cd | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| card-border | #e6e7d7 | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| bubble-border | #e5e7d7 | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| sound-surface | #fffdf5 | #fffdf4 | #fffaf3 | #fffaf3 | #fffaff |
| sound-border | #dce0d0 | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| muted | #677b6d | #766044 | #716151 | #78584d | #705e7c |
| eyebrow | #607b61 | #766044 | #716151 | #78584d | #705e7c |
| note | #6c7c66 | #766044 | #716151 | #78584d | #705e7c |
| pill-text | #62775b | #766044 | #716151 | #78584d | #705e7c |
| footer | #597254 | #766044 | #716151 | #78584d | #705e7c |
| footer-accent | #8da46c | #a26727 | #876248 | #ad5535 | #825a9b |
| hint | #697b63 | #766044 | #716151 | #78584d | #705e7c |
| celebration-text | #64795c | #766044 | #716151 | #78584d | #705e7c |
| accent | #ebba58 | #efbd60 | #dcb582 | #eea06b | #dfb6da |
| accent-text | #354633 | #513c24 | #49382d | #4d302b | #473652 |
| accent-edge | #c8963c | #b47e30 | #a37a4c | #b46a40 | #aa7ca8 |
| accent-small | #bb872b | #b47e30 | #a37a4c | #b46a40 | #aa7ca8 |
| title-dot | #d8a648 | #b47e30 | #a37a4c | #b46a40 | #aa7ca8 |
| sparkle | #d7a33b | #b47e30 | #a37a4c | #b46a40 | #aa7ca8 |
| hill-back | #e5ebd3 | #f4e8c9 | #eee3d3 | #f5dece | #eee1f5 |
| hill-front | #d9e4c9 | #eed6a6 | #e3cdb3 | #edc5a8 | #dfccea |
| plant | #8ca981 | #c29b5b | #af8d68 | #bb835f | #aa87bd |
| plant-soft | #adbc91 | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| stone | #b9be9a | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| control-soft | #dcecc8 | #f8e8c2 | #eee0cb | #f8ddcc | #eadff4 |
| control-border | #a8bf8c | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| selection-border | #bacfa6 | #d9bf8b | #cbb498 | #d9ad92 | #c7b1d7 |
| selection-surface | #eef4e5 | #f8e8c2 | #eee0cb | #f8ddcc | #eadff4 |
| progress | #6d9866 | #a26727 | #876248 | #ad5535 | #825a9b |
| progress-strong | #456f40 | #513c24 | #49382d | #4d302b | #473652 |
| tile-one | #f3d995 | #f6dba0 | #ebcfaa | #f5c8a1 | #ecd0e6 |
| tile-one-border | #e4c474 | #dfbb73 | #cfac7f | #dfa97b | #d3add0 |
| tile-one-edge | #cfb06b | #c59c58 | #b18b5d | #bd8155 | #b78fb4 |
| tile-text | #4a5033 | #513c24 | #49382d | #4d302b | #473652 |
| tile-two | #dfebcf | #f8e8c2 | #eee0cb | #f8ddcc | #eadff4 |
| tile-two-edge | #9db487 | #c29b5b | #af8d68 | #bb835f | #aa87bd |
| tile-three | #f2d8c9 | #f5dfcc | #f1dcd1 | #efd6c5 | #f7dfe9 |
| tile-three-border | #e1bbaa | #dfb99a | #d6b6a6 | #d6b299 | #dfbacb |
| tile-three-edge | #c69f8e | #bf9474 | #b99581 | #b68a6e | #c297ac |
| drag-surface | #f5dc9f | #f6dba0 | #ebcfaa | #f5c8a1 | #ecd0e6 |
