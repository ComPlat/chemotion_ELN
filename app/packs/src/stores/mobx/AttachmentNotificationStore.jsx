import { types } from 'mobx-state-tree';

const messageModel = types.model({
  id: types.integer,
  message_id: types.integer,
  subject: types.string,
  channel_type: types.integer,
  sender_id: types.integer,
  sender_name: types.string,
  receiver_id: types.integer,
  is_ack: types.integer,
  created_at: types.string,
  updated_at: types.string,
  content: types.frozen(messageAttachment)
});

const messageAttachment=types.model({
  id: types.integer,
  filename: types.string,
  identifier: types.string,
  content_type: types.string,
  thumb: types.boolean,
  aasm_state: types.string,
  filesize: types.integer,
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
      const channelTypeCorrect = newMessage.channel_type === 8
        && newMessage.subject === 'Send TPA attachment arrival notification';
      if (!existingMessage && channelTypeCorrect) {
        self.messages.push(newMessage);
      }
    },
    clearMessages() {
      self.messages = [];
    }
  })).views((self) => ({
    getAttachmentsOfMessages() {
      return self.messages.map((element) => {
        return element.content.attachment || [];
      }).flat();
    }
  }));
