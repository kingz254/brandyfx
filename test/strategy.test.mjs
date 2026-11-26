import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendTick, evaluate, formatTick } from '../strategy.mjs';

test('formats the published tick precision before calculating the last digit', () => {
  assert.equal(formatTick(193.2, 3), '193.200');
  assert.equal(formatTick(0, 2), '0.00');
  assert.equal(formatTick(null, 2), null);
  assert.equal(formatTick(10, -1), null);
});

test('warms up and detects even and odd digit imbalance', () => {
  const even = Array.from({ length: 255 }, (_, i) => `101.${i % 10 < 8 ? '2' : '1'}`);
  const odd = Array.from({ length: 255 }, (_, i) => `101.${i % 10 < 8 ? '1' : '2'}`);
  assert.deepEqual(evaluate(even.slice(1)), []);
  assert.ok(evaluate(even).some(signal => signal.family === 'evenOdd' && signal.label === 'Even'));
  assert.ok(evaluate(odd).some(signal => signal.family === 'evenOdd' && signal.label === 'Odd'));
});

test('detects the requested digit barriers and matches/differs preview rules', () => {
  const sample = digits => Array.from({ length: 255 }, (_, i) => '101.' + digits[i % digits.length]);
  assert.ok(evaluate(sample('777889')).some(signal => signal.label === 'Over 6' && signal.digit === 6));
  assert.ok(evaluate(sample('000112')).some(signal => signal.label === 'Under 3' && signal.digit === 3));
  assert.ok(evaluate(sample('01234444456789')).some(signal => signal.label === 'Matches' && signal.digit === 4));
  assert.ok(evaluate(sample('012345689')).some(signal => signal.label === 'Differs' && signal.digit === 7));
});

test('drops overlapping ticks and resets the strategy on feed gaps', () => {
  const market = { precision: 2, epoch: -1, quotes: [] };
  for (let i = 0; i < 255; i++) assert.ok(appendTick(market, i, i));
  assert.ok(evaluate(market.quotes).some(signal => signal.family === 'evenOdd' && signal.label === 'Even'));
  assert.equal(appendTick(market, 254, 0), false);
  assert.equal(appendTick(market, 253, 0), false);
  assert.ok(appendTick(market, 300, 452.5));
  assert.deepEqual(market.quotes, ['452.50']);
  assert.deepEqual(evaluate(market.quotes), []);
});
