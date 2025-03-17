/* eslint-disable import/no-unresolved,no-underscore-dangle */
import { factory } from '@eflexsystems/factory-bot';
import AttachmentFactory from '@tests/factories/AttachmentFactory';
import AttachmentNotification from '@tests/factories/models/AttachmentNotification';

export default class AttachmentNotificationFactory {
  static instance = undefined;

  static async build(...args) {
    if (AttachmentNotificationFactory.instance === undefined) {
      AttachmentNotificationFactory.instance = new AttachmentNotificationFactory();
    }
    AttachmentFactory.build('AttachmentFactory.notificationAttachment');

    const model = await AttachmentNotificationFactory.instance.factory.build(...args);
    // I deconstruct the class object here because the store needs a plain js object

    return { ...model };
  }

  constructor() {
    this.factory = factory;

    this.factory.define('AttachmentNotificationFactory.new', AttachmentNotification, async () => {
      const model = {
        id: factory.sequence('AttachmentNotificationFactory.id', (n) => n),
        message_id: 101,
        subject: 'Send TPA attachment arrival notification',
        channel_type: 8,
        sender_id: 1,
        sender_name: 'Sender 1',
        receiver_id: 2,
        is_ack: 0,
        created_at: '2023-07-01T12:00:00Z',
        updated_at: '2023-07-01T12:00:00Z',
        content:{}

      };

      const attachment = await AttachmentFactory.build('AttachmentFactory.notificationAttachment');
      delete attachment._checksum;
      // I deconstruct the class object here because the store needs a plain js object
      model.content.attachment = { ...attachment };
      return model;
    });
  }
}
