# frozen_string_literal: true

describe Message do
  let(:sender) { create(:person) }
  let(:receiver) { create(:person) }
  let(:other_receiver) { create(:person) }
  let(:channel) { create(:channel, channel_type: 8) }

  describe '.create_msg_notification' do
    it 'creates the message and a notification per receiver' do
      expect do
        described_class.create_msg_notification(
          channel_id: channel.id,
          message_content: { data: 'hello' },
          message_from: sender.id,
          message_to: [receiver.id, other_receiver.id],
        )
      end.to change(described_class, :count).by(1)
         .and change(Notification, :count).by(2)

      expect(Notification.where(user_id: [receiver.id, other_receiver.id]).count).to eq(2)
    end

    # bulk_create_notifications used to build its SQL by interpolating channel_id/message_id/
    # user_id/receiver_ids straight into the query string. It now runs every id through
    # Integer(...) before it ever reaches SQL text, so anything that is not a clean integer blows
    # up here instead of being silently smuggled into the query.
    it 'raises rather than build a query from a non-integer receiver id' do
      expect do
        described_class.create_msg_notification(
          channel_id: channel.id,
          message_content: { data: 'hello' },
          message_from: sender.id,
          message_to: ["#{receiver.id}); select 1"],
        )
      end.to raise_error(ArgumentError)
    end
  end
end
