import { readFile } from 'node:fs/promises';
import { appendTick, evaluate, formatTick, VERSION } from './strategy.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node replay.mjs path-to-ticks.json');
const { precision, ticks } = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(ticks)) throw new Error('Expected an array of ticks');
const market = { precision, quotes: [], epoch: -1 };
for (const tick of ticks) {
  const quote = formatTick(tick.quote, precision);
  if (!Number.isInteger(tick.epoch) || !quote) throw new Error('Invalid tick');
  if (!appendTick(market, tick.epoch, tick.quote)) continue;
  for (const signal of evaluate(market.quotes)) console.log(JSON.stringify({ epoch: market.epoch, quote, version: VERSION, ...signal }));
}
