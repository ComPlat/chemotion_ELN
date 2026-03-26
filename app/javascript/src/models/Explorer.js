import Element from 'src/models/Element';

export default class Explorer extends Element {
  static buildEmpty() {
    let explorer = new Explorer({
      type: 'explorer'
    });

    return explorer;
  }
}
