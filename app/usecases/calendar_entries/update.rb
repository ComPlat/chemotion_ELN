# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Update
      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        return unless params[:id]

        entry = user.calendar_entries.find(params[:id])
        return unless entry

        entry.update!(params.except(:id, :notify_user_ids))

        # Reconcile notified users: remove old, add new
        new_ids = (params[:notify_user_ids] || []).map(&:to_i).uniq
        existing_ids = entry.calendar_entry_notifications.pluck(:user_id)

        to_remove = existing_ids - new_ids
        entry.calendar_entry_notifications.where(user_id: to_remove).destroy_all if to_remove.any?

        to_add = new_ids - existing_ids
        if to_add.any?
          to_add.each do |user_id|
            entry.calendar_entry_notifications.create!(user_id: user_id, status: :updated)
          end
          SendCalendarEntryNotificationJob.perform_later(entry.id, to_add, :updated)
        end

        entry
      end
    end
  end
end
