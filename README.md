# PolyVolume

**Minimal Polymarket limit-order runner.**

Profiles markets for outcomes trading around the 0.50 line and places a queued buy then sell limit pair so the portfolio drifts tight to the target ratio. It loads `redeem-onchain-sdk/dist/proxy.js` first so the proxy bootstrap runs exactly as in Poly_HFT_1.

## Quick start

1. Copy `./.env.example` to `.env` and complete every key (especially `PRIVATE_KEY` and `POLY_API_KEY`).
2. npm install
3. npm run build
4. npm start

## Environment knobs

| Key | Purpose | Default |
| --- | --- | --- |
| `PRIVATE_KEY` | Base64 Ed25519 key used for REST signing. | required |
| `POLY_API_KEY` | UUID access key that maps to the secret key. | required |
| `TARGET_PRICE` | Center price for the scan. | `0.5` |
| `PRICE_TOLERANCE` | How far from the target price an outcome can drift before we intervene. | `0.03` |
| `BUY_QUANTITY` | Quote units consumed by every buy/sell leg. | `5` |
| `SELL_SPREAD` | How far above the buy price the paired sell order is placed. | `0.02` |
| `FETCH_INTERVAL_MS` | Polling cadence for live markets. | `15000` |

The runner requests `/v1/markets`, keeps any outcomes whose price is within the tolerance of the target, and then submits `ORDER_TYPE_LIMIT` orders with the `ORDER_INTENT_*` pair recommended for each side before looping again.
