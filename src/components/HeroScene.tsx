import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConversionMode } from '../lib/convert';
import './hero-scene.css';

/**
 * Large per-tool hero illustrations (pure SVG + CSS transform/opacity keyframes, no JS animation).
 *
 *   <HeroScene id="extract" play={n} />
 *
 * wait = true (while play is 0) -> hold the "before" pose, paused, so an upcoming autoplay doesn't snap from the finished frame.
 * play = 0 -> the static idle frame. Any higher value plays the animation once; a new value replays it.
 * Each scene's idle frame is its "finished" picture; the animation runs from the "before" pose into it.
 * Triggering (viewport / hover / mobile) is deliberately left to the caller. Unknown ids render null.
 * Ids: merge, organize, extract (alias split), crop, compress, ocr, protect (alias lock), unlock, convert
 * (uses `mode`, or pass 'pdf-to-docx' / 'docx-to-pdf' directly).
 */
type Vars = Record<string, string>;
const st = (v?: Vars) => v as React.CSSProperties | undefined;
const Y = 'var(--hl, #FFD43B)';
const INK = '#14171C';
const LINE = '#E1E5EB';

/** a row of text-line strokes: n lines from (x,y), `w` wide, last one shorter */
const rows = (x: number, y: number, w: number, n: number, gap = 11) =>
  Array.from({ length: n }, (_, i) => `M${x} ${y + i * gap}h${i === n - 1 ? w * 0.6 : w}`).join('');

interface SheetProps { x: number; y: number; w?: number; h?: number; fill?: string; bar?: boolean; lines?: number; edge?: string; t?: string; cls?: string; v?: Vars; children?: ReactNode }
/** A page: soft offset shadow (no filter), body, optional yellow title bar and text lines. `t` = static transform, cls/v = animated. */
function Sheet({ x, y, w = 88, h = 116, fill = '#fff', bar, lines = 0, edge, t, cls, v, children }: SheetProps) {
  return (
    <g transform={t}>
      <g className={cls ? `a ${cls}` : undefined} style={st(v)}>
        <rect x={x} y={y + 6} width={w} height={h} rx="8" fill="#000" opacity=".28" />
        <rect x={x} y={y} width={w} height={h} rx="8" fill={fill} stroke={edge} strokeWidth={edge ? 3 : 0} />
        {bar && <rect x={x + 12} y={y + 14} width={w * 0.52} height="7" rx="3.5" fill={Y} />}
        {lines > 0 && <path d={rows(x + 12, y + (bar ? 36 : 22), w - 24, lines)} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />}
        {children}
      </g>
    </g>
  );
}
const Floor = () => <ellipse cx="170" cy="198" rx="140" ry="12" fill="var(--line, #2A2F38)" opacity=".4" />;
const Dash = ({ d, cls = 'fade', v }: { d: string; cls?: string; v?: Vars }) => (
  <path className={`a ${cls}`} style={st(v)} d={d} stroke={Y} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8" />
);
const Head = ({ d, cls = 'fade', v }: { d: string; cls?: string; v?: Vars }) => (
  <path className={`a ${cls}`} style={st(v)} d={d} stroke={Y} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
);
const Check = ({ x, y, cls = 'pop' }: { x: number; y: number; cls?: string }) => (
  <g className={`a ${cls}`}><circle cx={x} cy={y} r="13" fill={Y} /><path d={`M${x - 6} ${y}l4.5 4.5 8-9`} stroke={INK} strokeWidth="3" /></g>
);

