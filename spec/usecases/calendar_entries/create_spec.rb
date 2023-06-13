# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CalendarEntries::Create do
  describe '#perform!' do
    let(:user) { create(:person) }
    let(:calendar_entry) { build(:calendar_entry, creator: user) }

    context 'when using valid parameters' do
      let(:params) do
        {
          title: 'Title',
          start_time: Time.current.beginning_of_day,
          end_time: Time.current.beginning_of_day + 2.hours,
          description: 'Description',
          kind: 'reminder',
          eventable_id: nil,
          eventable_type: nil,
          notify_user_ids: [],
        }
      end

      it 'returns a created calendar entry' do
        expect(described_class.new(user: user, params: params).perform!).to eq CalendarEntry.last
      end
    end

    context 'when using invalid parameters' do
      let(:params) do
        {
          title: nil,
          start_time: Time.current.beginning_of_day,
          end_time: Time.current.beginning_of_day + 2.hours,
          description: 'Description',
          kind: 'reminder',
          eventable_id: nil,
          eventable_type: nil,
          notify_user_ids: [],
        }
      end

      it 'raises validation error' do
        expect { described_class.new(user: user, params: params).perform! }.to raise_error(ActiveRecord::RecordInvalid)
      end
    end

    context 'when using notify_user_ids' do
      let(:another_user) { create(:person) }
      let(:params) do
        {
          title: 'Title',
          start_time: Time.current.beginning_of_day,
          end_time: Time.current.beginning_of_day + 2.hours,
          description: 'Description',
          kind: 'reminder',
          eventable_id: nil,
          eventable_type: nil,
          notify_user_ids: [another_user.id],
        }
      end

      it 'raises validation error' do
        expect { described_class.new(user: user, params: params).perform! }.to change {
          CalendarEntryNotification.where(status: :created).count
        }.by(1)
      end
    end
  end
end
