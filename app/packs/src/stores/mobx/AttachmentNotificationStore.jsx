import { types } from 'mobx-state-tree';

const messageModel = types.model({
  id: types.integer,
  message_id: types.integer,
  subject: types.string,
  channel_type: types.integer,
  sender_id: types.integer,
  sender_name: types.string,
  reciever_id: types.integer,
  is_ack: types.integer,
  created_at: types.string,
  updated_at: types.string
});

// eslint-disable-next-line import/prefer-default-export
export const AttachmentNotificationStore = types
  .model({ messages: types.array(messageModel) })
  .views((self) => ({
    messageAmount() {
      return `Messages ${self.messages.length}`;
    }
  }))
  .actions((self) => ({
    addMessage(newMessage) {
      const existingMessage = self.messages.find((message) => message.id === newMessage.id);
      if (!existingMessage) {
        self.messages.push(newMessage);
      }
    }
  }));
