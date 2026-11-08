export const ERR = ['ERROR', 'CRITICAL', 'FATAL']
export const RANGES = [['all', 'Whole log'], ['5', 'Last 5 minutes'], ['15', 'Last 15 minutes'], ['30', 'Last 30 minutes'], ['60', 'Last 60 minutes']]
export const DEFAULT_RULES = { rate: { on: true, v: 10 }, burst: { on: true, v: 5 }, critical: { on: true }, service: { on: true, v: 50 }, anomaly: { on: true } }
export const tms = ts => Date.parse(ts.replace(' ', 'T').replace(',', '.'))
const isE = e => ERR.includes(e.level)

// Keep only the last N minutes of the log (relative to its final event) and rebuild every derived number.
export function applyRange(data, range) {
  if (!data || range === 'all' || data.truncated || !data.events_sample.length) return data
  const all = data.events_sample, cut = Math.max(...all.map(e => tms(e.ts))) - Number(range) * 60000
  const keep = all.filter(e => tms(e.ts) >= cut), lines = new Set(keep.map(e => e.line)), by = Object.fromEntries(keep.map(e => [e.line, e]))
  const count = (a, f) => a.reduce((m, e) => { const k = f(e); m[k] = (m[k] || 0) + 1; return m }, {})
  const tl = count(keep.filter(isE), e => e.ts.slice(0, 16)), sr = count(keep.filter(isE), e => e.source || 'unknown')
  const groups = data.groups.map(g => { const l = g.lines.filter(n => lines.has(n)); return { ...g, lines: l, count: l.length, sample: l.length ? by[l[0]].message : g.sample } }).filter(g => g.count)
  return { ...data, events: keep.length, levels: count(keep, e => e.level), events_sample: keep, groups, ranged: true, total_events: data.events,
    timeline: Object.keys(tl).sort().map(m => ({ minute: m, errors: tl[m] })), sources: Object.entries(sr).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, errors]) => ({ name, errors })),
    anomalies: { ...data.anomalies, anomalies: data.anomalies.anomalies.filter(a => tl[a.minute]) },
    root_causes: data.root_causes.map(r => ({ ...r, evidence_lines: r.evidence_lines.filter(n => lines.has(n)) })).filter(r => r.evidence_lines.length) }
}

export const errorCount = d => ERR.reduce((n, l) => n + (d.levels[l] || 0), 0)
export function serviceStats(d) {
  const S = {}; d.events_sample.forEach(e => { const k = e.source || 'unknown', s = S[k] || (S[k] = { name: k, n: 0, e: 0 }); s.n++; if (isE(e)) s.e++ })
  return Object.values(S).map(s => ({ ...s, p: s.e / s.n * 100 })).sort((a, b) => b.p - a.p || b.e - a.e)
}

