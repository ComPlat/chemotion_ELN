import Element from 'src/models/Element';
export default class AttachmentNotification extends Element{
    id
    message_id
    subject
    channel_type
    sender_id
    sender_name
    reciever_id
    is_ack
    created_at
    updated_at

    constructor(args) {
        super(args);
        this.identifier = this.id;
      }
}