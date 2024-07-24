import expect from 'expect';
import { types } from "mobx-state-tree";
import { AttachmentNotificationStore } from 'src/stores/mobx/AttachmentNotificationStore';
import AttachmentNotificationFactory from 'factories/AttachmentNotificationFactory';




const message2 = {
  id: 2,
  message_id: 102,
  subject: "Subject 2",
  channel_type: 2,
  sender_id: 2,
  sender_name: "Sender 2",
  reciever_id: 3,
  is_ack: 1,
  created_at: "2023-07-02T12:00:00Z",
  updated_at: "2023-07-02T12:00:00Z"
};

const message3 = {
  id: 3,
  message_id: 103,
  subject: "Subject 3",
  channel_type: 3,
  sender_id: 3,
  sender_name: "Sender 3",
  reciever_id: 4,
  is_ack: 0,
  created_at: "2023-07-03T12:00:00Z",
  updated_at: "2023-07-03T12:00:00Z"
};

describe('AttachmentNotificationStore', async () => {
  describe('.addMessage', async () => {
    describe('when 3 different messages are added', async () => {
      it('3 messages should be in store', async () => {
        
        const store = AttachmentNotificationStore.create({ messages: [] });
      
        const message1 = await AttachmentNotificationFactory.build('AttachmentNotificationFactory.new');
        console.log(message1);
        store.addMessage(message1);
        store.addMessage(message2);
        store.addMessage(message3);
        expect(store.messages.length).toBe(3);
      });
    });
    describe('when 2 times the same message is added', async () => {
      it('3 messages should be in store', async () => {
        const store = AttachmentNotificationStore.create({ messages: [] });
        store.addMessage(message1);
        store.addMessage(message1);
        expect(store.messages.length).toBe(1);
      });
    });
  });
});
