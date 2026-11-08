import { Link } from 'react-router-dom'
export const Panel = ({ title, ai, children }) => <section className={'box' + (ai ? ' aip' : '')}><h3>{title}</h3>{children}</section>
export const Empty = () => <div className="box empty"><h2>No analysis yet</h2><p className="mu">Upload a .log or .txt file to see errors, groups and possible root causes.</p><Link className="btn" to="/upload">Upload a log file</Link></div>
export const Level = ({ l }) => <span className={'lv l-' + l}>{l}</span>
export const Anomalies = ({ a }) => <Panel title={'Anomalies (' + a.method + ')'}>{a.anomalies.length ? a.anomalies.map(x => <div className="item mono" key={x.minute}>{x.minute} · {x.errors} errors · score {x.score}</div>) : <p className="mu">No anomalous minutes found.</p>}<p className="mu">{a.note}</p></Panel>
