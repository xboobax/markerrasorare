#!/usr/bin/env python3
"""Optional licensed/authorized SoccerData -> V4.5.15 Understat match-stat importer.

Never runs as part of Next.js/Vercel build. Default is DRY RUN, no upload.
Only use where you have confirmed the source permits automated extraction/use.
Requires: pip install soccerdata (includes pandas).

Example:
  python scripts/import_soccerdata_understat.py --league GER-Bundesliga --season 2026/2027 --from 2026-11-01 --max-matches 2
  FOOTBALL_STATS_URL=https://<your-site>/api/cron/v4515/understat CRON_SECRET=... \
    python scripts/import_soccerdata_understat.py --league GER-Bundesliga --season 2026/2027 --from 2026-11-01 --max-matches 2 --send --permission-confirmed
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.request
from typing import Any

LEAGUES = ("ENG-Premier League", "GER-Bundesliga", "ESP-La Liga", "FRA-Ligue 1")
FIELDS = ("goals", "assists", "shots", "xg", "xa", "xg_chain", "xg_buildup", "key_passes",
          "yellow_cards", "red_cards", "own_goals")
REMAP = {"xg": "xg", "xa": "xa", "xg_chain": "xgChain", "xg_buildup": "xgBuildup",
         "key_passes": "keyPasses", "yellow_cards": "yellowCards", "red_cards": "redCards", "own_goals": "ownGoals"}

def clean_str(v: Any) -> str:
    return str(v).strip() if v is not None else ""

def as_number(v: Any):
    try:
        value = float(v)
        return value if value == value and 0 <= value <= 1000 and value != float('inf') else None
    except (ValueError, TypeError, OverflowError):
        return None

def normalize_time(value: Any) -> str:
    text = str(value)
    parsed = dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc).isoformat()

def build_rows(schedule: dict, players) -> list[dict]:
    if not bool(schedule.get("is_result")) or not bool(schedule.get("has_data")):
        return []
    home = clean_str(schedule.get("home_team"))
    away = clean_str(schedule.get("away_team"))
    match_id = clean_str(schedule.get("game_id"))
    if not home or not away or not match_id:
        return []
    rows = []
    for entry in players:
        team = clean_str(entry.get("team"))
        if team not in (home, away):
            continue  # no inferred opponent/team identity
        name = clean_str(entry.get("player"))
        player_id = clean_str(entry.get("player_id"))
        if len(name) < 2 or not player_id.isdigit():
            continue
        stats = {}
        for field in FIELDS:
            number = as_number(entry.get(field))
            if number is not None:
                stats[REMAP.get(field, field)] = number
        if not stats:
            continue
        minutes = as_number(entry.get("minutes"))
        rows.append(dict(sourceGameId=match_id, sourcePlayerId=player_id,
                         playerName=name, team=team, opponent=away if team == home else home,
                         competition=clean_str(schedule.get("league")), fixtureStart=normalize_time(schedule["date"]),
                         position=clean_str(entry.get("position")) or None,
                         minutes=minutes, season=clean_str(schedule.get("season")),
                         completed=True, stats=stats))
    return rows

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--league", required=True, choices=LEAGUES)
    parser.add_argument("--season", required=True, help="SoccerData season, e.g. 2026/2027")
    parser.add_argument("--from", dest="from_date", required=True, help="First game date YYYY-MM-DD")
    parser.add_argument("--until", help="Last game date (default today)")
    parser.add_argument("--max-matches", type=int, default=3)
    parser.add_argument("--send", action="store_true", help="Upload to protected Vercel endpoint")
    parser.add_argument("--permission-confirmed", action="store_true",
                        help="Explicit acknowledgment of source rights and access permission")
    args = parser.parse_args()
    if args.max_matches < 1 or args.max_matches > 15:
        parser.error("--max-matches must be 1..15 to keep calls bounded")
    if args.send and not args.permission_confirmed:
        parser.error("--send requires --permission-confirmed after reviewing source terms")
    if args.send and (not os.getenv("FOOTBALL_STATS_URL") or not os.getenv("CRON_SECRET")):
        parser.error("--send requires FOOTBALL_STATS_URL and CRON_SECRET")
    start = dt.date.fromisoformat(args.from_date)
    until = dt.date.fromisoformat(args.until) if args.until else dt.date.today()
    if until < start:
        parser.error("--until must be after --from")
    try:
        import soccerdata as sd
    except ImportError:
        print("Install optional dependency: pip install soccerdata", file=sys.stderr)
        return 2
    reader = sd.Understat(leagues=[args.league], seasons=[args.season])
    schedule_rows = reader.read_schedule(include_matches_without_data=False).reset_index().to_dict("records")
    games = [g for g in schedule_rows if g.get("game_id") is not None and bool(g.get("is_result"))
             and start <= dt.date.fromisoformat(str(g.get("date"))[:10]) <= until]
    games = sorted(games, key=lambda g: str(g.get("date")))[:args.max_matches]
    processed = 0
    for game in games:
        mid = int(game["game_id"])
        try:
            players = reader.read_player_match_stats(match_id=mid).reset_index().to_dict("records")
            rows = build_rows(game, players)
            if not rows:
                print(f"{mid}: 0 verified rows; skipped")
                continue
            print(f"{mid}: {len(rows)} players; xG samples={sum('xg' in p['stats'] for p in rows)}")
            if args.send:
                for offset in range(0, len(rows), 90):
                    body = json.dumps(rows[offset:offset+90], ensure_ascii=False).encode("utf-8")
                    req = urllib.request.Request(os.environ["FOOTBALL_STATS_URL"], data=body, method="POST",
                         headers={"Content-Type": "application/json",
                                  "Authorization": "Bearer " + os.environ["CRON_SECRET"]})
                    with urllib.request.urlopen(req, timeout=25) as response:
                        print(response.status, response.read().decode("utf-8")[:600])
            processed += len(rows)
        except Exception as exc:
            print(f"Match {mid} failed: {type(exc).__name__}", file=sys.stderr)
        time.sleep(1.2)
    print(f"Finished: {processed} validated player rows; mode={'UPLOAD' if args.send else 'DRY RUN (nothing uploaded)'}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
