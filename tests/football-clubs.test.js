const assert = require("node:assert/strict");
const { getFootballClubs } = require("../.test-build/lib/sorare.js");

const originalFetch = global.fetch;
global.fetch = async (_url, init) => {
  assert.equal(init.method, "POST");
  assert.ok(JSON.parse(init.body).query.includes("clubsReady"));
  return {
    ok: true,
    text: async () => JSON.stringify({ data: { football: { clubsReady: [
      { slug: "manchester-city", name: "Manchester City", domesticLeague: { displayName: "English League Players" } },
      { slug: "arsenal", name: "Arsenal", domesticLeague: { displayName: "English League Players" } },
      { slug: "bayern-munchen", name: "FC Bayern", domesticLeague: { displayName: "Bundesliga" } },
      { slug: "real-madrid", name: "Real Madrid", domesticLeague: { displayName: "LaLiga" } },
      { slug: "paris-saint-germain", name: "PSG", domesticLeague: { displayName: "Ligue 1" } },
      { slug: "inter-milan", name: "Inter", domesticLeague: { displayName: "Serie A" } },
      { slug: "leeds-united-championship", name: "Championship Team", domesticLeague: { displayName: "English Championship" } },
    ] } } }),
  };
};

(async () => {
  try {
    const clubs = await getFootballClubs();
    assert.equal(clubs.length, 5);
    assert.deepEqual(clubs.filter(c => c.league === "Premier League").map(c => c.name), ["Manchester City", "Arsenal"]);
    assert.deepEqual([...new Set(clubs.map(c => c.league))].sort(), ["Bundesliga", "LaLiga", "Ligue 1", "Premier League"].sort());
    assert.ok(!clubs.some(c => c.name === "Inter" || c.name === "Championship Team"));
    console.log("Football club data pipeline tests passed.");
  } finally {
    global.fetch = originalFetch;
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
