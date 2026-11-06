"""Offline source-availability regression checks; never contact Understat."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]

def load(filename, name):
    spec = importlib.util.spec_from_file_location(name, root / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

diag = load('check_soccerdata_understat.py', 'source_check')
bridge = load('import_soccerdata_all.py', 'bridge_v451621')
suite = load('run_soccerdata_four_leagues.py', 'suite_v451621')

class ValidSource:
    def __init__(self, **kwargs): self.kwargs=kwargs
    def read_seasons(self): return [1]

class EmptySource:
    def __init__(self, **kwargs): pass
    def read_seasons(self): return []

class NonJsonSource:
    def __init__(self, **kwargs): pass
    def read_seasons(self): raise json.JSONDecodeError('Expecting value', '', 0)

class BadSchemaSource:
    def __init__(self, **kwargs): pass
    def read_seasons(self): raise KeyError('stat')

for source, expected_code, expected_phrase in [
    (ValidSource, 0, 'SOURCE_CHECK_OK'),
    (EmptySource, 4, 'NO_SEASON_DATA'),
    (NonJsonSource, 3, 'SOURCE_UNAVAILABLE'),
    (BadSchemaSource, 3, 'SOURCE_UNAVAILABLE'),
]:
    code, msg = diag.check_source(source, 'GER-Bundesliga', '2026/2027')
    assert (code, expected_phrase) == (expected_code, expected_phrase)
    assert expected_phrase in msg

# Reproduce exactly the traceback category and check friendly signal without network.
err = io.StringIO()
def throw_non_json(_sd, _args):
    raise json.JSONDecodeError('Expecting value', '', 0)
    yield None  # generator: error occurs during iteration, as in SoccerData
with (patch.object(bridge, 'source_records', throw_non_json),
      patch.dict(sys.modules, {'soccerdata': SimpleNamespace()}),
      patch.object(sys, 'argv', ['script', '--source', 'understat', '--dataset', 'player_season', '--permission-confirmed']),
      contextlib.redirect_stderr(err)):
    assert bridge.main() == 3
assert 'SOURCE_UNAVAILABLE' in err.getvalue()
assert 'NON_JSON_RESPONSE' in err.getvalue()
assert 'Traceback' not in err.getvalue()

# A 4-league run must STOP on source-unavailable without hammering the remaining 11 datasets.
subprocess_calls=[]
def fake_run(cmd,check=False):
    subprocess_calls.append(cmd)
    return SimpleNamespace(returncode=3)
with (patch.object(suite.subprocess, 'run', fake_run),
      patch.object(sys, 'argv', ['suite','--permission-confirmed', '--until', '2026-07-02']),
      contextlib.redirect_stderr(io.StringIO()) as stderr):
    assert suite.main() == 3
assert len(subprocess_calls)==1
assert 'SOURCE_UNAVAILABLE' in stderr.getvalue()

workflow=(root/'.github/workflows/football-stats-import.yml').read_text()
assert 'soccerdata_source_check' in workflow
assert 'scripts/check_soccerdata_understat.py' in workflow
print('V4.5.16.2.1 source-error handling PASSED (no network)')
