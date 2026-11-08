import { useAnalysis } from '../context.jsx'
import { Panel, Empty, Anomalies } from '../components/Panel.jsx'
export default function Investigate() {
  const { data } = useAnalysis()
  if (!data) return <Empty />
  const text = n => data.events_sample.find(e => e.line === n)?.message || ''
  return <>
    <Panel title="Possible root causes" ai>{data.root_causes.length ? data.root_causes.map((r, i) => <div className="item" key={i}><p><b>{r.hypothesis}</b></p>
      <p className="mu">{r.status} · confidence: {r.confidence}</p>{r.evidence_lines.map(n => <div className="mono ev" key={n}>line {n}: {text(n)}</div>)}</div>) : <p className="mu">No known pattern matched. There is not enough evidence for a hypothesis.</p>}
      <p className="mu">Confidence is a rule-based label (low under 3 matching events), not a probability. Hypotheses are never verified causes.</p></Panel>
    <Panel title="Similar error groups">{data.groups.length ? data.groups.map(g => <div className="item" key={g.group}><b>{g.count}×</b> {g.sample}<div className="mu mono">lines {g.lines.join(', ')}</div></div>) : <p className="mu">No errors to group.</p>}
      <p className="mu">Grouping uses TF-IDF similarity and depends on how consistent the log messages are.</p></Panel>
    <Anomalies a={data.anomalies} />
  </>
}
