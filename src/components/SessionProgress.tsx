import type { SessionProgress as Progress } from '../game/session-progress';
import { characterPosition, type CharacterId } from '../game/characters';
import { Character } from './Character';

export function SessionProgress({ progress, local, characterId }: { progress: Progress; local?: { completed: number; total: number }; characterId?: CharacterId }) {
  return <div className="session-progress">
    <div className="session-summary">
      <span>Parcours <b>{progress.completedTargets} / {progress.totalTargets}</b></span>
      <span className="performance" aria-label={`Étoiles : ${progress.perfectTargets} sur ${progress.totalTargets}`}>
        <span aria-hidden="true">⭐</span> {progress.perfectTargets} / {progress.totalTargets}
      </span>
    </div>
    {characterId && <div className="character-lane"><span className="character-marker" style={{ left: `${characterPosition(progress) * 100}%` }}>
      <Character key={progress.completedTargets} id={characterId} happy={progress.completedTargets > 0} />
    </span></div>}
    <progress aria-label="Progression de la session" max={progress.totalTargets} value={progress.completedTargets} />
    {local && <div className="chain-progress" role="img" aria-label={`Chaîne : ${local.completed} sur ${local.total}`}>
      {Array.from({ length: local.total }, (_, i) => <span key={i} aria-hidden="true" className={i < local.completed ? 'done' : ''}>{i < local.completed ? '●' : '○'}</span>)}
    </div>}
  </div>;
}
