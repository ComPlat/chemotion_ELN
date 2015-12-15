import Element from './Element';
import Sample from './Sample';

export default class Well extends Element {
  serialize() {
    return super.serialize({
      position: this.position,
      readout: this.readout,
      sample: this.sample && new Sample(this.sample).serialize()
    })
  }

  set sample(sample) {
    if(sample) {
      this._sample = new Sample(sample);
    }
  }

  get sample() {
    return this._sample;
  }


}
