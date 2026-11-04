import type {ScoutedForecast} from '../lib/matchups';
import type {ForecastV18} from '../lib/forecast-v18';
import type {PredictionV2} from '../lib/prediction-engine-v2';

type CachedPrediction = ScoutedForecast & {modelV18:ForecastV18;modelV2:PredictionV2};
declare const cached: CachedPrediction;
const rated: number | null = cached.opponentRating;
const adjustment: number = cached.matchupAdjustmentPct;
const minutesAdjustment: number = cached.minutesAdjustmentPct;
const expected: number = cached.weighted;
const model: PredictionV2 = cached.modelV2;
void rated; void adjustment; void minutesAdjustment; void expected; void model;
