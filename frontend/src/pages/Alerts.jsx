import { useAnalysis } from '../context.jsx'
import { Panel, Empty } from '../components/Panel.jsx'
import { evalAlerts, DEFAULT_RULES } from '../lib/logic.js'
const ROWS = [['rate', 'Overall error rate is at or above', '%'], ['burst', 'Errors in a single minute are at or above', 'errors'], ['critical', 'Any CRITICAL or FATAL event'], ['service', 'A service has an error rate at or above', '%'], ['anomaly', 'Unusual error spikes were detected']]
export default function Alerts() {
  const { data, rules, setRules, range } = useAnalysis()
  if (!data) return <Empty />
  const set = (k, patch) => setRules({ ...rules, [k]: { ...rules[k], ...patch } }), alerts = evalAlerts(data, rules)
  return <>
    <Panel title="Alert rules">
      {ROWS.map(([k, label, unit]) => <div className="item rule" key={k}>
        <label><input type="checkbox" checked={rules[k].on} onChange={e => set(k, { on: e.target.checked })} /> {label}</label>
        {unit && <span><input type="number" min="1" aria-label={label} value={rules[k].v} disabled={!rules[k].on} onChange={e => set(k, { v: Math.max(1, Number(e.target.value) || 1) })} /> <span className="mu">{unit}</span></span>}
      </div>)}
      <div className="bar"><button className="btn ghost" onClick={() => setRules(DEFAULT_RULES)}>Reset to defaults</button></div>
      <p className="mu">Rules are checked in this browser against the log you analysed{range !== 'all' ? ' (current time range only)' : ''}. They do not send email or notifications. Your settings are saved in this browser.</p>
    </Panel>
    <Panel title={`Triggered alerts (${alerts.length})`}>
      {alerts.length ? alerts.map(a => <div className="item" key={a.id}><b className={'sev ' + a.sev}>{a.sev.toUpperCase()}</b> <b>{a.title}</b><div className="mu">{a.detail}</div></div>) : <p className="mu">No rules were triggered for this log.</p>}
    </Panel>
  </>
}
