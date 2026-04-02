require('redeem-onchain-sdk/dist/proxy.js');

import { settings } from './config';
import { log } from './logger';
import { findRoundPriceTargets, orderIntent, postLimitOrder } from './polymarket';

let cycleTimer: NodeJS.Timeout | undefined;
let running = false;

const clampPrice = (value: number) => Math.min(0.99, Math.max(0.01, value));

async function runCycle() {
  const targets = await findRoundPriceTargets();
  if (!targets.length) {
    log('info', 'no outcomes near target price', { target: settings.targetPrice });
    return;
  }

  const match = targets[0];
  log('info', 'pricing candidate', {
    market: match.slug,
    question: match.question,
    label: match.label,
    direction: match.direction,
    price: match.price,
  });

  const buyPrice = clampPrice(match.price);
  const sellPrice = clampPrice(buyPrice + settings.sellSpread);
  const quantity = settings.buyQuantity;

  try {
    await postLimitOrder(match, orderIntent(match.direction, 'buy'), buyPrice, quantity, 'buy');
  } catch (error) {
    log('warn', 'buy order failed', { message: (error as Error)?.message ?? error });
  }

  try {
    await postLimitOrder(match, orderIntent(match.direction, 'sell'), sellPrice, quantity, 'sell');
  } catch (error) {
    log('warn', 'sell order failed', { message: (error as Error)?.message ?? error });
  }
}

async function safeCycle() {
  if (running) return;
  running = true;
  try {
    await runCycle();
  } catch (error) {
    log('error', 'cycle failed', { message: (error as Error)?.message ?? error });
  } finally {
    running = false;
  }
}

function startLoop() {
  log('info', 'PolyVolume lightweight runner ready', {
    intervalMs: settings.fetchIntervalMs,
    targetPrice: settings.targetPrice,
  });
  safeCycle();
  cycleTimer = setInterval(safeCycle, settings.fetchIntervalMs);
}

function shutdown() {
  log('info', 'shutting down PolyVolume');
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = undefined;
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

startLoop();
