import { useId } from 'react'

export function WorkshopObject({ kind }: { kind: 'microphone' | 'machine' }) {
  const id = useId().replace(/:/g, '')
  return <svg className="ws-object-art" viewBox="0 0 260 280" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`}><stop stopColor="#262d28"/><stop offset=".4" stopColor="#a3a993"/><stop offset=".55" stopColor="#626c5c"/><stop offset="1" stopColor="#222922"/></linearGradient>
      <linearGradient id={`${id}-brass`} x2=".9" y2="1"><stop stopColor="#e4c994"/><stop offset=".45" stopColor="#9a783e"/><stop offset="1" stopColor="#443721"/></linearGradient>
      <radialGradient id={`${id}-orb`} cx=".35" cy=".25"><stop stopColor="#eeedc3"/><stop offset=".2" stopColor="#a5b590"/><stop offset=".7" stopColor="#47594a"/><stop offset="1" stopColor="#17261f"/></radialGradient>
    </defs>
    <ellipse cx="133" cy="245" rx="96" ry="15" fill="#050806" opacity=".55"/>
    {kind === 'microphone' ? <g>
      <path d="M139 235C202 251 218 221 251 234" stroke="#141913" strokeWidth="5" fill="none"/>
      <ellipse cx="130" cy="232" rx="48" ry="13" fill="#2a3027"/><ellipse cx="130" cy="226" rx="48" ry="12" fill={`url(#${id}-metal)`}/>
      <rect x="123" y="149" width="14" height="76" fill={`url(#${id}-brass)`}/>
      <path d="M84 98V141Q84 180 130 180Q176 180 176 141V98" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="9"/>
      <rect x="91" y="28" width="78" height="131" rx="38" fill={`url(#${id}-metal)`} stroke="#b9bbaa" strokeWidth="1.5"/>
      <rect x="100" y="38" width="60" height="110" rx="29" fill="#262f28"/>
      {Array.from({length:12},(_,i)=><path key={i} d={`M105 ${48+i*8}H155`} stroke="#8d9883" strokeWidth="2"/>)}
      <path d="M128 40V146" stroke="#c1baa2" strokeWidth="5"/><circle cx="130" cy="135" r="3" fill="#e3be75"/>
      <circle cx="83" cy="115" r="8" fill={`url(#${id}-brass)`}/><circle cx="177" cy="115" r="8" fill={`url(#${id}-brass)`}/>
    </g> : <g>
      <path d="M58 198L185 187L210 213L79 231Z" fill="#b39a6b"/><path d="M79 231L210 213V231L79 249Z" fill="#665335"/><path d="M58 198L79 231V249L58 218Z" fill="#443b2b"/>
      <path d="M95 207L113 160M170 199L148 159" stroke={`url(#${id}-brass)`} strokeWidth="10"/>
      <circle cx="133" cy="113" r="56" fill={`url(#${id}-orb)`}/>
      <g className="ws-orb-ring"><ellipse cx="133" cy="113" rx="87" ry="27" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="5" transform="rotate(-28 133 113)"/><ellipse cx="133" cy="113" rx="32" ry="81" fill="none" stroke="#b99e68" strokeWidth="3" transform="rotate(-28 133 113)"/></g>
      <circle cx="133" cy="113" r="76" fill="none" stroke="#8c774d" strokeWidth="2"/>
      <circle cx="67" cy="76" r="8" fill="#debf7f"/><circle cx="195" cy="157" r="5" fill="#b8d0a6"/>
      <rect x="104" y="226" width="53" height="9" rx="2" fill="#2b3025"/><path d="M114 230H145" stroke="#c3ad78"/>
    </g>}
  </svg>
}

export function WorkshopFurniture({ variant }: { variant: number }) {
  return <div className={`ws-furniture ws-furniture-${variant}`} aria-hidden="true">
    <div className="ws-wall-panel"><div className="ws-pinned-paper"><span>FIELD NOTES</span><i/><i/><i/><b>{variant === 0 ? '∿' : variant === 1 ? '✳' : '⌘'}</b></div><div className="ws-small-note">STUDY / 0{variant+1}<br/>THINK. MAKE. REPEAT.</div></div>
    <div className="ws-shelf"><span className="ws-book"/><span className="ws-book"/><span className="ws-book"/><span className="ws-jar"/></div>
    <div className="ws-outlet"><i/><i/></div>
  </div>
}

/** One physical tabletop shared by every viewing direction, outside the scene carousel. */
export function SharedWorkbench() {
  return <div className="ws-round-table">
    <div className="ws-table-shadow"/>
    <div className="ws-table-pedestal"/>
    <div className="ws-table-rim"/>
    <div className="ws-table-surface"><div className="ws-table-grain"/><div className="ws-table-inlay"/><div className="ws-table-items"><div className="ws-round-notebook"><i/><i/><i/></div><div className="ws-round-pencil"/></div></div>
    <div className="ws-table-maker">SHAYAN / WORKSHOP NO. 01</div>
  </div>
}
