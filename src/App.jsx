import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useSpring, useReducedMotion } from 'framer-motion'
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
  { g: 'Retrieval & RAG', items: ['Embeddings', 'Vector databases', 'FAISS · Chroma · Qdrant · Pinecone', 'HNSW / ANN search', 'Chunking strategies', 'BM25 & hybrid search', 'Reranking', 'Agentic RAG', 'GraphRAG'] },
  { g: 'Agents & protocols', items: ['Agentic AI', 'Tool use & function calling', 'MCP', 'ReAct', 'Planning & memory', 'Multi-agent systems', 'LangGraph'] },
]

const ABOUT_STEPS = [
  { k: 'Tokenizer', t: 'how a tokenizer splits text' },
  { k: 'Attention', t: 'how attention mixes it' },
  { k: 'Retriever', t: 'how a retriever finds the right context' },
  { k: 'Agent', t: 'how an agent decides which tool to call' },
]

const CONTACT = [
  { label: 'Email', value: 'you@example.com', href: 'mailto:you@example.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/your-handle', href: 'https://www.linkedin.com/in/your-handle' },
  { label: 'GitHub', value: 'github.com/YashK-11', href: 'https://github.com/YashK-11' },
]

const MAIL = CONTACT[0]
const ELSEWHERE = CONTACT.slice(1)

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

/* ---------------- Skills: a code window ---------------- */
const ACCENTS = ['243,46,53', '124,155,255', '84,222,150', '176,112,255', '70,202,228', '255,198,72', '243,46,53', '124,155,255']

/* one chapter per skill area: a summary, plus a real code example */
const CODE = [
  {
    sum: 'How modern LLMs work, from attention to scaling. Here is causal multi-head self-attention written out by hand.',
    file: 'attention.py',
    cap: 'Queries, keys and values are split into heads, scores are scaled, and a causal mask blocks the future.',
    code: `import torch

def causal_self_attention(x, Wq, Wk, Wv, n_heads):
    B, T, C = x.shape
    hd = C // n_heads
    q, k, v = (x @ W for W in (Wq, Wk, Wv))
    q, k, v = (t.view(B, T, n_heads, hd).transpose(1, 2) for t in (q, k, v))

    att = (q @ k.transpose(-2, -1)) / hd ** 0.5       # scaled scores
    mask = torch.tril(torch.ones(T, T, device=x.device)).bool()
    att = att.masked_fill(~mask, float("-inf")).softmax(dim=-1)

    out = att @ v                                      # weighted values
    return out.transpose(1, 2).reshape(B, T, C)`,
  },
  {
    sum: 'Giving a model the right context. Dense and keyword search each miss things, so I fuse them and rerank.',
    file: 'hybrid_search.py',
    cap: 'Reciprocal Rank Fusion merges semantic and BM25 rankings without needing comparable scores.',
    code: `def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)

dense_ids  = index.search(embed(query), k=20)    # semantic (HNSW)
sparse_ids = bm25.top_ids(query, k=20)           # keyword (BM25)

fused = rrf([dense_ids, sparse_ids])[:20]
top5  = reranker.rank(query, fused)[:5]          # cross-encoder
answer = llm.generate(query, context=top5)`,
  },
  {
    sum: 'Models that act. An MCP server exposes tools, and any agent can discover and call them.',
    file: 'server.py',
    cap: 'A guarded, read-only SQL tool. The agent decides when to call it, the server decides what is allowed.',
    code: `import sqlite3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("data-analyst")

@mcp.tool()
def run_sql(query: str) -> list[dict]:
    """Run a read-only SQL query and return the rows."""
    if not query.strip().lower().startswith("select"):
        raise ValueError("read-only: SELECT statements only")
    con = sqlite3.connect("sales.db")
    con.row_factory = sqlite3.Row
    return [dict(r) for r in con.execute(query).fetchall()]

if __name__ == "__main__":
    mcp.run()`,
  },
]

const CHAPTERS = KNOWLEDGE.map((k, i) => ({
  ...k,
  ...CODE[i],
  accent: ACCENTS[i % ACCENTS.length],
  no: String(i + 1).padStart(2, '0'),
}))
const N = CHAPTERS.length

/* tiny Python highlighter */
const KW = new Set(['import', 'from', 'def', 'return', 'class', 'for', 'in', 'if', 'else', 'elif', 'while', 'with', 'as', 'raise', 'not', 'and', 'or', 'is', 'lambda', 'async', 'await', 'None', 'True', 'False', 'self'])
const TOK = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?\b)|(@[\w.]+)|([A-Za-z_]\w*)|(\s+|.)/g

