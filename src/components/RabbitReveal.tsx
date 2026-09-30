import { CharacterArtwork } from './CharacterArtwork';
import type { VariantId } from '../game/character-variants';
import type { EggStage } from './HatchingPreview';
import './environment-reveal.css';

const plants = [
  { x: 174, y: 112, size: .85, until: 1 },
  { x: 264, y: 119, size: .95, until: 3 },
  { x: 197, y: 177, size: .9, until: 2 },
  { x: 281, y: 174, size: 1, until: 3 },
  { x: 142, y: 231, size: .8, until: 3 },
  { x: 260, y: 244, size: 1, until: 3 },
  { x: 141, y: 286, size: .8, until: 1 },
  { x: 198, y: 292, size: .85, until: 4 },
  { x: 268, y: 285, size: .9, until: 2 },
  { x: 157, y: 340, size: .8, until: 3 },
  { x: 246, y: 345, size: .7, until: 4 },
];
function Plant({ x, y, size = 1, color, flower, motion }: { x: number; y: number; size?: number; color: string; flower?: string; motion?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <g className={motion === undefined ? undefined : `environment-motion environment-motion-${motion}`}>
      <path d="M-42 13Q-68-16-48-55Q-23-49-14-19Q-39-68-14-89Q8-73 12-31Q24-78 49-73Q63-36 31-4Q59-35 65-14Q56 15 20 22Q-16 28-42 13Z" fill={color} />
      <path d="M-29 8Q-8-31-17-63M13 10Q32-23 41-47" fill="none" stroke="#d0dcb0" strokeWidth="3" strokeLinecap="round" />
      {flower && <g transform="translate(-28 -24)">
        <path d="M0 0Q12 20 10 40" fill="none" stroke="#879c70" strokeWidth="4" />
        <path d="M0-10C-18-28-30-5-13 3C-27 23-3 29 3 12C20 29 35 7 17 0C32-19 10-30 0-10Z" fill={flower} />
        <circle cx="3" cy="2" r="6" fill="#f4e4ae" />
      </g>}
    </g>
  </g>;
}
const greens = ['#a6b985', '#8ca578', '#b7c69a'];
const flowers = ['#e6bacb', '#bca8cf', '#ce9db6', '#ab97bd'];
export function RabbitReveal({ stage, variantId = 'normal' }: { stage: EggStage; variantId?: VariantId }) {
  return <svg className="environment-reveal rabbit-reveal-scene" viewBox="0 0 400 400" role="img" aria-label={`Lapin près du terrier : ${stage} sur 5`} data-stage={stage}>
    <g data-layer="background">
      <ellipse cx="200" cy="221" rx="166" ry="153" fill="#edf0dc" />
      <path d="M47 340Q48 170 189 159Q333 146 354 340Z" fill="#dec8a9" />
      <path d="M107 338Q104 215 194 208Q281 202 294 338Z" fill="#baa388" />
      <ellipse cx="200" cy="352" rx="162" ry="18" fill="#d8dfb9" />
      <Plant x={64} y={331} size={.8} color="#a6b985" flower="#bca8cf" />
      <Plant x={344} y={330} size={.8} color="#a6b985" flower="#ce9db6" />
    </g>
    <g data-layer="rabbit" visibility={stage === 1 ? 'hidden' : undefined}>
      <svg x="30" y="55" width="340" height="300" viewBox="0 0 340 300"><CharacterArtwork id="rabbit" variantId={variantId} /></svg>
    </g>
    <g data-layer="foreground">
      {plants.map((plant, index) => stage <= plant.until && <g key={index} data-cluster={index}>
        <Plant {...plant} color={greens[index % greens.length]} flower={index % 3 === 1 ? flowers[index % flowers.length] : undefined} motion={index === 0 ? 0 : index === 3 ? 1 : index === 7 ? 2 : undefined} />
      </g>)}
      <Plant x={61} y={367} size={.65} color="#91aa78" flower="#e6bacb" />
      <Plant x={337} y={365} size={.65} color="#a6b985" flower="#ab97bd" />
      <path d="M106 362q16-24 28-12q-6 16-28 12m165 1q20-22 29-13q-5 18-29 13" fill="#adc28d" />
    </g>
  </svg>;
}
