import { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { AnalysisProvider } from './context.jsx'
import { health } from './api.js'
import { useAnalysis } from './context.jsx'
import { evalAlerts } from './lib/logic.js'
import Alerts from './pages/Alerts.jsx'
import Reports from './pages/Reports.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Explorer from './pages/Explorer.jsx'
import Investigate from './pages/Investigate.jsx'
import Anomalies from './pages/Anomalies.jsx'
const links = [['/', 'Overview'], ['/upload', 'Upload logs'], ['/errors', 'Error explorer'], ['/investigate', 'Investigations'], ['/anomalies', 'Anomalies'], ['/alerts', 'Alerts'], ['/reports', 'Reports']]
function Nav() {
  const { data, rules } = useAnalysis(), [up, setUp] = useState(null), n = data ? evalAlerts(data, rules).length : 0
  useEffect(() => { health().then(setUp) }, [])
  return <nav className="nav" aria-label="Main">{links.map(([to, t]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'on' : ''}>{t}{to === '/alerts' && n > 0 && <b className="bdg" aria-label={n + ' alerts'}>{n}</b>}</NavLink>)}
    <span className={'st ' + (up ? 'ok' : 'bad')}>{up === null ? 'Checking API' : up ? 'API online' : 'API offline'}</span></nav>
}
export default function App() {
  return (
    <AnalysisProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} /><Route path="/upload" element={<Upload />} />
          <Route path="/errors" element={<Explorer />} /><Route path="/investigate" element={<Investigate />} />
          <Route path="/anomalies" element={<Anomalies />} /><Route path="/alerts" element={<Alerts />} /><Route path="/reports" element={<Reports />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </AnalysisProvider>
  )
}
