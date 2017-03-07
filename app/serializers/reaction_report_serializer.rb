class ReactionReportSerializer < ReactionSerializer
  has_many :starting_materials, serializer: MaterialReportSerializer
  has_many :reactants, serializer: MaterialReportSerializer
  has_many :solvents, serializer: MaterialReportSerializer
  has_many :products, serializer: MaterialReportSerializer
end

class ReactionReportSerializer::Level10 < ReactionSerializer::Level10
  include ReactionLevelReportSerializable

  def starting_materials
    MaterialDecorator.new(object.reactions_starting_material_samples).decorated.map{ |s| "MaterialReportSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def reactants
    MaterialDecorator.new(object.reactions_reactant_samples).decorated.map{ |s| "MaterialReportSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def solvents
    MaterialDecorator.new(object.reactions_solvent_samples).decorated.map{ |s| "MaterialReportSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def products
    MaterialDecorator.new(object.reactions_product_samples).decorated.map{ |s| "MaterialReportSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
  end
end

class ReactionReportSerializer::Level0 < ReactionSerializer::Level0
  include ReactionLevelReportSerializable
end