function hl(line) {
  const out = []
  let prev = ''
  for (const m of line.matchAll(TOK)) {
    const [t, com, str, num, dec, id] = m
    let cls = null
    if (com) cls = 'c'
    else if (str) cls = 's'
    else if (num) cls = 'n'
    else if (dec) cls = 'd'
    else if (id) {
      if (KW.has(id)) cls = 'k'
      else if (prev === 'def' || prev === 'class' || line[m.index + t.length] === '(') cls = 'f'
    }
    if (t.trim()) prev = t
    out.push(cls ? <span key={m.index} className={'tk-' + cls}>{t}</span> : t)
  }
  return out
}

/* ---------------- Skills: a MacBook, VS Code, and the code being typed ---------------- */
const HOLD_MS = 3200 // how long a finished file stays up before the next one starts

const ICONS = {
  files: <path d="M5 3h7l4 4v10H5zM12 3v4h4" />,
  search: <><circle cx="9" cy="9" r="4.5" /><path d="M12.5 12.5 17 17" /></>,
  branch: <><circle cx="6" cy="4.5" r="1.8" /><circle cx="6" cy="15.5" r="1.8" /><circle cx="14" cy="8" r="1.8" /><path d="M6 6.3v7.4M14 9.8c0 3-8 2-8 4" /></>,
  blocks: <><rect x="3.5" y="3.5" width="5.5" height="5.5" /><rect x="11" y="3.5" width="5.5" height="5.5" /><rect x="3.5" y="11" width="5.5" height="5.5" /><rect x="12" y="12" width="4.5" height="4.5" /></>,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>{ICONS[name]}</svg>
)

