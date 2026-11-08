import { Fragment, useState } from 'react'
import { useAnalysis } from '../context.jsx'
import { Panel, Empty, Level } from '../components/Panel.jsx'
const safe = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"' }
export default function Explorer() {
  const { data, name } = useAnalysis(), [lv, setLv] = useState(''), [q, setQ] = useState(''), [open, setOpen] = useState(null)
  if (!data) return <Empty />
  const rows = data.events_sample.filter(e => (!lv || e.level === lv) && (!q || (e.message + e.source).toLowerCase().includes(q.toLowerCase())))
  const csv = () => {
    const t = ['line,time,level,source,message', ...rows.map(e => [e.line, e.ts, e.level, e.source, e.message].map(safe).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = name.replace(/\.\w+$/, '') + '-events.csv'; a.click()
  }
  return <Panel title={`Error explorer (${rows.length} events)`}>
    <div className="bar"><input placeholder="Search message or source" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Level" value={lv} onChange={e => setLv(e.target.value)}><option value="">All levels</option>{Object.keys(data.levels).map(l => <option key={l}>{l}</option>)}</select>
      <button className="btn ghost" onClick={csv}>Export CSV</button></div>
    <div className="w"><table><thead><tr><th>Line</th><th>Time</th><th>Level</th><th>Source</th><th>Message</th></tr></thead><tbody>
      {rows.slice(0, 500).map(e => <Fragment key={e.line}>
        <tr className="click" tabIndex={0} onClick={() => setOpen(open === e.line ? null : e.line)} onKeyDown={k => k.key === 'Enter' && setOpen(open === e.line ? null : e.line)}><td className="mono">{e.line}</td><td className="mono">{e.ts}</td><td><Level l={e.level} /></td><td>{e.source}</td><td>{e.message}</td></tr>
        {open === e.line && <tr><td colSpan={5}><pre className="mono">{e.trace.length ? e.trace.join('\n') : 'No stack trace lines for this event.'}</pre></td></tr>}</Fragment>)}
    </tbody></table></div>
    {rows.length > 500 && <p className="mu">Showing the first 500 of {rows.length} matching events. Use search or the level filter to narrow down, or export the CSV for all of them.</p>}
    {data.truncated && <p className="mu">Only the first {data.events_sample.length} of {data.events} events are loaded here.</p>}
  </Panel>
}
