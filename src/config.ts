import dotenv from 'dotenv';

dotenv.config({ override: false });

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface Settings {
  marketLimit: number;
  targetPrice: number;
  priceTolerance: number;
  buyQuantity: number;
  sellSpread: number;
  fetchIntervalMs: number;
}

export const env = process.env;

export const settings: Settings = {
  marketLimit: Math.max(5, toNumber(env.MARKET_LIMIT, 25)),
  targetPrice: toNumber(env.TARGET_PRICE, 0.5),
  priceTolerance: Math.max(0.005, toNumber(env.PRICE_TOLERANCE, 0.03)),
  buyQuantity: Math.max(0.1, toNumber(env.BUY_QUANTITY, 5)),
  sellSpread: Math.max(0.0, toNumber(env.SELL_SPREAD, 0.02)),
  fetchIntervalMs: Math.max(2000, toNumber(env.FETCH_INTERVAL_MS, 15_000)),
};

export const credentials = {
  privateKey: env.PRIVATE_KEY ?? '',
  apiKeyId: env.POLY_API_KEY ?? '',
};
