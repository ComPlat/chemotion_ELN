import Element from './Element';
import uuid from 'uuid';

export default class Device extends Element{
  static buildEmpty() {
    return new Device({
      type: 'device',
      code: uuid.v1(),
      types: [],
      samples: [],
      // title: ""
    })
  }
}
