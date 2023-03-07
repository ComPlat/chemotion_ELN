import Element from 'src/models/Element';
import { formatBytes } from 'src/utilities/MathUtils';

export default class Attachment extends Element {
  static NO_PREVIEW_AVAILABLE_PATH = '/images/wild_card/not_available.svg';

  static filePreview(file) {
    if (!file.type) { return Attachment.NO_PREVIEW_AVAILABLE_PATH; }
    return file.type.split('/')[0] === 'image' ? file.preview : Attachment.NO_PREVIEW_AVAILABLE_PATH;
  }

  static fromFile(file) {
    return new Attachment(
      {
        file,
        name: file.name,
        filename: file.name,
        is_deleted: false,
        preview: Attachment.filePreview(file),
        is_image_field: false,
        filesize: file.size,
      }
    );
  }

  constructor(args) {
    super(args);
    this.identifier = this.id;
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
