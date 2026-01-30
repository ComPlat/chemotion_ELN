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

      def import_ontologies
        # dd fetch => ontologies => segment_uuid
        #@data.fetch('Labimotion::Segment', {}).each do |uuid, fields|
        #  next if fields['element_type'] != 'DeviceDescription'

        #  segment = Labimotion::Segment.create!(
        #    fields.slice(
        #      'properties', 'properties_release'
        #    ).merge(
        #      created_by: @current_user_id,
        #      element: element,
        #      segment_klass: segment_klass,
        #      uuid: SecureRandom.uuid,
        #      klass_uuid: skr&.uuid || segment_klass.uuid
        #    )
        #  )
        #  properties = Labimotion::ImportUtils.properties_handler(@data, @instances, nil, segment, nil)
        #  segment.update!(properties: properties)
        #  update_instances.call(uuid, segment)
        #end
        #debugger
      end

      private

      def create_device_descriptions
        @data.fetch('DeviceDescription', {}).each do |uuid, fields|
          ancestry = @instances.dig('DeviceDescription', fields['ancestry'])
          #ontologies = fetch_ontologies(fields['ontologies']) || []
          device_description = DeviceDescription.create(
            fields.except('id', 'created_by', 'ancestry')
            .merge(
              created_by: @current_user_id,
              #ontologies: ontologies,
              ancestry: (ancestry.try(:id).present? ? "/#{ancestry.id}/" : '/'),
              collections: fetch_collection(uuid),
              container: Container.create_root_container,
            ),
          )
          update_instances!(uuid, device_description)
        end
      end

      def update_setup_descriptions_of_device_descriptions
        @instances.fetch('DeviceDescription').each do |uuid, fields|
          setup_descriptions = fields['setup_descriptions'] || {}
          next if setup_descriptions.blank?

          setup_descriptions.each_key do |setup_type|
            next if setup_descriptions[setup_type].blank?

            setup_descriptions[setup_type].each do |entry|
              next if entry['device_description_id'].blank?

              related_device_description = @instances.dig('DeviceDescription', entry['device_description_id'])
              next if related_device_description.blank?

              entry['device_description_id'] = related_device_description.id
              entry['url'] = related_device_description.short_label
            end
          end
        end
      end

      def fetch_ontologies(ontologies)
        return if ontologies.blank?

        ontologies.each do |ontology|
          data_segment_ids = []
          ontology['data']['segment_ids'].map do |uuid|
            data_segment_ids << @instances.dig('Labimotion::SegmentKlass', uuid)
          end
          ontology['data']['segment_ids'] = data_segment_ids if data_segment_ids.present?

          ontology['segments'].each do |entry|
            entry['segment_klass_id'] = @instances.dig('Labimotion::SegmentKlass', entry['segment_klass_id'])
          end
        end
      end

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
