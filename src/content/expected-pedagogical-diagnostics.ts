import type { ContentIssue } from './model.ts';

// Audited production warnings (2026-11-12). Exact matches only; changes must be reviewed.
// Presentation baseline, never a substitute for validation or a source of learning content.
export const expectedPedagogicalDiagnostics: readonly ContentIssue[] = [
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "word-vélo.segmentations.initial.segments[0]",
    "message": "Segment « vé » non confirmé : Segment visible hérité du prototype ; syllabe non autorisée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "word-nid.segmentations.initial.segments[1]",
    "message": "Segment « d » non confirmé : Segment visible hérité du prototype ; lettre non autorisée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "word-lit.segmentations.initial.segments[1]",
    "message": "Segment « t » non confirmé : Lettre visible dans ce mot scolaire ; non autorisée comme réponse isolée. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "word-âne.segmentations.initial.segments[0]",
    "message": "Segment « â » non confirmé : Graphie visible dans ce mot scolaire ; non autorisée comme réponse isolée. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-word",
    "path": "word-animal",
    "message": "« animal » conservé ; aucune segmentation fournie, constructibilité non confirmée."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-chat.segmentations.initial.segments[1]",
    "message": "Segment « t » non confirmé : Lettre visible ; non ciblée par cet exercice de syllabe. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-pere.segmentations.initial.segments[0]",
    "message": "Segment « pè » non confirmé : Le p n’est pas encore une unité pédagogique. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-foret.segmentations.initial.segments[2]",
    "message": "Segment « t » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-loup.segmentations.initial.segments[1]",
    "message": "Segment « p » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-bonjour.segmentations.initial.segments[0]",
    "message": "Segment « b » non confirmé : Lettre visible. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-jus.segmentations.initial.segments[1]",
    "message": "Segment « s » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-ballon.segmentations.initial.segments[1]",
    "message": "Segment « l » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-balle.segmentations.initial.segments[1]",
    "message": "Segment « l » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-jument.segmentations.initial.segments[2]",
    "message": "Segment « n » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-jument.segmentations.initial.segments[3]",
    "message": "Segment « t » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-javelot.segmentations.initial.segments[3]",
    "message": "Segment « t » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-buche.segmentations.initial.segments[0]",
    "message": "Segment « bû » non confirmé : Segment visible, non utilisé comme réponse. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-tapis.segmentations.initial.segments[1]",
    "message": "Segment « pis » non confirmé : Segment visible ; non ciblé par cet exercice. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "practice-sapin.segmentations.initial.segments[1]",
    "message": "Segment « p » non confirmé : Lettre visible ; non ciblée par cet exercice. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-poussin.segmentations.initial.segments[1]",
    "message": "Segment « ssin » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-peche.segmentations.initial.segments[0]",
    "message": "Segment « pê » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-poupee.segmentations.initial.segments[1]",
    "message": "Segment « pé » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-zebre.segmentations.initial.segments[1]",
    "message": "Segment « bre » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-pomme.segmentations.initial.segments[0]",
    "message": "Segment « po » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-pomme.segmentations.initial.segments[1]",
    "message": "Segment « mme » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-lapin.segmentations.initial.segments[1]",
    "message": "Segment « p » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  },
  {
    "severity": "warning",
    "code": "unconfirmed-segment",
    "path": "w10-photo-pere.segmentations.initial.segments[0]",
    "message": "Segment « pè » non confirmé : Graphie visible ; unité non enseignée isolément. Conservé comme élément visible uniquement."
  }
];
