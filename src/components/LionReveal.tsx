import { useId } from 'react';
import { Lion } from './Lion';

export type LionRevealStage = 1 | 2 | 3 | 4 | 5;
const openings = {
  2: [
    'M153 120Q154 98 177 98Q197 103 199 121Q193 141 176 146Q158 140 153 120Z',
    'M293 161Q311 157 319 172Q322 191 302 207Q289 193 293 161Z',
  ],
  3: [
    'M150 121Q151 94 179 96Q204 103 198 129Q189 148 171 145Q153 137 150 121Z',
    'M178 155Q201 137 223 141Q232 154 224 170Q202 181 182 171Z',
    'M289 140Q315 141 321 169Q326 199 300 216Q275 204 283 180Q288 158 289 140Z',
    'M153 231Q185 219 208 241Q216 267 192 280Q163 281 152 260Z',
  ],
  4: ['M151 91Q208 66 273 92Q313 110 318 168Q330 219 293 260Q278 290 239 307Q192 304 146 285Q111 256 111 211Q114 177 125 148Q124 114 151 91Z'],
};

function Leaf({ x, y, rotate, size = 1, color, motion }: { x: number; y: number; rotate: number; size?: number; color: string; motion?: 'upper' | 'lower' | 'side' }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size})`}>
    <g className={motion ? `lion-leaf-reaction lion-leaf-${motion}` : undefined}>
    <path d="M0 0C-31-5-47-34-30-64C1-62 22-27 0 0Z" fill={color} />
    <path d="M0-5Q-12-25-26-54" fill="none" stroke="#f4f1cf" strokeOpacity=".32" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </g>;
}

// Visual prototype only: the existing Lion stays independent of the foliage.
export function LionReveal({ stage }: { stage: LionRevealStage }) {
  const id = useId().replace(/:/g, '');
  const opening = stage === 2 || stage === 3 || stage === 4 ? openings[stage] : undefined;
  return <svg className="lion-reveal-scene" viewBox="0 0 400 400" role="img"
    aria-label={`Lion dans la jungle : ${stage} sur 5`} data-stage={stage}>
    <defs>
      <clipPath id={`${id}-opening`}>
        {stage === 5 ? <rect width="400" height="400" /> : opening ? opening.map((path, index) => <path key={index} d={path} />) : <rect width="0" height="0" />}
      </clipPath>
      <mask id={`${id}-bush`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
        <rect width="400" height="400" fill="white" />{opening?.map((path, index) => <path key={index} d={path} fill="black" />)}
      </mask>
    </defs>
    <ellipse cx="200" cy="218" rx="163" ry="158" fill="#f2eed9" />
    <ellipse cx="200" cy="351" rx="164" ry="19" fill="#dce2c4" />
    <g data-layer="background">
      <path d="M49 322Q15 272 45 242Q16 193 60 177Q49 125 94 136Q116 105 145 149L264 149Q294 105 320 143Q369 128 354 181Q392 208 364 246Q392 293 350 326Z" fill="#a9bd8b" />
      <Leaf x={83} y={255} rotate={-28} size={1.2} color="#b8cba2" />
      <Leaf x={322} y={265} rotate={59} size={1.3} color="#c3cf9e" />
      <Leaf x={83} y={320} rotate={-20} size={1.1} color="#8fa77a" />
      <Leaf x={325} y={323} rotate={55} size={1.1} color="#8fa77a" />
    </g>
    <g clipPath={`url(#${id}-opening)`} data-layer="lion" data-reveal={stage === 1 ? 'hidden' : stage === 5 ? 'full' : 'partial'}>
      <svg x="30" y="55" width="340" height="300" viewBox="0 0 340 300" aria-hidden="true"><Lion /></svg>
    </g>
    <g data-layer="foreground">
      {stage < 5 && <g mask={`url(#${id}-bush)`}>
        <path d="M39 305Q15 271 49 244Q26 207 61 190Q49 154 84 145Q89 109 124 119Q143 85 176 110Q209 86 234 112Q269 90 291 122Q331 113 336 154Q373 164 354 203Q387 228 359 261Q382 297 348 323Q320 352 279 340Q240 366 200 347Q158 364 123 342Q70 356 39 305Z" fill="#789665" />
        <path d="M45 276Q72 234 114 255Q141 216 177 247Q215 214 246 247Q291 222 311 258Q348 242 364 281Q372 319 324 333Q285 352 250 331Q206 354 169 337Q126 354 96 333Q45 338 45 276Z" fill="#8eaa73" />
        <Leaf x={106} y={217} rotate={-20} size={1.2} color="#abc48b" />
        <Leaf x={174} y={181} rotate={30} size={1.15} color="#95b477" motion="upper" />
        <Leaf x={240} y={174} rotate={-13} size={1.15} color="#b1c88f" />
        <Leaf x={309} y={220} rotate={47} size={1.25} color="#9cb880" motion="side" />
        <Leaf x={116} y={308} rotate={-39} size={1.2} color="#b1c88f" />
        <Leaf x={185} y={326} rotate={8} size={1.35} color="#a0bd80" motion="lower" />
        <Leaf x={245} y={327} rotate={49} size={1.25} color="#bfd299" />
        <Leaf x={330} y={309} rotate={61} size={1.15} color="#adc58a" />
      </g>}
      <Leaf x={85} y={352} rotate={-25} size={stage === 5 ? 1 : 1.1} color="#749260" />
      <Leaf x={84} y={355} rotate={20} size={.8} color="#a7bd80" />
      <Leaf x={332} y={354} rotate={72} size={1.05} color="#749260" />
      <Leaf x={320} y={357} rotate={118} size={.75} color="#abc487" />
      <path d="M104 360Q151 344 163 359Q133 371 104 360M256 360Q291 343 312 359Q285 370 256 360" fill="#adc58a" />
    </g>
    {stage === 1 && <path d="M207 94q-6-10-3-16m17 13 6-13" fill="none" stroke="#b9bc88" strokeWidth="3" strokeLinecap="round" />}
    {stage === 5 && <g fill="#dab56d" aria-hidden="true">
      <path d="m90 97 4-12 4 12 12 4-12 4-4 12-4-12-12-4Zm239 53 4-11 4 11 11 4-11 4-4 11-4-11-11-4ZM274 55l3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" />
      <circle cx="69" cy="162" r="3" /><circle cx="311" cy="90" r="3" />
    </g>}
  </svg>;
}
