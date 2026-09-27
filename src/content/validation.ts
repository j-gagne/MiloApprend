import type { CompletionActivity, CompletionParameters, CompleteWordVariant, ContentIssue, LearningProgram, LearningUnit, Segmentation, Word } from './model.ts';
import { missingIndexes } from './model.ts';
import { isValidWeek } from './selectors.ts';
import { comparableText } from './text.ts';
import { activitySegmentation } from './activity-segmentation.ts';
import { displayConstruction, blockText } from './construction.ts';
import type { CompletionTarget } from './model.ts';

export function isAnswerUnit(unit: LearningUnit): boolean {
  return ['letter', 'syllable', 'word', 'tool-word'].includes(unit.type);
}

function issue(code: string, path: string, message: string, severity: ContentIssue['severity'] = 'error'): ContentIssue {
  return { severity, code, path, message };
}

function referenceIssues(program: LearningProgram, id: string, week: number, path: string): ContentIssue[] {
  const matches = program.units.filter((unit) => unit.id === id);
  if (matches.length !== 1) return [issue(matches.length ? 'duplicate-id' : 'unknown-reference', path,
    `${id} : ${matches.length ? 'identifiant ambigu' : 'unité inexistante'}.`)];
  const unit = matches[0];
  if (!isValidWeek(program, unit.introducedInWeek)) return [issue('invalid-week', path, `${id} : semaine d'introduction invalide.`)];
  if (!unit.enabled) return [issue('disabled-reference', path, `${id} est désactivé.`)];
  if (unit.introducedInWeek > week) return [issue('future-reference', path,
    `${id} introduit en semaine ${unit.introducedInWeek}, non autorisé en semaine ${week}.`)];
  return [];
}

export function validateSegmentation(program: LearningProgram, word: CompletionTarget, segmentation: Segmentation, week: number): ContentIssue[] {
  const path = `${word.id}.segmentations.${segmentation.id}`;
  const issues: ContentIssue[] = [];
  const from = segmentation.availableFromWeek ?? word.introducedInWeek;
  if (!isValidWeek(program, from) || from < word.introducedInWeek) issues.push(issue('invalid-week', path, 'Semaine de segmentation invalide.'));
  if (from > week) issues.push(issue('future-segmentation', path, `Segmentation disponible à partir de la semaine ${from}.`));
  if (!segmentation.segments.length) issues.push(issue('empty-segmentation', path, 'Segmentation vide.'));
  for (const [index, segment] of segmentation.segments.entries()) {
    const segmentPath = `${path}.segments[${index}]`;
    if ('unitId' in segment) {
      issues.push(...referenceIssues(program, segment.unitId, week, segmentPath));
      const unit = program.units.find((item) => item.id === segment.unitId);
      if (unit) {
        if (!isAnswerUnit(unit)) issues.push(issue('invalid-segment-type', segmentPath, `${unit.id} n'est pas une unité de segmentation.`));
      }
    } else if ('separator' in segment) {
      if (!segment.separator || !/^[\s\p{P}]+$/u.test(segment.separator)) {
        issues.push(issue('invalid-separator', segmentPath, 'Un séparateur contient uniquement espaces ou ponctuation.'));
      }
    } else {
      issues.push(issue('unconfirmed-segment', segmentPath,
        `Segment « ${segment.literal} » non confirmé : ${segment.note} Conservé comme élément visible uniquement.`, 'warning'));
      if (!segment.literal || !segment.note.trim()) issues.push(issue('invalid-literal', segmentPath, 'Un segment non confirmé doit fournir sa graphie et une note.'));
    }
  }
  if (segmentation.gaps && (segmentation.gaps.length !== segmentation.segments.length + 1
    || segmentation.gaps.some((gap) => !/^\s*$/u.test(gap)))) issues.push(issue('invalid-spacing', path, 'Espaces de construction invalides.'));
  if (segmentation.surface && (segmentation.surface.length !== segmentation.segments.length
    || segmentation.surface.some((text, i) => comparableText(text) !== comparableText(blockText(program, segmentation.segments[i]))))) {
    issues.push(issue('invalid-surface', path, 'Les graphies doivent correspondre aux blocs choisis.'));
  }
  const reconstructed = displayConstruction(program, word, segmentation);
  if (word.type === 'sentence' ? reconstructed !== word.display : comparableText(reconstructed) !== comparableText(word.display)) {
    issues.push(issue('segmentation-mismatch', path, `Construction incomplète : le résultat « ${reconstructed} » ne correspond pas à ${word.display}.`));
  }
  return issues;
}

