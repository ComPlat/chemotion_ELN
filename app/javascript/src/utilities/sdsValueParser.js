// Safety data sheets state a quantity as prose around it: "0,861 g/cm3 at 20 °C
// - lit.", "12 - 13 °C - lit.", "27 °C - closed cup", "> 100 °C". Sample fields
// hold the quantity alone, so the leading number is taken and the annotation
// dropped — including the comma decimal separator European sheets use.

const NUMBER = '-?\\d+(?:[.,]\\d+)?';
const FIRST_NUMBER = new RegExp(`(${NUMBER})`);
// Two numbers with nothing but a dash between them. A dash that follows a unit
// ("138 °C - lit.") opens an annotation and does not bound a range.
const RANGE = new RegExp(`(${NUMBER})\\s*[-\\u2012\\u2013\\u2014\\u2212]\\s*(${NUMBER})`);

const toNumber = (text) => {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

/** The first quantity in an SDS value, or null when it states none. */
export const parseSdsNumber = (raw) => {
  const match = FIRST_NUMBER.exec(String(raw ?? ''));
  return match ? toNumber(match[1]) : null;
};

/**
 * An SDS value as a { lower, upper } range. A value that names one quantity
 * comes back open-ended, which is how Sample#updateRange reads a single point.
 */
export const parseSdsRange = (raw) => {
  const text = String(raw ?? '');
  const range = RANGE.exec(text);

  if (range) {
    const lower = toNumber(range[1]);
    const upper = toNumber(range[2]);
    if (lower !== null && upper !== null) return { lower, upper };
  }

  const single = parseSdsNumber(text);
  return single === null ? null : { lower: single, upper: Number.POSITIVE_INFINITY };
};

/** An SDS temperature as the { value, unit } pair the sample field stores. */
export const parseSdsTemperature = (raw) => {
  const value = parseSdsNumber(raw);
  if (value === null) return null;

  const text = String(raw);
  if (/°\s*F/i.test(text)) return { value, unit: '°F' };
  if (/\bK\b/.test(text)) return { value, unit: 'K' };
  return { value, unit: '°C' };
};
