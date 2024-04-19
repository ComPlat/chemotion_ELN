# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Create
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute
        ActiveRecord::Base.transaction do
          device_description = DeviceDescription.create!(params)
          device_description.reload

          is_shared_collection = false
          if user_collection
            CollectionsDeviceDescription.create(device_description: device_description, collection: user_collection)
          elsif sync_collection_user
            is_shared_collection = true
            CollectionsDeviceDescription.create(device_description: device_description,
                                                collection: sync_collection_user.collection)

            CollectionsDeviceDescription.create(device_description: device_description,
                                                collection: all_collection_of_sharer)
          end

          unless is_shared_collection
            CollectionsDeviceDescription.create(
              device_description: device_description,
              collection: all_collection_of_current_user,
            )
          end

          device_description
        end
      end

      private

      def user_collection
        @user_collection ||= @current_user.collections.find_by(id: @params[:collection_id])
      end

      def sync_collection_user
        @sync_collection_user ||= @current_user.all_sync_in_collections_users.find_by(id: @params[:collection_id])
      end

      def all_collection_of_sharer
        Collection.get_all_collection_for_user(sync_collection_user.shared_by_id)
      end

      def all_collection_of_current_user
        Collection.get_all_collection_for_user(@current_user.id)
      end
    end
  end
end
