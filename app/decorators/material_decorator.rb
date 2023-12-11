# frozen_string_literal: true

class MaterialDecorator
  require 'material_serializer'

  attr_reader :reaction_materials

  def initialize(reaction_materials)
    @reaction_materials = reaction_materials
  end

  def decorated
    reaction_materials_attributes = Array(reaction_materials).map do |r|
      [r.sample_id, r.attributes]
    end.to_h

    reaction_materials.map do |reaction_material|
      m = Material.new(reaction_material.sample.attributes)
      rma = reaction_materials_attributes[reaction_material.sample_id] || {}
      m.reference = rma['reference']
      m.show_label = rma['show_label']
      m.equivalent = rma['equivalent']
      m.position = rma['position']
      m.waste = rma['waste']
      m.coefficient = rma['coefficient']
      m.intermediate_type = rma['intermediate_type']
      m.reaction_step = rma['reaction_step']
      m.container = reaction_material.sample.container

      m
    end
  end
end
