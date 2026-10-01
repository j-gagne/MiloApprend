import { SleepingEyes } from './SleepingEyes';
export function Lion({ happy = false, sleeping = false, celebrating = false, waving = false, silly = false }: { happy?: boolean; sleeping?: boolean; celebrating?: boolean; waving?: boolean; silly?: boolean }) {
  happy = happy || celebrating;
  return <svg className="lion" data-variant={sleeping ? 'sleeping' : celebrating ? 'celebrating' : waving ? 'waving' : silly ? 'silly' : 'normal'} viewBox="0 0 340 300" aria-hidden="true">
    <ellipse cx="171" cy="270" rx="111" ry="14" fill="#304f36" opacity=".12" />
    <path d="M128 228Q78 242 78 202Q78 184 91 176" fill="none" stroke="#dcb77d" strokeWidth="12" strokeLinecap="round" />
    <path d="M89 187Q70 180 78 165Q85 153 99 158Q111 177 89 187Z" fill="#bd925f" />
    <path d="M129 241C113 215 116 176 143 153C162 136 201 137 221 154C245 177 245 223 227 246L221 267H186L177 247L161 267H121Z" fill="#dcb77d" />
    <ellipse cx="181" cy="210" rx="38" ry="42" fill="#f6e9ca" />
    <path transform={silly ? 'rotate(15 201 148)' : undefined} d="M133 80Q121 57 145 49Q153 27 178 37Q201 22 220 37Q247 28 257 51Q284 55 277 82Q296 100 279 119Q282 145 256 149Q245 175 220 164Q199 181 180 165Q151 173 143 150Q116 149 121 124Q103 106 119 89Z" fill="#bd925f" />
    <circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="147" cy="69" r="19" fill="#dcb77d" /><circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="251" cy="66" r="19" fill="#dcb77d" />
    <circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="147" cy="69" r="10" fill="#d9a08a" /><circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="251" cy="66" r="10" fill="#d9a08a" />
    <path transform={silly ? 'rotate(15 201 148)' : undefined} d="M141 104C140 74 166 56 199 57C236 55 259 77 260 104C263 137 236 156 201 157C164 157 139 137 141 104Z" fill="#e5c38c" />
    {sleeping ? <SleepingEyes /> : <><ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="179" cy="97" rx="7" ry="10" fill="#3f4643" /><ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="231" cy="93" rx="7" ry="10" fill="#3f4643" />
    <circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="181" cy="94" r="2" fill="white" /><circle transform={silly ? 'rotate(15 201 148)' : undefined} cx="233" cy="90" r="2" fill="white" /></>}
    <ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="157" cy="116" rx="10" ry="6" fill="#dfa891" /><ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="247" cy="114" rx="10" ry="6" fill="#dfa891" />
    <ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="187" cy="125" rx="22" ry="18" fill="#f6e9ca" /><ellipse transform={silly ? 'rotate(15 201 148)' : undefined} cx="216" cy="125" rx="22" ry="18" fill="#f6e9ca" />
    <path transform={silly ? 'rotate(15 201 148)' : undefined} d="M190 116Q202 110 213 116Q209 128 202 128Q195 127 190 116Z" fill="#876851" />
    {silly ? <><path transform={silly ? 'rotate(15 201 148)' : undefined} d="M182 135Q200 152 220 133" fill="none" stroke="#3f4643" strokeWidth="4" strokeLinecap="round" /><path transform={silly ? 'rotate(15 201 148)' : undefined} d="M203 144Q219 138 219 153Q213 166 204 153Z" fill="#dfa891" /></> : happy ? <><path transform={silly ? 'rotate(15 201 148)' : undefined} d="M185 134Q202 145 220 133Q216 153 202 153Q189 152 185 134Z" fill="#3f4643" /><path transform={silly ? 'rotate(15 201 148)' : undefined} d="M193 148Q202 141 212 148Q204 156 193 148Z" fill="#dfa891" /></>
      : <path transform={silly ? 'rotate(15 201 148)' : undefined} d="M202 128v6q-9 10-18 0m18 0q9 10 18 0" fill="none" stroke="#3f4643" strokeWidth="3" strokeLinecap="round" />}
    <path d={silly ? 'M146 179Q105 204 152 215M218 179Q250 191 248 224' : waving ? 'M146 179q-17 15-10 28M218 179Q270 185 286 128' : sleeping ? 'M146 179q-6 31 21 35M218 179q6 31-21 35' : happy ? 'M145 184q-22-6-26-28M218 184q22-5 27-27' : 'M146 179q-17 15-10 28M218 179q17 15 10 28'} fill="none" stroke="#c6a06a" strokeWidth="13" strokeLinecap="round" />
    <ellipse cx="142" cy="261" rx="25" ry="12" fill="#e5c38c" /><ellipse cx="211" cy="261" rx="25" ry="12" fill="#e5c38c" />
    <path d="m137 259-1 6m10-6-1 6m60-6 1 6m9-6 1 6" stroke="#f6e9ca" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
