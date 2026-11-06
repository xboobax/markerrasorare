#!/usr/bin/env python3
"""V4.5.16 SoccerData source bridge (optional; never part of Vercel build).

- Use only for sources you have independently confirmed permit YOUR intended automated access,
  storage and use. The Apache license on soccerdata does not license provider data.
- DRY-RUN by default. --permission-confirmed is required even to fetch remotely.
- --input-json reads an already-authorized normalized JSON export, without fetching.
- --send uploads bounded POST batches to /api/cron/v4516/soccerdata (CRON_SECRET).
- Does not change forecasts, scoring or card bonuses.

Examples (personal machine):
  python -m pip install 'soccerdata==2026.43.0'
  python scripts/import_soccerdata_all.py --source understat --dataset player_match \
    --league GER-Bundesliga --season 2026/2027 --from 2026-07-01 \
    --max-games 3 --permission-confirmed
  # After reviewing dry-run output and source rights: add --send and env vars.

No bypasses, rotating proxies, retries for 403/429, anti-bot circumvention, or automatic
production scraping. Different providers have different data and access conditions.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

SOURCES = ('understat', 'fbref', 'soccerdata_espn', 'sofascore', 'whoscored',
           'matchhistory', 'clubelo', 'sofifa')
METHODS = {
  'understat': {'player_match': ('read_player_match_stats', None),
                'player_season': ('read_player_season_stats', None),
                'team_match': ('read_team_match_stats', None),
                'shot_event': ('read_shot_events', None)},
  'fbref': {'player_match': ('read_player_match_stats', 'summary'),
            'player_season': ('read_player_season_stats', 'standard'),
            'team_match': ('read_team_match_stats', 'shooting'),
            'team_season': ('read_team_season_stats', 'standard'),
            'lineup': ('read_lineup', None), 'match_event': ('read_events', None)},
  'soccerdata_espn': {'lineup': ('read_lineup', None), 'team_match': ('read_matchsheet', None),
                      'schedule': ('read_schedule', None)},
  'sofascore': {'team_season': ('read_league_table', None)},
  'whoscored': {'match_event': ('read_events', None),
                'lineup': ('read_missing_players', None), 'schedule': ('read_schedule', None)},
  'matchhistory': {'schedule': ('read_games', None)},
  'clubelo': {'team_rating': ('read_by_date', None)},
  'sofifa': {'player_rating': ('read_players', None)},
}
SEASON_PARAM = {'fbref': ('summary', 'keepers'), 'understat': ()}
MAP = {'xg': 'xg', 'expectedgoals': 'xg', 'xa':'xa', 'expectedassists':'xa',
       'xgchain':'xgChain', 'xgbuildup':'xgBuildup', 'npxg':'npxg',
       'keypasses':'keyPasses', 'shotsontarget':'shotsOnTarget',
       'minutes':'minutes', 'minsplayed':'minutes', 'yellowcards':'yellowCards',
       'redcards':'redCards', 'player_rating':'playerRating',
       'bigchancescreated':'bigChancesCreated', 'bigchancesmissed':'bigChancesMissed'}
META = {'league','season','game','gameid','matchid','date','time','team','opponent',
        'home','away','hometeam','awayteam','player','playerid','name','position',
        'minutes','started','starter','isresult','hasdata','score','status','week',
        'competition','match','result','fixture','formation','jerseynumber'}


def cleaned(value: Any) -> str:
    if value is None: return ''
    return str(value).strip()


def name_key(value: Any) -> str:
    return re.sub(r'[^a-z0-9]', '', cleaned(value).casefold())


def key(value: Any) -> str:
    parts = re.findall(r'[A-Za-z0-9]+', cleaned(value))
    if not parts: return ''
    word = parts[0].lower() + ''.join(p[:1].upper()+p[1:] for p in parts[1:])
    return MAP.get(re.sub(r'[^a-z0-9]', '', cleaned(value).lower()), word)[:75]


def numeric(value: Any):
    if isinstance(value, bool): return None
    try:
        result = float(value)
        return result if math.isfinite(result) and abs(result) <= 100000 else None
    except (TypeError, ValueError, OverflowError): return None


def plain(value: Any):
    if value is None: return None
    if isinstance(value, (int, float, str, bool)): return value
    if hasattr(value, 'isoformat'): return value.isoformat()
    if hasattr(value, 'item'):
        try: return plain(value.item())
        except (TypeError, ValueError): pass
    return cleaned(value)


def dataframes(result: Any):
    """Extract tabular objects without guessing source semantics."""
    if hasattr(result, 'reset_index') and hasattr(result, 'to_dict'):
        d = result.reset_index()
        if hasattr(d.columns, 'to_flat_index'):
            columns = []
            for c in d.columns.to_flat_index():
                if isinstance(c, tuple):
                    bits = [cleaned(v) for v in c if cleaned(v) and not cleaned(v).startswith('Unnamed')]
                    columns.append('_'.join(bits))
                else: columns.append(cleaned(c))
            d.columns = columns
        return d.to_dict('records')
    if isinstance(result, list): return result
    if isinstance(result, dict): return [result]
    return []


def field(row: dict, *names: str):
    flat = {name_key(k): plain(v) for k,v in row.items()}
    for name in names:
        if name_key(name) in flat:
            v = flat[name_key(name)]
            if v is not None and cleaned(v).lower() not in ('', 'nan', 'none', 'nat'):
                return v
    return None


def as_date(value: Any):
    if value is None: return None
    value = plain(value)
    text = cleaned(value)
    try:
        parsed = dt.datetime.fromisoformat(text.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            # Preserve assumed timezone as provenance metadata; don't claim verified offset.
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
            verified = False
        else: verified = True
        return parsed.astimezone(dt.timezone.utc).isoformat().replace('+00:00','Z'), verified
    except ValueError: return None


def confirmed_final(game: dict) -> bool:
    result = field(game, 'is_result')
    if isinstance(result, bool): return result
    state = cleaned(field(game,'status','match_status')).casefold()
    if state in ('final','finished','ft','full time','full-time'): return True
    if state in ('scheduled','in progress','live','postponed','cancelled'): return False
    score = cleaned(field(game, 'score'))
    return bool(re.fullmatch(r'\d+\s*[-–:]\s*\d+', score)) or (
        numeric(field(game,'home_score','home_goals')) is not None and
        numeric(field(game,'away_score','away_goals')) is not None)


def extract_stats(row: dict):
    stats = {}; metadata = {}
    for field_name, value in row.items():
        normalized = name_key(field_name)
        v = plain(value)
        if v is None or (isinstance(v,str) and v.lower() in ('','none','nan','nat')): continue
        stat_key = key(field_name)
        if not stat_key or not re.match(r'^[a-z][A-Za-z0-9]*$',stat_key): continue
        if normalized in META:
            if isinstance(v,(str,int,float,bool)) and len(cleaned(v))<=400:
                metadata[stat_key] = v
            continue
        number = numeric(v)
        if number is not None: stats[stat_key] = number
        elif isinstance(v, (str,bool)) and len(cleaned(v))<=400: metadata[stat_key] = v
    return dict(list(stats.items())[:170]), dict(list(metadata.items())[:110])


def stable_id(source: str, kind: str, row: dict, competition: str, season: str):
    index = (field(row, 'game_id','match_id','game','match'),
             field(row, 'player_id','player','name'),field(row,'team'),field(row,'date'))
    content = json.dumps([source,kind,competition,season,*map(cleaned,index),
                          sorted((cleaned(k), cleaned(plain(v))) for k,v in row.items())],
                         ensure_ascii=False,sort_keys=True)
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:44]


def normalize_record(source: str, kind: str, row: dict, league: str, season: str,
                     game: dict|None=None):
    game = game or {}
    stats, meta = extract_stats(row)
    game_id = field(row,'game_id','match_id','game') or field(game,'game_id','match_id','game')
    date_value = field(row,'date','match_date','kickoff') or field(game,'date','kickoff')
    parsed = as_date(date_value)
    team = cleaned(field(row, 'team','squad','club'))
    home = cleaned(field(game,'home_team','home'))
    away = cleaned(field(game,'away_team','away'))
    opponent = cleaned(field(row,'opponent'))
    if team and home and away and name_key(team) in (name_key(home),name_key(away)):
        opponent = away if name_key(team)==name_key(home) else home
    player = cleaned(field(row,'player','player_name','name'))
    player_id = cleaned(field(row,'player_id','athlete_id','person_id'))
    if not player_id: player_id = None  # Never invent a verified player identifier.
    if kind.startswith('player') and not player: return None
    if len(stats)==0 and len(meta)==0:return None
    # Store names for searchable real player profiles, without assuming provider identity.
    if kind=='player_match':
        meta['isFinal'] = bool(game and confirmed_final(game))
        meta['started'] = field(row,'is_starter','started','starter') if isinstance(field(row,'is_starter','started','starter'),bool) else None
        mins = numeric(field(row,'minutes','minutes_played','mins'))
        if mins is not None and 0<=mins<=150: meta['minutes']=mins
        meta['kickoffTimezoneVerified']=bool(parsed and parsed[1])
    if parsed and not parsed[1]: meta['kickoffTimezoneAssumedUTC']=True
    meta={k:v for k,v in meta.items() if v is not None}
    rec={'source':source,'kind':kind,'externalId':stable_id(source,kind,row,league,season),
         'playerId':player_id,'playerName':player or None,'team':team or None,
         'opponent':opponent or None,'competition':league,'season':season,
         'matchId':cleaned(game_id) or None,'fixtureStart':parsed[0] if parsed else None,
         'stats':stats,'meta':meta}
    return rec


def make_reader(sd:Any,source:str,league:str,season:str):
    names={'understat':'Understat','fbref':'FBref','soccerdata_espn':'ESPN',
           'sofascore':'Sofascore','whoscored':'WhoScored','matchhistory':'MatchHistory',
           'clubelo':'ClubElo','sofifa':'SoFIFA'}
    cls=getattr(sd,names[source]);
    if source=='clubelo': return cls()
    if source=='sofifa': return cls(leagues=[league],versions='latest')
    return cls(leagues=[league],seasons=[season])


def source_records(sd: Any,args):
    src=args.source; ds=args.dataset
    reader=make_reader(sd,src,args.league,args.season)
    method_name, stat_type=METHODS[src][ds]
    fn=getattr(reader,method_name)
    if src=='clubelo': result=fn(date=args.until)
    elif src=='fbref' and ds in ('player_season','team_season','team_match'):
        result=fn(stat_type=args.stat_type or stat_type)
    elif src=='fbref' and ds=='player_match':
        result=None  # Handled below per FINAL game.
    elif src=='sofascore': result=fn()
    elif src=='sofifa': result=fn()
    elif src=='matchhistory': result=fn()
    elif src=='understat' and ds in ('player_season','team_match'): result=fn()
    elif ds not in ('player_match','shot_event','match_event','lineup','team_match'):
        result=fn()
    else:result=None
    from_day=dt.date.fromisoformat(args.from_date)
    until_day=dt.date.fromisoformat(args.until)
    if result is not None:
        total=0
        for row in dataframes(result):
            parsed=as_date(field(row,'date','match_date','kickoff'))
            if parsed and not(from_day<=dt.date.fromisoformat(parsed[0][:10])<=until_day): continue
            rec=normalize_record(src,ds,row,args.league,args.season)
            if rec:
                yield rec;total+=1
                if total>=args.max_rows:break
        return
    if src=='understat':schedule=reader.read_schedule(include_matches_without_data=False)
    else:schedule=reader.read_schedule()
    games=[]
    for game in dataframes(schedule):
        parsed=as_date(field(game,'date','match_date','kickoff'))
        if not parsed or not(from_day<=dt.date.fromisoformat(parsed[0][:10])<=until_day):continue
        if not confirmed_final(game):continue
        game_id=field(game,'game_id','match_id','game')
        if not game_id: continue
        games.append((parsed[0],game_id,game))
    games.sort(key=lambda item:(item[0],cleaned(item[1])))
    # Checkpoint by date+game ID. If interrupted, already-acknowledged games are skipped.
    checkpoint=Path(args.state_file)
    try:completed=set(json.loads(checkpoint.read_text('utf-8')).get('completed',[])) if args.send and checkpoint.exists() else set()
    except (OSError,ValueError):completed=set()
    pending=[g for g in games if f'{src}:{ds}:{args.league}:{args.season}:{g[1]}' not in completed]
    selected=pending[:args.max_games]
    print(f'Confirmed FINAL games: {len(games)}, pending: {len(pending)}, processing: {len(selected)}',file=sys.stderr)
    for _,id_value,game in selected:
        key_token=f'{src}:{ds}:{args.league}:{args.season}:{id_value}'
        if key_token in completed:continue
        if args.source=='fbref' and ds=='player_match':
            content=fn(stat_type=args.stat_type or stat_type, match_id=id_value)
        elif args.source=='whoscored' and ds=='match_event':
            content=fn(match_id=id_value, live=False, output_fmt='events')
        else: content=fn(match_id=id_value)
        yielded=0
        for row in dataframes(content):
            rec=normalize_record(src,ds,row,args.league,args.season,game)
            if rec:
                yielded+=1;yield rec
                if yielded>=args.max_rows:break
        # Progress markers are written only after successful HTTP acknowledgments by caller.
        yield {'__end_game__':key_token}
        time.sleep(args.pause)


def send_batch(batch: list[dict], url: str, secret: str):
    if not batch:return 0
    body=json.dumps(batch,ensure_ascii=False,allow_nan=False).encode('utf-8')
    if len(body)>155000:
        raise ValueError('Batch size > 155KB; reduce --batch-size')
    req=urllib.request.Request(url,data=body,method='POST',headers={
        'Content-Type':'application/json','Authorization':'Bearer '+secret})
    with urllib.request.urlopen(req,timeout=30) as response:
        parsed=json.loads(response.read().decode('utf-8'))
        if response.status!=200 or parsed.get('received')!=len(batch):
            raise ValueError('Upload not acknowledged: '+str(parsed)[:400])
        print(f'POST {parsed.get("source")} records={parsed.get("saved")} FINAL matches={parsed.get("verifiedMatches")}')
        return parsed['saved']


def main():
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--source',choices=SOURCES,required=True)
    p.add_argument('--dataset',required=True)
    p.add_argument('--league',default='GER-Bundesliga')
    p.add_argument('--season',default='2026/2027')
    p.add_argument('--from',dest='from_date',default='2026-07-01')
    p.add_argument('--until',default=dt.date.today().isoformat())
    p.add_argument('--max-games',type=int,default=10)
    p.add_argument('--max-rows',type=int,default=1500)
    p.add_argument('--batch-size',type=int,default=40)
    p.add_argument('--pause',type=float,default=2.5)
    p.add_argument('--stat-type',default=None,help='FBref supported stat type (source-dependent)')
    p.add_argument('--state-file',default='.soccerdata-v4516-progress.json')
    p.add_argument('--output',default=None,help='Write normalized JSON lines for review')
    p.add_argument('--input-json',default=None,help='Read already authorized normalized JSON-array/JSONL')
    p.add_argument('--permission-confirmed',action='store_true')
    p.add_argument('--send',action='store_true')
    args=p.parse_args()
    if args.dataset not in METHODS[args.source]:p.error(f'For {args.source}, datasets: {", ".join(METHODS[args.source])}')
    if not(1<=args.max_games<=30 and 1<=args.max_rows<=5000 and 1<=args.batch_size<=60 and args.pause>=1):
        p.error('Max games 1..30, rows 1..5000, batch-size 1..60, pause >= 1s')
    if args.from_date>args.until:p.error('--from after --until')
    if not args.input_json and not args.permission_confirmed:
        p.error('Review source access and data-use conditions first; then add --permission-confirmed')
    url=os.getenv('FOOTBALL_STATS_URL','')
    secret=os.getenv('CRON_SECRET','')
    if args.send and (not url.startswith('https://') or not secret):
        p.error('--send needs HTTPS FOOTBALL_STATS_URL and CRON_SECRET in env')
    if args.input_json:
        raw=Path(args.input_json).read_text('utf-8').strip()
        items=json.loads(raw) if raw.startswith('[') else [json.loads(line) for line in raw.splitlines()]
        records=iter(items)
    else:
        try:import soccerdata as sd
        except ImportError:p.error('Install on your own machine: python -m pip install soccerdata==2026.43.0')
        records=source_records(sd,args)
    saved=0;seen=0;buffer=[];checkpoint=Path(args.state_file)
    completed=[]
    if checkpoint.exists():
        try:completed=json.loads(checkpoint.read_text('utf-8')).get('completed',[])
        except (OSError,ValueError):pass
    output=open(args.output,'w',encoding='utf-8') if args.output else None
    try:
        for record in records:
            if '__end_game__' in record:
                if args.send:
                    saved+=send_batch(buffer,url,secret);buffer=[]
                    completed.append(record['__end_game__'])
                    checkpoint.write_text(json.dumps({'completed':sorted(set(completed))},indent=2),'utf-8')
                continue
            if record.get('source')!=args.source or record.get('kind')!=args.dataset:
                raise ValueError('Record has unexpected source/kind')
            seen+=1
            if output:output.write(json.dumps(record,ensure_ascii=False,allow_nan=False)+'\n')
            if seen<=2:print('SAMPLE',json.dumps(record,ensure_ascii=False)[:900])
            buffer.append(record)
            if len(buffer)>=args.batch_size:
                if args.send:saved+=send_batch(buffer,url,secret)
                buffer=[]
            if seen>=args.max_rows:break
        if buffer and args.send:saved+=send_batch(buffer,url,secret)
    except (urllib.error.HTTPError,urllib.error.URLError) as exc:
        print(f'Import stopped on HTTP error (no restriction bypass): {exc}',file=sys.stderr)
        return 1
    finally:
        if output:output.close()
    print(f'Finished source={args.source} dataset={args.dataset}, records={seen}, saved={saved}, '
          f'mode={"UPLOAD" if args.send else "DRY RUN"}.')
    return 0

if __name__=='__main__':sys.exit(main())
