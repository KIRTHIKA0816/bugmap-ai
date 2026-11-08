import os, time
from collections import Counter, defaultdict
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ai.parser import parse_log
from ai.analysis import cluster_errors, detect_anomalies, root_causes
DIST = Path(os.getenv('FRONTEND_DIST') or Path(__file__).resolve().parents[1] / 'frontend' / 'dist')
SAMPLE_LIMIT = 2000
RATE_LIMIT, RATE_WINDOW = int(os.getenv('RATE_LIMIT', 30)), 60  # analyses per IP per minute
app = Flask(__name__, static_folder=None); CORS(app, origins=[os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')])
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
_hits = defaultdict(list)
def _limited(ip):
    now = time.time(); h = _hits[ip] = [t for t in _hits[ip] if now - t < RATE_WINDOW]
    if len(h) >= RATE_LIMIT: return True
    h.append(now); return False
@app.after_request
def headers(r): r.headers['X-Content-Type-Options'] = 'nosniff'; r.headers['Referrer-Policy'] = 'no-referrer'; return r
@app.errorhandler(413)
def too_big(_): return jsonify(error='File is larger than 5 MB'), 413
@app.get('/api/health')
def health(): return jsonify(status='ok')
@app.post('/api/analyze')
def analyze():
    if _limited(request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()): return jsonify(error='Too many requests, try again in a minute'), 429
    f = request.files.get('file')
    if not f or not f.filename.lower().endswith(('.log', '.txt')): return jsonify(error='Upload a .log or .txt file'), 400
    try: text = f.read().decode('utf-8')
    except UnicodeDecodeError: return jsonify(error='File must be UTF-8 text'), 400
    ev = parse_log(text); g = cluster_errors(ev)
    E = ('ERROR', 'CRITICAL', 'FATAL')
    tl = Counter(e['ts'][:16] for e in ev if e['level'] in E); sr = Counter(e['source'] or 'unknown' for e in ev if e['level'] in E)
    return jsonify(events=len(ev), groups=g, anomalies=detect_anomalies(ev), root_causes=root_causes(g), levels=dict(Counter(e['level'] for e in ev)), timeline=[dict(minute=k, errors=v) for k, v in sorted(tl.items())], sources=[dict(name=k, errors=v) for k, v in sr.most_common(6)], events_sample=ev[:SAMPLE_LIMIT], truncated=len(ev) > SAMPLE_LIMIT)
@app.get('/', defaults={'path': ''})
@app.get('/<path:path>')
def spa(path):  # serves the built React app when frontend/dist exists (production)
    if path.startswith('api/'): return jsonify(error='Not found'), 404
    if path and (DIST / path).is_file(): return send_from_directory(DIST, path)
    if (DIST / 'index.html').exists(): return send_from_directory(DIST, 'index.html')
    return jsonify(error='Frontend is not built. Run "npm run build" in frontend/, or use the dev server on port 5173.'), 404
if __name__ == '__main__': app.run(debug=os.getenv('APP_ENV') != 'production', host='0.0.0.0' if os.getenv('APP_ENV') == 'production' else '127.0.0.1', port=int(os.getenv('PORT', 5000)))
