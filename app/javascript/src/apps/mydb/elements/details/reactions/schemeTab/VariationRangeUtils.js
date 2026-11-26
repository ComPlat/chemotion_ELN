/*
The scheme tab shows one value per field, but a reaction that has variations has one value per
variation. A field the variations do not all agree on therefore has nothing single left to show: it
displays the range they span and stops being editable, so that an edit cannot silently overwrite
what the individual variations say.

This is the reaction-level counterpart of MaterialHandler#findMinMayUnit, which does the same for
the material fields, and it follows the same rule for when a field counts as a range: the variations
disagree with each other, or they agree but on something other than the reaction's own value.

Only fields with a numeric value are covered. Free text has no range between two of its values, and
the fields holding it - description, observation, purification details, conditions - are left
editable.
*/

const NO_RANGE = { min: null, max: null, isRangeField: false };

/**
 * @param {Array} variations - the reaction's variations, in the internal
 *   `{ idx, data: Reaction }` shape the scheme tab is handed.
 * @param {Function} valueGetter - reads the field off one variation's reaction. Anything that is
 *   not a finite number is skipped, which is how a field that is text in some variations - a
 *   temperature of "reflux", say - stays out of the range.
 * @param {*} currentValue - what the reaction itself holds, for the same field.
 */
const findVariationRange = (variations, valueGetter, currentValue) => {
  if (!variations?.length) {
    return NO_RANGE;
  }

  const values = variations
    .map((variation) => valueGetter(variation.data))
    // An unset field is absent from the range, not zero in it: Number(null) and Number('') are 0.
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return NO_RANGE;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  return { min, max, isRangeField: min !== max || min !== Number(currentValue) };
};

// Long decimals would not fit the inputs these ranges are shown in, and the exact digits are not
// what the range is there to convey.
const formatRangeValue = (value) => (
  Number.isInteger(value) ? `${value}` : `${parseFloat(value.toFixed(4))}`
);

/*
The material inputs are narrower still, so there a range's ends are cut to four significant digits -
fewer decimals the larger the number, never fewer than its whole digits: 183.6726 is 183.7 and 12345.6
is 12346. The full range is in the field's tooltip (see VariationRangeInput).
*/
const compactRangeNumber = (value) => {
  if (!Number.isFinite(value)) return 'n.d.';
  const magnitude = Math.abs(value);
  if (magnitude === 0) return '0';
  if (magnitude < 0.0001) return value.toExponential(2);
  if (magnitude < 1) return `${parseFloat(value.toPrecision(4))}`;
  const wholeDigits = Math.floor(Math.log10(magnitude)) + 1;
  return value.toLocaleString('en-US', {
    maximumFractionDigits: Math.max(0, 4 - wholeDigits),
    useGrouping: false,
  });
};

const joinRange = (min, max, format) => (min === max ? format(min) : `${format(min)}-${format(max)}`);

/**
 * What a ranged field shows in place of its value. Variations that agree with each other but not
 * with the reaction give a single value rather than a range of one.
 */
const variationRangeText = ({ min, max }) => joinRange(min, max, formatRangeValue);

// The same, shortened to fit a material input.
const compactVariationRangeText = ({ min, max }) => joinRange(min, max, compactRangeNumber);

export {
  findVariationRange, variationRangeText, compactVariationRangeText, compactRangeNumber,
};
