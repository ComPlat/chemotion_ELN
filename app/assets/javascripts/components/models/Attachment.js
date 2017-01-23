import Element from './Element';

export default class Attachment extends Element {

  static fromFile(file) {
    return new Attachment(
      {
        file: file,
        name: file.name,
        filename: file.name,
        identifier: file.id,
        is_deleted: false,
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
      filename: this.filename,
      identifier: this.identifier,
      file: this.file,
      is_deleted: this.is_deleted,
    })
  }

}
