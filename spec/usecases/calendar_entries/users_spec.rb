# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CalendarEntries::Users do
  describe '#perform!' do
    let(:user) { create(:person) }
    let(:another_user) { create(:person) }
    let(:sample) { create(:sample) }
    let(:calendar_entry) { create(:calendar_entry, :sample, creator: user, eventable: sample) }

    before do
      calendar_entry

      collection = create(:collection, user_id: user.id)
      sample.collections_samples.create(collection_id: collection.id)

      collection = create(:collection, user_id: another_user.id)
      sample.collections_samples.create(collection_id: collection.id)
    end

    context 'when using invalid parameters' do
      let(:params) do
        {
          eventable_id: nil,
          eventable_type: nil,
        }
      end

      it 'returns no users' do
        expect(described_class.new(user: user, params: params).perform!.count).to eq 0
      end
    end

    context 'when using not allowed eventable_type' do
      let(:params) do
        {
          eventable_id: sample.id,
          eventable_type: 'Test',
        }
      end

      it 'returns no users' do
        expect(described_class.new(user: user, params: params).perform!.count).to eq 0
      end
    end

    context 'when using valid parameters' do
      let(:params) do
        {
          eventable_id: sample.id,
          eventable_type: 'Sample',
        }
      end

      it 'returns all affected users' do
        expect(described_class.new(user: user, params: params).perform!.count).to eq 1
      end
    end
  end
end
