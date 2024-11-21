import { types } from 'mobx-state-tree';

const messageAttachment = types.model({
  id: types.union(types.string, types.integer),
  filename: types.string,
  identifier: types.union(types.string, types.integer),
  content_type: types.string,
  thumb: types.boolean,
  filesize: types.integer,
  created_at: types.string,
  updated_at: types.string,
  preview: types.maybeNull(types.string)
});

const messageContent = types.model({
  attachment: types.frozen(messageAttachment)
});

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
  content: types.frozen(messageContent)
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
      return self.messages.map((element) => element.content.attachment || []).flat();
    },
    getCombinedAttachments(attachmentsFromElement, elementContext, element) {
      self.getAttachmentsOfMessages().forEach((attachment) => {
        const attachmentAlreadyInElement = attachmentsFromElement.find((a) => a.id === attachment.id);
        const forCurrentElement = element.id === attachment.attachable_id
          && attachment.attachable_type === elementContext;
        if (!attachmentAlreadyInElement && forCurrentElement) {
          const copiedAttachment = { ...attachment };
          copiedAttachment.is_deleted = false;
          attachmentsFromElement.push(copiedAttachment);
          if (element.attachments) {
            element.attachments.push(copiedAttachment);
          }
        }
      });
      return attachmentsFromElement;
    },
  }));
