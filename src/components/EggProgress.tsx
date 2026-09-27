export function EggProgress({ total, completed }: { total: number; completed: number }) {
  return <div className="journey" role="img" aria-label={`${completed} œuf${completed > 1 ? 's' : ''} éclos sur ${total}`}>
    {Array.from({ length: total }, (_, index) => <span key={index}
      className={`journey-egg ${index < completed ? 'hatched' : ''} ${index === completed ? 'current' : ''}`} aria-hidden="true">
      <span key={index < completed ? 'star' : 'egg'}>{index < completed ? '★' : '🥚'}</span>
    </span>)}
  </div>;
}
