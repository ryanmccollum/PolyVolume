import { log } from './logger';
import { settings } from './config';
import { buildAuthHeaders } from './auth';

const BASE_URL = 'https://api.polymarket.us';
const MARKET_PATH = '/v1/markets';
const ORDER_PATH = '/v1/orders';

export type Direction = 'YES' | 'NO' | 'OTHER';

export interface OutcomeMatch {
  slug: string;
  question: string;
  label: string;
  direction: Direction;
  price: number;
}

const INTENT_MAP: Record<Direction, { buy: string; sell: string }> = {
  YES: { buy: 'ORDER_INTENT_BUY_LONG', sell: 'ORDER_INTENT_SELL_LONG' },
  NO: { buy: 'ORDER_INTENT_BUY_SHORT', sell: 'ORDER_INTENT_SELL_SHORT' },
  OTHER: { buy: 'ORDER_INTENT_BUY_LONG', sell: 'ORDER_INTENT_SELL_LONG' },
};

const clampPrice = (value: number) => Math.min(0.99, Math.max(0.01, value));
const toNumber = (value: unknown, fallback = NaN): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function findRoundPriceTargets(): Promise<OutcomeMatch[]> {
  const params = new URLSearchParams({ active: 'true', limit: settings.marketLimit.toString() });
  const url = `${BASE_URL}${MARKET_PATH}?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`markets request failed ${response.status} ${response.statusText}`);
  }

  const payload = await response.json().catch(() => ({}));
  const markets = Array.isArray((payload as any).markets)
    ? (payload as any).markets
    : Array.isArray(payload)
    ? payload
    : [];

  const hits: OutcomeMatch[] = markets.flatMap(normalizeMarket);
  return hits
    .filter((match) => Math.abs(match.price - settings.targetPrice) <= settings.priceTolerance)
    .sort((a, b) => Math.abs(a.price - settings.targetPrice) - Math.abs(b.price - settings.targetPrice));
}

function normalizeMarket(market: any): OutcomeMatch[] {
  const slug = String(market.slug ?? market.id ?? 'unknown-market');
  const question = String(market.question ?? '');
  const names = Array.isArray(market.outcomes) ? market.outcomes : [];
  const prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : [];
  const fallbackPrice = clampPrice(
    toNumber(market.lastTradePrice ?? market.price?.lastTradePrice ?? market.price?.price ?? NaN, 0.5)
  );
  const count = Math.max(names.length, prices.length, 2);

  return Array.from({ length: count }, (_, index) => {
    const label = String(names[index] ?? `Outcome ${index + 1}`);
    const price = clampPrice(toNumber(prices[index], fallbackPrice));
    const direction: Direction = index === 0 ? 'YES' : index === 1 ? 'NO' : 'OTHER';
    return { slug, question, label, direction, price };
  });
}

export async function postLimitOrder(
  match: OutcomeMatch,
  intent: string,
  price: number,
  quantity: number,
  stage: 'buy' | 'sell'
) {
  const adjustedPrice = match.direction === 'NO' ? clampPrice(1 - price) : clampPrice(price);
  const body = {
    marketSlug: match.slug,
    intent,
    type: 'ORDER_TYPE_LIMIT',
    price: { value: adjustedPrice.toFixed(4), currency: 'USD' },
    quantity,
    tif: 'TIME_IN_FORCE_GOOD_TILL_CANCEL',
    manualOrderIndicator: 'MANUAL_ORDER_INDICATOR_AUTOMATIC',
    participateDontInitiate: false,
  };

  const headers = await buildAuthHeaders('POST', ORDER_PATH);
  const response = await fetch(`${BASE_URL}${ORDER_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`order failed ${response.status}: ${JSON.stringify(payload)}`);
  }

  log('info', `${stage} order placed`, {
    market: match.slug,
    intent,
    stage,
    quantity,
    price: adjustedPrice,
    outcome: match.label,
  });
  return payload;
}

export function orderIntent(direction: Direction, stage: 'buy' | 'sell') {
  return INTENT_MAP[direction][stage];
}
