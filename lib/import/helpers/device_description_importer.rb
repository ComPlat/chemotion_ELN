# frozen_string_literal: true

module Import
  module Helpers
    class DeviceDescriptionImporter
      def initialize(data, current_user_id, instances)
        @data = data
        @current_user_id = current_user_id
        @instances = instances
      end

      def execute
        create_device_descriptions
        update_setup_descriptions_of_device_descriptions
      end

      def update_ontologies
        @instances.fetch('DeviceDescription', {}).each do |uuid, fields|
          ontologies = fields['ontologies'] || {}
          next if ontologies.blank?

          device_description = DeviceDescription.find_by(id: fields.id)
          next if device_description.blank?

          device_description = replace_uuids_for_ontologies(device_description, uuid)
          device_description.save
        end
      end

      private

      def create_device_descriptions
        @data.fetch('DeviceDescription', {}).each do |uuid, fields|
          ancestry = @instances.dig('DeviceDescription', fields['ancestry'])
          device_description = DeviceDescription.create(
            fields.except('id', 'created_by', 'ancestry')
            .merge(
              created_by: @current_user_id,
              ancestry: (ancestry.try(:id).present? ? "/#{ancestry.id}/" : '/'),
              collections: fetch_collection(uuid),
              container: Container.create_root_container,
            ),
          )
          update_instances!(uuid, device_description)
        end
      end

      def update_setup_descriptions_of_device_descriptions
        @instances.fetch('DeviceDescription', {}).each_value do |fields|
          setup_descriptions = fields['setup_descriptions'] || {}
          next if setup_descriptions.blank?

          device_description = DeviceDescription.find_by(id: fields.id)
          next if device_description.blank?

          device_description = replace_uuids_for_setup_descriptions(device_description)
          device_description.save
        end
      end

      def replace_uuids_for_setup_descriptions(device_description)
        device_description.setup_descriptions.each_key do |setup_type|
          next if device_description.setup_descriptions[setup_type].blank?

          device_description.setup_descriptions[setup_type].each do |entry|
            next if entry['device_description_id'].blank?

            related_instance = @instances.dig('DeviceDescription', entry['device_description_id'])
            related_device_description = DeviceDescription.find_by(id: related_instance.id)
            next if related_device_description.blank?

            entry['device_description_id'] = related_device_description.id
            entry['url'] = related_device_description.short_label
          end
        end
        device_description
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def replace_uuids_for_ontologies(device_description, _uuid)
        device_description.ontologies.each do |ontology|
          data_segment_ids = []
          ontology['data']['segment_ids'].map do |uuid|
            segment_klass_data = @data.fetch('Labimotion::SegmentKlass')[uuid]
            segment_klass = Labimotion::SegmentKlass.find_by(label: segment_klass_data['label'])
            next if segment_klass.blank?

            data_segment_ids << { uuid => segment_klass&.id }
          end

          ontology['data']['segment_ids'] = data_segment_ids.flat_map(&:values) if data_segment_ids.present?
          ontology['segments'].each do |entry|
            segment_klass_id =
              data_segment_ids.find { |h| h.key?(entry['segment_klass_id']) }&.dig(entry['segment_klass_id'])
            entry['segment_klass_id'] = segment_klass_id
          end
        end
        device_description
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      def update_instances!(uuid, instance)
        type = instance.class.name
        @instances[type] = {} unless @instances.key?(type)
        @instances[type][uuid] = instance
      end

      def fetch_collection(uuid)
        associations = []
        @data.fetch('CollectionsDeviceDescription', {}).each_value do |fields|
          next unless fields['device_description_id'] == uuid

          instance = @instances.fetch('Collection', {})[fields['collection_id']]
          associations << instance unless instance.nil?
        end
        associations
      end
    end
  end
end
