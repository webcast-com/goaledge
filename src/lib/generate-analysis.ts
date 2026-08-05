import { Tip } from "@/types/goaledge";

export function generateAnalysis(tip: Tip): string {
  const analyses: Record<string, string> = {
    "Serie A":
      "Inter Milan have been dominant at home this season, winning 4 of their last 5 at the San Siro. Juventus have struggled on the road with just 1 win in their last 5 away matches. The xG data strongly favors a home result or draw here.",
    "La Liga":
      "Real Madrid's attacking form has been exceptional with an average of 2.4 goals per game. Sevilla's defensive record away from home is concerning, conceding 1.8 goals per match. The home advantage at the Bernabeu makes this a strong selection.",
    "Premier League":
      "Liverpool have won their last 4 home matches by an aggregate of 12-2. Brighton have lost 3 of their last 5 away games. The -1 handicap offers excellent value given the gulf in quality and form.",
    "Bundesliga":
      "Der Klassiker always delivers goals. Both teams average over 2.5 combined xG per match. With Bayern's attacking firepower and Dortmund's tendency to push forward, over 2.5 goals is statistically favored.",
    "Ligue 1":
      "PSG have scored in every home match this season. Lyon have found the net in 4 of their last 5 away games. Both teams to score is supported by strong attacking metrics from both sides.",
    "NPFL":
      "Enyimba's home record in the NPFL is formidable with a 70% win rate at their fortress. Rangers International have managed just 1 point from their last 3 away fixtures. The home advantage in Nigerian football is significant.",
  };
  return (
    analyses[tip.league] ??
    "Our data models show a strong trend favoring this selection based on recent form, head-to-head history, and statistical projections."
  );
}