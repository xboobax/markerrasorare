#!/usr/bin/env python3
"""Reconcile already archived ESPN/Understat rows to official Sorare FINAL games.

Uses an authenticated Vercel endpoint; no database credentials, no local Python
required if run through GitHub Actions. Dry-run by default. Safe to rerun.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--send', action='store_true', help='Actually run the authenticated reconcile job')
    parser.add_argument('--max-pages', type=int, default=60)
    parser.add_argument('--page-size', type=int, default=40)
    parser.add_argument('--pause', type=float, default=1.5)
    args = parser.parse_args()
    if not 1 <= args.max_pages <= 100 or not 1 <= args.page_size <= 60 or args.pause < 1:
        parser.error('Invalid pagination limits')
    base = os.getenv('FOOTBALL_STATS_BASE_URL', '').strip().rstrip('/')
    secret = os.getenv('CRON_SECRET', '')
    endpoint = '/api/cron/v4515?' + urllib.parse.urlencode({'job': 'reconcile', 'pageSize': args.page_size})
    if not args.send:
        print('DRY RUN: Would reconcile archive using ' + endpoint)
        print('No requests and no database updates performed')
        return 0
    if not base.startswith('https://') or len(secret) < 16:
        parser.error('Set valid HTTPS FOOTBALL_STATS_BASE_URL and CRON_SECRET as GitHub repository secrets')
    total_scores = total_candidates = total_links = total_rows = 0
    for i in range(args.max_pages):
        request = urllib.request.Request(base + endpoint, headers={'Authorization': 'Bearer ' + secret,
                                                                   'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=55) as response:
                result = json.loads(response.read().decode('utf-8'))
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError) as error:
            print('Reconciliation stopped; progress remains stored in Neon: ' + type(error).__name__,
                  file=sys.stderr)
            return 2
        if not isinstance(result, dict) or not isinstance(result.get('processed'), int):
            print('Server did not return valid reconciliation status', file=sys.stderr)
            return 2
        total_scores += result['processed']
        total_candidates += int(result.get('possibleCandidates', 0))
        total_links += int(result.get('verifiedIdentities', 0))
        total_rows += int(result.get('linkedRows', 0))
        print(f'Page {i + 1}: {result["processed"]} FINAL-Scores, '
              f'{result.get("possibleCandidates", 0)} candidates, '
              f'{result.get("verifiedIdentities", 0)} verified identities, '
              f'{result.get("linkedRows", 0)} matched stat rows')
        if result.get('cycleComplete'):
            print(f'Completed mode=RECONCILE processed={total_scores} '
                  f'verified={total_links} linked rows={total_rows}')
            return 0
        time.sleep(args.pause)
    print('Paused at page limit. Run again to resume from the Neon cursor.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
