/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Sample from 'src/models/Sample';
import Wellplate from 'src/models/Wellplate';

export default class Well extends Element {
  serialize() {
    return super.serialize({
      position: this.position,
      readouts: this.readouts || [],
      sample: this.sample && new Sample(this.sample).serialize()
    });
  }

  set sample(sample) {
    this._sample = (sample) ? new Sample(sample) : null;
  }

  get sample() {
    return this._sample;
  }

  get alphanumericPosition() {
    const positionY = Wellplate.rowLabel(this.position.y)
    const position = positionY + this.position.x;

    return position
  }
}
