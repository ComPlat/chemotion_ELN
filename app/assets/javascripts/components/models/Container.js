import Element from './Element';
import Dataset from './Dataset';
import Attachment from './Attachment';

export default class Container extends Element {
  static buildEmpty() {
    return new Container({
      name: 'new Container',
      children: [],
      attachments: []
    })
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get children() {
    return this._children;
  }

  set children(children) {
      this._children = children;
  }

  get attachments() {
    return this._attachments;
  }

  set attachments(attachments) {
      this._attachments = attachments.map(a => new Attachment(a));;
  }

  serialize() {
    return super.serialize({
      name: this.name,
      attachments: this.attachments.map(a => a.serialize())
    })
  }

}
