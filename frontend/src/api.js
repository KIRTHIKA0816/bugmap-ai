export async function analyze(file) {
  const fd = new FormData(); fd.append('file', file)
  const r = await fetch('/api/analyze', { method: 'POST', body: fd })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Analysis failed (' + r.status + ')')
  return j
}
export const health = () => fetch('/api/health').then(r => r.ok).catch(() => false)
