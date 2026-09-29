# Personnages SVG et œufs

Le catalogue `src/game/characters.ts` reste la source des identités, noms, thèmes d’interface, profils vocaux et métadonnées visuelles. Il est indépendant de React pour rester utilisable par le stockage et l’audio.

`visual: { kind: 'svg', component: 'rabbit', happyExpression: true }` désigne un composant dans `components/CharacterArtwork.tsx`. `Character` fournit le conteneur accessible et l’animation existante. `happyExpression` active l’expression interne sans ajouter l’animation propre au SVG Dinosaure aux animations déjà existantes. Dinosaur.tsx est inchangé.

Rabbit.tsx utilise le viewBox 0 0 340 300 : oreilles verticales, formes arrondies, yeux avec reflets, museau crème, petites pattes. Corps #c6c0b7, ventre/museau #f6f0e4, oreilles/joues #e5b1bd, nez #cf929f, détails #3f4643, pattes #d6cfc3. L’état happy modifie bouche et bras dans le même dessin.

Les palettes complètes des œufs sont dans `game/egg-themes.ts`. Le Dinosaure reprend exactement les anciennes couleurs. Le Lapin utilise une coquille ivoire, des taches taupe et des accents rose poudré. HatchingEgg résout le personnage et eggTheme, conserve une seule géométrie, les masques, fissures, animations et végétation. Aucun ajustement de position par espèce n’est nécessaire.

Les trois personnages non encore illustrés conservent leurs emojis existants. Leur rendu d’éclosion utilise ce visuel temporaire et la palette d’œuf par défaut; aucune illustration supplémentaire n’est créée.

## Persistance

Les profils existants stockent déjà selectedCharacterId (rabbit, dinosaur, etc.), jamais un emoji : aucune migration nécessaire. Les IDs et récompenses sont conservés.

Le premier œuf est initialisé à la première session terminée avec le personnage sélectionné. Ensuite CONTINUER à 5/5 initialise l’œuf suivant à 0/5 avec le personnage sélectionné à cet instant. Dès son initialisation, pendingAnimalId ne change plus, même si le profil change de personnage. Cela inclut les anciens œufs à 0/5 déjà enregistrés. Les récompenses conservent { id, animalId, hatchedAt }; deux Lapins restent deux instances.

## Ajouter le prochain SVG

1. Créer le composant SVG React, API happy et viewBox compatibles.
2. Définir sa palette EggTheme dans game/egg-themes.ts et associer visual/eggTheme à son entrée existante dans game/characters.ts.
3. Importer/enregistrer son composant dans CharacterArtwork.tsx, puis vérifier les cinq étapes dans la prévisualisation.

Aucun changement requis dans HatchingEgg, la sélection, le stockage, les sessions ou la logique de récompenses.

Prévisualisation : `?preview=hatching`, sélectionner l’animal puis État 1 à 5. Les contrôles ne modifient ni profil ni récompense.

Lion.tsx suit le même chemin : corps #dcb77d, visage/pattes #e5c38c, crinière #bd925f, crème #f6e9ca, détails #3f4643, joues #dfa891. Sa palette lionEggTheme est enregistrée dans le catalogue. Le sélecteur de prévisualisation le découvre automatiquement. Seule la règle de dimensionnement SVG existante a été étendue à .lion; aucun moteur ni masque n’a changé.
