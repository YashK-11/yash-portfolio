import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import Flower from './Flower'
import DataViz, { SCENE_NAMES } from './DataViz'
import Aurora from './Aurora'

const ease = [0.22, 1, 0.36, 1]
const NAV = ['home', 'projects', 'about', 'contact']

/* ---- small geometric marks, one per project ---- */
const ART = {
  rag: (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="44" strokeDasharray="3 7" />
      <path d="M100 100 178 100M100 100 100 178M100 100 22 100M100 100 100 22" />
      <circle cx="100" cy="100" r="9" fill="currentColor" />
      {[[178, 100], [100, 178], [22, 100], [100, 22]].map(([x, y]) => (
        <circle key={x + '-' + y} cx={x} cy={y} r="8" fill="currentColor" />
      ))}
    </svg>
  ),
  tok: (
    <svg viewBox="0 0 200 200" fill="currentColor" stroke="currentColor" strokeWidth="2.5">
      {[
        [10, 18, 56, 1], [72, 18, 34, 0], [112, 18, 78, 0],
        [10, 62, 36, 0], [52, 62, 70, 1], [128, 62, 62, 0],
        [10, 106, 82, 0], [98, 106, 30, 1], [134, 106, 56, 0],
        [10, 150, 44, 1], [60, 150, 90, 0],
      ].map(([x, y, w, f], i) => (
        <rect key={i} x={x} y={y} width={w} height="28" rx="2" fillOpacity={f ? 1 : 0} />
      ))}
    </svg>
  ),
  mcp: (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M100 100 34 34M100 100 166 34M100 100 34 166M100 100 166 166" />
      <rect x="76" y="76" width="48" height="48" fill="currentColor" />
      {[[16, 16], [148, 16], [16, 148], [148, 148]].map(([x, y]) => (
        <rect key={x + '-' + y} x={x} y={y} width="36" height="36" />
      ))}
    </svg>
  ),
}

const PROJECTS = [
  {
    cat: 'Agentic AI · RAG',
    name: 'Agentic RAG Research Assistant',
    desc: 'An LLM agent that decides when and how to retrieve. It rewrites queries, runs hybrid search with reranking, grades the context, and self-corrects before answering with citations.',
    tags: ['LangGraph', 'Hybrid search', 'Reranking', 'Vector DB'],
    href: '#', theme: 'red', art: 'rag',
  },
  {
    cat: 'Generative AI · NLP',
    name: 'BPE Tokenizer & Mini Transformer',
    desc: 'A Byte-Pair Encoding tokenizer and a small decoder-only Transformer, both built from scratch to understand how language models work under the hood.',
    tags: ['PyTorch', 'BPE', 'Self-attention', 'Next-token prediction'],
    href: '#', theme: 'light', art: 'tok',
  },
  {
    cat: 'Agentic AI · MCP',
    name: 'MCP Data Analyst Agent',
    desc: 'An agent that uses SQL, pandas and plotting as tools over the Model Context Protocol, turning plain-English questions into queries, charts and insights.',
    tags: ['MCP', 'Tool use', 'SQL', 'Pandas'],
    href: '#', theme: 'dark', art: 'mcp',
  },
]

const KNOWLEDGE = [
  { g: 'Language models', items: ['Transformers', 'Self-attention', 'Multi-head attention', 'Positional encodings (RoPE, ALiBi)', 'KV cache', 'FlashAttention', 'Mixture of Experts', 'Scaling laws', 'Decoder-only & encoder-decoder'] },
  { g: 'Tokenization', items: ['BPE', 'Byte-level BPE', 'WordPiece', 'Unigram LM', 'SentencePiece', 'Vocabulary design', 'Special tokens'] },
  { g: 'Training & adaptation', items: ['Pretraining', 'Fine-tuning (SFT)', 'LoRA / QLoRA', 'PEFT', 'RLHF', 'DPO', 'Distillation', 'Quantization'] },
  { g: 'Retrieval & RAG', items: ['Embeddings', 'Vector databases', 'FAISS · Chroma · Qdrant · Pinecone', 'HNSW / ANN search', 'Chunking strategies', 'BM25 & hybrid search', 'Reranking', 'Agentic RAG', 'GraphRAG'] },
  { g: 'Agents & protocols', items: ['Agentic AI', 'Tool use & function calling', 'MCP', 'ReAct', 'Planning & memory', 'Multi-agent systems', 'LangGraph'] },
  { g: 'Evaluation & safety', items: ['LLM evals', 'RAGAS', 'Hallucination mitigation', 'Guardrails', 'Prompt engineering'] },
  { g: 'Data science', items: ['Python', 'Pandas · NumPy', 'SQL', 'scikit-learn', 'PyTorch', 'Statistics', 'Feature engineering', 'EDA', 'A/B testing'] },
  { g: 'Deployment', items: ['FastAPI', 'Docker', 'MLflow', 'vLLM', 'Git & CI/CD'] },
]

const CONTACT = [
  { label: 'Email', value: 'you@example.com', href: 'mailto:you@example.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/your-handle', href: 'https://www.linkedin.com/in/your-handle' },
  { label: 'GitHub', value: 'github.com/YashK-11', href: 'https://github.com/YashK-11' },
]

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

function SectionHead({ n, children }) {
  return (
    <div className="shead">
      <span className="snum">/ {n}</span>
      <h2><Split text={children} /></h2>
    </div>
  )
}

