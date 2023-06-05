# frozen_string_literal: true

# == Schema Information
#
# Table name: calendar_entry_notifications
#
#  id                :bigint           not null, primary key
#  user_id           :bigint
#  calendar_entry_id :bigint
#  status            :integer          default("created")
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_calendar_entry_notifications_on_calendar_entry_id  (calendar_entry_id)
#  index_calendar_entry_notifications_on_user_id            (user_id)
#
class CalendarEntryNotification < ApplicationRecord
  belongs_to :calendar_entry
  belongs_to :user

  enum status: {
    created: 0,
    updated: 1,
  }
end
