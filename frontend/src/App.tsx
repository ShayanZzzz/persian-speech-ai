
import type { CSSProperties } from 'react'
import './App.css'
import CaveIntro from './CaveIntro'

const services = [
  {
    number: '01',
    name: 'Speech to Text',
    description: 'Turn spoken language into searchable, usable text.',
    tag: 'ASR',
    href: '#speech',
  },
  {
    number: '02',
    name: 'Audio Intelligence',
    description: 'A workspace for audio understanding and processing.',
    tag: 'IN DEVELOPMENT',
    href: '#lab',
  },
  {
    number: '03',
    name: 'Experimental Lab',
    description: 'New tools, research, and ideas in progress.',
    tag: 'EXPERIMENTAL',
    href: '#lab',
  },
]

function App() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="#" aria-label="Shayan Hub home">
          <span className="wordmark-symbol">
            S<span>.</span>
          </span>
          <span>
            SHAYAN<span className="wordmark-muted">HUB</span>
          </span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="#lab">Lab</a>
        </nav>

        <a className="topbar-link" href="#services">
          Explore hub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <CaveIntro />

      <section className="hero" id="about">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            INDEPENDENT AI STUDIO
          </div>

          <h1>
            Intelligence,
            <br />
            <span>with a point of view.</span>
          </h1>

          <p className="hero-description">
            A growing collection of tools, experiments, and ideas at the
            intersection of artificial intelligence and creative technology.
          </p>

          <div className="hero-actions">
            <a className="button-primary" href="#services">
              Explore the projects <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#lab">
              Inside the lab <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="hero-index">
            <span>BASED ON CURIOSITY</span>
            <span>BUILT ONE STEP AT A TIME</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Abstract generative artwork">
          <div className="art-grid" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-orbit orbit-three" />

          <div className="art-core">
            <div className="core-highlight" />
          </div>

          <div className="art-cross cross-one">+</div>
          <div className="art-cross cross-two">+</div>

          <div className="art-label art-label-top">
            FIELD STUDY / 001
          </div>

          <div className="art-label art-label-bottom">
            <span>FORM IN MOTION</span>
            <span>FIG. 01</span>
          </div>

          <div className="art-coordinate">35° 41′ N / 51° 25′ E</div>
        </div>

        <div className="hero-bottom">
          <span>SCROLL TO EXPLORE</span>
          <span className="scroll-line" />
          <span>SELECTED DIRECTIONS · 2026</span>
        </div>
      </section>

      <section className="services section-block" id="services">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / THE COLLECTION</div>
            <h2>
              Tools in progress.
              <br />
              Ideas in motion.
            </h2>
          </div>

          <p>
            Each project has its own purpose and personality. One shared home,
            room to grow.
          </p>
        </div>

        <div className="service-list">
          {services.map((service) => (
            <a
              className="service-row"
              href={service.href}
              key={service.number}
            >
              <span className="service-number">{service.number}</span>

              <div className="service-main">
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>

              <span className="service-tag">{service.tag}</span>
              <span className="service-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="speech-feature" id="speech">
        <div className="speech-meta">
          <span>02 / CURRENT FOCUS</span>
          <span>PROJECT · PSAI</span>
        </div>

        <div className="speech-content">
          <div>
            <div className="eyebrow">PERSIAN SPEECH AI</div>

            <h2>
              Give sound
              <br />
              a second life.
            </h2>

            <p>
              An evolving speech-to-text service, starting with Persian.
              Built for useful workflows, not just demos.
            </p>
          </div>

          <div className="wave-art" aria-hidden="true">
            {Array.from({ length: 43 }, (_, index) => (
              <span
                key={index}
                style={
                  {
                    '--bar-height': `${
                      12 +
                      Math.abs(Math.sin(index * 0.62)) *
                        (index % 5 === 0 ? 78 : 43)
                    }%`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div className="speech-footer">
          <span>
            <span className="status-dot" /> LOCAL DEVELOPMENT
          </span>
          <span>RESEARCH → BUILD → REFINE</span>
        </div>
      </section>

      <section className="lab section-block" id="lab">
        <div className="eyebrow">03 / OPEN CANVAS</div>

        <h2>
          Not everything
          <br />
          needs a category.
        </h2>

        <p>
          A place for strange prototypes, visual experiments, and things that
          haven’t found their final form yet.
        </p>

        <div className="lab-note">
          <span>FUTURE ARTWORK SLOT</span>
          <span>3D / MOTION / INTERACTIVE</span>
          <span aria-hidden="true">✳</span>
        </div>
      </section>

      <footer className="footer">
        <a className="wordmark footer-mark" href="#" aria-label="Back to home">
          <span className="wordmark-symbol">
            S<span>.</span>
          </span>
          <span>
            SHAYAN<span className="wordmark-muted">HUB</span>
          </span>
        </a>

        <span>AN INDEPENDENT WORK IN PROGRESS.</span>
        <a href="#about">BACK TO TOP ↑</a>
        <span>© 2026</span>
      </footer>
    </main>
  )
}

export default App
