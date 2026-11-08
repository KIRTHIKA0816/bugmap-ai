import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { applyRange, DEFAULT_RULES } from './lib/logic.js'
const Ctx = createContext(null), KEY = 'bugmap:v2'
export const useAnalysis = () => useContext(Ctx)
const valid = d => d && Array.isArray(d.events_sample) && Array.isArray(d.groups) && Array.isArray(d.timeline) && d.anomalies && d.levels
const load = () => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && valid(s.data)) return { data: s.data, name: String(s.name || ''), demo: !!s.demo, range: s.range || 'all', rules: { ...DEFAULT_RULES, ...s.rules } } } catch {}
  return { data: null, name: '', demo: false, range: 'all', rules: DEFAULT_RULES }
}
export function AnalysisProvider({ children }) {
  const [s, set] = useState(load), [saved, setSaved] = useState(true)
  useEffect(() => { // keep the result across refresh and browser restarts (this browser only)
    try { s.data ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); setSaved(true) } catch { setSaved(false) }
  }, [s])
  const data = useMemo(() => applyRange(s.data, s.range), [s.data, s.range])
  const api = {
    raw: s.data, data, name: s.name, demo: s.demo, range: s.range, rules: s.rules, saved,
    save: (data, name, demo) => set(p => ({ ...p, data, name, demo, range: 'all' })),
    setRange: range => set(p => ({ ...p, range })), setRules: rules => set(p => ({ ...p, rules })),
    clear: () => set(p => ({ ...p, data: null, name: '', demo: false, range: 'all' }))
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
