# frozen_string_literal: true

# == Schema Information
#
# Table name: calendar_entry_notifications
#
#  id                :bigint           not null, primary key
#  status            :integer          default("created")
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  calendar_entry_id :bigint
#  user_id           :bigint
#
# Indexes
#
#  index_calendar_entry_notifications_on_calendar_entry_id  (calendar_entry_id)
#  index_calendar_entry_notifications_on_user_id            (user_id)
#
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
