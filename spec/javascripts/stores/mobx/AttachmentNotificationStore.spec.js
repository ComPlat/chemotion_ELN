import expect from 'expect';
import { AttachmentNotificationStore } from 'src/stores/mobx/AttachmentNotificationStore';
import AttachmentNotificationFactory from 'factories/AttachmentNotificationFactory';

describe('AttachmentNotificationStore', async () => {
  const message1 = await AttachmentNotificationFactory.build('xxx',{id:1});
  const message2 = await AttachmentNotificationFactory.build('xxx',{id:2,receiver_id: 3});
  const message3 = await AttachmentNotificationFactory.build('xxx',{id:3,subject: "Subject 3"});

  describe('.addMessage', async () => {
    describe('when 3 different messages are added', async () => {
      it('3 messages should be in store', async () => {
        const store = AttachmentNotificationStore.create({ messages: [] });
        store.addMessage(message1);
        store.addMessage(message2);
        store.addMessage(message3);
        expect(store.messages.length).toBe(3);
      });
    });
    describe('when 2 times the same message is added', async () => {
      it('only one message should be in store', async () => {
        const store = AttachmentNotificationStore.create({ messages: [] });
        store.addMessage(message1);
        store.addMessage(message1);
        expect(store.messages.length).toBe(1);
      });
    });
  });
});
