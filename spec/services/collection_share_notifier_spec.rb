# frozen_string_literal: true

RSpec.describe CollectionShareNotifier do
  let(:actor) { create(:person) }
  let(:recipient) { create(:person) }
  let(:notifier) { described_class.new(actor) }

  # Seeded in production by a data migration that db:schema:load never runs, so specs that exercise
  # notify! have to seed it themselves too (same pattern as collection_share_api_spec.rb).
  before { create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8) }

  describe '#notify!' do
    it 'creates a message and a notification for the recipient' do
      expect do
        notifier.notify!(recipient.id, 'hello')
      end.to change(Message, :count).by(1)
         .and change(Notification.where(user_id: recipient.id), :count).by(1)
    end

    it 'defaults to verbose (silent: false)' do
      notifier.notify!(recipient.id, 'hello')

      expect(Message.last.content['silent']).to be(false)
    end

    it 'records silent: true when asked' do
      notifier.notify!(recipient.id, 'hello', silent: true)

      expect(Message.last.content['silent']).to be(true)
    end

    it 'accepts a single id or an array of ids' do
      other_recipient = create(:person)

      expect do
        notifier.notify!([recipient.id, other_recipient.id], 'hello')
      end.to change(Notification, :count).by(2)
    end

    it 'is a no-op when user_ids is blank' do
      expect { notifier.notify!(nil, 'hello') }.not_to change(Message, :count)
      expect { notifier.notify!([], 'hello') }.not_to change(Message, :count)
    end

    it 'is a no-op when the Shared Collection With Me channel is missing' do
      Channel.find_by(subject: Channel::SHARED_COLLECTION_WITH_ME).destroy!

      expect { notifier.notify!(recipient.id, 'hello') }.not_to change(Message, :count)
    end
  end
end
