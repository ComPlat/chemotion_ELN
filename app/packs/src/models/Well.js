/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Sample from 'src/models/Sample';
import Wellplate from 'src/models/Wellplate';

export default class Well extends Element {
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

  get alphanumericPosition() {
    const positionY = Wellplate.rowLabel(this.position.y)
    const position = positionY + this.position.x;

    return position
  }
}