/* ---------------- Skills explorer ---------------- */
function Skills() {
  const [i, setI] = useState(0)
  const k = KNOWLEDGE[i]
  const total = KNOWLEDGE.reduce((a, b) => a + b.items.length, 0)
  return (
    <motion.div className="sx" {...up(0)}>
      <div className="sx-list" role="tablist" aria-label="Skill areas">
        {KNOWLEDGE.map((g, n) => (
          <button
            key={g.g}
            role="tab"
            aria-selected={i === n}
            className={i === n ? 'on' : ''}
            onMouseEnter={() => setI(n)}
            onFocus={() => setI(n)}
            onClick={() => setI(n)}
          >
            <span className="sx-n">{String(n + 1).padStart(2, '0')}</span>
            <span className="sx-g">{g.g}</span>
            <span className="sx-c">{g.items.length}</span>
          </button>
        ))}
      </div>

      <div className="sx-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease }}
          >
            <div className="sx-head">
              <span className="sx-big">{String(k.items.length).padStart(2, '0')}</span>
              <span className="sx-title">{k.g}</span>
            </div>
            <ul className="sx-chips">
              {k.items.map((it, n) => (
                <motion.li
                  key={it}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + n * 0.03, duration: 0.35, ease }}
                >
                  {it}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
        <span className="sx-foot">{KNOWLEDGE.length} areas · {total} topics</span>
      </div>
    </motion.div>
  )
}

/* ---------------- App ---------------- */
export default function App() {
  const [active, setActive] = useState('home')
  const [flowerOpen, setFlowerOpen] = useState(false)
  const [scene, setScene] = useState(0)
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
      <Aurora />
      <motion.div className="bar" style={{ scaleX: bar }} />
      <Flower open={flowerOpen} onClose={() => setFlowerOpen(false)} />

      <header>
        <a className="logo" href="#home">Yash<span>.</span></a>
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
        {/* ---------------- HOME ---------------- */}
        <section id="home">
          <div className="hero">
            <div className="viz">
              <DataViz scene={scene} />
              <div className="picker" role="tablist" aria-label="Choose animation">
                {SCENE_NAMES.map((n, i) => (
                  <button
                    key={n}
                    role="tab"
                    aria-selected={scene === i}
                    className={scene === i ? 'on' : ''}
                    onClick={() => setScene(i)}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
                <span className="picker-name">{SCENE_NAMES[scene]}</span>
              </div>
            </div>

            <div className="hero-text">
              <motion.div className="eyebrow" {...up(0)}>
                <span>Hello</span><span className="sep">/</span><span>I am </span>
              </motion.div>

              <h2 aria-label="Yash Kuber Khanna">
                <span className="ink"><Split text="Yash Kuber" delay={0.2} /></span><br />
                <Split text="Khanna" delay={0.45} />
              </h2>

              <p className="tag">
                <Split text="Data Scientist & ML Engineer" delay={0.4} />
              </p>

            </div>
          </div>

          <a className="scrollcue" href="#projects">Scroll</a>
        </section>

        {/* ---------------- PROJECTS ---------------- */}
        <section id="projects">
          <SectionHead n="01">Projects</SectionHead>
          <div className="pgrid">
            {PROJECTS.map((p, i) => (
              <motion.a key={p.name} className={'proj proj--' + p.theme} href={p.href} {...up(i)}>
                <div className="p-art" aria-hidden>{ART[p.art]}</div>

                <div className="p-top">
                  <span className="p-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="p-cat">{p.cat}</span>
                </div>

                <h3>{p.name}</h3>

                <div className="p-foot">
                  <div className="p-text">
                    <p>{p.desc}</p>
                    <span className="p-tags">{p.tags.join('  ·  ')}</span>
                  </div>
                  <span className="go" aria-hidden>↗</span>
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* ---------------- ABOUT ---------------- */}
        <section id="about">
          <SectionHead n="02">About</SectionHead>

          <div className="about-top">
            <motion.figure className="portrait" {...up(0)}>
              <div className="portrait-frame">
                <img
                  src="/sample1.jpeg"
                  alt="Yash Kuber Khanna"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <figcaption>
                <span>Yash Kuber Khanna</span>
                <span>Delhi, IN</span>
              </figcaption>
            </motion.figure>

            <div className="about-main">
              <motion.p className="lead" {...up(0)}>
                I'm a data scientist and ML engineer focused on <b>language models</b> and <b>agentic systems</b>.
              </motion.p>
              <motion.p {...up(1)}>
                I like understanding things from the ground up: how a tokenizer splits
                text, how attention mixes it, how a retriever finds the right context,
                and how an agent decides which tool to call. Then I build systems that
                put those pieces to work.
              </motion.p>
              <motion.div className="now" {...up(2)}>
                <span className="pulse" />Open to full-time roles
              </motion.div>
            </div>
          </div>

          <Skills />
        </section>

        {/* ---------------- CONTACT ---------------- */}
        <section id="contact">
          <SectionHead n="03">Contact</SectionHead>

          <motion.p className="c-giant" {...up(0)}>
            Let's talk.
          </motion.p>

          <div className="c-list">
            {CONTACT.map((c, i) => (
              <motion.a
                key={c.label}
                className="c-row"
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                {...up(i)}
              >
                <span className="c-label">{c.label}</span>
                <span className="c-value">{c.value}</span>
                <span className="arrow" aria-hidden>↗</span>
              </motion.a>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <span>© {new Date().getFullYear()} Yash Kuber Khanna</span>
        <a href="#home">Back to top ↑</a>
      </footer>
    </>
  )
}