/** A format-specific page for the convert scene. */
function Doc({ x, kind, cls, v }: { x: number; kind: 'pdf' | 'docx'; cls?: string; v?: Vars }) {
  const y = 44, w = 92, h = 124;
  return (
    <g className={cls ? `a ${cls}` : undefined} style={st(v)}>
      <rect x={x} y={y + 6} width={w} height={h} rx="8" fill="#000" opacity=".28" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#fff" />
      <rect x={x + 12} y={y + 12} width={kind === 'pdf' ? 34 : 44} height="15" rx="7.5" fill={Y} />
      <text x={x + 12 + (kind === 'pdf' ? 17 : 22)} y={y + 23} textAnchor="middle" fontSize="9" fontWeight="800" fill={INK} stroke="none" fontFamily="inherit">{kind === 'pdf' ? 'PDF' : 'DOCX'}</text>
      {kind === 'pdf' ? (
        <>
          <path d={rows(x + 12, y + 46, w - 24, 6, 13)} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />
          <path d={`M${x + w - 22} ${y}v22a8 8 0 0 0 8 8h14`} fill="#D5D9E1" stroke="none" />
        </>
      ) : (
        <>
          <path d={`M${x + 12} ${y + 36}h${w - 24}`} stroke={INK} strokeWidth="4.5" strokeLinecap="round" opacity=".85" />
          <rect x={x + 12} y={y + 48} width="30" height="26" rx="4" fill="#C9CED8" />
          <path d={`${rows(x + 48, y + 52, w - 60, 3, 9)}${rows(x + 12, y + 84, w - 24, 4, 10)}`} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function scene(id: string, mode: ConversionMode): ReactNode {
  switch (id) {
    case 'merge': // three separate pages slide together into one stack
      return (<>
        <Floor />
        <Head d="M52 112h32M74 99l12 13-12 13" /><Head d="M288 112h-32M266 99l-12 13 12 13" />
        <Sheet x={120} y={52} t="rotate(-5 164 110)" fill="#C3C8D2" lines={4} cls="in" v={{ '--x': '-128px', '--r': '-9deg' }} />
        <Sheet x={132} y={44} t="rotate(4 176 102)" fill="#E1E4EA" lines={4} cls="in" v={{ '--x': '128px', '--r': '9deg' }} />
        <Sheet x={126} y={48} bar lines={5} cls="in" v={{ '--y': '-26px', '--d': '.12s' }} />
        <g transform="translate(46 -6)"><Check x={170} y={54} /></g>
      </>);
    case 'split':
    case 'extract': // a stack separates and one selected page pulls out
      return (<>
        <Floor />
        <Sheet x={22} y={50} t="rotate(-6 66 108)" fill="#C3C8D2" />
        <Sheet x={28} y={46} t="rotate(-3 72 104)" fill="#E1E4EA" lines={4} />
        <Sheet x={36} y={40} bar lines={6} />
        <Dash d="M142 78c14-14 28-16 42-12" /><Head d="M176 58l9 8-11 6" />
        <Dash d="M142 142c14 12 28 14 40 8" /><Head d="M174 142l9 8-12 5" />
        <Sheet x={214} y={34} t="rotate(7 258 92)" fill="#AEB4C0" cls="in" v={{ '--x': '-176px', '--o': '0' }} />
        <Sheet x={194} y={52} t="rotate(-4 238 110)" fill="#E1E4EA" lines={4} cls="in" v={{ '--x': '-156px', '--o': '0', '--d': '.1s' }} />
        <Sheet x={206} y={58} bar lines={5} edge={Y} cls="sel" />
        <Head d="M296 46l4-9M306 55l9-5M309 67l10-1" cls="pop" />
      </>);
    case 'organize': // pages reorder, the first hops to the end
      return (<>
        <Floor />
        <path d="M70 168h4M175 168h4M280 168h4" stroke="none" />
        <Dash d="M64 44C110 2 230 2 278 40" /><Head d="M268 30l11 11-15 4" />
        <Sheet x={26} y={56} w={78} h={104} lines={5} cls="in" v={{ '--x': '105px' }}>
          <rect x="38" y="70" width="54" height="30" rx="4" fill="#C9CED8" />
        </Sheet>
        <Sheet x={131} y={56} w={78} h={104} cls="in" v={{ '--x': '105px', '--d': '.06s' }}>
          <path d={rows(143, 74, 54, 2, 10)} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" /><path d={rows(143, 104, 54, 4, 10)} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />
        </Sheet>
        <Sheet x={236} y={56} w={78} h={104} bar lines={4} edge={Y} cls="hop" v={{ '--x': '-210px' }} />
      </>);
    case 'crop': // crop boundaries move inward around the page
      return (<>
        <Floor />
        <Sheet x={110} y={26} w={120} h={160} bar lines={0}>
          <rect x="124" y="58" width="92" height="48" rx="5" fill="#C9CED8" />
          <path d={rows(124, 124, 92, 4, 12)} stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />
        </Sheet>
        <path className="a fade" d="M110 26h120v160H110z M128 44h84v118h-84z" fillRule="evenodd" fill={INK} opacity=".55" stroke="none" />
        <g className="a in" style={st({ '--s': '1.3' })}>
          <rect x="128" y="44" width="84" height="118" fill={Y} opacity=".12" stroke="none" />
          <rect x="128" y="44" width="84" height="118" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d="M128 60V44h16M196 44h16v16M212 146v16h-16M144 162h-16v-16" stroke={Y} strokeWidth="5" vectorEffect="non-scaling-stroke" />
        </g>
      </>);
    case 'compress': // the page contracts inside its original outline while the size bar drops
      return (<>
        <rect x="120" y="34" width="100" height="132" rx="9" stroke="#98A0AE" strokeWidth="2" strokeDasharray="5 6" opacity=".6" />
        <Head d="M92 88l11 12-11 12" cls="in" v={{ '--x': '-18px' }} /><Head d="M248 88l-11 12 11 12" cls="in" v={{ '--x': '18px' }} />
        <Head d="M158 10l12 11 12-11" cls="in" v={{ '--y': '-14px' }} /><Head d="M158 190l12-11 12 11" cls="in" v={{ '--y': '14px' }} />
        <g transform="translate(170 100) scale(.66) translate(-170 -100)">
          <g className="a in" style={st({ '--s': '1.5' })}>
            <rect x="120" y="40" width="100" height="132" rx="10" fill="#000" opacity=".28" />
            <rect x="120" y="34" width="100" height="132" rx="10" fill="#fff" />
            <rect x="136" y="52" width="52" height="9" rx="4.5" fill={Y} />
            <path d={rows(136, 78, 68, 6, 14)} stroke={LINE} strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
        <rect x="100" y="204" width="140" height="9" rx="4.5" fill="var(--line, #2A2F38)" />
        <rect className="a bar" x="100" y="204" width="140" height="9" rx="4.5" fill={Y} />
      </>);
    case 'ocr': // scan bar sweeps down the page and the text resolves behind it
      return (<>
        <Floor />
        <Sheet x={110} y={24} w={120} h={160} bar>
          {[60, 78, 96, 114, 132, 150].map((y, i) => <rect key={y} x="124" y={y - 5} width={[92, 80, 92, 70, 86, 50][i]} height="10" rx="3" fill="#AEB4C0" opacity=".3" />)}
          <rect className="a fade" x="122" y="73" width="52" height="12" rx="3" fill={Y} opacity=".55" stroke="none" style={st({ '--d': '.1s' })} />
          <rect className="a fade" x="122" y="109" width="40" height="12" rx="3" fill={Y} opacity=".55" stroke="none" style={st({ '--d': '.1s' })} />
          {[60, 78, 96, 114, 132, 150].map((y, i) => <path key={y} className={`a r${i + 1}`} d={`M124 ${y}h${[92, 80, 92, 70, 86, 50][i]}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />)}
        </Sheet>
        <g className="a scan" style={st({ '--h': '140px' })}>
          <rect x="104" y="24" width="132" height="22" fill="url(#hs-scan)" stroke="none" />
          <rect x="104" y="44" width="132" height="3" rx="1.5" fill={Y} stroke="none" />
        </g>
        <defs><linearGradient id="hs-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={Y} stopOpacity="0" /><stop offset="1" stopColor={Y} stopOpacity=".6" /></linearGradient></defs>
      </>);
    case 'lock':
    case 'protect': // a padlock comes down on the page and the shackle snaps shut
      return (<>
        <Floor />
        <Sheet x={116} y={22} w={108} h={140} bar lines={5} edge={Y} />
        <g className="a in" style={st({ '--y': '-54px', '--o': '0' })}>
          <path className="a in" style={st({ '--y': '-18px', '--d': '.55s' })} d="M152 104V88a18 18 0 0 1 36 0v16" stroke={INK} strokeWidth="8" />
          <rect x="142" y="104" width="56" height="46" rx="11" fill={Y} />
          <circle cx="170" cy="123" r="5.5" fill={INK} stroke="none" /><path d="M170 126v10" stroke={INK} strokeWidth="4.5" />
        </g>
        <Head d="M128 100l-10-4M128 114l-12 3M212 100l10-4M212 114l12 3" cls="pop" />
      </>);
    case 'unlock': // the shackle pops loose and swings open, releasing the page
      return (<>
        <Floor />
        <g className="a in" style={st({ '--y': '10px' })}>
          <Sheet x={116} y={22} w={108} h={140} bar lines={5} />
          <rect className="a dimout" x="116" y="22" width="108" height="140" rx="8" fill={INK} stroke="none" />
        </g>
        <path className="a open" d="M152 104V88a18 18 0 0 1 36 0v16" stroke={INK} strokeWidth="8" />
        <rect x="142" y="104" width="56" height="46" rx="11" fill={Y} />
        <circle cx="170" cy="123" r="5.5" fill={INK} stroke="none" /><path d="M170 126v10" stroke={INK} strokeWidth="4.5" />
        <Head d="M200 70l8-8M212 82l10-3M126 70l-8-8M114 82l-10-3" cls="pop" />
      </>);
    case 'convert':
    case 'pdf-to-docx':
    case 'docx-to-pdf': { // the page flips into the other format
      const p2d = id === 'pdf-to-docx' || (id === 'convert' && mode === 'pdf-to-docx');
      const a: 'pdf' | 'docx' = p2d ? 'pdf' : 'docx', b: 'pdf' | 'docx' = p2d ? 'docx' : 'pdf';
      return (<>
        <Floor />
        <Doc x={30} kind={a} />
        <Head d="M136 104h58M182 91l13 13-13 13" />
        <Doc x={218} kind={b} cls="fi" />
        <Doc x={218} kind={a} cls="fo" v={{ '--x': '-188px' }} />
      </>);
    }
    default:
      return null;
  }
}

/** Longest scene (2.6s + largest delay) plus a little slack; replays requested sooner are ignored. */
const PLAY_LOCK_MS = 3300;

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Replay control for <HeroScene play={...}>. `replay()` is ignored while a run is still playing, so hover + tap
 * (touch fires both) or hovering mid-animation never restarts it. `replay(true)` always restarts (e.g. new content).
 */
export function useHeroReplay(initial = 0) {
  const [play, setPlay] = useState(initial);
  const last = useRef(initial ? performance.now() : 0);
  const replay = useCallback((force = false) => {
    const now = performance.now();
    if (!force && last.current && now - last.current < PLAY_LOCK_MS) return;
    last.current = now;
    setPlay((n) => n + 1);
  }, []);
  return [play, replay] as const;
}

export const HERO_SCENE_IDS = ['merge', 'organize', 'extract', 'crop', 'compress', 'ocr', 'protect', 'unlock', 'convert'];

export default function HeroScene({ id, mode = 'pdf-to-docx', play = 0, wait = false, className = '' }: { id: string; mode?: ConversionMode; play?: number; wait?: boolean; className?: string }) {
  const body = scene(id, mode);
  if (!body) return null;
  return (
    <svg viewBox="0 0 340 220" aria-hidden="true" className={`hs ${play || wait ? 'hs-play' : ''} ${wait && !play ? 'hs-wait' : ''} ${className}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g key={play}>{body}</g>
    </svg>
  );
}
