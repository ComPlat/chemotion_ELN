/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Sample from 'src/models/Sample';
import Wellplate from 'src/models/Wellplate';

export default class Well extends Element {
  // Mirrors the wells.label column default; see `hasContent`.
  static get DEFAULT_LABEL() {
    return 'Molecular structure';
  }

  serialize() {
    return super.serialize({
      position: this.position,
      readouts: this.readouts || [],
      sample: this.sample && new Sample(this.sample).serialize(),
      color_code: this.color_code,
      label: this.label
    });
  }

  set sample(sample) {
    this._sample = (sample) ? new Sample(sample) : null;
  }

  get sample() {
    return this._sample;
  }

  get color_code() {
    return this._color_code;
  }

  set color_code(colorCode) {
    this._color_code = colorCode;
  }

  get label() {
    return this._label;
  }

  set label(label) {
    this._label = label;
  }

  /**
   * Whether the well holds anything a user put there.
   *
   * Mirrors Well#content? on the server, which is the authority. Both `label`
   * and `readouts` have non-null column defaults, so a bare presence check
   * would report every untouched well as occupied and make shrinking a
   * wellplate impossible.
   *
   * `additive`, `color_code` and `label` are exposed at detail level 10, so
   * below that WellEntity hands back the '***' placeholder for them. Counting
   * a placeholder as content would mark every well of such a plate occupied -
   * `label` alone would do it - and grey out every smaller size.
   */
  get hasContent() {
    if (this.sample) return true;
    if (this.additive && !this.isMethodDisabled('additive')) return true;
    if (this.color_code && !this.isMethodDisabled('color_code')) return true;
    if (this.label && this.label !== Well.DEFAULT_LABEL && !this.isMethodDisabled('label')) return true;

    // Array.isArray, not a truthiness check: readouts is exposed at
    // anonymize_below 1, so below that detail level the entity hands back the
    // '***' placeholder string and `.some` would not exist. Any non-array is
    // treated as "no readouts we can read", which is the safe reading.
    if (!Array.isArray(this.readouts)) return false;

    return this.readouts.some((readout) => readout && (readout.value || readout.unit));
  }

  get alphanumericPosition() {
    // Mirrors Well#alphanumeric_position on the server. A well with no usable
    // position is reachable here: positionOutside deliberately counts one as
    // outside any grid, so it can reach the "these wells block the resize"
    // message. Without this, rowLabel(null) is undefined and the position
    // renders as NaN - or throws outright when position itself is absent.
    if (!this.position || this.position.x == null || this.position.y == null) return 'n/a';

    const positionY = Wellplate.rowLabel(this.position.y)
    const position = positionY + this.position.x;

    return position
  }
}
