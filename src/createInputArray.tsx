import { flatMap } from "lodash";
import { MAX_COUNT, pad, HISTORY_STEPS, sign } from "./Simulator";
import { Investor, Company, Vision } from "method-data/types";
import { lastFew } from "./Simulation";

export function createInputArray(
  investor: Investor,
  company: Company,
  vision: Vision
): number[] {
  return [
    investor.cookies / MAX_COUNT,
    investor.cookiesInvested / MAX_COUNT,
    // Company info
    ...pad(
      company.values.map((c) => (c?.change ?? 0 + 1) * 0.5),
      HISTORY_STEPS
    ),
    // Vision info
    ...pad(
      flatMap(lastFew(vision.investors, 3), (i) => [
        ...pad(
          i.posts.map((p) => p.favoriteCount / MAX_COUNT),
          HISTORY_STEPS
        ),
        ...pad(
          i.posts.map((p) => p.retweetCount / MAX_COUNT),
          HISTORY_STEPS
        ),
        ...pad(
          i.posts.map((p) => sign(p.textSentiment) / MAX_COUNT),
          HISTORY_STEPS
        ),
      ]),
      HISTORY_STEPS * 3
    ),
  ];
}
