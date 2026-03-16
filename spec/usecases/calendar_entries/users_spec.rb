# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CalendarEntries::Users do
  describe '#perform!' do
    let(:user) { create(:person) }
    let(:collection) { create(:collection, user: user) }
    let(:another_user) { create(:person) }
    let(:other_users_collection) { create(:collection, user: another_user) }
    let(:sample) { create(:sample, collections: [collection, other_users_collection]) }
    let(:calendar_entry) { create(:calendar_entry, creator: user, eventable: sample) }

    before do
      collection
      other_users_collection
      calendar_entry
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
