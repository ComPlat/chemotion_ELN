import Element from './Element';

export default class Attachment extends Element {

  static fromFile(file) {
    return new Attachment(
      {
        file: file,
        //name: file.name,
        filename: file.name, //neu
        identifier: file.id,
        preview: file.preview
      }
    )
  }

  get preview() {
    return this._preview;
  }

  set preview(preview) {
    this._preview = preview;
  }

  serialize() {
    return super.serialize({
      //name: this.name,
      filename: this.filename,
      identifier: this.identifier,
      file: this.file
    })
  }

}
