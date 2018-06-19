class MaterialDecorator
  attr_reader :reaction_materials

  def initialize(reaction_materials)
    @reaction_materials = reaction_materials
  end

  def decorated
    reaction_materials_attributes = Hash[Array(reaction_materials).map {|r|
      [r.sample_id, r.attributes]
    }]

    reaction_materials.map do |reaction_material|
      m = Material.new(reaction_material.sample.attributes)
      rma = reaction_materials_attributes[reaction_material.sample_id] || {}
      m.reference = rma['reference']
      m.equivalent = rma['equivalent']
      m.position = rma['position']
      m.waste = rma['waste']
      m.coefficient = rma['coefficient']
      m.container = reaction_material.sample.container

      m
    end
  end
end
