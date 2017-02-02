import Element from './Element';
import uuid from 'uuid';

export default class Device extends Element{
  constructor(args) {
    super({
      type: 'device',
      types: [],
      samples: [],
      ...args,
    })
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