export function validateCompleteWordVariant(program: LearningProgram, word: Word, variant: CompleteWordVariant, week: number): ContentIssue[] {
  const path = `${word.id}.completeWord.${variant.id}`;
  const issues = referenceIssues(program, word.id, week, path);
  if (!variant.id || word.completeWord?.filter((item) => item.id === variant.id).length !== 1) {
    issues.push(issue('unknown-variant', path, 'Variante absente, vide ou ambiguë dans le mot.'));
  }
  if (word.text !== word.display) issues.push(issue('word-display-mismatch', path, 'text et display doivent représenter le même mot.'));
  const matches = word.segmentations.filter((item) => item.id === variant.segmentationId);
  if (matches.length !== 1) return [...issues, issue('unknown-segmentation', path, `Segmentation « ${variant.segmentationId} » absente ou ambiguë.`)];
  const segmentation = matches[0];
  return [...issues, ...validateCompletion(program, word, segmentation, variant, week, path)];
}

function validateCompletion(program: LearningProgram, word: CompletionTarget, segmentation: Segmentation,
  variant: CompletionParameters, week: number, path: string): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (variant.enabled === false) issues.push(issue('disabled-exercise', path, 'Cette variante est désactivée.'));
  if (!isValidWeek(program, week)) issues.push(issue('invalid-week', path, `Semaine active ${week} invalide.`));
  const from = variant.availableFromWeek ?? segmentation.availableFromWeek ?? word.introducedInWeek;
  if (!isValidWeek(program, from) || from < (segmentation.availableFromWeek ?? word.introducedInWeek)) {
    issues.push(issue('invalid-week', path, 'Semaine de variante invalide.'));
  }
  if (from > week) issues.push(issue('future-exercise', path, `Variante disponible à partir de la semaine ${from}.`));
  issues.push(...validateSegmentation(program, word, segmentation, week));
  const indexes = missingIndexes(variant);
  if (variant.missingSegmentIndex !== undefined && variant.missingSegmentIndexes !== undefined) {
    issues.push(issue('ambiguous-missing-index', path, 'Fournir un index historique OU une liste, jamais les deux.'));
  }
  if (!indexes.length || new Set(indexes).size !== indexes.length) {
    issues.push(issue('invalid-missing-index', path, 'Les emplacements doivent être non vides et distincts.'));
  }
  const answers: string[] = [];
  for (const index of indexes) {
    const missing = segmentation.segments[index];
    if (!Number.isInteger(index) || index < 0 || !missing) {
      issues.push(issue('invalid-missing-index', path, 'Position du segment manquant invalide.'));
    } else if (!('unitId' in missing)) {
      issues.push(issue('unconfirmed-answer', path, 'Seule une unité référencée peut devenir une réponse.'));
    } else answers.push(missing.unitId);
  }
  if (variant.distractorUnitIds.length === 0) issues.push(issue('missing-distractors', path, 'Au moins un distracteur autorisé est nécessaire.'));
  // Plusieurs cases peuvent attendre la même unité ; le choix reste réutilisable.
  const choiceIds = [...variant.distractorUnitIds, ...new Set(answers)];
  const displays = new Set<string>();
  for (const id of choiceIds) {
    issues.push(...referenceIssues(program, id, week, `${path}.choices`));
    const unit = program.units.find((item) => item.id === id);
    if (unit) {
      if (!isAnswerUnit(unit)) issues.push(issue('invalid-answer-type', path, `${id} ne peut pas être une réponse.`));
      if (displays.has(comparableText(unit.display))) issues.push(issue('duplicate-choice', path, `Réponse « ${unit.display} » dupliquée.`));
      displays.add(comparableText(unit.display));
    }
  }
  const position = variant.answerPosition ?? 0;
  if (!Number.isInteger(position) || position < 0 || position > variant.distractorUnitIds.length) {
    issues.push(issue('invalid-answer-position', path, 'Position de la bonne réponse invalide.'));
  }
  return issues;
}

export function validateCompletionActivity(program: LearningProgram, activity: CompletionActivity, week: number): ContentIssue[] {
  const path = `activities.${activity.id}`;
  const issues = referenceIssues(program, activity.targetId, week, path);
  if (!activity.id || (program.activities ?? []).filter((item) => item.id === activity.id).length !== 1) {
    issues.push(issue('unknown-activity', path, 'Activité absente ou ambiguë dans le programme.'));
  }
  const target = program.units.find((unit) => unit.id === activity.targetId);
  if (!target || (target.type !== 'word' && target.type !== 'sentence' && target.type !== 'syllable')) {
    return [...issues, issue('invalid-target', path, 'La cible doit être un mot, une phrase ou une syllabe.')];
  }
  const segmentation = activitySegmentation(program, activity);
  if (target.type === 'word' && target.text !== target.display) issues.push(issue('word-display-mismatch', path, 'text et display doivent représenter le même mot.'));
  if (!segmentation) return [...issues, issue('unknown-segmentation', path, 'Construction absente, ambiguë ou introuvable dans la cible.')];
  return [...issues, ...validateCompletion(program, target, segmentation, activity, week, path)];
}

