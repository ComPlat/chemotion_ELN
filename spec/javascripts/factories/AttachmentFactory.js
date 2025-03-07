import { factory } from '@eflexsystems/factory-bot';
import Attachment from '@src/models/Attachment';
import Element from '@src/models/Element';

export default class AttachmentFactory {
  static instance = undefined;

  static async build(...args) {
    if (AttachmentFactory.instance === undefined) {
      AttachmentFactory.instance = new AttachmentFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('AttachmentFactory.new', Attachment, {
      id: factory.sequence('AttachmentFactory.id', (n) => n),
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

    this.factory.define('AttachmentFactory.notificationAttachment', Attachment, {
      id: factory.sequence('AttachmentFactory.id', (n) => n),
      filename: 'MyAttachment',
      identifier: 'myIdentifier',
      content_type: 'image/png',
      thumb: true,
      filesize: 1485,
      created_at: '08.07.2024, 14:01:25 +0000',
      updated_at: '08.07.2024, 14:01:25 +0000',
      preview: 'myPreview'
    });
  }
}
