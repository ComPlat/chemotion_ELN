# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CalendarEntries::Update do
  describe '#perform!' do
    let(:user) { create(:person) }
    let(:calendar_entry) { create(:calendar_entry, creator: user, title: 'Old Title') }

    context 'when using valid parameters' do
      let(:params) do
        {
          id: calendar_entry.id,
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

      it 'returns a updated calendar entry' do
        expect(described_class.new(user: user, params: params).perform!.title).to eq 'Title'
      end
    end

    context 'when using invalid parameters' do
      let(:params) do
        {
          id: calendar_entry.id,
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
          id: calendar_entry.id,
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
          CalendarEntryNotification.where(status: :updated).count
        }.by(1)
      end
    end
  end
end
