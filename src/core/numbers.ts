// break_eternity wrapper — the ONLY place Decimal is touched directly.
// State stores decimals as strings (type Dec); compute converts at the edges.
import Decimal from 'break_eternity.js';
import type { Dec } from './types';

export const D = (v: Dec | number): Decimal => new Decimal(v);

export const add = (a: Dec, b: Dec | number): Dec => D(a).add(b).toString();
export const sub = (a: Dec, b: Dec | number): Dec => D(a).sub(b).toString();
export const mul = (a: Dec, b: Dec | number): Dec => D(a).mul(b).toString();
export const gte = (a: Dec, b: Dec | number): boolean => D(a).gte(b);
export const gt = (a: Dec, b: Dec | number): boolean => D(a).gt(b);

/** cost(n) = ceil(baseCost × ratio^n) — costs are always whole units
 *  (genre norm; fractional prices read as a bug). */
export const scaleCost = (baseCost: Dec, ratio: number, owned: number): Dec =>
  D(baseCost).mul(Decimal.pow(ratio, owned)).ceil().toString();

/** Format the whole-unit part of a balance (stocks display as integers;
 *  the fractional remainder keeps accruing silently underneath). Suffixed
 *  magnitudes keep their decimals — only the sub-1000 range shows raw units. */
export const formatWhole = (v: Dec): string => format(D(v).floor().toString());

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Short human format: 0–999.99 plain, then K/M/B…, then scientific. */
export function format(v: Dec, places = 2): string {
  const d = D(v);
  if (d.lt(0)) return '-' + format(d.neg().toString(), places);
  if (d.lt(1000)) {
    const n = d.toNumber();
    return Number.isInteger(n) ? String(n) : n.toFixed(places);
  }
  const exp = Math.floor(d.log10().toNumber());
  const tier = Math.floor(exp / 3);
  if (tier < SUFFIXES.length) {
    const scaled = d.div(Decimal.pow(10, tier * 3)).toNumber();
    return scaled.toFixed(scaled >= 100 ? 1 : places) + SUFFIXES[tier];
  }
  return d.toExponential(places).replace('+', '');
}
