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
          collection = Collection.accessible_for(current_user).find(params[:collection_id])
          CollectionsDeviceDescription.create(device_description: device_description, collection: collection)

          all_collection_of_collection_owner = Collection.get_all_collection_for_user(current_user)
          CollectionsDeviceDescription.create(
            device_description: device_description,
            collection: all_collection_of_collection_owner,
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
