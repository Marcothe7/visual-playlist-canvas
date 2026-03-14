// ELO rating system for Music Battles.
// Standard K=32, initial rating 1000.

export const DEFAULT_RATING = 1000
const K = 32

/** Expected score for player A against player B */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Compute new ELO ratings after a battle.
 * Returns { newA, newB }
 */
export function computeElo(ratingA, ratingB, aWon) {
  const ea = expectedScore(ratingA, ratingB)
  const eb = expectedScore(ratingB, ratingA)
  return {
    newA: Math.round(ratingA + K * ((aWon ? 1 : 0) - ea)),
    newB: Math.round(ratingB + K * ((aWon ? 0 : 1) - eb)),
  }
}

/** Rating change for display (e.g. "+12" or "-8") */
export function ratingDelta(oldRating, newRating) {
  const delta = newRating - oldRating
  return delta >= 0 ? `+${delta}` : `${delta}`
}
