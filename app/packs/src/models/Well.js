/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Sample from 'src/models/Sample';

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
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const positionY = alphabet[this.position.y - 1];
    const position = positionY + this.position.x;

    return position
  }
}
