# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Create
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
        @segments = params[:segments]
      end

      def execute
        ActiveRecord::Base.transaction do
          device_description = DeviceDescription.create!(params.except(:segments))
          save_segments(device_description)
          device_description.reload
          collection = Collection.writable_by(current_user).find_by(id: params[:collection_id]) ||
                       raise(ActiveRecord::RecordNotFound)
          user_and_group_ids = [current_user.id, *current_user.group_ids]
          all_coll_owner_id = user_and_group_ids.include?(collection.user_id) ? current_user.id : collection.user_id
          all_collection = Collection.get_all_collection_for_user(all_coll_owner_id)
          # find_or_create_by avoids violating the unique
          # (device_description_id, collection_id) index when the chosen
          # collection is already the user's "All" collection.
          CollectionsDeviceDescription.find_or_create_by(device_description: device_description, collection: collection)
          CollectionsDeviceDescription.find_or_create_by(
            device_description: device_description,
            collection: all_collection,
          )

          device_description
        end
      end

      private

      def save_segments(device_description)
        return if @segments.blank?

        device_description.save_segments(segments: @segments, current_user_id: current_user.id)
      end
    end
  end
end
