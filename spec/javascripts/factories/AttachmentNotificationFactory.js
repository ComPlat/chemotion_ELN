import { factory } from 'factory-bot';
import Element from 'src/models/Element';
import AttachmentNotification from './models/AttachmentNotification';

export default class AttachmentNotificationFactory {
  static instance = undefined;

  static async build(...args) {
    if (AttachmentNotificationFactory.instance === undefined) {
      AttachmentNotificationFactory.instance = new AttachmentNotificationFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;
  

    this.factory.define('AttachmentNotificationFactory.new',AttachmentNotification, {
      id: parseInt(Element.buildID(), 10),
      message_id: 101,
      subject: "Subject 1",
      channel_type: 1,
      sender_id: 1,
      sender_name: "Sender 1",
      reciever_id: 2,
      is_ack: 0,
      created_at: "2023-07-01T12:00:00Z",
      updated_at: "2023-07-01T12:00:00Z"
    });
  }
}
