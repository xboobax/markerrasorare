/** V4.5.15 isolated stat storage; never reads or modifies forecast tables. */
import {neon} from '@neondatabase/serverless';
import type {FootballStatsProvider,FootballMatchStats,FootballOfficialScore,FootballProfileRow} from './football-stats-v4515';
import {normalizeStatsRows,normalizedName,verifiedProfileMatches} from './football-stats-v4515';
import {sorareNameKey} from './football-live-sorare';
import {verifiedIdentityProposals} from './football-identity-reconcile-v45161';
const db=()=>{const d=process.env.DATABASE_URL;if(!d)throw new Error('DATABASE_URL fehlt');return neon(d);};
const sql=(text:string,params:unknown[]=[])=>db().query(text,params as any[],{fetchOptions:{cache:'no-store'}});
export const footballStatsDbReady=()=>Boolean(process.env.DATABASE_URL);
/** One SQL request for up to 250 player rows; retries are idempotent. */
export async function saveFootballMatchStats(source:FootballStatsProvider,raw:FootballMatchStats[]):Promise<number>{
  const rows=normalizeStatsRows(raw,source);
  if(!rows.length)return 0;
  const input=rows.map(r=>({source:r.source,source_game_id:r.sourceGameId,source_player_id:r.sourcePlayerId,
    player_name:r.playerName,team:r.team,opponent:r.opponent,competition:r.competition,
    fixture_start:r.fixtureStart,season:r.season,position:r.position,started:r.started,
    minutes:r.minutes,stats:r.stats,reported_fields:r.reportedFields}));
  const result=await sql(`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS row (
      source text, source_game_id text, source_player_id text, player_name text,
      team text, opponent text, competition text, fixture_start timestamptz,
      season text, position text, started boolean, minutes numeric,stats jsonb,reported_fields jsonb)
  ) INSERT INTO football_stats_v4515_player_matches AS existing
    (source,source_game_id,source_player_id,player_name,team,opponent,competition,
     fixture_start,season,position,started,minutes,stats,reported_fields)
    SELECT source,source_game_id,source_player_id,player_name,team,opponent,
      competition,fixture_start,season,position,started,minutes,stats,reported_fields FROM incoming WHERE TRUE
    ON CONFLICT(source,source_game_id,source_player_id) DO UPDATE SET
      player_name=EXCLUDED.player_name, team=EXCLUDED.team, opponent=EXCLUDED.opponent,
      season=COALESCE(EXCLUDED.season,existing.season),
      position=COALESCE(EXCLUDED.position,existing.position),
      started=COALESCE(EXCLUDED.started,existing.started),
      minutes=COALESCE(EXCLUDED.minutes,existing.minutes),
      stats=existing.stats||EXCLUDED.stats,
      reported_fields=(SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements(existing.reported_fields||EXCLUDED.reported_fields) AS v(value)),
      ingested_at=NOW() RETURNING source`,[JSON.stringify(input)]);
  return result.length;
}
export async function saveOfficialFootballScores(scores:FootballOfficialScore[]):Promise<number>{
  const seen=new Set<string>();const rows=scores.filter(s=>{
    if(!s.scoreId||seen.has(s.scoreId)||!/^[a-z0-9-]+$/.test(s.slug)||
      !Number.isFinite(Date.parse(s.date))||!Number.isFinite(s.score)||s.score<0||s.score>100)return false;
    seen.add(s.scoreId);return true;
  }).slice(0,180);
  if(!rows.length)return 0;
  const input=rows.map(s=>({sorare_score_id:s.scoreId,sorare_slug:s.slug,player_name:s.playerName,
    sorare_game_id:s.gameId,fixture_start:s.date,competition:s.competition,home:s.home,away:s.away,
    team:s.team,player_score:s.score,decisive_score:s.decisive,all_around_score:s.allAround,
    scoring_version:s.scoringVersion,official_stats:s.stats,breakdown:s.breakdown}));
  const inserted=await sql(`WITH incoming AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS row (
    sorare_score_id text,sorare_slug text,player_name text,sorare_game_id text,fixture_start timestamptz,
    competition text,home text,away text,team text,player_score numeric,decisive_score numeric,
    all_around_score numeric,scoring_version integer,official_stats jsonb,breakdown jsonb))
    INSERT INTO football_stats_v4515_sorare_scores AS old
    (sorare_score_id,sorare_slug,player_name,sorare_game_id,fixture_start,competition,home,away,
     team,player_score,decisive_score,all_around_score,scoring_version,official_stats,breakdown)
    SELECT sorare_score_id,sorare_slug,player_name,sorare_game_id,fixture_start,competition,home,away,
     team,player_score,decisive_score,all_around_score,scoring_version,official_stats,breakdown FROM incoming WHERE TRUE
    ON CONFLICT(sorare_score_id) DO UPDATE SET
      player_score=EXCLUDED.player_score,decisive_score=EXCLUDED.decisive_score,
      all_around_score=EXCLUDED.all_around_score,scoring_version=EXCLUDED.scoring_version,
      official_stats=old.official_stats||EXCLUDED.official_stats,
      breakdown=CASE WHEN jsonb_array_length(EXCLUDED.breakdown)>jsonb_array_length(old.breakdown) THEN EXCLUDED.breakdown ELSE old.breakdown END,
      ingested_at=NOW() RETURNING sorare_score_id`,[JSON.stringify(input)]);
  return inserted.length;
}
/** Only create identity links when the same FINAL game, source player and team are unambiguous. */
export async function linkFootballByOfficialGame(scores:FootballOfficialScore[]):Promise<number>{
  let linked=0;
  // Bounded by cron size. No name-based cross-match without a matching game and team.
  for(const score of scores.filter(s=>Boolean(s.team)).slice(0,16)){
    if(!score.team||normalizedName(score.playerName).length<5)continue;
    const candidates=await sql(`SELECT source,source_game_id,source_player_id,player_name,team,opponent
      FROM football_stats_v4515_player_matches
      WHERE fixture_start BETWEEN $1::timestamptz-INTERVAL '3 hours' AND $1::timestamptz+INTERVAL '3 hours'
      AND lower(player_name)=lower($2) LIMIT 12`,[score.date,score.playerName]);
    const approved=candidates.filter((c:any)=>normalizedName(String(c.player_name))===normalizedName(score.playerName)&&
      sorareNameKey(String(c.team))===sorareNameKey(score.team!)&&
      [score.home,score.away].some(x=>sorareNameKey(x)===sorareNameKey(String(c.opponent)))&&
      sorareNameKey(String(c.opponent))!==sorareNameKey(String(c.team)));
    const perProvider=new Map<string,any[]>();
    for(const row of approved){const key=String(row.source);perProvider.set(key,[...(perProvider.get(key)??[]),row]);}
    for(const matches of perProvider.values()){
      if(matches.length!==1)continue;
      const match=matches[0];const proof=`verified_sorare_final_game:${score.gameId}`;
      const saved=await sql(`INSERT INTO football_stats_v4515_identity_links AS identity
        (provider,provider_player_id,sorare_slug,evidence) VALUES($1,$2,$3,$4)
        ON CONFLICT(provider,provider_player_id) DO UPDATE SET
          evidence=EXCLUDED.evidence,confirmed_at=NOW()
        WHERE identity.sorare_slug=EXCLUDED.sorare_slug
        RETURNING provider`,[match.source,match.source_player_id,score.slug,proof]);
      if(saved.length){
        await sql(`UPDATE football_stats_v4515_player_matches SET sorare_slug=$3,identity_evidence=$4
          WHERE source=$1 AND source_player_id=$2 AND (sorare_slug IS NULL OR sorare_slug=$3)`,
          [match.source,match.source_player_id,score.slug,proof]);linked++;
      }
    }
  }
  return linked;
}
const iso=(v:unknown)=>new Date(String(v)).toISOString();
const num=(x:unknown)=>x===null||x===undefined?null:Number(x);
export async function readFootballProfile(slug:string,name:string,team:string,limit=120):Promise<{
  matches:FootballProfileRow[];official:FootballOfficialScore[];linkedProviders:string[]}>{
  const rows=await sql(`SELECT source,source_game_id,source_player_id,player_name,team,opponent,
    competition,fixture_start,season,minutes,started,stats,reported_fields
    FROM football_stats_v4515_player_matches
    WHERE sorare_slug=$1 OR lower(player_name)=lower($2)
       OR (source,source_player_id) IN (SELECT provider,provider_player_id FROM football_stats_v4515_identity_links WHERE sorare_slug=$1)
    ORDER BY fixture_start DESC LIMIT 360`,[slug,name]);
  const identities=await sql(`SELECT provider,provider_player_id FROM football_stats_v4515_identity_links WHERE sorare_slug=$1`,[slug]);
  const linkedIds=new Set<string>(identities.map((r:any)=>`${String(r.provider)}:${String(r.provider_player_id)}`));
  const approved=verifiedProfileMatches(rows.map((r:any)=>({
    ...r,sourcePlayerId:String(r.source_player_id),playerName:String(r.player_name),team:String(r.team)
  })),name,team,linkedIds);
  const matches:FootballProfileRow[]=approved.slice(0,limit).map((r:any)=>({
    source:r.source,sourceGameId:String(r.source_game_id),sourcePlayerId:String(r.source_player_id),
    date:iso(r.fixture_start),competition:String(r.competition),team:String(r.team),opponent:String(r.opponent),
    season:r.season?String(r.season):null,minutes:num(r.minutes),started:r.started===null?null:Boolean(r.started),
    stats:r.stats||{},reportedFields:r.reported_fields||[]}));
  const scoreRows=await sql(`SELECT * FROM football_stats_v4515_sorare_scores WHERE sorare_slug=$1 ORDER BY fixture_start DESC LIMIT 40`,[slug]);
  const official:FootballOfficialScore[]=scoreRows.map((r:any)=>({
    scoreId:String(r.sorare_score_id),slug:String(r.sorare_slug),playerName:String(r.player_name),
    gameId:String(r.sorare_game_id),date:iso(r.fixture_start),competition:String(r.competition),
    home:String(r.home),away:String(r.away),team:r.team?String(r.team):null,score:Number(r.player_score),
    decisive:num(r.decisive_score),allAround:num(r.all_around_score),scoringVersion:num(r.scoring_version),
    stats:r.official_stats||{},breakdown:r.breakdown||[]}));
  return {matches,official,linkedProviders:[...new Set<string>(identities.map((r:any)=>String(r.provider)))]};
}
export async function footballStatsDiagnostic(){
  const data=await sql(`SELECT source,count(*)::integer AS rows,count(DISTINCT source_game_id)::integer AS games,
    count(DISTINCT source_player_id)::integer AS players,
    count(*) FILTER(WHERE minutes IS NOT NULL)::integer AS with_minutes,
    count(*) FILTER(WHERE stats ? 'xg')::integer AS with_xg,
    count(*) FILTER(WHERE stats ? 'xa')::integer AS with_xa,
    count(*) FILTER(WHERE sorare_slug IS NOT NULL)::integer AS linked,
    max(fixture_start) AS newest_match,max(ingested_at) AS last_import
    FROM football_stats_v4515_player_matches GROUP BY source ORDER BY source`);
  const official=await sql(`SELECT count(*)::integer AS rows,count(DISTINCT sorare_slug)::integer AS players,
    count(*) FILTER(WHERE official_stats ? 'minsPlayed')::integer AS with_minutes,
    count(*) FILTER(WHERE all_around_score IS NOT NULL)::integer AS with_aa,
    count(*) FILTER(WHERE decisive_score IS NOT NULL)::integer AS with_decisive,
    max(fixture_start) AS newest_match,max(ingested_at) AS last_import
    FROM football_stats_v4515_sorare_scores`);
  const links=await sql(`SELECT provider,count(*)::integer AS count FROM football_stats_v4515_identity_links GROUP BY provider`);
  const jobs=await sql(`SELECT scope,at,ok,message,count FROM learning_v44_jobs
    WHERE scope LIKE 'v4515:%' OR scope LIKE 'v45161:%' OR scope LIKE 'v45:stats:football-%' ORDER BY at DESC LIMIT 15`);
  const fmt=(r:any)=>({...r,newest_match:r.newest_match?iso(r.newest_match):null,last_import:r.last_import?iso(r.last_import):null});
  return {sourceStats:data.map(fmt),officialScores:fmt(official[0]??{}),verifiedLinks:links,
    jobs:jobs.map((x:any)=>({...x,at:iso(x.at)})),predictionModelChanged:false};
}
export async function scoreSyncCandidates():Promise<string[]>{
  const rows=await sql(`SELECT player_id,MAX(fixture_day) AS last_day FROM learning_v44_snapshots
    WHERE sport='football' AND fixture_day BETWEEN CURRENT_DATE-INTERVAL '180 days' AND CURRENT_DATE+INTERVAL '45 days'
    GROUP BY player_id ORDER BY MAX(fixture_day) DESC LIMIT 1800`);
  return rows.map((r:any)=>String(r.player_id)).filter(s=>/^[a-z0-9-]{2,130}$/.test(s));
}
export async function getFootballScoreCursor(scope:string):Promise<number>{
  const found=await sql(`SELECT next_offset FROM football_stats_v4515_import_cursor WHERE scope=$1`,[scope]);
  return found.length?Number(found[0].next_offset):0;
}
export async function setFootballScoreCursor(scope:string,offset:number,message:string){
  await sql(`INSERT INTO football_stats_v4515_import_cursor(scope,next_offset,last_run,last_status)
    VALUES($1,$2,NOW(),$3) ON CONFLICT(scope) DO UPDATE
    SET next_offset=EXCLUDED.next_offset,last_run=NOW(),last_status=EXCLUDED.last_status`,
    [scope,offset,message.slice(0,300)]);
}

