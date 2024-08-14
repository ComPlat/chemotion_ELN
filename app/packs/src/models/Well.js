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
    const rowLabels = [
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), // row 1-26
      ...'AA AB AC AD AE AF AG AH AI AJ AK AL AM AN AO AP AQ AR AS AT AU AV AW AX AY AZ'.split(' '), // row 27-52
      ...'BA BB BC BD BE BF BG BH BI BJ BK BL BM BN BO BP BQ BR BS BT BU BV BW BX BY BZ'.split(' '), // row 53-78
      ...'CA CB CC CD CE CF CG CH CI CJ CK CL CM CN CO CP CQ CR CS CT CU CV CW CX CY CZ'.split(' ')  // row 79-104
    ]
    const positionY = rowLabels[this.position.y - 1];
    const position = positionY + this.position.x;

    return position
  }
}
