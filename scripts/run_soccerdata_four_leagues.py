#!/usr/bin/env python3
"""Explicit opt-in four-league SoccerData/Understat import runner for GitHub Actions.

Requires separately checked rights for the underlying data (not just Apache-2.0).
Uses existing source bridge; does not change forecasts or card scores.
Without --send it previews real source records but does not upload anything.
"""
from __future__ import annotations
import argparse
import datetime as dt
import os
from pathlib import Path
import subprocess
import sys

LEAGUES = ('GER-Bundesliga', 'ENG-Premier League', 'ESP-La Liga', 'FRA-Ligue 1')
DATASETS = ('player_season', 'player_match', 'shot_event')

def planned_commands(args, python=sys.executable):
    bridge = Path(__file__).with_name('import_soccerdata_all.py')
    for league in LEAGUES:
        for dataset in DATASETS:
            cmd = [python, str(bridge), '--source', 'understat', '--dataset', dataset,
                   '--league', league, '--season', '2026/2027', '--from', args.from_date,
                   '--until', args.until, '--permission-confirmed', '--max-games',
                   str(args.max_games), '--max-rows', str(args.max_rows),
                   '--state-file', '.soccerdata-v4516-progress.json', '--pause', '2.5']
            if args.send:
                cmd.append('--send')
            yield league, dataset, cmd

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from', dest='from_date', default='2026-07-01')
    parser.add_argument('--until', default=dt.date.today().isoformat())
    parser.add_argument('--max-games', type=int, default=3)
    parser.add_argument('--max-rows', type=int, default=1500)
    parser.add_argument('--send', action='store_true')
    parser.add_argument('--permission-confirmed', action='store_true')
    args=parser.parse_args()
    try:
        begin=dt.date.fromisoformat(args.from_date)
        end=dt.date.fromisoformat(args.until)
    except ValueError:
        parser.error('Dates must be YYYY-MM-DD')
    if end < begin or end > dt.date.today():
        parser.error('Invalid date range')
    if not (1 <= args.max_games <= 10 and 1 <= args.max_rows <= 5000):
        parser.error('max-games must be 1..10, max-rows 1..5000')
    if not args.permission_confirmed:
        parser.error('Source rights for automated Understat access/storage must first be confirmed')
    if args.send and (not os.getenv('FOOTBALL_STATS_URL','').startswith('https://') or not os.getenv('CRON_SECRET')):
        parser.error('Upload needs HTTPS FOOTBALL_STATS_URL and CRON_SECRET')
    success = 0
    for league, dataset, cmd in planned_commands(args):
        print(f'SOCCERDATA {league} / {dataset}: {"UPLOAD" if args.send else "DRY RUN"}', flush=True)
        result=subprocess.run(cmd, check=False)
        if result.returncode:
            if result.returncode == 3:
                print(
                    'SOURCE_UNAVAILABLE: Understat could not provide valid data from this GitHub runner. '
                    'Remaining league/dataset requests were NOT started to avoid repeated requests. '
                    'No upload is claimed. See the source-check job for details.',
                    file=sys.stderr, flush=True,
                )
            else:
                print(f'STOPPED {league} / {dataset}: exit code {result.returncode}; subsequent imports not started', file=sys.stderr, flush=True)
            return result.returncode
        success += 1
    print(f'COMPLETED: {success} source/dataset jobs; mode={"UPLOAD" if args.send else "DRY RUN"}',flush=True)
    return 0

if __name__=='__main__':
    sys.exit(main())
