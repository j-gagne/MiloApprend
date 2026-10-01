import { SleepingEyes } from './SleepingEyes';
export function Tiger({ happy = false, sleeping = false, celebrating = false, waving = false, silly = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean; waving?: boolean; silly?: boolean }) {
  happy = happy || celebrating;
  return <svg className="tiger" data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : waving ? 'waving' : silly ? 'silly' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <path d="M130 232C95 254 68 231 76 198Q81 181 92 186" fill="none" stroke="#dda477" strokeWidth="14" strokeLinecap="round" />
    <path d="m76 207 12 3m-8 19 10-7m-8-33 10-3" stroke="#8b6b56" strokeWidth="6" strokeLinecap="round" />
    <path d="M129 241C113 215 116 176 143 153C162 136 201 137 221 154C245 177 245 223 227 246L221 267H186L177 247L161 267H121Z" fill="#dda477" />
    <path d="m125 206 22 5m-21 17 20 1m89-24-20 6m17 17-19 1" stroke="#8b6b56" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="181" cy="210" rx="36" ry="42" fill="#f5e7cc" />
    <circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="150" cy="65" r="20" fill="#dda477" /><circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="251" cy="63" r="20" fill="#dda477" />
    <circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="150" cy="65" r="11" fill="#d9aa98" /><circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="251" cy="63" r="11" fill="#d9aa98" />
    <path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M139 101C139 66 163 44 199 45C235 43 264 64 264 99C268 135 239 160 202 161C165 163 137 139 139 101Z" fill="#e5b186" />
    <path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M178 49q1 14 7 20m17-22v20m21-17q-1 12-6 19M143 100l16 6m-14 16 14 2m102-27-15 7m12 16-13 3" fill="none" stroke="#8b6b56" strokeWidth="7" strokeLinecap="round" />
    <ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="179" cy="99" rx="17" ry="21" fill="#f5e7cc" /><ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="231" cy="95" rx="17" ry="21" fill="#f5e7cc" />
    {sleeping ? <SleepingEyes /> : <><ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="179" cy="97" rx="7" ry="10" fill="#3f4643" /><ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="231" cy="93" rx="7" ry="10" fill="#3f4643" />
    <circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="181" cy="94" r="2" fill="white" /><circle transform={silly ? 'rotate(-13 202 151)' : undefined} cx="233" cy="90" r="2" fill="white" /></>}
    <ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="165" cy="121" rx="9" ry="6" fill="#d9aa98" /><ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="244" cy="118" rx="9" ry="6" fill="#d9aa98" />
    <ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="190" cy="132" rx="22" ry="19" fill="#f5e7cc" /><ellipse transform={silly ? 'rotate(-13 202 151)' : undefined} cx="216" cy="132" rx="22" ry="19" fill="#f5e7cc" />
    <path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M194 117Q204 113 214 117Q210 128 204 128Q198 127 194 117Z" fill="#8b6b56" />
    {silly ? <><path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M182 134Q204 153 226 132" fill="none" stroke="#3f4643" strokeWidth="4" strokeLinecap="round" /><path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M205 143Q223 140 219 156Q210 166 205 153Z" fill="#d9aa98" /></> : happy ? <><path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M185 134Q204 144 222 132Q218 153 204 153Q190 153 185 134Z" fill="#3f4643" /><path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M195 148Q204 142 214 148Q204 156 195 148Z" fill="#d9aa98" /></>
      : <path transform={silly ? 'rotate(-13 202 151)' : undefined} d="M204 128v7q-9 9-18 0m18 0q9 9 18-1" fill="none" stroke="#3f4643" strokeWidth="3" strokeLinecap="round" />}
    <path d={silly ? 'M146 179Q115 184 112 218M218 179Q262 213 218 216' : waving ? 'M146 179q-17 15-10 28M218 179Q270 185 286 128' : sleeping ? 'M146 179q-6 31 21 35M218 179q6 31-21 35' : happy ? 'M145 184q-22-6-26-28M218 184q22-5 27-27' : 'M146 179q-17 15-10 28M218 179q17 15 10 28'} fill="none" stroke="#c89065" strokeWidth="13" strokeLinecap="round" />
    <circle cx={silly ? 112 : sleeping ? 167 : happy ? 119 : 136} cy={silly ? 218 : sleeping ? 214 : happy ? 156 : 207} r="9" fill="#f5e7cc" /><circle cx={silly ? 218 : waving ? 286 : sleeping ? 197 : happy ? 245 : 228} cy={silly ? 216 : waving ? 128 : sleeping ? 214 : happy ? 157 : 207} r="9" fill="#f5e7cc" />
    <ellipse cx="142" cy="261" rx="25" ry="12" fill="#f5e7cc" /><ellipse cx="211" cy="261" rx="25" ry="12" fill="#f5e7cc" />
  </svg>;
}
