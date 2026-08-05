export interface Tip {
  id: string;
  league: string;
  country: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  predictionType: string;
  prediction: string;
  odds: string;
  confidence: number;
  confidenceLabel: string;
  status: string;
  tipster: string;
  isPremium: boolean;
  analysis?: string;
  homeForm?: string[];
  awayForm?: string[];
  headToHead?: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
  matchId?: number;
  competitionCode?: string;
}

export interface LiveScore {
  id: string;
  league: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  status: "live";
  possession: string;
  shots: string;
  corners: string;
  matchId?: number;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "tip" | "win" | "alert";
}

export interface LiveOddsData {
  odds: string;
  direction: "up" | "down";
  bookmaker: string;
}

export interface OddsFeedItem {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  newOdds: string;
  oldOdds: string;
  direction: "up" | "down";
  bookmaker: string;
  timestamp: number;
}

export interface AdminFormState {
  league: string;
  country: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  predictionType: string;
  prediction: string;
  odds: string;
  confidence: string;
  confidenceLabel: string;
  tipster: string;
  isPremium: boolean;
  analysis: string;
}

export interface BetHistoryItem {
  id: string;
  betType: string;
  legs: Array<{
    tipId: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    prediction: string;
    predictionType: string;
    odds: string;
    matchTime: string;
  }>;
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  status: string;
  result: Array<{ tipId: string; result: string }> | null;
  settledAt: string | null;
  createdAt: string;
}

export interface BetSummary {
  totalBets: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  winRate: string;
  totalStaked: number;
  totalReturned: number;
  profit: number;
  roi: string;
}

export type ApiStatus = "checking" | "live" | "seed" | "offline";
export type BetType = "single" | "double" | "treble" | "4fold" | "5fold" | "6fold" | "acca";
export type HistoryFilter = "all" | "won" | "lost" | "void";
export type LeaderboardPeriod = "week" | "month" | "all";
export type AdminTab = "tips" | "create" | "stats";
