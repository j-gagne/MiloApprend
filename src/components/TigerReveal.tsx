import { Tiger } from './Tiger';
import type { EggStage } from './HatchingPreview';
import './environment-reveal.css';

const grasses = [
  { x: 177, y: 159, width: .9, height: .8, until: 1 },
  { x: 254, y: 145, width: .55, height: .65, until: 3 },
  { x: 296, y: 194, width: .8, height: 1.2, until: 3 },
  { x: 201, y: 209, width: .9, height: .85, until: 2, shelter: true },
  { x: 263, y: 236, width: .78, height: 1.05, until: 3 },
  { x: 144, y: 270, width: .5, height: .7, until: 3 },
  { x: 110, y: 305, width: .8, height: .95, until: 1 },
  { x: 220, y: 280, width: .65, height: .6, until: 3 },
  { x: 164, y: 339, width: 1, height: 1, until: 4 },
  { x: 278, y: 322, width: .7, height: .9, until: 2 },
  { x: 236, y: 352, width: .8, height: .8, until: 4 },
];
function Grass({ x, y, width = 1, height = 1, color, motion, shelter = false }: { x: number; y: number; width?: number; height?: number; color: string; motion?: number; shelter?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${width} ${height})`}>
    <g className={motion === undefined ? undefined : `environment-motion environment-motion-${motion}`}>
      <path d="M-35 10Q-59-48-46-95Q-43-102-40-94Q-19-70-16-20Q-33-101-12-136Q-8-143-5-134Q10-75 5-25Q7-104 32-117Q39-121 36-111Q33-58 20-14Q38-69 53-74Q59-76 56-66Q51-17 38 12Z" fill={color} />
      {shelter && <path d="M-9 6Q-12-74 10-99Q15-106 19-97Q37-53 21 10Z" fill={color} />}
      <path d="M-23 3Q-32-45-42-77M0 3Q-4-61-9-109M18 4Q25-42 30-83" fill="none" stroke="#ccd7a5" strokeWidth="2" strokeLinecap="round" />
    </g>
  </g>;
}
const greens = ['#91a778', '#b2bf87', '#7f9c70', '#a1b683'];
export function TigerReveal({ stage }: { stage: EggStage }) {
  return <svg className="environment-reveal tiger-reveal-scene" viewBox="0 0 400 400" role="img" aria-label={`Tigre dans les hautes herbes : ${stage} sur 5`} data-stage={stage}>
    <g data-layer="background">
      <ellipse cx="200" cy="216" rx="165" ry="159" fill="#e9edda" />
      <Grass x={61} y={335} width={.7} height={1.7} color="#c0cc9c" /><Grass x={343} y={332} width={.6} height={1.9} color="#b1c393" />
      <ellipse cx="200" cy="351" rx="164" ry="20" fill="#d1dcb6" />
    </g>
    <g data-layer="tiger" visibility={stage === 1 ? 'hidden' : undefined}>
      <svg x="30" y="55" width="340" height="300" viewBox="0 0 340 300"><Tiger /></svg>
    </g>
    <g data-layer="foreground">
      {grasses.map((grass, index) => stage <= grass.until && <g key={index} data-cluster={index}>
        <Grass {...grass} color={greens[index % greens.length]} motion={index === 0 ? 0 : index === 2 ? 1 : index === 8 ? 2 : undefined} />
      </g>)}
      <Grass x={49} y={357} width={.5} height={1.35} color="#91a778" /><Grass x={351} y={355} width={.45} height={1.4} color="#7f9c70" />
      <Grass x={94} y={372} width={.45} height={.38} color="#a1b683" /><Grass x={303} y={369} width={.5} height={.35} color="#a1b683" />
    </g>
  </svg>;
}
