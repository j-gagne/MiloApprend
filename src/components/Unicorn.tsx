import { SleepingEyes } from './SleepingEyes';
export function Unicorn({ happy = false, sleeping = false, celebrating = false, waving = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean; waving?: boolean }) {
  happy = happy || celebrating;
  return <svg className="unicorn" data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : waving ? 'waving' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <path d="M131 216Q90 192 78 222Q73 242 57 242Q87 265 111 243Z" fill="#b9a6cf" />
    <path d="M112 219Q91 211 85 232Q80 245 70 247Q99 253 112 232Z" fill="#dfb9c9" />
    <path d="M129 241C113 215 116 176 143 153C162 136 201 137 221 154C245 177 245 223 227 246L221 267H186L177 247L161 267H121Z" fill="#f3ebdc" />
    <ellipse cx="181" cy="210" rx="38" ry="42" fill="#eadcc4" />
    <path d="M152 72Q125 69 120 97Q105 118 121 139Q106 163 126 181Q143 192 155 176Q141 155 157 141Q145 119 160 99Z" fill="#b9a6cf" />
    <path d="M131 116Q118 139 133 156Q127 170 136 177Q150 163 143 148Q137 138 144 123Z" fill="#dfb9c9" />
    <path d="M151 80Q129 62 142 35Q164 42 171 74M229 73Q235 43 256 40Q265 66 247 85" fill="#f3ebdc" />
    <path d="M151 67Q142 53 146 46Q159 52 160 68M240 67Q244 54 251 51Q254 63 246 73" fill="#dfb9c9" />
    <path d="M141 104C140 74 166 56 199 57C235 55 257 76 259 102Q278 108 274 129C270 151 236 160 205 157C166 159 139 139 141 104Z" fill="#faf3e7" />
    <path d="M151 78Q160 45 191 55Q218 43 235 66Q220 82 205 73Q192 90 174 78Q161 88 151 78Z" fill="#b9a6cf" />
    <path d="M199 57Q217 48 229 64Q217 75 205 68Z" fill="#dfb9c9" />
    <path d="M191 62L202 24Q205 17 208 25L218 63Q205 69 191 62Z" fill="#d9bf83" />
    <path d="m198 43 15 5m-18 5 20 6" stroke="#bda575" strokeWidth="2" strokeLinecap="round" />
    {sleeping ? <SleepingEyes /> : <><ellipse cx="179" cy="97" rx="7" ry="10" fill="#3f4643" /><ellipse cx="231" cy="93" rx="7" ry="10" fill="#3f4643" />
    <circle cx="181" cy="94" r="2" fill="white" /><circle cx="233" cy="90" r="2" fill="white" /></>}
    <ellipse cx="160" cy="119" rx="10" ry="6" fill="#dfb9c9" />
    <ellipse cx="236" cy="131" rx="36" ry="21" fill="#eadcc4" />
    <ellipse cx="252" cy="124" rx="3" ry="2.5" fill="#a99689" />
    {happy ? <><path d="M214 137Q231 146 247 135Q243 152 231 153Q219 152 214 137Z" fill="#3f4643" /><path d="M223 148Q232 144 239 149Q232 155 223 148Z" fill="#dfb9c9" /></>
      : <path d="M220 138Q231 147 243 138" fill="none" stroke="#3f4643" strokeWidth="3" strokeLinecap="round" />}
    <path d={waving ? 'M146 179q-17 15-10 28M218 179Q270 185 286 128' : sleeping ? 'M146 179q-6 31 21 35M218 179q6 31-21 35' : happy ? 'M145 184q-22-6-26-28M218 184q22-5 27-27' : 'M146 179q-17 15-10 28M218 179q17 15 10 28'} fill="none" stroke="#e1d3bf" strokeWidth="13" strokeLinecap="round" />
    <ellipse cx="142" cy="261" rx="25" ry="12" fill="#b9a6cf" /><ellipse cx="211" cy="261" rx="25" ry="12" fill="#b9a6cf" />
  </svg>;
}
