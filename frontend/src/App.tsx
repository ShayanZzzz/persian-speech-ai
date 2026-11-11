import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { SharedWorkbench, WorkshopFurniture, WorkshopObject } from './WorkshopArt'
import { workshopScenes, type WorkshopSceneIndex } from './workshopScenes'
import './Workshop.css'

function PullLamp({ phase, onPull }: { phase: 'dark' | 'warming' | 'lit'; onPull: () => void }) {
  return <div className="ws-lamp-assembly">
    <svg className="ws-lamp" viewBox="0 0 200 310" aria-hidden="true">
      <defs><radialGradient id="ws-lamp-halo"><stop stopColor="#ffe5a4" stopOpacity=".65"/><stop offset=".45" stopColor="#edb766" stopOpacity=".18"/><stop offset="1" stopColor="#edb766" stopOpacity="0"/></radialGradient><linearGradient id="ws-lamp-cap"><stop stopColor="#343327"/><stop offset=".45" stopColor="#a79872"/><stop offset="1" stopColor="#3e3c2e"/></linearGradient></defs>
      <path d="M100 0V102" stroke="#5f5b4c" strokeWidth="3"/>
      <ellipse className="ws-lamp-halo" cx="100" cy="204" rx="99" ry="100" fill="url(#ws-lamp-halo)"/>
      <rect x="81" y="101" width="38" height="30" rx="5" fill="url(#ws-lamp-cap)"/>
      <path d="M83 111h34m-34 7h34m-32 7h30" stroke="#b9a67a" strokeOpacity=".55" strokeWidth="2"/>
      <path className="ws-glass" d="M84 132C84 152 53 159 53 195C53 256 147 256 147 195C147 159 116 152 116 132Z" fill="#ffffff08" stroke="#a7aa91" strokeWidth="1.5"/>
      <path d="M69 180Q59 199 72 217" stroke="#faf1ce" strokeOpacity=".3" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M93 133L84 211M107 133L116 211" stroke="#817458" fill="none"/>
      <path className="ws-filament" d="M84 211l5-16 5 23 6-23 6 23 5-23 5 16" fill="none" stroke="#63523b" strokeWidth="3" strokeLinejoin="round"/>
    </svg>
    <button className="ws-pull-cord" onClick={onPull} disabled={phase === 'warming'} aria-label={phase === 'dark' ? 'Pull the cord to light the workshop' : 'Pull the cord to turn off the light'}><span className="ws-cord-thread"/><span className="ws-cord-handle"/><span className="ws-cord-instruction">PULL TO {phase === 'lit' ? 'DIM' : 'BEGIN'} <b>↓</b></span></button>
  </div>
}

