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
      id : Element.buildID(),
      is_new : true
    });
  }
}
