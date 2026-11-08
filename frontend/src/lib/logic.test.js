import { describe, it, expect } from 'vitest'
import { applyRange, evalAlerts, makeReport, DEFAULT_RULES } from './logic.js'
const ev = (line, ts, level, source, message) => ({ line, ts, level, source, message, trace: [] })
const events = [ev(1, '2026-10-26 10:00:00', 'INFO', 'web', 'ok'), ev(2, '2026-10-26 10:01:00', 'ERROR', 'db', 'timeout'), ev(3, '2026-10-26 10:10:00', 'ERROR', 'db', 'timeout again'), ev(4, '2026-10-26 10:10:30', 'CRITICAL', 'api', 'MemoryError'), ev(5, '2026-10-26 10:11:00', 'INFO', 'web', 'ok')]
const data = { events: 5, levels: { INFO: 2, ERROR: 2, CRITICAL: 1 }, events_sample: events, truncated: false,
  groups: [{ group: 0, count: 2, sample: 'timeout', lines: [2, 3] }, { group: 1, count: 1, sample: 'MemoryError', lines: [4] }],
  timeline: [{ minute: '2026-10-26 10:01', errors: 1 }, { minute: '2026-10-26 10:10', errors: 2 }], sources: [],
  anomalies: { method: 'robust_zscore', note: 'n', anomalies: [{ minute: '2026-10-26 10:01', errors: 1, score: 4 }, { minute: '2026-10-26 10:10', errors: 2, score: 5 }] },
  root_causes: [{ hypothesis: 'h1', status: 's', confidence: 'low', evidence_lines: [2, 3] }, { hypothesis: 'h2', status: 's', confidence: 'low', evidence_lines: [4] }] }
describe('applyRange', () => {
  it('returns the data untouched for the whole log', () => expect(applyRange(data, 'all')).toBe(data))
  it('keeps only the last N minutes and rebuilds every number', () => {
    const r = applyRange(data, '5')  // log ends 10:11:00, cut = 10:06:00
    expect(r.events).toBe(3); expect(r.levels).toEqual({ ERROR: 1, CRITICAL: 1, INFO: 1 })
    expect(r.groups.map(g => [g.count, g.lines])).toEqual([[1, [3]], [1, [4]]])
    expect(r.timeline).toEqual([{ minute: '2026-10-26 10:10', errors: 2 }]); expect(r.anomalies.anomalies).toHaveLength(1)
    expect(r.root_causes.map(x => x.hypothesis)).toEqual(['h1', 'h2']); expect(r.root_causes[0].evidence_lines).toEqual([3])
  })
  it('does not filter truncated logs (the sample is incomplete)', () => { const t = { ...data, truncated: true }; expect(applyRange(t, '5')).toBe(t) })
})
describe('evalAlerts', () => {
  it('fires the expected rules, high severity first', () => {
    const a = evalAlerts(data, DEFAULT_RULES).map(x => x.id)
    expect(a).toContain('rate'); expect(a).toContain('critical'); expect(a).toContain('anomaly'); expect(a[0]).toBe('rate')
  })
  it('respects disabled rules and thresholds', () => {
    const off = Object.fromEntries(Object.entries(DEFAULT_RULES).map(([k, v]) => [k, { ...v, on: false }]))
    expect(evalAlerts(data, off)).toEqual([]); expect(evalAlerts(data, { ...off, rate: { on: true, v: 90 } })).toEqual([])
  })
  it('ignores services with fewer than 3 events', () => expect(evalAlerts(data, { ...DEFAULT_RULES, service: { on: true, v: 1 } }).some(a => a.id.startsWith('svc-'))).toBe(false))
})
describe('makeReport', () => {
  it('escapes untrusted log text so the report cannot run scripts', () => {
    const bad = { ...data, groups: [{ group: 0, count: 1, sample: '<img src=x onerror=alert(1)>', lines: [2] }] }
    const h = makeReport(bad, { name: '<script>x</script>.log', rangeLabel: 'Whole log', alerts: [], sample: false })
    expect(h).not.toContain('<img src=x'); expect(h).not.toContain('<script>x'); expect(h).toContain('&lt;img src=x')
  })
})
