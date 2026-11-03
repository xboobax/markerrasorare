const assert = require("node:assert/strict");
const { FOOTBALL_LEAGUES, footballLeagueFromSorare, isFootballLeague } = require("../.test-build/lib/leagues.js");
assert.deepEqual(FOOTBALL_LEAGUES, ["Bundesliga", "LaLiga", "Ligue 1", "Premier League"]);
for (const [source, expected] of [
  ["Bundesliga", "Bundesliga"], ["1. Bundesliga", "Bundesliga"],
  ["LaLiga", "LaLiga"], ["La Liga EA Sports", "LaLiga"],
  ["Ligue 1", "Ligue 1"], ["Ligue 1 McDonald's", "Ligue 1"],
  ["Premier League", "Premier League"], ["English Premier League", "Premier League"],
  ["English League Players", "Premier League"], ["ENGLISH LEAGUE PLAYERS", "Premier League"],
  ["EPL", "Premier League"],
]) assert.equal(footballLeagueFromSorare(source), expected, source);
for (const excluded of ["Serie A", "Eredivisie", "Ligue 2", "2. Bundesliga", "Champions League", "MLS", "English League", "English Championship", "EFL Championship", "Women's Super League", "", null, undefined]) {
  assert.equal(footballLeagueFromSorare(excluded), null, String(excluded));
  assert.equal(isFootballLeague(excluded), false, String(excluded));
}
for (const allowed of FOOTBALL_LEAGUES) assert.equal(isFootballLeague(allowed), true);
assert.equal(isFootballLeague("Serie A"), false);
console.log("Football league allowlist tests passed.");
