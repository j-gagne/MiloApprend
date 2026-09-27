import type { SessionProgress as Progress } from '../game/session-progress';

export function SessionProgress({ progress, local }: { progress: Progress; local?: { completed: number; total: number } }) {
  return <div className="session-progress">
    <div className="session-summary">
      <span>Parcours <b>{progress.completedTargets} / {progress.totalTargets}</b></span>
      <span className="performance" aria-label={`Étoiles : ${progress.perfectTargets} sur ${progress.totalTargets}`}>
        <span aria-hidden="true">⭐</span> {progress.perfectTargets} / {progress.totalTargets}
      </span>
    </div>
    <progress aria-label="Progression de la session" max={progress.totalTargets} value={progress.completedTargets} />
    {local && <div className="chain-progress" role="img" aria-label={`Chaîne : ${local.completed} sur ${local.total}`}>
      {Array.from({ length: local.total }, (_, i) => <span key={i} aria-hidden="true" className={i < local.completed ? 'done' : ''}>{i < local.completed ? '●' : '○'}</span>)}
    </div>}
  </div>;
}
