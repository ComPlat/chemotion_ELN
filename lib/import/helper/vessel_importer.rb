# frozen_string_literal: true

class VesselImporter
  def initialize(data, current_user_id, instances)
    @data = data
    @current_user_id = current_user_id
    @instances = instances
  end

  def execute
    # import all vessel templates
    @data.fetch('VesselTemplate', {}).each do |uuid, fields|
      update_instances!(uuid, VesselTemplate.create(
                                fields.except('id'),
                              ))
    end
    # import vessels
    @data.fetch('Vessel', {}).each do |uuid, fields|
      template_uuid = @data.fetch('VesselTemplateVessel', {}).values
                           .select { |x| x['vessel_id'] == uuid }
                           .pick('vessel_template_id')
      vessel = Vessel.create(
        fields.except('id', 'user_id')
        .merge(
          user_id: @current_user_id,
          vessel_template_id: @instances['VesselTemplate'][template_uuid].id,
        ),
      )
      update_instances!(uuid, vessel)
      # add collections
      @data.fetch('CollectionsVessel', {}).values.select { |x| x['vessel_id'] == uuid }.each do |entry|
        vessel.collections << @instances['Collection'][entry['collection_id']]
      end

      vessel.save
    end
  end

  def update_instances!(uuid, instance)
    type = instance.class.name
    @instances[type] = {} unless @instances.key?(type)
    @instances[type][uuid] = instance
  end
end