import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyze } from '../api.js'
import { useAnalysis } from '../context.jsx'
import { Panel } from '../components/Panel.jsx'
export default function Upload() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const { save, clear, raw, name, saved } = useAnalysis(), go = useNavigate()
  const run = async (f, demo) => {
    setBusy(true); setErr('')
    try { save(await analyze(f), f.name, demo); go('/') } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const sample = async () => { const t = await (await fetch('/sample.log')).text(); run(new File([t], 'sample.log', { type: 'text/plain' }), true) }
  return <Panel title="Upload a log file">
    <label className="drop"><input type="file" accept=".log,.txt" onChange={e => setFile(e.target.files[0] || null)} /><span>{file ? file.name : 'Choose a .log or .txt file (max 5 MB)'}</span></label>
    <div className="bar"><button className="btn" disabled={!file || busy} onClick={() => run(file, false)}>{busy ? 'Analysing…' : 'Analyse file'}</button><button className="btn ghost" disabled={busy} onClick={sample}>Try the sample log (demo)</button></div>
    {err && <p className="err" role="alert">{err}</p>}
    {raw && <div className="bar"><span className="mu">Saved analysis: <b>{name}</b>{!saved && ' (too large to save in this browser, it will be lost on close)'}</span><button className="btn ghost" onClick={clear}>Clear saved analysis</button></div>}
    <p className="mu">The server analyses your file in memory and does not store it. The result is kept in this browser only so it survives a refresh. Use Clear to delete it. Likely secrets such as passwords and tokens are redacted.</p>
  </Panel>
}
