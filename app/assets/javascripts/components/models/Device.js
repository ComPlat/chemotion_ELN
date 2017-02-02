import Element from './Element';
import Sample from './Sample';
import uuid from 'uuid';

export default class Device extends Element{
  constructor({id, title, code, types, user_id, samples}) {
    const device = {
      id,
      title,
      code,
      types,
      user_id,
      type: 'device',
      samples: samples.map(sample => new Sample(sample)),
    }
    super(device)
  }

  static buildEmpty() {
    return new Device({
      type: 'device',
      code: "",
      types: [],
      samples: [],
      title: "New Device"
    })
  }
}
