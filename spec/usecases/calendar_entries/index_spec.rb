# frozen_string_literal: true

require 'spec_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers
RSpec.describe Usecases::CalendarEntries::Index do
  describe '#perform!' do
    let(:time) { Time.zone.parse('2023-06-01 13:00:00') }

    let(:user1) { create(:person) }
    let(:user2) { create(:person) }
    let(:user3) { create(:person) }

    let(:sample1) { create(:sample) }
    let(:sample2) { create(:sample) }

    let(:reaction1) { create(:reaction) }

    let(:user1_reaction1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :reaction,
        creator: user1,
        eventable: reaction1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user1_sample1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :sample,
        creator: user1,
        eventable: sample1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user1_sample1_calendar_entry_out_of_range) do
      create(
        :calendar_entry,
        :sample,
        creator: user1,
        eventable: sample1,
        start_time: time + 2.hours,
        end_time: time + 3.hours,
      )
    end
    let(:user1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        creator: user1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user2_sample1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :sample,
        creator: user2,
        eventable: sample1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user3_sample2_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :sample,
        creator: user3,
        eventable: sample2,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end

    before do
      user1_reaction1_calendar_entry_in_range
      user1_sample1_calendar_entry_in_range
      user1_sample1_calendar_entry_out_of_range
      user1_calendar_entry_in_range
      user2_sample1_calendar_entry_in_range
      user3_sample2_calendar_entry_in_range

      collection1 = create(:collection, user: user1)
      sample1.collections_samples.create(collection: collection1)
      reaction1.collections_reactions.create(collection: collection1)

      collection2 = create(
        :collection,
        user: user2,
        shared_by_id: user1.id,
        is_shared: true,
        is_locked: true,
        parent: collection1,
      )
      sample1.collections_samples.create(collection: collection2)

      collection3 = create(:collection, user: user3)
      sample2.collections_samples.create(collection: collection3)

      sync_collection = collection1.sync_collections_users.create(user: user3, sharer: user1)
      collection4 = create(
        :collection,
        user: user3,
        shared_by_id: user1.id,
        is_locked: true,
        is_shared: true,
      )
      sync_collection.update(fake_ancestry: collection4.id.to_s)
    end

    context 'when setting eventable to sample1' do
      let(:params) do
        {
          start_time: time + 30.minutes,
          end_time: time + 1.hour,
          eventable_id: sample1.id,
          eventable_type: 'Sample',
          with_shared_collections: false,
        }
      end

      it 'returns all available entries' do
        expect(described_class.new(user: user1, params: params).perform!.pluck(:id).sort).to eq [
          user1_reaction1_calendar_entry_in_range.id,
          user1_sample1_calendar_entry_in_range.id,
          user1_calendar_entry_in_range.id,
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user2, params: params).perform!.pluck(:id).sort).to eq [
          user1_sample1_calendar_entry_in_range.id,
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user3, params: params).perform!.pluck(:id).sort).to eq [
          user3_sample2_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'when setting eventable to sample2' do
      let(:params) do
        {
          start_time: time + 30.minutes,
          end_time: time + 1.hour,
          eventable_id: sample2.id,
          eventable_type: 'Sample',
          with_shared_collections: false,
        }
      end

      it 'returns all available entries' do
        expect(described_class.new(user: user1, params: params).perform!.pluck(:id).sort).to eq [
          user1_reaction1_calendar_entry_in_range.id,
          user1_sample1_calendar_entry_in_range.id,
          user1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user2, params: params).perform!.pluck(:id).sort).to eq [
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user3, params: params).perform!.pluck(:id).sort).to eq [
          user3_sample2_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'when setting with shared collections to true' do
      let(:params) do
        {
          start_time: time + 30.minutes,
          end_time: time + 1.hour,
          eventable_id: nil,
          eventable_type: nil,
          with_shared_collections: true,
        }
      end

      it 'returns all available entries' do
        expect(described_class.new(user: user1, params: params).perform!.pluck(:id).sort).to eq [
          user1_reaction1_calendar_entry_in_range.id,
          user1_sample1_calendar_entry_in_range.id,
          user1_calendar_entry_in_range.id,
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user2, params: params).perform!.pluck(:id).sort).to eq [
          user1_sample1_calendar_entry_in_range.id,
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user3, params: params).perform!.pluck(:id).sort).to eq [
          user1_reaction1_calendar_entry_in_range.id,
          user1_sample1_calendar_entry_in_range.id,
          user2_sample1_calendar_entry_in_range.id,
          user3_sample2_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'when using only the time range' do
      let(:params) do
        {
          start_time: time + 30.minutes,
          end_time: time + 1.hour,
          eventable_id: nil,
          eventable_type: nil,
          with_shared_collections: false,
        }
      end

      it 'returns all available entries' do
        expect(described_class.new(user: user1, params: params).perform!.pluck(:id).sort).to eq [
          user1_reaction1_calendar_entry_in_range.id,
          user1_sample1_calendar_entry_in_range.id,
          user1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user2, params: params).perform!.pluck(:id).sort).to eq [
          user2_sample1_calendar_entry_in_range.id,
        ].sort
        expect(described_class.new(user: user3, params: params).perform!.pluck(:id).sort).to eq [
          user3_sample2_calendar_entry_in_range.id,
        ].sort
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