export function validateProgram(program: LearningProgram): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const ids = new Set<string>();
  const weeks = new Set<number>();
  for (const week of program.weeks) {
    if (!Number.isInteger(week.number) || week.number < 1 || weeks.has(week.number)) {
      issues.push(issue('invalid-week', 'weeks', `Semaine invalide ou dupliquée : ${week.number}.`));
    }
    weeks.add(week.number);
    for (const id of week.reviewedUnitIds ?? []) issues.push(...referenceIssues(program, id, week.number, `weeks.${week.number}.reviewedUnitIds`));
  }
  for (const unit of program.units) {
    if (!unit.id || ids.has(unit.id)) issues.push(issue('duplicate-id', unit.id, `Identifiant vide ou dupliqué : « ${unit.id} ».`));
    ids.add(unit.id);
    if (!isValidWeek(program, unit.introducedInWeek)) issues.push(issue('invalid-week', unit.id, `Semaine ${unit.introducedInWeek} inconnue.`));
    if (!unit.display.trim() || !unit.audioText.trim()) issues.push(issue('empty-content', unit.id, 'Graphie et texte audio sont requis.'));
    if (unit.type === 'sentence') {
      for (const id of unit.unitIds ?? []) issues.push(...referenceIssues(program, id, unit.introducedInWeek, unit.id));
      const constructionIds = new Set<string>();
      for (const construction of unit.segmentations ?? []) {
        if (!construction.id || constructionIds.has(construction.id)) issues.push(issue('duplicate-segmentation', unit.id, 'Identifiant de construction vide ou dupliqué.'));
        constructionIds.add(construction.id);
        if (!construction.segments.length) continue; // Contenu sans construction ; l'activité restera invalide.
        issues.push(...validateSegmentation(program, unit, construction, construction.availableFromWeek ?? unit.introducedInWeek));
      }
    }
    if (unit.type !== 'word') continue;
    if (!unit.enabled) issues.push(issue('disabled-word', unit.id, `Le mot « ${unit.text} » est désactivé et ne sera pas proposé.`, 'warning'));
    if (unit.text !== unit.display) issues.push(issue('word-display-mismatch', unit.id, 'text et display doivent représenter le même mot.'));
    if (!unit.segmentations.length) issues.push(issue('unconfirmed-word', unit.id,
      `« ${unit.text} » conservé ; aucune segmentation fournie, constructibilité non confirmée.`, 'warning'));
    const segmentationIds = new Set<string>();
    for (const segmentation of unit.segmentations) {
      if (!segmentation.id || segmentationIds.has(segmentation.id)) issues.push(issue('duplicate-segmentation', unit.id, 'Identifiant de segmentation vide ou dupliqué.'));
      segmentationIds.add(segmentation.id);
      if (!segmentation.segments.length) continue;
      issues.push(...validateSegmentation(program, unit, segmentation, segmentation.availableFromWeek ?? unit.introducedInWeek));
    }
    const variantIds = new Set<string>();
    for (const variant of unit.completeWord ?? []) {
      if (!variant.id || variantIds.has(variant.id)) issues.push(issue('duplicate-variant', unit.id, 'Identifiant de variante vide ou dupliqué.'));
      variantIds.add(variant.id);
      const segmentation = unit.segmentations.find((item) => item.id === variant.segmentationId);
      issues.push(...validateCompleteWordVariant(program, unit, variant,
        variant.availableFromWeek ?? segmentation?.availableFromWeek ?? unit.introducedInWeek));
    }
  }
  for (const activity of program.activities ?? []) {
    const target = program.units.find((unit) => unit.id === activity.targetId);
    issues.push(...validateCompletionActivity(program, activity,
      activity.availableFromWeek ?? activitySegmentation(program, activity)?.availableFromWeek ?? target?.introducedInWeek ?? 0));
  }
  // Une même observation peut provenir de plusieurs validations ; ne la publier qu'une fois.
  return issues.filter((value, index, all) => all.findIndex((other) =>
    other.code === value.code && other.path === value.path && other.message === value.message) === index);
}
