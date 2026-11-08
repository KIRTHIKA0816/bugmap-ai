const ERR = ['ERROR', 'CRITICAL', 'FATAL']
const p2 = n => String(n).padStart(2, '0')
const fmt = ms => { const d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) }
const tms = ts => Date.parse(ts.replace(' ', 'T').replace(',', '.'))
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s
const col = p => p >= 20 ? 'r' : p >= 8 ? 'o' : 'bl'
const pct = x => (Math.round(x * 10) / 10).toFixed(1)
const pad = a => a.length > 1 ? a : a.length ? [a[0], a[0]] : [0, 0]
const now = () => new Date().toTimeString().slice(0, 8)

// ---- built-in sample data: exactly the numbers shown in design/dashboard.html ----
const R = [['api-gateway', 'GET /checkout', 0, 70, 'cy', '320ms'], ['auth-service', 'validate token', 10, 25, 'cy', '210ms'], ['user-service', 'get profile', 22, 18, 'cy', '120ms'], ['checkout-service', 'create checkout', 30, 50, 'o', '1.1s'], ['inventory-service', 'check stock', 38, 22, 'cy', '620ms'], ['payment-service', 'charge payment', 58, 32, 'r', '2.1s'], ['bank-gateway', 'process charge', 72, 24, 'r', '1.95s'], ['notification', 'send email', 84, 14, 'cy', '2.2s']]
const MSG = { r: 'Request failed: upstream timeout', o: 'Response slower than p95', cy: 'Completed normally' }, LV = { r: 'ERROR', o: 'SLOW', cy: 'OK' }, LC = { r: 'r', o: 'o', cy: 'g' }
const L = [['E', 'payment-service', 'gateway timeout after 2.1s'], ['W', 'checkout', 'retry 2 of 3'], ['I', 'auth', 'token validated'], ['E', 'bank-gateway', 'connection reset'], ['W', 'inventory', 'slow query 620ms'], ['I', 'api-gateway', 'GET /checkout 200']]
const BASE = [['api-gateway', 1031], ['checkout', 1038], ['payment-service', 1042], ['bank-gateway', 1044]]
export const DEMO = {
  demo: true, live: true, file: 'payments-api_2026-10-26.log', parsed: 'Parsed 14:32:18 · 48,210 lines · status ', status: 'ERRORS FOUND', bad: true,
  range: 'Last 15 minutes ▾', src: 'Sample data · ', srcTxt: 'monitoring simulator',
  kv: [['Services', 12], ['Error groups', 7], ['Events', 1284], ['Files', 9]], rate: 15.9,
  s1: [3, 4, 3, 5, 4, 6, 5, 4, 7, 6, 5, 9, 8, 22, 10], s2: [2, 3, 2, 2, 3, 4, 3, 5, 4, 6, 7, 6, 8, 9, 8],
  s3: [8, 9, 7, 9, 10, 8, 9, 11, 9, 10, 12, 9, 10, 13, 11, 10, 12, 14, 11, 12, 16, 13, 12, 15],
  axis: ['0', '500ms', '1.0s', '1.5s', '2.0s', '2.5s'],
  rows: R.map((r, i) => ({ svc: r[0], op: r[1], left: r[2], width: r[3] * .8, cls: r[4], label: r[5], d: { svc: r[0], op: r[1], lvl: LV[r[4]], c: LC[r[4]], durL: 'DURATION', dur: r[5], msg: MSG[r[4]], line: 1000 + i * 7, trace: [], rel: [], relN: 12 } })), sel: 5,
  ai: 'Possible cause (unverified): payment gateway timeouts, log lines 1042, 1058, 1077. Confidence: medium. Next: check gateway latency and retry settings.',
  donut: { total: 7, parts: [{ l: 'Server error', n: 4, c: 'var(--r)' }, { l: 'Timeout', n: 2, c: 'var(--o)' }, { l: 'Validation', n: 1, c: 'var(--bl)' }] },
  feedTitle: 'LIVE LOG STREAM', feed: i => { const [l, s, m] = L[i % 6]; return { l, t: now(), s, m } },
  bars: [{ h: 30, c: 'bl', t: '8.7%' }, { h: 50, c: 'bl', t: '12.3%' }, { h: 75, c: 'o', t: '18.9%' }, { h: 100, c: 'r', t: '24.6%' }],
  top: [{ name: 'checkout', w: 90, c: 'r', t: '32.1%' }, { name: 'payment', w: 80, c: 'r', t: '28.7%' }, { name: 'inventory', w: 35, c: 'o', t: '12.4%' }, { name: 'user', w: 10, c: 'bl', t: '3.1%' }],
  corr(i) { return BASE.map(([n, line], k) => ({ n: k === 2 ? this.rows[i].svc : n, line, hit: k === 2 })) }
}

