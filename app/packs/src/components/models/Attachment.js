import Element from './Element';
import { filePreview } from '../../helper/index';

export default class Attachment extends Element {
  static fromFile(file) {
    return new Attachment({
      file,
      name: file.name,
      filename: file.name,
      identifier: file.id,
      is_deleted: false,
      preview: filePreview(file),
    });
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
      thumb: this.thumb,
      content_type: this.content_type,
      is_deleted: this.is_deleted,
    });
  }
}
