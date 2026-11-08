import sys, io, pathlib; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app import app
def test_analyze_ok():
    log = b"2026-10-26 10:00:01 ERROR db: Connection timed out\n2026-10-26 10:00:02 INFO web: ok\n"
    r = app.test_client().post('/api/analyze', data={'file': (io.BytesIO(log), 'a.log')})
    j = r.get_json(); assert r.status_code == 200 and j['levels']['ERROR'] == 1 and j['timeline'][0]['errors'] == 1
def test_rejects_exe():
    r = app.test_client().post('/api/analyze', data={'file': (io.BytesIO(b'x'), 'a.exe')}); assert r.status_code == 400
def _post(c, body, name='a.log'): return c.post('/api/analyze', data={'file': (io.BytesIO(body), name)})
def test_large_log_is_capped_and_flagged():
    body = ''.join(f'2026-10-26 10:{i // 60 % 60:02d}:{i % 60:02d} ERROR svc: failed request {i}\n' for i in range(2500)).encode()
    j = _post(app.test_client(), body).get_json()
    assert j['events'] == 2500 and len(j['events_sample']) == 2000 and j['truncated'] is True and j['groups'][0]['count'] == 2500
def test_many_unique_errors_do_not_crash():
    body = ''.join(f'2026-10-26 10:00:{i % 60:02d} ERROR svc: code{i}x{"abcdefghij"[i % 10]} broke\n' for i in range(3000)).encode()
    assert _post(app.test_client(), body).status_code == 200
def test_wordless_error_messages_do_not_crash():
    body = b'2026-10-26 10:00:01 ERROR a: !!!\n2026-10-26 10:00:02 ERROR a: ???\n'
    assert _post(app.test_client(), body).status_code == 200
def test_rate_limit(monkeypatch):
    import app as m; monkeypatch.setattr(m, 'RATE_LIMIT', 2); m._hits.clear(); c = app.test_client()
    codes = [_post(c, b'2026-10-26 10:00:01 INFO a: ok\n').status_code for _ in range(3)]; m._hits.clear(); assert codes == [200, 200, 429]
def test_unknown_api_route_404_and_spa_fallback(tmp_path, monkeypatch):
    import app as m; (tmp_path / 'index.html').write_text('<h1>app</h1>'); monkeypatch.setattr(m, 'DIST', tmp_path); c = app.test_client()
    assert c.get('/api/nope').status_code == 404 and b'<h1>app</h1>' in c.get('/upload').data and c.get('/').status_code == 200
def test_path_traversal_blocked(tmp_path, monkeypatch):
    import app as m; (tmp_path / 'index.html').write_text('ok'); monkeypatch.setattr(m, 'DIST', tmp_path)
    assert b'root:' not in app.test_client().get('/..%2f..%2f..%2fetc/passwd').data
