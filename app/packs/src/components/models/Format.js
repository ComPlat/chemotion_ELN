import Element from 'src/components/models/Element';

export default class Format extends Element {
  static buildEmpty() {
    return new Format({ type: 'format' });
  }
}
