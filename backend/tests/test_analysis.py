import sys, pathlib; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from ai.parser import parse_log
from ai.analysis import cluster_errors, root_causes
LOG = "2026-10-26 10:00:01 ERROR db: Connection timed out after 30 s\n  at pool.get()\n2026-10-26 10:00:05 ERROR db: Connection timed out after 45 s\n2026-10-26 10:00:09 INFO web: ok password=abc123\n"
def test_parse_and_redact():
    ev = parse_log(LOG); assert len(ev) == 3 and ev[0]['trace'] and 'abc123' not in ev[2]['message']
def test_cluster_groups_similar():
    g = cluster_errors(parse_log(LOG)); assert len(g) == 1 and g[0]['count'] == 2
def test_root_cause_has_evidence():
    ev = parse_log(LOG); assert root_causes(cluster_errors(ev))[0]['evidence_lines'] == [1, 3]
def test_empty(): assert cluster_errors([]) == []
