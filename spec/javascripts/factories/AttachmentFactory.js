import { factory } from 'factory-bot';
import Attachment from 'src/models/Attachment';
import Element from 'src/models/Element';

export default class AttachmentFactory {
  static instance = undefined;

  static build(...args) {
    if (AttachmentFactory.instance === undefined) {
      AttachmentFactory.instance = new AttachmentFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('new', Attachment, {
      id: parseInt(Element.buildID(), 10),
      is_new: true,
      updated_at: new Date(),
      filename: 'test.png',
      updatedAnnotation: false,
      is_deleted: false,
      preview: 'originalPreviewData',
      content_type: 'none',
      aasm_state: '',
      filesize: 123456,
      thumb: true
    });
  }
}
