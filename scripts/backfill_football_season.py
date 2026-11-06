#!/usr/bin/env python3
"""Authenticated resumable ESPN FINAL historical backfill, default 2026/27 season.

Does NOT call SoccerData (use import_soccerdata_all.py for that) and never changes
forecast scores/weights. Dry-run by default. Run on your own computer; requires
V4.5.16 deployed and CRON_SECRET from Vercel configured as an ENV variable.

Windows PowerShell:
  $env:FOOTBALL_STATS_BASE_URL='https://YOUR-PROJECT.vercel.app'
  $env:CRON_SECRET='[secret value in Vercel]'
  python scripts/backfill_football_season.py --from 2026-07-01 --until 2026-11-06 --send

You can rerun: the checkpoint and the Neon UPSERTs prevent duplicate performance
rows. Stop with Ctrl+C; the next run resumes from the last acknowledged page.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BATCHES=['league-a','league-b','europe','national-0','national-1','national-2','national-3']

def main():
    ap=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from',dest='start',default='2026-07-01')
    ap.add_argument('--until',default=dt.date.today().isoformat())
    ap.add_argument('--batches',default=','.join(BATCHES),help='Comma-separated subsets')
    ap.add_argument('--days',type=int,default=3,help='Days per fetch, 1..3')
    ap.add_argument('--page-size',type=int,default=8,help='FINAL games per page, 1..8')
    ap.add_argument('--pause',type=float,default=2.,help='Min pause between requests')
    ap.add_argument('--state-file',default='.football-backfill-v4516-progress.json')
    ap.add_argument('--send',action='store_true')
    args=ap.parse_args()
    try:begin=dt.date.fromisoformat(args.start);end=dt.date.fromisoformat(args.until)
    except ValueError:ap.error('YYYY-MM-DD dates required')
    if begin>end or end>dt.date.today():ap.error('Invalid/future date window')
    if args.days not in (1,2,3) or not 1<=args.page_size<=8 or args.pause<1:ap.error('Invalid limits')
    batches=[x.strip() for x in args.batches.split(',')]
    if not batches or any(x not in BATCHES for x in batches):ap.error('Invalid batch')
    base=os.getenv('FOOTBALL_STATS_BASE_URL','').rstrip('/')
    secret=os.getenv('CRON_SECRET','')
    if args.send and (not base.startswith('https://') or not secret):
        ap.error('Set HTTPS FOOTBALL_STATS_BASE_URL and CRON_SECRET (do not commit them)')
    checkpoint=Path(args.state_file)
    try:progress=json.loads(checkpoint.read_text('utf-8')) if checkpoint.exists() else {}
    except (ValueError,OSError):progress={}
    date=begin;calls=0;saved=0
    while date<=end:
        window_days=min(args.days,(end-date).days+1)
        for batch in batches:
            task=f'{date.isoformat()}:{window_days}:{batch}'
            offset=int(progress.get(task,0))
            if offset==-1:continue
            while True:
                query=urllib.parse.urlencode({'job':'backfill','batch':batch,
                   'from':date.isoformat(),'days':window_days,'offset':offset,'maxGames':args.page_size})
                url=base+'/api/cron/v4515?'+query if args.send else '/api/cron/v4515?'+query
                if not args.send:
                    print('DRY RUN:',url)
                    break
                req=urllib.request.Request(url,headers={'Authorization':'Bearer '+secret})
                try:
                    with urllib.request.urlopen(req,timeout=55) as response:
                        result=json.loads(response.read().decode('utf-8'))
                        if response.status!=200:raise RuntimeError('HTTP '+str(response.status))
                except (urllib.error.HTTPError,urllib.error.URLError,ValueError) as e:
                    print('Stopped; resume is safe: '+str(e),file=sys.stderr);return 1
                calls+=1;saved+=result.get('saved',0)
                print(f'{date} {batch} page {offset}: {result.get("games")} matches, '
                      f'{result.get("saved")} rows, {result.get("failures")} errors',flush=True)
                # If a game details request failed, retry page on next execution;
                # upserts make replay safe, not skip the failed match.
                if result.get('failures',0):
                    print('ESPN fetch errors, checkpoint unchanged for retry',file=sys.stderr)
                    return 2
                next_offset=result.get('nextOffset')
                progress[task]=int(next_offset) if next_offset is not None else -1
                tmp=checkpoint.with_suffix('.tmp');tmp.write_text(json.dumps(progress,indent=2),'utf-8');tmp.replace(checkpoint)
                if next_offset is None:break
                offset=int(next_offset)
                time.sleep(args.pause)
            time.sleep(args.pause if args.send else 0)
        date+=dt.timedelta(days=window_days)
    print(f'Completed mode={"UPLOAD" if args.send else "DRY RUN"} requests={calls} saved rows={saved}')
    return 0

if __name__=='__main__':raise SystemExit(main())
