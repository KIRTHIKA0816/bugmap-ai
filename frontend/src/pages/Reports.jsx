import { useRef } from 'react'
import { useAnalysis } from '../context.jsx'
import { Panel, Empty } from '../components/Panel.jsx'
import { evalAlerts, makeReport, RANGES } from '../lib/logic.js'
export default function Reports() {
  const { data, name, demo, rules, range } = useAnalysis(), fr = useRef(null)
  if (!data) return <Empty />
  const html = makeReport(data, { name, rangeLabel: RANGES.find(r => r[0] === range)[1], alerts: evalAlerts(data, rules), sample: demo })
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name.replace(/\.\w+$/, '') + '-report.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) }
  const print = () => { const w = fr.current?.contentWindow; w?.focus(); w?.print() }
  return <Panel title="Report">
    <div className="bar"><button className="btn" onClick={download}>Download HTML report</button><button className="btn ghost" onClick={print}>Print / Save as PDF</button></div>
    <p className="mu">The report covers the current analysis and time range. In the print window choose "Save as PDF" as the printer.</p>
    <iframe ref={fr} title="Report preview" className="rep" sandbox="allow-same-origin allow-modals" srcDoc={html} />
  </Panel>
}
