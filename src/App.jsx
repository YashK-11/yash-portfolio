import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import Flower from './Flower'
import DataViz from './DataViz'

const ease = [0.22, 1, 0.36, 1]
const NAV = ['home', 'projects', 'about', 'contact']
const PROJECTS = [
  {
    cat: 'Agentic AI · RAG',
    name: 'Agentic RAG Research Assistant',
    desc: 'An LLM agent that decides when and how to retrieve. It rewrites queries, runs hybrid search with reranking, grades the context, and self-corrects before answering with citations.',
    tags: ['LangGraph', 'Hybrid search', 'Reranking', 'Vector DB'],
    href: '#',
  },
  {
    cat: 'Generative AI · NLP',
    name: 'BPE Tokenizer & Mini Transformer',
    desc: 'A Byte-Pair Encoding tokenizer and a small decoder-only Transformer, both built from scratch to understand how language models work under the hood.',
    tags: ['PyTorch', 'BPE', 'Self-attention', 'Next-token prediction'],
    href: '#',
  },
  {
    cat: 'Agentic AI · MCP',
    name: 'MCP Data Analyst Agent',
    desc: 'An agent that uses SQL, pandas and plotting as tools over the Model Context Protocol, turning plain-English questions into queries, charts and insights.',
    tags: ['MCP', 'Tool use', 'SQL', 'Pandas'],
    href: '#',
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
          <div className="hero">
            <DataViz />

            <div className="hero-text">
              <motion.div className="eyebrow" {...up(0)}>
                <span>Hello</span><span className="sep">/</span><span>I am </span>
              </motion.div>

              <h2 aria-label="Yash Kuber Khanna">
                <Split text="Yash Kuber" delay={0.2} /><br />
                <Split text="Khanna" delay={0.45} />
              </h2>

              <p className="tag">
                <Split text="Data Scientist & ML Engineer" delay={0.4} />
              </p>

              <motion.p className="meta" {...up(3)}>
                Websites, brands and interfaces with a strong point of view.
                Based in Delhi, working worldwide.
              </motion.p>
            </div>
          </div>

          <a className="scrollcue" href="#projects">Scroll to projects</a>
        </section>

        <section id="projects">
          <SectionHead n="01">Projects</SectionHead>
          <div className="plist">
            {PROJECTS.map((p, i) => (
              <motion.a key={p.name} className="proj" href={p.href} {...up(i)}>
                <span className="p-num">{String(i + 1).padStart(2, '0')}</span>

                <div className="p-head">
                  <small>{p.cat}</small>
                  <h3>{p.name}</h3>
                </div>

                <div className="p-body">
                  <p>{p.desc}</p>
                  <span className="p-tags">{p.tags.join('  ·  ')}</span>
                </div>

                <span className="arrow" aria-hidden>↗</span>
              </motion.a>
            ))}
          </div>
        </section>

        <section id="about">
          <SectionHead n="02">About</SectionHead>
          <div className="about">
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
                I'm a data scientist and ML engineer focused on language models and
                agentic systems.
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

              <motion.div className="kb" {...up(0)}>
                <span className="kb-title">Knowledge base</span>
                {KNOWLEDGE.map((k) => (
                  <div className="kb-row" key={k.g}>
                    <span className="kb-g">{k.g}</span>
                    <ul>
                      {k.items.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </motion.div>
            </div>
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