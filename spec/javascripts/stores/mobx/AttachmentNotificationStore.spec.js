import expect from 'expect';
import { AttachmentNotificationStore } from 'src/stores/mobx/AttachmentNotificationStore';


describe('AttachmentNotificationStore', async () => {
  describe('.addMessage', async () => {
    describe('when 3 different messages are added', async () => {
      it('3 messages should be in store', async () => {
        const store = AttachmentNotificationStore.create({});
        expect(store.messages.length).toBe(3);
      });
    });
    describe('when 2 times the same message is added', async () => {
      it('3 messages should be in store', async () => {
        const store = AttachmentNotificationStore.create({});
        expect(store.messages.length).toBe (1);
      });
    });
  });
});
