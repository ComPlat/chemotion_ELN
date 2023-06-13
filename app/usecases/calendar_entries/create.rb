# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Create
      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        entry = user.calendar_entries.new(params.except(:notify_user_ids))
        entry.save!

        # notify_user_ids is an attr_accessor
        if params[:notify_user_ids]&.any?
          # immediately save notified users to see them in the calendar
          params[:notify_user_ids].each do |user_id|
            entry.calendar_entry_notifications.create(user_id: user_id, status: :created)
          end

          # send emails and create notifications to selected users
          SendCalendarEntryNotificationJob.perform_later(entry.id, params[:notify_user_ids], :created)
        end

        entry
      end
    end
  end
end
