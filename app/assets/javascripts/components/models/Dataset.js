import Element from './Element';

export default class Dataset extends Element {
  static buildEmpty() {
    return new Dataset({
      name: 'new Dataset',
      type: 'dataset',
      instrument: '',
      description: '',
      files: []
    })
  }

  serialize() {
    return super.serialize({
      name: this.name,
      instrument: this.instrument,
      description: this.description,
      files: this.files
    })
  }

  clone() {
    return new Dataset(this);
  }
}
