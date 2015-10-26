import Element from './Element';
import Attachment from './Attachment';

export default class Dataset extends Element {
  static buildEmpty() {
    return new Dataset({
      name: 'new Dataset',
      type: 'dataset',
      instrument: '',
      description: '',
      attachments: []
    })
  }

  serialize() {
    return super.serialize({
      name: this.name,
      instrument: this.instrument,
      description: this.description,
      attachments: this.attachments.map(a => a.serialize())
    })
  }

  clone() {
    return new Dataset(this);
  }

  get attachments() {
    return this._attachments;
  }

  set attachments(attachments) {
    this._attachments = attachments.map(a => new Attachment(a));
  }

}
