import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAnalysis } from '../context.jsx'
import { buildView, DEMO } from '../view.js'
import { RANGES } from '../lib/logic.js'

const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches
const ease = (n, ms, set) => { let id; const s = performance.now(), f = t => { const p = Math.min((t - s) / ms, 1); set(n * (1 - Math.pow(1 - p, 3))); if (p < 1) id = requestAnimationFrame(f) }; id = requestAnimationFrame(f); return () => cancelAnimationFrame(id) }
function useCount(n, ms) { const [v, set] = useState(calm ? n : 0); useEffect(() => calm ? set(n) : ease(n, ms, set), [n, ms]); return v }
function useScramble(t, ms) {
  const [s, set] = useState(t)
  useEffect(() => {
    if (calm) { set(t); return }
    let id; const st = performance.now(), ch = 'ABCDEF0123456789#%&'
    const f = n => { const p = Math.min((n - st) / ms, 1), k = Math.floor(p * t.length); set(p >= 1 ? t : t.slice(0, k) + [...t.slice(k)].map(c => c === ' ' ? c : ch[Math.random() * ch.length | 0]).join('')); if (p < 1) id = requestAnimationFrame(f) }
    id = requestAnimationFrame(f); return () => cancelAnimationFrame(id)
  }, [t, ms])
  return s
}
function Line({ d, c, w = 220, h = 60 }) {
  const m = Math.max(...d, 1), p = d.map((v, i) => (i * w / (d.length - 1)).toFixed(1) + ',' + (h - 3 - v / m * (h - 8)).toFixed(1)).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`}><polygon points={`0,${h} ${p} ${w},${h}`} fill={c} opacity=".15" /><polyline points={p} fill="none" stroke={c} strokeWidth="1.6" /></svg>
}
const Bars = ({ d }) => <svg viewBox="0 0 220 50">{d.map((v, i) => <rect key={i} x={i * 9.2} y={48 - v * 2.8} width="6" height={v * 2.8} fill="#2f7cf6" />)}</svg>
const LB = { E: 'ERROR', W: 'WARN ', I: 'INFO ', D: 'DEBUG' }
const NONE = { svc: '-', op: '-', lvl: '-', c: 'g', durL: 'EVENTS', dur: '0', msg: 'No events', line: '-', trace: [], rel: [], relN: 0 }

export default function Dashboard() {
  const { data, raw, name, demo, range, setRange } = useAnalysis(), root = useRef(null)
  const v = useMemo(() => data ? buildView(data, name, demo) : DEMO, [data, name, demo])
  const [sel, setSel] = useState(v.sel), [tab, setTab] = useState(0), [s, setS] = useState({ s1: v.s1, s2: v.s2, s3: v.s3 }), [feed, setFeed] = useState([]), [extra, setExtra] = useState(0)
  const c = [useCount(v.kv[0][1], 1200), useCount(v.kv[1][1], 1200), useCount(v.kv[2][1], 1200), useCount(v.kv[3][1], 1200)], g = useCount(v.rate, 1600)
  const title = useScramble('BUGMAP AI', 1100), file = useScramble(v.file, 1300)

  useEffect(() => { // staggered entrance + cursor glow on every panel
    const bx = root.current.querySelectorAll('.box'); bx.forEach((b, i) => b.style.animationDelay = i * 60 + 'ms')
    if (calm) return
    const mv = e => { const b = e.target.closest('.box'); if (!b) return; const r = b.getBoundingClientRect(); b.style.setProperty('--mx', e.clientX - r.left + 'px'); b.style.setProperty('--my', e.clientY - r.top + 'px') }
    const el = root.current; el.addEventListener('pointermove', mv); return () => el.removeEventListener('pointermove', mv)
  }, [])
  useEffect(() => { setSel(v.sel); setTab(0); setS({ s1: v.s1, s2: v.s2, s3: v.s3 }) }, [v]) // new data or new time range
  useEffect(() => { // live log stream
    let k = 0; const mk = () => { const i = k++; return { id: i, ...v.feed(i) } }
    setFeed([mk(), mk(), mk()]); if (calm) return
    const iv = setInterval(() => setFeed(f => [...f, mk()].slice(-7)), 1400); return () => clearInterval(iv)
  }, [v])
  useEffect(() => { // simulator ticks: sample data only, never on real analysis
    if (calm || !v.live) return
    const iv = setInterval(() => setS(p => ({ s1: [...p.s1.slice(1), 3 + Math.round(Math.random() * 9)], s2: [...p.s2.slice(1), 2 + Math.round(Math.random() * 8)], s3: [...p.s3.slice(1), 8 + Math.round(Math.random() * 8)] })), 2500)
    let iv2; const t = setTimeout(() => { iv2 = setInterval(() => setExtra(x => x + 1 + (Math.random() * 4 | 0)), 1400) }, 1600)
    return () => { clearInterval(iv); clearTimeout(t); clearInterval(iv2) }
  }, [v])

  const r = v.rows[sel], d = r ? r.d : NONE, corr = r ? v.corr(sel) : []
  const pick = i => { setSel(i); setTab(0) }
  let cum = 0; const T = v.donut.parts.reduce((a, p) => a + p.n, 0) || 1
  const dg = v.donut.parts.length ? 'conic-gradient(' + v.donut.parts.map((p, i, a) => { cum += p.n; return i === a.length - 1 ? `${p.c} 0` : `${p.c} 0 calc(var(--k)*${(cum / T * 100).toFixed(1)}%)` }).join(',') + ')' : '#10233b'
  const tabs = ['Overview', 'Stack trace', `Related (${d.relN})`]
  return <div ref={root}>
    <div className="top">
      <div className="box"><div className="mu">LOG FILE ID</div><div className="mono">{file}</div><div className="mu" style={{ marginTop: 4 }}>{v.parsed}<b style={{ color: v.bad ? 'var(--r)' : 'var(--g)' }}>{v.status}</b></div></div>
      <div className="box ttl"><b>{title}</b><span className="mu">OBSERVE · CORRELATE · DEBUG · RESOLVE</span>{!calm && <div className="sc" />}</div>
      <div className="box"><div className="mu">TIME RANGE</div><div>{v.demo ? v.range : <select className="rng" aria-label="Time range" value={raw?.truncated ? 'all' : range} disabled={!!raw?.truncated} title={raw?.truncated ? 'Time filter works on logs of up to 2000 events' : ''} onChange={e => setRange(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}{!v.demo && ' ▾'}</div><div className="mu" style={{ marginTop: 4 }}>{v.src}<span style={{ color: 'var(--g)' }} className={v.live ? 'pulse' : ''}>● {v.srcTxt}</span></div></div>
    </div>
    <div className="main">
      <div className="col">
        <div className="box"><h3>ANALYSIS SUMMARY</h3><div className="sum"><div className="kv">{v.kv.map(([l], i) => <div className="mu" key={l}>{l}<b>{(Math.round(c[i]) + (i === 2 ? extra : 0)).toLocaleString('en-US')}</b></div>)}</div>
          <div className="gauge" style={{ '--a': v.rate + '%' }}><span><div>{g.toFixed(1)}%<small>ERROR RATE</small></div></span></div></div></div>
        <div className="box"><h3>ERROR RATE (15M)</h3><Line d={s.s1} c="#f0475a" /></div>
        <div className="box"><h3>ANOMALY SCORE</h3><Line d={s.s2} c="#19d3f0" /></div>
        <div className="box"><h3>EVENTS PER MINUTE</h3><Bars d={s.s3} /></div>
      </div>
      <div className="box wf"><h3>ERROR TIMELINE BY SERVICE</h3><div className="hint">Click a service to see its error details below.</div>
        <div><div className="row ax"><div className="mu">Service / operation</div><div className="t">{v.axis.map(a => <span key={a}>{a}</span>)}</div></div>
          {v.rows.map((x, i) => <div key={x.svc} className={'row' + (sel === i ? ' sel' : '')} tabIndex={0} role="button" onClick={() => pick(i)} onKeyDown={k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); pick(i) } }}>
            <div><b>{x.svc}</b><div className="mu">{x.op}</div></div>
            <div className="t"><i style={{ left: x.left + '%', width: x.width + '%', background: `var(--${x.cls})`, '--d': i * 90 + 'ms' }} /><em style={{ left: Math.min(x.left + x.width + 1, 88) + '%' }}>{x.label}</em></div></div>)}</div>
        <div className="lg"><span><s style={{ background: 'var(--cy)' }} />Normal</span><span><s style={{ background: 'var(--o)' }} />Slow</span><span><s style={{ background: 'var(--r)' }} />Error</span></div>
        <div className="ai"><b>AI investigation</b> · {v.ai}</div></div>
      <div className="col">
        <div className="box"><h3>ERROR LOCATIONS (SAMPLE)</h3><div className="map"><u style={{ left: '20%', top: '40%', color: 'var(--cy)' }} /><u style={{ left: '58%', top: '25%', color: 'var(--r)' }} /><u style={{ left: '72%', top: '55%', color: 'var(--o)' }} /></div></div>
        <div className="box"><h3>ERRORS BY TYPE</h3><div className="dn"><div className="donut" style={{ background: dg }}><span>{v.donut.total}</span></div>
          <div style={{ minWidth: 0 }}>{v.donut.parts.map(p => <div key={p.l} title={p.l} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: p.c }}>●</span> {p.l} {p.n}</div>)}</div></div></div>
        <div className="box"><h3>{v.feedTitle}</h3><div className="feed" aria-live="off">{feed.map(f => <div key={f.id} className={f.l}>{f.t} {LB[f.l]} {f.s}: {f.m}</div>)}</div></div>
        <div className="box"><h3>ERROR RATE BY SERVICE</h3><div className="rb">{v.bars.map((b, i) => <div key={i} title={b.name} style={{ height: b.h + '%', background: `var(--${b.c})` }}><b>{b.t}</b></div>)}</div></div>
      </div>
    </div>
    <div className="bot">
      <div className="box"><h3>TOP SERVICES BY ERROR RATE</h3>{v.top.map(t => <div className="sv" key={t.name}><span title={t.name}>{t.name}</span><i style={{ width: t.w + '%', background: `var(--${t.c})` }} /><b>{t.t}</b></div>)}</div>
      <div className="box"><h3>ERROR DETAILS</h3>
        <div className="tabs">{tabs.map((t, i) => <span key={i} className={tab === i ? 'on' : ''} tabIndex={0} role="button" onClick={() => setTab(i)} onKeyDown={k => k.key === 'Enter' && setTab(i)}>{t}</span>)}</div>
        {tab === 0 ? <div className="two mono"><div><div className="mu">SERVICE</div>{d.svc}<div className="mu">OPERATION</div>{d.op}<div className="mu">LEVEL</div><span style={{ color: `var(--${d.c})` }}>{d.lvl}</span></div>
          <div><div className="mu">{d.durL}</div>{d.dur}<div className="mu">MESSAGE</div>{d.msg}<div className="mu">LINE</div>{d.line}</div></div>
          : <div className="mono det">{(tab === 1 ? d.trace : d.rel).length ? (tab === 1 ? d.trace : d.rel).join('\n') : v.demo ? 'Sample data only. Upload a log to see real traces and related events.' : tab === 1 ? 'No stack trace lines for this event.' : 'No other events from this service.'}</div>}</div>
      <div className="box"><h3>CORRELATION PATH</h3><div className="cp">{corr.map((x, i) => <Fragment key={i}>{i > 0 && '→'}<div className={x.hit ? 'hit' : ''}>{x.n}<br /><span className="mono">line {x.line}</span></div></Fragment>)}</div></div>
    </div>
  </div>
}