function Skills() {
  const rm = useReducedMotion()
  const root = useRef(null)
  const seen = useInView(root, { once: true, margin: '-20% 0px' }) // lid opens once
  const visible = useInView(root, { margin: '-10% 0px' }) // typing pauses off-screen
  const [lid, setLid] = useState(false)
  const [c, setC] = useState(0)
  const [manual, setManual] = useState(false)
  const [typed, setTyped] = useState({ c: 0, n: 0 })
  const pos = useRef(0)
  const manualRef = useRef(false)
  const cur = CHAPTERS[c]
  const text = cur.code

  // lid opens, then the typing starts
  useEffect(() => {
    if (!seen) return
    const t = setTimeout(() => setLid(true), rm ? 0 : 1500)
    return () => clearTimeout(t)
  }, [seen, rm])

  // a new file starts blank
  useEffect(() => {
    pos.current = 0
    setTyped({ c, n: 0 })
  }, [c])

  // type it out, one character at a time, then move on to the next file
  const run = lid && visible
  useEffect(() => {
    if (!run) return
    if (rm) { pos.current = text.length; setTyped({ c, n: text.length }); return }
    let t
    const step = () => {
      if (pos.current >= text.length) {
        if (!manualRef.current) t = setTimeout(() => setC((v) => (v + 1) % N), HOLD_MS)
        return
      }
      pos.current += 1
      setTyped({ c, n: pos.current })
      const ch = text[pos.current - 1]
      const d = ch === '\n' ? 150 : Math.random() < 0.025 ? 180 : 10 + Math.random() * 20
      t = setTimeout(step, d)
    }
    t = setTimeout(step, pos.current === 0 ? 450 : 0)
    return () => clearTimeout(t)
  }, [run, c, rm, text])

  const pick = (n) => {
    manualRef.current = true
    setManual(true)
    if (n !== c) setC(n)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pick((c + 1) % N) }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pick((c + N - 1) % N) }
  }

  const shown = rm ? text : typed.c === c ? text.slice(0, typed.n) : ''
  const lines = shown.split('\n')
  const done = shown.length >= text.length
  const ln = lines.length
  const col = lines[ln - 1].length + 1

  return (
    <div className="sk" ref={root} style={{ '--accent': cur.accent }}>
      <div className="sk-side">
        <div className="sk-list" role="tablist" aria-orientation="vertical" aria-label="Skill areas" onKeyDown={onKey}>
          {CHAPTERS.map((x, n) => {
            const on = n === c
            return (
              <button
                key={x.g}
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                className={'sk-row' + (on ? ' on' : '')}
                style={{ '--accent': x.accent }}
                onClick={() => pick(n)}
              >
                {on && <motion.span layoutId="sk-rule" className="sk-rule" transition={{ duration: 0.45, ease }} />}
                <span className="sk-n">{x.no}</span>
                <span className="sk-t">{x.g}</span>
              </button>
            )
          })}
        </div>

        <motion.div
          key={c}
          className="sk-copy"
          initial={rm ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          <p className="sk-sum">{cur.sum}</p>
          <p className="sk-cap">{cur.cap}</p>
          <p className="sk-topics">{cur.items.join('  /  ')}</p>
        </motion.div>
      </div>

      <div className="mac-stage">
        <div className="mac">
          <motion.div
            className="mac-lid"
            initial={{ rotateX: rm ? 0 : -86 }}
            animate={{ rotateX: seen || rm ? 0 : -86 }}
            transition={{ duration: 1.5, ease }}
          >
            <span className="mac-cam" aria-hidden />
            <div className="vs" aria-hidden>
              <div className="vs-title">
                <span className="lights"><i /><i /><i /></span>
                <span className="vs-name">{cur.file} — skills</span>
              </div>

              <div className="vs-body">
                <div className="vs-act">
                  <Icon name="files" /><Icon name="search" /><Icon name="branch" /><Icon name="blocks" />
                </div>

                <div className="vs-side">
                  <p className="vs-h">Explorer</p>
                  <p className="vs-dir">skills</p>
                  {CHAPTERS.map((x, n) => (
                    <button key={x.file} tabIndex={-1} className={'vs-file' + (n === c ? ' on' : '')} onClick={() => pick(n)}>
                      <b>py</b>{x.file}
                    </button>
                  ))}
                </div>

                <div className="vs-main">
                  <div className="vs-tabs">
                    {CHAPTERS.map((x, n) => (
                      <button
                        key={x.file}
                        tabIndex={-1}
                        className={'vs-tab' + (n === c ? ' on' : '')}
                        style={{ '--accent': x.accent }}
                        onClick={() => pick(n)}
                      >
                        <b>py</b>{x.file}
                      </button>
                    ))}
                  </div>
                  <div className="vs-crumb">skills <span>›</span> {cur.file}</div>

                  <div className="vs-code">
                    {lines.map((line, i) => (
                      <div className={'vs-row' + (i === ln - 1 ? ' cur' : '')} key={i}>
                        <i className="vs-ln">{i + 1}</i>
                        <span className="vs-tx">
                          {line ? hl(line) : ''}
                          {i === ln - 1 && lid && <span className={'caret' + (done || !run ? ' idle' : '')} />}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="vs-status">
                <span>main</span>
                <span>Ln {ln}, Col {col}&nbsp;&nbsp;&nbsp;Spaces: 4&nbsp;&nbsp;&nbsp;UTF-8&nbsp;&nbsp;&nbsp;Python</span>
              </div>
            </div>
          </motion.div>
          <div className="mac-base" aria-hidden />
        </div>
        <pre className="sr-only" tabIndex={manual ? 0 : -1}>{text}</pre>
      </div>
    </div>
  )
}

/* ---------------- App ---------------- */
export default function App() {
  const [active, setActive] = useState('home')
  const [flowerOpen, setFlowerOpen] = useState(false)
  const [scene, setScene] = useState(0)
  const [copied, setCopied] = useState(false)
  const copyMail = () => {
    navigator.clipboard?.writeText(MAIL.value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
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
          <button className="flower-btn" onClick={() => setFlowerOpen(true)}>flower</button>
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
              <motion.article key={p.name} className={'proj proj--' + p.theme} {...up(i)}>
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
                </div>
              </motion.article>
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
                  src="/sample1.png"
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
              <motion.p className="about-body" {...up(1)}>
                I like understanding things from the ground up: how a tokenizer splits
                text, how attention mixes it, how a retriever finds the right context,
                and how an agent decides which tool to call. Then I build systems that
                put those pieces to work.
              </motion.p>
              <motion.div className="now" {...up(2)}>
                Open to full-time roles
              </motion.div>
            </div>
          </div>

          <ol className="about-steps">
            {ABOUT_STEPS.map((x, i) => (
              <motion.li key={x.k} {...up(i)}>
                <span className="as-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="as-k">{x.k}</span>
                <span className="as-t">{x.t}</span>
              </motion.li>
            ))}
          </ol>

          <Skills />
        </section>

        {/* ---------------- CONTACT ---------------- */}
        <section id="contact">
          <SectionHead n="03">Contact</SectionHead>

          <div className="ct">
            <div className="ct-main">
              <motion.p className="c-giant" {...up(0)}>Let's talk.</motion.p>
              <motion.p className="ct-lead" {...up(1)}>
                Open to full-time roles in data science and ML engineering. Email is the quickest way to reach me.
              </motion.p>
              <motion.div className="ct-mailrow" {...up(2)}>
                <a className="ct-mail" href={MAIL.href}>{MAIL.value}</a>
                <button className="ct-copy" onClick={copyMail}>{copied ? 'Copied' : 'Copy'}</button>
              </motion.div>
            </div>

            <div className="c-grid">
              {ELSEWHERE.map((c, i) => (
                <motion.a
                  key={c.label}
                  className="c-card"
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  {...up(i + 1)}
                >
                  <span className="c-label">{c.label}</span>
                  <span className="c-value">{c.value}</span>
                  <span className="arrow" aria-hidden>↗</span>
                </motion.a>
              ))}
            </div>
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