// ---- real analysis result from /api/analyze -> same view shape ----
export function buildView(data, name, isSample) {
  const ev = data.events_sample, isE = e => ERR.includes(e.level)
  const nErr = ERR.reduce((n, l) => n + (data.levels[l] || 0), 0)
  const ms = ev.map(e => tms(e.ts)), ok = ev.length > 0 && ms.every(Number.isFinite)
  const T = ev.map((e, i) => ok ? ms[i] : i), t0 = T.length ? Math.min(...T) : 0, t1 = T.length ? Math.max(...T) : 0, span = Math.max(t1 - t0, 1)
  const S = {}
  ev.forEach((e, i) => { const k = e.source || 'unknown', s = S[k] || (S[k] = { name: k, n: 0, e: 0, w: 0, evs: [] }); s.n++; if (isE(e)) s.e++; else if (e.level === 'WARN') s.w++; s.evs.push({ e, t: T[i], i }) })
  const srcs = Object.values(S)
  const rows = srcs.sort((a, b) => a.evs[0].t - b.evs[0].t).slice(0, 8).map(s => {
    const first = s.evs[0].t, last = s.evs[s.evs.length - 1].t, cls = s.e ? 'r' : s.w ? 'o' : 'cy'
    const ref = s.evs.filter(x => cls === 'r' ? isE(x.e) : cls === 'o' ? x.e.level === 'WARN' : true).pop(), e = ref.e
    const left = Math.min((first - t0) / span * 100, 98)
    return { svc: s.name, op: cut(e.message, 22), left, width: Math.min(Math.max((last - first) / span * 100, 2), 100 - left), cls, label: s.n + ' ev', ri: ref.i,
      d: { svc: s.name, op: cut(e.message, 30), lvl: e.level, c: LC[cls], durL: 'EVENTS', dur: `${s.n} (${s.e} errors)`, msg: e.message, line: e.line, trace: e.trace, rel: s.evs.filter(x => x !== ref).slice(-5).map(x => `line ${x.e.line} · ${x.e.level} · ${x.e.message}`), relN: s.n - 1 } }
  })
  const A = Object.fromEntries(data.anomalies.anomalies.map(a => [a.minute, a.score])), tl = data.timeline.slice(-30)
  const pm = {}; ev.forEach(e => { const k = e.ts.slice(0, 16); pm[k] = (pm[k] || 0) + 1 })
  const pv = Object.values(pm).slice(-24), mx3 = Math.max(...pv, 1)
  const g = data.groups, parts = g.slice(0, 3).map((x, i) => ({ l: cut(x.sample, 20), n: x.count, c: ['var(--r)', 'var(--o)', 'var(--bl)'][i] }))
  if (g.length > 3) parts[2] = { l: 'Other', n: g.slice(2).reduce((a, x) => a + x.count, 0), c: 'var(--bl)' }
  const rate = srcs.map(s => ({ name: s.name, p: s.e / s.n * 100 })).sort((a, b) => b.p - a.p), mx = Math.max(rate[0]?.p || 0, 1), rc = data.root_causes[0]
  return {
    demo: false, live: false, file: name, parsed: `Parsed ${now()} · ${data.events.toLocaleString('en-US')} events · status `, status: nErr ? 'ERRORS FOUND' : 'NO ERRORS', bad: nErr > 0,
    range: ok ? `${fmt(t0)} → ${fmt(t1)}` : 'Whole log', src: (ok ? `${fmt(t0)} → ${fmt(t1)} · ` : ''), srcTxt: isSample ? 'sample log (demo)' : 'analysed in memory',
    kv: [['Services', srcs.length], ['Error groups', g.length], ['Events', data.events], ['Files', 1]], rate: data.events ? nErr / data.events * 100 : 0,
    s1: pad(tl.map(x => x.errors)), s2: pad(tl.map(x => Math.max(A[x.minute] || 0, 0))), s3: pad(pv.map(v => Math.max(1, Math.round(v / mx3 * 16)))),
    axis: Array.from({ length: 6 }, (_, i) => ok ? fmt(t0 + span * i / 5) : '#' + Math.round(span * i / 5)),
    rows, sel: Math.max(0, rows.findIndex(r => r.cls === 'r')),
    ai: rc ? `Possible cause (unverified): ${rc.hypothesis} Log lines ${rc.evidence_lines.join(', ')}. Confidence: ${rc.confidence}.` : 'Not enough evidence for a root-cause hypothesis.',
    donut: { total: nErr, parts }, feedTitle: 'LOG STREAM (REPLAY)',
    feed: i => { const e = ev[i % (ev.length || 1)]; return e ? { l: isE(e) ? 'E' : e.level === 'WARN' ? 'W' : e.level === 'INFO' ? 'I' : 'D', t: e.ts.slice(11, 19), s: e.source || 'unknown', m: e.message } : { l: 'I', t: '--:--:--', s: 'log', m: 'no events' } },
    bars: rate.slice(0, 4).reverse().map(x => ({ name: x.name, h: Math.max(x.p / mx * 100, 6), c: col(x.p), t: pct(x.p) + '%' })),
    top: rate.slice(0, 4).map(x => ({ name: x.name, w: Math.max(x.p / mx * 90, 2), c: col(x.p), t: pct(x.p) + '%' })),
    corr(i) { const k = this.rows[i].ri; return ev.slice(Math.max(0, k - 2), k + 2).map((e, j, a) => ({ n: e.source || 'unknown', line: e.line, hit: e.line === ev[k].line })) }
  }
}
