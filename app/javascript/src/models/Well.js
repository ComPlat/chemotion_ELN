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
   */
  get hasContent() {
    if (this.sample) return true;
    if (this.additive) return true;
    if (this.color_code) return true;
    if (this.label && this.label !== Well.DEFAULT_LABEL) return true;

    return (this.readouts || []).some((readout) => readout && (readout.value || readout.unit));
  }

  get alphanumericPosition() {
    const positionY = Wellplate.rowLabel(this.position.y)
    const position = positionY + this.position.x;

    return position
  }
}
