import type { ConversionMode } from '../lib/convert';

/** Row y-positions and widths for the text lines drawn on each sheet. */
const ROWS = [
  { y: 46, w: 52 },
  { y: 60, w: 44 },
  { y: 74, w: 52 },
  { y: 88, w: 36 },
  { y: 102, w: 48 },
];

/** A sheet of paper with a folded corner and a format badge. */
function Sheet({ x, label }: { x: number; label: string }) {
  return (
    <g>
      <path
        d={`M${x} 14 H${x + 62} L${x + 80} 32 V126 H${x} Z`}
        fill="var(--card)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round"
      />
      <path d={`M${x + 62} 14 V32 H${x + 80}`} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <rect x={x + 8} y="20" width="34" height="14" rx="7" fill="var(--hl)" />
      <text x={x + 25} y="30.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--hl-ink)" fontFamily="inherit" stroke="none">{label}</text>
    </g>
  );
}

/**
 * Looping SVG that shows what the running operation is doing, one scene per conversion direction.
 * Colours come from the theme variables. `active={false}` freezes it on a finished frame, and the global
 * prefers-reduced-motion rule already stops the loops.
 */
export default function OpAnimation({ kind, active = true, className = '' }: { kind: ConversionMode; active?: boolean; className?: string }) {
  const pdfToWord = kind === 'pdf-to-docx';
  const from = pdfToWord ? 'PDF' : 'DOCX';
  const to = pdfToWord ? 'DOCX' : 'PDF';
  return (
    <svg
      viewBox="0 0 260 140" role="img" className={`op-anim ${active ? '' : 'op-idle'} ${className}`}
      aria-label={pdfToWord ? 'Reading the PDF and writing a Word document' : 'Reading the Word document and writing a PDF'}
    >
      {/* source sheet */}
      <Sheet x={20} label={from} />
      <g>
        {ROWS.map((r, i) => (
          <rect
            key={i} x="30" y={r.y} width={r.w} height="5" rx="2.5" fill="var(--mute)"
            className={pdfToWord ? undefined : 'op-fly'} style={{ ['--d' as string]: `${i * 0.18}s` }}
          />
        ))}
        {pdfToWord && <rect className="op-scan" x="24" y="40" width="64" height="16" rx="3" fill="var(--hl)" />}
      </g>

      {/* flow arrow */}
      <path className="op-flow" d="M112 78 H146" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M140 71 L148 78 L140 85" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* result sheet */}
      <Sheet x={160} label={to} />
      <g>
        {ROWS.map((r, i) => (
          <rect
            key={i} x="170" y={r.y} width={r.w} height="5" rx="2.5" fill="var(--ink)"
            className="op-grow" style={{ ['--d' as string]: `${i * 0.35}s` }}
          />
        ))}
        {pdfToWord
          ? <rect className="op-caret" x="224" y="100" width="2.5" height="10" rx="1" fill="var(--ink)" />
          : <circle className="op-stamp" cx="224" cy="108" r="9" fill="var(--hl)" stroke="var(--ink)" strokeWidth="2" />}
        {!pdfToWord && <path className="op-stamp" d="M219.5 108 l3 3 l6 -6.5" fill="none" stroke="var(--hl-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}

type SV = React.CSSProperties & Record<`--${string}`, string>;
const sv = (o: Record<string, string>) => o as SV;

/** A sheet of paper. Extra classes/vars drive its animation. */
function Pg({ x, y, w = 28, h = 36, cls = '', st, children }: { x: number; y: number; w?: number; h?: number; cls?: string; st?: Record<string, string>; children?: React.ReactNode }) {
  return (
    <g className={cls ? `a ${cls}` : undefined} style={st ? sv(st) : undefined}>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--card)" />
      {children}
    </g>
  );
}
const Ln = ({ x, y, w, cls = '', st }: { x: number; y: number; w: number; cls?: string; st?: Record<string, string> }) => (
  <path d={`M${x} ${y}h${w}`} stroke="var(--mute)" strokeWidth="1.6" className={cls ? `a ${cls}` : undefined} style={st ? sv(st) : undefined} />
);

/** Each scene's resting pose is its finished frame; the animation runs from the "before" pose to it (or out and back). */
function scene(id: string, mode: ConversionMode): React.ReactNode {
  switch (id) {
    case 'merge': // three separate sheets slide together into one stack
      return (<>
        <Pg x={43} y={24} cls="in" st={{ '--x': '-33px', '--y': '-2px', '--r': '-4deg' }}><Ln x={48} y={34} w={16} /><Ln x={48} y={40} w={12} /></Pg>
        <Pg x={49} y={20} cls="in" st={{ '--x': '33px', '--y': '2px', '--r': '4deg' }}><Ln x={54} y={30} w={16} /><Ln x={54} y={36} w={10} /></Pg>
        <Pg x={46} y={22} cls="in" st={{ '--y': '-8px', '--d': '.15s' }}>
          <rect x="51" y="27" width="14" height="5" rx="2" fill="var(--hl)" /><Ln x={51} y={38} w={18} /><Ln x={51} y={44} w={12} /><Ln x={51} y={50} w={16} />
        </Pg>
      </>);
    case 'extract': // stack fans apart, the chosen page pulls out, everything settles back
      return (<>
        <Pg x={36} y={28} cls="out" st={{ '--x': '-15px', '--y': '3px' }}><Ln x={41} y={38} w={14} /></Pg>
        <Pg x={39} y={26} cls="out" st={{ '--x': '-10px', '--y': '2px' }}><Ln x={44} y={36} w={14} /></Pg>
        <Pg x={42} y={24} cls="out" st={{ '--x': '-5px', '--y': '1px' }}><Ln x={47} y={34} w={14} /></Pg>
        <g className="a pull" style={sv({ '--x': '34px', '--y': '-3px' })}>
          <rect x="45" y="22" width="28" height="36" rx="3" fill="var(--card)" />
          <rect x="50" y="28" width="14" height="5" rx="2" fill="var(--hl)" /><Ln x={50} y={40} w={18} /><Ln x={50} y={46} w={12} />
          <g className="a badge"><circle cx="73" cy="22" r="6" fill="var(--hl)" /><path d="M70 22l2 2 4-4.5" stroke="var(--hl-ink)" strokeWidth="1.6" fill="none" /></g>
        </g>
      </>);
    case 'organize': // thumbnails hop into a new order
      return (<>
        <Pg x={16} y={24} w={24} h={32} cls="in" st={{ '--x': '32px', '--y': '0px' }}><Ln x={20} y={34} w={14} /><Ln x={20} y={40} w={14} /></Pg>
        <Pg x={48} y={24} w={24} h={32} cls="in" st={{ '--x': '32px', '--y': '0px' }}><Ln x={52} y={34} w={14} /><Ln x={52} y={40} w={14} /><Ln x={52} y={46} w={9} /></Pg>
        <g className="a hop" style={sv({ '--x': '-64px' })}>
          <rect x="80" y="24" width="24" height="32" rx="3" fill="var(--card)" /><rect x="84" y="29" width="12" height="5" rx="2" fill="var(--hl)" /><Ln x={84} y={42} w={14} />
        </g>
        <path d="M16 66h88" stroke="var(--line)" strokeWidth="2" />
      </>);
    case 'crop': // crop frame closes in on the page
      return (<>
        <Pg x={42} y={17} w={36} h={46}><rect x="48" y="23" width="14" height="5" rx="2" fill="var(--hl)" /><Ln x={48} y={36} w={24} /><Ln x={48} y={42} w={24} /><Ln x={48} y={48} w={16} /><Ln x={48} y={54} w={22} /></Pg>
        <g className="a in" style={sv({ '--s': '1.5' })}>
          <rect x="48" y="24" width="24" height="32" fill="var(--hl)" opacity=".18" />
          <rect x="48" y="24" width="24" height="32" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          {[[48, 24], [72, 24], [48, 56], [72, 56]].map(([cx, cy]) => <rect key={`${cx}${cy}`} x={cx - 2.2} y={cy - 2.2} width="4.4" height="4.4" fill="var(--ink)" />)}
        </g>
      </>);
    case 'compress': // page squeezes in from both sides and the size bar drops
      return (<>
        <g className="a sq" style={sv({ '--sx': '.72', '--sy': '.58' })}>
          <rect x="46" y="16" width="28" height="36" rx="3" fill="var(--card)" /><Ln x={51} y={26} w={18} /><Ln x={51} y={32} w={18} /><Ln x={51} y={38} w={12} />
        </g>
        <path className="a out" style={sv({ '--y': '7px' })} d="M54 6l6 5 6-5" fill="none" stroke="var(--ink)" strokeWidth="1.8" />
        <path className="a out" style={sv({ '--y': '-7px' })} d="M54 62l6-5 6 5" fill="none" stroke="var(--ink)" strokeWidth="1.8" />
        <rect x="30" y="68" width="60" height="6" rx="3" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        <rect className="a bar" x="31" y="69" width="58" height="4" rx="2" fill="var(--hl)" />
      </>);
    case 'ocr': // scan bar sweeps down and the text resolves behind it
      return (<>
        <Pg x={42} y={12} w={36} h={54}>
          {[26, 34, 42, 50].map((y, i) => <rect key={y} x="48" y={y - 2.5} width={i === 3 ? 16 : 24} height="5" rx="1.5" fill="var(--mute)" opacity=".28" />)}
          <path className="a r1" d="M48 26h24" stroke="var(--ink)" strokeWidth="1.8" />
          <path className="a r2" d="M48 34h24" stroke="var(--ink)" strokeWidth="1.8" />
          <path className="a r3" d="M48 42h24" stroke="var(--ink)" strokeWidth="1.8" />
          <path className="a r4" d="M48 50h16" stroke="var(--ink)" strokeWidth="1.8" />
        </Pg>
        <rect className="a scan" x="38" y="16" width="44" height="3.5" rx="1.75" fill="var(--hl)" stroke="var(--ink)" strokeWidth="1" style={sv({ '--h': '40px' })} />
      </>);
    case 'protect': // padlock comes down on the page and the shackle snaps shut
      return (<>
        <Pg x={42} y={10} w={36} h={46}><Ln x={48} y={20} w={20} /><Ln x={48} y={26} w={20} /><Ln x={48} y={32} w={12} />
          <rect className="a tint" x="42" y="10" width="36" height="46" rx="3" fill="var(--hl)" opacity=".4" />
        </Pg>
        <g className="a in" style={sv({ '--y': '-14px', '--o': '0' })}>
          <path className="a in" style={sv({ '--y': '-7px', '--d': '.5s' })} d="M54 42V36a6 6 0 0 1 12 0v6" fill="none" stroke="var(--ink)" strokeWidth="2.4" />
          <rect x="49" y="42" width="22" height="18" rx="4" fill="var(--hl)" />
          <circle cx="60" cy="50" r="2.2" fill="var(--hl-ink)" />
        </g>
      </>);
    case 'unlock': // shackle pops loose and swings open
      return (<>
        <Pg x={42} y={10} w={36} h={46}><Ln x={48} y={20} w={20} /><Ln x={48} y={26} w={20} /><Ln x={48} y={32} w={12} />
          <rect className="a tintout" x="42" y="10" width="36" height="46" rx="3" fill="var(--hl)" />
        </Pg>
        <path className="a open" d="M54 42V36a6 6 0 0 1 12 0v6" fill="none" stroke="var(--ink)" strokeWidth="2.4" />
        <rect x="49" y="42" width="22" height="18" rx="4" fill="var(--hl)" />
        <circle cx="60" cy="50" r="2.2" fill="var(--hl-ink)" />
      </>);
    case 'delete': // a page is pulled from the stack and fades away
      return (<>
        <Pg x={36} y={26} cls="out" st={{ '--x': '-3px', '--y': '2px' }}><Ln x={41} y={36} w={14} /></Pg>
        <Pg x={39} y={24} cls="out" st={{ '--x': '-1px', '--y': '1px' }}><Ln x={44} y={34} w={14} /></Pg>
        <Pg x={42} y={22}><Ln x={47} y={32} w={14} /><Ln x={47} y={38} w={10} /></Pg>
        <g className="a gone" style={sv({ '--x': '36px', '--y': '-6px' })}>
          <rect x="45" y="20" width="28" height="36" rx="3" fill="var(--card)" /><rect x="50" y="26" width="14" height="5" rx="2" fill="var(--hl)" /><Ln x={50} y={38} w={18} />
          <path d="M55 44l8 8M63 44l-8 8" stroke="var(--ink)" strokeWidth="2" />
        </g>
      </>);
    case 'rotate': // page turns a quarter and the arrow traces the turn
      return (<>
        <g className="a rot"><rect x="46" y="22" width="28" height="36" rx="3" fill="var(--card)" /><rect x="51" y="27" width="10" height="5" rx="2" fill="var(--hl)" /><Ln x={51} y={40} w={18} /><Ln x={51} y={46} w={12} /></g>
        <path className="a draw" pathLength="1" d="M84 26a22 22 0 0 1 0 28M84 54l-5-1M84 54l1-5" fill="none" stroke="var(--ink)" strokeWidth="1.8" />
      </>);
    case 'watermark': // watermark stamps diagonally across the page
      return (<>
        <Pg x={43} y={16} w={34} h={48}><Ln x={48} y={26} w={24} /><Ln x={48} y={33} w={24} /><Ln x={48} y={40} w={24} /><Ln x={48} y={47} w={16} /></Pg>
        <text className="a wm" x="60" y="43" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--ink)" fontFamily="inherit" stroke="none">DRAFT</text>
      </>);
    case 'sign': // signature stroke is drawn on the page
      return (<>
        <Pg x={43} y={12} w={34} h={48}><Ln x={48} y={22} w={24} /><Ln x={48} y={29} w={24} /><Ln x={48} y={36} w={14} /><path d="M48 52h24" stroke="var(--line)" strokeWidth="1.4" /></Pg>
        <path className="a draw" pathLength="1" d="M49 51c3-9 5-9 6-2s2 5 5-1c2-5 4-4 4 0s4 3 8-4" fill="none" stroke="var(--ink)" strokeWidth="2" />
      </>);
    case 'convert': { // document changes format: tokens cross the arrow, the other sheet fills in
      const p2d = mode === 'pdf-to-docx';
      const from = p2d ? 'PDF' : 'DOCX', to = p2d ? 'DOCX' : 'PDF';
      const rowCls = p2d ? 'r' : 'drop';
      return (<>
        <Pg x={12} y={18} w={30} h={42}><rect x="16" y="22" width="22" height="9" rx="4.5" fill="var(--hl)" /><text x="27" y="28.7" textAnchor="middle" fontSize="6" fontWeight="700" fill="var(--hl-ink)" fontFamily="inherit" stroke="none">{from}</text><Ln x={17} y={40} w={20} /><Ln x={17} y={46} w={20} /><Ln x={17} y={52} w={12} /></Pg>
        <path d="M50 39h20M65 34l5 5-5 5" fill="none" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {[0, 1, 2].map((i) => <rect key={i} className="a tok" x="50" y="37" width="7" height="4" rx="2" fill="var(--hl)" stroke="var(--ink)" strokeWidth="1" style={sv({ '--d': `${i * 0.28}s` })} />)}
        <Pg x={78} y={18} w={30} h={42}><rect x="82" y="22" width="22" height="9" rx="4.5" fill="var(--hl)" /><text x="93" y="28.7" textAnchor="middle" fontSize="6" fontWeight="700" fill="var(--hl-ink)" fontFamily="inherit" stroke="none">{to}</text>
          <path className={`a ${rowCls}1`} d="M83 40h20" stroke="var(--ink)" strokeWidth="1.8" /><path className={`a ${rowCls}2`} d="M83 46h20" stroke="var(--ink)" strokeWidth="1.8" /><path className={`a ${rowCls}3`} d="M83 52h12" stroke="var(--ink)" strokeWidth="1.8" />
        </Pg>
        {!p2d && <g className="a pop"><circle cx="108" cy="18" r="6" fill="var(--hl)" /><path d="M105 18l2 2 4-4.5" stroke="var(--hl-ink)" strokeWidth="1.6" fill="none" /></g>}
      </>);
    }
    default:
      return null;
  }
}

export const SCENE_IDS = ['merge', 'extract', 'organize', 'crop', 'compress', 'delete', 'ocr', 'protect', 'unlock', 'rotate', 'watermark', 'sign', 'convert'];

/**
 * Per-tool illustration (pure SVG + CSS transforms/opacity, see .ts in index.css). Purely presentational:
 * `play` = 0 renders the static idle frame; any higher value plays the animation once, and a new value replays it.
 * Triggering (viewport, hover, etc.) is up to the caller. Returns null for ids without a scene.
 */
export function ToolScene({ id, mode = 'pdf-to-docx', play = 0, className = '' }: { id: string; mode?: ConversionMode; play?: number; className?: string }) {
  const body = scene(id, mode);
  if (!body) return null;
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className={`ts ${play ? 'ts-play' : ''} ${className}`} fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <g key={play}>{body}</g>
    </svg>
  );
}
