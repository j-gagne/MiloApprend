import { useState } from 'react';
import type { LearningProgram, LearningUnit } from '../../content/model';
import { primaryConstruction, recoverPartialConstruction, replacePrimary, sentenceConstruction } from '../../content/construction';
import { validateParentUnit } from '../../parent/content';
import { ConstructionEditor } from './ConstructionEditor';

interface Props { program: LearningProgram; unit: LearningUnit; constructionOnly?: boolean; onSave: (unit: LearningUnit) => void; onCancel: () => void; onDirty: () => void }
export function UnitEditor({ program, unit, constructionOnly = false, onSave, onCancel, onDirty }: Props) {
  const recovery = unit.type === 'word' || unit.type === 'sentence' ? recoverPartialConstruction(program, unit) : undefined;
  const [construction, setConstruction] = useState(recovery ?? primaryConstruction(unit));
  const [text, setText] = useState(unit.display);
  const [audio, setAudio] = useState(unit.audioText);
  const [week, setWeek] = useState(unit.introducedInWeek);
  const [emoji, setEmoji] = useState(unit.type === 'word' && unit.imageAsset && 'emoji' in unit.imageAsset ? unit.imageAsset.emoji : '');
  const base = { ...unit, display: unit.type === 'sentence' ? text : text.trim(), audioText: audio.trim() || text.trim(), introducedInWeek: week };
  const formatted = construction && unit.type === 'sentence' ? sentenceConstruction(program, base.display, construction) : construction;
  const draft: LearningUnit = base.type === 'word' ? replacePrimary({ ...base, text: text.trim(),
    imageAsset: constructionOnly ? base.imageAsset : emoji.trim() ? { emoji: emoji.trim(), label: text.trim() } : null }, formatted)
    : base.type === 'sentence' ? replacePrimary(base, formatted) : base.type === 'letter' ? { ...base, grapheme: text.trim() } : base;
  const errors = validateParentUnit(program, draft).filter((issue) => issue.severity === 'error');
  return <section className="parent-card" aria-label="Éditeur de contenu">
    <h2>{unit.display ? `Modifier : ${unit.display}` : 'Nouveau contenu'}</h2>
    <form onSubmit={(event) => { event.preventDefault(); if (!errors.length) onSave(draft); }}>
      <div className="parent-form-grid">
        <label>{unit.type === 'word' ? 'Mot' : unit.type === 'letter' ? 'Lettre' : unit.type === 'sentence' ? 'Phrase' : 'Syllabe'}
          <input disabled={constructionOnly} required maxLength={unit.type === 'sentence' ? 500 : 80} value={text} onChange={(event) => { setText(event.target.value); onDirty(); }} /></label>
        <label>Texte audio<input disabled={constructionOnly} value={audio} maxLength={500} placeholder="Le texte, par défaut" onChange={(event) => { setAudio(event.target.value); onDirty(); }} /></label>
        <label>Semaine d’introduction<select disabled={constructionOnly} value={week} onChange={(event) => { setWeek(Number(event.target.value)); onDirty(); }}>
          {program.weeks.map((item) => <option key={item.number} value={item.number}>{item.number} — {item.label}</option>)}
        </select></label>
        {unit.type === 'word' && <label>Emoji<input disabled={constructionOnly} value={emoji} maxLength={24} onChange={(event) => { setEmoji(event.target.value); onDirty(); }} /></label>}
      </div>
      {recovery && <p>Les blocs des anciennes constructions incomplètes sont réunis dans ce brouillon. Enregistrez pour confirmer.</p>}
      {(draft.type === 'word' || draft.type === 'sentence') && <ConstructionEditor program={program} target={draft} construction={formatted}
        onChange={(value) => { setConstruction(value); onDirty(); }} />}
      {!!errors.length && <div className="parent-errors" role="alert"><ul>{errors.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul></div>}
      <div className="parent-actions"><button className="parent-primary" type="submit" disabled={!!errors.length}>Enregistrer le contenu</button><button type="button" onClick={onCancel}>Annuler</button></div>
    </form>
  </section>;
}
