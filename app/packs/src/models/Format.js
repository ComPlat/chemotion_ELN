import Element from 'src/models/Element';

export default class Format extends Element {
  static buildEmpty() {
    return new Format({ type: 'format' });
  }
}
