import { Monkey } from './Monkey';
import type { EggStage } from './HatchingPreview';
import './monkey-banana-reveal.css';

const bunches = [
  { id: 'crown-left', x: 153, y: 114, angle: 18, until: 3 },
  { id: 'crown', x: 227, y: 103, angle: -12, until: 1 },
  { id: 'crown-right', x: 294, y: 127, angle: -28, until: 3 },
  { id: 'ear', x: 145, y: 169, angle: 65, until: 1 },
  { id: 'eye-left', x: 224, y: 145, angle: -15, until: 2 },
  { id: 'eye-right', x: 277, y: 166, angle: 27, until: 3 },
  { id: 'muzzle', x: 230, y: 204, angle: -6, until: 3 },
  { id: 'tail', x: 115, y: 253, angle: 35, until: 2 },
  { id: 'body-left', x: 178, y: 257, angle: -30, until: 4 },
  { id: 'body-right', x: 263, y: 266, angle: 24, until: 3 },
  { id: 'feet-left', x: 145, y: 317, angle: 4, until: 3 },
  { id: 'feet-right', x: 240, y: 324, angle: -14, until: 4 },
] as const;

function Banana({ shade = '#edce77' }: { shade?: string }) {
  return <g>
    <path d="M-53-25Q-25 9 11 0Q36-6 48-33Q54-43 62-37Q70-18 51 10Q20 51-23 32Q-50 19-59-13Q-63-26-53-25Z" fill={shade} stroke="#d0ac5f" strokeWidth="2" strokeLinejoin="round" />
    <path d="M-47-12Q-17 30 19 16Q44 8 54-19" fill="none" stroke="#fff1b7" strokeWidth="4" strokeLinecap="round" />
    <path d="m-58-20-5-9m123-8 4-10" stroke="#987b51" strokeWidth="6" strokeLinecap="round" />
  </g>;
}

function Bunch({ x, y, angle, small = false, reaction, id }: { x: number; y: number; angle: number; small?: boolean; reaction?: string; id?: string }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${small ? .65 : .98})`} data-bunch={id}>
    <g className={reaction ? `banana-reaction banana-${reaction}` : undefined}>
      <g transform="translate(-5 -13) rotate(-15)"><Banana shade="#dfbc67" /></g>
      <Banana />
    </g>
  </g>;
}

export function MonkeyBananaReveal({ stage }: { stage: EggStage }) {
  return <svg className="monkey-banana-scene" viewBox="0 0 400 400" role="img" aria-label={`Singe et bananes : ${stage} sur 5`} data-stage={stage}>
    <g data-layer="background">
      <ellipse cx="200" cy="215" rx="162" ry="157" fill="#f3ead4" />
      <ellipse cx="200" cy="354" rx="158" ry="18" fill="#ddd8b7" />
      <path d="M62 326Q19 287 34 251Q75 254 87 320M318 322Q330 261 371 249Q387 300 339 336" fill="#a8b886" />
      <Bunch x={69} y={311} angle={-52} small />
      <Bunch x={339} y={313} angle={43} small />
    </g>
    <g data-layer="monkey" visibility={stage === 1 ? 'hidden' : undefined} data-reveal={stage === 1 ? 'hidden' : stage === 5 ? 'full' : 'partial'}>
      <svg x="30" y="55" width="340" height="300" viewBox="0 0 340 300" aria-hidden="true"><Monkey /></svg>
    </g>
    <g data-layer="foreground">
      {bunches.filter(bunch => stage <= bunch.until).map(bunch => <Bunch key={bunch.id} {...bunch}
        reaction={bunch.id === 'crown-left' ? 'upper' : bunch.id === 'body-right' ? 'side' : bunch.id === 'feet-left' ? 'lower' : undefined} />)}
      <Bunch x={66} y={353} angle={-12} small />
      <Bunch x={330} y={353} angle={16} small />
    </g>
    {stage === 5 && <g fill="#d5ab66" aria-hidden="true">
      <path d="m89 105 4-12 4 12 12 4-12 4-4 12-4-12-12-4Zm237 28 4-10 4 10 10 4-10 4-4 10-4-10-10-4ZM265 62l3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" />
    </g>}
  </svg>;
}
