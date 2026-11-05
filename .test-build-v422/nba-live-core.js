"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusFromEspn = statusFromEspn;
exports.parseEspnGame = parseEspnGame;
exports.parseEspnScoreboard = parseEspnScoreboard;
exports.sorareNbaScore = sorareNbaScore;
exports.parseStatMinutes = parseStatMinutes;
exports.espnStatLine = espnStatLine;
exports.sorareNbaGameweekBest = sorareNbaGameweekBest;
exports.parseEspnPlayers = parseEspnPlayers;
exports.parseEspnPlays = parseEspnPlays;
exports.parseEspnSummary = parseEspnSummary;
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
/** ESPN occasionally sends `--`, null or a formatted ratio in a numeric column.
 * Reject these values instead of fabricating a zero Sorare score. */
const strictStat = (x) => {
    if (typeof x === 'number')
        return Number.isSafeInteger(x) && x >= 0 ? x : null;
    if (typeof x === 'string' && /^\d+$/.test(x.trim())) {
        const value = Number(x.trim());
        return Number.isSafeInteger(value) ? value : null;
    }
    return null;
};
const validPhoto = (url) => typeof url === 'string' && /^https:\/\//.test(url) && url.length < 700 ? url : null;
const extractTeam = (competitor) => {
    const c = obj(competitor), team = obj(c.team);
    return { id: str(team.id), name: str(team.displayName) || str(team.name) || 'Team unbekannt', abbreviation: str(team.abbreviation), logo: validPhoto(team.logo) || validPhoto(arr(team.logos)[0]?.href), score: numeric(c.score) };
};
function statusFromEspn(competition) {
    const state = obj(competition), status = obj(state.status), s = obj(status.type);
    const key = `${str(s.name)} ${str(s.state)} ${str(s.description)} ${str(s.detail)}`.toLowerCase();
    if (s.completed === true || /final|postgame/.test(key))
        return 'final';
    if (/inprogress|in progress|in-progress|halftime|live/.test(key) || s.state === 'in')
        return 'live';
    if (/postpon|delay|cancel|suspend/.test(key))
        return 'delayed';
    return 'scheduled';
}
function parseEspnGame(event, updatedAt) {
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
    return { id, date, home: extractTeam(home), away: extractTeam(away), status: statusFromEspn({ status }),
        statusText: str(ty.shortDetail) || str(ty.detail) || str(ty.description) || 'Termin',
        period: count(obj(status).period), clock: str(obj(status).displayClock), lastUpdated: updatedAt };
}
function parseEspnScoreboard(payload, updatedAt) {
    const events = arr(obj(payload).events);
    if (!Array.isArray(obj(payload).events))
        throw new Error('ESPN-Scoreboard ohne Spieleliste.');
    const seen = new Set();
    return events.map(e => parseEspnGame(e, updatedAt)).filter((g) => {
        if (!g || seen.has(g.id))
            return false;
        seen.add(g.id);
        return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
}
/** Score based on Sorare's public NBA base scoring matrix (no card bonus). */
function sorareNbaScore(s) {
    const categories = [s.points, s.rebounds, s.assists, s.steals, s.blocks].filter(n => n >= 10).length;
    const bonus = (categories >= 2 ? 1 : 0) + (categories >= 3 ? 1 : 0);
    return Math.round((s.points + s.rebounds * 1.2 + s.assists * 1.5 + s.blocks * 3 + s.steals * 3 + s.threes - s.turnovers * 2 + bonus) * 10) / 10;
}
function parseStatMinutes(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        return value;
    const s = str(value);
    if (!s || s === '--' || s === 'DNP')
        return null;
    const mm = s.match(/^(\d{1,3}):(\d\d)$/);
    if (mm)
        return Number(mm[1]) + Number(mm[2]) / 60;
    const n = numeric(s);
    return n !== null && n >= 0 ? n : null;
}
const statAliases = {
    points: ['PTS', 'POINTS'], rebounds: ['REB', 'REBOUNDS'], assists: ['AST', 'ASSISTS'],
    steals: ['STL', 'STEALS'], blocks: ['BLK', 'BLOCKS'], threes: ['3PM', '3PTM', '3FGM', '3PT FG', '3PT MADE'], turnovers: ['TO', 'TOV', 'TURNOVERS'],
};
function espnStatLine(labels, values) {
    const columns = arr(labels).map(v => str(v).toUpperCase().trim());
    const fields = arr(values);
    if (!columns.length || !fields.length)
        return null;
    const take = (aliases) => {
        const i = columns.findIndex(key => aliases.includes(key));
        return i < 0 ? null : strictStat(fields[i]);
    };
    const madeThrees = () => {
        const direct = columns.findIndex(key => statAliases.threes.includes(key));
        if (direct >= 0)
            return strictStat(fields[direct]);
        const split = columns.findIndex(key => key === '3PT' || key === '3FG');
        if (split < 0)
            return null;
        const value = str(fields[split]);
        const match = value.match(/^(\d+)\s*-\s*(\d+)$/);
        if (match) {
            const made = strictStat(match[1]), attempts = strictStat(match[2]);
            return made !== null && attempts !== null && made <= attempts ? made : null;
        }
        return strictStat(fields[split]);
    };
    const points = take(statAliases.points), rebounds = take(statAliases.rebounds), assists = take(statAliases.assists), steals = take(statAliases.steals), blocks = take(statAliases.blocks), threes = madeThrees(), turnovers = take(statAliases.turnovers);
    if ([points, rebounds, assists, steals, blocks, threes, turnovers].some(x => x === null))
        return null;
    const mi = columns.findIndex(l => l === 'MIN' || l === 'MINUTES');
    const minutes = mi >= 0 ? parseStatMinutes(fields[mi]) : null;
    // The MIN column, when supplied, must also be valid. An absent MIN may be
    // tolerated if action stats prove the player actually appeared.
    if (mi >= 0 && minutes === null)
        return null;
    return { minutes, points: points, rebounds: rebounds, assists: assists, steals: steals, blocks: blocks, threes: threes, turnovers: turnovers };
}
/** Highest actual individual game score counts per player in a Sorare NBA Game Week.
 * This helper intentionally operates on *base scores* and does not mix card bonuses.
 * Null means no reliable scored game, not zero. */
function sorareNbaGameweekBest(scores) {
    const actual = scores.filter((n) => typeof n === 'number' && Number.isFinite(n));
    return actual.length ? Math.max(...actual) : null;
}
/** Build unique box score rows; never treat a DNP as a played, zero-score player. */
function parseEspnPlayers(raw, game) {
    const groups = arr(obj(raw).boxscore?.players);
    const players = [];
    const ids = new Set();
    for (const group of groups) {
        const g = obj(group), teamId = str(obj(g.team).id);
        if (teamId !== game.home.id && teamId !== game.away.id)
            continue;
        for (const section of arr(g.statistics)) {
            const sec = obj(section), labels = sec.labels ?? sec.names;
            for (const row of arr(sec.athletes)) {
                const a = obj(row), athlete = obj(a.athlete);
                const id = str(athlete.id);
                if (!id || ids.has(id))
                    continue;
                const name = str(athlete.displayName) || str(athlete.fullName);
                if (!name)
                    continue;
                const stats = espnStatLine(labels, a.stats);
                const note = str(a.didNotPlayReason) || str(a.reason) || str(a.status);
                const didNotPlay = Boolean(a.didNotPlay) || /DNP|OUT|INACTIVE|DID NOT/i.test(note);
                const played = !didNotPlay && Boolean(stats) && ((stats.minutes ?? 0) > 0 || stats.points + stats.rebounds + stats.assists + stats.steals + stats.blocks + stats.threes + stats.turnovers > 0);
                ids.add(id);
                players.push({ id, name, shortName: str(athlete.shortName) || name.split(' ').slice(-1)[0], headshot: validPhoto(obj(athlete.headshot).href), teamId,
                    starter: a.starter === true || athlete.starter === true, played, stats: didNotPlay ? null : stats,
                    score: played && stats ? sorareNbaScore(stats) : null, status: didNotPlay ? note || 'DNP' : null });
            }
        }
    }
    return players;
}
function parseEspnPlays(raw) {
    const r = obj(raw);
    // ESPN game summaries normally expose plays as an array; other formats may nest plays.
    const rows = Array.isArray(r.plays) ? r.plays : arr(obj(r.plays).allPlays);
    const parsed = [];
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
        const p = obj(rows[i]);
        const text = str(p.text) || str(p.description);
        if (!text)
            continue;
        const id = str(p.id) || str(p.sequenceNumber) || String(i), key = `${id}:${str(obj(p.clock).displayValue)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        parsed.push({ id, period: count(obj(p.period).number), clock: str(obj(p.clock).displayValue), text: text.slice(0, 400),
            teamId: str(obj(p.team).id) || null, scoreHome: numeric(p.homeScore), scoreAway: numeric(p.awayScore),
            scoring: p.scoringPlay === true || p.scoreValue > 0, sort: numeric(p.sequenceNumber) ?? i });
    }
    // Limit payload and rendering cost for long overtime games; newest first in UI.
    return parsed.sort((a, b) => b.sort - a.sort).slice(0, 180);
}
function parseEspnSummary(raw, eventId, updatedAt) {
    const r = obj(raw), header = obj(r.header), comp = obj(arr(header.competitions)[0]);
    const game = parseEspnGame({ id: header.id ?? eventId, date: comp.date ?? header.date, competitions: [comp] }, updatedAt);
    if (!game || game.id !== eventId)
        throw new Error('ESPN-Spieldetails sind unvollständig oder gehören zu einem anderen Spiel.');
    const players = parseEspnPlayers(raw, game);
    return { game, players, plays: parseEspnPlays(raw), source: 'ESPN Gamecast', updatedAt,
        warning: players.length === 0 ? 'Noch keine auswertbaren Live-Boxscore-Statistiken verfügbar.' : null };
}
