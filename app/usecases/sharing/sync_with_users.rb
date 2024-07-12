# frozen_string_literal: true

module Usecases
  module Sharing
    class SyncWithUsers
      def initialize(params)
        @params = params
      end

      def execute!
        user_ids = @params.fetch(:user_ids, []).compact
        collection_attributes = @params.fetch(:collection_attributes, {})
        collection_attributes[:collection_id] = @params[:id]

        user_ids.each do |user_id|
          collection_attributes[:user_id] = user_id
          collection_attributes[:label] = new_collection_label(user_id)
          new_params = {
            collection_attributes: collection_attributes
          }

          Usecases::Sharing::SyncWithUser.new(new_params).execute!
        end
      end

      private

      def new_collection_label(user_id)
        "My project with #{User.find(user_id).name}"
      end
    end
  end
end