// Rule-based alerts, evaluated in the browser on the analysed log. Nothing is sent anywhere.
export function evalAlerts(d, r) {
  if (!d) return []
  const out = [], nErr = errorCount(d), rate = d.events ? nErr / d.events * 100 : 0, sev = (v, t) => v >= t * 2 ? 'high' : 'medium'
  if (r.rate.on && rate >= r.rate.v) out.push({ id: 'rate', sev: sev(rate, r.rate.v), title: `Error rate is ${rate.toFixed(1)}%`, detail: `${nErr} of ${d.events} events are errors (limit ${r.rate.v}%).` })
  if (r.burst.on) { const b = d.timeline.filter(t => t.errors >= r.burst.v).sort((a, c) => c.errors - a.errors); if (b.length) out.push({ id: 'burst', sev: sev(b[0].errors, r.burst.v), title: `${b[0].errors} errors in one minute`, detail: `Busiest minute ${b[0].minute}. ${b.length} minute(s) at or above ${r.burst.v} errors.` }) }
  if (r.critical.on) { const c = d.events_sample.filter(e => e.level === 'CRITICAL' || e.level === 'FATAL'); if (c.length) out.push({ id: 'critical', sev: 'high', title: `${c.length} CRITICAL/FATAL event(s)`, detail: `First at line ${c[0].line}: ${c[0].message}` }) }
  if (r.service.on) serviceStats(d).filter(s => s.n >= 3 && s.p >= r.service.v).forEach(s => out.push({ id: 'svc-' + s.name, sev: s.p >= 90 ? 'high' : 'medium', title: `${s.name}: ${s.p.toFixed(0)}% of its events are errors`, detail: `${s.e} of ${s.n} events (limit ${r.service.v}%, services with fewer than 3 events are ignored).` }))
  if (r.anomaly.on && d.anomalies.anomalies.length) out.push({ id: 'anomaly', sev: 'medium', title: `${d.anomalies.anomalies.length} unusual error spike(s)`, detail: 'Minutes: ' + d.anomalies.anomalies.map(a => a.minute).join(', ') })
  return out.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'high' ? -1 : 1))
}

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
// Standalone HTML report. Every value from the log is escaped because log text is untrusted.
export function makeReport(d, { name, rangeLabel, alerts, sample }) {
  const nErr = errorCount(d), rate = d.events ? nErr / d.events * 100 : 0, mx = Math.max(...d.timeline.map(t => t.errors), 1), svc = serviceStats(d).slice(0, 8)
  const bars = d.timeline.slice(-40).map((t, i, a) => { const w = 560 / a.length, h = t.errors / mx * 70; return `<rect x="${(i * w).toFixed(1)}" y="${(80 - h).toFixed(1)}" width="${Math.max(w - 2, 1).toFixed(1)}" height="${h.toFixed(1)}" fill="#d6293e"><title>${esc(t.minute)}: ${t.errors} errors</title></rect>` }).join('')
  const tbl = (h, rows) => `<table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BugMap AI report - ${esc(name)}</title><style>
body{font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#17202e;max-width:860px;margin:24px auto;padding:0 16px}h1{margin:0}h2{margin:26px 0 6px;font-size:16px;border-bottom:2px solid #1c6fe0;padding-bottom:3px}
.m{color:#5b6b80;font-size:12px}.k{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.k div{border:1px solid #cfd8e6;border-radius:6px;padding:8px 14px;min-width:110px}.k b{display:block;font-size:20px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #d7deea;padding:4px 8px;text-align:left;vertical-align:top}th{background:#eef3fb}.high{color:#d6293e;font-weight:700}.medium{color:#c77700;font-weight:700}
@media print{body{margin:0}}</style></head><body>
<h1>BugMap AI report</h1><div class="m">File: ${esc(name)} · Time range: ${esc(rangeLabel)} · Generated ${esc(new Date().toLocaleString())}${sample ? ' · SAMPLE LOG (demo)' : ''}</div>
<div class="k"><div><b>${d.events}</b>events</div><div><b>${nErr}</b>errors</div><div><b>${rate.toFixed(1)}%</b>error rate</div><div><b>${d.groups.length}</b>error groups</div><div><b>${alerts.length}</b>alerts</div></div>
${d.truncated ? `<p class="m">Only the first ${d.events_sample.length} of ${d.events} events were loaded for display; counts for levels and services use those events.</p>` : ''}
<h2>Alerts</h2>${alerts.length ? tbl(['Severity', 'Alert', 'Detail'], alerts.map(a => [a.sev, a.title, a.detail])) : '<p>No alert rules were triggered.</p>'}
<h2>Errors per minute</h2><svg viewBox="0 0 560 84" width="100%" role="img" aria-label="Errors per minute">${d.timeline.length ? bars : ''}</svg>${d.timeline.length ? '' : '<p>No errors in this range.</p>'}
<h2>Possible root causes (hypotheses, not verified)</h2>${d.root_causes.length ? tbl(['Hypothesis', 'Confidence', 'Evidence lines'], d.root_causes.map(r => [r.hypothesis, r.confidence, r.evidence_lines.join(', ')])) : '<p>No known pattern matched, so there is not enough evidence for a hypothesis.</p>'}
<h2>Similar error groups</h2>${d.groups.length ? tbl(['Count', 'Example message', 'Lines'], d.groups.slice(0, 10).map(g => [g.count, g.sample, g.lines.slice(0, 8).join(', ')])) : '<p>No errors to group.</p>'}
<h2>Services by error rate</h2>${svc.length ? tbl(['Service', 'Events', 'Errors', 'Error rate'], svc.map(s => [s.name, s.n, s.e, s.p.toFixed(1) + '%'])) : '<p>No events.</p>'}
<h2>Unusual error spikes (${esc(d.anomalies.method)})</h2>${d.anomalies.anomalies.length ? tbl(['Minute', 'Errors', 'Score'], d.anomalies.anomalies.map(a => [a.minute, a.errors, a.score])) : '<p>None found.</p>'}
<p class="m">${esc(d.anomalies.note)} Root causes are possibilities suggested by keyword rules. Confirm them in your own system before acting. Likely secrets in the log were redacted.</p></body></html>`
}
