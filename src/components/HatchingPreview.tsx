import { useId, useState, type ReactNode } from 'react';
import { Dinosaur } from './Dinosaur';
import './hatching-preview.css';

export type EggStage = 1 | 2 | 3 | 4 | 5;
const titles = ['Regarde ton œuf !', 'Il commence à craquer !', "J'ai vu quelque chose !", 'Il va bientôt éclore !', 'Il a éclos !'];
// Reward artwork is independent of the child's chosen companion.
const rewardAnimals: Record<string, ReactNode> = { dinosaur: <Dinosaur /> };
const egg = 'M200 40C143 40 82 163 82 245C82 313 128 348 200 348S318 313 318 245C318 163 257 40 200 40Z';
const openings = {
  small: 'M228 157L242 162L255 153L261 170L274 181L260 192L251 206L237 197L221 199L225 182L216 170Z',
  large: 'M210 114L232 131L254 111L267 144L293 158L281 186L295 214L265 228L252 252L230 234L201 246L194 215L174 194L190 169L185 145L211 140Z',
};

// The animal is replaceable independently; no player, reward or collection state.
export function HatchingEgg({ stage, animal = <Dinosaur /> }: { stage: EggStage; animal?: ReactNode }) {
  const id = useId().replace(/:/g, '');
  const opening = stage === 3 ? openings.small : stage === 4 ? openings.large : undefined;
  return <svg className={`hatching-egg stage-${stage}`} viewBox="0 0 400 400" role="img" aria-label={titles[stage - 1]} data-stage={stage}>
    <defs>
      <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff5d9" /><stop offset="1" stopColor="#edcd91" /></linearGradient>
      <clipPath id={`${id}-outline`}><path d={egg} /></clipPath>
      <clipPath id={`${id}-reveal`}>
        {stage === 5 ? <rect width="400" height="400" /> : opening ? <path key={stage} className="egg-opening" d={opening} /> : <rect width="0" height="0" />}
      </clipPath>
      <mask id={`${id}-shell`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
        <path d={egg} fill="white" />{opening && <path key={stage} className="egg-opening" d={opening} fill="black" />}
      </mask>
    </defs>
    <ellipse cx="200" cy="353" rx="144" ry="18" fill="#507345" opacity=".12" />
    <g fill="#9bb881"><path d="M139 350Q60 326 61 284Q113 289 139 350M261 350Q340 326 339 284Q287 289 261 350" /><path d="M163 356Q87 359 71 333Q118 318 163 356M237 356Q313 359 329 333Q282 318 237 356" /></g>
    <g className="egg-motion" key={stage}>
      {stage < 5 && <path d={egg} fill="#785232" />}
      <g clipPath={`url(#${id}-reveal)`} data-reveal={stage === 5 ? 'full' : stage === 4 ? 'large' : stage === 3 ? 'small' : 'hidden'}>
        <g className="hatching-animal" data-testid="hatching-animal"><svg aria-hidden="true" x="40" y="110" width="300" height="265" viewBox="0 0 340 300">{animal}</svg></g>
      </g>
      {stage < 5 ? <g mask={`url(#${id}-shell)`} data-testid="egg-shell">
        <path d={egg} fill={`url(#${id}-cream)`} stroke="#e4c895" strokeWidth="2" />
        <g clipPath={`url(#${id}-outline)`} fill="#adc69b">
          <ellipse cx="108" cy="175" rx="22" ry="34" transform="rotate(25 108 175)" />
          <ellipse cx="263" cy="86" rx="24" ry="30" transform="rotate(-25 263 86)" />
          <ellipse cx="281" cy="282" rx="23" ry="34" transform="rotate(23 281 282)" />
          <ellipse cx="137" cy="329" rx="24" ry="23" /><ellipse cx="178" cy="215" rx="12" ry="16" />
          <circle cx="216" cy="319" r="12" />
        </g>
        <g fill="#eccb90" opacity=".45"><circle cx="188" cy="79" r="5" /><circle cx="155" cy="124" r="6" /><circle cx="208" cy="125" r="4" /><circle cx="127" cy="244" r="5" /><circle cx="183" cy="282" r="6" /><circle cx="293" cy="217" r="4" /></g>
        {stage >= 2 && <path className="egg-cracks" d="M204 102L199 122L211 137L197 156L204 174L184 192L190 211L174 234L177 255L155 276M197 156L177 150L169 133M177 255L202 267L214 286" fill="none" stroke="#936136" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      </g> : <g className="broken-shell" fill={`url(#${id}-cream)`} stroke="#ddbb83" strokeWidth="2" data-testid="broken-shell">
        <path d="M87 281L112 293L128 271L150 295L175 279L197 300L222 281L240 298L271 275L288 294L312 275C305 326 265 348 200 348S98 329 87 281Z" />
        <path className="shell-left" d="M78 284L52 303L77 328L111 321Z" /><path className="shell-right" d="M321 278L345 302L327 330L293 319Z" />
        <path d="M144 346L126 356L158 364L178 350M263 346L247 362L283 356Z" />
        <g fill="#adc69b" stroke="none"><ellipse cx="139" cy="320" rx="18" ry="16" /><ellipse cx="253" cy="319" rx="20" ry="18" /><circle cx="199" cy="338" r="10" /></g>
      </g>}
      {opening && <path key={stage} className="egg-opening" d={opening} fill="none" stroke="#c18b50" strokeWidth="3" strokeLinejoin="round" />}
    </g>
    <g fill="#789b62"><path d="M121 358Q101 325 116 314Q134 332 137 359M145 360Q151 323 163 328Q169 345 163 361M263 359Q266 329 286 315Q295 334 279 358" /></g>
    {stage === 5 && <g className="hatch-sparkles" fill="#e9b853" aria-hidden="true"><path d="m77 103 6-17 6 17 17 6-17 6-6 17-6-17-17-6Zm249 59 5-14 5 14 14 5-14 5-5 14-5-14-14-5ZM174 32l4-10 4 10 10 4-10 4-4 10-4-10-10-4Z" /></g>}
  </svg>;
}

export function HatchingScreen({ stage, progress = stage, total = 5, onContinue, children, notice, animalId = 'dinosaur' }: {
  stage: EggStage; progress?: number; total?: number; onContinue?: () => void;
  children?: ReactNode; notice?: ReactNode; animalId?: string;
}) {
  return <div className="app-shell hatching-preview">
    <header className="topbar"><a className="brand" href={window.location.pathname}><span className="brand-icon">m.</span><span>milo <b>apprend</b></span></a>{!onContinue && <span className="hatch-preview-label">Aperçu visuel</span>}</header>
    <main className="hatch-screen">
      <p className="eyebrow">UNE PETITE SURPRISE</p>
      <h1 aria-live="polite">{titles[stage - 1]}</h1>
      <HatchingEgg stage={stage} animal={rewardAnimals[animalId]} />
      <div className="hatch-progress" aria-label={`Éclosion : ${progress} sur ${total}`}>{[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= stage ? 'reached' : ''} aria-hidden="true">{n === 5 && stage === 5 ? '★' : ''}</span>)}<strong>{progress}/{total}</strong></div>
      <button className="primary-button" type="button" onClick={onContinue} aria-disabled={!onContinue || undefined} aria-describedby={!onContinue ? 'hatch-note' : undefined}>CONTINUER <span aria-hidden="true">→</span></button>
      {!onContinue && <p id="hatch-note" className="hatch-note">Bouton de démonstration, sans action.</p>}
      {notice}
      {children}
    </main><footer>Un petit pas à la fois <span>✦</span></footer>
  </div>;
}

export function HatchingPreview() {
  const [stage, setStage] = useState<EggStage>(1);
  return <HatchingScreen stage={stage}>
    <fieldset className="hatch-controls"><legend>Contrôles de prévisualisation</legend>{([1, 2, 3, 4, 5] as const).map(n => <button key={n} type="button" aria-label={`État ${n}`} aria-pressed={stage === n} onClick={() => setStage(n)}>{n}</button>)}</fieldset>
  </HatchingScreen>;
}
