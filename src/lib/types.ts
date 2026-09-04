export type CollegeStatus = "open" | "resolved-yes" | "resolved-no";
export type BetSide = "yes" | "no";

export type College = {
  id: string;
  name: string;
  status: CollegeStatus;
  seed_yes: number;
  seed_no: number;
};

export type Player = {
  id: string;
  name: string;
  balance: number;
  correct_count: number;
  wrong_count: number;
  created_at: string;
};

export type Bet = {
  id: string;
  college_id: string;
  player_id: string;
  side: BetSide;
  amount: number;
  payout_rate: number;
  created_at: string;
};

export type BetWithPlayer = Bet & {
  players: Pick<Player, "id" | "name"> | null;
};

export type Odds = {
  yesFraction: number;
  noFraction: number;
  yesPercent: number;
  noPercent: number;
  yesPaysPercent: number;
  noPaysPercent: number;
};
