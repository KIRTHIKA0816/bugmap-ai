import re
LINE = re.compile(r'^(?P<ts>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+\[?(?P<lvl>DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\]?\s+(?:(?P<src>[\w.\-]+):\s+)?(?P<msg>.*)$', re.I)
SECRET = re.compile(r'(?i)(password|passwd|token|api[_-]?key|secret)\s*[=:]\s*\S+')
def redact(s): return SECRET.sub(lambda m: m.group(1)+'=[REDACTED]', s)
def parse_log(text):
    events, cur = [], None
    for n, raw in enumerate(text.splitlines(), 1):
        m = LINE.match(raw.strip())
        if m:
            lvl = m['lvl'].upper().replace('WARNING', 'WARN')
            cur = dict(line=n, ts=m['ts'], level=lvl, source=m['src'] or '', message=redact(m['msg']), trace=[])
            events.append(cur)
        elif cur and raw.strip():
            cur['trace'].append(redact(raw.rstrip()))
    return events
