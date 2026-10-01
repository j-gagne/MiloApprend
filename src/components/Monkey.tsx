import { SleepingEyes } from './SleepingEyes';
export function Monkey({ happy = false, sleeping = false, celebrating = false, waving = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean; waving?: boolean }) {
  happy = happy || celebrating;
  return <svg className="monkey" data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : waving ? 'waving' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <path d="M129 231C98 257 62 239 67 207C70 187 92 186 95 202Q98 216 85 218" fill="none" stroke="#b99075" strokeWidth="13" strokeLinecap="round" />
    <path d="M129 241C113 215 116 176 143 153C162 136 201 137 221 154C245 177 245 223 227 246L221 267H186L177 247L161 267H121Z" fill="#b99075" />
    <ellipse cx="181" cy="210" rx="38" ry="42" fill="#efdbc0" />
    <circle cx="134" cy="101" r="25" fill="#b99075" /><circle cx="266" cy="97" r="25" fill="#b99075" />
    <circle cx="134" cy="101" r="15" fill="#d8aa98" /><circle cx="266" cy="97" r="15" fill="#d8aa98" />
    <path d="M139 101C139 66 163 44 199 45C235 43 264 64 264 99C268 135 239 160 202 161C165 163 137 139 139 101Z" fill="#b99075" />
    <path d="M151 99C147 75 169 64 185 74Q198 84 210 73C231 58 254 75 252 98Q250 109 257 120C266 143 237 153 202 153C169 156 144 141 150 121Q155 110 151 99Z" fill="#efdbc0" />
    {sleeping ? <SleepingEyes /> : <><ellipse cx="179" cy="97" rx="7" ry="10" fill="#3f4643" /><ellipse cx="231" cy="93" rx="7" ry="10" fill="#3f4643" />
    <circle cx="181" cy="94" r="2" fill="white" /><circle cx="233" cy="90" r="2" fill="white" /></>}
    <ellipse cx="165" cy="119" rx="10" ry="6" fill="#d8aa98" /><ellipse cx="244" cy="116" rx="10" ry="6" fill="#d8aa98" />
    <ellipse cx="205" cy="118" rx="6" ry="4" fill="#876e60" />
    {happy ? <><path d="M185 131Q203 142 223 129Q219 151 204 151Q190 151 185 131Z" fill="#3f4643" /><path d="M195 146Q204 140 214 146Q204 154 195 146Z" fill="#d8aa98" /></>
      : <path d="M188 133Q204 146 220 131" fill="none" stroke="#3f4643" strokeWidth="3" strokeLinecap="round" />}
    <path d={waving ? 'M146 179q-17 15-10 28M218 179Q270 185 286 128' : sleeping ? 'M146 179q-6 31 21 35M218 179q6 31-21 35' : happy ? 'M145 184q-22-6-26-28M218 184q22-5 27-27' : 'M146 179q-17 15-10 28M218 179q17 15 10 28'} fill="none" stroke="#a77f66" strokeWidth="13" strokeLinecap="round" />
    <circle cx={sleeping ? 167 : happy ? 119 : 136} cy={sleeping ? 214 : happy ? 156 : 207} r="9" fill="#efdbc0" /><circle cx={waving ? 286 : sleeping ? 197 : happy ? 245 : 228} cy={waving ? 128 : sleeping ? 214 : happy ? 157 : 207} r="9" fill="#efdbc0" />
    <ellipse cx="142" cy="261" rx="25" ry="12" fill="#efdbc0" /><ellipse cx="211" cy="261" rx="25" ry="12" fill="#efdbc0" />
  </svg>;
}
