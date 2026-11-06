"""Offline SoccerData suite / stable-identity tests; no external network needed."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import datetime as dt

root=Path(__file__).resolve().parents[1]

def load(path, name):
    spec=importlib.util.spec_from_file_location(name, path)
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj

bridge=load(root/'scripts/import_soccerdata_all.py','soccerdata_v45162_bridge')
suite=load(root/'scripts/run_soccerdata_four_leagues.py','soccerdata_v45162_suite')
assert len(list(suite.planned_commands(SimpleNamespace(from_date='2026-07-01',until='2026-11-06',max_games=2,max_rows=1000,send=False))))==12
planned=list(suite.planned_commands(SimpleNamespace(from_date='2026-07-01',until='2026-11-06',max_games=2,max_rows=1000,send=True)))
assert [x[0] for x in planned][0]=='GER-Bundesliga'
assert set(x[1] for x in planned)=={'player_match','player_season','shot_event'}
assert all('--send' in cmd and '--permission-confirmed' in cmd for _,_,cmd in planned)

base={'game_id':123,'player_id':44,'player':'Player X','team':'Team A','xg':0.4,'goals':1}
changed={**base,'xg':0.65,'goals':2}
assert bridge.stable_id('understat','player_match',base,'GER-Bundesliga','2026/2027') == bridge.stable_id('understat','player_match',changed,'GER-Bundesliga','2026/2027'), 'Corrected values must update same row'
assert bridge.stable_id('understat','player_match',base,'GER-Bundesliga','2026/2027') != bridge.stable_id('understat','player_match',{**base,'player_id':45},'GER-Bundesliga','2026/2027')
shot={'shot_id':9001,'player':'Player X','xg':.09}
assert bridge.stable_id('understat','shot_event',shot,'GER-Bundesliga','2026/2027',{'game_id':123}) == bridge.stable_id('understat','shot_event',{**shot,'xg':.12},'GER-Bundesliga','2026/2027',{'game_id':123})
assert bridge.stable_id('understat','shot_event',shot,'GER-Bundesliga','2026/2027',{'game_id':123}) != bridge.stable_id('understat','shot_event',shot,'GER-Bundesliga','2026/2027',{'game_id':124})

work=(root/'.github/workflows/football-stats-import.yml').read_text()
assert 'soccerdata_suite_preview' in work and 'soccerdata_suite_import' in work
assert 'source_rights_confirmed' in work and 'Datenquellen-Berechtigung pruefen' in work
assert 'hashFiles(' in work
print('V4.5.16.2 SoccerData suite: 4 leagues x 3 datasets, bounded requests, rights gate, stable IDs PASSED')
