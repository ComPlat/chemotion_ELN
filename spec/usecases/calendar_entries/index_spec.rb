# frozen_string_literal: true

require 'spec_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet
RSpec.describe Usecases::CalendarEntries::Index do
  describe '#perform!' do
    let(:time) { Time.zone.parse('2023-06-01 13:00:00') }

    let(:user1) { create(:person) }
    let(:user2) { create(:person) }
    let(:user3) { create(:person) }
    let(:collection1) do
      create(:collection, user: user1).tap do |collection|
        create(:collection_share, collection: collection, shared_with: user3)
      end
    end
    let(:collection2) do
      create(:collection, user: user1, parent: collection1).tap do |collection|
        create(:collection_share, collection: collection, shared_with: user2)
      end
    end
    let(:collection3) { create(:collection, user: user3) }

    let(:sample1) { create(:sample, collections: [collection1, collection2]) }
    let(:sample2) { create(:sample, collections: [collection3]) }

    let(:reaction1) { create(:reaction, collections: [collection1]) }

    let(:user1_reaction1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        creator: user1,
        eventable: reaction1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user1_sample1_calendar_entry_in_range) do
      create(
        :calendar_entry,
        creator: user1,
        eventable: sample1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user1_sample1_calendar_entry_out_of_range) do
      create(
        :calendar_entry,
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
        creator: user2,
        eventable: sample1,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:user3_sample2_calendar_entry_in_range) do
      create(
        :calendar_entry,
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
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet
