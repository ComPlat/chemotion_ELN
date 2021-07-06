import Element from './Element';

export default class Format extends Element {
  static buildEmpty() {
    return new Format({ type: 'format' });
  }
}
