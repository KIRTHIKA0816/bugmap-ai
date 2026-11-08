import re, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering
from sklearn.ensemble import IsolationForest
ERR = ('ERROR', 'CRITICAL', 'FATAL')
def _norm(m): return re.sub(r'\b\d+\b|0x[0-9a-f]+', 'num', m.lower())
MAX_TEMPLATES = 1500  # cap so huge logs cannot exhaust memory in the O(n^2) clustering
def cluster_errors(events, threshold=0.8):
    errs = [e for e in events if e['level'] in ERR]
    if not errs: return []
    by = {}
    for e in errs: by.setdefault(_norm(e['message']), []).append(e)
    tpl = sorted(by.items(), key=lambda kv: -len(kv[1]))[:MAX_TEMPLATES]
    labels = [0]
    if len(tpl) > 1:
        try:
            X = TfidfVectorizer().fit_transform([k for k, _ in tpl]).toarray()
            labels = AgglomerativeClustering(n_clusters=None, metric='cosine', linkage='average', distance_threshold=threshold).fit_predict(X)
        except ValueError: labels = list(range(len(tpl)))  # e.g. messages with no usable words
    groups = {}
    for (_, evs), l in zip(tpl, labels): groups.setdefault(int(l), []).extend(evs)
    out = []
    for k, v in groups.items():
        v.sort(key=lambda x: x['line']); out.append(dict(group=k, count=len(v), sample=v[0]['message'], lines=[x['line'] for x in v[:1000]]))
    return sorted(out, key=lambda g: (-g['count'], g['lines'][0]))
def detect_anomalies(events, key=16):
    b = {}
    for e in events:
        if e['level'] in ERR: b[e['ts'][:key]] = b.get(e['ts'][:key], 0) + 1
    if len(b) < 3: return dict(method='none', note='Too few time buckets to judge anomalies.', anomalies=[])
    keys, v = list(b), np.array(list(b.values()), float)
    if len(v) >= 8:
        s = -IsolationForest(random_state=0).fit(v.reshape(-1, 1)).score_samples(v.reshape(-1, 1)); method = 'isolation_forest'; flag = s > np.percentile(s, 90)
    else:
        mad = np.median(abs(v - np.median(v))) or 1; s = 0.6745 * (v - np.median(v)) / mad; method = 'robust_zscore'; flag = s > 3.5
    return dict(method=method, note='Scores are relative rankings, not calibrated probabilities.', anomalies=[dict(minute=k, errors=int(c), score=round(float(x), 2)) for k, c, x, f in zip(keys, v, s, flag) if f])
HINTS = [('timeout|timed out', 'Possible upstream latency or network timeout; check dependency health and timeout settings.'),
         ('connection (refused|reset)|unreachable', 'Possible service down or wrong host/port; verify the target is running.'),
         ('nullpointer|none ?type|undefined', 'Possible missing value; inspect the failing line in the stack trace.'),
         ('out ?of ?memory|memoryerror', 'Possible memory exhaustion; review memory limits and recent load.'),
         ('permission|denied|unauthori[sz]ed', 'Possible credentials or access-policy problem.')]
def root_causes(groups, events=None):
    out = []
    for g in groups:
        for pat, tip in HINTS:
            if re.search(pat, g['sample'], re.I):
                out.append(dict(hypothesis=tip, status='possible, not verified', confidence='low' if g['count'] < 3 else 'medium', evidence_lines=g['lines'][:5])); break
    return out
