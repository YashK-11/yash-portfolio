import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Flower from './Flower'
gsap.registerPlugin(ScrollTrigger)

const ease = [0.2, 0.7, 0.1, 1]
const NAV = ['home', 'projects', 'about', 'contact']
const PROJECTS = [
  ['Web design', 'Project One'], ['Branding', 'Project Two'], ['App', 'Project Three'], ['Motion', 'Project Four'],
]

function Split({ text, delay = 0 }) {
  const rm = useReducedMotion()
  return (
    <motion.span aria-label={text} initial={rm ? 'v' : 'h'} whileInView="v" viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ staggerChildren: 0.035, delayChildren: delay }} style={{ display: 'inline-block' }}>
      {text.split(' ').map((w, wi) => (
        <span className="w" aria-hidden key={wi}>
          {[...w].map((c, i) => (
            <span className="m" key={i}>
              <motion.span className="c" variants={{ h: { y: '115%' }, v: { y: 0, transition: { duration: 0.9, ease } } }}>{c}</motion.span>
            </span>
          ))}
        </span>
      ))}
    </motion.span>
  )
}

function Marquee() {
  const ref = useRef()
  useEffect(() => {
    const tw = gsap.to(ref.current, { xPercent: -50, ease: 'none', duration: 26, repeat: -1 })
    const st = ScrollTrigger.create({
      onUpdate: (s) => {
        const v = Math.min(Math.abs(s.getVelocity()) / 250, 8)
        gsap.to(tw, { timeScale: (s.direction || 1) * (1 + v), duration: 0.2, overwrite: true })
        gsap.to(tw, { timeScale: 1, duration: 1.4, delay: 0.3 })
      },
    })
    return () => { tw.kill(); st.kill() }
  }, [])
  const t = 'AFTER DARK / CULTURE IN MOTION / '
  return <div className="marquee" aria-hidden="true"><div className="mq" ref={ref}>{[0, 1, 2, 3].map((i) => <span key={i}>{t}</span>)}</div></div>
}

export default function App() {
  const [active, setActive] = useState('home')
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    NAV.forEach((id) => io.observe(document.getElementById(id)))
    return () => io.disconnect()
  }, [])
  const up = (i = 0) => ({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-10%' }, transition: { duration: 0.8, delay: i * 0.1, ease } })

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3" /></filter></svg>
      <motion.div className="bar" style={{ scaleX: bar }} />
      <Flower />
      <header>
        <a className="logo" href="#home">YOUR NAME</a>
        <nav>
          {NAV.map((id) => (
            <a key={id} href={'#' + id} className={active === id ? 'on' : ''}>
              {id}{active === id && <motion.span layoutId="ul" className="ul" />}
            </a>
          ))}
        </nav>
      </header>

      <section id="home">
        <h1 aria-label="Your Name"><Split text="YOUR" delay={0.2} /><br /><Split text="NAME" delay={0.5} /></h1>
        <p className="tag"><Split text="Design & code / made after dark" delay={0.9} /></p>
        <motion.p className="meta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.9 }}>
          Portfolio 2026. Websites, brands and interfaces with a strong point of view.
        </motion.p>
        <a className="scrollcue" href="#projects">Scroll to projects</a>
      </section>

      <Marquee />

      <section id="projects">
        <h2><Split text="PROJECTS" /></h2>
        <div className="grid">
          {PROJECTS.map(([cat, name], i) => (
            <motion.a key={name} className="card" href="#contact" {...up(i)} whileHover={{ y: -6 }}>
              <small>{cat}</small><h3>{name}</h3><p>Short line about what you built and the result.</p>
            </motion.a>
          ))}
        </div>
      </section>

      <section id="about">
        <h2><Split text="ABOUT" /></h2>
        <div className="about">
          <div>
            <motion.p {...up(0)}>I'm a designer and developer who builds bold, high-contrast websites. Replace this text with a short story about who you are and what you care about.</motion.p>
            <motion.p {...up(1)}>Based in Delhi, available for freelance projects and full-time roles.</motion.p>
          </div>
          <ul className="skills">
            {['Web design', 'Front-end development', 'Creative coding', 'Motion'].map((s, i) => <motion.li key={s} {...up(i)}>{s}</motion.li>)}
          </ul>
        </div>
      </section>

      <section id="contact">
        <h2><Split text="CONTACT" /></h2>
        <motion.a className="big" href="mailto:you@example.com" {...up(0)}>you@example.com</motion.a>
        <div className="links">
          {['Instagram', 'LinkedIn', 'GitHub', 'Behance'].map((l, i) => <motion.a key={l} href="#" {...up(i + 1)}>{l}</motion.a>)}
        </div>
      </section>
      <footer>© 2026 Your Name</footer>
    </>
  )
}
