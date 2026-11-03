# Segments muets

`silent: true` est une annotation d'occurrence, jamais une propriété globale d'une lettre. Son absence conserve le comportement historique. `literal` ne signifie pas muet.

Dans les constructions (`segmentations[].segments`), les références et les littéraux peuvent porter ce drapeau :

```json
{"id":"initial","segments":[{"unitId":"syllable-ru"},{"unitId":"letter-e","silent":true}]}
```

Le bloc reste visible. Complète ne peut pas le masquer, l'utiliser comme distracteur dans cette construction, ni le lire isolément. Une activité explicite devenue incompatible reste enregistrée mais indisponible avec un diagnostic. La même lettre reste admissible dans les autres mots. Les positions de Spell restent indépendantes.

Je lis conserve son propre découpage : `segmentUnitIds` accepte toujours les chaînes et accepte maintenant des références annotées. Aucun découpage n'est déduit de la construction de Complète.

```json
{"unitId":"practice-rue","segmentUnitIds":["syllable-ru",{"unitId":"letter-e","silent":true}]}
```

La graphie entière est vérifiée avant projection. Le morceau muet conserve sa place, sans curseur ni exigence de complétion. Une unité entièrement muette est refusée. Les curseurs par ligne des phrases sont conservés.

Les étapes de `readingSequence` audio acceptent également `silent: true`. La lecture automatique omet les blocs muets ; une séquence explicite omet ses étapes annotées ainsi que les références correspondant sans ambiguïté à un bloc muet. Les textes audio libres ne sont jamais associés à un bloc par leur prononciation. Le mot complet reste lu normalement.

Les sauvegardes Parent conservent les annotations, sans migration ni écrasement des personnalisations. Les valeurs de `silent` autres que `true` ou l'absence sont invalides.

Le catalogue partagé se trouve dans `j-gagne/MiloApprend-Content/program.json`. Déployer le support applicatif avant de publier des références Je lis sous forme d'objets : les anciennes versions ne reconnaissent que les chaînes.
