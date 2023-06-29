# frozen_string_literal: true

class CelllineImporter
  def initialize(data, current_user_id, instances)
    @data = data
    @current_user_id = current_user_id
    @instances = instances
  end

  def execute
    # import all cell line materials
    @data.fetch('CelllineMaterial', {}).each do |uuid, fields|
      update_instances!(uuid, CelllineMaterial.create(
                                fields.except('id'),
                              ))
    end
    # import cell line samples
    @data.fetch('CelllineSample', {}).each do |uuid, fields|
      material_uuid = @data.fetch('CelllineMaterialCelllineSample', {}).values
                           .select { |x| x['cellline_sample_id'] == uuid }
                           .pick('cellline_material_id')
      sample = CelllineSample.create(
        fields.except('id', 'user_id')
        .merge(
          user_id: @current_user_id,
          cellline_material_id: @instances['CelllineMaterial'][material_uuid].id,
        ),
      )
      sample.container = Container.create_root_container
      update_instances!(uuid, sample)
      # add collections
    end
  end

  def update_instances!(uuid, instance)
    type = instance.class.name
    @instances[type] = {} unless @instances.key?(type)
    @instances[type][uuid] = instance
  end
end
