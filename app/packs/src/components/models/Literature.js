import Element from './Element';

export default class Literature extends Element {
  static buildEmpty() {
    return new Literature({
      title: '',
      url: '',
      doi: '',
      isbn: '',
      litype: '',
      type: 'literature',
      is_new: false,
      refs: {}
    });
  }

  serialize() {
    return ({
      id: this.id,
      title: this.title,
      url: this.url,
      doi: this.doi,
      isbn: this.isbn,
      litype: this.litype,
      type: this.type,
      is_new: this.isNew || false,
      refs: this.refs || {}
    });
  }
}
