# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CalendarEntryNotification' do
  describe 'creation' do
    # Test each factory
    it 'is possible to create a valid notification' do
      calendar_entry_notification = build(:calendar_entry_notification)
      expect(calendar_entry_notification.valid?).to be true
    end
  end

  describe 'deletion' do
    it 'is possible to delete a notification' do
      calendar_entry_notification = create(:calendar_entry_notification)
      calendar_entry_notification.destroy
      expect { calendar_entry_notification.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
