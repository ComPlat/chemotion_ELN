import Element from './Element';

export default class GenericSubField extends Element {
  static buildEmpty() {
    return new GenericSubField({ type: 'text', value: '' });
  }
}
