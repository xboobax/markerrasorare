#!/usr/bin/env python3
"""Single, authorized SoccerData/Understat availability check. No uploads.

Only inspects whether the installed library can read the league/season catalogue.
Does not use proxies, browser spoofing, or bypass access controls.
"""
from __future__ import annotations
import argparse
import json
import sys
import urllib.error


def check_source(factory, league: str, season: str):
    """Return (exit code, explanation). A successful check imports NO player stats."""
    try:
        reader = factory(leagues=[league], seasons=[season], no_cache=True)
        result = reader.read_seasons()
        count = len(result)
        if count < 1:
            return 4, f'NO_SEASON_DATA: {league} {season} is not present in the provider catalogue.'
        return 0, f'SOURCE_CHECK_OK: {league} {season}; seasons_found={count}. No data uploaded.'
    except (json.JSONDecodeError, UnicodeDecodeError):
        return 3, ('SOURCE_UNAVAILABLE: Understat response is not valid JSON (empty, HTML or changed format). '
                   'Access from this GitHub runner is not verified; stop rather than bypass restrictions.')
    except KeyError:
        return 3, ('SOURCE_UNAVAILABLE: Understat returned an unexpected data structure. '
                   'The installed SoccerData version may not match its provider.')
    except (urllib.error.URLError, ConnectionError, TimeoutError) as exc:
        return 3, f'SOURCE_UNAVAILABLE: Transport failed ({type(exc).__name__}). Do not bypass blocked access.'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--league',default='GER-Bundesliga')
    parser.add_argument('--season',default='2026/2027')
    parser.add_argument('--permission-confirmed',action='store_true')
    args=parser.parse_args()
    if not args.permission_confirmed:
        parser.error('Confirm permitted automated provider access before running a source check')
    try:
        import soccerdata as sd
    except ImportError:
        parser.error('SoccerData is not installed on the runner')
    status, message=check_source(sd.Understat,args.league,args.season)
    print(message,flush=True)
    return status

if __name__=='__main__':sys.exit(main())
