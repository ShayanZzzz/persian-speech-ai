import { useEffect, useState } from 'react'
import './CaveIntro.css'

export default function CaveIntro() {
  const [lit, setLit] = useState(false)

  useEffect(() => {
    const lightTimer = window.setTimeout(() => setLit(true), 1100)

    return () => {
      window.clearTimeout(lightTimer)
    }
  }, [])

  return (
    <section
      id="cave-intro"
      className={`cave-intro${lit ? ' is-lit' : ''}`}
      aria-label="An animated journey through the history of human imagination"
    >
      <div className="cave-darkness" />

      <div className="cave-scene">
        <svg
          className="cave-wall"
          viewBox="0 0 1200 760"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-labelledby="cave-title"
        >
          <title id="cave-title">
            Cave paintings of human evolution, flight, and human-machine forms
          </title>

          <defs>
            <linearGradient id="stone" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#514238" />
              <stop offset="48%" stopColor="#29251f" />
              <stop offset="100%" stopColor="#171715" />
            </linearGradient>

            <radialGradient id="match-light">
              <stop offset="0%" stopColor="#ffd18a" stopOpacity=".88" />
              <stop offset="38%" stopColor="#e78a37" stopOpacity=".27" />
              <stop offset="100%" stopColor="#e78a37" stopOpacity="0" />
            </radialGradient>

            <filter id="stone-texture">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".035"
                numOctaves="3"
                seed="12"
              />
              <feColorMatrix values="0.55 0 0 0 0.12  0 0.45 0 0 0.09  0 0 0.35 0 0.05  0 0 0 .25 0" />
            </filter>

            <filter id="soft-glow">
              <feGaussianBlur stdDeviation="25" />
            </filter>
          </defs>

          <rect width="1200" height="760" fill="#10100e" />

          <path
            d="M0 0H1200V760H0Z M78 85L170 48 302 72 390 42 528 80 650 48 774 73 900 44 1060 78 1160 48V680L1080 715 930 694 810 727 655 697 505 725 365 694 210 720 80 688Z"
            fill="url(#stone)"
            fillRule="evenodd"
          />

          <path
            d="M78 85L170 48 302 72 390 42 528 80 650 48 774 73 900 44 1060 78 1160 48V680L1080 715 930 694 810 727 655 697 505 725 365 694 210 720 80 688Z"
            filter="url(#stone-texture)"
            opacity=".55"
          />

          <g className="cave-cracks" fill="none" stroke="#100f0d" strokeWidth="3">
            <path d="M140 160l40 35-12 44 31 30" />
            <path d="M1060 155l-28 34 14 38-33 26" />
            <path d="M510 115l-18 29 24 26-9 23" />
            <path d="M900 585l-35 25 13 29-29 26" />
            <path d="M255 560l25 20-8 32 21 16" />
          </g>

          <g className="cave-painting painting-evolution">
            <path
              d="M145 340Q290 305 460 340"
              fill="none"
              stroke="#c18450"
              strokeWidth="3"
              strokeDasharray="3 10"
            />

            {[
              { x: 170, y: 367, s: 0.65, bend: 20 },
              { x: 235, y: 352, s: 0.8, bend: 10 },
              { x: 305, y: 342, s: 0.92, bend: 3 },
              { x: 380, y: 338, s: 1, bend: 0 },
            ].map((figure, i) => (
              <g
                key={i}
                transform={`translate(${figure.x} ${figure.y}) scale(${figure.s})`}
                fill="none"
                stroke="#d19a65"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="0" cy="-35" r="9" fill="#d19a65" stroke="none" />
                <path
                  d={`M-2 -24 Q${-12 - figure.bend} -12 -7 L-18 12 L-28 25 M-12 -7 L8 8 L18 27 M-10 -18 L-27 -5 L-39 -10 M-4 -17 L14 -7 L23 -15`}
                />
                <path d="M-18 12L-15 34 M8 8L14 32" />
              </g>
            ))}

            <path
              d="M145 410l12 -8 12 8m58 -6l12 -8 12 8m65 -4l12 -8 12 8m65 -4l12 -8 12 8"
              fill="none"
              stroke="#b47b4b"
              strokeWidth="2"
            />
          </g>

          <g className="cave-painting painting-flight">
            <path
              d="M555 230q55 -40 100 0t95 0"
              fill="none"
              stroke="#b67e4a"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <g
              fill="none"
              stroke="#d5a16b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="680" cy="280" r="11" fill="#d5a16b" stroke="none" />
              <path d="M679 295L673 337L690 370M674 316L643 298L612 267M675 314L708 288L741 266" />
              <path d="M612 267l-18 -15 27 5 18 21M741 266l18 -15 -27 5 -18 21" />
            </g>

            <path
              d="M595 390q84 26 170 0M620 410q58 20 118 0"
              fill="none"
              stroke="#a86f43"
              strokeWidth="3"
              strokeDasharray="5 11"
            />

            <path
              d="M800 280l9 -17 9 17-9 17z M830 320l7 -13 7 13-7 13z"
              fill="#d5a16b"
              opacity=".8"
            />
          </g>

          <g className="cave-painting painting-machine">
            <g
              fill="none"
              stroke="#c58d5a"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="950" cy="305" r="23" />
              <path d="M950 282v-17m-11 40h22m-11 23v28m-30 -42l-15 30 17 17m47 -47l18 30-18 17m-19 -5l-15 43m15 -43l16 43" />
              <rect x="1010" y="280" width="43" height="49" rx="4" />
              <circle cx="1021" cy="296" r="3" fill="#c58d5a" />
              <circle cx="1042" cy="296" r="3" fill="#c58d5a" />
              <path d="M1030 280v-18m-20 43h-18m61 0h16m-38 24v21m-13 -1l-11 24m36 -24l13 24" />
              <path d="M925 390h151m-130 13h112" strokeDasharray="3 9" />
            </g>
          </g>

          <g className="cave-symbols" fill="#d2a06b" opacity=".75">
            <path d="M520 480l10 -18 10 18-10 18z" />
            <circle cx="550" cy="480" r="4" />
            <path d="M855 455l10 -18 10 18-10 18z" />
            <circle cx="885" cy="455" r="4" />
            <path d="M285 475l10 -18 10 18-10 18z" />
          </g>
        </svg>

        <div className="cave-light" />

        <div className="cave-match" aria-hidden="true">
          <span className="match-stick" />
          <span className="match-flame" />
          <span className="match-spark match-spark-one" />
          <span className="match-spark match-spark-two" />
        </div>

        <div className="cave-caption">
          <span>BEFORE THE WORD</span>
          <span>THE HUMAN STORY / 001</span>
        </div>

        <button
          type="button"
          className="cave-scroll-hint"
          aria-label="Scroll to the homepage introduction"
          onClick={() =>
            document.getElementById('about')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
        >
          <span>CONTINUE THE STORY</span>
          <span className="cave-scroll-line" />
        </button>
      </div>
    </section>
  )
}
