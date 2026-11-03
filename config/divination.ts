/** Screenshot-confirmed Arcade board constraints, 03.11.2026.
 * Target scores are examples from the user's football screenshots, not a complete rules feed.
 * Do not silently apply these rules to other Sorare competitions.
 */
export const ARCADE = {
  name: "Markerras Sorare Helper / Arcade",
  football: {
    slots: ["GK", "DEF", "MID", "FWD", "FLEX"] as const,
    exampleTargets: [180, 360] as const,
  },
  nba: {
    slots: ["ANY", "ANY", "ANY", "ANY", "ANY"] as const,
    maxStars: 16,
    starStep: 0.5,
  },
} as const;

// Alias retained for compatibility with imports from older project versions.
export const DIVINATION = {
  ...ARCADE,
  rulesVerified: false, // This does NOT mean all set, edition, or eligibility rules were verified.
};
