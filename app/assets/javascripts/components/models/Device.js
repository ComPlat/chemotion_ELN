import Element from './Element';

export default class Device extends Element {
  static buildEmpty() {
    return new Device({
      type: 'device'
    })
  }
}
