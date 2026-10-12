// Safety data sheets state a quantity as prose around it: "0,861 g/cm3 at 20 °C - lit.",
// "12 - 13 °C - lit.". Cf. Chemotion::SdsValueParser, whose refusals this mirrors.

const NUMBER = '-?\\d+(?:[.,]\\d+)?';
// The cell opens with its value: a number or a range, then the unit printed next to it.
const QUANTITY = new RegExp(
  `^(${NUMBER})(?:\\s*(?:[-\\u2012\\u2013\\u2014]|to)\\s*(${NUMBER}))?(?:\\s*([^\\s\\d(/-][^\\s(]*))?$`,
);
const DUAL_UNIT = new RegExp(`^(${NUMBER})\\s*°C\\s*/\\s*${NUMBER}\\s*°F$`);
const PROVENANCE = /\s*-\s*(lit\.?|closed cup|open cup|geschlossener\s+Tiegel|offener\s+Tiegel)$/i;
const BRACKETED = /^(.*?)\s*\(([^()]*)\)$/;
const MEASURED_AT = /^(.*?)(?:\s+at\s+|\s+bei\s+|\s*@\s*)(.+)$/i;
// A value may carry the temperature or pressure it was measured at, nothing else.
const CONDITION = /^-?\d[\d.,]*\s*(°C|°F|K|hPa|kPa|mbar|bar|mmHg|atm|Pa)$/;

const toNumber = (text) => parseFloat(text.replace(',', '.'));

const clean = (raw) => String(raw ?? '')
  .replace(/\u2212/g, '-')
  .replace(/[°º]\s*([CF])\b/g, '°$1')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(PROVENANCE, '');

/** The value an SDS cell opens with, as { low, high, unit }; null when the cell is anything else. */
export const parseSdsQuantity = (raw) => {
  let text = clean(raw);
  const trailer = text.match(BRACKETED) || text.match(MEASURED_AT);
  if (trailer) {
    if (!CONDITION.test(trailer[2].trim())) return null;
    text = trailer[1].trim();
  }

  const dual = text.match(DUAL_UNIT);
  if (dual) {
    const celsius = toNumber(dual[1]);
    return { low: celsius, high: celsius, unit: '°C' };
  }

  const match = text.match(QUANTITY);
  if (!match) return null;
  const low = toNumber(match[1]);
  return { low, high: match[2] === undefined ? low : toNumber(match[2]), unit: match[3] || null };
};