/** V4.5.16.1: replay identity matching over existing FINAL Sorare scores.
 * Batch access + persistent cursor avoid large/slow serverless requests. */
export async function reconcileArchivedFootballScores(pageSize=40):Promise<{
  processed:number;possibleCandidates:number;verifiedIdentities:number;linkedRows:number;
  nextOffset:number;cycleComplete:boolean;message:string}>{
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>60)throw new Error('Ungültige Reconciliation-Seitengröße');
  const scope='v45161:reconcile';
  const offset=await getFootballScoreCursor(scope);
  const scoreRows=await sql(`SELECT sorare_score_id,sorare_slug,player_name,sorare_game_id,
      fixture_start,home,away,team FROM football_stats_v4515_sorare_scores
      WHERE score_status='FINAL'
      ORDER BY fixture_start DESC,sorare_score_id DESC OFFSET $1 LIMIT $2`,[offset,pageSize]);
  if(!scoreRows.length){await setFootballScoreCursor(scope,0,'Archivende: nächster Durchlauf beginnt von vorne');
    return {processed:0,possibleCandidates:0,verifiedIdentities:0,linkedRows:0,
      nextOffset:0,cycleComplete:true,message:'Keine weiteren FINAL-Scores; Neustart am Archivanfang'};}
  const scores=scoreRows.map((r:any)=>({scoreId:String(r.sorare_score_id),slug:String(r.sorare_slug),
    playerName:String(r.player_name),gameId:String(r.sorare_game_id),date:iso(r.fixture_start),
    home:String(r.home),away:String(r.away),team:r.team?String(r.team):null}));
  // Match ESPN names and fixture dates in SQL; verify both clubs, opponents,
  // source match uniqueness and player IDs in pure deterministic TypeScript.
  const candidates=await sql(`WITH score_input AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x
      (score_id text,player_name text,fixture_start timestamptz)
  ) SELECT s.score_id,e.source,e.source_game_id,e.source_player_id,
      e.player_name,e.team,e.opponent,e.fixture_start
    FROM score_input s JOIN football_stats_v4515_player_matches e
      ON lower(e.player_name)=lower(s.player_name)
     AND e.fixture_start BETWEEN s.fixture_start-INTERVAL '3 hours'
                             AND s.fixture_start+INTERVAL '3 hours'
    WHERE e.source IN ('espn','understat')`,[JSON.stringify(scores.map(s=>({
      score_id:s.scoreId,player_name:s.playerName,fixture_start:s.date})))]);
  const proposals=verifiedIdentityProposals(scores,candidates.map((r:any)=>({
    scoreId:String(r.score_id),source:String(r.source),sourceGameId:String(r.source_game_id),
    sourcePlayerId:String(r.source_player_id),playerName:String(r.player_name),
    team:String(r.team),opponent:String(r.opponent),date:iso(r.fixture_start)})));
  // Never replace or silently add a conflicting provider-to-Sorare mapping.
  // A single slug may not silently accumulate different IDs from one provider.
  let verifiedIdentities=0,linkedRows=0;
  if(proposals.length){
    const existing=await sql(`WITH proposed AS (SELECT * FROM jsonb_to_recordset($1::jsonb)
      AS p(provider text,provider_player_id text,sorare_slug text))
      SELECT DISTINCT l.provider,l.provider_player_id,l.sorare_slug
      FROM football_stats_v4515_identity_links l JOIN proposed p
      ON l.provider=p.provider AND
        (l.provider_player_id=p.provider_player_id OR l.sorare_slug=p.sorare_slug)`,
      [JSON.stringify(proposals.map(p=>({provider:p.provider,provider_player_id:p.providerPlayerId,
        sorare_slug:p.sorareSlug})))]);
    const approved=proposals.filter(p=>!existing.some((r:any)=>String(r.provider)===p.provider&&
      ((String(r.provider_player_id)===p.providerPlayerId&&String(r.sorare_slug)!==p.sorareSlug)||
      (String(r.sorare_slug)===p.sorareSlug&&String(r.provider_player_id)!==p.providerPlayerId))));
    if(approved.length){
      const input=approved.map(p=>({provider:p.provider,provider_player_id:p.providerPlayerId,
        sorare_slug:p.sorareSlug,evidence:`verified_sorare_final_archive:${p.sorareGameId}`}));
      const persisted=await sql(`WITH proposed AS (SELECT * FROM jsonb_to_recordset($1::jsonb)
        AS p(provider text,provider_player_id text,sorare_slug text,evidence text))
        INSERT INTO football_stats_v4515_identity_links AS current_link
          (provider,provider_player_id,sorare_slug,evidence)
        SELECT provider,provider_player_id,sorare_slug,evidence FROM proposed WHERE TRUE
        ON CONFLICT(provider,provider_player_id) DO UPDATE SET
          evidence=EXCLUDED.evidence,confirmed_at=NOW()
        WHERE current_link.sorare_slug=EXCLUDED.sorare_slug
        RETURNING provider,provider_player_id,sorare_slug,evidence`,[JSON.stringify(input)]);
      verifiedIdentities=persisted.length;
      if(persisted.length){
        const updated=await sql(`WITH confirmed AS (SELECT * FROM jsonb_to_recordset($1::jsonb)
          AS p(provider text,provider_player_id text,sorare_slug text,evidence text))
          UPDATE football_stats_v4515_player_matches e SET
            sorare_slug=p.sorare_slug,identity_evidence=p.evidence
          FROM confirmed p
          WHERE e.source=p.provider AND e.source_player_id=p.provider_player_id
            AND (e.sorare_slug IS NULL OR e.sorare_slug=p.sorare_slug)
          RETURNING e.source_game_id`,[JSON.stringify(persisted)]);
        linkedRows=updated.length;
      }
    }
  }
  const nextOffset=scoreRows.length<pageSize?0:offset+scoreRows.length;
  const cycleComplete=scoreRows.length<pageSize;
  const message=`Archivabgleich: ${scores.length} FINAL-Scores, ${candidates.length} mögliche ESPN/Understat-Treffer, `+
    `${verifiedIdentities} verifizierte Spieler-IDs, ${linkedRows} Statistikzeilen zugeordnet; `+
    `${cycleComplete?'Durchlauf beendet':'Fortsetzung ab Offset '+nextOffset}`;
  await setFootballScoreCursor(scope,nextOffset,message);
  return {processed:scores.length,possibleCandidates:candidates.length,verifiedIdentities,
    linkedRows,nextOffset,cycleComplete,message};
}
