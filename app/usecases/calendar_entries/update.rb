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

        ActiveRecord::Base.transaction do
          entry.update!(params.except(:id, :notify_user_ids))
          reconcile_notifications(entry) if params.key?(:notify_user_ids)
        end

        entry
      end

      private

      def reconcile_notifications(entry)
        new_ids = (params[:notify_user_ids] || []).map(&:to_i).uniq
        existing_ids = entry.calendar_entry_notifications.pluck(:user_id)

        to_remove = existing_ids - new_ids
        entry.calendar_entry_notifications.where(user_id: to_remove).destroy_all if to_remove.any?

        to_add = new_ids - existing_ids
        return unless to_add.any?

        to_add.each { |uid| entry.calendar_entry_notifications.create!(user_id: uid, status: :updated) }
        SendCalendarEntryNotificationJob.perform_later(entry.id, to_add, :updated)
      end
    end
  end
end
