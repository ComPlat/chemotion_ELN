import { factory } from 'factory-bot';
import Attachment from 'src/models/Attachment';
import PseudoRandomUUIDGenerator from 'factories/PseudoRandomUUIDGenerator';
import sha256 from 'sha256';

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

    this.factory.define(
      'new',
      Attachment,
      async () => {
        const attachment = new Attachment();
        attachment.id = PseudoRandomUUIDGenerator.createNextUUID();
        attachment.is_new = true;
        return attachment;
      },
      {
        afterBuild: (model, attrs, buildOptions) => {
          model.updateChecksum(sha256(PseudoRandomUUIDGenerator.createNextUUID()));
          return model;
        }
      }
    );
  }
}
