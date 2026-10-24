import Element from 'src/models/Element';
import Sample from 'src/models/Sample';

export default class ElementFactory {
  static createElement(type) {
    switch (type) {
      case 'sample':
        return Sample.buildEmpty();
      default:
        return new Element();
    }
  }
}
