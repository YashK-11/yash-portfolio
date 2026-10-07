import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Flower from './Flower'
import DataViz from './DataViz'

gsap.registerPlugin(ScrollTrigger)

const ease = [0.22, 1, 0.36, 1]
const NAV = ['home', 'projects', 'about', 'contact']
const PROJECTS = [
  { cat: 'Web design', name: 'Project One',   year: '2025' },
  { cat: 'Branding',   name: 'Project Two',   year: '2025' },
  { cat: 'App',        name: 'Project Three', year: '2024' },
  { cat: 'Motion',     name: 'Project Four',  year: '2024' },
]
const SKILLS = ['Web design', 'Front-end development', 'Creative coding', 'Motion']
const SOCIALS = ['Instagram', 'LinkedIn', 'GitHub', 'Behance']

const up = (i = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-10%' },
  transition: { duration: 0.7, delay: i * 0.07, ease },
})

/* ---------------- Split text ---------------- */
function Split({ text, delay = 0 }) {
  const rm = useReducedMotion()
  return (
    <motion.span
      aria-label={text}
      initial={rm ? 'v' : 'h'}
      whileInView="v"
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ staggerChildren: 0.03, delayChildren: delay }}
      style={{ display: 'inline-block' }}
    >
      {text.split(' ').map((w, wi) => (
        <span className="w" aria-hidden key={wi}>
          {[...w].map((c, i) => (
            <span className="m" key={i}>
              <motion.span
                className="c"
                variants={{
                  h: { y: '115%' },
                  v: { y: 0, transition: { duration: 0.85, ease } },
                }}
              >
                {c}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </motion.span>
  )
}

/* ---------------- Marquee ---------------- */
function Marquee() {
  const ref = useRef()
  const rm = useReducedMotion()

  useEffect(() => {
    if (rm) return
    const tw = gsap.to(ref.current, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 })
    const st = ScrollTrigger.create({
      onUpdate: (s) => {
        const v = Math.min(Math.abs(s.getVelocity()) / 300, 5)
        gsap.to(tw, { timeScale: (s.direction || 1) * (1 + v), duration: 0.25, overwrite: true })
        gsap.to(tw, { timeScale: 1, duration: 1.6, delay: 0.35 })
      },
    })
    return () => { tw.kill(); st.kill() }
  }, [rm])

  const set = (
    <>
      <span>After dark</span><i>✳</i>
      <span>Culture in motion</span><i>✳</i>
      <span>Design &amp; code</span><i>✳</i>
    </>
  )

  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq" ref={ref}>
        <div className="mq-set">{set}</div>
        <div className="mq-set">{set}</div>
      </div>
    </div>
  )
}

/* ---------------- Section head ---------------- */
function SectionHead({ n, children }) {
  return (
    <div className="shead">
      <span className="snum">/ {n}</span>
      <h2><Split text={children} /></h2>
    </div>
  )
}

/* ---------------- App ---------------- */
export default function App() {
  const [active, setActive] = useState('home')
  const [flowerOpen, setFlowerOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    NAV.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <motion.div className="bar" style={{ scaleX: bar }} />
      <Flower open={flowerOpen} onClose={() => setFlowerOpen(false)} />

      <header>
        <a className="logo" href="#home">home</a>
        <nav>
          {NAV.map((id) => (
            <a key={id} href={'#' + id} className={active === id ? 'on' : ''}>
              {id}
              {active === id && <motion.span layoutId="ul" className="ul" />}
            </a>
          ))}
          <button className="flower-btn" onClick={() => setFlowerOpen(true)}>
            <span aria-hidden>✿</span> flower
          </button>
        </nav>
      </header>

      <main>
        <section id="home">
          <DataViz />
          <motion.div className="eyebrow" {...up(0)}>
            <span>Hello</span><span className="sep">/</span><span>I am </span>
          </motion.div>

          <h2 aria-label="Yash Kuber Khanna">
            <Split text="Yash Kuber" delay={0.2} /><br />
            <Split text="Khanna" delay={0.45} />
          </h2>

          <p className="tag">
            <Split text="Data Scientist & Developer" delay={0.4} />
          </p>

          <motion.p className="meta" {...up(3)}>
            Websites, brands and interfaces with a strong point of view.
            Based in Delhi, working worldwide.
          </motion.p>

          <a className="scrollcue" href="#projects">Scroll to projects</a>
        </section>

        <Marquee />

        <section id="projects">
          <SectionHead n="01">Projects</SectionHead>
          <div className="grid">
            {PROJECTS.map((p, i) => (
              <motion.a
                key={p.name}
                className="card"
                href="#contact"
                {...up(i)}
                whileHover={{ y: -4 }}
              >
                <div className="card-top">
                  <small>{p.cat}</small>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3>{p.name}</h3>
                <p>Short line about what you built and the result.</p>
                <div className="card-foot">
                  <span>{p.year}</span>
                  <span className="arrow">↗</span>
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        <section id="about">
          <SectionHead n="02">About</SectionHead>
          <div className="about">
            <div>
              <motion.p {...up(0)}>
                I'm a designer and developer who builds bold, high-contrast websites.
                Replace this text with a short story about who you are and what you care about.
              </motion.p>
              <motion.p {...up(1)}>
                Based in Delhi, available for freelance projects and full-time roles.
              </motion.p>
              <motion.div className="now" {...up(2)}>
                <span className="pulse" />Currently available — Q1 2026
              </motion.div>
            </div>

            <ul className="skills">
              {SKILLS.map((s, i) => (
                <motion.li key={s} {...up(i)}>
                  <span className="idx">0{i + 1}</span>
                  <span>{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact">
          <SectionHead n="03">Contact</SectionHead>
          <motion.a className="big" href="mailto:you@example.com" {...up(0)}>
            you@example.com
          </motion.a>
          <div className="links">
            {SOCIALS.map((l, i) => (
              <motion.a key={l} href="#" {...up(i + 1)}>
                {l}<span className="arrow">↗</span>
              </motion.a>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <span>© {new Date().getFullYear()} Your Name</span>
        <span>React · Three.js · Framer Motion</span>
        <a href="#home">Back to top ↑</a>
      </footer>
    </>
  )
}