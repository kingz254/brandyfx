export const VERSION = 'brandyfx-even-odd-1';
export const WINDOW = 255;

export function formatTick(quote, precision) {
  if ((typeof quote !== 'number' && typeof quote !== 'string') || quote === '' ||
      !Number.isFinite(Number(quote)) || !Number.isInteger(precision) || precision < 0 || precision > 12) return null;
  return Number(quote).toFixed(precision);
}

export function appendTick(market, epoch, raw) {
  const quote = formatTick(raw, market.precision);
  if (!quote || !Number.isInteger(epoch) || epoch <= market.epoch) return false;
  if (market.epoch !== -1 && epoch - market.epoch > 15) market.quotes.length = 0;
  market.epoch = epoch;
  market.quotes.push(quote);
  if (market.quotes.length > WINDOW) market.quotes.shift();
  return true;
}

function parity(quotes) {
  const counts = [0, 0];
  for (const quote of quotes) counts[Number(quote.at(-1)) % 2]++;
  return counts.map(count => count / quotes.length);
}

export function evaluate(quotes) {
  if (quotes.length < WINDOW) return [];
  const window = quotes.slice(-WINDOW);
  const result = [];
  const long = parity(window);
  const short = parity(window.slice(-55));
  const direction = long.findIndex((share, i) => share > 0.57 && short[i] > 0.55);
  if (direction >= 0) result.push({ family: 'evenOdd', label: ['Even', 'Odd'][direction], digit: null });

  const counts = Array(10).fill(0);
  for (const quote of window) counts[Number(quote.at(-1))]++;
  // Preview rules for the requested barriers and digit family require owner approval.
  const over = counts[7] + counts[8] + counts[9];
  const under = counts[0] + counts[1] + counts[2];
  if (Math.max(over, under) / WINDOW >= 0.37 && over !== under) {
    result.push({ family: 'range', label: over > under ? 'Over 6' : 'Under 3', digit: over > under ? 6 : 3 });
  }
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  if (max / WINDOW >= 0.15 && counts.indexOf(max) === counts.lastIndexOf(max)) {
    result.push({ family: 'digit', label: 'Matches', digit: counts.indexOf(max) });
  } else if (min / WINDOW <= 0.05 && counts.indexOf(min) === counts.lastIndexOf(min)) {
    result.push({ family: 'digit', label: 'Differs', digit: counts.indexOf(min) });
  }
  return result;
}
