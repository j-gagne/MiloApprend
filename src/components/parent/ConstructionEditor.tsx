import { useState } from 'react';
import type { LearningProgram, PedagogicalSegment, Segmentation, Word, Sentence } from '../../content/model';
import { blockText, displayConstruction, unusedBlocks, moveBlock, sentenceConstruction } from '../../content/construction';
import { comparableText } from '../../content/text';
import { isAvailable } from '../../content/selectors';
import { isAnswerUnit } from '../../content/validation';
import { newParentId } from '../../parent/model';

interface Props { program: LearningProgram; target: Word | Sentence; construction?: Segmentation; onChange: (value?: Segmentation) => void }
export function ConstructionEditor({ program, target, construction, onChange }: Props) {
  const [editing, setEditing] = useState<number>();
  const [type, setType] = useState('learned');
  const [unitId, setUnitId] = useState('');
  const [literal, setLiteral] = useState('');
  const [search, setSearch] = useState('');
  const [showUsed, setShowUsed] = useState(false);
  const blocks = construction?.segments ?? [];
  const allowed = unusedBlocks(program.units.filter((unit) => unit.id !== target.id && isAnswerUnit(unit)
    && isAvailable(program, unit, target.introducedInWeek)), blocks, editing, showUsed);
  function update(next: readonly PedagogicalSegment[]) {
    const value = { ...construction, id: construction?.id ?? newParentId('segmentation'), segments: next };
    onChange(next.length ? target.type === 'sentence' ? sentenceConstruction(program, target.display, value) : value : undefined);
  }
  function edit(index: number) {
    setEditing(index); const block = blocks[index]; setSearch(''); setShowUsed(false);
    setType(block && 'unitId' in block ? 'learned' : block ? 'visible' : 'learned');
    setUnitId(block && 'unitId' in block ? block.unitId : '');
    setLiteral(block && !('unitId' in block) ? blockText(program, block) : '');
  }
  const reconstructed = construction ? displayConstruction(program, target, construction) : '';
  const correct = target.type === 'sentence' ? reconstructed === target.display : comparableText(reconstructed) === comparableText(target.display);
  return <section aria-label="Construction">
    <h3>{target.type === 'sentence' ? 'Construction de la phrase' : 'Construction du mot'}</h3>
    <p>Définissez les blocs utilisés pour créer les exercices. La construction est facultative.</p>
    <h4>Blocs</h4>
    {!blocks.length && <p>Aucune construction</p>}
    <div className="construction-blocks">{blocks.map((block, index) => <article className="construction-block" key={index} aria-label={`Bloc ${index + 1}`}>
      <strong>{blockText(program, block)}</strong><small>{'unitId' in block ? 'Contenu appris' : 'Texte visible — non appris'}</small>
      <div className="parent-actions"><button type="button" aria-label={`Modifier le bloc ${index + 1}`} onClick={() => edit(index)}>Modifier</button>
        <button type="button" aria-label={`Retirer le bloc ${index + 1}`} onClick={() => { update(blocks.filter((_, i) => i !== index)); setEditing(undefined); }}>Retirer</button>
        <button type="button" aria-label={`Monter le bloc ${index + 1}`} disabled={index === 0} onClick={() => { update(moveBlock(blocks, index, index - 1)); setEditing(undefined); }}>↑</button>
        <button type="button" aria-label={`Descendre le bloc ${index + 1}`} disabled={index === blocks.length - 1} onClick={() => { update(moveBlock(blocks, index, index + 1)); setEditing(undefined); }}>↓</button>
      </div>
    </article>)}</div>
    {!!blocks.length && <p role="status">Reconstruction : <span style={{ whiteSpace: 'pre-wrap' }}>{reconstructed}</span> {correct ? '✓' : ''}</p>}
    <button type="button" onClick={() => edit(blocks.length)}>+ Ajouter un bloc</button>
    {editing !== undefined && <div className="parent-card" aria-label="Éditeur de bloc">
      <label>Type de bloc<select aria-label="Type de bloc" value={type} onChange={(event) => setType(event.target.value)}><option value="learned">Contenu appris</option><option value="visible">Texte visible</option></select></label>
      {type === 'learned' ? <>
        <label><input type="checkbox" checked={showUsed} onChange={(event) => { setShowUsed(event.target.checked); setUnitId(''); }} />Afficher les éléments déjà utilisés</label>
        <label>Rechercher un contenu<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label>Contenu appris<select aria-label="Contenu appris" value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Choisir un contenu admissible</option>
          {allowed.filter((unit) => comparableText(unit.display).includes(comparableText(search))).map((unit) => <option key={unit.id} value={unit.id}>{unit.display} · {unit.type}</option>)}
        </select></label>
      </> : <label>Texte visible<input value={literal} maxLength={500} onChange={(event) => setLiteral(event.target.value)} /></label>}
      <button type="button" disabled={type === 'learned' ? !allowed.some((unit) => unit.id === unitId) : !literal.trim()} onClick={() => {
        const block: PedagogicalSegment = type === 'learned' ? { unitId } : { literal, note: 'Texte visible — non appris' };
        update(editing === blocks.length ? [...blocks, block] : blocks.map((item, i) => i === editing ? block : item)); setEditing(undefined);
      }}>{editing === blocks.length ? 'Ajouter ce bloc' : 'Appliquer au bloc'}</button>
      <button type="button" onClick={() => setEditing(undefined)}>Annuler le bloc</button>
    </div>}
    {!!blocks.length && <button type="button" onClick={() => { onChange(undefined); setEditing(undefined); }}>Retirer la construction</button>}
  </section>;
}
