import Element from './Element';
//import Attachment from './Attachment';

export default class Dataset extends Element {
  static buildEmpty() {
    return new Dataset({
      name: 'new Dataset',
      instrument: '',
      description: '',
      files: []
    })
  }
}
