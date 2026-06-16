export function calculateElo(whiteRating, blackRating, result, k = 32) {
  const expectedWhite = 1 / (1 + 10 ** ((blackRating - whiteRating) / 400));
  const expectedBlack = 1 - expectedWhite;
  const scoreWhite = result === "white_win" ? 1 : result === "black_win" ? 0 : 0.5;
  const scoreBlack = 1 - scoreWhite;

  return {
    white: Math.max(0, Math.round(whiteRating + k * (scoreWhite - expectedWhite))),
    black: Math.max(0, Math.round(blackRating + k * (scoreBlack - expectedBlack)))
  };
}
