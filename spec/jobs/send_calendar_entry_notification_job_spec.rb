# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SendCalendarEntryNotificationJob do
  describe 'perform' do
    let(:user1) { create(:person) }
    let(:user2) { create(:person) }
    let(:sample_calendar_entry) { create(:calendar_entry, :sample) }
    let(:sample) { sample_calendar_entry.eventable }

    it 'sends emails and creates notifications to given users' do
      collection1 = create(:collection, user_id: user1.id)
      sample.collections_samples.create(collection_id: collection1.id)

      collection2 = create(:collection, user_id: user2.id)
      sample.collections_samples.create(collection_id: collection2.id)

      Channel.create_with(
        channel_type: 8,
        msg_template: {
          data: '%{creator_name} %{type} calendar entry %{kind}: %{range} %{title}.',
          action: 'CalendarActions.navigateToElement',
          eventable_type: '%{eventable_type}',
          eventable_id: '%{eventable_id}',
        },
      ).find_or_create_by(subject: Channel::CALENDAR_ENTRY)

      expect([ActionMailer::Base.deliveries.count, Message.count]).to eq [0, 0]

      described_class.perform_now(sample_calendar_entry.id, [user1.id, user2.id], :created)

      expect([ActionMailer::Base.deliveries.count, Message.count]).to eq [2, 2]
    end
  end
end
