# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Users
      ALLOWED_TYPES = %w[Sample Reaction Wellplate Screen ResearchPlan DeviceDescription].freeze

      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        return User.none unless params[:eventable_type].present? && params[:eventable_id].present?
        return User.none unless ALLOWED_TYPES.include?(normalized_eventable_type)

        User.where(id: user_ids).where.not(id: user.id)
      end

      private

      def normalized_eventable_type
        params[:eventable_type].camelize
      end

      def eventable_model
        normalized_eventable_type.constantize
      end

      def user_ids
        eventable = eventable_model.find(params[:eventable_id])
        collections = eventable.collections

        ids = collections.map(&:user_id) # collection owners
        ids += CollectionShare.where(collection_id: collections.ids).pluck(:shared_with_id)

        ids.uniq
      end
    end
  end
end
