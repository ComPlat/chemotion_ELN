import Element from './Element';

export default class Literature extends Element {
  static buildEmpty() {
    return new Literature({
      title: '',
      url: ''
    })
  }

  serializeLiterature() {
    return({
      id: this.id,
      title: this.title,
      url: this.url,
      is_new: this.isNew || false,
    });
  }
}
