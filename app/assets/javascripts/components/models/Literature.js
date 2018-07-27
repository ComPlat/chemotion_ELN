import Element from './Element';

export default class Literature extends Element {
  static buildEmpty() {
    return new Literature({
      title: '',
      url: '',
      doi: '',
      type: 'literature'
    })
  }

  serialize() {
    return({
      id: this.id,
      title: this.title,
      url: this.url,
      doi: this.doi,
      is_new: this.isNew || false,
      refs: this.refs || {}
    });
  }
}
