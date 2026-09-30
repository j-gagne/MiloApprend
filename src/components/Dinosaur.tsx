import { SleepingEyes } from './SleepingEyes';
export function Dinosaur({ happy = false, sleeping = false, celebrating = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean }) {
  return <svg className={`dinosaur ${happy ? 'happy' : ''}`} data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <path d="M113 184C69 204 46 178 35 159C27 208 58 239 121 230" fill="#78a676" />
    <path d="m138 101-21-22 32-8-10-28 33 1 10-29 27 20 28-16 12 31" fill="#e9bc67" />
    <path d="M119 239C94 207 107 158 140 134L141 86C140 33 185 23 227 36C265 44 284 78 276 111C271 133 238 139 218 133L221 174C247 189 251 222 232 246L220 267H185L180 244H155L150 267H114Z" fill="#80ad7b" />
    <path d="M172 147C211 148 227 181 224 208C221 233 199 243 165 239C135 223 142 171 172 147" fill="#c6d99c" />
    <path d={celebrating ? 'M152 176q-34-5-39-42M218 174q35-5 43-40' : sleeping ? 'M152 176q-9 22 11 27M218 174q10 22-8 27' : 'M152 176q-22 11-15 29M218 174q21 5 22 20'} fill="none" stroke="#52794f" strokeWidth="12" strokeLinecap="round" />
    {sleeping ? <SleepingEyes left={[230, 76]} right={null} color="#263f37" /> : <><ellipse cx="230" cy="76" rx="7" ry="10" fill="#263f37" />
    <circle cx="232" cy="73" r="2" fill="white" /></>}
    <circle cx="263" cy="89" r="3" fill="#52794f" />
    <ellipse cx="216" cy="100" rx="13" ry="7" fill="#e6a28c" opacity=".85" />
    {celebrating ? <><path d="M237 106Q251 118 266 104Q263 127 250 127Q238 126 237 106Z" fill="#263f37" /><path d="M243 123Q251 117 259 122Q251 131 243 123Z" fill="#e6a28c" /></> : <path d={sleeping ? 'M242 110q8 4 16 0' : 'M242 110q10 7 21-2'} fill="none" stroke="#263f37" strokeWidth="4" strokeLinecap="round" />}
    <path d="m120 264 5-7m12 7 4-7m51 7 3-7m13 7 3-7" stroke="#e7e8bc" strokeWidth="5" strokeLinecap="round" />
    <path d="m79 103 4-11 4 11 11 4-11 4-4 11-4-11-11-4Zm217 65 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill="#e9b853" />
  </svg>;
}
