# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class ByUIState
      def initialize(ids)
        @ids = ids
        @checked_ids = []
        @setup_types = %w[setup component]
      end

      def with_joined_ids
        get_device_description_setup_ids(@ids)
        @ids.uniq
      end

      private

      def get_device_description_setup_ids(ids_array)
        ids_array.each do |id|
          next if @checked_ids.include?(id)

          device_description = DeviceDescription.find_by(id: id)
          @checked_ids << id
          next if device_description.blank?

          setup_type = device_description.device_class
          next if @setup_types.exclude?(setup_type) || device_description.setup_descriptions[setup_type].blank?

          check_setup_description(device_description, setup_type)
        end
      end

      def check_setup_description(device_description, setup_type)
        setup_ids = device_description.setup_descriptions[setup_type].pluck('device_description_id')
        return if setup_ids.blank?
        return if (setup_ids - @ids).empty?

        @ids << setup_ids
        @ids.flatten!
        get_device_description_setup_ids(setup_ids)
      end
    end
  end
end
