import { useEffect, useLayoutEffect, useState } from 'react'
import {
  motion, AnimatePresence, animate, useMotionValue, useTransform,
  useScroll, useSpring, useReducedMotion,
} from 'framer-motion'
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
    name: 'Atlas-RAG',
    desc: 'An agentic retrieval system that rewrites queries, performs hybrid search with reranking, evaluates retrieved context, and self-corrects before generating cited answers.',
    tags: ['LangGraph', 'Hybrid Search', 'Reranking', 'Vector DB'],
    href: '#', theme: 'red', art: 'rag',
  },
  {
    cat: 'Generative AI · NLP',
    name: 'Neura-LM',
    desc: 'A lightweight language modeling system built from scratch, implementing custom BPE tokenization and a decoder-only Transformer for autoregressive text generation.',
    tags: ['PyTorch', 'BPE', 'Transformers', 'Self-Attention'],
    href: '#', theme: 'light', art: 'tok',
  },
  {
    cat: 'Agentic AI · MCP',
    name: 'Data-Pilot',
    desc: 'An MCP-powered data analysis agent that turns natural-language questions into SQL queries, pandas workflows, visualizations, and concise analytical insights.',
    tags: ['MCP', 'Tool Use', 'SQL', 'Pandas'],
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

const ABOUT_STEPS = [
  { k: 'Data', t: 'how raw data becomes useful features' },
  { k: 'Models', t: 'how machine learning learns patterns' },
  { k: 'Embeddings', t: 'how models turn meaning into vectors' },
  { k: 'Inference', t: 'how trained models make predictions' },
];



const CONTACT = [
  { label: 'Email', value: 'yashkuberkhanna1016@gmail.com', href: 'mailto:yashkuberkhanna1016@example.com' },
  { label: 'LinkedIn', value: 'yash-kuber-khanna', href: 'https://www.linkedin.com/in/yash-kuber-khanna' },
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

/* ---------------- Skills data ---------------- */
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
    sum: 'How text becomes numbers. The core of Byte-Pair Encoding is a small loop: count pairs, merge the most common.',
    file: 'bpe.py',
    cap: 'Start from raw bytes and repeatedly merge the most frequent adjacent pair into a new token id.',
    code: `from collections import Counter

def merge(ids, pair, new_id):
    out, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == pair:
            out.append(new_id); i += 2
        else:
            out.append(ids[i]); i += 1
    return out

ids = list("low lower lowest".encode("utf-8"))
merges = {}
for step in range(10):
    pair = Counter(zip(ids, ids[1:])).most_common(1)[0][0]
    merges[pair] = 256 + step
    ids = merge(ids, pair, 256 + step)`,
  },
  {
    sum: 'Adapting big models cheaply. LoRA freezes the base weights and learns a low-rank update instead.',
    file: 'lora.py',
    cap: 'W stays frozen. Only the small matrices A and B train, and B starts at zero so the model begins unchanged.',
    code: `import torch, torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, r=8, alpha=16):
        super().__init__()
        self.base = base
        self.scale = alpha / r
        self.A = nn.Parameter(torch.randn(r, base.in_features) * 0.01)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))
        base.requires_grad_(False)                 # freeze W

    def forward(self, x):
        delta = (x @ self.A.T) @ self.B.T          # low-rank update
        return self.base(x) + delta * self.scale`,
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
  {
    sum: 'Knowing whether it actually works. I score faithfulness and relevance instead of trusting vibes.',
    file: 'evaluate.py',
    cap: 'RAGAS checks that answers stay grounded in the retrieved context and that retrieval is precise.',
    code: `from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision

ds = Dataset.from_dict({
    "question":     questions,
    "answer":       answers,
    "contexts":     contexts,        # list of retrieved chunks per question
    "ground_truth": truths,
})

report = evaluate(
    ds,
    metrics=[faithfulness, answer_relevancy, context_precision],
)
print(report)                        # one score per metric`,
  },
  {
    sum: 'Turning raw tables into models. A single pipeline keeps preprocessing and training leak-free.',
    file: 'pipeline.py',
    cap: 'Scaling and encoding live inside the pipeline, so cross-validation never sees the held-out fold.',
    code: `from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

pre = ColumnTransformer([
    ("num", StandardScaler(), num_cols),
    ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
])
model = Pipeline([("pre", pre), ("clf", GradientBoostingClassifier())])

scores = cross_val_score(model, X, y, cv=5, scoring="roc_auc")
print(f"AUC {scores.mean():.3f} +/- {scores.std():.3f}")`,
  },
  {
    sum: 'Getting it out of the notebook. A typed API in front of the retriever and the model.',
    file: 'api.py',
    cap: 'Pydantic validates the request, FastAPI serves it, and the response carries its sources.',
    code: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Query(BaseModel):
    text: str
    top_k: int = 5

@app.post("/ask")
async def ask(q: Query):
    docs = retriever.search(q.text, q.top_k)
    return {
        "answer": llm.generate(q.text, context=docs),
        "sources": [d.id for d in docs],
    }`,
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

/* ---------------- Skills: a book of code ---------------- */
const FLIP_MS = 0.9      // a single page turn
const FAST_MS = 0.42     // when flipping through several pages at once
const flipEase = [0.6, 0.04, 0.25, 1]

const bell = (v) => Math.sin((Math.min(Math.abs(v), 180) / 180) * Math.PI) // 0 → 1 → 0 over the turn

function useNarrow(q = '(max-width: 820px)') {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches)
  useEffect(() => {
    const mq = matchMedia(q)
    const h = () => setM(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [q])
  return m
}

/* left-hand page: what this chapter is about */
function PageLeft({ ch }) {
  return (
    <div className="pg pg--l" style={{ '--accent': ch.accent }}>
      <span className="pg-ghost" aria-hidden>{ch.no}</span>
      <span className="pg-kicker">Chapter {ch.no}</span>
      <h3 className="pg-title">{ch.g}</h3>
      <p className="pg-sum">{ch.sum}</p>
      <ul className="pg-topics" aria-label="Topics covered">
        {ch.items.map((it) => <li key={it}>{it}</li>)}
      </ul>
      <span className="pg-num pg-num--l">{Number(ch.no) * 2 - 1}</span>
    </div>
  )
}

/* right-hand page: the code */
function PageRight({ ch }) {
  return (
    <div className="pg pg--r" style={{ '--accent': ch.accent }}>
      <div className="pg-file">
        <span className="pg-tab">{ch.file}</span>
        <span className="pg-lang">python</span>
      </div>
      <pre className="code" tabIndex={0} aria-label={'Code example: ' + ch.file}>
        <code>
          {ch.code.split('\n').map((line, n) => (
            <span className="row" key={n}>
              <i className="ln">{n + 1}</i>
              {line ? hl(line) : '\u200b'}
            </span>
          ))}
        </code>
      </pre>
      <p className="pg-cap">{ch.cap}</p>
      <span className="pg-num pg-num--r">{Number(ch.no) * 2}</span>
    </div>
  )
}

function Skills() {
  const rm = useReducedMotion()
  const narrow = useNarrow()
  const flat = rm || narrow // no 3D turn: simple fade

  const [c, setC] = useState(0)           // chapter currently on the pages
  const [target, setTarget] = useState(0) // chapter we want to end up on
  const [flip, setFlip] = useState(null)  // { dir, to, fast } while a leaf is turning

  /* one motion value drives the leaf AND all of its shading */
  const rot = useMotionValue(0)
  const lift = useTransform(rot, (v) => bell(v) * 30)
  const castOp = useTransform(rot, (v) => bell(v) * 0.85)
  const frontShade = useTransform(rot, (v) => Math.min(Math.abs(v) / 90, 1) * 0.7)
  const backShade = useTransform(rot, (v) => Math.min(Math.max(0, 1 - (Math.abs(v) - 90) / 90), 1) * 0.7)

  /* whenever we are not where we want to be, turn the next page */
  useEffect(() => {
    if (flat) { if (c !== target) setC(target); return }
    if (flip || c === target) return
    const dir = target > c ? 'next' : 'prev'
    setFlip({ dir, to: dir === 'next' ? c + 1 : c - 1, fast: Math.abs(target - c) > 1 })
  }, [c, target, flip, flat])

  /* run the turn; reset the leaf once it is unmounted so nothing flickers */
  useLayoutEffect(() => {
    if (!flip) { rot.set(0); return }
    const ctl = animate(rot, flip.dir === 'next' ? -180 : 180, {
      duration: flip.fast ? FAST_MS : FLIP_MS,
      ease: flipEase,
      onComplete: () => { setC(flip.to); setFlip(null) },
    })
    return () => ctl.stop()
  }, [flip, rot])

  const go = (to) => setTarget(Math.max(0, Math.min(N - 1, to)))
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(target + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(target - 1) }
  }

  // what sits on the left / right while a leaf is mid-turn
  const leftIdx = flip?.dir === 'prev' ? flip.to : c
  const rightIdx = flip?.dir === 'next' ? flip.to : c
  const cur = CHAPTERS[c]
  const tgt = CHAPTERS[target]

  const leaf = flip && (
    <motion.div
      key={flip.dir + flip.to}
      className={'leaf leaf--' + flip.dir}
      style={{ rotateY: rot, z: lift }}
    >
      {flip.dir === 'next' ? (
        <>
          <div className="face">
            <PageRight ch={CHAPTERS[c]} />
            <motion.span className="face-shade" style={{ opacity: frontShade }} aria-hidden />
          </div>
          <div className="face face--back">
            <PageLeft ch={CHAPTERS[flip.to]} />
            <motion.span className="face-shade" style={{ opacity: backShade }} aria-hidden />
          </div>
        </>
      ) : (
        <>
          <div className="face">
            <PageLeft ch={CHAPTERS[c]} />
            <motion.span className="face-shade" style={{ opacity: frontShade }} aria-hidden />
          </div>
          <div className="face face--back">
            <PageRight ch={CHAPTERS[flip.to]} />
            <motion.span className="face-shade" style={{ opacity: backShade }} aria-hidden />
          </div>
        </>
      )}
    </motion.div>
  )

  return (
    <motion.div
      className="book"
      style={{ '--accent': cur.accent }}
      tabIndex={0}
      onKeyDown={onKey}
      aria-roledescription="book"
      aria-label="Skills book. Use the left and right arrow keys to turn pages."
      {...up(0)}
    >
      <div className="book-cover">
        <div className="book-spread">
          {flat ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={c}
                className="book-flat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease }}
              >
                <PageLeft ch={cur} />
                <PageRight ch={cur} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <div className="base base--l">
                <PageLeft ch={CHAPTERS[leftIdx]} />
                {flip && <motion.span className="cast cast--l" style={{ opacity: castOp }} aria-hidden />}
              </div>
              <div className="base base--r">
                <PageRight ch={CHAPTERS[rightIdx]} />
                {flip && <motion.span className="cast cast--r" style={{ opacity: castOp }} aria-hidden />}
              </div>
              {leaf}
            </>
          )}
          <span className="spine" aria-hidden />
        </div>
      </div>

      <div className="book-nav">
        <button className="bn" onClick={() => go(target - 1)} disabled={target === 0} aria-label="Previous page">
          <span aria-hidden>←</span> Prev
        </button>

        <div className="marks" role="tablist" aria-label="Chapters">
          {CHAPTERS.map((x, n) => (
            <button
              key={x.g}
              role="tab"
              aria-selected={target === n}
              aria-label={`Chapter ${x.no}: ${x.g}`}
              title={x.g}
              className={target === n ? 'on' : ''}
              style={{ '--a': x.accent }}
              onClick={() => go(n)}
            >
              {x.no}
            </button>
          ))}
        </div>

        <button className="bn bn--next" onClick={() => go(target + 1)} disabled={target === N - 1} aria-label="Next page">
          Next <span aria-hidden>→</span>
        </button>
      </div>
      <p className="book-hint" aria-live="polite">
        {tgt.no} / {String(N).padStart(2, '0')} · {tgt.g} · ← → to turn
      </p>
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
        <a className="logo" href="#home">Home<span></span></a>
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
                I like understanding systems from the ground up—how text becomes representations, 
                how models learn what matters, how retrieval brings the right context into focus, 
                and how agents decide what to do next. Then I build systems that put those ideas to work.
              </motion.p>
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

          <motion.p className="c-giant" {...up(0)}>
          </motion.p>

          <div className="c-grid">
            {CONTACT.map((c, i) => (
              <motion.a
                key={c.label}
                className="c-card"
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
        <span>It ends here</span>
        <a href="#home">Back to top</a>
      </footer>
    </>
  )
}