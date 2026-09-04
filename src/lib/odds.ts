import type { Bet, College, Odds } from "./types";

export function computeOdds(college: College, bets: Pick<Bet, "side" | "amount">[]): Odds {
  const yesSum = bets
    .filter((b) => b.side === "yes")
    .reduce((sum, b) => sum + b.amount, 0);
  const noSum = bets
    .filter((b) => b.side === "no")
    .reduce((sum, b) => sum + b.amount, 0);

  const total = yesSum + noSum + college.seed_yes + college.seed_no;
  const yesFraction = (yesSum + college.seed_yes) / total;
  const noFraction = (noSum + college.seed_no) / total;

  return {
    yesFraction,
    noFraction,
    yesPercent: Math.round(yesFraction * 100),
    noPercent: Math.round(noFraction * 100),
    // Payout rate = opposite side's current percentage
    yesPaysPercent: Math.round(noFraction * 100),
    noPaysPercent: Math.round(yesFraction * 100),
  };
}
