import { useAnalysis } from '../context.jsx'
import { Empty, Anomalies } from '../components/Panel.jsx'
export default function AnomaliesPage() { const { data } = useAnalysis(); return data ? <Anomalies a={data.anomalies} /> : <Empty /> }
