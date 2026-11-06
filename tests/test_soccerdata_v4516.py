"""Offline tests for source-field preservation and resumable match batches (no scraping)."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import pandas as pd

script=Path(__file__).resolve().parents[1]/'scripts/import_soccerdata_all.py'
spec=importlib.util.spec_from_file_location('soccerbridge', script)
bridge=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

fixtures=[{'game_id':701,'date':'2026-10-01T19:00:00Z','home_team':'Bayern Munich','away_team':'Dortmund','is_result':True,'has_data':True},
          {'game_id':702,'date':'2026-10-02T19:00:00Z','home_team':'Bayern Munich','away_team':'Dortmund','is_result':True,'has_data':True},
          {'game_id':703,'date':'2026-10-03T19:00:00Z','home_team':'Bayern Munich','away_team':'Dortmund','is_result':False,'has_data':True}]
class FakeUnderstat:
    def __init__(self,leagues,seasons):pass
    def read_schedule(self,include_matches_without_data=False):return pd.DataFrame(fixtures)
    def read_player_match_stats(self,match_id):
        return pd.DataFrame([{'player':'Harry Kane','player_id':77,'team':'Bayern Munich','xG':.8,'xA':.1,
                              'xGChain':1.5,'shots':3,'minutes':90}])
fake=SimpleNamespace(Understat=FakeUnderstat)
with TemporaryDirectory() as tmp:
    state=Path(tmp)/'cursor.json'
    args=SimpleNamespace(source='understat',dataset='player_match',league='GER-Bundesliga',
        season='2026/2027',from_date='2026-07-01',until='2026-11-06',max_games=1,
        max_rows=400,stat_type=None,pause=1,send=True,state_file=str(state))
    first=list(bridge.source_records(fake,args))
    assert first[-1]['__end_game__'].endswith(':701')
    assert first[0]['stats']['xg']==.8 and first[0]['stats']['xgChain']==1.5
    assert first[0]['meta']['isFinal']
    state.write_text(json.dumps({'completed':[first[-1]['__end_game__']]}),'utf-8')
    second=list(bridge.source_records(fake,args))
    assert second[-1]['__end_game__'].endswith(':702')
    state.write_text(json.dumps({'completed':[first[-1]['__end_game__'],second[-1]['__end_game__']]}),'utf-8')
    third=list(bridge.source_records(fake,args))
    assert third==[], 'Only FINAL games: 703 never imported, 701/702 completed'
print('V4.5.16 Python SoccerData adapter: xG/xA/xGChain, confirmed FINAL, persistent cursor passed')
