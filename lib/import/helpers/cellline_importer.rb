# frozen_string_literal: true

module Import
  module Helpers
    class CelllineImporter
      def initialize(data, current_user_id, instances)
        @data = data
        @current_user_id = current_user_id
        @instances = instances
        @material_exclude_properties = ['id']
        @sample_exclude_properties = %w[id user_id]
      end

      def execute
        create_cellline_materials
        create_cellline_samples
      end

      def create_cellline_samples
        @data.fetch('CelllineSample', {}).each do |uuid, fields|
          create_cellline_sample(uuid, fields)
        end
      end

      def create_cellline_sample(uuid, fields)
        material_uuid = @data.fetch('CelllineMaterialCelllineSample', {}).values
                             .select { |entry| entry['cellline_sample_id'] == uuid }
                             .pick('cellline_material_id')
        material = @instances['CelllineMaterial'][material_uuid]

        sample = CelllineSample.create(
          fields.except('id', 'user_id')
          .merge(
            user_id: @current_user_id,
            cellline_material_id: material.id,
          ),
        )
        sample.container = Container.create_root_container
        update_instances!(uuid, sample)
        add_collections_to_sample(uuid, sample)
      end

      def update_instances!(uuid, instance)
        type = instance.class.name
        @instances[type] = {} unless @instances.key?(type)
        @instances[type][uuid] = instance
      end

      def create_cellline_materials
        @data.fetch('CelllineMaterial', {}).each do |uuid, fields|
          material = CelllineMaterial.find_by(name: fields['name'], source: fields['source'])
          material ||= CelllineMaterial.create(fields.except('id'))
          update_instances!(uuid, material)
        end
      end

      def add_collections_to_sample(uuid, sample)
        @data.fetch('CollectionsCelllineSample', {}).values
             .select { |x| x['cellline_sample_id'] == uuid }.each do |entry|
          sample.collections << @instances['Collection'][entry['collection_id']]
        end
        sample.save
      end
    end
  end
end
