# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Users
      ALLOWED_TYPES = %w[Sample Reaction Element Wellplate Screen ResearchPlan].freeze

      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        return User.none unless params[:eventable_type].present? && params[:eventable_id].present?
        return User.none unless ALLOWED_TYPES.include?(params[:eventable_type])

        User.where(id: user_ids).where.not(id: user.id)
      end

      private

      def user_ids
        event = params[:eventable_type].constantize.find(params[:eventable_id])
        collections = event.collections

        ids = collections.map(&:user_id)
        ids += SyncCollectionsUser.where(collection_id: collections.map(&:id)).pluck(:user_id, :shared_by_id).flatten

        ids
      end
    end
  end
end