export default function App() {
  const [phase, setPhase] = useState<'dark' | 'warming' | 'lit'>('dark')
  const [scene, setScene] = useState<WorkshopSceneIndex>(1)
  const [moving, setMoving] = useState(false)
  const warmed = useRef(false)
  const focusAfterMove = useRef(false)
  const titles = useRef<(HTMLHeadingElement | null)[]>([])
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lit = phase === 'lit'

  useLayoutEffect(() => {
    const html = document.documentElement
    const old = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = old }
  }, [])
  useEffect(() => {
    if (phase !== 'warming') return
    const timer = window.setTimeout(() => { warmed.current = true; setPhase('lit') }, reduced() || warmed.current ? 160 : 2600)
    return () => window.clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    if (!moving) return
    const timer = window.setTimeout(() => {
      setMoving(false)
      if (focusAfterMove.current) titles.current[scene]?.focus({ preventScroll: true })
      focusAfterMove.current = false
    }, reduced() ? 0 : 1150)
    return () => window.clearTimeout(timer)
  }, [moving, scene])
  function moveTo(next: WorkshopSceneIndex) {
    if (!lit || moving || scene === next) return
    focusAfterMove.current = true
    setMoving(true)
    setScene(next)
  }
  function pull() {
    if (phase === 'warming' || moving) return
    setPhase(phase === 'lit' ? 'dark' : 'warming')
  }
  return <main className={`ws-app ws-${phase} ${moving ? 'ws-moving' : ''} ${warmed.current ? 'ws-has-entered' : ''}`} style={{ '--ws-scene': scene } as CSSProperties}>
    <div className="ws-room-viewport" aria-hidden={!lit} inert={!lit || moving}>
      <div className="ws-shared-environment" aria-hidden="true"><div className="ws-wall"/><div className="ws-floor"/><div className="ws-light-pool"/><SharedWorkbench /></div>
      <div className="ws-world">
        {workshopScenes.map((room, index) => <section className={`ws-room ws-room-${room.id}`} key={room.id} aria-labelledby={`ws-title-${room.id}`} aria-hidden={scene !== index} inert={scene !== index}>
          <WorkshopFurniture variant={index}/>
          <div className="ws-room-heading"><p>{room.subtitle}</p><h1 id={`ws-title-${room.id}`} ref={element => { titles.current[index] = element }} tabIndex={-1}>{room.title}</h1><span>{room.description}</span></div>
          {room.id === 'home' ? <div className="ws-tools">
            <button className="ws-tool ws-tool-left" onClick={() => moveTo(0)} aria-label="Explore the sound bench on the left"><WorkshopObject kind="microphone"/><span className="ws-object-label"><small>01 / THE SOUND BENCH</small><strong>Follow the sound <b>←</b></strong></span></button>
            <button className="ws-tool ws-tool-right" onClick={() => moveTo(2)} aria-label="Explore the experimental lab on the right"><WorkshopObject kind="machine"/><span className="ws-object-label"><small>02 / THE EXPERIMENTAL LAB</small><strong>Follow your curiosity <b>→</b></strong></span></button>
          </div> : <>
            <div className="ws-room-object"><WorkshopObject kind={room.id === 'sound' ? 'microphone' : 'machine'}/></div>
            <div className="ws-room-details">
              {room.id === 'sound' ? <><p className="ws-detail-kicker">NEGAR / THE MEDIA WORKSPACE</p><h2>Give your ideas<br/>a voice.</h2><nav aria-label="Negar tools"><Link to="/studio/stt">Speech to text <span>↗</span></Link><Link to="/studio/tts">Text to speech <small>English / in development</small><span>↗</span></Link><Link to="/studio/video">Video & subtitles <span>↗</span></Link><Link to="/studio">Explore Negar <span>↗</span></Link></nav></> : <><p className="ws-detail-kicker">WORK IN PROGRESS</p><h2>Not every idea<br/>has a name yet.</h2><p>This corner is for new tools, strange prototypes and the next experiment.</p><div className="ws-lab-note"><span>EXPERIMENT 001</span><b>Something is taking shape.</b><small>More to come</small></div></>}
              <button className="ws-return" onClick={() => moveTo(1)}>{room.id === 'sound' ? 'Back to the workbench →' : '← Back to the workbench'}</button>
            </div>
          </>}
        </section>)}
      </div>
    </div>
    <div className="ws-darkness" aria-hidden="true"/>
    <PullLamp phase={phase} onPull={pull}/>
    <div className="ws-entry-message" role="status">{phase === 'warming' ? 'A little light. A world of possibilities.' : phase === 'dark' ? 'Every idea begins with a little light.' : ''}</div>
    <header className="ws-header" hidden={!lit} inert={moving}><button onClick={() => moveTo(1)} aria-label="Return to the central workbench">SHAYAN<span>HUB</span><small>AN INDEPENDENT WORKSHOP</small></button><span className="ws-location">EST. IN CURIOSITY / {workshopScenes[scene].number}</span></header>
    <nav className="ws-scene-nav" aria-label="Workshop rooms" hidden={!lit} inert={moving}>{workshopScenes.map((room,index)=><button key={room.id} aria-current={scene === index ? 'page' : undefined} onClick={()=>moveTo(index as WorkshopSceneIndex)}><span>{room.number}</span>{room.id === 'home' ? 'Workbench' : room.id === 'sound' ? 'Sound bench' : 'Experimental lab'}</button>)}</nav>
    <p className="ws-scene-status" role="status" aria-live="polite">{lit && !moving ? `${workshopScenes[scene].title}` : ''}</p>
  </main>
}
