import { Unicorn } from './Unicorn';
import type { EggStage } from './HatchingPreview';
import './environment-reveal.css';

const clouds = [
  { x: 233, y: 82, size: .9, until: 1 },
  { x: 167, y: 108, size: .9, until: 2 },
  { x: 288, y: 113, size: .9, until: 3 },
  { x: 229, y: 123, size: .6, until: 3 },
  { x: 200, y: 161, size: .8, until: 2 },
  { x: 279, y: 164, size: .9, until: 3 },
  { x: 142, y: 178, size: .85, until: 1 },
  { x: 234, y: 204, size: 1, until: 3 },
  { x: 162, y: 241, size: .6, until: 3 },
  { x: 108, y: 279, size: .85, until: 2 },
  { x: 181, y: 267, size: 1, until: 4 },
  { x: 268, y: 269, size: .72, until: 3 },
  { x: 163, y: 320, size: .8, until: 3 },
  { x: 244, y: 319, size: .85, until: 4 },
];
const colors = ['#eee1f3', '#f5e6ce', '#efd3df', '#dcebef', '#e0ebda', '#f4dfcf'];
function Cloud({ x, y, size = 1, color, motion }: { x: number; y: number; size?: number; color: string; motion?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <g className={motion === undefined ? undefined : `environment-motion environment-motion-${motion}`}>
      <path d="M-45 25C-68 21-68-10-46-15C-45-39-13-43-3-25C15-46 47-30 46-9C68-7 65 23 43 27Q3 36-45 25Z" fill={color} />
      <path d="M-43-10Q-29-23-17-13" fill="none" stroke="#fffaf3" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </g>
  </g>;
}
export function UnicornReveal({ stage }: { stage: EggStage }) {
  return <svg className="environment-reveal unicorn-reveal-scene" viewBox="0 0 400 400" role="img" aria-label={`Licorne dans les nuages : ${stage} sur 5`} data-stage={stage}>
    <g data-layer="background">
      <ellipse cx="200" cy="213" rx="164" ry="162" fill="#f0eaf3" />
      <Cloud x={74} y={256} size={.8} color="#e0ebda" /><Cloud x={336} y={220} size={.75} color="#dcebef" />
      <Cloud x={190} y={352} size={1.3} color="#f4dfcf" />
    </g>
    <g data-layer="unicorn" visibility={stage === 1 ? 'hidden' : undefined}>
      <svg x="30" y="55" width="340" height="300" viewBox="0 0 340 300"><Unicorn /></svg>
    </g>
    <g data-layer="foreground">
      {clouds.map((cloud, index) => stage <= cloud.until && <g key={index} data-cluster={index}>
        <Cloud {...cloud} color={colors[index % colors.length]} motion={index === 0 ? 0 : index === 5 ? 1 : index === 10 ? 2 : undefined} />
      </g>)}
      <Cloud x={63} y={332} size={.7} color="#efd3df" /><Cloud x={334} y={330} size={.65} color="#eee1f3" />
    </g>
    {stage === 5 && <path d="m92 112 4-11 4 11 11 4-11 4-4 11-4-11-11-4Zm233 42 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" fill="#d9bf83" />}
  </svg>;
}
