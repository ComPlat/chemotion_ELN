import Element from './Element';
import Dataset from './Dataset';

export default class Container extends Element {
  static buildEmpty() {
    return new Container({
      name: 'new Container'

    })
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  serialize() {
    return super.serialize({
      name: this.name,
    })
  }

}
