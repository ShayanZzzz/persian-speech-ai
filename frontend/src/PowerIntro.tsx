import './App.css';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
type PowerIntroProps = {
    initiallyPowered?: boolean;
    entering?: boolean;
    onPowerChange: (powered: boolean) => void;
    /** Optional replacement clip: disconnected at first, connected at its end. */
    videoSrc?: string;
    posterSrc?: string;
};
export default function PowerIntro({ onPowerChange, videoSrc, posterSrc, initiallyPowered = false, entering = false }: PowerIntroProps) {
    const [phase, setPhase] = useState<'off' | 'connecting' | 'warming' | 'on'>(initiallyPowered ? 'on' : 'off');
    const [videoFailed, setVideoFailed] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const drag = useRef<{ id: number; start: number; origin: number; value: number } | null>(null);
    const [dragX, setDragX] = useState<number | null>(null);
    const position = dragX ?? (phase === 'off' ? 0 : 145);
    const busy = phase === 'connecting' || phase === 'warming' || (entering && phase === 'on');

    function svgX(event: PointerEvent<SVGGElement>) {
        const matrix = svgRef.current?.getScreenCTM();
        if (!matrix) return null;
        return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()).x;
    }
    function startDrag(event: PointerEvent<SVGGElement>) {
        if (busy || drag.current || !event.isPrimary || event.button !== 0) return;
        const x = svgX(event);
        if (x === null) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, start: x, origin: position, value: position };
        setDragX(position);
    }
    function moveDrag(event: PointerEvent<SVGGElement>) {
        const active = drag.current;
        if (!active || active.id !== event.pointerId) return;
        const x = svgX(event);
        if (x === null) return;
        active.value = Math.max(0, Math.min(145, active.origin + x - active.start));
        setDragX(active.value);
    }
    function endDrag(event: PointerEvent<SVGGElement>, cancelled = false) {
        const active = drag.current;
        if (!active || active.id !== event.pointerId) return;
        drag.current = null;
        setDragX(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (cancelled) return;
        if (phase === 'off' && active.value >= 118) connect();
        else if (phase === 'on' && active.value < 85) connect();
    }
    function handleKey(event: KeyboardEvent<SVGGElement>) {
        if (busy || drag.current || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); setDragX(null); connect(); return;
        }
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 145 :
            Math.max(0, Math.min(145, position + (event.key === 'ArrowRight' ? 29 : -29)));
        setDragX(next);
        if ((phase === 'off' && next >= 118) || (phase === 'on' && next < 85)) { setDragX(null); connect(); }
    }
    const warmedOnce = useRef(initiallyPowered);
    const finish = useCallback(() => {
        if (entering && !warmedOnce.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setPhase('warming');
        } else {
            warmedOnce.current = true;
            setPhase('on');
            onPowerChange(true);
        }
    }, [entering, onPowerChange]);
    useEffect(() => {
        if (phase !== 'warming') return;
        const timer = window.setTimeout(() => {
            warmedOnce.current = true;
            setPhase('on');
            onPowerChange(true);
        }, 2500);
        return () => window.clearTimeout(timer);
    }, [phase, onPowerChange]);
    useEffect(() => {
        if (phase !== 'connecting')
            return;
        // Also complete if the optional replacement video stalls.
        const timer = window.setTimeout(finish, videoSrc && !videoFailed ? 8000 : 280);
        return () => window.clearTimeout(timer);
    }, [phase, finish, videoSrc, videoFailed]);
    function connect() {
        if (busy)
            return;
        if (phase === 'on') {
            setPhase('off');
            onPowerChange(false);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
            return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            finish();
            return;
        }
        setPhase('connecting');
        if (videoRef.current)
            void videoRef.current.play().catch(() => setVideoFailed(true));
    }
    return <div className={`hub-power hub-power-${phase} ${dragX !== null ? 'hub-is-dragging' : ''}`}><div className="hub-power-top"><span>CONNECTION STUDY / 001</span><span className="hub-power-indicator">{phase === 'on' ? 'POWER ON' : phase === 'warming' ? 'WARMING UP' : phase === 'connecting' ? 'CONNECTING' : 'STANDBY'}</span></div><div className="hub-power-scene">
    <svg className="hub-lamp" viewBox="0 0 200 240" role="img" aria-label="Hanging bulb with a gradually glowing filament">
      <defs>
        <radialGradient id="hub-bulb-halo"><stop stopColor="#ffe6a0" stopOpacity=".65"/><stop offset=".4" stopColor="#ffc35c" stopOpacity=".22"/><stop offset="1" stopColor="#ffb54b" stopOpacity="0"/></radialGradient>
        <linearGradient id="hub-bulb-glass" x2="1" y2="1"><stop stopColor="#ffffff" stopOpacity=".14"/><stop offset=".5" stopColor="#fff0cc" stopOpacity=".02"/><stop offset="1" stopColor="#d3d8c3" stopOpacity=".12"/></linearGradient>
      </defs>
      <path d="M100 0V51" stroke="#555e4d" strokeWidth="3"/>
      <ellipse className="hub-bulb-glow" cx="100" cy="132" rx="98" ry="104" fill="url(#hub-bulb-halo)"/>
      <rect x="84" y="48" width="32" height="27" rx="5" fill="#53594b"/>
      <path d="M85 55h30m-30 7h30m-29 7h28" stroke="#929984" strokeWidth="2"/>
      <path d="M85 75C86 94 56 98 56 132C56 191 144 191 144 132C144 98 114 94 115 75Z" fill="url(#hub-bulb-glass)" stroke="#b4bf9a" strokeOpacity=".5" strokeWidth="1.5"/>
      <path d="M71 116Q63 130 70 146" stroke="#fff5da" strokeOpacity=".35" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M93 77L86 145M107 77L114 145" stroke="#8a8165" strokeWidth="1.4"/>
      <path className="hub-bulb-filament" d="M86 145l4-12 5 18 5-18 5 18 5-18 4 12" fill="none" stroke="#776443" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>{videoSrc && !videoFailed && phase === 'connecting' ? <video autoPlay ref={videoRef} src={videoSrc} poster={posterSrc} muted playsInline preload="metadata" onEnded={finish} onError={() => setVideoFailed(true)} aria-label="A plug connects to a socket and turns on the light"/> : <svg ref={svgRef} viewBox="0 0 700 470" role="group" aria-labelledby="power-scene-title"><title id="power-scene-title">A plug and socket lying on the floor connect to light up Shayan Hub</title><defs><linearGradient id="hub-plastic" x2="0.3" y2="1"><stop stopColor="#f5f1dc"/><stop offset=".5" stopColor="#c9cbb6"/><stop offset="1" stopColor="#7b8673"/></linearGradient><linearGradient id="hub-plug" x2="0" y2="1"><stop stopColor="#414b3b"/><stop offset=".45" stopColor="#202b20"/><stop offset="1" stopColor="#111811"/></linearGradient><linearGradient id="hub-metal"><stop stopColor="#73786c"/><stop offset=".45" stopColor="#eef0d1"/><stop offset="1" stopColor="#8d9579"/></linearGradient><radialGradient id="hub-floor-glow"><stop stopColor="#d5fa68" stopOpacity=".3"/><stop offset="1" stopColor="#d5fa68" stopOpacity="0"/></radialGradient><pattern id="hub-floor" width="65" height="45" patternUnits="userSpaceOnUse" patternTransform="skewX(-20)"><path d="M65 0H0V45" fill="none" stroke="#879578" strokeOpacity=".12"/></pattern></defs><rect y="80" width="700" height="390" fill="url(#hub-floor)"/><ellipse className="hub-floor-light" cx="400" cy="270" rx="280" ry="185" fill="url(#hub-floor-glow)"/><ellipse cx="435" cy="299" rx="120" ry="23" fill="#060906" opacity=".6"/><path d="M495 244C650 235 535 397 736 340" fill="none" stroke="#090d09" strokeWidth="19"/><path d="M495 240C650 231 535 393 736 336" fill="none" stroke="#697360" strokeWidth="12"/>
  <g transform="translate(390 196)"><path d="M0 13Q0 0 17 0H98Q115 0 115 17V88Q115 103 98 103H17Q0 103 0 87Z" fill="#525e4b"/><rect x="-5" y="-7" width="115" height="100" rx="22" fill="url(#hub-plastic)"/><rect x="4" y="3" width="93" height="78" rx="30" fill="#a1aa91" stroke="#dce1c5" strokeWidth="2"/><rect x="14" y="13" width="72" height="58" rx="25" fill="#78876c"/><ellipse cx="31" cy="29" rx="6" ry="9" fill="#151d13"/><ellipse cx="31" cy="62" rx="6" ry="9" fill="#151d13"/><rect className="hub-socket-led" x="46" y="-1" width="12" height="4" rx="2" fill="#49513e"/></g>
  <g className="hub-plug-moving" style={{ transform: `translateX(${position}px)` }}
    role="slider" tabIndex={busy ? -1 : 0} aria-label="Power plug" aria-describedby="hub-drag-help"
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position / 145 * 100)}
    aria-valuetext={phase === 'on' || phase === 'warming' ? 'Connected' : `${Math.round(position / 145 * 100)} percent toward socket`}
    aria-orientation="horizontal" aria-disabled={busy}
    onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)}
    onPointerCancel={event => endDrag(event, true)} onLostPointerCapture={event => endDrag(event, true)}
    onKeyDown={handleKey} onBlur={() => { if (!drag.current) setDragX(null); }}>
    <rect className="hub-plug-hit" x="177" y="181" width="155" height="125" rx="26" fill="transparent" /><path d="M-120 351C20 400 33 213 146 247H207" fill="none" stroke="#070b07" strokeWidth="21"/><path d="M-120 347C20 396 33 209 146 243H207" fill="none" stroke="#303d2c" strokeWidth="14"/><ellipse cx="255" cy="290" rx="73" ry="15" fill="#070b07" opacity=".6"/><rect className="hub-plug-pin" x="276" y="220" width="42" height="10" rx="4" fill="url(#hub-metal)"/><rect className="hub-plug-pin" x="276" y="253" width="42" height="10" rx="4" fill="url(#hub-metal)"/><rect x="195" y="219" width="30" height="48" rx="10" fill="#1e291b"/><rect x="215" y="201" width="69" height="83" rx="20" fill="url(#hub-plug)" stroke="#536248"/><path d="M229 215V268M239 211V272M249 211V272" stroke="#5d6f4b" strokeOpacity=".5" strokeWidth="3"/><path d="M265 223l-9 20h10l-8 18 19-24h-11l8-14z" fill="#d5fa68"/></g><g className="hub-power-sparks" stroke="#e5ff9a" strokeWidth="3" strokeLinecap="round"><path d="M367 199l-9-15M376 191v-18M379 284l-8 16M357 280l-13 9"/></g><text x="350" y="414" textAnchor="middle" fill="#85917b" fontSize="10" letterSpacing="4">A SMALL CONNECTION. A NEW POSSIBILITY.</text></svg>}</div><div className="hub-power-bottom"><span id="hub-drag-help" role="status">{phase === 'on' ? 'Connected. Drag left to unplug.' : phase === 'warming' ? 'A little light. A new beginning.' : phase === 'connecting' ? 'Connecting…' : 'Drag the plug into the socket →'}</span><span className="hub-keyboard-help">Use ← / → or press Enter with the plug focused.</span></div></div>;
}
