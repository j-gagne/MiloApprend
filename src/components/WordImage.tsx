import { useState } from 'react';
import type { Challenge } from '../game/complete-word';

export function WordImage({ image }: { image: Challenge['image'] }) {
  const [failed, setFailed] = useState(false);
  return <div className="word-image" role="img" aria-label={image.label}>
    {image.src && !failed
      ? <img src={image.src} alt="" style={{ maxWidth: '100%', height: 140, objectFit: 'contain' }} onError={() => setFailed(true)} />
      : image.emoji}
  </div>;
}
