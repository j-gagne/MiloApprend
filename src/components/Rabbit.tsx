import { SleepingEyes } from './SleepingEyes';
export function Rabbit({ happy = false, sleeping = false, celebrating = false, waving = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean; waving?: boolean }) {
  happy = happy || celebrating;
  return <svg className="rabbit" data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : waving ? 'waving' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <circle cx="112" cy="219" r="25" fill="#e5dfd5" />
    <path d="M131 239C112 219 116 171 144 150C160 135 201 137 220 154C246 177 247 223 227 245L222 267H187L178 247L162 267H122Z" fill="#c6c0b7" />
    <ellipse cx="181" cy="208" rx="39" ry="43" fill="#f6f0e4" />
    <path d="M151 110C132 81 130 18 145 13C163 7 184 65 179 107M213 108C207 67 222 8 239 13C257 19 242 87 233 115" fill="#c6c0b7" />
    <path d="M154 89C143 62 140 30 147 27C155 23 171 66 168 94M223 92C220 65 230 26 237 27C246 31 234 77 229 97" fill="#e5b1bd" />
    <path d="M139 106C144 78 172 64 207 69C244 71 265 94 262 121C259 151 232 166 198 162C160 165 133 144 139 106Z" fill="#c6c0b7" />
    <ellipse cx="178" cy="131" rx="22" ry="17" fill="#f6f0e4" /><ellipse cx="216" cy="133" rx="23" ry="17" fill="#f6f0e4" />
    {sleeping ? <SleepingEyes left={[181, 103]} right={[233, 98]} /> : <><ellipse cx="181" cy="103" rx="7" ry="10" fill="#3f4643" /><ellipse cx="233" cy="98" rx="7" ry="10" fill="#3f4643" />
    <circle cx="183" cy="100" r="2" fill="white" /><circle cx="235" cy="95" r="2" fill="white" /></>}
    <ellipse cx="157" cy="122" rx="11" ry="6" fill="#e5b1bd" /><ellipse cx="247" cy="120" rx="10" ry="6" fill="#e5b1bd" />
    <path d="M191 123Q201 119 209 124L201 133Z" fill="#cf929f" />
    {happy ? <><path d="M185 138Q201 150 217 137Q215 161 200 158Q187 156 185 138Z" fill="#3f4643" /><path d="M196 140H205V148H196Z" fill="#fffaf0" /></>
      : <path d="M201 133v6q-8 10-17 1m17-1q8 10 16 0" fill="none" stroke="#3f4643" strokeWidth="3" strokeLinecap="round" />}
    <path d="m168 136-18-2m19 7-17 4m79-9 17-3m-17 8 16 4" stroke="#968f86" strokeWidth="2" strokeLinecap="round" />
    <path d={waving ? 'M147 179q-18 15-10 28M218 180Q260 190 272 135' : sleeping ? 'M146 179q-6 31 21 35M218 179q6 31-21 35' : happy ? 'M146 182q-22-7-24-26M218 181q22-4 26-25' : 'M147 179q-18 15-10 28M218 180q18 14 9 26'} fill="none" stroke="#aaa399" strokeWidth="13" strokeLinecap="round" />
    <ellipse cx="143" cy="261" rx="25" ry="12" fill="#d6cfc3" /><ellipse cx="211" cy="261" rx="25" ry="12" fill="#d6cfc3" />
    <path d="m138 259-1 6m10-6-1 6m60-6 1 6m9-6 1 6" stroke="#f6f0e4" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
