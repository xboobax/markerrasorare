"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.footballLeagueKeys = exports.footballLeagueName = void 0;
exports.footballStatusFromEspn = footballStatusFromEspn;
exports.parseEspnFootballGame = parseEspnFootballGame;
exports.parseEspnFootballScoreboard = parseEspnFootballScoreboard;
exports.parseFootballStatMinutes = parseFootballStatMinutes;
exports.footballStatLine = footballStatLine;
exports.sorareFootballEstimate = sorareFootballEstimate;
exports.parseEspnFootballPlayers = parseEspnFootballPlayers;
exports.parseEspnFootballPlays = parseEspnFootballPlays;
exports.parseEspnFootballSummary = parseEspnFootballSummary;
const obj = (x) => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const arr = (x) => Array.isArray(x) ? x : [];
const str = (x) => typeof x === 'string' ? x.trim() : '';
const numeric = (x) => {
    if (typeof x === 'number')
        return Number.isFinite(x) ? x : null;
    if (typeof x === 'string' && x.trim() !== '') {
        const n = Number(x.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }
    return null;
};
const count = (x) => Math.max(0, numeric(x) ?? 0);
const validPhoto = (url) => typeof url === 'string' && /^https:\/\//.test(url) && url.length < 700 ? url : null;
const leagueNameByKey = {
    'eng.1': 'Premier League', 'esp.1': 'LaLiga', 'ger.1': 'Bundesliga', 'fra.1': 'Ligue 1'
};
const extractTeam = (competitor) => {
    const c = obj(competitor), team = obj(c.team);
    return { id: str(team.id), name: str(team.displayName) || str(team.name) || 'Team unbekannt', abbreviation: str(team.abbreviation) || str(team.shortDisplayName) || str(team.name).slice(0, 3).toUpperCase(), logo: validPhoto(team.logo) || validPhoto(arr(team.logos)[0]?.href), score: numeric(c.score) };
};
function footballStatusFromEspn(competition) {
    const state = obj(competition), status = obj(state.status), s = obj(status.type);
    const key = `${str(s.name)} ${str(s.state)} ${str(s.description)} ${str(s.detail)} ${str(s.shortDetail)}`.toLowerCase();
    if (s.completed === true || /final|full time|after extra time|penalties/.test(key))
        return 'final';
    if (/inprogress|in progress|in-progress|halftime|second half|first half|live/.test(key) || s.state === 'in')
        return 'live';
    if (/postpon|delay|cancel|suspend|abandon/.test(key))
        return 'delayed';
    return 'scheduled';
}
function parseEspnFootballGame(event, updatedAt, leagueKey) {
    const e = obj(event), comp = obj(arr(e.competitions)[0]);
    const competitors = arr(comp.competitors);
    const home = competitors.find(c => obj(c).homeAway === 'home'), away = competitors.find(c => obj(c).homeAway === 'away');
    const id = str(e.id);
    if (!/^\d{6,14}$/.test(id) || !home || !away)
        return null;
    const date = str(e.date) || str(comp.date);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date)))
        return null;
    const status = comp.status ?? e.status;
    const ty = obj(obj(status).type);
    const venue = obj(arr(comp.venue?.fullName ? [comp.venue] : arr(comp.venues))[0]);
    return { id, leagueKey, leagueName: leagueNameByKey[leagueKey], date, home: extractTeam(home), away: extractTeam(away), status: footballStatusFromEspn({ status }),
        statusText: str(ty.shortDetail) || str(ty.detail) || str(ty.description) || 'Termin', period: count(obj(status).period), clock: str(obj(status).displayClock), lastUpdated: updatedAt, venue: str(venue.fullName) || str(obj(comp.venue).fullName) || null };
}
function parseEspnFootballScoreboard(payload, updatedAt, leagueKey) {
    const events = arr(obj(payload).events);
    if (!Array.isArray(obj(payload).events))
        throw new Error('ESPN-Scoreboard ohne Spieleliste.');
    const seen = new Set();
    return events.map(e => parseEspnFootballGame(e, updatedAt, leagueKey)).filter((g) => { if (!g || seen.has(g.id))
        return false; seen.add(g.id); return true; }).sort((a, b) => a.date.localeCompare(b.date));
}
function parseFootballStatMinutes(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        return value;
    const s = str(value);
    if (!s || s === '--' || s === 'DNP')
        return null;
    const mm = s.match(/^(\d{1,3}):(\d\d)$/);
    if (mm)
        return Number(mm[1]) + Number(mm[2]) / 60;
    const quoted = s.match(/^(\d{1,3})(?:\+\d+)?'?$/);
    if (quoted)
        return Number(quoted[1]);
    const n = numeric(s);
    return n !== null && n >= 0 ? n : null;
}
const aliases = {
    minutes: ['MIN', 'MINUTES'], goals: ['G', 'GLS', 'GOALS'], assists: ['A', 'AST', 'ASSISTS'], shotsOnTarget: ['SOG', 'SOT', 'SHOTSONTARGET', 'SHOTS ON TARGET'], saves: ['SV', 'SAVES'], clearances: ['CLR', 'CLEARANCES'], tacklesWon: ['TCKL', 'TKL', 'TACKLES WON', 'TACKLES'], interceptions: ['INT', 'INTERCEPTIONS'], chancesCreated: ['CC', 'CHANCES CREATED'], crossesCompleted: ['CCR', 'CROSSES COMPLETED', 'ACCURATE CROSSES'], duelsWon: ['DW', 'DUELS WON'], foulsWon: ['FW', 'FOULS WON'], yellowCards: ['YC', 'YELLOW CARDS'], redCards: ['RC', 'RED CARDS'], ownGoals: ['OG', 'OWN GOALS'], goalsConceded: ['GC', 'GOALS CONCEDED'], penaltiesSaved: ['PS', 'PENS SAVED', 'PENALTIES SAVED'], penaltiesMissed: ['PM', 'PENS MISSED', 'PENALTIES MISSED']
};
const defaultFootballStats = () => ({ minutes: null, goals: 0, assists: 0, shotsOnTarget: 0, saves: 0, clearances: 0, tacklesWon: 0, interceptions: 0, chancesCreated: 0, crossesCompleted: 0, duelsWon: 0, foulsWon: 0, yellowCards: 0, redCards: 0, ownGoals: 0, goalsConceded: 0, penaltiesSaved: 0, penaltiesMissed: 0 });
function footballStatLine(labels, values) {
    const columns = arr(labels).map(v => str(v).toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim());
    const fields = arr(values);
    if (!columns.length || !fields.length)
        return null;
    const stats = defaultFootballStats();
    const take = (keys) => { const idx = columns.findIndex(k => keys.includes(k)); return idx < 0 ? null : count(fields[idx]); };
    const miIndex = columns.findIndex(k => aliases.minutes.includes(k));
    stats.minutes = miIndex < 0 ? null : parseFootballStatMinutes(fields[miIndex]);
    Object.keys(aliases).forEach(key => { if (key === 'minutes')
        return; const v = take(aliases[key]); if (v !== null)
        stats[key] = v; });
    const hasAny = Object.keys(stats).some(key => key !== 'minutes' && stats[key] > 0);
    return stats.minutes !== null || hasAny ? stats : null;
}
const posOrder = (raw) => { const p = (raw || '').toUpperCase(); if (/^GK|GOAL/.test(p))
    return 1; if (/^(DEF|D|CB|LB|RB|WB)/.test(p))
    return 2; if (/^(MID|M|DM|CM|AM)/.test(p))
    return 3; if (/^(FWD|F|ST|ATT|W)/.test(p))
    return 4; return 5; };
function sorareFootballEstimate(stats, position) {
    const upper = (position || '').toUpperCase();
    const isKeeper = /^GK|GOAL/.test(upper);
    const isDef = /^(DEF|D|CB|LB|RB|WB)/.test(upper);
    const cleanSheet = stats.minutes !== null && stats.minutes >= 60 && stats.goalsConceded === 0 ? (isKeeper || isDef ? true : null) : null;
    const decisive = stats.goals * 15 + stats.assists * 10 + stats.penaltiesSaved * 12 + (cleanSheet === true ? 5 : 0) - stats.ownGoals * 8 - stats.penaltiesMissed * 6;
    const aa = stats.shotsOnTarget * 1.5 + stats.saves * 0.9 + stats.clearances * 0.5 + stats.tacklesWon * 1.1 + stats.interceptions * 1.0 + stats.chancesCreated * 1.2 + stats.crossesCompleted * 0.5 + stats.duelsWon * 0.35 + stats.foulsWon * 0.4 - stats.yellowCards * 3 - stats.redCards * 10 - Math.max(0, stats.goalsConceded - (isKeeper || isDef ? 0 : 999)) * 0.6;
    return { decisive: Math.round(decisive * 10) / 10, allAround: Math.round(aa * 10) / 10, total: Math.round((decisive + aa) * 10) / 10, cleanSheet };
}
function parseEspnFootballPlayers(raw, game) {
    const groups = arr(obj(raw).boxscore?.players);
    const players = new Map();
    for (const group of groups) {
        const g = obj(group), teamId = str(obj(g.team).id);
        if (teamId !== game.home.id && teamId !== game.away.id)
            continue;
        for (const section of arr(g.statistics)) {
            const sec = obj(section), labels = sec.labels ?? sec.names;
            for (const row of arr(sec.athletes)) {
                const a = obj(row), athlete = obj(a.athlete);
                const id = str(athlete.id);
                if (!id)
                    continue;
                const name = str(athlete.displayName) || str(athlete.fullName);
                if (!name)
                    continue;
                const note = str(a.didNotPlayReason) || str(a.reason) || str(a.status);
                const didNotPlay = Boolean(a.didNotPlay) || /DNP|OUT|INACTIVE|DID NOT/i.test(note);
                const statPart = didNotPlay ? null : footballStatLine(labels, a.stats);
                const base = players.get(id) ?? { id, name, shortName: str(athlete.shortName) || name.split(' ').slice(-1)[0], headshot: validPhoto(obj(athlete.headshot).href) || validPhoto(obj(athlete).image), teamId, starter: a.starter === true || athlete.starter === true, played: false, position: str(obj(athlete.position).abbreviation) || str(a.position) || null, stats: null, score: null, status: didNotPlay ? note || 'DNP' : null };
                const merged = base.stats ?? defaultFootballStats();
                if (statPart) {
                    for (const key of Object.keys(merged)) {
                        if (key === 'minutes') {
                            merged.minutes = statPart.minutes ?? merged.minutes;
                            continue;
                        }
                        merged[key] = merged[key] + statPart[key];
                    }
                }
                const played = !didNotPlay && Boolean((merged.minutes ?? 0) > 0 || merged.goals || merged.assists || merged.saves || merged.shotsOnTarget || merged.clearances || merged.tacklesWon || merged.interceptions);
                const finalStats = played || statPart ? merged : null;
                const finalPosition = base.position || str(obj(athlete.position).abbreviation) || null;
                players.set(id, { ...base, starter: base.starter || a.starter === true || athlete.starter === true, position: finalPosition, stats: finalStats, played, status: didNotPlay ? note || 'DNP' : base.status, score: finalStats ? sorareFootballEstimate(finalStats, finalPosition) : null });
            }
        }
    }
    return Array.from(players.values()).sort((a, b) => a.teamId.localeCompare(b.teamId) || Number(b.starter) - Number(a.starter) || posOrder(a.position) - posOrder(b.position) || a.name.localeCompare(b.name));
}
function parseEspnFootballPlays(raw) {
    const r = obj(raw);
    const rows = Array.isArray(r.commentary) ? r.commentary : Array.isArray(r.plays) ? r.plays : arr(obj(r.commentary).items);
    const parsed = [];
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
        const p = obj(rows[i]);
        const text = str(p.text) || str(p.description);
        if (!text)
            continue;
        const minute = str(obj(p.time).displayValue) || str(obj(p.clock).displayValue) || str(p.displayTime) || str(p.clock) || str(p.minute);
        const id = str(p.id) || str(p.sequenceNumber) || String(i), key = `${id}:${minute}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        parsed.push({ id, minute: text && minute ? minute : minute || '–', text: text.slice(0, 400), teamId: str(obj(p.team).id) || null, type: str(obj(p.type).text) || str(p.type) || null, scoreHome: numeric(p.homeScore), scoreAway: numeric(p.awayScore), sort: numeric(p.sequenceNumber) ?? numeric(p.timestamp) ?? i });
    }
    return parsed.sort((a, b) => b.sort - a.sort).slice(0, 180);
}
function parseEspnFootballSummary(raw, eventId, updatedAt, leagueKey) {
    const r = obj(raw), header = obj(r.header), comp = obj(arr(header.competitions)[0]);
    const game = parseEspnFootballGame({ id: header.id ?? eventId, date: comp.date ?? header.date, competitions: [comp] }, updatedAt, leagueKey);
    if (!game || game.id !== eventId)
        throw new Error('ESPN-Spieldetails sind unvollständig oder gehören zu einem anderen Spiel.');
    const players = parseEspnFootballPlayers(raw, game);
    return { game, players, plays: parseEspnFootballPlays(raw), source: 'ESPN Gamecast', updatedAt,
        warning: players.length === 0 ? 'Noch keine auswertbaren Live-Fußballstatistiken verfügbar.' : null };
}
const footballLeagueName = (key) => leagueNameByKey[key];
exports.footballLeagueName = footballLeagueName;
exports.footballLeagueKeys = Object.keys(leagueNameByKey);
